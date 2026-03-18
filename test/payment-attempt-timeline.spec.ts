import {
  buildTimelineViewState,
  getPaymentAttemptFixture,
  normalizeTimelineEvents,
} from '../frontend/utils/paymentAttemptTimeline';

describe('payment attempt timeline fixtures', () => {
  it('orders events in ascending timestamp order for success scenario', () => {
    const fixture = getPaymentAttemptFixture('successful_capture');
    const shuffled = [fixture.events[3], fixture.events[0], fixture.events[8], fixture.events[4], fixture.events[1]];
    const { rows, malformedCount } = normalizeTimelineEvents(shuffled);

    expect(malformedCount).toBe(0);
    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.id)).toEqual(['ev-001', 'ev-002', 'ev-004', 'ev-005', 'ev-009']);
    expect(rows.map((row) => row.orderLabel)).toEqual(['EVT-001', 'EVT-002', 'EVT-003', 'EVT-004', 'EVT-005']);
  });

  it('returns empty rows for empty fixture scenario', () => {
    const fixture = getPaymentAttemptFixture('empty');
    const { rows, malformedCount } = normalizeTimelineEvents(fixture.events);

    expect(rows).toHaveLength(0);
    expect(malformedCount).toBe(0);
  });

  it('flags malformed rows and keeps valid timeline rows', () => {
    const fixture = getPaymentAttemptFixture('malformed');
    const { rows, malformedCount } = normalizeTimelineEvents(fixture.events);

    expect(malformedCount).toBe(2);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.id)).toEqual(['ev-301', 'ev-304']);
  });

  it('builds deterministic empty-state hint copy', () => {
    const state = buildTimelineViewState({
      rowsCount: 0,
      malformedCount: 0,
      paymentReference: 'pay_ref',
    });

    expect(state.message).toBe('No attempt events are available for this payment yet.');
    expect(state.recoveryHint).toContain('Switch to Successful Capture or Retry Then Success');
  });

  it('builds deterministic malformed-only fallback copy', () => {
    const state = buildTimelineViewState({
      rowsCount: 0,
      malformedCount: 3,
      paymentReference: 'pay_ref',
    });

    expect(state.message).toBe('Timeline data contains malformed events only.');
    expect(state.recoveryHint).toContain('validate drawer rendering');
  });

  it('builds deterministic error fallback copy', () => {
    const state = buildTimelineViewState({
      rowsCount: 0,
      malformedCount: 0,
      paymentReference: 'pay_ref_001',
      loadErrorMessage: 'network timeout',
    });

    expect(state.message).toBe('Timeline fixture failed to load.');
    expect(state.recoveryHint).toContain('pay_ref_001');
  });
});
