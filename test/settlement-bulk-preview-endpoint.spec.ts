import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SettlementExceptionStatus } from '@prisma/client';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import {
  BULK_SETTLEMENT_ROLLBACK_REASON_CODES,
  BULK_SETTLEMENT_PREVIEW_RISK_BUCKETS,
  BULK_SETTLEMENT_PREVIEW_STATUS_BUCKETS,
} from '../src/settlements/bulk-settlement-preview';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Settlement bulk action preview endpoint', () => {
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

  it('returns deterministic summary fields for valid selection', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/bulk-action-preview')
      .set(authHeaders())
      .send({
        rows: [
          { id: 'se-2', status: SettlementExceptionStatus.INVESTIGATING, deltaAmount: 12 },
          { id: 'se-1', status: SettlementExceptionStatus.OPEN, deltaAmount: 30 },
          { id: 'se-3', status: SettlementExceptionStatus.RESOLVED, deltaAmount: -2 },
          { id: 'se-4', status: SettlementExceptionStatus.IGNORED, deltaAmount: -18 },
        ],
        selectedExceptionIds: ['se-1', 'se-2', 'se-3', 'se-4'],
      });

    expect(response.status).toBe(201);
    expect(response.body.contract).toBe('settlement-bulk-action-preview.v1');
    expect(response.body.selectedCount).toBe(4);
    expect(response.body.byStatus).toEqual({
      OPEN: 1,
      INVESTIGATING: 1,
      RESOLVED: 1,
      IGNORED: 1,
    });
    expect(response.body.byRiskBucket).toEqual({
      low: 1,
      medium: 1,
      high: 1,
      critical: 1,
    });
    expect(response.body.malformedCount).toBe(0);
    expect(response.body.warnings).toEqual([]);
    expect(response.body.metadata.requestedCount).toBe(4);
    expect(response.body.metadata.validCount).toBe(4);
    expect(response.body.metadata.hasMismatch).toBe(false);
    expect(response.body.recommendation).toEqual({
      contract: 'settlement-bulk-rollback-recommendation.v1',
      classification: 'rollback_recommended',
      bucketCounts: {
        safe_to_apply: 0,
        needs_review: 0,
        rollback_recommended: 1,
      },
      reasonCodes: ['MIXED_STATUS_SELECTION', 'HIGH_DELTA_ANOMALY'],
      reasonCodeMap: expect.any(Array),
    });
    expect(response.body.recommendation.reasonCodeMap).toHaveLength(4);
    expect(response.body.recommendation.reasonCodeMap.map((row: { code: string }) => row.code)).toEqual(
      [...BULK_SETTLEMENT_ROLLBACK_REASON_CODES],
    );
    expect(Object.keys(response.body.byStatus)).toEqual([...BULK_SETTLEMENT_PREVIEW_STATUS_BUCKETS]);
    expect(Object.keys(response.body.byRiskBucket)).toEqual([...BULK_SETTLEMENT_PREVIEW_RISK_BUCKETS]);
  });

  it('returns zeroed deterministic summary for empty selection', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/bulk-action-preview')
      .set(authHeaders())
      .send({
        rows: [{ id: 'se-1', status: SettlementExceptionStatus.OPEN, deltaAmount: 10 }],
        selectedExceptionIds: [],
      });

    expect(response.status).toBe(201);
    expect(response.body.selectedCount).toBe(0);
    expect(response.body.malformedCount).toBe(0);
    expect(response.body.metadata.hasMismatch).toBe(false);
    expect(response.body.byStatus).toEqual({
      OPEN: 0,
      INVESTIGATING: 0,
      RESOLVED: 0,
      IGNORED: 0,
    });
    expect(response.body.byRiskBucket).toEqual({
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    });
    expect(response.body.recommendation.classification).toBe('safe_to_apply');
    expect(response.body.recommendation.reasonCodes).toEqual([]);
  });

  it('reports malformed entries with stable codes and remediation hints', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/bulk-action-preview')
      .set(authHeaders())
      .send({
        rows: [
          null,
          { id: '', status: SettlementExceptionStatus.OPEN, deltaAmount: 5 },
          { id: 'se-bad-status', status: 'INVALID', deltaAmount: 5 },
          { id: 'se-bad-delta', status: SettlementExceptionStatus.OPEN, deltaAmount: Number.NaN },
          {
            id: 'se-bad-risk',
            status: SettlementExceptionStatus.OPEN,
            deltaAmount: 10,
            riskBucket: 'not-a-bucket',
          },
          { id: 'se-good', status: SettlementExceptionStatus.OPEN, deltaAmount: 8 },
          { id: 'se-good', status: SettlementExceptionStatus.OPEN, deltaAmount: 8 },
        ],
        selectedExceptionIds: ['se-good', 'se-missing'],
      });

    expect(response.status).toBe(201);
    expect(response.body.selectedCount).toBe(1);
    expect(response.body.malformedCount).toBe(1);
    expect(response.body.metadata.hasMismatch).toBe(true);
    expect(response.body.metadata.warningByCode).toEqual({
      'BSP-001_INVALID_ROW_SHAPE': 1,
      'BSP-002_INVALID_EXCEPTION_ID': 1,
      'BSP-003_DUPLICATE_EXCEPTION_ID': 1,
      'BSP-004_INVALID_STATUS': 1,
      'BSP-005_INVALID_DELTA_AMOUNT': 1,
      'BSP-006_INVALID_RISK_BUCKET': 1,
      'BSP-007_SELECTED_ID_NOT_FOUND': 1,
    });
    expect(response.body.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'BSP-001_INVALID_ROW_SHAPE',
          remediationHint: expect.any(String),
        }),
        expect.objectContaining({
          code: 'BSP-007_SELECTED_ID_NOT_FOUND',
          remediationHint: expect.any(String),
        }),
      ]),
    );
    expect(response.body.metadata.errorCodeMap).toHaveLength(7);
    expect(response.body.recommendation.classification).toBe('rollback_recommended');
    expect(response.body.recommendation.reasonCodes).toEqual([
      'MALFORMED_ROW',
      'STALE_VERSION_RISK',
    ]);
  });

  it('classifies stale selection as needs_review when no critical reason exists', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/bulk-action-preview')
      .set(authHeaders())
      .send({
        rows: [{ id: 'se-1', status: SettlementExceptionStatus.OPEN, deltaAmount: 2 }],
        selectedExceptionIds: ['se-1', 'se-missing'],
      });

    expect(response.status).toBe(201);
    expect(response.body.recommendation.classification).toBe('needs_review');
    expect(response.body.recommendation.reasonCodes).toEqual(['STALE_VERSION_RISK']);
  });

  it('remains byte-stable for deterministic key and warning ordering', async () => {
    const payload = {
      rows: [
        { id: 'se-z', status: SettlementExceptionStatus.OPEN, deltaAmount: 11 },
        { id: 'se-a', status: SettlementExceptionStatus.RESOLVED, deltaAmount: -1 },
        { id: 'se-m', status: SettlementExceptionStatus.INVESTIGATING, deltaAmount: 6 },
        { id: 'se-a', status: SettlementExceptionStatus.OPEN, deltaAmount: 6 },
      ],
      selectedExceptionIds: ['se-z', 'se-m', 'se-a', 'se-a'],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/bulk-action-preview')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/bulk-action-preview')
        .set(authHeaders())
        .send(payload),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
    expect(first.body.recommendation.reasonCodeMap.map((row: { code: string }) => row.code)).toEqual(
      [...BULK_SETTLEMENT_ROLLBACK_REASON_CODES],
    );
    expect(Object.keys(first.body.byStatus)).toEqual([...BULK_SETTLEMENT_PREVIEW_STATUS_BUCKETS]);
    expect(Object.keys(first.body.byRiskBucket)).toEqual([...BULK_SETTLEMENT_PREVIEW_RISK_BUCKETS]);
  });
});
