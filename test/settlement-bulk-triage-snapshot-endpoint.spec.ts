import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SettlementExceptionStatus } from '@prisma/client';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import {
  BULK_SETTLEMENT_ROLLBACK_REASON_CODES,
  BULK_SETTLEMENT_TRIAGE_SNAPSHOT_SEVERITY_BUCKETS,
} from '../src/settlements/bulk-settlement-preview';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Settlement bulk triage snapshot endpoint', () => {
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

  it('returns deterministic triage snapshot contract', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/bulk-triage-snapshot')
      .set(authHeaders())
      .send({
        rows: [
          { id: 'se-open', status: SettlementExceptionStatus.OPEN, deltaAmount: 2 },
          { id: 'se-investigating', status: SettlementExceptionStatus.INVESTIGATING, deltaAmount: 8 },
          { id: 'se-critical', status: SettlementExceptionStatus.OPEN, deltaAmount: 30 },
          { id: 'se-open', status: SettlementExceptionStatus.OPEN, deltaAmount: 99 },
        ],
        selectedExceptionIds: ['se-open', 'se-investigating', 'se-critical', 'se-missing'],
      });

    expect(response.status).toBe(201);
    expect(response.body.contract).toBe('settlement-bulk-triage-snapshot.v1');
    expect(response.body.selectedCount).toBe(3);
    expect(response.body.byReason).toEqual({
      MALFORMED_ROW: 1,
      STALE_VERSION_RISK: 1,
      MIXED_STATUS_SELECTION: 1,
      HIGH_DELTA_ANOMALY: 1,
    });
    expect(response.body.bySeverity).toEqual({
      warning: 2,
      critical: 2,
    });
    expect(response.body.topAnomalies).toHaveLength(3);
    expect(Object.keys(response.body.bySeverity)).toEqual([
      ...BULK_SETTLEMENT_TRIAGE_SNAPSHOT_SEVERITY_BUCKETS,
    ]);
    expect(response.body.metadata.reasonSeverityMap.map((row: { code: string }) => row.code)).toEqual([
      ...BULK_SETTLEMENT_ROLLBACK_REASON_CODES,
    ]);
    expect(typeof response.body.generatedAt).toBe('string');
  });

  it('returns explicit zero buckets for empty input selection', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/bulk-triage-snapshot')
      .set(authHeaders())
      .send({
        rows: [{ id: 'se-1', status: SettlementExceptionStatus.OPEN, deltaAmount: 4 }],
        selectedExceptionIds: [],
      });

    expect(response.status).toBe(201);
    expect(response.body.selectedCount).toBe(0);
    expect(response.body.byReason).toEqual({
      MALFORMED_ROW: 0,
      STALE_VERSION_RISK: 0,
      MIXED_STATUS_SELECTION: 0,
      HIGH_DELTA_ANOMALY: 0,
    });
    expect(response.body.bySeverity).toEqual({
      warning: 0,
      critical: 0,
    });
    expect(response.body.topAnomalies).toEqual([]);
  });

  it('is byte-stable across repeated requests with identical fixtures', async () => {
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
        .post('/settlements/exceptions/bulk-triage-snapshot')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/bulk-triage-snapshot')
        .set(authHeaders())
        .send(payload),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
