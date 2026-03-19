import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement remediation runbook endpoint', () => {
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

  it('returns deterministic remediation runbook payload with canonical dependency graph links', async () => {
    const payload = {
      asOfIso: '2026-03-19T10:00:00Z',
      scorecard: [
        {
          issueIdentifier: 'ONE-265',
          remediationPriorityScore: 80,
          dependencyIssueLinks: ['/issues/ONE-241#document-plan', 'ONE-262'],
          evidence: {
            ownerRole: 'backend',
            expectedArtifactPath: 'artifacts/one-265/backend.md',
            verificationCommand: 'npm test -- test/settlement-remediation-runbook.spec.ts',
            blockingReason: 'Waiting for credentials',
          },
        },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/remediation-runbook')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/remediation-runbook')
        .set(authHeaders())
        .send({
          ...payload,
          scorecard: [
            {
              ...payload.scorecard[0],
              dependencyIssueLinks: [...payload.scorecard[0].dependencyIssueLinks].reverse(),
            },
          ],
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.contract).toBe('settlement-exception-remediation-runbook.v1');
    expect(first.body.actions).toHaveLength(4);
    expect(first.body.actions[0]).toMatchObject({
      actionCode: 'backend-fix',
      issueIdentifier: 'ONE-265',
      dependencyGraph: {
        issueLinks: ['/ONE/issues/ONE-241#document-plan', '/ONE/issues/ONE-262'],
      },
    });
    expect(first.body.fingerprint).toBe(second.body.fingerprint);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
