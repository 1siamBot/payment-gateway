import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement remediation publication readiness envelope endpoint', () => {
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

  it('orders publication actions by executionReadinessWeight, blockerWeight, dependencyDepthWeight, issueIdentifier, evidenceTypeWeight, evidencePath', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/remediation-publication-readiness-envelope')
      .set(authHeaders())
      .send({
        candidateId: 'rc-2026-03-19.1',
        blueprintFingerprint: 'blueprint-fp-001',
        executionReadiness: 'blocked',
        policyVersion: 'publication-policy.v1',
        executionSteps: [
          {
            issueIdentifier: 'ONE-910',
            blockerWeight: 1,
            dependencyDepthWeight: 2,
            evidenceTypeWeight: 2,
            evidenceType: 'digest',
            evidencePath: 'artifacts/one-910/digest.json',
          },
          {
            issueIdentifier: 'ONE-909',
            blockerWeight: 2,
            dependencyDepthWeight: 1,
            evidenceTypeWeight: 1,
            evidenceType: 'manifest',
            evidencePath: 'artifacts/one-909/manifest.md',
          },
          {
            issueIdentifier: 'ONE-908',
            blockerWeight: 1,
            dependencyDepthWeight: 1,
            evidenceTypeWeight: 1,
            evidenceType: 'manifest',
            evidencePath: 'artifacts/one-908/manifest.md',
          },
        ],
        blockingDependencies: [],
        missingEvidence: [],
        publicationConstraints: {},
      });

    expect(response.status).toBe(201);
    expect(response.body.orderingKeySpec).toEqual([
      'executionReadinessWeight',
      'blockerWeight',
      'dependencyDepthWeight',
      'issueIdentifier',
      'evidenceTypeWeight',
      'evidencePath',
    ]);
    expect(response.body.publicationActions.map((row: {
      issueIdentifier: string;
      executionReadinessWeight: number;
      blockerWeight: number;
      dependencyDepthWeight: number;
      evidenceTypeWeight: number;
      evidencePath: string;
    }) => `${row.executionReadinessWeight}:${row.blockerWeight}:${row.dependencyDepthWeight}:${row.issueIdentifier}:${row.evidenceTypeWeight}:${row.evidencePath}`)).toEqual([
      '1:1:1:ONE-908:1:artifacts/one-908/manifest.md',
      '1:1:2:ONE-910:2:artifacts/one-910/digest.json',
      '1:2:1:ONE-909:1:artifacts/one-909/manifest.md',
    ]);
  });

  it('normalizes reason codes and emits canonical machine fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/remediation-publication-readiness-envelope')
      .set(authHeaders())
      .send({
        candidateId: 'rc-2026-03-19.2',
        blueprintFingerprint: 'blueprint-fp-002',
        executionReadiness: 'blocked',
        policyVersion: 'publication-policy.v1',
        executionSteps: [
          {
            issueIdentifier: 'ONE-920',
            dependencyDepthWeight: 1,
            blockerWeight: 0,
            evidenceType: 'manifest',
            evidencePath: '',
            reasonCodes: ['dependency open', 'policy failed', 'ordering drift', 'broken ref link'],
            referenceLinks: ['/issues/ONE-920'],
          },
        ],
        blockingDependencies: [
          {
            issueIdentifier: 'ONE-920',
            dependencyIssueIdentifier: 'ONE-921',
            dependencyStatus: 'open',
          },
        ],
        missingEvidence: [
          {
            issueIdentifier: 'ONE-920',
            evidenceType: 'manifest',
            evidencePath: '',
            reasonCode: 'artifact_missing',
          },
        ],
        publicationConstraints: {
          requiredApprovals: [{ approvalKey: 'pm-signoff', owner: 'pm', status: 'pending' }],
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.readyForPublication).toBe(false);
    expect(response.body.publicationActions[0].reasonCodes).toEqual([
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
        evidenceType: 'manifest',
        evidencePath: 'missing/ONE-920/evidence',
        reasonCode: 'missing_evidence',
      },
    ]);
  });

  it('keeps envelope payload and fingerprint byte-stable for semantically identical input', async () => {
    const payload = {
      candidateId: 'rc-2026-03-19.3',
      blueprintFingerprint: 'blueprint-fp-003',
      executionReadiness: 'blocked',
      policyVersion: 'publication-policy.v1',
      executionSteps: [
        {
          issueIdentifier: 'ONE-930',
          dependencyDepthWeight: 2,
          blockerWeight: 1,
          evidenceTypeWeight: 2,
          evidenceType: 'digest',
          evidencePath: 'artifacts/one-930/digest.json',
          reasonCodes: ['ordering_regression'],
        },
        {
          issueIdentifier: 'ONE-931',
          dependencyDepthWeight: 1,
          blockerWeight: 0,
          evidenceTypeWeight: 1,
          evidenceType: 'manifest',
          evidencePath: 'artifacts/one-931/manifest.md',
          reasonCodes: ['reference link drift'],
        },
      ],
      blockingDependencies: [
        {
          issueIdentifier: 'ONE-930',
          dependencyIssueIdentifier: 'ONE-940',
          dependencyStatus: 'resolved',
        },
      ],
      missingEvidence: [],
      publicationConstraints: {
        requiredApprovals: [
          { approvalKey: 'qa-signoff', owner: 'qa', status: 'pending' },
          { approvalKey: 'pm-signoff', owner: 'pm', status: 'pending' },
        ],
      },
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/remediation-publication-readiness-envelope')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/remediation-publication-readiness-envelope')
        .set(authHeaders())
        .send({
          ...payload,
          executionSteps: [...payload.executionSteps].reverse(),
          blockingDependencies: [...payload.blockingDependencies].reverse(),
          publicationConstraints: {
            requiredApprovals: [...payload.publicationConstraints.requiredApprovals].reverse(),
          },
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.envelopeFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(first.body.envelopeFingerprint).toBe(second.body.envelopeFingerprint);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
