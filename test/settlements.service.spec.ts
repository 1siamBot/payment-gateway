import { ConflictException } from '@nestjs/common';
import { SettlementExceptionStatus, TransactionStatus, TransactionType } from '@prisma/client';
import { SettlementsService } from '../src/settlements/settlements.service';
import {
  RECONCILIATION_DISCREPANCY_FIXTURES,
  RECONCILIATION_DISCREPANCY_FIXTURE_TIMESTAMP,
} from '../src/settlements/reconciliation-discrepancy-fixtures';

type TransactionRow = {
  id: string;
  reference: string;
  merchantId: string;
  providerName?: string | null;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  callbackEvents: Array<{ status: string }>;
  createdAt?: Date;
};

function createPrismaMock(seedTransactions: TransactionRow[] = []) {
  const transactions = seedTransactions.map((tx) => ({
    createdAt: new Date('2026-03-17T01:00:00.000Z'),
    ...tx,
  }));

  const exceptionStore = new Map<string, any>();
  const exceptionByFingerprint = new Map<string, string>();
  const exceptionAuditStore: any[] = [];
  const idempotencyStore = new Map<string, { responseBody: string }>();

  const applyUpdateData = (row: any, data: Record<string, unknown>) => {
    const next = { ...row };
    for (const [key, value] of Object.entries(data)) {
      if (key === 'version' && typeof value === 'object' && value && 'increment' in value) {
        next.version += Number((value as { increment: number }).increment);
      } else {
        next[key] = value;
      }
    }
    next.updatedAt = new Date();
    return next;
  };

  return {
    store: {
      exceptionStore,
      exceptionAuditStore,
      idempotencyStore,
    },
    prisma: {
      transaction: {
        findMany: jest.fn(async ({ where, orderBy }: any) => {
          let rows = [...transactions];

          if (where?.createdAt?.gte || where?.createdAt?.lt) {
            rows = rows.filter((tx) => {
              const created = new Date(tx.createdAt ?? 0).getTime();
              if (where.createdAt.gte && created < new Date(where.createdAt.gte).getTime()) return false;
              if (where.createdAt.lt && created >= new Date(where.createdAt.lt).getTime()) return false;
              return true;
            });
          }

          if (where?.merchantId?.in) {
            rows = rows.filter((tx) => where.merchantId.in.includes(tx.merchantId));
          }
          if (where?.providerName?.in) {
            rows = rows.filter((tx) => tx.providerName && where.providerName.in.includes(tx.providerName));
          }

          if (orderBy?.createdAt === 'asc') {
            rows.sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
          }

          return rows;
        }),
      },
      auditLog: {
        create: jest.fn(async () => ({})),
      },
      idempotencyKey: {
        findUnique: jest.fn(async ({ where }: any) => (
          idempotencyStore.get(`${where.scope_key.scope}:${where.scope_key.key}`) ?? null
        )),
        create: jest.fn(async ({ data }: any) => {
          const key = `${data.scope}:${data.key}`;
          if (idempotencyStore.has(key)) {
            const error = new Error('Unique constraint failed');
            (error as any).code = 'P2002';
            throw error;
          }
          const row = { responseBody: data.responseBody };
          idempotencyStore.set(key, row);
          return row;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const key = `${where.scope_key.scope}:${where.scope_key.key}`;
          const current = idempotencyStore.get(key);
          if (!current) {
            throw new Error('Idempotency key not found');
          }
          const merged = { ...current, ...data };
          idempotencyStore.set(key, merged);
          return merged;
        }),
        delete: jest.fn(async ({ where }: any) => {
          const key = `${where.scope_key.scope}:${where.scope_key.key}`;
          idempotencyStore.delete(key);
          return {};
        }),
      },
      settlementException: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          const byId = where.id ? exceptionStore.get(where.id) ?? null : null;
          const byFingerprint = where.fingerprint
            ? exceptionStore.get(exceptionByFingerprint.get(where.fingerprint) ?? '') ?? null
            : null;
          const row = byId ?? byFingerprint;
          if (!row) return null;

          if (!include?.audits) {
            return row;
          }

          const audits = exceptionAuditStore
            .filter((audit) => audit.settlementExceptionId === row.id)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

          return { ...row, audits };
        }),
        findMany: jest.fn(async ({ where, take, cursor, skip }: any) => {
          let rows = [...exceptionStore.values()];

          if (where?.merchantId) {
            rows = rows.filter((row) => row.merchantId === where.merchantId);
          }
          if (where?.providerName) {
            rows = rows.filter((row) => row.providerName === where.providerName);
          }
          if (where?.status) {
            rows = rows.filter((row) => row.status === where.status);
          }
          if (where?.windowDate?.gte) {
            rows = rows.filter((row) => new Date(row.windowDate).getTime() >= new Date(where.windowDate.gte).getTime());
          }
          if (where?.windowDate?.lt) {
            rows = rows.filter((row) => new Date(row.windowDate).getTime() < new Date(where.windowDate.lt).getTime());
          }

          rows.sort((a, b) => {
            const byUpdatedAt = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            if (byUpdatedAt !== 0) return byUpdatedAt;
            return a.id.localeCompare(b.id);
          });

          if (cursor?.id) {
            const index = rows.findIndex((row) => row.id === cursor.id);
            if (index >= 0) {
              rows = rows.slice(index + (skip ?? 0));
            }
          }

          return rows.slice(0, take ?? rows.length);
        }),
        create: jest.fn(async ({ data }: any) => {
          const id = `se-${exceptionStore.size + 1}`;
          const now = new Date();
          const row = {
            id,
            merchantId: data.merchantId,
            providerName: data.providerName,
            windowDate: data.windowDate,
            ledgerTotal: data.ledgerTotal,
            providerTotal: data.providerTotal,
            deltaAmount: data.deltaAmount,
            fingerprint: data.fingerprint,
            status: data.status,
            openedReason: data.openedReason,
            openedNote: data.openedNote,
            latestOperatorReason: null,
            latestOperatorNote: null,
            resolutionActor: null,
            resolutionAt: null,
            version: 1,
            createdAt: now,
            updatedAt: now,
          };
          exceptionStore.set(id, row);
          exceptionByFingerprint.set(row.fingerprint, row.id);
          return row;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const current = exceptionStore.get(where.id);
          const updated = applyUpdateData(current, data);
          exceptionStore.set(where.id, updated);
          return updated;
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          const current = exceptionStore.get(where.id);
          if (!current || current.version !== where.version) {
            return { count: 0 };
          }
          const updated = applyUpdateData(current, data);
          exceptionStore.set(where.id, updated);
          return { count: 1 };
        }),
      },
      settlementExceptionAudit: {
        create: jest.fn(async ({ data }: any) => {
          const row = {
            id: `sea-${exceptionAuditStore.length + 1}`,
            createdAt: new Date(),
            ...data,
          };
          exceptionAuditStore.push(row);
          return row;
        }),
      },
    },
  };
}

describe('SettlementsService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-17T08:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('generates merchant settlement summary and mismatches for a day', async () => {
    const prismaMock = createPrismaMock([
      {
        id: 'tx-1',
        reference: 'ref-1',
        merchantId: 'merchant_a',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PAID,
        amount: 1000,
        currency: 'USD',
        callbackEvents: [{ status: 'succeeded' }],
      },
      {
        id: 'tx-2',
        reference: 'ref-2',
        merchantId: 'merchant_a',
        type: TransactionType.WITHDRAW,
        status: TransactionStatus.PENDING,
        amount: 200,
        currency: 'USD',
        callbackEvents: [],
      },
      {
        id: 'tx-3',
        reference: 'ref-3',
        merchantId: 'merchant_b',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PAID,
        amount: 50,
        currency: 'USD',
        callbackEvents: [],
      },
    ]);

    const service = new SettlementsService(prismaMock.prisma as any);
    const report = await service.generateDailyReconciliation('2026-03-17');

    expect(report.reportDate).toBe('2026-03-17');
    expect(report.merchants).toEqual([
      {
        merchantId: 'merchant_a',
        paidDepositAmount: 1000,
        paidWithdrawAmount: 0,
        refundedAmount: 0,
        netSettledAmount: 1000,
        transactionCount: 2,
      },
      {
        merchantId: 'merchant_b',
        paidDepositAmount: 50,
        paidWithdrawAmount: 0,
        refundedAmount: 0,
        netSettledAmount: 50,
        transactionCount: 1,
      },
    ]);
    expect(report.mismatches.map((item) => item.reason)).toEqual([
      'stuck_non_terminal',
      'paid_without_success_callback',
    ]);
  });

  it('filters mismatch query by merchant and transaction reference', async () => {
    const prismaMock = createPrismaMock([
      {
        id: 'tx-a',
        reference: 'ref-a',
        merchantId: 'merchant_x',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PENDING,
        amount: 100,
        currency: 'USD',
        callbackEvents: [],
      },
      {
        id: 'tx-b',
        reference: 'ref-b',
        merchantId: 'merchant_y',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PENDING,
        amount: 200,
        currency: 'USD',
        callbackEvents: [],
      },
    ]);

    const service = new SettlementsService(prismaMock.prisma as any);
    const report = await service.queryMismatches({
      date: '2026-03-17',
      merchantId: 'merchant_y',
      transactionReference: 'ref-b',
    });

    expect(report.mismatches).toHaveLength(1);
    expect(report.mismatches[0]).toMatchObject({
      merchantId: 'merchant_y',
      transactionReference: 'ref-b',
      reason: 'stuck_non_terminal',
    });
  });

  it('returns deterministic reconciliation discrepancy fixtures for all non-empty paths', () => {
    const prismaMock = createPrismaMock([]);
    const service = new SettlementsService(prismaMock.prisma as any);

    const response = service.listReconciliationDiscrepancies({});

    expect(response.contract).toBe('reconciliation-discrepancy.v1.list');
    expect(response.generatedAt).toBe(RECONCILIATION_DISCREPANCY_FIXTURE_TIMESTAMP);
    expect(response.total).toBe(RECONCILIATION_DISCREPANCY_FIXTURES.length);
    expect(response.data.map((row) => row.path)).toEqual([
      'duplicate-event',
      'matched',
      'mismatched-amount',
      'missing-capture',
    ]);
  });

  it('supports empty and path-specific discrepancy views', () => {
    const prismaMock = createPrismaMock([]);
    const service = new SettlementsService(prismaMock.prisma as any);

    const empty = service.listReconciliationDiscrepancies({ path: 'empty' });
    expect(empty.total).toBe(0);
    expect(empty.data).toEqual([]);

    const matched = service.listReconciliationDiscrepancies({ path: 'matched' });
    expect(matched.total).toBe(1);
    expect(matched.data[0]).toEqual(expect.objectContaining({
      id: 'recon_disc_matched_001',
      state: 'matched',
      deltaAmount: 0,
      captureReference: 'cap_1001',
    }));

    const mismatchedAmount = service.listReconciliationDiscrepancies({ path: 'mismatched-amount' });
    expect(mismatchedAmount.total).toBe(1);
    expect(mismatchedAmount.data[0]).toEqual(expect.objectContaining({
      id: 'recon_disc_mismatched_amount_001',
      state: 'mismatched_amount',
      deltaAmount: 20,
    }));

    const missingCapture = service.listReconciliationDiscrepancies({ path: 'missing-capture' });
    expect(missingCapture.total).toBe(1);
    expect(missingCapture.data[0]).toEqual(expect.objectContaining({
      id: 'recon_disc_missing_capture_001',
      state: 'missing_capture',
      captureReference: null,
    }));

    const duplicateEvent = service.listReconciliationDiscrepancies({ path: 'duplicate-event' });
    expect(duplicateEvent.total).toBe(1);
    expect(duplicateEvent.data[0]).toEqual(expect.objectContaining({
      id: 'recon_disc_duplicate_event_001',
      state: 'duplicate_event',
      duplicateEventCount: 2,
    }));
  });

  it('returns discrepancy detail and throws when discrepancy does not exist', () => {
    const prismaMock = createPrismaMock([]);
    const service = new SettlementsService(prismaMock.prisma as any);

    const detail = service.getReconciliationDiscrepancy('recon_disc_missing_capture_001');
    expect(detail.contract).toBe('reconciliation-discrepancy.v1.detail');
    expect(detail.generatedAt).toBe(RECONCILIATION_DISCREPANCY_FIXTURE_TIMESTAMP);
    expect(detail.discrepancy).toEqual(expect.objectContaining({
      id: 'recon_disc_missing_capture_001',
      state: 'missing_capture',
      captureReference: null,
    }));
    expect(detail.discrepancy.timeline).toHaveLength(4);
    expect(detail.discrepancy.timeline[2]).toEqual(expect.objectContaining({
      stage: 'provider_captured',
      status: 'warning',
    }));

    expect(() => service.getReconciliationDiscrepancy('recon_disc_missing')).toThrow('Reconciliation discrepancy not found');
  });

  it('returns daily summary aggregates', async () => {
    const prismaMock = createPrismaMock([
      {
        id: 'tx-1',
        reference: 'ref-1',
        merchantId: 'merchant_a',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PAID,
        amount: 100,
        currency: 'USD',
        callbackEvents: [{ status: 'succeeded' }],
      },
      {
        id: 'tx-2',
        reference: 'ref-2',
        merchantId: 'merchant_a',
        type: TransactionType.WITHDRAW,
        status: TransactionStatus.PAID,
        amount: 20,
        currency: 'USD',
        callbackEvents: [{ status: 'succeeded' }],
      },
      {
        id: 'tx-3',
        reference: 'ref-3',
        merchantId: 'merchant_b',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.REFUNDED,
        amount: 5,
        currency: 'USD',
        callbackEvents: [],
      },
    ]);

    const service = new SettlementsService(prismaMock.prisma as any);
    const summary = await service.getDailySummary('2026-03-17');

    expect(summary.summary).toEqual(expect.objectContaining({
      merchantCount: 2,
      transactionCount: 3,
      paidDepositAmount: 100,
      paidWithdrawAmount: 20,
      refundedAmount: 5,
      netSettledAmount: 75,
    }));
  });

  it('creates deterministic non-duplicated exceptions by fingerprint', async () => {
    const prismaMock = createPrismaMock([
      {
        id: 'tx-d-1',
        reference: 'ref-d-1',
        merchantId: 'merchant_a',
        providerName: 'mock-a',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PAID,
        amount: 120,
        currency: 'USD',
        callbackEvents: [{ status: 'succeeded' }],
      },
    ]);
    const service = new SettlementsService(prismaMock.prisma as any);

    const payload = {
      windowDate: '2026-03-17',
      records: [{ merchantId: 'merchant_a', providerName: 'mock-a', providerTotal: 100 }],
    };

    const first = await service.detectSettlementExceptions(payload, 'ops');
    const second = await service.detectSettlementExceptions(payload, 'ops');

    expect(first.detectedCount).toBe(1);
    expect(second.detectedCount).toBe(1);
    expect(second.exceptions[0].id).toBe(first.exceptions[0].id);
    expect(prismaMock.store.exceptionStore.size).toBe(1);
  });

  it('supports list filters and cursor pagination', async () => {
    const prismaMock = createPrismaMock([
      {
        id: 'tx-a',
        reference: 'ref-a',
        merchantId: 'merchant_a',
        providerName: 'mock-a',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PAID,
        amount: 100,
        currency: 'USD',
        callbackEvents: [{ status: 'succeeded' }],
      },
      {
        id: 'tx-b',
        reference: 'ref-b',
        merchantId: 'merchant_b',
        providerName: 'mock-b',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PAID,
        amount: 110,
        currency: 'USD',
        callbackEvents: [{ status: 'succeeded' }],
      },
    ]);
    const service = new SettlementsService(prismaMock.prisma as any);

    await service.detectSettlementExceptions({
      windowDate: '2026-03-17',
      records: [
        { merchantId: 'merchant_a', providerName: 'mock-a', providerTotal: 90 },
        { merchantId: 'merchant_b', providerName: 'mock-b', providerTotal: 90 },
      ],
    }, 'ops');

    const filtered = await service.listSettlementExceptions({ merchantId: 'merchant_b' });
    expect(filtered.data).toHaveLength(1);
    expect(filtered.data[0].merchantId).toBe('merchant_b');

    const firstPage = await service.listSettlementExceptions({ take: 1 });
    expect(firstPage.pageInfo.hasNext).toBe(true);
    expect(firstPage.pageInfo.nextCursor).toBeTruthy();

    const secondPage = await service.listSettlementExceptions({ take: 1, cursor: firstPage.pageInfo.nextCursor! });
    expect(secondPage.data).toHaveLength(1);
  });

  it('returns empty list deterministically when no exceptions match filters', async () => {
    const prismaMock = createPrismaMock();
    const service = new SettlementsService(prismaMock.prisma as any);

    const listed = await service.listSettlementExceptions({
      merchantId: 'merchant_missing',
      status: SettlementExceptionStatus.OPEN,
    });

    expect(listed.data).toEqual([]);
    expect(listed.pageInfo).toEqual({
      take: 20,
      hasNext: false,
      nextCursor: null,
    });
  });

  it('orders list rows deterministically by severity then createdAt then id', async () => {
    const prismaMock = createPrismaMock([
      {
        id: 'tx-a',
        reference: 'ref-a',
        merchantId: 'merchant_alpha',
        providerName: 'mock-a',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PAID,
        amount: 2200,
        currency: 'USD',
        callbackEvents: [{ status: 'succeeded' }],
      },
      {
        id: 'tx-b',
        reference: 'ref-b',
        merchantId: 'merchant_bravo',
        providerName: 'mock-b',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PAID,
        amount: 900,
        currency: 'USD',
        callbackEvents: [{ status: 'succeeded' }],
      },
      {
        id: 'tx-c',
        reference: 'ref-c',
        merchantId: 'merchant_charlie',
        providerName: 'mock-c',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PAID,
        amount: 260,
        currency: 'USD',
        callbackEvents: [{ status: 'succeeded' }],
      },
    ]);
    const service = new SettlementsService(prismaMock.prisma as any);

    await service.detectSettlementExceptions({
      windowDate: '2026-03-17',
      records: [
        { merchantId: 'merchant_alpha', providerName: 'mock-a', providerTotal: 900 },
        { merchantId: 'merchant_bravo', providerName: 'mock-b', providerTotal: 560 },
        { merchantId: 'merchant_charlie', providerName: 'mock-c', providerTotal: 200 },
      ],
    }, 'ops');

    const listed = await service.listSettlementExceptions({});

    expect(listed.data.map((row) => row.id)).toEqual(['se-1', 'se-2', 'se-3']);
    expect(listed.data.map((row) => row.severity)).toEqual(['critical', 'high', 'low']);
    expect(listed.data[0].actionState).toEqual({
      acknowledge: { enabled: true, reason: 'available' },
      assignOwner: { enabled: true, reason: 'available' },
      markResolved: { enabled: true, reason: 'available' },
    });
  });

  it('returns filtered subset by status, merchantId, and date window', async () => {
    const prismaMock = createPrismaMock([
      {
        id: 'tx-a',
        reference: 'ref-a',
        merchantId: 'merchant_alpha',
        providerName: 'mock-a',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PAID,
        amount: 400,
        currency: 'USD',
        callbackEvents: [{ status: 'succeeded' }],
      },
      {
        id: 'tx-b',
        reference: 'ref-b',
        merchantId: 'merchant_bravo',
        providerName: 'mock-b',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PAID,
        amount: 300,
        currency: 'USD',
        callbackEvents: [{ status: 'succeeded' }],
      },
    ]);
    const service = new SettlementsService(prismaMock.prisma as any);

    const detected = await service.detectSettlementExceptions({
      windowDate: '2026-03-17',
      records: [
        { merchantId: 'merchant_alpha', providerName: 'mock-a', providerTotal: 200 },
        { merchantId: 'merchant_bravo', providerName: 'mock-b', providerTotal: 250 },
      ],
    }, 'ops');

    await service.updateSettlementException(detected.exceptions[0].id, {
      action: 'resolve',
      reason: 'resolved for filtered subset test',
      expectedVersion: detected.exceptions[0].version,
    }, 'ops');

    const listed = await service.listSettlementExceptions({
      status: SettlementExceptionStatus.RESOLVED,
      merchantId: 'merchant_alpha',
      dateFrom: '2026-03-17',
      dateTo: '2026-03-17',
    });

    expect(listed.data).toHaveLength(1);
    expect(listed.data[0]).toEqual(expect.objectContaining({
      merchantId: 'merchant_alpha',
      status: SettlementExceptionStatus.RESOLVED,
      actionState: {
        acknowledge: { enabled: false, reason: 'terminal_status' },
        assignOwner: { enabled: false, reason: 'terminal_status' },
        markResolved: { enabled: false, reason: 'terminal_status' },
      },
    }));
  });

  it('returns detail for existing exception and not-found for unknown id', async () => {
    const prismaMock = createPrismaMock([
      {
        id: 'tx-a',
        reference: 'ref-a',
        merchantId: 'merchant_alpha',
        providerName: 'mock-a',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PAID,
        amount: 500,
        currency: 'USD',
        callbackEvents: [{ status: 'succeeded' }],
      },
    ]);
    const service = new SettlementsService(prismaMock.prisma as any);

    const detected = await service.detectSettlementExceptions({
      windowDate: '2026-03-17',
      records: [{ merchantId: 'merchant_alpha', providerName: 'mock-a', providerTotal: 100 }],
    }, 'ops');

    const detail = await service.getSettlementException(detected.exceptions[0].id);
    expect(detail.id).toBe(detected.exceptions[0].id);
    expect(detail.severity).toBe('high');
    expect(detail.actionState).toEqual({
      acknowledge: { enabled: true, reason: 'available' },
      assignOwner: { enabled: true, reason: 'available' },
      markResolved: { enabled: true, reason: 'available' },
    });

    await expect(service.getSettlementException('se-missing')).rejects.toThrow('Settlement exception not found');
  });

  it('applies acknowledge command with deterministic investigating transition', async () => {
    const prismaMock = createPrismaMock([
      {
        id: 'tx-a',
        reference: 'ref-a',
        merchantId: 'merchant_a',
        providerName: 'mock-a',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PAID,
        amount: 100,
        currency: 'USD',
        callbackEvents: [{ status: 'succeeded' }],
      },
    ]);
    const service = new SettlementsService(prismaMock.prisma as any);
    const detected = await service.detectSettlementExceptions({
      windowDate: '2026-03-17',
      records: [{ merchantId: 'merchant_a', providerName: 'mock-a', providerTotal: 90 }],
    }, 'ops');

    const updated = await service.commandSettlementException(detected.exceptions[0].id, {
      command: 'acknowledge',
      reason: 'triage started',
      expectedVersion: detected.exceptions[0].version,
    }, 'ops');

    expect(updated.status).toBe(SettlementExceptionStatus.INVESTIGATING);
    expect(updated.version).toBe(detected.exceptions[0].version + 1);
    expect(updated.latestOperatorReason).toBe('triage started');
  });

  it('applies assignOwner command and persists owner marker in audit note', async () => {
    const prismaMock = createPrismaMock([
      {
        id: 'tx-a',
        reference: 'ref-a',
        merchantId: 'merchant_a',
        providerName: 'mock-a',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PAID,
        amount: 100,
        currency: 'USD',
        callbackEvents: [{ status: 'succeeded' }],
      },
    ]);
    const service = new SettlementsService(prismaMock.prisma as any);
    const detected = await service.detectSettlementExceptions({
      windowDate: '2026-03-17',
      records: [{ merchantId: 'merchant_a', providerName: 'mock-a', providerTotal: 90 }],
    }, 'ops');

    const updated = await service.commandSettlementException(detected.exceptions[0].id, {
      command: 'assignOwner',
      owner: 'ops-bot',
      reason: 'handoff to queue owner',
      note: 'priority=p1',
      expectedVersion: detected.exceptions[0].version,
    }, 'ops');

    expect(updated.status).toBe(SettlementExceptionStatus.INVESTIGATING);
    expect(updated.latestOperatorNote).toBe('owner=ops-bot; priority=p1');
    expect(updated.audits.at(-1)).toEqual(expect.objectContaining({
      reason: 'handoff to queue owner',
      note: 'owner=ops-bot; priority=p1',
    }));
  });

  it('applies markResolved command and moves row to terminal status', async () => {
    const prismaMock = createPrismaMock([
      {
        id: 'tx-a',
        reference: 'ref-a',
        merchantId: 'merchant_a',
        providerName: 'mock-a',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PAID,
        amount: 100,
        currency: 'USD',
        callbackEvents: [{ status: 'succeeded' }],
      },
    ]);
    const service = new SettlementsService(prismaMock.prisma as any);
    const detected = await service.detectSettlementExceptions({
      windowDate: '2026-03-17',
      records: [{ merchantId: 'merchant_a', providerName: 'mock-a', providerTotal: 90 }],
    }, 'ops');
    const acknowledged = await service.commandSettlementException(detected.exceptions[0].id, {
      command: 'acknowledge',
      reason: 'triage started',
      expectedVersion: detected.exceptions[0].version,
    }, 'ops');

    const resolved = await service.commandSettlementException(acknowledged.id, {
      command: 'markResolved',
      reason: 'provider report reconciled',
      expectedVersion: acknowledged.version,
    }, 'ops');

    expect(resolved.status).toBe(SettlementExceptionStatus.RESOLVED);
    expect(resolved.resolutionActor).toBe('ops');
  });

  it('rejects invalid command transition deterministically', async () => {
    const prismaMock = createPrismaMock([
      {
        id: 'tx-a',
        reference: 'ref-a',
        merchantId: 'merchant_a',
        providerName: 'mock-a',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PAID,
        amount: 100,
        currency: 'USD',
        callbackEvents: [{ status: 'succeeded' }],
      },
    ]);
    const service = new SettlementsService(prismaMock.prisma as any);
    const detected = await service.detectSettlementExceptions({
      windowDate: '2026-03-17',
      records: [{ merchantId: 'merchant_a', providerName: 'mock-a', providerTotal: 90 }],
    }, 'ops');

    const acknowledged = await service.commandSettlementException(detected.exceptions[0].id, {
      command: 'acknowledge',
      reason: 'triage started',
      expectedVersion: detected.exceptions[0].version,
    }, 'ops');

    await expect(service.commandSettlementException(acknowledged.id, {
      command: 'acknowledge',
      reason: 'repeat acknowledge',
      expectedVersion: acknowledged.version,
    }, 'ops')).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'SETTLEMENT_EXCEPTION_ACTION_CONFLICT',
        reason: 'invalid_transition',
        retryable: false,
      }),
      status: 409,
    });
  });

  it('returns not-found for unknown exception command target', async () => {
    const prismaMock = createPrismaMock();
    const service = new SettlementsService(prismaMock.prisma as any);

    await expect(service.commandSettlementException('se-missing', {
      command: 'markResolved',
      reason: 'done',
      expectedVersion: 1,
    }, 'ops')).rejects.toThrow('Settlement exception not found');
  });

  it('enforces transition reason and writes immutable audit trail', async () => {
    const prismaMock = createPrismaMock([
      {
        id: 'tx-a',
        reference: 'ref-a',
        merchantId: 'merchant_a',
        providerName: 'mock-a',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PAID,
        amount: 100,
        currency: 'USD',
        callbackEvents: [{ status: 'succeeded' }],
      },
    ]);
    const service = new SettlementsService(prismaMock.prisma as any);

    const detected = await service.detectSettlementExceptions({
      windowDate: '2026-03-17',
      records: [{ merchantId: 'merchant_a', providerName: 'mock-a', providerTotal: 90 }],
    }, 'ops');

    const target = detected.exceptions[0];

    await expect(service.updateSettlementException(target.id, {
      action: 'resolve',
      reason: '   ',
      expectedVersion: target.version,
    }, 'ops')).rejects.toThrow('reason is required');

    const resolved = await service.updateSettlementException(target.id, {
      action: 'resolve',
      reason: 'provider statement validated',
      note: 'matched on next settlement file',
      expectedVersion: target.version,
    }, 'ops');

    expect(resolved.status).toBe(SettlementExceptionStatus.RESOLVED);
    expect(resolved.version).toBe(target.version + 1);
    expect(resolved.latestOperatorReason).toBe('provider statement validated');
    expect(resolved.audits.map((audit) => audit.toStatus)).toEqual([
      SettlementExceptionStatus.OPEN,
      SettlementExceptionStatus.RESOLVED,
    ]);

    await expect(service.updateSettlementException(target.id, {
      action: 'ignore',
      reason: 'duplicate alert',
      expectedVersion: resolved.version,
    }, 'ops')).rejects.toThrow(ConflictException);
  });

  it('rejects stale version during concurrent-style command updates', async () => {
    const prismaMock = createPrismaMock([
      {
        id: 'tx-a',
        reference: 'ref-a',
        merchantId: 'merchant_a',
        providerName: 'mock-a',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PAID,
        amount: 100,
        currency: 'USD',
        callbackEvents: [{ status: 'succeeded' }],
      },
    ]);
    const service = new SettlementsService(prismaMock.prisma as any);

    const initial = await service.detectSettlementExceptions({
      windowDate: '2026-03-17',
      records: [{ merchantId: 'merchant_a', providerName: 'mock-a', providerTotal: 95 }],
    }, 'ops');

    await service.detectSettlementExceptions({
      windowDate: '2026-03-17',
      records: [{ merchantId: 'merchant_a', providerName: 'mock-a', providerTotal: 90 }],
    }, 'ops');

    await expect(service.commandSettlementException(initial.exceptions[0].id, {
      command: 'markResolved',
      reason: 'done',
      expectedVersion: initial.exceptions[0].version,
    }, 'ops')).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'SETTLEMENT_EXCEPTION_ACTION_CONFLICT',
        reason: 'stale_version',
        message: 'Version conflict; refresh and retry with current version',
        retryable: true,
        currentVersion: expect.any(Number),
        currentUpdatedAt: expect.any(String),
      }),
      status: 409,
    });
  });

  it('replays response for duplicate action submit with same idempotency key', async () => {
    const prismaMock = createPrismaMock([
      {
        id: 'tx-a',
        reference: 'ref-a',
        merchantId: 'merchant_a',
        providerName: 'mock-a',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PAID,
        amount: 100,
        currency: 'USD',
        callbackEvents: [{ status: 'succeeded' }],
      },
    ]);
    const service = new SettlementsService(prismaMock.prisma as any);

    const detected = await service.detectSettlementExceptions({
      windowDate: '2026-03-17',
      records: [{ merchantId: 'merchant_a', providerName: 'mock-a', providerTotal: 90 }],
    }, 'ops');
    const target = detected.exceptions[0];

    const first = await service.updateSettlementException(target.id, {
      action: 'resolve',
      reason: 'provider statement validated',
      expectedVersion: target.version,
      idempotencyKey: 'idem-settlement-action-1',
    }, 'ops');

    const second = await service.updateSettlementException(target.id, {
      action: 'resolve',
      reason: 'provider statement validated',
      expectedVersion: target.version,
      idempotencyKey: 'idem-settlement-action-1',
    }, 'ops');

    expect(second).toEqual(first);
    expect(prismaMock.store.exceptionAuditStore).toHaveLength(2);
  });

  it('rejects idempotency key reuse when payload fingerprint changes', async () => {
    const prismaMock = createPrismaMock([
      {
        id: 'tx-a',
        reference: 'ref-a',
        merchantId: 'merchant_a',
        providerName: 'mock-a',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PAID,
        amount: 100,
        currency: 'USD',
        callbackEvents: [{ status: 'succeeded' }],
      },
    ]);
    const service = new SettlementsService(prismaMock.prisma as any);

    const detected = await service.detectSettlementExceptions({
      windowDate: '2026-03-17',
      records: [{ merchantId: 'merchant_a', providerName: 'mock-a', providerTotal: 90 }],
    }, 'ops');
    const target = detected.exceptions[0];

    await service.updateSettlementException(target.id, {
      action: 'resolve',
      reason: 'provider statement validated',
      expectedVersion: target.version,
      idempotencyKey: 'idem-settlement-action-2',
    }, 'ops');

    await expect(service.updateSettlementException(target.id, {
      action: 'resolve',
      reason: 'different payload',
      expectedVersion: target.version,
      idempotencyKey: 'idem-settlement-action-2',
    }, 'ops')).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'SETTLEMENT_EXCEPTION_ACTION_CONFLICT',
        reason: 'idempotency_key_reused',
        retryable: false,
      }),
      status: 409,
    });
  });
});
