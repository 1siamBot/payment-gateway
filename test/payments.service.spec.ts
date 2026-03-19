import { createHmac } from 'crypto';
import { TransactionStatus, TransactionType, WebhookDeliveryStatus } from '@prisma/client';
import { PaymentsService } from '../src/payments/payments.service';
import {
  PAYMENT_ATTEMPT_TIMELINE_FIXTURES,
  type PaymentAttemptTimelineScenario,
} from '../src/payments/payment-attempt-timeline-fixtures';
import { RoutingReasonCode } from '../src/providers/provider.interface';

function createPrismaMock() {
  const idempotencyStore = new Map<string, { responseBody: string }>();
  const callbackStore = new Set<string>();
  const txStore = new Map<string, any>();
  const txByRef = new Map<string, any>();
  const refundStore = new Map<string, any>();
  const webhookDeliveryStore = new Map<string, any[]>();
  const auditLogStore: any[] = [];
  const merchantStore = new Map<string, any>([['merchant-1', { id: 'merchant-1', name: 'Demo Merchant' }]]);
  const customerStore = new Map<string, any>();
  let txCounter = 0;
  let customerCounter = 0;

  return {
    store: { txByRef, customerStore },
    prisma: {
      merchant: {
        findUnique: jest.fn(async ({ where }) => merchantStore.get(where.id) ?? null),
      },
      idempotencyKey: {
        findUnique: jest.fn(async ({ where }) => idempotencyStore.get(`${where.scope_key.scope}:${where.scope_key.key}`) ?? null),
        create: jest.fn(async ({ data }) => {
          idempotencyStore.set(`${data.scope}:${data.key}`, { responseBody: data.responseBody });
          return data;
        }),
      },
      customer: {
        upsert: jest.fn(async ({ where, create, update }) => {
          const lookup = where?.merchantId_externalId ?? where?.merchantId_email;
          const key = lookup?.externalId ?? lookup?.email;
          if (!key) {
            customerCounter += 1;
            const fallback = { id: `customer-${customerCounter}`, ...create };
            customerStore.set(fallback.id, fallback);
            return fallback;
          }
          const existing = [...customerStore.values()].find(
            (item) => item.merchantId === lookup.merchantId && (item.externalId === key || item.email === key),
          );
          if (existing) {
            const merged = { ...existing, ...update };
            customerStore.set(existing.id, merged);
            return merged;
          }
          customerCounter += 1;
          const created = { id: `customer-${customerCounter}`, ...create };
          customerStore.set(created.id, created);
          return created;
        }),
        create: jest.fn(async ({ data }) => {
          customerCounter += 1;
          const created = { id: `customer-${customerCounter}`, ...data };
          customerStore.set(created.id, created);
          return created;
        }),
        findMany: jest.fn(async ({ where }) =>
          [...customerStore.values()].filter((customer) => {
            if (customer.merchantId !== where.merchantId) return false;
            if (!where.OR) return true;
            return where.OR.some((condition: any) => {
              if (condition.name?.contains) return (customer.name ?? '').includes(condition.name.contains);
              if (condition.email?.contains) return (customer.email ?? '').includes(condition.email.contains);
              if (condition.externalId?.contains) return (customer.externalId ?? '').includes(condition.externalId.contains);
              return false;
            });
          }),
        ),
        findFirst: jest.fn(async ({ where }) => {
          const customer = [...customerStore.values()].find(
            (item) => item.id === where.id && item.merchantId === where.merchantId,
          );
          if (!customer) return null;
          const txns = [...txStore.values()].filter((tx) => tx.customerId === customer.id);
          return { ...customer, txns };
        }),
      },
      transaction: {
        create: jest.fn(async ({ data }) => {
          txCounter += 1;
          const tx = {
            id: `tx-${txCounter}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            providerName: null,
            externalRef: null,
            failureReason: null,
            ...data,
            audits: [],
            callbackEvents: [],
            webhookDeliveries: [],
          };
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
          if (!tx) return null;
          if (include?.customer) {
            return { ...tx, customer: tx.customerId ? customerStore.get(tx.customerId) ?? null : null, audits: [] };
          }
          if (include?.callbackEvents || include?.webhookDeliveries) {
            return {
              ...tx,
              callbackEvents: include?.callbackEvents ? [...(tx.callbackEvents ?? [])] : undefined,
              webhookDeliveries: include?.webhookDeliveries
                ? [...(webhookDeliveryStore.get(tx.id) ?? tx.webhookDeliveries ?? [])]
                : undefined,
            };
          }
          return tx;
        }),
        findMany: jest.fn(async ({ where, take, orderBy, include, select }) => {
          let rows = [...txStore.values()].filter((tx) => {
            if (where.merchantId && tx.merchantId !== where.merchantId) return false;
            if (where.customerId && tx.customerId !== where.customerId) return false;
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
              ...(select.createdAt ? { createdAt: tx.createdAt } : {}),
            }));
          }

          return rows.map((tx) => ({
            ...tx,
            ...(include?.customer ? { customer: tx.customerId ? customerStore.get(tx.customerId) ?? null : null } : {}),
          }));
        }),
      },
      refund: {
        findUnique: jest.fn(async ({ where, include }) => {
          if (where.id) {
            const refund = refundStore.get(where.id) ?? null;
            if (!refund) return null;
            if (!include?.transaction) return refund;
            const tx = txStore.get(refund.transactionId);
            return { ...refund, transaction: { reference: tx?.reference } };
          }
          if (where.transactionId) {
            const refund = [...refundStore.values()].find((row) => row.transactionId === where.transactionId) ?? null;
            if (!refund) return null;
            if (!include?.transaction) return refund;
            const tx = txStore.get(refund.transactionId);
            return { ...refund, transaction: { reference: tx?.reference } };
          }
          if (where.merchantId_idempotencyKey) {
            const refund = [...refundStore.values()].find(
              (row) => row.merchantId === where.merchantId_idempotencyKey.merchantId
                && row.idempotencyKey === where.merchantId_idempotencyKey.idempotencyKey,
            ) ?? null;
            if (!refund) return null;
            if (!include?.transaction) return refund;
            const tx = txStore.get(refund.transactionId);
            return { ...refund, transaction: { reference: tx?.reference } };
          }
          return null;
        }),
        create: jest.fn(async ({ data }) => {
          const id = `refund-${refundStore.size + 1}`;
          const row = { id, createdAt: new Date(), updatedAt: new Date(), status: 'REQUESTED', ...data };
          refundStore.set(id, row);
          return row;
        }),
        update: jest.fn(async ({ where, data }) => {
          const current = refundStore.get(where.id);
          const next = { ...current, ...data, updatedAt: new Date() };
          refundStore.set(where.id, next);
          return next;
        }),
        findMany: jest.fn(async ({ where, include, orderBy, take }) => {
          let rows = [...refundStore.values()].filter((row) => {
            if (where?.merchantId && row.merchantId !== where.merchantId) return false;
            if (where?.transaction?.reference?.contains) {
              const tx = txStore.get(row.transactionId);
              if (!tx?.reference?.includes(where.transaction.reference.contains)) return false;
            }
            return true;
          });

          if (orderBy?.createdAt === 'desc') {
            rows = rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          }
          rows = rows.slice(0, take ?? rows.length);

          if (!include?.transaction) {
            return rows;
          }
          return rows.map((row) => {
            const tx = txStore.get(row.transactionId);
            return { ...row, transaction: { reference: tx?.reference } };
          });
        }),
      },
      callbackEvent: {
        findUnique: jest.fn(async ({ where }) => {
          const key = `${where.providerName_eventId.providerName}:${where.providerName_eventId.eventId}`;
          return callbackStore.has(key) ? { id: 'cb-1' } : null;
        }),
        create: jest.fn(async ({ data }) => {
          callbackStore.add(`${data.providerName}:${data.eventId}`);
          const tx = txStore.get(data.transactionId);
          if (tx) {
            tx.callbackEvents = [
              { ...data, createdAt: new Date() },
              ...(tx.callbackEvents ?? []),
            ];
            txStore.set(tx.id, tx);
            txByRef.set(tx.reference, tx);
          }
          return data;
        }),
      },
      webhookDelivery: {
        findMany: jest.fn(async ({ where, orderBy }) => {
          let rows = [...webhookDeliveryStore.values()].flat();
          if (where?.transactionId) {
            rows = rows.filter((row) => row.transactionId === where.transactionId);
          }
          if (orderBy?.updatedAt === 'desc') {
            rows = rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          }
          return rows;
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
            if (
              where.eventType
              && typeof where.eventType === 'object'
              && 'startsWith' in where.eventType
              && typeof where.eventType.startsWith === 'string'
              && !row.eventType.startsWith(where.eventType.startsWith)
            ) {
              return false;
            }
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
    stores: {
      txStore,
      webhookDeliveryStore,
    },
  };
}

function mapFixtureStatusToTransactionStatus(status: string): TransactionStatus {
  if (status === TransactionStatus.PAID) {
    return TransactionStatus.PAID;
  }
  if (status === TransactionStatus.FAILED) {
    return TransactionStatus.FAILED;
  }
  return TransactionStatus.CREATED;
}

describe('PaymentsService', () => {
  beforeEach(() => {
    process.env.CALLBACK_SIGNING_SECRET = 'test-secret';
  });

  it('enforces idempotency for payment initiation', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };
    const webhooks = { queueTransactionWebhook: jest.fn(async () => undefined) };
    const service = new PaymentsService(prismaMock.prisma as any, router as any, webhooks as any);

    const payload = {
      merchantId: 'merchant-1',
      amount: 100,
      currency: 'USD',
      type: 'deposit' as const,
      idempotencyKey: 'idem-1',
    };

    const first = await service.initiatePayment(payload);
    const second = await service.initiatePayment(payload);

    expect(first.reference).toBe(second.reference);
    expect(router.initiateWithFailover).toHaveBeenCalledTimes(1);
    expect(first.status).toBe(TransactionStatus.PENDING);
  });

  it('applies callback once and ignores duplicates', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };
    const webhooks = { queueTransactionWebhook: jest.fn(async () => undefined) };
    const service = new PaymentsService(prismaMock.prisma as any, router as any, webhooks as any);

    const created = await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 40,
      currency: 'USD',
      type: 'withdraw',
      idempotencyKey: 'idem-2',
    });

    const sign = (eventId: string) =>
      createHmac('sha256', 'test-secret').update(`mock-a:${eventId}:${created.reference}:succeeded`).digest('hex');

    const first = await service.handleCallback({
      provider: 'mock-a',
      eventId: 'evt-1',
      transactionReference: created.reference,
      status: 'succeeded',
      signature: sign('evt-1'),
    });

    expect(first.applied).toBe(true);
    expect(first.status).toBe(TransactionStatus.PAID);
    await expect(service.handleCallback({
      provider: 'mock-a',
      eventId: 'evt-1',
      transactionReference: created.reference,
      status: 'succeeded',
      signature: sign('evt-1'),
    })).rejects.toMatchObject({
      response: {
        code: 'PAYMENT_CALLBACK_REPLAY_DUPLICATE',
        reason: 'replay_key_seen',
        replayKey: 'evt-1',
      },
      status: 409,
    });
    expect(webhooks.queueTransactionWebhook).toHaveBeenCalledWith(expect.any(String), 'payment.paid');
  });

  it('returns machine-readable validation error for malformed callback payload', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };
    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    await expect(service.handleCallback({
      provider: 'mock-a',
      eventId: 'evt-bad-payload',
      replayKey: '',
      transactionReference: '',
      status: 'succeeded',
      signature: 'deadbeef',
    } as any)).rejects.toMatchObject({
      response: {
        code: 'PAYMENT_CALLBACK_VALIDATION_FAILED',
        reason: 'missing_required_fields',
      },
      status: 400,
    });
  });

  it('returns machine-readable signature error for invalid callback signature', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };
    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    const created = await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 40,
      currency: 'USD',
      type: 'withdraw',
      idempotencyKey: 'idem-signature-1',
    });

    await expect(service.handleCallback({
      provider: 'mock-a',
      eventId: 'evt-bad-signature',
      transactionReference: created.reference,
      status: 'succeeded',
      signature: '0'.repeat(64),
    })).rejects.toMatchObject({
      response: {
        code: 'PAYMENT_CALLBACK_INVALID_SIGNATURE',
        reason: 'signature_mismatch',
      },
      status: 401,
    });
  });

  it('returns stale-event conflict code for out-of-order terminal callback events', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };
    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    const created = await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 40,
      currency: 'USD',
      type: 'withdraw',
      idempotencyKey: 'idem-stale-1',
    });

    const signSucceeded = (eventId: string) =>
      createHmac('sha256', 'test-secret').update(`mock-a:${eventId}:${created.reference}:succeeded`).digest('hex');
    const signFailed = (eventId: string) =>
      createHmac('sha256', 'test-secret').update(`mock-a:${eventId}:${created.reference}:failed`).digest('hex');

    const first = await service.handleCallback({
      provider: 'mock-a',
      eventId: 'evt-ordered-success',
      transactionReference: created.reference,
      status: 'succeeded',
      eventTimestamp: '2026-03-19T15:00:00.000Z',
      signature: signSucceeded('evt-ordered-success'),
    });
    expect(first.applied).toBe(true);
    expect(first.status).toBe(TransactionStatus.PAID);

    await expect(service.handleCallback({
      provider: 'mock-a',
      eventId: 'evt-late-failure',
      transactionReference: created.reference,
      status: 'failed',
      eventTimestamp: '2026-03-19T14:59:59.000Z',
      signature: signFailed('evt-late-failure'),
    })).rejects.toMatchObject({
      response: {
        code: 'PAYMENT_CALLBACK_STALE_EVENT',
        reason: 'out_of_order_event',
      },
      status: 409,
    });
  });

  it('returns payment status snapshot with callback and webhook counters', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };
    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    const created = await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 40,
      currency: 'USD',
      type: 'withdraw',
      idempotencyKey: 'idem-status-1',
    });

    const signature = createHmac('sha256', 'test-secret')
      .update(`mock-a:evt-status:${created.reference}:succeeded`)
      .digest('hex');
    await service.handleCallback({
      provider: 'mock-a',
      eventId: 'evt-status',
      transactionReference: created.reference,
      status: 'succeeded',
      signature,
    });

    const txId = prismaMock.store.txByRef.get(created.reference).id;
    const now = new Date('2026-03-19T15:00:00.000Z');
    prismaMock.stores.webhookDeliveryStore.set(txId, [
      {
        id: 'wd-1',
        transactionId: txId,
        eventType: 'payment.paid',
        status: WebhookDeliveryStatus.DELIVERED,
        updatedAt: now,
      },
      {
        id: 'wd-2',
        transactionId: txId,
        eventType: 'payment.failed',
        status: WebhookDeliveryStatus.FAILED,
        updatedAt: new Date('2026-03-19T14:00:00.000Z'),
      },
    ]);

    const snapshot = await service.getPaymentStatus(created.reference);
    expect(snapshot.reference).toBe(created.reference);
    expect(snapshot.status).toBe(TransactionStatus.PAID);
    expect(snapshot.callbacks.total).toBe(1);
    expect(snapshot.callbacks.lastEventId).toBe('evt-status');
    expect(snapshot.webhooks.total).toBe(2);
    expect(snapshot.webhooks.delivered).toBe(1);
    expect(snapshot.webhooks.failed).toBe(1);
    expect(snapshot.webhooks.pending).toBe(0);
    expect(snapshot.webhooks.lastEventType).toBe('payment.paid');
  });

  it('lists payments with filtering', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };
    const webhooks = { queueTransactionWebhook: jest.fn(async () => undefined) };
    const service = new PaymentsService(prismaMock.prisma as any, router as any, webhooks as any);

    await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 10,
      currency: 'USD',
      type: 'deposit',
      idempotencyKey: 'idem-a',
    });
    await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 15,
      currency: 'USD',
      type: 'withdraw',
      idempotencyKey: 'idem-b',
    });

    const rows = await service.listPayments({ merchantId: 'merchant-1', type: TransactionType.DEPOSIT });
    expect(rows).toHaveLength(1);
    expect(rows[0].merchantId).toBe('merchant-1');
    expect(rows[0].type).toBe(TransactionType.DEPOSIT);
  });

  it('creates refund in requested state with deterministic lifecycle metadata', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };
    const webhooks = { queueTransactionWebhook: jest.fn(async () => undefined) };
    const service = new PaymentsService(prismaMock.prisma as any, router as any, webhooks as any);

    const created = await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 50,
      currency: 'THB',
      type: 'deposit',
      idempotencyKey: 'idem-refund',
    });

    const signature = createHmac('sha256', 'test-secret')
      .update(`mock-a:evt-refund:${created.reference}:succeeded`)
      .digest('hex');

    await service.handleCallback({
      provider: 'mock-a',
      eventId: 'evt-refund',
      transactionReference: created.reference,
      status: 'succeeded',
      signature,
    });

    const refund = await service.createRefund(created.reference, 'refund-idem-1', 'support_request');

    expect(refund.paymentReference).toBe(created.reference);
    expect(refund.status).toBe('REQUESTED');
    expect(refund.transition).toEqual(expect.objectContaining({
      fromStatus: null,
      toStatus: 'REQUESTED',
      reasonCode: 'refund_requested',
    }));
    expect(refund.lifecycle.contract).toBe('refund-lifecycle.v1');
    expect(refund.lifecycle.allowedNextStatuses).toEqual(['PROCESSING']);
    expect(webhooks.queueTransactionWebhook).toHaveBeenCalledWith(expect.any(String), 'payment.refund_requested');
  });

  it('advances refund from requested to processing', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };
    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    const payment = await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 50,
      currency: 'THB',
      type: 'deposit',
      idempotencyKey: 'idem-refund-processing',
    });

    const signature = createHmac('sha256', 'test-secret')
      .update(`mock-a:evt-refund-processing:${payment.reference}:succeeded`)
      .digest('hex');

    await service.handleCallback({
      provider: 'mock-a',
      eventId: 'evt-refund-processing',
      transactionReference: payment.reference,
      status: 'succeeded',
      signature,
    });

    const refund = await service.createRefund(payment.reference, 'refund-idem-processing');
    const processing = await service.transitionRefund(refund.id, 'PROCESSING', 'REQUESTED');

    expect(processing.status).toBe('PROCESSING');
    expect(processing.transition).toEqual(expect.objectContaining({
      fromStatus: 'REQUESTED',
      toStatus: 'PROCESSING',
      reasonCode: 'refund_processing',
    }));
    expect(processing.lifecycle.allowedNextStatuses).toEqual(['SUCCEEDED', 'FAILED']);
  });

  it('advances refund from processing to succeeded and marks payment refunded', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };
    const webhooks = { queueTransactionWebhook: jest.fn(async () => undefined) };
    const service = new PaymentsService(prismaMock.prisma as any, router as any, webhooks as any);

    const payment = await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 50,
      currency: 'THB',
      type: 'deposit',
      idempotencyKey: 'idem-refund-succeed',
    });

    const signature = createHmac('sha256', 'test-secret')
      .update(`mock-a:evt-refund-succeed:${payment.reference}:succeeded`)
      .digest('hex');

    await service.handleCallback({
      provider: 'mock-a',
      eventId: 'evt-refund-succeed',
      transactionReference: payment.reference,
      status: 'succeeded',
      signature,
    });

    const requested = await service.createRefund(payment.reference, 'refund-idem-succeed');
    await service.transitionRefund(requested.id, 'PROCESSING', 'REQUESTED');
    const succeeded = await service.transitionRefund(requested.id, 'SUCCEEDED', 'PROCESSING');

    expect(succeeded.status).toBe('SUCCEEDED');
    expect(succeeded.lifecycle.terminal).toBe(true);
    expect(prismaMock.store.txByRef.get(payment.reference).status).toBe(TransactionStatus.REFUNDED);
    expect(webhooks.queueTransactionWebhook).toHaveBeenCalledWith(expect.any(String), 'payment.refunded');
  });

  it('rejects duplicate refund requests with stable reason code and HTTP mapping', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };
    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    const payment = await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 50,
      currency: 'THB',
      type: 'deposit',
      idempotencyKey: 'idem-refund-dup',
    });

    const signature = createHmac('sha256', 'test-secret')
      .update(`mock-a:evt-refund-dup:${payment.reference}:succeeded`)
      .digest('hex');

    await service.handleCallback({
      provider: 'mock-a',
      eventId: 'evt-refund-dup',
      transactionReference: payment.reference,
      status: 'succeeded',
      signature,
    });

    await service.createRefund(payment.reference, 'refund-idem-dup');
    await expect(service.createRefund(payment.reference, 'refund-idem-dup')).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({
        code: 'REFUND_LIFECYCLE_CONFLICT',
        reason: 'duplicate_request',
        httpStatus: 409,
      }),
    });
  });

  it('rejects invalid prior-state transition and stale updates with stable reason codes', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };
    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    const payment = await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 50,
      currency: 'THB',
      type: 'deposit',
      idempotencyKey: 'idem-refund-invalid',
    });

    const signature = createHmac('sha256', 'test-secret')
      .update(`mock-a:evt-refund-invalid:${payment.reference}:succeeded`)
      .digest('hex');

    await service.handleCallback({
      provider: 'mock-a',
      eventId: 'evt-refund-invalid',
      transactionReference: payment.reference,
      status: 'succeeded',
      signature,
    });

    const refund = await service.createRefund(payment.reference, 'refund-idem-invalid');

    await expect(service.transitionRefund(refund.id, 'SUCCEEDED', 'REQUESTED')).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({
        code: 'REFUND_LIFECYCLE_CONFLICT',
        reason: 'invalid_prior_state',
      }),
    });

    await expect(service.transitionRefund(refund.id, 'PROCESSING', 'FAILED')).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({
        code: 'REFUND_LIFECYCLE_CONFLICT',
        reason: 'stale_update',
      }),
    });
  });

  it('creates payout chargeback in opened state with deterministic lifecycle metadata', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };
    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    const payment = await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 50,
      currency: 'THB',
      type: 'deposit',
      idempotencyKey: 'idem-chargeback-opened',
    });

    const opened = await service.transitionPayoutChargeback(payment.reference, {
      toStatus: 'opened',
      eventId: 'cb_evt_1',
      occurredAt: '2026-03-19T10:00:00.000Z',
    });

    expect(opened.transition).toEqual(expect.objectContaining({
      fromStatus: null,
      toStatus: 'opened',
      reasonCode: 'chargeback_opened',
      eventId: 'cb_evt_1',
      occurredAt: '2026-03-19T10:00:00.000Z',
    }));
    expect(opened.lifecycle.contract).toBe('payout-chargeback-transition.v1');
    expect(opened.lifecycle.allowedNextStatuses).toEqual(['investigating', 'reversed']);
  });

  it('advances payout chargeback to investigating and then won with deterministic timeline ordering', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };
    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    const payment = await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 55,
      currency: 'THB',
      type: 'deposit',
      idempotencyKey: 'idem-chargeback-investigating',
    });

    await service.transitionPayoutChargeback(payment.reference, {
      toStatus: 'opened',
      eventId: 'cb_evt_2_opened',
      occurredAt: '2026-03-19T10:00:00.000Z',
    });
    await service.transitionPayoutChargeback(payment.reference, {
      toStatus: 'investigating',
      eventId: 'cb_evt_2_investigating',
      expectedCurrentStatus: 'opened',
      occurredAt: '2026-03-19T10:01:00.000Z',
    });
    const won = await service.transitionPayoutChargeback(payment.reference, {
      toStatus: 'won',
      eventId: 'cb_evt_2_won',
      expectedCurrentStatus: 'investigating',
      occurredAt: '2026-03-19T10:02:00.000Z',
    });

    expect(won.transition).toEqual(expect.objectContaining({
      fromStatus: 'investigating',
      toStatus: 'won',
      reasonCode: 'chargeback_won',
    }));
    expect(won.timeline.map((row) => row.toStatus)).toEqual(['opened', 'investigating', 'won']);
    expect(won.lifecycle.currentStatus).toBe('won');
    expect(won.lifecycle.terminal).toBe(true);
    expect(won.lifecycle.allowedNextStatuses).toEqual([]);
  });

  it('rejects duplicate payout chargeback event ids with stable reason code', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };
    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    const payment = await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 60,
      currency: 'THB',
      type: 'deposit',
      idempotencyKey: 'idem-chargeback-dup',
    });

    await service.transitionPayoutChargeback(payment.reference, {
      toStatus: 'opened',
      eventId: 'cb_evt_3',
    });

    await expect(service.transitionPayoutChargeback(payment.reference, {
      toStatus: 'investigating',
      eventId: 'cb_evt_3',
      expectedCurrentStatus: 'opened',
    })).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({
        code: 'PAYOUT_CHARGEBACK_TRANSITION_CONFLICT',
        reason: 'duplicate_event',
      }),
    });
  });

  it('rejects invalid prior-state payout chargeback transitions with stable reason code', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };
    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    const payment = await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 65,
      currency: 'THB',
      type: 'deposit',
      idempotencyKey: 'idem-chargeback-invalid',
    });

    await expect(service.transitionPayoutChargeback(payment.reference, {
      toStatus: 'won',
      eventId: 'cb_evt_4',
    })).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({
        code: 'PAYOUT_CHARGEBACK_TRANSITION_CONFLICT',
        reason: 'invalid_prior_state',
      }),
    });
  });

  it('rejects stale expectedCurrentStatus during payout chargeback transitions with stable reason code', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };
    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    const payment = await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 70,
      currency: 'THB',
      type: 'deposit',
      idempotencyKey: 'idem-chargeback-stale',
    });

    await service.transitionPayoutChargeback(payment.reference, {
      toStatus: 'opened',
      eventId: 'cb_evt_5_opened',
    });

    await expect(service.transitionPayoutChargeback(payment.reference, {
      toStatus: 'investigating',
      eventId: 'cb_evt_5_investigating',
      expectedCurrentStatus: 'lost',
    })).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({
        code: 'PAYOUT_CHARGEBACK_TRANSITION_CONFLICT',
        reason: 'stale_transition_update',
      }),
    });
  });

  it('records routing decision telemetry in audit log when router supplies decision details', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({
        providerName: 'mock-a',
        externalRef: `A-${reference}`,
        decision: {
          algorithm: 'policy',
          reasonCode: RoutingReasonCode.POLICY_SCORE_WIN,
          selectedProvider: 'mock-a',
          scores: [],
          failovers: [],
          rolloutApplied: true,
          shadowMode: false,
          usedLegacyPath: false,
          marginKpi: {
            estimatedFeePercent: 1.8,
            weightedScore: 0.92,
          },
        },
      })),
    };
    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 100,
      currency: 'USD',
      type: 'deposit',
      idempotencyKey: 'idem-routing-audit',
    });

    expect(prismaMock.prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventType: 'routing.decision',
      }),
    }));
  });

  it('returns normalized routing telemetry feed for a transaction', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({
        providerName: 'mock-a',
        externalRef: `A-${reference}`,
        decision: {
          algorithm: 'policy',
          reasonCode: RoutingReasonCode.FAILOVER_AFTER_ERROR,
          selectedProvider: 'mock-a',
          scores: [
            {
              providerName: 'mock-a',
              score: 0.91,
              successRate: 0.95,
              latencyMs: 120,
              feePercent: 1.9,
              riskScore: 15,
              circuitState: 'closed',
            },
          ],
          failovers: ['mock-b'],
          rolloutApplied: true,
          shadowMode: false,
          usedLegacyPath: false,
          marginKpi: {
            estimatedFeePercent: 1.9,
            weightedScore: 0.91,
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
    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    const payment = await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 88,
      currency: 'USD',
      type: 'deposit',
      idempotencyKey: 'idem-routing-feed',
    });

    const feed = await service.getRoutingTelemetry(payment.reference);

    expect(feed.reference).toBe(payment.reference);
    expect(feed.decision?.reasonCode).toBe(RoutingReasonCode.FAILOVER_AFTER_ERROR);
    expect(feed.failover.sequence).toEqual(['mock-b']);
    expect(feed.failover.events[0]).toEqual(expect.objectContaining({ failedProvider: 'mock-b', failoverCount: 1 }));
    expect(feed.breaker.transitions[0]).toEqual(expect.objectContaining({ provider: 'mock-b', to: 'open' }));
    expect(feed.breaker.providerStates[0]).toEqual(expect.objectContaining({ providerName: 'mock-a', circuitState: 'closed' }));
  });

  it('builds observability dashboard from backend routing telemetry records', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({
        providerName: 'mock-a',
        externalRef: `A-${reference}`,
        decision: {
          algorithm: 'policy',
          reasonCode: RoutingReasonCode.FAILOVER_AFTER_ERROR,
          selectedProvider: 'mock-a',
          scores: [
            {
              providerName: 'mock-a',
              score: 0.89,
              successRate: 0.94,
              latencyMs: 130,
              feePercent: 1.8,
              riskScore: 16,
              circuitState: 'closed',
            },
          ],
          failovers: ['mock-b'],
          rolloutApplied: true,
          shadowMode: false,
          usedLegacyPath: false,
          marginKpi: {
            estimatedFeePercent: 1.8,
            weightedScore: 0.89,
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
    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 1200,
      currency: 'USD',
      type: 'deposit',
      idempotencyKey: 'idem-observability-dashboard',
    });

    const dashboard = await service.getObservabilityDashboard({
      merchantId: 'merchant-1',
      timeframeHours: 24,
      take: 50,
    });

    expect(dashboard.summary.analyzedTransactions).toBe(1);
    expect(dashboard.decisions[0]).toEqual(expect.objectContaining({
      provider: 'mock-a',
      reasonCode: RoutingReasonCode.FAILOVER_AFTER_ERROR,
    }));
    expect(dashboard.failovers[0]).toEqual(expect.objectContaining({
      from: 'mock-b',
      to: 'mock-a',
    }));
    expect(dashboard.breakerTransitions[0]).toEqual(expect.objectContaining({
      provider: 'mock-b',
      from: 'closed',
      to: 'open',
    }));
    expect(dashboard.margins[0]).toEqual(expect.objectContaining({
      provider: 'mock-a',
      estimatedFeePercent: 1.8,
    }));
  });

  it('returns payment-attempt timeline rows ordered by occurredAt with stable status labels', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };
    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    const payment = await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 149.5,
      currency: 'USD',
      type: 'deposit',
      idempotencyKey: 'idem-timeline-ordered',
    });

    await prismaMock.prisma.auditLog.create({
      data: {
        eventType: 'payment.attempt.event',
        actor: 'gateway',
        entityType: 'transaction',
        entityId: prismaMock.store.txByRef.get(payment.reference).id,
        metadata: JSON.stringify({
          stage: 'Capture confirmed',
          status: 'completed',
          actor: 'mock-a',
          note: 'Capture completed successfully.',
          occurredAt: '2026-03-18T08:01:12.000Z',
        }),
      },
    });
    await prismaMock.prisma.auditLog.create({
      data: {
        eventType: 'payment.attempt.event',
        actor: 'gateway',
        entityType: 'transaction',
        entityId: prismaMock.store.txByRef.get(payment.reference).id,
        metadata: JSON.stringify({
          stage: 'Payment created',
          status: 'completed',
          actor: 'gateway',
          note: 'Initial request accepted.',
          occurredAt: '2026-03-18T08:00:00.000Z',
        }),
      },
    });
    await prismaMock.prisma.auditLog.create({
      data: {
        eventType: 'payment.attempt.event',
        actor: 'gateway',
        entityType: 'transaction',
        entityId: prismaMock.store.txByRef.get(payment.reference).id,
        metadata: JSON.stringify({
          stage: 'Capture in progress',
          status: 'pending',
          actor: 'mock-a',
          note: 'Provider processing capture.',
          occurredAt: '2026-03-18T08:01:05.000Z',
        }),
      },
    });

    const timeline = await service.getPaymentAttemptTimeline(payment.reference);

    expect(timeline.events).toHaveLength(5);
    expect(timeline.events[0].stage).toBe('Payment created');
    expect(timeline.events[0].status).toBe('completed');
    expect(timeline.events[1].status).toBe('pending');
    expect(timeline.events[1].stage).toBe('Capture in progress');
    expect(timeline.events[2].stage).toBe('Capture confirmed');
    expect(timeline.events[2].status).toBe('completed');
    expect(timeline.summary.malformedCount).toBe(0);
    expect(timeline.summary.emptyTimeline).toBe(false);
  });

  it('returns empty timeline summary when no timeline events exist', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };
    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    const payment = await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 50,
      currency: 'USD',
      type: 'deposit',
      idempotencyKey: 'idem-timeline-empty',
    });

    const timeline = await service.getPaymentAttemptTimeline(payment.reference);

    expect(timeline.events).toHaveLength(2);
    expect(timeline.summary.emptyTimeline).toBe(false);

    const txId = prismaMock.store.txByRef.get(payment.reference).id;
    prismaMock.prisma.auditLog.findMany.mockImplementationOnce(async () => []);
    const empty = await service.getPaymentAttemptTimeline(payment.reference);
    expect(empty.events).toHaveLength(0);
    expect(empty.summary.emptyTimeline).toBe(true);
    expect(empty.transactionId).toBe(txId);
  });

  it('skips malformed timeline events and reports malformed count', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };
    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    const payment = await service.initiatePayment({
      merchantId: 'merchant-1',
      amount: 64,
      currency: 'USD',
      type: 'deposit',
      idempotencyKey: 'idem-timeline-malformed',
    });
    const txId = prismaMock.store.txByRef.get(payment.reference).id;

    await prismaMock.prisma.auditLog.create({
      data: {
        eventType: 'payment.attempt.event',
        actor: 'gateway',
        entityType: 'transaction',
        entityId: txId,
        metadata: JSON.stringify({
          stage: 'Payment created',
          status: 'completed',
          actor: 'gateway',
          note: 'Valid row.',
          occurredAt: '2026-03-18T11:00:00.000Z',
        }),
      },
    });
    await prismaMock.prisma.auditLog.create({
      data: {
        eventType: 'payment.attempt.event',
        actor: 'gateway',
        entityType: 'transaction',
        entityId: txId,
        metadata: JSON.stringify({
          stage: 'Bad timestamp row',
          status: 'completed',
          actor: 'gateway',
          note: 'This row should be dropped.',
          occurredAt: 'invalid-date',
        }),
      },
    });
    await prismaMock.prisma.auditLog.create({
      data: {
        eventType: 'payment.attempt.event',
        actor: 'gateway',
        entityType: 'transaction',
        entityId: txId,
        metadata: '{"bad": ',
      },
    });

    const timeline = await service.getPaymentAttemptTimeline(payment.reference);

    expect(timeline.events.map((event) => event.stage)).toContain('Payment created');
    expect(timeline.events.map((event) => event.stage)).not.toContain('Bad timestamp row');
    expect(timeline.summary.malformedCount).toBe(2);
    expect(timeline.normalization.contract).toBe('payment-attempt-timeline.v2');
    expect(timeline.normalization.malformedByCode).toEqual({
      'TLN-001_INVALID_METADATA_JSON': 1,
      'TLN-002_MISSING_STAGE': 0,
      'TLN-003_INVALID_STATUS': 0,
      'TLN-004_INVALID_OCCURRED_AT': 1,
      'TLN-005_MISSING_TO_STATUS': 0,
    });
    expect(timeline.normalization.errorCodeMap).toHaveLength(5);
  });

  it.each([
    ['successful_capture', { expectedEventCount: 9, expectedMalformedCount: 0, expectedEmptyTimeline: false }],
    ['retry_then_success', { expectedEventCount: 9, expectedMalformedCount: 0, expectedEmptyTimeline: false }],
    ['terminal_failure', { expectedEventCount: 8, expectedMalformedCount: 0, expectedEmptyTimeline: false }],
    ['empty', { expectedEventCount: 0, expectedMalformedCount: 0, expectedEmptyTimeline: true }],
    ['malformed', { expectedEventCount: 2, expectedMalformedCount: 2, expectedEmptyTimeline: false }],
  ] satisfies Array<
    [PaymentAttemptTimelineScenario, { expectedEventCount: number; expectedMalformedCount: number; expectedEmptyTimeline: boolean }]
  >)(
    'returns deterministic timeline contract for fixture scenario %s',
    async (scenario, expectations) => {
      const fixture = PAYMENT_ATTEMPT_TIMELINE_FIXTURES.find((entry) => entry.scenario === scenario);
      expect(fixture).toBeDefined();

      const prismaMock = createPrismaMock();
      const router = {
        initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
      };
      const service = new PaymentsService(prismaMock.prisma as any, router as any);

      const tx = await prismaMock.prisma.transaction.create({
        data: {
          merchantId: fixture!.merchantId,
          type: TransactionType.DEPOSIT,
          amount: fixture!.amount,
          currency: fixture!.currency,
          status: mapFixtureStatusToTransactionStatus(fixture!.finalStatus),
          reference: fixture!.paymentReference,
          providerName: 'mock-a',
        },
      });

      for (const event of fixture!.events) {
        await prismaMock.prisma.auditLog.create({
          data: {
            eventType: 'payment.attempt.event',
            actor: event.actor,
            entityType: 'transaction',
            entityId: tx.id,
            metadata: JSON.stringify({
              stage: event.stage,
              status: event.status,
              actor: event.actor,
              note: event.note,
              occurredAt: event.occurredAt,
            }),
          },
        });
      }

      const timeline = await service.getPaymentAttemptTimeline(fixture!.paymentReference);
      const validFixtureEvents = fixture!.events.filter((event) => Number.isFinite(Date.parse(event.occurredAt)));
      const expectedSortedStages = validFixtureEvents
        .slice()
        .sort((left, right) => {
          const timeDelta = Date.parse(left.occurredAt) - Date.parse(right.occurredAt);
          if (timeDelta !== 0) {
            return timeDelta;
          }
          return left.id.localeCompare(right.id);
        })
        .map((event) => event.stage);

      expect(timeline.paymentReference).toBe(fixture!.paymentReference);
      expect(timeline.merchantId).toBe(fixture!.merchantId);
      expect(timeline.finalStatus).toBe(mapFixtureStatusToTransactionStatus(fixture!.finalStatus));
      expect(timeline.summary.eventCount).toBe(expectations.expectedEventCount);
      expect(timeline.summary.malformedCount).toBe(expectations.expectedMalformedCount);
      expect(timeline.summary.emptyTimeline).toBe(expectations.expectedEmptyTimeline);
      expect(timeline.events).toHaveLength(expectations.expectedEventCount);
      expect(timeline.events.map((event) => event.stage)).toEqual(expectedSortedStages);
      expect(timeline.events.every((event) => event.source === 'attempt_event')).toBe(true);
      expect(timeline.normalization.contract).toBe('payment-attempt-timeline.v2');
    },
  );
});
