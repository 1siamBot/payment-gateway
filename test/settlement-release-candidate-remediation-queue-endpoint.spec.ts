import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement release-candidate remediation queue endpoint', () => {
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

  it('orders queue items by severityWeight, blockerWeight, dependencyDepthWeight, issueIdentifier, remediationTypeWeight, evidencePath', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/release-candidate-remediation-queue')
      .set(authHeaders())
      .send({
        candidateId: 'rc-2026-03-19.1',
        policyVersion: 'qa-policy.v3',
        verdictPacket: {
          verdictRows: [
            { issueIdentifier: 'ONE-911', severityWeight: 2, dependencyDepthWeight: 3 },
            { issueIdentifier: 'ONE-910', severityWeight: 1, dependencyDepthWeight: 1 },
          ],
        },
        dependencyGraph: {
          edges: [
            {
              issueIdentifier: 'ONE-911',
              dependsOnIssueIdentifier: 'ONE-950',
              dependencyDepthWeight: 3,
              dependencyStatus: 'resolved',
            },
            {
              issueIdentifier: 'ONE-910',
              dependsOnIssueIdentifier: 'ONE-951',
              dependencyDepthWeight: 1,
              dependencyStatus: 'resolved',
            },
          ],
        },
        evidenceRefs: [
          {
            issueIdentifier: 'ONE-911',
            remediationTypeWeight: 3,
            evidencePath: 'artifacts/one-911/queue.json',
          },
          {
            issueIdentifier: 'ONE-910',
            remediationTypeWeight: 1,
            evidencePath: 'artifacts/one-910/queue.json',
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.orderingKeySpec).toEqual([
      'severityWeight',
      'blockerWeight',
      'dependencyDepthWeight',
      'issueIdentifier',
      'remediationTypeWeight',
      'evidencePath',
    ]);

    expect(response.body.queueItems.map((item: {
      severityWeight: number;
      blockerWeight: number;
      dependencyDepthWeight: number;
      issueIdentifier: string;
      remediationTypeWeight: number;
      evidencePath: string;
    }) => `${item.severityWeight}:${item.blockerWeight}:${item.dependencyDepthWeight}:${item.issueIdentifier}:${item.remediationTypeWeight}:${item.evidencePath}`)).toEqual([
      '0:1:999:ONE-950:2:missing/ONE-950/evidence',
      '0:1:999:ONE-951:2:missing/ONE-951/evidence',
      '1:3:1:ONE-910:1:artifacts/one-910/queue.json',
      '2:3:3:ONE-911:3:artifacts/one-911/queue.json',
    ]);
  });

  it('normalizes canonical reasons and emits blocking/missing machine fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/release-candidate-remediation-queue')
      .set(authHeaders())
      .send({
        candidateId: 'rc-2026-03-19.2',
        policyVersion: 'qa-policy.v3',
        verdictPacket: {
          verdictRows: [
            {
              issueIdentifier: 'ONE-920',
              severityWeight: 1,
              dependencyDepthWeight: 0,
              reasonCodes: ['ordering-drift', 'policy failed'],
              referenceLinks: ['/issues/ONE-291'],
            },
          ],
        },
        dependencyGraph: {
          edges: [
            {
              issueIdentifier: 'ONE-920',
              dependsOnIssueIdentifier: 'ONE-921',
              dependencyDepthWeight: 1,
              dependencyStatus: 'open',
              reasonCodes: ['dependency still open'],
            },
          ],
        },
        evidenceRefs: [
          {
            issueIdentifier: 'ONE-920',
            remediationTypeWeight: 2,
            evidencePath: '',
          },
        ],
      });

    expect(response.status).toBe(201);
    const queueItem = response.body.queueItems.find((item: { issueIdentifier: string }) => item.issueIdentifier === 'ONE-920');
    expect(queueItem.reasonCodes).toEqual([
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
        issueIdentifier: 'ONE-921',
        remediationType: 'evidence_backfill',
        evidencePath: 'missing/ONE-921/evidence',
        reasonCode: 'missing_evidence',
      },
      {
        issueIdentifier: 'ONE-920',
        remediationType: 'dependency_unblock',
        evidencePath: 'missing/ONE-920/evidence',
        reasonCode: 'missing_evidence',
      },
    ]);
    expect(response.body.readyForExecution).toBe(false);
    expect(response.body.nextOwner).toBe('pm');
  });

  it('keeps queue payload and fingerprint byte-stable for semantically identical input', async () => {
    const payload = {
      candidateId: 'rc-2026-03-19.3',
      policyVersion: 'qa-policy.v3',
      verdictPacket: {
        verdictRows: [
          { issueIdentifier: 'ONE-930', severityWeight: 1, dependencyDepthWeight: 1 },
          { issueIdentifier: 'ONE-931', severityWeight: 2, dependencyDepthWeight: 2 },
        ],
      },
      dependencyGraph: {
        edges: [
          {
            issueIdentifier: 'ONE-930',
            dependsOnIssueIdentifier: 'ONE-940',
            dependencyDepthWeight: 1,
            dependencyStatus: 'resolved',
          },
          {
            issueIdentifier: 'ONE-931',
            dependsOnIssueIdentifier: 'ONE-941',
            dependencyDepthWeight: 2,
            dependencyStatus: 'resolved',
          },
        ],
      },
      evidenceRefs: [
        {
          issueIdentifier: 'ONE-930',
          remediationTypeWeight: 1,
          evidencePath: 'artifacts/one-930/queue.json',
          referenceLinks: ['/ONE/issues/ONE-291'],
        },
        {
          issueIdentifier: 'ONE-931',
          remediationTypeWeight: 2,
          evidencePath: 'artifacts/one-931/queue.json',
        },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/release-candidate-remediation-queue')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/release-candidate-remediation-queue')
        .set(authHeaders())
        .send({
          ...payload,
          verdictPacket: { verdictRows: [...payload.verdictPacket.verdictRows].reverse() },
          dependencyGraph: { edges: [...payload.dependencyGraph.edges].reverse() },
          evidenceRefs: [...payload.evidenceRefs].reverse(),
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.schemaVersion).toBe('settlement-release-candidate-remediation-queue.v1');
    expect(first.body.queueFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(first.body.queueFingerprint).toBe(second.body.queueFingerprint);
    expect(first.body.queueItems).toEqual(second.body.queueItems);
  });
});
