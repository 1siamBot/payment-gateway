import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement release evidence adjudication snapshot endpoint', () => {
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
      .post('/settlements/exceptions/release-evidence-adjudication-snapshot')
      .set(authHeaders())
      .send({
        candidateId: 'rc-2026-03-19.1',
        scorecardFingerprint: 'scorecard-sha-001',
        handoffPacketFingerprint: 'handoff-sha-001',
        laneEvidence: [
          {
            issueIdentifier: 'ONE-402',
            lanePriorityWeight: 2,
            readinessWeight: 2,
            evidenceType: 'manifest',
            evidencePath: 'artifacts/one-402/manifest.json',
          },
          {
            issueIdentifier: 'ONE-401',
            lanePriorityWeight: 1,
            readinessWeight: 0,
            evidenceType: 'bundle',
            evidencePath: '',
          },
          {
            issueIdentifier: 'ONE-401',
            lanePriorityWeight: 1,
            readinessWeight: 0,
            evidenceType: 'contract',
            evidencePath: 'artifacts/one-401/contract.json',
            reasonCodes: ['ordering-drift'],
          },
        ],
        dependencyBlocks: [
          {
            issueIdentifier: 'ONE-401',
            dependencyStatus: 'open',
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
      '1:0:0:ONE-401:bundle:missing/ONE-401/bundle',
      '1:0:0:ONE-401:contract:artifacts/one-401/contract.json',
      '2:2:2:ONE-402:manifest:artifacts/one-402/manifest.json',
    ]);
  });

  it('normalizes reason codes and machine adjudication fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/release-evidence-adjudication-snapshot')
      .set(authHeaders())
      .send({
        candidateId: 'rc-2026-03-19.2',
        scorecardFingerprint: 'scorecard-sha-001',
        handoffPacketFingerprint: 'handoff-sha-001',
        laneEvidence: [
          {
            issueIdentifier: 'ONE-421',
            lanePriorityWeight: 1,
            readinessWeight: 0,
            evidenceType: 'manifest',
            evidencePath: '',
            reasonCodes: ['ordering-drift'],
            referenceLinks: ['/issues/ONE-291'],
            scorecardFingerprint: 'scorecard-sha-mismatch',
            handoffPacketFingerprint: 'handoff-sha-mismatch',
          },
        ],
        dependencyBlocks: [
          {
            issueIdentifier: 'ONE-421',
            dependencyStatus: 'open',
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.entries[0].reasonCodes).toEqual([
      'missing_evidence',
      'dependency_blocked',
      'fingerprint_drift',
      'ordering_regression',
      'reference_noncanonical',
    ]);
    expect(response.body.blockingReasons).toEqual([
      'missing_evidence',
      'dependency_blocked',
      'fingerprint_drift',
    ]);
    expect(response.body.missingEvidence).toEqual([
      {
        issueIdentifier: 'ONE-421',
        evidenceType: 'manifest',
        evidencePath: 'missing/ONE-421/manifest',
        reasonCode: 'missing_evidence',
      },
    ]);
    expect(response.body.readyForQa).toBe(false);
    expect(response.body.adjudicationState).toBe('blocked');
    expect(response.body.ownerRouting).toBe('pm');
    expect(response.body.confidenceScore).toBe(0);
  });

  it('keeps payload + fingerprint byte-stable for semantically identical input', async () => {
    const payload = {
      candidateId: 'rc-2026-03-19.3',
      scorecardFingerprint: 'scorecard-sha-001',
      handoffPacketFingerprint: 'handoff-sha-001',
      laneEvidence: [
        {
          issueIdentifier: 'ONE-431',
          lanePriorityWeight: 1,
          readinessWeight: 2,
          evidenceType: 'manifest',
          evidencePath: 'artifacts/one-431/manifest.json',
          referenceLinks: ['/ONE/issues/ONE-291'],
        },
        {
          issueIdentifier: 'ONE-432',
          lanePriorityWeight: 2,
          readinessWeight: 1,
          evidenceType: 'handoff',
          evidencePath: 'artifacts/one-432/handoff.md',
          reasonCodes: ['ordering_regression'],
        },
      ],
      dependencyBlocks: [
        {
          issueIdentifier: 'ONE-431',
          dependencyStatus: 'resolved',
        },
        {
          issueIdentifier: 'ONE-432',
          dependencyStatus: 'resolved',
        },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/release-evidence-adjudication-snapshot')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/release-evidence-adjudication-snapshot')
        .set(authHeaders())
        .send({
          ...payload,
          laneEvidence: [...payload.laneEvidence].reverse(),
          dependencyBlocks: [...payload.dependencyBlocks].reverse(),
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.snapshotFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(first.body.snapshotFingerprint).toBe(second.body.snapshotFingerprint);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
