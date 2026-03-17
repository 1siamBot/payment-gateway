import { TransactionStatus, TransactionType } from '@prisma/client';
import { PaymentsService } from '../src/payments/payments.service';

function createPrismaMock() {
  const idempotencyStore = new Map<string, { responseBody: string }>();
  const callbackStore = new Set<string>();
  const txStore = new Map<string, any>();
  const txByRef = new Map<string, any>();
  const audits: any[] = [];

  return {
    store: { txStore, txByRef, audits },
    prisma: {
      idempotencyKey: {
        findUnique: jest.fn(async ({ where }) => idempotencyStore.get(`${where.scope_key.scope}:${where.scope_key.key}`) ?? null),
        create: jest.fn(async ({ data }) => {
          idempotencyStore.set(`${data.scope}:${data.key}`, { responseBody: data.responseBody });
          return data;
        }),
      },
      transaction: {
        create: jest.fn(async ({ data }) => {
          const tx = { id: 'tx-1', ...data, audits: [] };
          txStore.set(tx.id, tx);
          txByRef.set(tx.reference, tx);
          return tx;
        }),
        update: jest.fn(async ({ where, data }) => {
          const tx = txStore.get(where.id);
          const merged = { ...tx, ...data };
          txStore.set(where.id, merged);
          txByRef.set(merged.reference, merged);
          return merged;
        }),
        findUnique: jest.fn(async ({ where }) => {
          if (where.reference) {
            return txByRef.get(where.reference) ?? null;
          }
          return txStore.get(where.id) ?? null;
        }),
      },
      provider: {
        upsert: jest.fn(async () => ({ id: 'provider-1', name: 'mock-a' })),
      },
      tenant: {
        upsert: jest.fn(async () => ({ id: 'system' })),
      },
      callbackEvent: {
        findUnique: jest.fn(async ({ where }) => {
          const key = `${where.providerName_eventId.providerName}:${where.providerName_eventId.eventId}`;
          if (callbackStore.has(key)) {
            return { id: 'cb-1' };
          }
          return null;
        }),
        create: jest.fn(async ({ data }) => {
          callbackStore.add(`${data.providerName}:${data.eventId}`);
          return data;
        }),
      },
      transactionAudit: {
        create: jest.fn(async ({ data }) => {
          audits.push(data);
          return data;
        }),
      },
      auditLog: {
        create: jest.fn(async ({ data }) => data),
      },
    },
  };
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

    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    const payload = {
      shopId: 'shop-1',
      amount: 100,
      currency: 'USD',
      type: 'deposit' as const,
      idempotencyKey: 'idem-1',
    };

    const first = await service.initiatePayment(payload);
    const second = await service.initiatePayment(payload);

    expect(first.reference).toBe(second.reference);
    expect(router.initiateWithFailover).toHaveBeenCalledTimes(1);
    expect(first.status).toBe(TransactionStatus.PROCESSING);
  });

  it('applies callback once and ignores duplicates', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };

    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    const created = await service.initiatePayment({
      shopId: 'shop-1',
      amount: 40,
      currency: 'USD',
      type: 'withdraw',
      idempotencyKey: 'idem-2',
    });

    const sign = (eventId: string) =>
      require('crypto').createHmac('sha256', 'test-secret').update(`mock-a:${eventId}:${created.reference}:succeeded`).digest('hex');

    const first = await service.handleCallback({
      provider: 'mock-a',
      eventId: 'evt-1',
      transactionReference: created.reference,
      status: 'succeeded',
      signature: sign('evt-1'),
    });

    const second = await service.handleCallback({
      provider: 'mock-a',
      eventId: 'evt-1',
      transactionReference: created.reference,
      status: 'succeeded',
      signature: sign('evt-1'),
    });

    expect(first.applied).toBe(true);
    expect(first.status).toBe(TransactionStatus.SUCCEEDED);
    expect(second.applied).toBe(false);
  });

  it('throws when callback signature is invalid', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-a', externalRef: `A-${reference}` })),
    };

    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    await service.initiatePayment({
      shopId: 'shop-1',
      amount: 70,
      currency: 'USD',
      type: 'deposit',
      idempotencyKey: 'idem-3',
    });

    await expect(
      service.handleCallback({
        provider: 'mock-a',
        eventId: 'evt-2',
        transactionReference: [...prismaMock.store.txByRef.keys()][0],
        status: 'succeeded',
        signature: 'bad-signature',
      }),
    ).rejects.toThrow('Invalid callback signature');
  });

  it('passes transaction type correctly to provider routing', async () => {
    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({ providerName: 'mock-b', externalRef: `B-${reference}` })),
    };

    const service = new PaymentsService(prismaMock.prisma as any, router as any);

    await service.initiatePayment({
      shopId: 'shop-2',
      amount: 25,
      currency: 'THB',
      type: 'withdraw',
      idempotencyKey: 'idem-4',
    });

    expect(router.initiateWithFailover).toHaveBeenCalledWith(
      expect.objectContaining({ type: TransactionType.WITHDRAW }),
    );
  });
});
