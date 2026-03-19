import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement release-candidate scorecard endpoint', () => {
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

  it('orders entries by lanePriorityWeight, blockerWeight, dependencyDepthWeight, issueIdentifier, evidenceType, evidencePath', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/release-candidate-scorecard')
      .set(authHeaders())
      .send({
        candidateId: 'rc-2026-03-19.1',
        manifestFingerprint: 'manifest-sha-001',
        laneEvidence: [
          {
            issueIdentifier: 'ONE-302',
            lanePriorityWeight: 2,
            dependencyDepthWeight: 3,
            evidenceType: 'manifest',
            evidencePath: 'artifacts/one-302/manifest.json',
            manifestFingerprint: 'manifest-sha-001',
          },
          {
            issueIdentifier: 'ONE-301',
            lanePriorityWeight: 1,
            dependencyDepthWeight: 2,
            evidenceType: 'bundle',
            evidencePath: '',
            manifestFingerprint: 'manifest-sha-001',
          },
          {
            issueIdentifier: 'ONE-301',
            lanePriorityWeight: 1,
            dependencyDepthWeight: 1,
            evidenceType: 'contract',
            evidencePath: 'artifacts/one-301/contract.json',
            manifestFingerprint: 'manifest-sha-001',
            reasonCodes: ['ordering_regression'],
          },
        ],
        dependencyStates: [
          { issueIdentifier: 'ONE-301', dependencyDepthWeight: 1, dependencyStatus: 'resolved' },
          { issueIdentifier: 'ONE-302', dependencyDepthWeight: 4, dependencyStatus: 'blocked' },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.orderingKeySpec).toEqual([
      'lanePriorityWeight',
      'blockerWeight',
      'dependencyDepthWeight',
      'issueIdentifier',
      'evidenceType',
      'evidencePath',
    ]);
    expect(response.body.entries.map((entry: {
      lanePriorityWeight: number;
      blockerWeight: number;
      dependencyDepthWeight: number;
      issueIdentifier: string;
      evidenceType: string;
      evidencePath: string;
    }) => `${entry.lanePriorityWeight}:${entry.blockerWeight}:${entry.dependencyDepthWeight}:${entry.issueIdentifier}:${entry.evidenceType}:${entry.evidencePath}`)).toEqual([
      '1:0:1:ONE-301:bundle:missing/ONE-301/bundle',
      '1:1:1:ONE-301:contract:artifacts/one-301/contract.json',
      '2:0:4:ONE-302:manifest:artifacts/one-302/manifest.json',
    ]);
  });

  it('normalizes canonical reason codes and machine readiness fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/release-candidate-scorecard')
      .set(authHeaders())
      .send({
        candidateId: 'rc-2026-03-19.2',
        manifestFingerprint: 'manifest-sha-001',
        laneEvidence: [
          {
            issueIdentifier: 'ONE-321',
            lanePriorityWeight: 1,
            dependencyDepthWeight: 2,
            evidenceType: 'manifest',
            evidencePath: '',
            manifestFingerprint: 'manifest-sha-mismatch',
            reasonCodes: ['ordering-drift'],
            referenceLinks: ['/issues/ONE-241'],
          },
        ],
        dependencyStates: [
          {
            issueIdentifier: 'ONE-321',
            dependencyDepthWeight: 2,
            dependencyStatus: 'open',
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.blockingReasons).toEqual([
      'missing_evidence',
      'dependency_blocked',
      'fingerprint_drift',
    ]);
    expect(response.body.nonBlockingWarnings).toEqual([
      'ordering_regression',
      'reference_noncanonical',
    ]);
    expect(response.body.readyForQa).toBe(false);
    expect(response.body.recommendedNextOwner).toBe('pm');
    expect(response.body.coveragePercent).toBe(0);
  });

  it('keeps payload + fingerprint byte-stable for semantically identical input', async () => {
    const payload = {
      candidateId: 'rc-2026-03-19.3',
      manifestFingerprint: 'manifest-sha-001',
      laneEvidence: [
        {
          issueIdentifier: 'ONE-331',
          lanePriorityWeight: 1,
          dependencyDepthWeight: 1,
          evidenceType: 'manifest',
          evidencePath: 'artifacts/one-331/manifest.json',
          manifestFingerprint: 'manifest-sha-001',
          referenceLinks: ['/ONE/issues/ONE-241'],
        },
        {
          issueIdentifier: 'ONE-332',
          lanePriorityWeight: 2,
          dependencyDepthWeight: 2,
          evidenceType: 'digest',
          evidencePath: 'artifacts/one-332/digest.json',
          manifestFingerprint: 'manifest-sha-001',
          referenceLinks: ['/ONE/issues/ONE-291#document-plan'],
        },
      ],
      dependencyStates: [
        { issueIdentifier: 'ONE-331', dependencyDepthWeight: 1, dependencyStatus: 'resolved' },
        { issueIdentifier: 'ONE-332', dependencyDepthWeight: 2, dependencyStatus: 'resolved' },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/release-candidate-scorecard')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/release-candidate-scorecard')
        .set(authHeaders())
        .send({
          ...payload,
          laneEvidence: [...payload.laneEvidence].reverse(),
          dependencyStates: [...payload.dependencyStates].reverse(),
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.scorecardFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(first.body.scorecardFingerprint).toBe(second.body.scorecardFingerprint);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
