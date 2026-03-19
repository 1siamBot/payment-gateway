import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SettlementExceptionStatus } from '@prisma/client';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import {
  BULK_SETTLEMENT_PREVIEW_WARNING_CODES,
  BULK_SETTLEMENT_ROLLBACK_REASON_CODES,
  BULK_SETTLEMENT_SIMULATION_OUTCOME_BUCKETS,
} from '../src/settlements/bulk-settlement-preview';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Settlement bulk action simulation endpoint', () => {
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

  it('returns success_projection for all-safe selection', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/bulk-action-simulation')
      .set(authHeaders())
      .send({
        rows: [
          { id: 'se-1', status: SettlementExceptionStatus.OPEN, deltaAmount: 2 },
          { id: 'se-2', status: SettlementExceptionStatus.OPEN, deltaAmount: 4 },
        ],
        selectedExceptionIds: ['se-2', 'se-1'],
      });

    expect(response.status).toBe(201);
    expect(response.body.contract).toBe('settlement-bulk-action-simulation.v1');
    expect(response.body.outcomeBuckets).toEqual({
      success_projection: ['se-1', 'se-2'],
      conflict_projection: [],
      rollback_recommended: [],
    });
    expect(response.body.outcomeCounts).toEqual({
      success_projection: 2,
      conflict_projection: 0,
      rollback_recommended: 0,
    });
    expect(Object.keys(response.body.outcomeBuckets)).toEqual([...BULK_SETTLEMENT_SIMULATION_OUTCOME_BUCKETS]);
    expect(response.body.rollbackPlan.recommended).toBe(false);
    expect(response.body.rollbackPlan.reasonCodes).toEqual([]);
    expect(response.body.rollbackPlan.reasonCodeMap.map((row: { code: string }) => row.code)).toEqual(
      [...BULK_SETTLEMENT_ROLLBACK_REASON_CODES],
    );
  });

  it('returns mixed conflict and rollback projections for stale and mixed-status selection', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/bulk-action-simulation')
      .set(authHeaders())
      .send({
        rows: [
          { id: 'se-1', status: SettlementExceptionStatus.OPEN, deltaAmount: 2 },
          { id: 'se-2', status: SettlementExceptionStatus.INVESTIGATING, deltaAmount: 4 },
        ],
        selectedExceptionIds: ['se-2', 'se-missing', 'se-1'],
      });

    expect(response.status).toBe(201);
    expect(response.body.outcomeBuckets).toEqual({
      success_projection: ['se-1'],
      conflict_projection: ['se-missing'],
      rollback_recommended: ['se-2'],
    });
    expect(response.body.results).toEqual([
      {
        exceptionId: 'se-1',
        outcome: 'success_projection',
        reasonCodes: [],
        stepHints: [],
      },
      {
        exceptionId: 'se-2',
        outcome: 'rollback_recommended',
        reasonCodes: ['MIXED_STATUS_SELECTION'],
        stepHints: ['Split selections by status and execute each bucket independently.'],
      },
      {
        exceptionId: 'se-missing',
        outcome: 'conflict_projection',
        reasonCodes: ['STALE_VERSION_RISK'],
        stepHints: ['Refresh selection data and remove stale or missing exception ids.'],
      },
    ]);
  });

  it('flags malformed-row selection with rollback plan recommendation', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/bulk-action-simulation')
      .set(authHeaders())
      .send({
        rows: [
          null,
          { id: 'se-safe', status: SettlementExceptionStatus.OPEN, deltaAmount: 3 },
        ],
        selectedExceptionIds: ['se-safe'],
      });

    expect(response.status).toBe(201);
    expect(response.body.outcomeBuckets).toEqual({
      success_projection: [],
      conflict_projection: [],
      rollback_recommended: ['se-safe'],
    });
    expect(response.body.rollbackPlan.recommended).toBe(true);
    expect(response.body.rollbackPlan.reasonCodes).toEqual(['MALFORMED_ROW']);
    expect(Object.keys(response.body.metadata.warningByCode)).toEqual([...BULK_SETTLEMENT_PREVIEW_WARNING_CODES]);
    expect(response.body.metadata.warningByCode['BSP-001_INVALID_ROW_SHAPE']).toBe(1);
  });

  it('remains byte-stable for deterministic simulation replay', async () => {
    const payload = {
      rows: [
        { id: 'se-z', status: SettlementExceptionStatus.OPEN, deltaAmount: 20 },
        { id: 'se-a', status: SettlementExceptionStatus.RESOLVED, deltaAmount: -1 },
        { id: 'se-m', status: SettlementExceptionStatus.OPEN, deltaAmount: 3 },
      ],
      selectedExceptionIds: ['se-z', 'se-a', 'se-m', 'se-missing'],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/bulk-action-simulation')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/bulk-action-simulation')
        .set(authHeaders())
        .send(payload),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
