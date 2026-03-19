import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement remediation manifest endpoint', () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.INTERNAL_API_TOKEN = 'internal-qa-token';

    const prismaMock = {
      apiKey: {
        findFirst: jest.fn(async () => null),
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [SettlementsController],
      providers: [
        SettlementsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: APP_GUARD, useClass: AuthzGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  function authHeaders() {
    return {
      'x-internal-token': 'internal-qa-token',
      'x-actor-role': 'ops',
    };
  }

  it('returns deterministic remediation manifest entries and fingerprint', async () => {
    const payload = {
      asOfIso: '2026-03-19T10:00:00Z',
      runbook: [
        {
          issueIdentifier: 'ONE-267',
          artifactCode: 'backend-fix',
          lanePriorityWeight: 1,
          blockerRisk: 90,
          baselineEta: '2026-03-19T09:00:00Z',
          latestEta: '2026-03-19T11:00:00Z',
          evidence: {
            branch: 'feature/one-267-manifest',
            fullSha: '8a4f8b31d628d52f8dc2ab4f48bca3ef56c8f11b',
            prMode: 'with_pr',
            testCommand: 'npm test -- test/settlement-remediation-manifest.spec.ts',
            artifactPath: 'artifacts/one-267/remediation-manifest.json',
          },
        },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/remediation-manifest')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/remediation-manifest')
        .set(authHeaders())
        .send({
          ...payload,
          runbook: [...payload.runbook],
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.contract).toBe('settlement-exception-remediation-manifest.v1');
    expect(first.body.entries).toHaveLength(1);
    expect(first.body.entries[0]).toMatchObject({
      issueIdentifier: 'ONE-267',
      artifactCode: 'backend-fix',
      deltaMinutes: 120,
      deltaClass: 'at_risk',
      evidence: {
        prMode: 'with_pr',
        isComplete: true,
      },
    });
    expect(first.body.fingerprint).toBe(second.body.fingerprint);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
