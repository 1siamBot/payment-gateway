import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';
import {
  RECONCILIATION_MISMATCH_DETAIL_FIXTURE_TIMESTAMP,
} from '../src/settlements/reconciliation-mismatch-detail-fixtures';

describe('Reconciliation mismatch detail endpoint', () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.INTERNAL_API_TOKEN = 'internal-reconciliation-token';

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
      'x-internal-token': 'internal-reconciliation-token',
      'x-actor-role': 'ops',
    };
  }

  it.each([
    ['recon_mismatch_amount_001', 'amount', 'RECON_AMOUNT_MISMATCH', 'amount.value'],
    ['recon_mismatch_currency_001', 'currency', 'RECON_CURRENCY_MISMATCH', 'amount.currency'],
    ['recon_mismatch_missing_event_001', 'missing_event', 'RECON_MISSING_EVENT', 'events.capture.succeeded'],
    ['recon_mismatch_duplicate_event_001', 'duplicate_event', 'RECON_DUPLICATE_EVENT', 'events.capture.succeeded.count'],
    ['recon_mismatch_stale_status_001', 'stale_status', 'RECON_STALE_STATUS', 'status.current'],
  ])(
    'returns deterministic mismatch detail for %s',
    async (mismatchId: string, category: string, reasonCode: string, firstPath: string) => {
      const response = await request(app.getHttpServer())
        .get(`/settlements/reconciliation/mismatch-details/${mismatchId}`)
        .set(authHeaders());

      expect(response.status).toBe(200);
      expect(response.body.contract).toBe('reconciliation-mismatch-detail.v1');
      expect(response.body.generatedAt).toBe(RECONCILIATION_MISMATCH_DETAIL_FIXTURE_TIMESTAMP);
      expect(response.body.mismatch).toEqual(expect.objectContaining({
        id: mismatchId,
        category,
        reasonCode,
      }));
      expect(response.body.mismatch.summary.fallbackApplied).toBe(false);
      expect(response.body.mismatch.summary.normalizedFieldPaths[0]).toBe(firstPath);
      expect(response.body.mismatch.expected.source).toBe('ledger');
      expect(response.body.mismatch.actual.source).toBe('provider');
      expect(response.body.mismatch.diffs[0]).toEqual(expect.objectContaining({
        path: firstPath,
        reasonCode,
      }));
    },
  );

  it('returns deterministic fallback response when fixture shape is malformed', async () => {
    const response = await request(app.getHttpServer())
      .get('/settlements/reconciliation/mismatch-details/recon_mismatch_malformed_001')
      .set(authHeaders());

    expect(response.status).toBe(200);
    expect(response.body.mismatch.summary).toEqual({
      mismatchCount: 1,
      normalizedFieldPaths: ['payload'],
      fallbackApplied: true,
    });
    expect(response.body.mismatch.reasonCode).toBe('RECON_FIXTURE_MALFORMED_FALLBACK');
    expect(response.body.mismatch.expected.payload).toEqual({});
    expect(response.body.mismatch.actual.payload).toEqual({});
    expect(response.body.mismatch.diffs).toEqual([
      {
        path: 'payload',
        reasonCode: 'RECON_FIXTURE_MALFORMED_FALLBACK',
        expected: 'unavailable',
        actual: 'unavailable',
      },
    ]);
  });

  it('returns not found for unknown mismatch id', async () => {
    const response = await request(app.getHttpServer())
      .get('/settlements/reconciliation/mismatch-details/recon_mismatch_unknown')
      .set(authHeaders());

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Reconciliation mismatch detail not found');
  });
});
