import {
  applyActionTransition,
  buildPanelViewState,
  resolveAnomalyDataSource,
  sortAnomalyAlertsDeterministic,
  validateReasonNote,
  type AnomalyAlertRow,
  type ActionQueueState,
} from '../frontend/utils/merchantBalanceAnomalyConsole';

describe('merchant balance anomaly console utilities', () => {
  const rows: AnomalyAlertRow[] = [
    {
      id: 'mba_c_late',
      merchantId: 'merchant_a',
      severity: 'critical',
      detectedAt: '2026-03-19T10:00:00.000Z',
      reason: 'delta',
      deltaAmount: 2100,
      currency: 'THB',
      status: 'OPEN',
    },
    {
      id: 'mba_h',
      merchantId: 'merchant_a',
      severity: 'high',
      detectedAt: '2026-03-19T13:00:00.000Z',
      reason: 'delta',
      deltaAmount: 800,
      currency: 'THB',
      status: 'OPEN',
    },
    {
      id: 'mba_c_early',
      merchantId: 'merchant_a',
      severity: 'critical',
      detectedAt: '2026-03-19T12:00:00.000Z',
      reason: 'delta',
      deltaAmount: 2150,
      currency: 'THB',
      status: 'INVESTIGATING',
    },
    {
      id: 'mba_c_merchant_b',
      merchantId: 'merchant_b',
      severity: 'critical',
      detectedAt: '2026-03-19T15:00:00.000Z',
      reason: 'delta',
      deltaAmount: 2400,
      currency: 'THB',
      status: 'OPEN',
    },
  ];

  it('sorts alerts by severity desc, merchant asc, then detectedAt desc', () => {
    const sorted = sortAnomalyAlertsDeterministic(rows);

    expect(sorted.map((row) => row.id)).toEqual([
      'mba_c_early',
      'mba_c_late',
      'mba_c_merchant_b',
      'mba_h',
    ]);
  });

  it('applies acknowledge, investigation, and resolved action transitions deterministically', () => {
    let queue: ActionQueueState = {};

    queue = applyActionTransition(queue, {
      anomalyId: 'mba_c_early',
      action: 'acknowledge',
      note: '',
      at: '2026-03-19T16:00:00.000Z',
    });
    queue = applyActionTransition(queue, {
      anomalyId: 'mba_c_early',
      action: 'open_investigation',
      note: 'Need provider callback trace',
      at: '2026-03-19T16:05:00.000Z',
    });
    queue = applyActionTransition(queue, {
      anomalyId: 'mba_c_early',
      action: 'mark_resolved',
      note: 'Replay completed and balances matched',
      at: '2026-03-19T16:12:00.000Z',
    });

    expect(queue.mba_c_early).toEqual({
      status: 'resolved',
      note: 'Replay completed and balances matched',
      updatedAt: '2026-03-19T16:12:00.000Z',
    });
  });

  it('validates reason notes by action and max length', () => {
    expect(validateReasonNote('acknowledge', '')).toEqual({ valid: true });
    expect(validateReasonNote('open_investigation', 'abc')).toEqual({
      valid: false,
      message: 'Reason note must be at least 4 characters to open investigation.',
    });
    expect(validateReasonNote('mark_resolved', 'short')).toEqual({
      valid: false,
      message: 'Reason note must be at least 8 characters to resolve.',
    });
    expect(validateReasonNote('mark_resolved', 'valid note content')).toEqual({ valid: true });
  });

  it('builds deterministic loading/error/empty/ready states for list and action panel', () => {
    const loading = buildPanelViewState({
      loading: true,
      error: '',
      itemCount: 0,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });
    const error = buildPanelViewState({
      loading: false,
      error: 'boom',
      itemCount: 0,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });
    const empty = buildPanelViewState({
      loading: false,
      error: '',
      itemCount: 0,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });
    const ready = buildPanelViewState({
      loading: false,
      error: '',
      itemCount: 1,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });

    expect(loading).toEqual({ key: 'loading', message: 'loading', showRetry: false });
    expect(error).toEqual({ key: 'error', message: 'boom', showRetry: true });
    expect(empty).toEqual({ key: 'empty', message: 'empty', showRetry: false });
    expect(ready).toEqual({ key: 'ready', message: 'ready', showRetry: false });
  });

  it('falls back to fixture source on unsupported anomaly API endpoints', () => {
    expect(resolveAnomalyDataSource({ mode: 'api', latestApiStatusCode: 404 })).toBe('fixture');
    expect(resolveAnomalyDataSource({ mode: 'api', latestApiStatusCode: 501 })).toBe('fixture');
    expect(resolveAnomalyDataSource({ mode: 'fixture_success' })).toBe('fixture');
    expect(resolveAnomalyDataSource({ mode: 'api', latestApiStatusCode: 500 })).toBe('api');
  });
});
