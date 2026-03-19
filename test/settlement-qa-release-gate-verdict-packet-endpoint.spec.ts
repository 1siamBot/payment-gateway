import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement QA release gate verdict packet endpoint', () => {
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

  it('orders verdict rows by gatePriorityWeight, blockerWeight, dependencyDepthWeight, issueIdentifier, evidenceTypeWeight, evidencePath', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/qa-release-gate-verdict-packet')
      .set(authHeaders())
      .send({
        candidateId: 'rc-2026-03-19.1',
        policyVersion: 'qa-policy.v3',
        laneStatuses: [
          { issueIdentifier: 'ONE-811', gatePriorityWeight: 2, dependencyDepthWeight: 2 },
          { issueIdentifier: 'ONE-810', gatePriorityWeight: 1, dependencyDepthWeight: 1 },
        ],
        dependencyGraph: {
          edges: [
            {
              issueIdentifier: 'ONE-811',
              dependsOnIssueIdentifier: 'ONE-900',
              dependencyDepthWeight: 3,
              dependencyStatus: 'resolved',
            },
            {
              issueIdentifier: 'ONE-810',
              dependsOnIssueIdentifier: 'ONE-901',
              dependencyDepthWeight: 1,
              dependencyStatus: 'resolved',
            },
          ],
        },
        evidenceManifestRefs: [
          {
            issueIdentifier: 'ONE-811',
            evidenceTypeWeight: 3,
            evidencePath: 'artifacts/one-811/gate.json',
          },
          {
            issueIdentifier: 'ONE-810',
            evidenceTypeWeight: 1,
            evidencePath: 'artifacts/one-810/gate.json',
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.orderingKeySpec).toEqual([
      'gatePriorityWeight',
      'blockerWeight',
      'dependencyDepthWeight',
      'issueIdentifier',
      'evidenceTypeWeight',
      'evidencePath',
    ]);

    expect(response.body.verdictRows.map((entry: {
      gatePriorityWeight: number;
      blockerWeight: number;
      dependencyDepthWeight: number;
      issueIdentifier: string;
      evidenceTypeWeight: number;
      evidencePath: string;
    }) => `${entry.gatePriorityWeight}:${entry.blockerWeight}:${entry.dependencyDepthWeight}:${entry.issueIdentifier}:${entry.evidenceTypeWeight}:${entry.evidencePath}`)).toEqual([
      '1:2:1:ONE-810:1:artifacts/one-810/gate.json',
      '2:2:2:ONE-811:3:artifacts/one-811/gate.json',
      '999:0:999:ONE-900:999:missing/ONE-900/evidence',
      '999:0:999:ONE-901:999:missing/ONE-901/evidence',
    ]);
  });

  it('normalizes canonical reasons and emits required machine fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/qa-release-gate-verdict-packet')
      .set(authHeaders())
      .send({
        candidateId: 'rc-2026-03-19.2',
        policyVersion: 'qa-policy.v3',
        laneStatuses: [
          {
            issueIdentifier: 'ONE-820',
            gatePriorityWeight: 1,
            dependencyDepthWeight: 0,
            reasonCodes: ['ordering-drift', 'policy failed'],
            referenceLinks: ['/issues/ONE-291'],
          },
        ],
        dependencyGraph: {
          edges: [
            {
              issueIdentifier: 'ONE-820',
              dependsOnIssueIdentifier: 'ONE-821',
              dependencyDepthWeight: 1,
              dependencyStatus: 'open',
              reasonCodes: ['dependency still open'],
            },
          ],
        },
        evidenceManifestRefs: [
          {
            issueIdentifier: 'ONE-820',
            evidenceTypeWeight: 2,
            evidencePath: '',
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.verdictRows[0].reasonCodes).toEqual([
      'missing_evidence',
      'dependency_blocked',
      'policy_violation',
      'ordering_regression',
      'reference_noncanonical',
    ]);
    expect(response.body.missingEvidence).toEqual([
      {
        issueIdentifier: 'ONE-820',
        evidenceType: 'evidence',
        evidencePath: 'missing/ONE-820/evidence',
        reasonCode: 'missing_evidence',
      },
      {
        issueIdentifier: 'ONE-821',
        evidenceType: 'evidence',
        evidencePath: 'missing/ONE-821/evidence',
        reasonCode: 'missing_evidence',
      },
    ]);
    expect(response.body.blockingDependencies).toEqual([
      {
        issueIdentifier: 'ONE-820',
        dependencyIssueIdentifier: 'ONE-821',
        dependencyStatus: 'open',
        reasonCode: 'dependency_blocked',
      },
    ]);
    expect(response.body.requiredRemediations).toEqual([
      expect.objectContaining({
        issueIdentifier: 'ONE-820',
        reasonCode: 'dependency_blocked',
        owner: 'pm',
      }),
      expect.objectContaining({
        issueIdentifier: 'ONE-820',
        reasonCode: 'missing_evidence',
        owner: 'backend',
      }),
      expect.objectContaining({
        issueIdentifier: 'ONE-820',
        reasonCode: 'policy_violation',
        owner: 'backend',
      }),
      expect.objectContaining({
        issueIdentifier: 'ONE-821',
        reasonCode: 'missing_evidence',
        owner: 'backend',
      }),
    ]);
    expect(response.body.releaseGateState).toBe('blocked');
    expect(response.body.nextOwner).toBe('pm');
  });

  it('keeps payload and verdict fingerprint byte-stable for semantically identical input', async () => {
    const payload = {
      candidateId: 'rc-2026-03-19.3',
      policyVersion: 'qa-policy.v3',
      laneStatuses: [
        { issueIdentifier: 'ONE-830', gatePriorityWeight: 1, dependencyDepthWeight: 1 },
        { issueIdentifier: 'ONE-831', gatePriorityWeight: 2, dependencyDepthWeight: 2 },
      ],
      dependencyGraph: {
        edges: [
          {
            issueIdentifier: 'ONE-830',
            dependsOnIssueIdentifier: 'ONE-940',
            dependencyDepthWeight: 1,
            dependencyStatus: 'resolved',
          },
          {
            issueIdentifier: 'ONE-831',
            dependsOnIssueIdentifier: 'ONE-941',
            dependencyDepthWeight: 2,
            dependencyStatus: 'resolved',
          },
        ],
      },
      evidenceManifestRefs: [
        {
          issueIdentifier: 'ONE-830',
          evidenceTypeWeight: 1,
          evidencePath: 'artifacts/one-830/gate.json',
          referenceLinks: ['/ONE/issues/ONE-291'],
        },
        {
          issueIdentifier: 'ONE-831',
          evidenceTypeWeight: 2,
          evidencePath: 'artifacts/one-831/gate.json',
        },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/qa-release-gate-verdict-packet')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/qa-release-gate-verdict-packet')
        .set(authHeaders())
        .send({
          ...payload,
          laneStatuses: [...payload.laneStatuses].reverse(),
          dependencyGraph: { edges: [...payload.dependencyGraph.edges].reverse() },
          evidenceManifestRefs: [...payload.evidenceManifestRefs].reverse(),
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.verdictFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(first.body.verdictFingerprint).toBe(second.body.verdictFingerprint);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
