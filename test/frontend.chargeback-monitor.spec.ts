import {
  buildChargebackQueueCards,
  buildChargebackViewState,
  filterChargebackRows,
  getSettlementChargebackFixture,
  sortChargebackRows,
} from '../frontend/utils/settlementChargebackMonitor';

describe('frontend chargeback monitor helpers', () => {
  it('sorts rows by risk desc then createdAt desc', () => {
    const sorted = sortChargebackRows(getSettlementChargebackFixture('default'));

    expect(sorted.map((row) => row.reference)).toEqual([
      'stl_cb_1002',
      'stl_cb_1001',
      'stl_cb_1005',
      'stl_cb_1003',
      'stl_cb_1004',
    ]);
  });

  it('filters deterministically by risk + status + merchant', () => {
    const sorted = sortChargebackRows(getSettlementChargebackFixture('default'));
    const filtered = filterChargebackRows(sorted, {
      risk: 'critical',
      status: 'queued',
      merchantId: 'alpha',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.reference).toBe('stl_cb_1001');
  });

  it('builds empty and fallback states with deterministic copy', () => {
    const emptyState = buildChargebackViewState({
      loading: false,
      rowsCount: 0,
      fallbackActive: false,
    });

    expect(emptyState.tone).toBe('empty');
    expect(emptyState.message).toContain('No settlement chargebacks');

    const fallbackState = buildChargebackViewState({
      loading: false,
      rowsCount: 5,
      fallbackActive: true,
    });

    expect(fallbackState.tone).toBe('degraded');
    expect(fallbackState.message).toContain('Backend unavailable');
  });

  it('returns error state and supports retry path via default fixture load', () => {
    expect(() => getSettlementChargebackFixture('error')).toThrow('simulated monitor adapter outage');

    const recoveredRows = sortChargebackRows(getSettlementChargebackFixture('default'));
    const state = buildChargebackViewState({
      loading: false,
      rowsCount: recoveredRows.length,
      fallbackActive: false,
    });

    expect(recoveredRows.length).toBeGreaterThan(0);
    expect(state.tone).toBe('ready');
  });

  it('builds queue cards with urgent SLA count excluding resolved rows', () => {
    const sorted = sortChargebackRows(getSettlementChargebackFixture('default'));
    const cards = buildChargebackQueueCards(sorted);

    expect(cards).toEqual([
      { key: 'critical', label: 'Critical', count: 2 },
      { key: 'high', label: 'High', count: 2 },
      { key: 'medium', label: 'Medium', count: 1 },
      { key: 'low', label: 'Low', count: 0 },
      { key: 'urgent_sla', label: 'Urgent SLA', count: 2 },
    ]);
  });
});
