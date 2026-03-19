import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import {
  SETTLEMENT_PUBLICATION_DIAGNOSTICS_TREND_GATES,
  SETTLEMENT_PUBLICATION_DIAGNOSTICS_TREND_RISK_REASON_CODES,
} from '../src/settlements/publication-diagnostics-trend-digest';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement publication diagnostics trend digest endpoint', () => {
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

  it('returns deterministic trend digest rows with canonical reason codes and gate summary', async () => {
    const payload = {
      snapshotSummaries: [
        {
          sourceIssueIdentifier: 'ONE-701',
          snapshotSha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          generatedAt: '2026-03-19T00:01:00Z',
          driftSeverity: 'medium',
          driftCodes: ['type_changed'],
          breakingChangeCount: 1,
          riskReasonCodes: ['hash_mismatch'],
        },
        {
          sourceIssueIdentifier: 'ONE-700',
          snapshotSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          generatedAt: '2026-03-19T00:00:00Z',
          driftSeverity: 'high',
          driftCodes: ['new_contract_gap', 'breaking_change_spike'],
          breakingChangeCount: 2,
          riskReasonCodes: ['new_drift', 'severity_increase'],
        },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/publication-diagnostics-trend-digest')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/publication-diagnostics-trend-digest')
        .set(authHeaders())
        .send({ snapshotSummaries: [...payload.snapshotSummaries].reverse() }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.contract).toBe('settlement-publication-diagnostics-trend-digest.v1');
    expect(first.body.trendDigest.rows.map((row: { sourceIssueIdentifier: string }) => row.sourceIssueIdentifier)).toEqual([
      'ONE-700',
      'ONE-701',
    ]);
    expect(first.body.trendDigest.windowFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(first.body.regressionGateSummary.riskReasonCodes).toEqual(
      SETTLEMENT_PUBLICATION_DIAGNOSTICS_TREND_RISK_REASON_CODES.filter((code) => (
        code !== 'missing_snapshot_window'
      )),
    );
    expect(SETTLEMENT_PUBLICATION_DIAGNOSTICS_TREND_GATES).toContain(first.body.regressionGateSummary.recommendedGate);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
