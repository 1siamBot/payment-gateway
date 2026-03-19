import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement remediation publication route-decision envelope endpoint', () => {
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

  it('returns deterministic route-decision envelope payload and fingerprint', async () => {
    const payload = {
      candidateId: 'ONE-318',
      routingPacketFingerprint: 'route-packet-fp-318',
      routeDecision: 'review',
      policyVersion: '2026.03.19',
      routeSteps: [
        {
          stepCode: 'qa-check',
          owner: 'qa',
          issueIdentifier: 'ONE-320',
          approvalCriticalityWeight: 3,
          blockerWeight: 2,
          dependencyDepthWeight: 1,
          evidenceType: 'test',
          evidencePath: 'artifacts/one-320/qa.log',
          reasonCode: 'policy compliance',
        },
        {
          stepCode: 'backend-verify',
          owner: 'backend',
          issueIdentifier: 'ONE-319',
          approvalCriticalityWeight: 1,
          blockerWeight: 1,
          dependencyDepthWeight: 0,
          evidenceType: 'artifact',
          evidencePath: 'artifacts/one-319/report.json',
          reasonCode: 'dependency blocked',
        },
      ],
      blockingDependencies: [],
      missingEvidence: [],
      requiredApprovals: [
        {
          approvalKey: 'risk-signoff',
          owner: 'risk',
          criticality: 'high',
          reasonCode: 'policy_violation',
        },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/remediation-publication-route-decision-envelope')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/remediation-publication-route-decision-envelope')
        .set(authHeaders())
        .send({
          ...payload,
          routeSteps: [...payload.routeSteps].reverse(),
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.contract).toBe('settlement-remediation-publication-route-decision-envelope.v1');
    expect(first.body.publicationOutcome).toBe('approval_required');
    expect(first.body.ownerDispatchPlan.map((row: { stepCode: string }) => row.stepCode)).toEqual([
      'backend-verify',
      'qa-check',
    ]);
    expect(first.body.canonicalReasonCodes).toEqual([
      'dependency_blocked',
      'policy_violation',
    ]);
    expect(first.body.decisionEnvelopeFingerprint).toBe(second.body.decisionEnvelopeFingerprint);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
