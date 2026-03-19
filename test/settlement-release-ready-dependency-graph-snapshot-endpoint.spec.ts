import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement release-ready dependency graph snapshot endpoint', () => {
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

  it('orders graph rows by lanePriorityWeight, dependencyDepthWeight, blockerWeight, issueIdentifier, evidenceTypeWeight, evidencePath', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/release-ready-dependency-graph-snapshot')
      .set(authHeaders())
      .send({
        candidateId: 'rc-2026-03-19.1',
        laneRefs: [
          { issueIdentifier: 'ONE-511', lanePriorityWeight: 2, dependencyDepthWeight: 1 },
          { issueIdentifier: 'ONE-510', lanePriorityWeight: 1, dependencyDepthWeight: 2 },
        ],
        dependencyRefs: [
          {
            issueIdentifier: 'ONE-510',
            dependsOnIssueIdentifier: 'ONE-700',
            dependencyDepthWeight: 2,
            dependencyStatus: 'resolved',
          },
          {
            issueIdentifier: 'ONE-511',
            dependsOnIssueIdentifier: 'ONE-701',
            dependencyDepthWeight: 1,
            dependencyStatus: 'resolved',
          },
        ],
        evidenceRefs: [
          {
            issueIdentifier: 'ONE-511',
            evidenceTypeWeight: 3,
            evidencePath: 'artifacts/one-511/c.json',
          },
          {
            issueIdentifier: 'ONE-510',
            evidenceTypeWeight: 1,
            evidencePath: 'artifacts/one-510/a.json',
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.orderingKeySpec).toEqual([
      'lanePriorityWeight',
      'dependencyDepthWeight',
      'blockerWeight',
      'issueIdentifier',
      'evidenceTypeWeight',
      'evidencePath',
    ]);

    expect(response.body.nodes.map((node: {
      lanePriorityWeight: number;
      dependencyDepthWeight: number;
      blockerWeight: number;
      issueIdentifier: string;
      evidenceTypeWeight: number;
      evidencePath: string;
    }) => `${node.lanePriorityWeight}:${node.dependencyDepthWeight}:${node.blockerWeight}:${node.issueIdentifier}:${node.evidenceTypeWeight}:${node.evidencePath}`)).toEqual([
      '1:2:2:ONE-510:1:artifacts/one-510/a.json',
      '2:1:2:ONE-511:3:artifacts/one-511/c.json',
      '999:999:0:ONE-700:999:missing/ONE-700/evidence',
      '999:999:0:ONE-701:999:missing/ONE-701/evidence',
    ]);
  });

  it('normalizes reason codes and machine fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/release-ready-dependency-graph-snapshot')
      .set(authHeaders())
      .send({
        candidateId: 'rc-2026-03-19.2',
        laneRefs: [
          {
            issueIdentifier: 'ONE-521',
            lanePriorityWeight: 1,
            dependencyDepthWeight: 0,
            reasonCodes: ['ordering-drift'],
            referenceLinks: ['/issues/ONE-291'],
          },
        ],
        dependencyRefs: [
          {
            issueIdentifier: 'ONE-521',
            dependsOnIssueIdentifier: 'ONE-522',
            dependencyDepthWeight: 1,
            dependencyStatus: 'open',
            reasonCodes: ['fingerprint-mismatch'],
          },
        ],
        evidenceRefs: [
          {
            issueIdentifier: 'ONE-521',
            evidenceTypeWeight: 2,
            evidencePath: '',
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.nodes[0].reasonCodes).toEqual([
      'missing_evidence',
      'dependency_blocked',
      'fingerprint_drift',
      'ordering_regression',
      'reference_noncanonical',
    ]);
    expect(response.body.missingEvidence).toEqual([
      {
        issueIdentifier: 'ONE-521',
        evidenceType: 'evidence',
        evidencePath: 'missing/ONE-521/evidence',
        reasonCode: 'missing_evidence',
      },
      {
        issueIdentifier: 'ONE-522',
        evidenceType: 'evidence',
        evidencePath: 'missing/ONE-522/evidence',
        reasonCode: 'missing_evidence',
      },
    ]);
    expect(response.body.blockedDependencies).toEqual([
      {
        issueIdentifier: 'ONE-521',
        dependencyIssueIdentifier: 'ONE-522',
        dependencyStatus: 'open',
        reasonCode: 'dependency_blocked',
      },
    ]);
    expect(response.body.nonCanonicalLinks).toEqual([
      {
        issueIdentifier: 'ONE-521',
        link: '/issues/ONE-291',
      },
    ]);
    expect(response.body.isReadyForQa).toBe(false);
    expect(response.body.nextOwner).toBe('pm');
  });

  it('keeps payload and graph fingerprint byte-stable for semantically identical input', async () => {
    const payload = {
      candidateId: 'rc-2026-03-19.3',
      laneRefs: [
        { issueIdentifier: 'ONE-531', lanePriorityWeight: 1, dependencyDepthWeight: 1 },
        { issueIdentifier: 'ONE-532', lanePriorityWeight: 2, dependencyDepthWeight: 2 },
      ],
      dependencyRefs: [
        {
          issueIdentifier: 'ONE-531',
          dependsOnIssueIdentifier: 'ONE-640',
          dependencyDepthWeight: 2,
          dependencyStatus: 'resolved',
        },
        {
          issueIdentifier: 'ONE-532',
          dependsOnIssueIdentifier: 'ONE-641',
          dependencyDepthWeight: 3,
          dependencyStatus: 'resolved',
        },
      ],
      evidenceRefs: [
        {
          issueIdentifier: 'ONE-531',
          evidenceTypeWeight: 1,
          evidencePath: 'artifacts/one-531/dependency-graph.json',
          referenceLinks: ['/ONE/issues/ONE-291'],
        },
        {
          issueIdentifier: 'ONE-532',
          evidenceTypeWeight: 2,
          evidencePath: 'artifacts/one-532/dependency-graph.json',
        },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/release-ready-dependency-graph-snapshot')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/release-ready-dependency-graph-snapshot')
        .set(authHeaders())
        .send({
          ...payload,
          laneRefs: [...payload.laneRefs].reverse(),
          dependencyRefs: [...payload.dependencyRefs].reverse(),
          evidenceRefs: [...payload.evidenceRefs].reverse(),
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.graphFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(first.body.graphFingerprint).toBe(second.body.graphFingerprint);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
