import {
  buildReconciliationKpis,
  buildSectionViewState,
  labelForMismatchCategory,
  mapReasonToMismatchCategory,
  nextRetryAttempt,
  normalizeMismatchCategory,
  resolveReconciliationDataSource,
  sortMismatchRowsDeterministic,
  type MismatchRow,
} from '../frontend/utils/paymentReconciliationWorkspace';

describe('payment reconciliation workspace utilities', () => {
  it('builds KPI cards in deterministic required order', () => {
    const cards = buildReconciliationKpis({
      totalVolume: 14,
      successCount: 9,
      failCount: 3,
      pendingAnomalies: 2,
    });

    expect(cards.map((card) => card.key)).toEqual([
      'total_volume',
      'success_count',
      'fail_count',
      'pending_anomalies',
    ]);
    expect(cards.map((card) => card.value)).toEqual([14, 9, 3, 2]);
  });

  it('sorts mismatch rows deterministically and tie-breaks by transaction reference', () => {
    const rows: MismatchRow[] = [
      {
        transactionReference: 'pay_rec_200',
        merchantId: 'mrc_b',
        amount: 500,
        currency: 'THB',
        category: 'stale-status',
        reason: 'stuck_non_terminal',
        status: 'PENDING',
      },
      {
        transactionReference: 'pay_rec_100',
        merchantId: 'mrc_a',
        amount: 500,
        currency: 'THB',
        category: 'missing-event',
        reason: 'paid_without_success_callback',
        status: 'PAID',
      },
      {
        transactionReference: 'pay_rec_300',
        merchantId: 'mrc_c',
        amount: 900,
        currency: 'THB',
        category: 'duplicate-event',
        reason: 'failed_with_success_callback',
        status: 'FAILED',
      },
    ];

    const sortedByAmountAsc = sortMismatchRowsDeterministic(rows, { key: 'amount', direction: 'asc' });
    const sortedByAmountDesc = sortMismatchRowsDeterministic(rows, { key: 'amount', direction: 'desc' });

    expect(sortedByAmountAsc.map((row) => row.transactionReference)).toEqual([
      'pay_rec_100',
      'pay_rec_200',
      'pay_rec_300',
    ]);
    expect(sortedByAmountDesc.map((row) => row.transactionReference)).toEqual([
      'pay_rec_300',
      'pay_rec_100',
      'pay_rec_200',
    ]);
  });

  it('builds empty and error view states with deterministic retry visibility', () => {
    const empty = buildSectionViewState({
      loading: false,
      error: '',
      itemCount: 0,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });

    const error = buildSectionViewState({
      loading: false,
      error: 'boom',
      itemCount: 0,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });

    expect(empty).toEqual({ key: 'empty', message: 'empty', showRetry: false });
    expect(error).toEqual({ key: 'error', message: 'boom', showRetry: true });
  });

  it('increments retry attempts and resolves fixture fallback for unsupported API endpoints', () => {
    expect(nextRetryAttempt(0)).toBe(1);
    expect(nextRetryAttempt(3)).toBe(4);

    expect(resolveReconciliationDataSource({ mode: 'api', latestApiStatusCode: 404 })).toBe('fixture');
    expect(resolveReconciliationDataSource({ mode: 'api', latestApiStatusCode: 501 })).toBe('fixture');
    expect(resolveReconciliationDataSource({ mode: 'fixture_success' })).toBe('fixture');
    expect(resolveReconciliationDataSource({ mode: 'api', latestApiStatusCode: 500 })).toBe('api');
  });

  it('normalizes mismatch categories and maps legacy reasons to deterministic badge categories', () => {
    expect(normalizeMismatchCategory('missing_event')).toBe('missing-event');
    expect(normalizeMismatchCategory('duplicate-event')).toBe('duplicate-event');
    expect(normalizeMismatchCategory('unexpected')).toBe('stale-status');

    expect(mapReasonToMismatchCategory('paid_without_success_callback')).toBe('missing-event');
    expect(mapReasonToMismatchCategory('failed_with_success_callback')).toBe('duplicate-event');
    expect(mapReasonToMismatchCategory('stuck_non_terminal')).toBe('stale-status');

    expect(labelForMismatchCategory('amount')).toBe('amount');
    expect(labelForMismatchCategory('currency')).toBe('currency');
  });
});
