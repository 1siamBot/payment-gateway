import {
  applyRiskAlertSuppressionTransition,
  buildRiskAlertViewState,
  filterRiskAlerts,
  sortRiskAlertsDeterministic,
  type RiskAlertRow,
  type RiskAlertSuppressionState,
} from '../frontend/utils/riskAlertCommandCenter';

describe('risk alert command center utilities', () => {
  const rows: RiskAlertRow[] = [
    {
      id: 'risk-low-01',
      title: 'Low variance drift',
      summary: 'Low-risk drift observed',
      merchantId: 'merchant_alpha',
      provider: 'mock-b',
      severity: 'low',
      detectedAt: '2026-03-18T08:00:00.000Z',
      status: 'new',
      signalValue: 8,
      snoozeUntil: null,
    },
    {
      id: 'risk-critical-02',
      title: 'Failover pressure spike',
      summary: 'Critical risk signal above threshold',
      merchantId: 'merchant_bravo',
      provider: 'mock-a',
      severity: 'critical',
      detectedAt: '2026-03-19T09:00:00.000Z',
      status: 'new',
      signalValue: 98,
      snoozeUntil: null,
    },
    {
      id: 'risk-critical-01',
      title: 'Policy confidence drop',
      summary: 'Critical confidence collapse',
      merchantId: 'merchant_alpha',
      provider: 'mock-c',
      severity: 'critical',
      detectedAt: '2026-03-19T09:00:00.000Z',
      status: 'new',
      signalValue: 97,
      snoozeUntil: null,
    },
    {
      id: 'risk-high-01',
      title: 'Retry degradation',
      summary: 'High retry pressure',
      merchantId: 'merchant_alpha',
      provider: 'mock-a',
      severity: 'high',
      detectedAt: '2026-03-19T08:00:00.000Z',
      status: 'acknowledged',
      signalValue: 72,
      snoozeUntil: null,
    },
  ];

  it('sorts by severity, detectedAt desc, then provider', () => {
    const sorted = sortRiskAlertsDeterministic(rows);
    expect(sorted.map((row) => row.id)).toEqual([
      'risk-critical-02',
      'risk-critical-01',
      'risk-high-01',
      'risk-low-01',
    ]);
  });

  it('filters by severity, status, provider, and search text', () => {
    const filtered = filterRiskAlerts(rows, {
      severity: 'critical',
      status: 'new',
      provider: 'mock-a',
      search: 'spike',
    });
    expect(filtered.map((row) => row.id)).toEqual(['risk-critical-02']);
  });

  it('applies acknowledge, snooze, suppress transitions with audit note capture', () => {
    let state: RiskAlertSuppressionState = {};
    state = applyRiskAlertSuppressionTransition(state, {
      type: 'acknowledge',
      alertId: 'risk-critical-02',
      note: ' triaged by ops ',
      at: '2026-03-19T10:00:00.000Z',
    });
    state = applyRiskAlertSuppressionTransition(state, {
      type: 'snooze',
      alertId: 'risk-critical-02',
      note: 'waiting for replay',
      at: '2026-03-19T10:10:00.000Z',
      snoozeUntil: '2026-03-19T11:10:00.000Z',
    });
    state = applyRiskAlertSuppressionTransition(state, {
      type: 'suppress',
      alertId: 'risk-critical-02',
      note: 'false positive confirmed',
      at: '2026-03-19T10:20:00.000Z',
    });

    expect(state['risk-critical-02']).toEqual({
      status: 'suppressed',
      note: 'false positive confirmed',
      updatedAt: '2026-03-19T10:20:00.000Z',
      snoozeUntil: null,
      audits: [
        {
          at: '2026-03-19T10:00:00.000Z',
          action: 'acknowledge',
          note: 'triaged by ops',
          snoozeUntil: null,
        },
        {
          at: '2026-03-19T10:10:00.000Z',
          action: 'snooze',
          note: 'waiting for replay',
          snoozeUntil: '2026-03-19T11:10:00.000Z',
        },
        {
          at: '2026-03-19T10:20:00.000Z',
          action: 'suppress',
          note: 'false positive confirmed',
          snoozeUntil: null,
        },
      ],
    });
  });

  it('builds deterministic loading/error/empty/ready view states', () => {
    const loading = buildRiskAlertViewState({
      loading: true,
      error: '',
      itemCount: 0,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });
    const error = buildRiskAlertViewState({
      loading: false,
      error: 'boom',
      itemCount: 0,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });
    const empty = buildRiskAlertViewState({
      loading: false,
      error: '',
      itemCount: 0,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });
    const ready = buildRiskAlertViewState({
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
});
