import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement publication evidence manifest endpoint', () => {
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

  it('orders manifest entries by lanePriorityWeight, dependencyDepthWeight, issueIdentifier, artifactType, artifactPath', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/publication-evidence-manifest')
      .set(authHeaders())
      .send({
        asOfIso: '2026-03-19T16:00:00Z',
        bundleDigest: 'bundle-sha-001',
        contractDigest: 'contract-sha-001',
        laneRefs: [
          { laneId: 'lane-b', issueIdentifier: 'ONE-302', lanePriorityWeight: 3, dependencyDepthWeight: 2 },
          { laneId: 'lane-a', issueIdentifier: 'ONE-301', lanePriorityWeight: 1, dependencyDepthWeight: 1 },
        ],
        artifactRefs: [
          { laneId: 'lane-b', issueIdentifier: 'ONE-302', artifactType: 'manifest', artifactPath: 'artifacts/one-302/z.md' },
          { laneId: 'lane-a', issueIdentifier: 'ONE-301', artifactType: 'contract', artifactPath: 'artifacts/one-301/a.json' },
          { laneId: 'lane-a', issueIdentifier: 'ONE-301', artifactType: 'manifest', artifactPath: 'artifacts/one-301/b.md' },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.orderingKeySpec).toEqual([
      'lanePriorityWeight',
      'dependencyDepthWeight',
      'issueIdentifier',
      'artifactType',
      'artifactPath',
    ]);
    expect(response.body.entries.map((entry: { issueIdentifier: string; artifactType: string; artifactPath: string }) => (
      `${entry.issueIdentifier}:${entry.artifactType}:${entry.artifactPath}`
    ))).toEqual([
      'ONE-301:contract:artifacts/one-301/a.json',
      'ONE-301:manifest:artifacts/one-301/b.md',
      'ONE-302:manifest:artifacts/one-302/z.md',
    ]);
  });

  it('normalizes reason codes to canonical publication evidence manifest reason set', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/publication-evidence-manifest')
      .set(authHeaders())
      .send({
        bundleDigest: 'bundle-sha-001',
        contractDigest: 'contract-sha-001',
        laneRefs: [
          {
            laneId: 'lane-a',
            issueIdentifier: 'ONE-321',
            lanePriorityWeight: 1,
            dependencyDepthWeight: 1,
            dependencyStatus: 'open',
            reasonCodes: ['dependency_open', 'ordering-drift'],
            dependencyIssueLink: '/issues/ONE-269',
          },
        ],
        artifactRefs: [
          {
            laneId: 'lane-a',
            issueIdentifier: 'ONE-321',
            artifactType: 'manifest',
            artifactPath: '',
            bundleDigest: 'bundle-sha-mismatch',
            contractDigest: 'contract-sha-mismatch',
            referenceLinks: ['/issues/ONE-241'],
            reasonCodes: ['artifact_gap'],
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.validatorReasonCodes).toEqual([
      'missing_artifact',
      'dependency_violation',
      'fingerprint_mismatch',
      'ordering_regression',
      'reference_noncanonical',
    ]);
    expect(response.body.missingEvidence[0].reasonCodes).toEqual([
      'missing_artifact',
      'fingerprint_mismatch',
      'ordering_regression',
      'reference_noncanonical',
    ]);
    expect(response.body.dependencyViolations[0].reasonCodes).toEqual([
      'dependency_violation',
      'ordering_regression',
      'reference_noncanonical',
    ]);
    expect(response.body.isReleaseGateReady).toBe(false);
  });

  it('keeps manifest payload and fingerprint byte-stable for semantically identical inputs', async () => {
    const payload = {
      asOfIso: '2026-03-19T16:20:00Z',
      bundleDigest: 'bundle-sha-001',
      contractDigest: 'contract-sha-001',
      laneRefs: [
        { laneId: 'lane-b', issueIdentifier: 'ONE-332', lanePriorityWeight: 2, dependencyDepthWeight: 2 },
        { laneId: 'lane-a', issueIdentifier: 'ONE-331', lanePriorityWeight: 1, dependencyDepthWeight: 1 },
      ],
      artifactRefs: [
        {
          laneId: 'lane-a',
          issueIdentifier: 'ONE-331',
          artifactType: 'manifest',
          artifactPath: 'artifacts/one-331/manifest.md',
          bundleDigest: 'bundle-sha-001',
          contractDigest: 'contract-sha-001',
          referenceLinks: ['/ONE/issues/ONE-241'],
          reasonCodes: [],
        },
        {
          laneId: 'lane-b',
          issueIdentifier: 'ONE-332',
          artifactType: 'digest',
          artifactPath: 'artifacts/one-332/digest.json',
          bundleDigest: 'bundle-sha-001',
          contractDigest: 'contract-sha-001',
          referenceLinks: ['/ONE/issues/ONE-269#document-plan'],
          reasonCodes: [],
        },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/publication-evidence-manifest')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/publication-evidence-manifest')
        .set(authHeaders())
        .send({
          ...payload,
          laneRefs: [...payload.laneRefs].reverse(),
          artifactRefs: [...payload.artifactRefs].reverse(),
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.manifestFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(first.body.manifestFingerprint).toBe(second.body.manifestFingerprint);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
