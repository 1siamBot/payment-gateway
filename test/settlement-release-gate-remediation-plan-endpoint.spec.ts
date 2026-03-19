import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement release-gate remediation plan endpoint', () => {
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

  it('returns deterministic remediation actions and checksums for identical logical payloads', async () => {
    const payload = {
      candidateId: 'ONE-340',
      policyVersion: '2026.03.19',
      policyProfile: 'strict',
      laneEvidence: [
        {
          issueIdentifier: 'ONE-742',
          reasonCode: 'policy gate failed',
          ownerLane: 'qa',
        },
        {
          issueIdentifier: 'ONE-741',
          reasonCode: 'missing evidence',
          ownerLane: 'backend',
        },
      ],
      dependencySnapshots: [
        { issueIdentifier: 'ONE-640', reasonCode: 'dependency blocked' },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/release-gate-remediation-plan')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/release-gate-remediation-plan')
        .set(authHeaders())
        .send({
          ...payload,
          laneEvidence: [...payload.laneEvidence].reverse(),
          dependencySnapshots: [...payload.dependencySnapshots].reverse(),
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.contract).toBe('settlement-release-gate-remediation-plan.v1');
    expect(first.body.remediationActions.map((row: { issueIdentifier: string }) => row.issueIdentifier)).toEqual([
      'ONE-742',
      'ONE-741',
    ]);
    expect(first.body.normalizationChecksum).toBe(second.body.normalizationChecksum);
    expect(first.body.remediationPlanChecksum).toBe(second.body.remediationPlanChecksum);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });

  it('enforces accepted policyProfile values', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/release-gate-remediation-plan')
      .set(authHeaders())
      .send({
        candidateId: 'ONE-340',
        policyVersion: '2026.03.19',
        policyProfile: 'rush',
        laneEvidence: [],
        dependencySnapshots: [],
      });

    expect(response.status).toBe(400);
  });
});
