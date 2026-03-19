import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement remediation publication handoff bundle endpoint', () => {
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

  it('orders handoff steps by readyForPublicationWeight, blockerWeight, dependencyDepthWeight, issueIdentifier, evidenceTypeWeight, evidencePath', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/remediation-publication-handoff-bundle')
      .set(authHeaders())
      .send({
        candidateId: 'rc-2026-03-19.1',
        envelopeFingerprint: 'envelope-fp-001',
        readyForPublication: false,
        policyVersion: 'publication-policy.v1',
        publicationActions: [
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
        requiredApprovals: [],
      });

    expect(response.status).toBe(201);
    expect(response.body.orderingKeySpec).toEqual([
      'readyForPublicationWeight',
      'blockerWeight',
      'dependencyDepthWeight',
      'issueIdentifier',
      'evidenceTypeWeight',
      'evidencePath',
    ]);
    expect(response.body.handoffSteps.map((row: {
      issueIdentifier: string;
      readyForPublicationWeight: number;
      blockerWeight: number;
      dependencyDepthWeight: number;
      evidenceTypeWeight: number;
      evidencePath: string;
    }) => `${row.readyForPublicationWeight}:${row.blockerWeight}:${row.dependencyDepthWeight}:${row.issueIdentifier}:${row.evidenceTypeWeight}:${row.evidencePath}`)).toEqual([
      '1:1:1:ONE-908:1:artifacts/one-908/manifest.md',
      '1:1:2:ONE-910:2:artifacts/one-910/digest.json',
      '1:2:1:ONE-909:1:artifacts/one-909/manifest.md',
    ]);
  });

  it('normalizes reason codes and emits canonical machine fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/remediation-publication-handoff-bundle')
      .set(authHeaders())
      .send({
        candidateId: 'rc-2026-03-19.2',
        envelopeFingerprint: 'envelope-fp-002',
        readyForPublication: false,
        policyVersion: 'publication-policy.v1',
        publicationActions: [
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
        requiredApprovals: [{ approvalKey: 'pm-signoff', owner: 'pm', status: 'pending' }],
      });

    expect(response.status).toBe(201);
    expect(response.body.handoffState).toBe('blocked');
    expect(response.body.handoffSteps[0].reasonCodes).toEqual([
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

  it('keeps handoff bundle payload and fingerprint byte-stable for semantically identical input', async () => {
    const payload = {
      candidateId: 'rc-2026-03-19.3',
      envelopeFingerprint: 'envelope-fp-003',
      readyForPublication: false,
      policyVersion: 'publication-policy.v1',
      publicationActions: [
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
      requiredApprovals: [
        { approvalKey: 'qa-signoff', owner: 'qa', status: 'pending' },
        { approvalKey: 'pm-signoff', owner: 'pm', status: 'pending' },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/remediation-publication-handoff-bundle')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/remediation-publication-handoff-bundle')
        .set(authHeaders())
        .send({
          ...payload,
          publicationActions: [...payload.publicationActions].reverse(),
          blockingDependencies: [...payload.blockingDependencies].reverse(),
          requiredApprovals: [...payload.requiredApprovals].reverse(),
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.bundleFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(first.body.bundleFingerprint).toBe(second.body.bundleFingerprint);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
