import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement release-gate evidence digest endpoint', () => {
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

  it('returns deterministic release-gate digest payload and fingerprint', async () => {
    const payload = {
      candidateId: 'ONE-337',
      policyVersion: '2026.03.19',
      laneEvidence: [
        {
          issueIdentifier: 'ONE-702',
          priorityWeight: 2,
          blockerWeight: 0,
          dependencyDepthWeight: 2,
          evidenceType: 'test',
          artifactPath: 'artifacts/one-702/test.log',
          reasonCode: 'policy approval',
        },
        {
          issueIdentifier: 'ONE-701',
          priorityWeight: 1,
          blockerWeight: 0,
          dependencyDepthWeight: 0,
          evidenceType: 'artifact',
          artifactPath: 'artifacts/one-701/report.md',
          reasonCode: 'Missing Evidence',
        },
      ],
      dependencySnapshots: [
        {
          issueIdentifier: 'ONE-703',
          blockerWeight: 1,
          dependencyDepthWeight: 1,
          reasonCode: 'dependency blocked',
        },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/release-gate-evidence-digest')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/release-gate-evidence-digest')
        .set(authHeaders())
        .send({
          ...payload,
          laneEvidence: [...payload.laneEvidence].reverse(),
          dependencySnapshots: [...payload.dependencySnapshots].reverse(),
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.contract).toBe('settlement-release-gate-evidence-digest.v1');
    expect(first.body.readinessState).toBe('blocked');
    expect(first.body.digestRows.map((row: { issueIdentifier: string }) => row.issueIdentifier)).toEqual([
      'ONE-701',
      'ONE-702',
    ]);
    expect(first.body.digestRows[0].orderingKey).toEqual([
      1,
      0,
      0,
      'ONE-701',
      1,
      'artifacts/one-701/report.md',
    ]);
    expect(first.body.missingEvidence.map((row: { issueIdentifier: string }) => row.issueIdentifier)).toEqual([
      'ONE-701',
    ]);
    expect(first.body.blockingDependencies.map((row: { issueIdentifier: string }) => row.issueIdentifier)).toEqual([
      'ONE-703',
    ]);
    expect(first.body.digestFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(first.body.digestFingerprint).toBe(second.body.digestFingerprint);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
