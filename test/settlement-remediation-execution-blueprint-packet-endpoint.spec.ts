import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement remediation execution blueprint packet endpoint', () => {
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

  it('orders execution steps by severityWeight, dependencyDepthWeight, blockerWeight, issueIdentifier, remediationTypeWeight, evidencePath', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/remediation-execution-blueprint-packet')
      .set(authHeaders())
      .send({
        candidateId: 'rc-2026-03-19.1',
        queueFingerprint: 'queue-fp-001',
        policyVersion: 'qa-policy.v3',
        queueItems: [
          {
            issueIdentifier: 'ONE-911',
            severityWeight: 2,
            dependencyDepthWeight: 1,
            blockerWeight: 2,
            remediationTypeWeight: 2,
            evidencePath: 'artifacts/one-911/step.json',
          },
          {
            issueIdentifier: 'ONE-910',
            severityWeight: 1,
            dependencyDepthWeight: 2,
            blockerWeight: 1,
            remediationTypeWeight: 1,
            evidencePath: 'artifacts/one-910/step-b.json',
          },
          {
            issueIdentifier: 'ONE-909',
            severityWeight: 1,
            dependencyDepthWeight: 2,
            blockerWeight: 1,
            remediationTypeWeight: 1,
            evidencePath: 'artifacts/one-910/step-a.json',
          },
        ],
        dependencyGraph: { edges: [] },
        operatorConstraints: {},
      });

    expect(response.status).toBe(201);
    expect(response.body.orderingKeySpec).toEqual([
      'severityWeight',
      'dependencyDepthWeight',
      'blockerWeight',
      'issueIdentifier',
      'remediationTypeWeight',
      'evidencePath',
    ]);
    expect(response.body.executionSteps.map((step: {
      issueIdentifier: string;
      severityWeight: number;
      dependencyDepthWeight: number;
      blockerWeight: number;
      remediationTypeWeight: number;
      evidencePath: string;
    }) => `${step.severityWeight}:${step.dependencyDepthWeight}:${step.blockerWeight}:${step.issueIdentifier}:${step.remediationTypeWeight}:${step.evidencePath}`)).toEqual([
      '1:2:1:ONE-909:1:artifacts/one-910/step-a.json',
      '1:2:1:ONE-910:1:artifacts/one-910/step-b.json',
      '2:1:2:ONE-911:2:artifacts/one-911/step.json',
    ]);
  });

  it('normalizes reason codes and emits blocking/missing machine fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/remediation-execution-blueprint-packet')
      .set(authHeaders())
      .send({
        candidateId: 'rc-2026-03-19.2',
        queueFingerprint: 'queue-fp-002',
        policyVersion: 'qa-policy.v3',
        queueItems: [
          {
            issueIdentifier: 'ONE-920',
            severityWeight: 1,
            dependencyDepthWeight: 0,
            blockerWeight: 1,
            remediationTypeWeight: 2,
            evidencePath: '',
            reasonCodes: ['policy failed', 'ordering drift', 'invalid link set'],
            referenceLinks: ['/issues/ONE-291'],
          },
        ],
        dependencyGraph: {
          edges: [
            {
              issueIdentifier: 'ONE-920',
              dependsOnIssueIdentifier: 'ONE-921',
              dependencyStatus: 'open',
            },
          ],
        },
        operatorConstraints: {
          rollbackPlanRefs: ['runbook://one-920-fallback'],
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.executionReadiness).toBe('blocked');
    expect(response.body.nextOwner).toBe('pm');
    expect(response.body.executionSteps[0].reasonCodes).toEqual([
      'missing_evidence',
      'dependency_blocked',
      'policy_violation',
      'ordering_regression',
      'reference_noncanonical',
    ]);
    expect(response.body.blockingDependencies).toEqual([
      {
        issueIdentifier: 'ONE-920',
        dependencyIssueIdentifier: 'ONE-921',
        dependencyStatus: 'open',
        reasonCode: 'dependency_blocked',
      },
    ]);
    expect(response.body.missingEvidence).toEqual([
      {
        issueIdentifier: 'ONE-920',
        evidencePath: 'missing/ONE-920/evidence',
        reasonCode: 'missing_evidence',
      },
    ]);
    expect(response.body.rollbackPlanRefs).toEqual(['runbook://one-920-fallback']);
  });

  it('keeps payload and fingerprint byte-stable for semantically identical input', async () => {
    const payload = {
      candidateId: 'rc-2026-03-19.3',
      queueFingerprint: 'queue-fp-003',
      policyVersion: 'qa-policy.v3',
      queueItems: [
        {
          issueIdentifier: 'ONE-930',
          severityWeight: 2,
          dependencyDepthWeight: 2,
          blockerWeight: 1,
          remediationTypeWeight: 2,
          evidencePath: 'artifacts/one-930/step.json',
          reasonCodes: ['ordering-regression'],
          rollbackPlanRefs: ['runbook://one-930'],
        },
        {
          issueIdentifier: 'ONE-931',
          severityWeight: 1,
          dependencyDepthWeight: 1,
          blockerWeight: 1,
          remediationTypeWeight: 1,
          evidencePath: 'artifacts/one-931/step.json',
          reasonCodes: ['reference link drift'],
          rollbackPlanRefs: ['runbook://one-931'],
        },
      ],
      dependencyGraph: {
        edges: [
          {
            issueIdentifier: 'ONE-930',
            dependsOnIssueIdentifier: 'ONE-940',
            dependencyStatus: 'resolved',
          },
          {
            issueIdentifier: 'ONE-931',
            dependsOnIssueIdentifier: 'ONE-941',
            dependencyStatus: 'resolved',
          },
        ],
      },
      operatorConstraints: {
        rollbackPlanRefs: ['runbook://global-default'],
      },
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/remediation-execution-blueprint-packet')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/remediation-execution-blueprint-packet')
        .set(authHeaders())
        .send({
          ...payload,
          queueItems: [...payload.queueItems].reverse(),
          dependencyGraph: {
            edges: [...payload.dependencyGraph.edges].reverse(),
          },
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.blueprintFingerprint).toBe(second.body.blueprintFingerprint);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
