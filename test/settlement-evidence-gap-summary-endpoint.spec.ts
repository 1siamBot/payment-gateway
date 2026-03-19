import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement evidence gap summary endpoint', () => {
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

  it('returns deterministic evidence-gap summary contract', async () => {
    const payload = {
      rows: [
        {
          lane: 'reconcile',
          lanePriority: 2,
          severity: 'medium',
          issueIdentifier: 'ONE-702',
          branch: '',
          fullSha: '1234567890abcdef1234567890abcdef12345678',
          prLink: '',
          testCommand: 'npm test',
          artifactPath: 'artifacts/one-702/report.txt',
          blockerOwner: 'platform',
          blockerEta: '2026-03-21T12:30:00Z',
        },
        {
          lane: 'publish',
          lanePriority: 1,
          severity: 'high',
          issueIdentifier: 'ONE-701',
          branch: '',
          fullSha: '',
          prLink: 'https://github.com/1siamBot/payment-gateway/pull/701',
          testCommand: '',
          artifactPath: '',
          blockerOwner: '',
          blockerEta: '',
        },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/evidence-gap-summary')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/evidence-gap-summary')
        .set(authHeaders())
        .send({
          rows: [...payload.rows].reverse(),
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.contract).toBe('settlement-evidence-gap-summary.v1');
    expect(first.body.rows.map((row: { issueIdentifier: string; remediationHintCode: string }) => ({
      issueIdentifier: row.issueIdentifier,
      code: row.remediationHintCode,
    }))).toEqual([
      { issueIdentifier: 'ONE-701', code: 'MISSING_BRANCH' },
      { issueIdentifier: 'ONE-701', code: 'MISSING_FULL_SHA' },
      { issueIdentifier: 'ONE-701', code: 'MISSING_TEST_COMMAND' },
      { issueIdentifier: 'ONE-701', code: 'MISSING_ARTIFACT_PATH' },
      { issueIdentifier: 'ONE-702', code: 'MISSING_BRANCH' },
      { issueIdentifier: 'ONE-702', code: 'MISSING_PR_LINK' },
    ]);
    expect(first.body.counters.totals).toEqual({
      completeCount: 0,
      gapCount: 2,
      totalCount: 2,
    });
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });

  it('rejects absent blocker owner/eta when prLink is missing with deterministic error shape', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/evidence-gap-summary')
      .set(authHeaders())
      .send({
        rows: [
          {
            lane: 'publish',
            lanePriority: 1,
            severity: 'high',
            issueIdentifier: 'ONE-710',
            branch: 'backend/one-710',
            fullSha: '1234567890abcdef1234567890abcdef12345678',
            prLink: '',
            testCommand: 'npm test',
            artifactPath: 'artifacts/one-710/log.txt',
            blockerOwner: '',
            blockerEta: 'bad-date',
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'SETTLEMENT_EVIDENCE_GAP_VALIDATION_FAILED',
      message: 'evidence gap summary validation failed',
      errors: [
        {
          field: 'rows[0].blockerEta',
          reason: 'invalid_value',
          message: 'must be an ISO-8601 datetime string when provided',
        },
        {
          field: 'rows[0].blockerEta',
          reason: 'required',
          message: 'blockerEta is required when prLink is absent',
        },
        {
          field: 'rows[0].blockerOwner',
          reason: 'required',
          message: 'blockerOwner is required when prLink is absent',
        },
      ],
    });
  });
});
