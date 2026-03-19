import {
  applyActionQueueTransition,
  buildSettlementExceptionsViewState,
  filterExceptions,
  sortExceptionsDeterministic,
  type SettlementExceptionInboxRow,
  type SettlementExceptionQueueState,
} from '../frontend/utils/settlementExceptionsInbox';

describe('settlement exceptions inbox utilities', () => {
  const rows: SettlementExceptionInboxRow[] = [
    {
      id: 'se_low_b',
      reference: 'se_low_b',
      merchantId: 'merchant_alpha',
      providerName: 'mock-a',
      status: 'OPEN',
      severity: 'low',
      openedReason: 'delta_minor',
      deltaAmount: 25,
      windowDate: '2026-03-17',
      createdAt: '2026-03-17T08:00:00.000Z',
      updatedAt: '2026-03-17T08:00:00.000Z',
      version: 1,
    },
    {
      id: 'se_critical_a',
      reference: 'se_critical_a',
      merchantId: 'merchant_bravo',
      providerName: 'mock-a',
      status: 'INVESTIGATING',
      severity: 'critical',
      openedReason: 'delta_large',
      deltaAmount: 2400,
      windowDate: '2026-03-18',
      createdAt: '2026-03-18T08:00:00.000Z',
      updatedAt: '2026-03-18T08:00:00.000Z',
      version: 2,
    },
    {
      id: 'se_critical_b',
      reference: 'se_critical_b',
      merchantId: 'merchant_alpha',
      providerName: 'mock-b',
      status: 'OPEN',
      severity: 'critical',
      openedReason: 'delta_large',
      deltaAmount: 2400,
      windowDate: '2026-03-18',
      createdAt: '2026-03-18T08:00:00.000Z',
      updatedAt: '2026-03-18T08:00:00.000Z',
      version: 2,
    },
    {
      id: 'se_high',
      reference: 'se_high',
      merchantId: 'merchant_charlie',
      providerName: 'mock-b',
      status: 'RESOLVED',
      severity: 'high',
      openedReason: 'callback_gap',
      deltaAmount: 400,
      windowDate: '2026-03-19',
      createdAt: '2026-03-19T09:00:00.000Z',
      updatedAt: '2026-03-19T09:00:00.000Z',
      version: 3,
    },
  ];

  it('sorts rows by severity, then createdAt desc, then reference tie-break', () => {
    const sorted = sortExceptionsDeterministic(rows);
    expect(sorted.map((row) => row.reference)).toEqual([
      'se_critical_a',
      'se_critical_b',
      'se_high',
      'se_low_b',
    ]);
  });

  it('filters rows by status, merchant, and date range deterministically', () => {
    const filtered = filterExceptions(rows, {
      status: 'OPEN',
      merchantId: 'alpha',
      dateFrom: '2026-03-17',
      dateTo: '2026-03-18',
    });
    expect(filtered.map((row) => row.reference)).toEqual(['se_low_b', 'se_critical_b']);
  });

  it('applies acknowledge, assign owner, and mark resolved queue transitions', () => {
    let queue: SettlementExceptionQueueState = {};
    queue = applyActionQueueTransition(queue, { type: 'acknowledge', exceptionId: 'se_critical_a' });
    queue = applyActionQueueTransition(queue, {
      type: 'assign_owner',
      exceptionId: 'se_critical_a',
      owner: 'ops-bot',
    });
    queue = applyActionQueueTransition(queue, {
      type: 'mark_resolved',
      exceptionId: 'se_critical_a',
      reason: 'Provider replay completed',
      resolvedAt: '2026-03-19T10:00:00.000Z',
    });

    expect(queue.se_critical_a).toEqual({
      acknowledged: true,
      owner: 'ops-bot',
      resolutionReason: 'Provider replay completed',
      resolvedAt: '2026-03-19T10:00:00.000Z',
    });
  });

  it('builds loading/error/empty/ready states with deterministic retry behavior', () => {
    const loading = buildSettlementExceptionsViewState({
      loading: true,
      error: '',
      rows: [],
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });
    const error = buildSettlementExceptionsViewState({
      loading: false,
      error: 'boom',
      rows: [],
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });
    const empty = buildSettlementExceptionsViewState({
      loading: false,
      error: '',
      rows: [],
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });
    const ready = buildSettlementExceptionsViewState({
      loading: false,
      error: '',
      rows: [rows[0]],
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });

    expect(loading).toEqual({ key: 'loading', message: 'loading', showRetry: false });
    expect(error).toEqual({ key: 'error', message: 'boom', showRetry: true });
    expect(empty).toEqual({ key: 'empty', message: 'empty', showRetry: false });
    expect(ready).toEqual({ key: 'ready', message: 'ready', showRetry: false });
  });
});
