import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement adjudication routing manifest endpoint', () => {
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

  it('orders dispatch lanes by readyForQaWeight, blockerSeverityWeight, dependencyDepthWeight, issueIdentifier, evidenceType, evidencePath', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/adjudication-routing-manifest')
      .set(authHeaders())
      .send({
        snapshotFingerprint: 'snapshot-sha-001',
        candidateId: 'rc-2026-03-19.1',
        laneEvidence: [
          {
            issueIdentifier: 'ONE-403',
            readyForQaWeight: 2,
            blockerSeverityWeight: 2,
            dependencyDepthWeight: 1,
            evidenceType: 'manifest',
            evidencePath: 'artifacts/one-403/manifest.json',
          },
          {
            issueIdentifier: 'ONE-401',
            readyForQaWeight: 0,
            blockerSeverityWeight: 2,
            dependencyDepthWeight: 2,
            evidenceType: 'handoff',
            evidencePath: '',
          },
          {
            issueIdentifier: 'ONE-402',
            readyForQaWeight: 1,
            blockerSeverityWeight: 1,
            dependencyDepthWeight: 1,
            evidenceType: 'contract',
            evidencePath: 'artifacts/one-402/contract.json',
            reasonCodes: ['ordering-drift'],
          },
        ],
        blockingReasons: [],
        missingEvidence: [],
      });

    expect(response.status).toBe(201);
    expect(response.body.orderingKeySpec).toEqual([
      'readyForQaWeight',
      'blockerSeverityWeight',
      'dependencyDepthWeight',
      'issueIdentifier',
      'evidenceType',
      'evidencePath',
    ]);
    expect(response.body.dispatchLanes.map((lane: {
      readyForQaWeight: number;
      blockerSeverityWeight: number;
      dependencyDepthWeight: number;
      issueIdentifier: string;
      evidenceType: string;
      evidencePath: string;
    }) => (
      `${lane.readyForQaWeight}:${lane.blockerSeverityWeight}:${lane.dependencyDepthWeight}:${lane.issueIdentifier}:${lane.evidenceType}:${lane.evidencePath}`
    ))).toEqual([
      '0:0:2:ONE-401:handoff:missing/ONE-401/handoff',
      '1:1:1:ONE-402:contract:artifacts/one-402/contract.json',
      '2:2:1:ONE-403:manifest:artifacts/one-403/manifest.json',
    ]);
  });

  it('normalizes reason codes and machine routing fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/adjudication-routing-manifest')
      .set(authHeaders())
      .send({
        snapshotFingerprint: 'snapshot-sha-002',
        candidateId: 'rc-2026-03-19.2',
        laneEvidence: [
          {
            issueIdentifier: 'ONE-421',
            readyForQaWeight: 0,
            dependencyDepthWeight: 3,
            evidenceType: 'manifest',
            evidencePath: '',
            reasonCodes: ['ordering-drift'],
            referenceLinks: ['/issues/ONE-291'],
          },
        ],
        blockingReasons: ['dependency_open', 'fingerprint-mismatch'],
        missingEvidence: [
          {
            issueIdentifier: 'ONE-421',
            evidenceType: 'manifest',
            evidencePath: 'missing/ONE-421/manifest',
            reasonCode: 'missing_artifact',
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.dispatchLanes[0].reasonCodes).toEqual([
      'missing_evidence',
      'dependency_blocked',
      'fingerprint_drift',
      'ordering_regression',
      'reference_noncanonical',
    ]);
    expect(response.body.blockedLanes).toHaveLength(1);
    expect(response.body.qaReadyLanes).toHaveLength(0);
    expect(response.body.ownerRouting.pm).toEqual(['ONE-421']);
    expect(response.body.ownerRouting.qa).toEqual([]);
    expect(response.body.ownerRouting.backend).toEqual([]);
    expect(response.body.escalationTargets).toEqual([
      {
        owner: 'pm',
        issueIdentifiers: ['ONE-421'],
        reasonCodes: [
          'missing_evidence',
          'dependency_blocked',
          'fingerprint_drift',
          'ordering_regression',
          'reference_noncanonical',
        ],
      },
    ]);
    expect(response.body.confidenceScore).toBe(0);
  });

  it('keeps routing manifest payload and fingerprint byte-stable for semantically identical input', async () => {
    const payload = {
      snapshotFingerprint: 'snapshot-sha-003',
      candidateId: 'rc-2026-03-19.3',
      laneEvidence: [
        {
          issueIdentifier: 'ONE-431',
          readyForQaWeight: 2,
          blockerSeverityWeight: 2,
          dependencyDepthWeight: 1,
          evidenceType: 'manifest',
          evidencePath: 'artifacts/one-431/manifest.json',
          referenceLinks: ['/ONE/issues/ONE-291'],
        },
        {
          issueIdentifier: 'ONE-432',
          readyForQaWeight: 1,
          blockerSeverityWeight: 1,
          dependencyDepthWeight: 2,
          evidenceType: 'handoff',
          evidencePath: 'artifacts/one-432/handoff.md',
          reasonCodes: ['ordering_regression'],
        },
      ],
      blockingReasons: ['ordering_regression'],
      missingEvidence: [
        {
          issueIdentifier: 'ONE-432',
          evidenceType: 'handoff',
          evidencePath: 'artifacts/one-432/handoff.md',
          reasonCode: 'ordering_regression',
        },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/adjudication-routing-manifest')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/adjudication-routing-manifest')
        .set(authHeaders())
        .send({
          ...payload,
          laneEvidence: [...payload.laneEvidence].reverse(),
          blockingReasons: [...payload.blockingReasons].reverse(),
          missingEvidence: [...payload.missingEvidence].reverse(),
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.manifestFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(first.body.manifestFingerprint).toBe(second.body.manifestFingerprint);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
