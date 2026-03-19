import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement release-candidate handoff packet endpoint', () => {
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

  it('orders entries by lanePriorityWeight, readinessWeight, blockerWeight, issueIdentifier, evidenceType, evidencePath', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/release-candidate-handoff-packet')
      .set(authHeaders())
      .send({
        candidateId: 'rc-2026-03-19.1',
        scorecardFingerprint: 'scorecard-sha-001',
        manifestFingerprint: 'manifest-sha-001',
        laneStatuses: [
          {
            issueIdentifier: 'ONE-302',
            lanePriorityWeight: 2,
            readinessWeight: 1,
            dependencyStatus: 'resolved',
          },
          {
            issueIdentifier: 'ONE-301',
            lanePriorityWeight: 1,
            readinessWeight: 0,
            dependencyStatus: 'open',
          },
        ],
        evidenceRefs: [
          {
            issueIdentifier: 'ONE-302',
            evidenceType: 'manifest',
            evidencePath: 'artifacts/one-302/manifest.json',
            scorecardFingerprint: 'scorecard-sha-001',
            manifestFingerprint: 'manifest-sha-001',
          },
          {
            issueIdentifier: 'ONE-301',
            evidenceType: 'bundle',
            evidencePath: '',
            scorecardFingerprint: 'scorecard-sha-001',
            manifestFingerprint: 'manifest-sha-001',
          },
          {
            issueIdentifier: 'ONE-301',
            evidenceType: 'contract',
            evidencePath: 'artifacts/one-301/contract.json',
            reasonCodes: ['ordering-drift'],
            scorecardFingerprint: 'scorecard-sha-001',
            manifestFingerprint: 'manifest-sha-001',
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.orderingKeySpec).toEqual([
      'lanePriorityWeight',
      'readinessWeight',
      'blockerWeight',
      'issueIdentifier',
      'evidenceType',
      'evidencePath',
    ]);
    expect(response.body.entries.map((entry: {
      lanePriorityWeight: number;
      readinessWeight: number;
      blockerWeight: number;
      issueIdentifier: string;
      evidenceType: string;
      evidencePath: string;
    }) => `${entry.lanePriorityWeight}:${entry.readinessWeight}:${entry.blockerWeight}:${entry.issueIdentifier}:${entry.evidenceType}:${entry.evidencePath}`)).toEqual([
      '1:0:0:ONE-301:bundle:missing/ONE-301/bundle',
      '1:0:0:ONE-301:contract:artifacts/one-301/contract.json',
      '2:1:2:ONE-302:manifest:artifacts/one-302/manifest.json',
    ]);
  });

  it('normalizes reason codes and emits machine readiness fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/release-candidate-handoff-packet')
      .set(authHeaders())
      .send({
        candidateId: 'rc-2026-03-19.2',
        scorecardFingerprint: 'scorecard-sha-001',
        manifestFingerprint: 'manifest-sha-001',
        laneStatuses: [
          {
            issueIdentifier: 'ONE-321',
            lanePriorityWeight: 1,
            readinessWeight: 0,
            dependencyStatus: 'open',
          },
        ],
        evidenceRefs: [
          {
            issueIdentifier: 'ONE-321',
            evidenceType: 'manifest',
            evidencePath: '',
            reasonCodes: ['ordering-drift'],
            referenceLinks: ['/issues/ONE-291'],
            scorecardFingerprint: 'scorecard-sha-mismatch',
            manifestFingerprint: 'manifest-sha-mismatch',
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.validatorReasonCodes).toEqual([
      'missing_evidence',
      'dependency_blocked',
      'fingerprint_drift',
      'ordering_regression',
      'reference_noncanonical',
    ]);
    expect(response.body.readyForQa).toBe(false);
    expect(response.body.nextOwner).toBe('pm');
    expect(response.body.missingEvidence).toEqual([
      {
        issueIdentifier: 'ONE-321',
        evidenceType: 'manifest',
        evidencePath: 'missing/ONE-321/manifest',
        reasonCode: 'missing_evidence',
      },
    ]);
    expect(response.body.dependencyBlocks).toEqual([
      {
        issueIdentifier: 'ONE-321',
        dependencyStatus: 'open',
        reasonCode: 'dependency_blocked',
      },
    ]);
    expect(response.body.canonicalLinkViolations).toEqual(['/issues/ONE-291']);
  });

  it('keeps packet payload + fingerprint byte-stable for semantically identical input', async () => {
    const payload = {
      candidateId: 'rc-2026-03-19.3',
      scorecardFingerprint: 'scorecard-sha-001',
      manifestFingerprint: 'manifest-sha-001',
      laneStatuses: [
        {
          issueIdentifier: 'ONE-332',
          lanePriorityWeight: 2,
          readinessWeight: 2,
          dependencyStatus: 'resolved',
        },
        {
          issueIdentifier: 'ONE-331',
          lanePriorityWeight: 1,
          readinessWeight: 2,
          dependencyStatus: 'resolved',
        },
      ],
      evidenceRefs: [
        {
          issueIdentifier: 'ONE-331',
          evidenceType: 'manifest',
          evidencePath: 'artifacts/one-331/manifest.json',
          referenceLinks: ['/ONE/issues/ONE-291'],
          scorecardFingerprint: 'scorecard-sha-001',
          manifestFingerprint: 'manifest-sha-001',
        },
        {
          issueIdentifier: 'ONE-332',
          evidenceType: 'digest',
          evidencePath: 'artifacts/one-332/digest.json',
          referenceLinks: ['/ONE/issues/ONE-287#document-plan'],
          scorecardFingerprint: 'scorecard-sha-001',
          manifestFingerprint: 'manifest-sha-001',
        },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/release-candidate-handoff-packet')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/release-candidate-handoff-packet')
        .set(authHeaders())
        .send({
          ...payload,
          laneStatuses: [...payload.laneStatuses].reverse(),
          evidenceRefs: [...payload.evidenceRefs].reverse(),
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.packetFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(first.body.packetFingerprint).toBe(second.body.packetFingerprint);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
