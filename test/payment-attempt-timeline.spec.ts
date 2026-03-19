import {
  buildTimelineViewState,
  clearHandoffBundleDraftSafe,
  filterTimelineEvents,
  getDefaultOperatorHandoffBundleDraft,
  getPaymentAttemptFixture,
  isRefundEligibleEvent,
  moveEvidenceTimelineSelection,
  normalizeEvidenceTimelineEvents,
  normalizeTimelineEvents,
  resolveEvidenceRailShortcut,
  validateOperatorHandoffBundleDraft,
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

  it('filters retry rows deterministically', () => {
    const fixture = getPaymentAttemptFixture('retry_then_success');
    const { rows } = normalizeTimelineEvents(fixture.events);
    const retryRows = filterTimelineEvents(rows, 'retry');

    expect(retryRows).toHaveLength(2);
    expect(retryRows.map((row) => row.id)).toEqual(['ev-106', 'ev-107']);
  });

  it('returns empty result set when filter has no matching rows', () => {
    const fixture = getPaymentAttemptFixture('successful_capture');
    const { rows } = normalizeTimelineEvents(fixture.events);
    const refundEligibleRows = filterTimelineEvents(rows, 'refund-eligible');

    expect(refundEligibleRows).toHaveLength(0);
  });

  it('marks failed terminal events as refund-eligible and excludes recovered failures', () => {
    const terminalFixture = getPaymentAttemptFixture('terminal_failure');
    const { rows: terminalRows } = normalizeTimelineEvents(terminalFixture.events);
    const terminalEligibleRows = terminalRows.filter((row) => isRefundEligibleEvent(row, terminalRows));
    expect(terminalEligibleRows.map((row) => row.id)).toEqual(['ev-206', 'ev-208']);

    const retryFixture = getPaymentAttemptFixture('retry_then_success');
    const { rows: retryRows } = normalizeTimelineEvents(retryFixture.events);
    const retryFailure = retryRows.find((row) => row.id === 'ev-105');
    expect(retryFailure).toBeDefined();
    expect(isRefundEligibleEvent(retryFailure!, retryRows)).toBe(false);
  });

  it('orders evidence rail events deterministically by eventTime, eventType, then id', () => {
    const { rows, malformedCount } = normalizeEvidenceTimelineEvents([
      {
        id: 'e-03',
        eventTime: '2026-03-19T09:01:00.000Z',
        eventType: 'replayed',
        actor: 'ops',
        detail: 'replay',
      },
      {
        id: 'e-01',
        eventTime: '2026-03-19T09:00:00.000Z',
        eventType: 'ready_for_handoff',
        actor: 'ops',
        detail: 'handoff',
      },
      {
        id: 'e-02',
        eventTime: '2026-03-19T09:00:00.000Z',
        eventType: 'annotated',
        actor: 'ops',
        detail: 'annotation',
      },
      {
        id: 'e-04',
        eventTime: 'invalid-date',
        eventType: 'created',
        actor: 'ops',
        detail: 'bad',
      },
      {
        id: 'e-00',
        eventTime: '2026-03-19T09:00:00.000Z',
        eventType: 'annotated',
        actor: 'ops',
        detail: 'annotation first id',
      },
    ]);

    expect(malformedCount).toBe(1);
    expect(rows.map((row) => row.id)).toEqual(['e-00', 'e-02', 'e-01', 'e-03']);
    expect(rows.map((row) => row.railOrderLabel)).toEqual(['RAIL-001', 'RAIL-002', 'RAIL-003', 'RAIL-004']);
  });

  it('resolves evidence rail keyboard shortcuts and cycles next/previous selection', () => {
    expect(resolveEvidenceRailShortcut({ key: 'N' })).toBe('next_event');
    expect(resolveEvidenceRailShortcut({ key: 'p' })).toBe('prev_event');
    expect(resolveEvidenceRailShortcut({ key: 'H' })).toBe('focus_handoff_bundle');
    expect(resolveEvidenceRailShortcut({ key: 'Enter', ctrlKey: true })).toBe('validate_handoff_bundle');
    expect(resolveEvidenceRailShortcut({ key: 'x' })).toBeNull();

    const fixture = getPaymentAttemptFixture('retry_then_success');
    const normalized = normalizeEvidenceTimelineEvents(fixture.evidenceEvents);
    const firstId = normalized.rows[0].id;
    const nextId = moveEvidenceTimelineSelection({
      rows: normalized.rows,
      activeEventId: firstId,
      direction: 'next',
    });
    const previousId = moveEvidenceTimelineSelection({
      rows: normalized.rows,
      activeEventId: firstId,
      direction: 'prev',
    });

    expect(nextId).toBe(normalized.rows[1].id);
    expect(previousId).toBe(normalized.rows[normalized.rows.length - 1].id);
  });

  it('validates handoff bundle and preserves active selection/filter on draft-only reset', () => {
    const incompleteDraft = getDefaultOperatorHandoffBundleDraft();
    const incompleteValidation = validateOperatorHandoffBundleDraft(incompleteDraft);
    expect(incompleteValidation.isComplete).toBe(false);
    expect(incompleteValidation.missingFields).toEqual([
      'branch',
      'fullSha',
      'prLink',
      'blockerOwner',
      'eta',
      'artifactPaths',
    ]);

    const completeValidation = validateOperatorHandoffBundleDraft({
      branch: 'feature/one-247-evidence-rail',
      fullSha: '0123456789abcdef0123456789abcdef01234567',
      mode: 'no_pr',
      prLink: '',
      blockerOwner: 'GitHub Admin',
      eta: '2026-03-20 18:00 UTC',
      artifactPathsText: 'artifacts/frontend/one-247/test-summary.txt\nartifacts/frontend/one-247/screenshot.png',
    });
    expect(completeValidation.isComplete).toBe(true);
    expect(completeValidation.artifactPaths).toEqual([
      'artifacts/frontend/one-247/test-summary.txt',
      'artifacts/frontend/one-247/screenshot.png',
    ]);

    const safeReset = clearHandoffBundleDraftSafe({
      confirmFullReset: false,
      selectedFilter: 'failed',
      activeEvidenceEventId: 'e-102',
    });
    expect(safeReset.didFullReset).toBe(false);
    expect(safeReset.selectedFilter).toBe('failed');
    expect(safeReset.activeEvidenceEventId).toBe('e-102');

    const fullReset = clearHandoffBundleDraftSafe({
      confirmFullReset: true,
      selectedFilter: 'failed',
      activeEvidenceEventId: 'e-102',
    });
    expect(fullReset.didFullReset).toBe(true);
    expect(fullReset.selectedFilter).toBe('all');
    expect(fullReset.activeEvidenceEventId).toBeNull();
  });
});
