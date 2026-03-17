import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TransactionType } from '@prisma/client';
import { createHmac } from 'crypto';
import * as request from 'supertest';
import { PaymentsController } from '../src/payments/payments.controller';
import { PaymentsService } from '../src/payments/payments.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ProviderRouterService } from '../src/providers/provider-router.service';
import { RoutingReasonCode } from '../src/providers/provider.interface';

function createPrismaMock() {
  const idempotencyStore = new Map<string, { responseBody: string }>();
  const callbackStore = new Set<string>();
  const txStore = new Map<string, any>();
  const txByRef = new Map<string, any>();
  const auditLogStore: any[] = [];
  let txCounter = 0;

  return {
    prisma: {
      merchant: {
        findUnique: jest.fn(async ({ where }) => {
          if (where.id === 'merchant-ui') {
            return { id: 'merchant-ui', name: 'Merchant UI', webhookSecret: 'whsec_ui' };
          }
          return null;
        }),
      },
      customer: {
        upsert: jest.fn(async ({ create }) => ({ id: 'cus-1', ...create })),
        create: jest.fn(async ({ data }) => ({ id: 'cus-1', ...data })),
        findMany: jest.fn(async () => []),
        findFirst: jest.fn(async () => null),
      },
      idempotencyKey: {
        findUnique: jest.fn(async ({ where }) => idempotencyStore.get(`${where.scope_key.scope}:${where.scope_key.key}`) ?? null),
        create: jest.fn(async ({ data }) => {
          idempotencyStore.set(`${data.scope}:${data.key}`, { responseBody: data.responseBody });
          return data;
        }),
      },
      transaction: {
        create: jest.fn(async ({ data }) => {
          txCounter += 1;
          const tx = { id: `tx-${txCounter}`, createdAt: new Date(), updatedAt: new Date(), ...data, audits: [] };
          txStore.set(tx.id, tx);
          txByRef.set(tx.reference, tx);
          return tx;
        }),
        update: jest.fn(async ({ where, data }) => {
          const tx = txStore.get(where.id);
          const merged = { ...tx, updatedAt: new Date(), ...data };
          txStore.set(where.id, merged);
          txByRef.set(merged.reference, merged);
          return merged;
        }),
        findUnique: jest.fn(async ({ where, include }) => {
          const tx = where.reference ? txByRef.get(where.reference) ?? null : txStore.get(where.id) ?? null;
          if (!tx || !include?.audits) {
            return tx;
          }
          return { ...tx, audits: [] };
        }),
        findMany: jest.fn(async ({ where, take, orderBy, select }) => {
          let rows = [...txStore.values()].filter((tx) => {
            if (where.merchantId && tx.merchantId !== where.merchantId) return false;
            if (where.status && tx.status !== where.status) return false;
            if (where.type && tx.type !== where.type) return false;
            if (where.reference?.contains && !tx.reference.includes(where.reference.contains)) return false;
            if (where.id?.in && !where.id.in.includes(tx.id)) return false;
            if (where.createdAt?.gte && new Date(tx.createdAt).getTime() < new Date(where.createdAt.gte).getTime()) return false;
            return true;
          });

          if (orderBy?.createdAt === 'desc') {
            rows = rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          } else if (orderBy?.createdAt === 'asc') {
            rows = rows.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          }

          rows = rows.slice(0, take ?? 20);
          if (select) {
            return rows.map((tx) => ({
              ...(select.id ? { id: tx.id } : {}),
              ...(select.reference ? { reference: tx.reference } : {}),
              ...(select.amount ? { amount: tx.amount } : {}),
            }));
          }
          return rows;
        }),
      },
      callbackEvent: {
        findUnique: jest.fn(async ({ where }) => {
          const key = `${where.providerName_eventId.providerName}:${where.providerName_eventId.eventId}`;
          return callbackStore.has(key) ? { id: 'cb-1' } : null;
        }),
        create: jest.fn(async ({ data }) => {
          callbackStore.add(`${data.providerName}:${data.eventId}`);
          return data;
        }),
      },
      transactionAudit: {
        create: jest.fn(async ({ data }) => data),
      },
      auditLog: {
        create: jest.fn(async ({ data }) => {
          const row = { id: `audit-${auditLogStore.length + 1}`, createdAt: new Date(), ...data };
          auditLogStore.push(row);
          return row;
        }),
        findMany: jest.fn(async ({ where, orderBy, take }) => {
          let rows = auditLogStore.filter((row) => {
            if (where.entityType && row.entityType !== where.entityType) return false;
            if (typeof where.entityId === 'string' && row.entityId !== where.entityId) return false;
            if (where.entityId?.in && !where.entityId.in.includes(row.entityId)) return false;
            if (where.eventType && typeof where.eventType === 'string' && row.eventType !== where.eventType) return false;
            if (where.eventType?.startsWith && !row.eventType.startsWith(where.eventType.startsWith)) return false;
            return true;
          });

          if (orderBy?.createdAt === 'desc') {
            rows = rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          } else if (orderBy?.createdAt === 'asc') {
            rows = rows.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          }

          return rows.slice(0, take ?? rows.length);
        }),
      },
    },
  };
}

describe('Frontend endpoint integration', () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.CALLBACK_SIGNING_SECRET = 'frontend-secret';
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({
        providerName: 'mock-a',
        externalRef: `A-${reference}`,
        decision: {
          algorithm: 'policy',
          reasonCode: RoutingReasonCode.ONLY_ELIGIBLE_PROVIDER,
          selectedProvider: 'mock-a',
          scores: [
            {
              providerName: 'mock-a',
              score: 0.9,
              successRate: 0.95,
              latencyMs: 100,
              feePercent: 1.8,
              riskScore: 10,
              circuitState: 'closed',
            },
          ],
          failovers: [],
          rolloutApplied: true,
          shadowMode: false,
          usedLegacyPath: false,
          marginKpi: {
            estimatedFeePercent: 1.8,
            weightedScore: 0.9,
          },
        },
        telemetry: [
          {
            eventType: 'routing.failover',
            occurredAt: '2026-03-17T03:35:00.000Z',
            payload: { failedProvider: 'mock-b', failoverCount: 1 },
          },
          {
            eventType: 'routing.breaker.transition',
            occurredAt: '2026-03-17T03:35:01.000Z',
            payload: { provider: 'mock-b', from: 'closed', to: 'open' },
          },
        ],
      })),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prismaMock.prisma },
        { provide: ProviderRouterService, useValue: router },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('supports create, list, detail and refund journey', async () => {
    const create = await request(app.getHttpServer()).post('/payments').send({
      merchantId: 'merchant-ui',
      amount: 120,
      currency: 'USD',
      type: 'deposit',
      idempotencyKey: 'idem-ui-1',
    });
    expect(create.status).toBe(201);
    expect(create.body.reference).toBeTruthy();

    const list = await request(app.getHttpServer()).get('/payments').query({ merchantId: 'merchant-ui', type: TransactionType.DEPOSIT });
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].reference).toBe(create.body.reference);

    const detail = await request(app.getHttpServer()).get(`/payments/${create.body.reference}`);
    expect(detail.status).toBe(200);
    expect(detail.body.reference).toBe(create.body.reference);

    const telemetry = await request(app.getHttpServer()).get(`/payments/${create.body.reference}/routing-telemetry`);
    expect(telemetry.status).toBe(200);
    expect(telemetry.body.reference).toBe(create.body.reference);
    expect(telemetry.body.events[0].eventType).toBe('routing.decision');

    const observability = await request(app.getHttpServer())
      .get('/payments/observability')
      .query({ merchantId: 'merchant-ui', take: 50, timeframeHours: 24 });
    expect(observability.status).toBe(200);
    expect(observability.body.summary.decisions).toBe(1);
    expect(observability.body.decisions[0]).toEqual(expect.objectContaining({
      provider: 'mock-a',
      reasonCode: RoutingReasonCode.ONLY_ELIGIBLE_PROVIDER,
    }));
    expect(observability.body.failovers[0]).toEqual(expect.objectContaining({
      from: 'mock-b',
      to: 'mock-a',
    }));
    expect(observability.body.breakerTransitions[0]).toEqual(expect.objectContaining({
      provider: 'mock-b',
      from: 'closed',
      to: 'open',
    }));

    const sign = createHmac('sha256', 'frontend-secret')
      .update(`mock-a:evt-ui:${create.body.reference}:succeeded`)
      .digest('hex');

    const callback = await request(app.getHttpServer()).post('/payments/callbacks/provider').send({
      provider: 'mock-a',
      eventId: 'evt-ui',
      transactionReference: create.body.reference,
      status: 'succeeded',
      signature: sign,
    });
    expect(callback.status).toBe(201);
    expect(callback.body.applied).toBe(true);

    const refund = await request(app.getHttpServer()).post(`/payments/${create.body.reference}/refund`);
    expect(refund.status).toBe(201);
    expect(refund.body.sourceReference).toBe(create.body.reference);
  });
});
