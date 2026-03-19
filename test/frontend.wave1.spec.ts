import {
  applyExplainabilityPresetSlot,
  activateExceptionSavedView,
  applyRefundStatus,
  buildExceptionQueryFromSavedView,
  buildDeterministicExplainabilityFilterChips,
  buildExplainabilityComposerDraftFromSlot,
  buildExceptionBulkPreview,
  applyExceptionQueryPreset,
  applyExceptionActionOptimistic,
  buildExceptionBulkDiffInspector,
  buildExceptionBulkConfirmation,
  buildExceptionActionIdempotencyKey,
  classifyExceptionActionFailure,
  createExceptionSavedView,
  createDefaultExplainabilityPresetSlots,
  DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
  deleteExceptionSavedView,
  DEFAULT_EXCEPTION_QUERY_STATE,
  overwriteExplainabilityPresetSlot,
  pinExceptionSavedView,
  renameExceptionSavedView,
  resetExplainabilityComposerDraftSafe,
  restoreExceptionSavedViewState,
  resolveExplainabilityPresetShortcut,
  serializeExceptionSavedViewState,
  canRefundStatus,
  filterSettlementMerchants,
  filterExceptionSimulationOutcomeRows,
  filterScenarioCompareMatrixRows,
  parseExceptionQueryState,
  normalizeExceptionStatus,
  normalizeOptional,
  moveExceptionDiffInspectorFocus,
  moveOperatorDecisionQueueFocus,
  prependExceptionAudit,
  resetOperatorDecisionQueueDraftSafe,
  resolveActiveExceptionPreset,
  resolveExceptionConflictShortcutDrilldown,
  resolveExceptionDiffInspectorEmptyState,
  resolveOperatorDecisionQueueShortcut,
  serializeExceptionQueryState,
  filterExceptionDiffInspectorRows,
  buildOperatorDecisionQueue,
  buildScenarioCompareMatrix,
  buildExceptionSimulationOutcomePanel,
  buildIncidentBookmarkShelf,
  buildReplayBookmarkCompareStrip,
  buildReplayDeltaInspector,
  buildOperatorTimelineScrubber,
  buildReplayChecklistDrawer,
  cycleOperatorTimelinePreset,
  filterIncidentBookmarkShelfItems,
  moveOperatorTimelineTickSelection,
  moveReplayBookmarkSelection,
  pinOperatorTimelinePresetSlot,
  reconcileReplayBookmarkCompareState,
  resetOperatorTimelineCompareDraftSafe,
  resolveOperatorTimelineShortcut,
  resolveReplayBookmarkCompareShortcut,
  resetReplayBookmarkCompareDraftSafe,
  validateExceptionActionInput,
  moveReplayChecklistFocus,
  resolveReplayChecklistShortcut,
  resetReplayChecklistDrawerDraftSafe,
  swapReplayBookmarkCompareSlots,
  toggleReplayChecklistStep,
  buildReviewQueueLedger,
  filterReviewQueueLedgerRows,
  moveReviewQueueLedgerSelection,
  resolveReviewQueueLedgerShortcut,
  buildReviewQueueHandoffPacketDraftFromLedgerRow,
  buildLineageReplayNavigator,
  validateReviewQueueHandoffPacketDraft,
  validateQaEvidencePacketComposerDraft,
  getDefaultQaEvidencePacketComposerDraft,
  resetReviewQueueHandoffPacketDraftSafe,
  filterLineageReplayNavigatorRows,
  moveLineageReplayNavigatorSelection,
  resolveLineageReplayNavigatorShortcut,
  resetQaEvidencePacketComposerDraftSafe,
  buildReplayDiffInspector,
  buildEvidenceTimelineHeatmap,
  buildChecklistAutofixHints,
  filterReplayDiffInspectorRows,
  moveEvidenceTimelineHeatmapSelection,
  moveReplayDiffInspectorSelection,
  resolveEvidenceTimelineHeatmapShortcut,
  resolveReplayDiffInspectorShortcut,
  getDefaultEvidenceGapChecklistDraft,
  validateEvidenceGapChecklistDraft,
  resetEvidenceGapChecklistDraftSafe,
  buildEvidenceDiffRail,
  moveEvidenceDiffRailSelection,
  resolveEvidenceDiffRailShortcut,
  validateBlockerOwnershipRegisterDraft,
  serializeBlockerOwnershipRegisterDraft,
  resetBlockerOwnershipRegisterDraftSafe,
} from '../frontend/utils/wave1';

describe('frontend wave1 helpers', () => {
  it('allows refund only for PAID rows', () => {
    expect(canRefundStatus('PAID')).toBe(true);
    expect(canRefundStatus('PENDING')).toBe(false);
    expect(canRefundStatus('REFUNDED')).toBe(false);
  });

  it('updates row status to REFUNDED after refund action', () => {
    const rows = [
      { reference: 'ref-1', status: 'PAID' as const, amount: '120.00' },
      { reference: 'ref-2', status: 'PENDING' as const, amount: '90.00' },
    ];

    const updated = applyRefundStatus(rows, 'ref-1');
    expect(updated[0].status).toBe('REFUNDED');
    expect(updated[1].status).toBe('PENDING');
  });

  it('filters settlement rows by merchant when merchant id is provided', () => {
    const rows = [
      {
        merchantId: 'merchant-a',
        paidDepositAmount: 100,
        paidWithdrawAmount: 10,
        refundedAmount: 5,
        netSettledAmount: 85,
        transactionCount: 2,
      },
      {
        merchantId: 'merchant-b',
        paidDepositAmount: 80,
        paidWithdrawAmount: 0,
        refundedAmount: 0,
        netSettledAmount: 80,
        transactionCount: 1,
      },
    ];

    expect(filterSettlementMerchants(rows, 'merchant-a')).toHaveLength(1);
    expect(filterSettlementMerchants(rows, '').length).toBe(2);
  });

  it('validates settlement exception action reason input', () => {
    expect(validateExceptionActionInput('')).toBe('Reason is required.');
    expect(validateExceptionActionInput('ok')).toBe('Reason must be at least 4 characters.');
    expect(validateExceptionActionInput('matched provider reconciliation evidence')).toBeNull();
  });

  it('normalizes optional filter inputs', () => {
    expect(normalizeOptional('  merchant-1  ')).toBe('merchant-1');
    expect(normalizeOptional('   ')).toBeUndefined();
    expect(normalizeOptional(undefined)).toBeUndefined();
  });

  it('applies optimistic status update for resolve/ignore actions', () => {
    const rows = [
      { id: 'exc-1', merchantId: 'm-1', provider: 'mock-a', status: 'open' as const, updatedAt: '2026-03-18T09:00:00.000Z' },
      { id: 'exc-2', merchantId: 'm-2', provider: 'mock-b', status: 'investigating' as const, updatedAt: '2026-03-18T09:00:00.000Z' },
    ];

    const resolved = applyExceptionActionOptimistic(rows, 'exc-1', 'resolve', '2026-03-18T10:00:00.000Z');
    expect(resolved[0].status).toBe('resolved');
    expect(resolved[0].updatedAt).toBe('2026-03-18T10:00:00.000Z');

    const ignored = applyExceptionActionOptimistic(rows, 'exc-2', 'ignore', '2026-03-18T10:05:00.000Z');
    expect(ignored[1].status).toBe('ignored');
    expect(ignored[1].updatedAt).toBe('2026-03-18T10:05:00.000Z');
  });

  it('prepends latest exception audit event', () => {
    const entries = [
      {
        id: 'audit-1',
        action: 'resolve' as const,
        reason: 'already fixed',
        note: null,
        actor: 'ops-1',
        createdAt: '2026-03-18T09:00:00.000Z',
      },
    ];

    const updated = prependExceptionAudit(entries, {
      id: 'audit-2',
      action: 'ignore',
      reason: 'known provider lag',
      note: 'waiting upstream batch',
      actor: 'ops-2',
      createdAt: '2026-03-18T09:01:00.000Z',
    });

    expect(updated[0].id).toBe('audit-2');
    expect(updated).toHaveLength(2);
  });

  it('classifies stale version conflicts as retryable', () => {
    const failure = classifyExceptionActionFailure('Version conflict; refresh and retry with current version');
    expect(failure.kind).toBe('version_conflict');
    expect(failure.retryable).toBe(true);
    expect(failure.userMessage).toContain('updated by another operator');
  });

  it('classifies canonical stale_version conflicts using machine fields', () => {
    const failure = classifyExceptionActionFailure({
      statusCode: 409,
      message: {
        code: 'SETTLEMENT_EXCEPTION_ACTION_CONFLICT',
        reason: 'stale_version',
        retryable: true,
        message: 'Version conflict',
      },
    });
    expect(failure.kind).toBe('version_conflict');
    expect(failure.retryable).toBe(true);
  });

  it('classifies transient action failures as retryable', () => {
    const failure = classifyExceptionActionFailure('Gateway timeout while updating exception action');
    expect(failure.kind).toBe('transient');
    expect(failure.retryable).toBe(true);
    expect(failure.userMessage).toContain('temporary backend issue');
  });

  it('classifies canonical idempotency_in_progress as transient', () => {
    const failure = classifyExceptionActionFailure({
      statusCode: 409,
      message: {
        code: 'SETTLEMENT_EXCEPTION_ACTION_CONFLICT',
        reason: 'idempotency_in_progress',
        retryable: true,
        message: 'in progress',
      },
    });
    expect(failure.kind).toBe('transient');
    expect(failure.retryable).toBe(true);
  });

  it('normalizes uppercase backend exception statuses', () => {
    expect(normalizeExceptionStatus('OPEN')).toBe('open');
    expect(normalizeExceptionStatus('INVESTIGATING')).toBe('investigating');
    expect(normalizeExceptionStatus('RESOLVED')).toBe('resolved');
    expect(normalizeExceptionStatus('IGNORED')).toBe('ignored');
  });

  it('builds deterministic idempotency keys for same exception action payload', () => {
    const input = {
      exceptionId: 'exc-1',
      action: 'resolve' as const,
      reason: 'reconciled with provider report',
      note: 'case-123',
      expectedVersion: 3,
      expectedUpdatedAt: '2026-03-18T10:00:00.000Z',
    };
    const first = buildExceptionActionIdempotencyKey(input);
    const second = buildExceptionActionIdempotencyKey(input);
    expect(first).toBe(second);
    expect(first.startsWith('settlement-action-')).toBe(true);
  });

  it('applies deterministic exception preset filters and marks active preset', () => {
    const state = applyExceptionQueryPreset(
      {
        ...DEFAULT_EXCEPTION_QUERY_STATE,
        merchantId: 'merchant-override',
        status: 'resolved',
      },
      'high_risk_merchant',
    );
    expect(state.merchantId).toBe('merchant-high-risk');
    expect(state.status).toBe('open');
    expect(resolveActiveExceptionPreset(state)).toBe('high_risk_merchant');
  });

  it('builds deterministic explainability chip order for identical input', () => {
    const slot = createDefaultExplainabilityPresetSlots('2026-03-19T00:00:00.000Z')[2];
    const counts = {
      stale_version: 4,
      malformed: 2,
      high_delta: 1,
      mixed_status: 3,
    };
    const first = buildDeterministicExplainabilityFilterChips({ slot, reasonCounts: counts });
    const second = buildDeterministicExplainabilityFilterChips({ slot, reasonCounts: counts });
    expect(first).toEqual(second);
    expect(first.map((chip) => chip.key)).toEqual([
      'slot',
      'severity',
      'reason-stale_version',
      'reason-malformed',
      'reason-high_delta',
      'reason-mixed_status',
    ]);
  });

  it('resolves keyboard shortcuts for explainability apply and overwrite', () => {
    expect(resolveExplainabilityPresetShortcut({
      key: '2',
      altKey: true,
      shiftKey: false,
    })).toEqual({ action: 'apply', slotIndex: 2 });
    expect(resolveExplainabilityPresetShortcut({
      key: '4',
      altKey: true,
      shiftKey: true,
    })).toEqual({ action: 'overwrite', slotIndex: 4 });
    expect(resolveExplainabilityPresetShortcut({
      key: '2',
      altKey: false,
      shiftKey: false,
    })).toBeNull();
  });

  it('keeps applied chips stable after reset-safe draft reset', () => {
    const initialSlots = createDefaultExplainabilityPresetSlots('2026-03-19T00:00:00.000Z');
    const overwrittenSlots = overwriteExplainabilityPresetSlot({
      slots: initialSlots,
      slotIndex: 1,
      draft: {
        name: 'Critical Sweep',
        severityWindow: 'critical',
        reasonBuckets: {
          stale_version: false,
          malformed: true,
          high_delta: true,
          mixed_status: false,
        },
      },
      nowIso: '2026-03-19T00:10:00.000Z',
    });
    const applied = applyExplainabilityPresetSlot({
      slots: overwrittenSlots,
      slotIndex: 1,
      reasonCounts: {
        stale_version: 6,
        malformed: 2,
        high_delta: 3,
        mixed_status: 1,
      },
    });
    const draft = buildExplainabilityComposerDraftFromSlot(overwrittenSlots[0]);
    draft.name = 'Unsaved Local Draft';
    draft.reasonBuckets.stale_version = true;
    const safe = resetExplainabilityComposerDraftSafe({
      slots: overwrittenSlots,
      activeSlotIndex: 1,
      appliedChips: applied.chips,
    });
    expect(safe.draft.name).toBe('Critical Sweep');
    expect(safe.draft.reasonBuckets.stale_version).toBe(false);
    expect(safe.appliedChips).toEqual(applied.chips);
  });

  it('serializes and restores exception query state from URL params', () => {
    const source = {
      ...DEFAULT_EXCEPTION_QUERY_STATE,
      merchantId: 'merchant-77',
      provider: 'mock-a',
      status: 'investigating' as const,
      startDate: '2026-03-10',
      endDate: '2026-03-18',
      page: 3,
      pageSize: 25,
      preset: 'investigating' as const,
    };
    const query = serializeExceptionQueryState(source);
    const parsed = parseExceptionQueryState(query, new Date('2026-03-19T00:00:00.000Z'));
    expect(parsed.recoveryReasons).toHaveLength(0);
    expect(parsed.state.merchantId).toBe('merchant-77');
    expect(parsed.state.provider).toBe('mock-a');
    expect(parsed.state.status).toBe('investigating');
    expect(parsed.state.startDate).toBe('2026-03-10');
    expect(parsed.state.endDate).toBe('2026-03-18');
    expect(parsed.state.page).toBe(3);
    expect(parsed.state.pageSize).toBe(25);
    expect(parsed.state.preset).toBe('');
  });

  it('falls back to default query state for invalid or expired URL params', () => {
    const parsed = parseExceptionQueryState(
      {
        exceptionStatus: 'not-valid',
        exceptionEndDate: '2025-01-01',
        exceptionPage: '-2',
      },
      new Date('2026-03-19T00:00:00.000Z'),
    );
    expect(parsed.recoveryReasons.length).toBeGreaterThan(0);
    expect(parsed.state).toEqual(DEFAULT_EXCEPTION_QUERY_STATE);
  });

  it('builds deterministic bulk preview status and risk counts', () => {
    const preview = buildExceptionBulkPreview([
      { id: 'exc-2', merchantId: 'm-2', provider: 'mock-a', status: 'investigating', mismatchCount: 2 },
      { id: 'exc-1', merchantId: 'm-1', provider: 'mock-a', status: 'open', mismatchCount: 4 },
      { id: 'exc-3', merchantId: 'm-3', provider: 'mock-b', status: 'resolved', mismatchCount: 0 },
    ]);

    expect(preview.selectedCount).toBe(3);
    expect(preview.validCount).toBe(3);
    expect(preview.statusCounts.open).toBe(1);
    expect(preview.statusCounts.investigating).toBe(1);
    expect(preview.statusCounts.resolved).toBe(1);
    expect(preview.riskCounts.high).toBe(1);
    expect(preview.riskCounts.medium).toBe(1);
    expect(preview.riskCounts.low).toBe(1);
    expect(preview.csvPreview).toContain('status_open,1');
    expect(preview.csvPreview).toContain('risk_high,1');
  });

  it('returns empty-selection fallback copy for bulk preview', () => {
    const preview = buildExceptionBulkPreview([]);
    expect(preview.isEmpty).toBe(true);
    expect(preview.warnings).toContain('No exception rows selected.');
    expect(preview.emptyMessage).toContain('Select at least one exception');
  });

  it('adds malformed warning row to deterministic export preview', () => {
    const preview = buildExceptionBulkPreview([
      { id: 'exc-1', merchantId: 'm-1', provider: 'mock-a', status: 'open', mismatchCount: 1 },
      { id: '', merchantId: 'm-2', provider: 'mock-a', status: 'open', mismatchCount: 2 },
      { id: 'exc-3', merchantId: 'm-3', provider: 'mock-b', status: 'ignored', mismatchCount: -1 },
    ]);
    expect(preview.selectedCount).toBe(3);
    expect(preview.validCount).toBe(1);
    expect(preview.malformedCount).toBe(2);
    expect(preview.malformedMessage).toContain('2 malformed row');
    expect(preview.csvPreview).toContain('warning,malformed_rows_present');
  });

  it('builds simulation outcome buckets for success/conflict/rollback projections', () => {
    const panel = buildExceptionSimulationOutcomePanel([
      {
        id: 'exc-safe',
        merchantId: 'm-1',
        provider: 'mock-a',
        status: 'open',
        version: 2,
        currentAmount: 200,
        incomingAmount: 220,
        incomingStatus: 'open',
        incomingVersion: 2,
        mismatchCount: 1,
      },
      {
        id: 'exc-conflict',
        merchantId: 'm-2',
        provider: 'mock-a',
        status: 'open',
        version: 3,
        currentAmount: 210,
        incomingAmount: 215,
        incomingStatus: 'investigating',
        incomingVersion: 2,
        mismatchCount: 1,
      },
      {
        id: 'exc-rollback',
        merchantId: 'm-3',
        provider: 'mock-b',
        status: 'investigating',
        version: 1,
        currentAmount: 100,
        incomingAmount: 260,
        incomingStatus: 'investigating',
        incomingVersion: 1,
        mismatchCount: 2,
      },
    ]);

    expect(panel.contract).toBe('settlement-bulk-simulation-outcome.v1');
    expect(panel.buckets.find((bucket) => bucket.key === 'success_projection')?.count).toBe(1);
    expect(panel.buckets.find((bucket) => bucket.key === 'conflict_projection')?.count).toBe(1);
    expect(panel.buckets.find((bucket) => bucket.key === 'rollback_recommended')?.count).toBe(1);
  });

  it('filters rollback drilldown rows by reason code deterministically', () => {
    const panel = buildExceptionSimulationOutcomePanel([
      {
        id: 'exc-a',
        merchantId: 'm-1',
        provider: 'mock-a',
        status: 'open',
        version: 4,
        currentAmount: 300,
        incomingAmount: 150,
        incomingStatus: 'investigating',
        incomingVersion: 2,
        mismatchCount: 3,
      },
      {
        id: 'exc-b',
        merchantId: 'm-2',
        provider: 'mock-b',
        status: 'open',
        version: 2,
        currentAmount: 140,
        incomingAmount: 150,
        incomingStatus: 'open',
        incomingVersion: 2,
        mismatchCount: 1,
      },
    ]);

    expect(filterExceptionSimulationOutcomeRows(panel.rows, 'HIGH_DELTA_ANOMALY').map((row) => row.id)).toEqual(['exc-a']);
    expect(filterExceptionSimulationOutcomeRows(panel.rows, 'MIXED_STATUS_SELECTION').map((row) => row.id)).toEqual(['exc-a']);
    expect(filterExceptionSimulationOutcomeRows(panel.rows, 'all').map((row) => row.id)).toEqual(['exc-a', 'exc-b']);
  });

  it('returns missing/malformed simulation fallback with deterministic reset label', () => {
    const missing = buildExceptionSimulationOutcomePanel([]);
    expect(missing.fallback.active).toBe(true);
    expect(missing.fallback.title).toBe('Simulation payload missing');
    expect(missing.fallback.resetActionLabel).toBe('Safe Reset Selection');

    const malformed = buildExceptionSimulationOutcomePanel([
      { id: 'exc-1', merchantId: 'm-1', provider: 'mock-a', status: 'open', mismatchCount: 1 },
      { id: '', merchantId: 'm-2', provider: 'mock-a', status: 'open', mismatchCount: 1 },
    ]);
    expect(malformed.fallback.active).toBe(true);
    expect(malformed.fallback.title).toBe('Malformed simulation payload');
    expect(malformed.buckets.find((bucket) => bucket.key === 'rollback_recommended')?.count).toBeGreaterThan(0);
  });

  it('builds deterministic scenario compare matrix ordering for identical fixture input', () => {
    const fixtureRows = [
      {
        id: 'exc-z',
        merchantId: 'm-z',
        provider: 'mock-b',
        status: 'open',
        version: 2,
        currentAmount: 120,
        incomingAmount: 300,
        incomingStatus: 'open',
        incomingVersion: 1,
        mismatchCount: 2,
      },
      {
        id: 'exc-a',
        merchantId: 'm-a',
        provider: 'mock-a',
        status: 'open',
        version: 2,
        currentAmount: 120,
        incomingAmount: 130,
        incomingStatus: 'open',
        incomingVersion: 2,
        mismatchCount: 1,
      },
      { id: '', merchantId: 'm-bad', provider: 'mock-a', status: 'open', mismatchCount: 1 },
    ];

    const first = buildScenarioCompareMatrix(fixtureRows);
    const second = buildScenarioCompareMatrix(fixtureRows);
    expect(first).toEqual(second);
    expect(first.groups.map((group) => group.key)).toEqual([
      'success_projection',
      'conflict_projection',
      'rollback_recommended',
      'unknown_input',
    ]);
    expect(first.rows.map((row) => row.id)).toEqual(['exc-a', 'exc-z', 'unknown-0001']);
    expect(filterScenarioCompareMatrixRows(first.rows, 'rollback_recommended').map((row) => row.id)).toEqual(['exc-z']);
  });

  it('keeps operator decision queue ordering stable and supports keyboard focus movement', () => {
    const matrix = buildScenarioCompareMatrix([
      {
        id: 'exc-2',
        merchantId: 'm-2',
        provider: 'mock-b',
        status: 'open',
        version: 3,
        currentAmount: 100,
        incomingAmount: 260,
        incomingStatus: 'open',
        incomingVersion: 2,
        mismatchCount: 2,
      },
      {
        id: 'exc-1',
        merchantId: 'm-1',
        provider: 'mock-a',
        status: 'open',
        version: 2,
        currentAmount: 110,
        incomingAmount: 120,
        incomingStatus: 'open',
        incomingVersion: 2,
        mismatchCount: 1,
      },
    ]);

    const queue = buildOperatorDecisionQueue({
      matrixRows: matrix.rows,
      stagedRowIds: ['exc-2', 'exc-1', 'exc-2'],
    });
    expect(queue.items.map((item) => item.rowId)).toEqual(['exc-1', 'exc-2']);

    const nextFocused = moveOperatorDecisionQueueFocus({
      items: queue.items,
      activeItemId: queue.items[0].id,
      direction: 'next',
    });
    expect(nextFocused).toBe(queue.items[1].id);
    expect(resolveOperatorDecisionQueueShortcut('ArrowDown')).toBe('next');
    expect(resolveOperatorDecisionQueueShortcut('Backspace')).toBe('unstage');
  });

  it('builds deterministic release digest ordering by lanePriority/updatedAt/id', () => {
    const ledger = buildReviewQueueLedger({
      rows: [
        {
          id: 'inc-3',
          merchantId: 'm-3',
          provider: 'mock-c',
          lanePriority: 'high',
          updatedAt: '2026-03-18T10:00:00.000Z',
        },
        {
          id: 'inc-1',
          merchantId: 'm-1',
          provider: 'mock-a',
          lanePriority: 'critical',
          updatedAt: '2026-03-18T10:05:00.000Z',
        },
        {
          id: 'inc-2',
          merchantId: 'm-2',
          provider: 'mock-b',
          lanePriority: 'high',
          updatedAt: '2026-03-18T10:00:00.000Z',
        },
      ],
      activeRowId: '',
    });

    expect(ledger.contract).toBe('settlement-review-queue-ledger.v1');
    expect(ledger.rows.map((row) => row.id)).toEqual(['inc-1', 'inc-2', 'inc-3']);
    expect(ledger.priorityCounts.critical).toBe(1);
    expect(ledger.priorityCounts.high).toBe(2);
    expect(filterReviewQueueLedgerRows(ledger.rows, 'high').map((row) => row.id)).toEqual(['inc-2', 'inc-3']);
  });

  it('supports release digest keyboard shortcuts for row navigation and packet actions', () => {
    expect(resolveReviewQueueLedgerShortcut({ key: 'j' })).toBe('next_row');
    expect(resolveReviewQueueLedgerShortcut({ key: 'k' })).toBe('prev_row');
    expect(resolveReviewQueueLedgerShortcut({ key: 'P', shiftKey: true })).toBe('focus_handoff_packet');
    expect(resolveReviewQueueLedgerShortcut({
      key: 'Enter',
      shiftKey: true,
      ctrlKey: true,
    })).toBe('validate_handoff_packet');

    const ledger = buildReviewQueueLedger({
      rows: [
        { id: 'inc-1', merchantId: 'm-1', provider: 'mock-a', priority: 'critical', eventTime: '2026-03-18T10:00:00.000Z' },
        { id: 'inc-2', merchantId: 'm-2', provider: 'mock-b', priority: 'high', eventTime: '2026-03-18T10:01:00.000Z' },
      ],
      activeRowId: 'inc-1',
    });
    expect(moveReviewQueueLedgerSelection({
      rows: ledger.rows,
      activeRowId: 'inc-1',
      direction: 'next',
    })).toBe('inc-2');
    expect(moveReviewQueueLedgerSelection({
      rows: ledger.rows,
      activeRowId: 'inc-2',
      direction: 'prev',
    })).toBe('inc-1');
  });

  it('autofills publish packet from active digest row and validates required guardrails', () => {
    const ledger = buildReviewQueueLedger({
      rows: [
        {
          id: 'ONE-248-inc-1',
          merchantId: 'm-1',
          provider: 'mock-a',
          priority: 'critical',
          eventTime: '2026-03-19T01:00:00.000Z',
          title: 'Critical deterministic queue item',
        },
      ],
      activeRowId: '',
    });
    const activeRow = ledger.rows[0] ?? null;
    const draft = buildReviewQueueHandoffPacketDraftFromLedgerRow({
      activeRow,
    });
    const incomplete = validateReviewQueueHandoffPacketDraft(draft);
    expect(incomplete.isComplete).toBe(false);
    expect(incomplete.errors.some((error) => error.includes('placeholder'))).toBe(true);
    expect(draft.artifactPathsText).toContain('artifacts/one-249/release-digest');
    expect(draft.dependentIssueLinksText).toContain('/ONE/issues/ONE-248');
    expect(draft.dependentIssueLinksText).toContain('/ONE/issues/ONE-241');

    const complete = validateReviewQueueHandoffPacketDraft({
      ...draft,
      fullSha: '1234567890abcdef1234567890abcdef12345678',
      blockerOwner: 'DevOps Team',
      eta: '2026-03-20 18:00 UTC',
    });
    expect(complete.isComplete).toBe(true);
    expect(complete.errors).toEqual([]);
    expect(complete.missingFields).toEqual([]);
  });

  it('clears handoff packet draft safely while preserving queue filter/selection unless fully reset', () => {
    const safe = resetReviewQueueHandoffPacketDraftSafe({
      activeFilter: 'high',
      activeRowId: 'inc-2',
      confirmFullReset: false,
    });
    expect(safe.didFullReset).toBe(false);
    expect(safe.activeFilter).toBe('high');
    expect(safe.activeRowId).toBe('inc-2');
    expect(safe.message).toContain('preserved');

    const full = resetReviewQueueHandoffPacketDraftSafe({
      activeFilter: 'high',
      activeRowId: 'inc-2',
      confirmFullReset: true,
    });
    expect(full.didFullReset).toBe(true);
    expect(full.activeFilter).toBe('all');
    expect(full.activeRowId).toBe('');
  });

  it('builds lineage replay navigator rows in deterministic tuple order with stable window metadata', () => {
    const navigator = buildLineageReplayNavigator({
      rows: [
        {
          id: 'node-3',
          lineageDepth: 1,
          sourceTypePriority: 2,
          sourceIssueId: 'ONE-251',
          artifactPath: 'artifacts/one-251/evidence.md',
        },
        {
          id: 'node-2',
          lineageDepth: 0,
          sourceTypePriority: 2,
          sourceIssueId: 'ONE-250',
          artifactPath: '',
        },
        {
          id: 'node-1',
          lineageDepth: 0,
          sourceTypePriority: 1,
          sourceIssueId: 'ONE-253',
          artifactPath: 'artifacts/one-253/lineage.json',
        },
      ],
      cursorVersion: 'cursor-v9',
      windowStart: '2026-03-19T00:15:00Z',
      windowEnd: '2026-03-19T04:00:00Z',
      activeRowId: '',
      activeFilter: 'all',
    });

    expect(navigator.contract).toBe('settlement-lineage-replay-navigator.v1');
    expect(navigator.rows.map((row) => row.id)).toEqual(['node-1', 'node-2', 'node-3']);
    expect(navigator.cursorVersion).toBe('cursor-v9');
    expect(navigator.windowStart).toBe('2026-03-19T00:15:00.000Z');
    expect(navigator.windowEnd).toBe('2026-03-19T04:00:00.000Z');
    expect(filterLineageReplayNavigatorRows(navigator.rows, 'with_artifact').map((row) => row.id))
      .toEqual(['node-1', 'node-3']);
    expect(filterLineageReplayNavigatorRows(navigator.rows, 'without_artifact').map((row) => row.id))
      .toEqual(['node-2']);
  });

  it('supports lineage navigator keyboard workflow for focus, next, previous, and packet validate', () => {
    expect(resolveLineageReplayNavigatorShortcut({ key: 'l', altKey: true })).toBe('focus_lineage_navigator');
    expect(resolveLineageReplayNavigatorShortcut({ key: 'n', altKey: true })).toBe('next_row');
    expect(resolveLineageReplayNavigatorShortcut({ key: 'p', altKey: true })).toBe('prev_row');
    expect(resolveLineageReplayNavigatorShortcut({
      key: 'Enter',
      shiftKey: true,
      ctrlKey: true,
    })).toBe('validate_evidence_packet');

    const navigator = buildLineageReplayNavigator({
      rows: [
        {
          id: 'node-a',
          lineageDepth: 0,
          sourceTypePriority: 1,
          sourceIssueId: 'ONE-253',
          artifactPath: '',
        },
        {
          id: 'node-b',
          lineageDepth: 1,
          sourceTypePriority: 1,
          sourceIssueId: 'ONE-251',
          artifactPath: 'artifacts/one-251/evidence.md',
        },
      ],
      cursorVersion: 'cursor-v1',
      windowStart: '2026-03-19T00:00:00Z',
      windowEnd: '2026-03-19T01:00:00Z',
      activeRowId: 'node-a',
      activeFilter: 'all',
    });

    expect(moveLineageReplayNavigatorSelection({
      rows: navigator.rows,
      activeRowId: 'node-a',
      direction: 'next',
    })).toBe('node-b');
    expect(moveLineageReplayNavigatorSelection({
      rows: navigator.rows,
      activeRowId: 'node-b',
      direction: 'prev',
    })).toBe('node-a');
  });

  it('validates QA evidence packet composer fields and preserves lineage state on safe draft reset', () => {
    const incomplete = validateQaEvidencePacketComposerDraft(getDefaultQaEvidencePacketComposerDraft());
    expect(incomplete.isComplete).toBe(false);
    expect(incomplete.errors.some((error) => error.includes('placeholder'))).toBe(true);
    expect(incomplete.missingFields).toEqual([
      'branch',
      'blockerOwner',
      'eta',
      'testCommandSummary',
      'artifactPaths',
      'dependencyIssueLinks',
    ]);

    const complete = validateQaEvidencePacketComposerDraft({
      branch: 'frontend/one-254-lineage-packet',
      fullSha: '1234567890abcdef1234567890abcdef12345678',
      mode: 'no_pr',
      prLink: '',
      blockerOwner: 'GitHub Admin / DevOps',
      eta: '2026-03-20T18:00:00.000Z',
      testCommandSummary: 'npm run test -- frontend.wave1.spec.ts',
      artifactPathsText: 'artifacts/one-254/test-summary.txt\nartifacts/one-254/lineage-sample.json',
      dependencyIssueLinksText: '/ONE/issues/ONE-253\n/ONE/issues/ONE-250\n/ONE/issues/ONE-251\n/ONE/issues/ONE-241',
    });
    expect(complete.isComplete).toBe(true);
    expect(complete.errors).toEqual([]);
    expect(complete.missingFields).toEqual([]);

    const safeReset = resetQaEvidencePacketComposerDraftSafe({
      activeLineageFilter: 'with_artifact',
      activeReplayRowId: 'node-b',
      confirmFullReset: false,
    });
    expect(safeReset.didFullReset).toBe(false);
    expect(safeReset.activeLineageFilter).toBe('with_artifact');
    expect(safeReset.activeReplayRowId).toBe('node-b');
    expect(safeReset.message).toContain('preserved');

    const fullReset = resetQaEvidencePacketComposerDraftSafe({
      activeLineageFilter: 'with_artifact',
      activeReplayRowId: 'node-b',
      confirmFullReset: true,
    });
    expect(fullReset.didFullReset).toBe(true);
    expect(fullReset.activeLineageFilter).toBe('all');
    expect(fullReset.activeReplayRowId).toBe('');
  });

  it('builds replay diff inspector rows in deterministic tuple order by changeTypePriority, lineageDepth, sourceIssueId, artifactPath', () => {
    const inspector = buildReplayDiffInspector({
      primarySnapshotId: 'snap-a',
      secondarySnapshotId: 'snap-b',
      primaryRows: [
        {
          id: 'row-3',
          lineageDepth: 1,
          sourceIssueId: 'ONE-256',
          artifactPath: 'artifacts/one-256/checklist.md',
          payload: 'old-checklist',
        },
        {
          id: 'row-1',
          lineageDepth: 0,
          sourceIssueId: 'ONE-253',
          artifactPath: 'artifacts/one-253/lineage.json',
          payload: 'same',
        },
        {
          id: 'row-2',
          lineageDepth: 1,
          sourceIssueId: 'ONE-254',
          artifactPath: '',
          payload: 'removed',
        },
      ],
      secondaryRows: [
        {
          id: 'row-1b',
          lineageDepth: 0,
          sourceIssueId: 'ONE-253',
          artifactPath: 'artifacts/one-253/lineage.json',
          payload: 'same',
        },
        {
          id: 'row-4',
          lineageDepth: 0,
          sourceIssueId: 'ONE-255',
          artifactPath: 'artifacts/one-255/diff.json',
          payload: 'added',
        },
        {
          id: 'row-3b',
          lineageDepth: 1,
          sourceIssueId: 'ONE-256',
          artifactPath: 'artifacts/one-256/checklist.md',
          payload: 'new-checklist',
        },
      ],
      activeRowId: '',
      activeFilter: 'all',
    });

    expect(inspector.contract).toBe('settlement-replay-diff-inspector.v1');
    expect(inspector.rows.map((row) => row.changeType)).toEqual(['added', 'removed', 'modified']);
    expect(inspector.rows.map((row) => row.id)).toEqual([
      'added|0|ONE-255|artifacts/one-255/diff.json',
      'removed|1|ONE-254|',
      'modified|1|ONE-256|artifacts/one-256/checklist.md',
    ]);
    expect(filterReplayDiffInspectorRows(inspector.rows, 'modified').map((row) => row.id))
      .toEqual(['modified|1|ONE-256|artifacts/one-256/checklist.md']);
  });

  it('supports replay diff inspector keyboard workflow for focus, next, previous, and checklist validate', () => {
    expect(resolveReplayDiffInspectorShortcut({ key: 'd', altKey: true })).toBe('focus_diff_inspector');
    expect(resolveReplayDiffInspectorShortcut({ key: 'ArrowRight', altKey: true })).toBe('next_row');
    expect(resolveReplayDiffInspectorShortcut({ key: 'ArrowLeft', altKey: true })).toBe('prev_row');
    expect(resolveReplayDiffInspectorShortcut({
      key: 'Enter',
      shiftKey: true,
      ctrlKey: true,
    })).toBe('validate_checklist');

    const inspector = buildReplayDiffInspector({
      primarySnapshotId: 'snap-a',
      secondarySnapshotId: 'snap-b',
      primaryRows: [
        {
          id: 'row-1',
          lineageDepth: 0,
          sourceIssueId: 'ONE-253',
          artifactPath: '',
          payload: 'old-a',
        },
      ],
      secondaryRows: [
        {
          id: 'row-1b',
          lineageDepth: 0,
          sourceIssueId: 'ONE-253',
          artifactPath: '',
          payload: 'new-a',
        },
        {
          id: 'row-2',
          lineageDepth: 1,
          sourceIssueId: 'ONE-255',
          artifactPath: 'artifacts/one-255/new.md',
          payload: 'added',
        },
      ],
      activeRowId: '',
      activeFilter: 'all',
    });
    expect(moveReplayDiffInspectorSelection({
      rows: inspector.rows,
      activeRowId: inspector.rows[0].id,
      direction: 'next',
    })).toBe(inspector.rows[1].id);
    expect(moveReplayDiffInspectorSelection({
      rows: inspector.rows,
      activeRowId: inspector.rows[1].id,
      direction: 'prev',
    })).toBe(inspector.rows[0].id);
  });

  it('builds evidence timeline heatmap rows in deterministic tuple order by lanePriority, missingFieldPriority, issueIdentifier, updatedAt', () => {
    const heatmap = buildEvidenceTimelineHeatmap({
      rows: [
        {
          id: 'row-b',
          lanePriority: 'high',
          missingFieldCode: 'MISSING_TEST_COMMAND',
          issueIdentifier: 'ONE-258',
          updatedAt: '2026-03-19T05:10:00.000Z',
        },
        {
          id: 'row-a',
          lanePriority: 'critical',
          missingFieldCode: 'MISSING_BRANCH',
          issueIdentifier: 'ONE-257',
          updatedAt: '2026-03-19T05:09:00.000Z',
        },
        {
          id: 'row-c',
          lanePriority: 'high',
          missingFieldCode: 'MISSING_PR_LINK',
          issueIdentifier: 'ONE-256',
          updatedAt: '2026-03-19T05:08:00.000Z',
        },
      ],
      activeLane: 'all',
      activeRowId: '',
    });

    expect(heatmap.contract).toBe('settlement-evidence-timeline-heatmap.v1');
    expect(heatmap.rows.map((row) => row.id)).toEqual(['row-a', 'row-c', 'row-b']);
    expect(heatmap.rows.map((row) => row.lanePriority)).toEqual(['critical', 'high', 'high']);
  });

  it('supports evidence timeline heatmap keyboard workflow for focus, next, previous, and checklist validate', () => {
    expect(resolveEvidenceTimelineHeatmapShortcut({ key: 'h', altKey: true })).toBe('focus_heatmap');
    expect(resolveEvidenceTimelineHeatmapShortcut({ key: 'ArrowDown', altKey: true })).toBe('next_gap_row');
    expect(resolveEvidenceTimelineHeatmapShortcut({ key: 'ArrowUp', altKey: true })).toBe('prev_gap_row');
    expect(resolveEvidenceTimelineHeatmapShortcut({
      key: 'Enter',
      shiftKey: true,
      ctrlKey: true,
    })).toBe('validate_checklist');

    const heatmap = buildEvidenceTimelineHeatmap({
      rows: [
        {
          id: 'row-a',
          lanePriority: 'critical',
          missingFieldCode: 'MISSING_BRANCH',
          issueIdentifier: 'ONE-257',
          updatedAt: '2026-03-19T05:09:00.000Z',
        },
        {
          id: 'row-b',
          lanePriority: 'high',
          missingFieldCode: 'MISSING_TEST_COMMAND',
          issueIdentifier: 'ONE-258',
          updatedAt: '2026-03-19T05:10:00.000Z',
        },
      ],
      activeLane: 'all',
      activeRowId: '',
    });
    expect(moveEvidenceTimelineHeatmapSelection({
      rows: heatmap.rows,
      activeRowId: heatmap.rows[0].id,
      direction: 'next_gap_row',
    })).toBe(heatmap.rows[1].id);
    expect(moveEvidenceTimelineHeatmapSelection({
      rows: heatmap.rows,
      activeRowId: heatmap.rows[1].id,
      direction: 'prev_gap_row',
    })).toBe(heatmap.rows[0].id);

    const hints = buildChecklistAutofixHints();
    expect(hints.map((hint) => hint.code)).toEqual([
      'MISSING_BRANCH',
      'MISSING_FULL_SHA',
      'MISSING_PR_LINK',
      'MISSING_TEST_COMMAND',
      'MISSING_ARTIFACT_PATH',
      'MISSING_BLOCKER_OWNER',
      'MISSING_BLOCKER_ETA',
    ]);
  });

  it('validates evidence-gap checklist fields and preserves diff filter + selected pair on safe reset', () => {
    const incomplete = validateEvidenceGapChecklistDraft(getDefaultEvidenceGapChecklistDraft());
    expect(incomplete.isComplete).toBe(false);
    expect(incomplete.errors.some((error) => error.includes('placeholder'))).toBe(true);
    expect(incomplete.missingFields).toEqual([
      'branch',
      'blockerOwner',
      'eta',
      'missingArtifactPaths',
      'dependencyIssueLinks',
    ]);

    const complete = validateEvidenceGapChecklistDraft({
      branch: 'frontend/one-255-replay-diff',
      fullSha: '1234567890abcdef1234567890abcdef12345678',
      mode: 'no_pr',
      prLink: '',
      blockerOwner: 'GitHub Admin / DevOps',
      eta: '2026-03-20T18:00:00.000Z',
      missingArtifactPathsText: 'artifacts/one-255/replay-diff-inspector.json',
      dependencyIssueLinksText: '/ONE/issues/ONE-253\n/ONE/issues/ONE-254\n/ONE/issues/ONE-241',
    });
    expect(complete.isComplete).toBe(true);
    expect(complete.errors).toEqual([]);
    expect(complete.missingFields).toEqual([]);

    const safeReset = resetEvidenceGapChecklistDraftSafe({
      activeDiffFilter: 'modified',
      primarySnapshotId: 'snap-a',
      secondarySnapshotId: 'snap-b',
      activeHeatmapLane: 'high',
      activeHeatmapRowId: 'gap-row-1',
      confirmFullReset: false,
    });
    expect(safeReset.didFullReset).toBe(false);
    expect(safeReset.activeDiffFilter).toBe('modified');
    expect(safeReset.primarySnapshotId).toBe('snap-a');
    expect(safeReset.secondarySnapshotId).toBe('snap-b');
    expect(safeReset.activeHeatmapLane).toBe('high');
    expect(safeReset.activeHeatmapRowId).toBe('gap-row-1');
    expect(safeReset.message).toContain('preserved');

    const fullReset = resetEvidenceGapChecklistDraftSafe({
      activeDiffFilter: 'modified',
      primarySnapshotId: 'snap-a',
      secondarySnapshotId: 'snap-b',
      activeHeatmapLane: 'high',
      activeHeatmapRowId: 'gap-row-1',
      confirmFullReset: true,
    });
    expect(fullReset.didFullReset).toBe(true);
    expect(fullReset.activeDiffFilter).toBe('all');
    expect(fullReset.primarySnapshotId).toBe('');
    expect(fullReset.secondarySnapshotId).toBe('');
    expect(fullReset.activeHeatmapLane).toBe('all');
    expect(fullReset.activeHeatmapRowId).toBe('');
  });

  it('builds deterministic evidence diff rail ordering by sectionPriority/fieldKey/id', () => {
    const rail = buildEvidenceDiffRail({
      currentPacket: [
        { id: 'row-3', sectionPriority: 3, fieldKey: 'eta', value: '2026-03-21T09:00:00.000Z' },
        { id: 'row-1', sectionPriority: 1, fieldKey: 'owner', value: 'Platform Team' },
        { id: 'row-2', sectionPriority: 1, fieldKey: 'dependency', value: '/ONE/issues/ONE-248' },
      ],
      previousPacket: [
        { id: 'row-3', sectionPriority: 3, fieldKey: 'eta', value: '2026-03-20T09:00:00.000Z' },
        { id: 'row-1', sectionPriority: 1, fieldKey: 'owner', value: 'Platform Team' },
        { id: 'row-2', sectionPriority: 1, fieldKey: 'dependency', value: '/ONE/issues/ONE-242' },
      ],
      activeRowId: '',
      activeFilter: 'all',
    });

    expect(rail.contract).toBe('settlement-evidence-diff-rail.v1');
    expect(rail.rows.map((row) => row.id)).toEqual(['row-2', 'row-1', 'row-3']);
    expect(rail.changedCount).toBe(2);
    expect(rail.unchangedCount).toBe(1);
  });

  it('supports evidence diff keyboard workflow for navigation and blocker register actions', () => {
    expect(resolveEvidenceDiffRailShortcut({ key: 'j', altKey: true })).toBe('next_row');
    expect(resolveEvidenceDiffRailShortcut({ key: 'k', altKey: true })).toBe('prev_row');
    expect(resolveEvidenceDiffRailShortcut({ key: 'B', shiftKey: true })).toBe('focus_blocker_register');
    expect(resolveEvidenceDiffRailShortcut({
      key: 'Enter',
      shiftKey: true,
      ctrlKey: true,
    })).toBe('validate_blocker_register');

    const rail = buildEvidenceDiffRail({
      currentPacket: [
        { id: 'row-1', sectionPriority: 1, fieldKey: 'owner', value: 'Ops' },
        { id: 'row-2', sectionPriority: 2, fieldKey: 'eta', value: '2026-03-21T09:00:00.000Z' },
      ],
      previousPacket: [
        { id: 'row-1', sectionPriority: 1, fieldKey: 'owner', value: 'Ops' },
        { id: 'row-2', sectionPriority: 2, fieldKey: 'eta', value: '2026-03-20T09:00:00.000Z' },
      ],
      activeRowId: 'row-1',
      activeFilter: 'all',
    });
    expect(moveEvidenceDiffRailSelection({
      rows: rail.rows,
      activeRowId: 'row-1',
      direction: 'next',
    })).toBe('row-2');
    expect(moveEvidenceDiffRailSelection({
      rows: rail.rows,
      activeRowId: 'row-2',
      direction: 'prev',
    })).toBe('row-1');
  });

  it('validates blocker register required fields and preserves diff state on safe reset', () => {
    const incomplete = validateBlockerOwnershipRegisterDraft({
      blockerOwner: '',
      eta: '',
      dependencyIssueLinksText: '',
      retryTimestamp: '',
      note: 'Follow up after publish credential restore.',
    });
    expect(incomplete.isComplete).toBe(false);
    expect(incomplete.missingFields).toEqual([
      'blockerOwner',
      'eta',
      'retryTimestamp',
      'dependencyIssueLinks',
    ]);

    const complete = validateBlockerOwnershipRegisterDraft({
      blockerOwner: 'GitHub Admin / DevOps',
      eta: '2026-03-20T18:00:00.000Z',
      dependencyIssueLinksText: '/ONE/issues/ONE-248\n/ONE/issues/ONE-241',
      retryTimestamp: '2026-03-20T17:30:00.000Z',
      note: 'Credentials pending rotation.',
    });
    expect(complete.isComplete).toBe(true);
    expect(complete.errors).toEqual([]);
    expect(complete.dependencyIssueLinks).toEqual(['/ONE/issues/ONE-241', '/ONE/issues/ONE-248']);

    const serializedFirst = serializeBlockerOwnershipRegisterDraft({
      blockerOwner: 'GitHub Admin / DevOps',
      eta: '2026-03-20T18:00:00.000Z',
      dependencyIssueLinksText: '/ONE/issues/ONE-248\n/ONE/issues/ONE-241',
      retryTimestamp: '2026-03-20T17:30:00.000Z',
      note: 'Credentials pending rotation.',
    });
    const serializedSecond = serializeBlockerOwnershipRegisterDraft({
      blockerOwner: 'GitHub Admin / DevOps',
      eta: '2026-03-20T18:00:00.000Z',
      dependencyIssueLinksText: '/ONE/issues/ONE-241\n/ONE/issues/ONE-248',
      retryTimestamp: '2026-03-20T17:30:00.000Z',
      note: 'Credentials pending rotation.',
    });
    expect(serializedFirst).toBe(serializedSecond);

    const safeReset = resetBlockerOwnershipRegisterDraftSafe({
      activeDiffFilter: 'changed',
      activeDiffRowId: 'row-2',
      confirmFullReset: false,
    });
    expect(safeReset.didFullReset).toBe(false);
    expect(safeReset.activeDiffFilter).toBe('changed');
    expect(safeReset.activeDiffRowId).toBe('row-2');
    expect(safeReset.message).toContain('preserved');

    const fullReset = resetBlockerOwnershipRegisterDraftSafe({
      activeDiffFilter: 'changed',
      activeDiffRowId: 'row-2',
      confirmFullReset: true,
    });
    expect(fullReset.didFullReset).toBe(true);
    expect(fullReset.activeDiffFilter).toBe('all');
    expect(fullReset.activeDiffRowId).toBe('');
  });

  it('builds deterministic bookmark shelf ordering by severity, updatedAt, and id', () => {
    const shelf = buildIncidentBookmarkShelf([
      {
        id: 'inc-03',
        merchantId: 'm-3',
        provider: 'mock-b',
        severity: 'high',
        updatedAt: '2026-03-18T10:00:00.000Z',
        title: 'Batch latency spike',
      },
      {
        id: 'inc-01',
        merchantId: 'm-1',
        provider: 'mock-a',
        severity: 'critical',
        updatedAt: '2026-03-18T08:00:00.000Z',
        title: 'Replay dead-letter queue pressure',
      },
      {
        id: 'inc-02',
        merchantId: 'm-2',
        provider: 'mock-a',
        severity: 'high',
        updatedAt: '2026-03-18T10:00:00.000Z',
        title: 'Idempotency drift',
      },
      {
        id: '',
        merchantId: 'm-bad',
        provider: 'mock-a',
        severity: 'low',
        updatedAt: '2026-03-18T10:00:00.000Z',
      },
    ]);

    expect(shelf.contract).toBe('settlement-incident-bookmark-shelf.v1');
    expect(shelf.items.map((item) => item.id)).toEqual(['inc-01', 'inc-02', 'inc-03']);
    expect(shelf.severityCounts.critical).toBe(1);
    expect(shelf.severityCounts.high).toBe(2);
    expect(shelf.totalCount).toBe(3);
  });

  it('supports replay checklist drawer keyboard navigation and step toggle behavior', () => {
    const shelf = buildIncidentBookmarkShelf([
      {
        id: 'inc-01',
        merchantId: 'm-1',
        provider: 'mock-a',
        severity: 'critical',
        updatedAt: '2026-03-18T08:00:00.000Z',
        title: 'Replay dead-letter queue pressure',
      },
    ]);
    const drawer = buildReplayChecklistDrawer({
      shelfItems: shelf.items,
      activeBookmarkId: 'inc-01',
      completedStepIds: ['load_context'],
      noteDraft: 'Confirm dry-run sample.',
    });

    expect(drawer.bookmark?.id).toBe('inc-01');
    expect(drawer.steps[0].completed).toBe(true);
    const focusedNext = moveReplayChecklistFocus({
      steps: drawer.steps,
      activeStepId: drawer.focusedStepId,
      direction: 'next',
    });
    expect(focusedNext).toBe('verify_determinism');
    expect(resolveReplayChecklistShortcut('ArrowDown')).toBe('focus_next');
    expect(resolveReplayChecklistShortcut('ArrowUp')).toBe('focus_prev');
    expect(resolveReplayChecklistShortcut('Enter')).toBe('toggle_step');
    expect(resolveReplayChecklistShortcut('Backspace')).toBe('clear_note');

    const toggled = toggleReplayChecklistStep({
      steps: drawer.steps,
      stepId: focusedNext,
    });
    expect(toggled.find((step) => step.id === 'verify_determinism')?.completed).toBe(true);
  });

  it('clears replay checklist draft safely while preserving bookmark filter unless full reset is confirmed', () => {
    const safe = resetReplayChecklistDrawerDraftSafe({
      activeBookmarkFilter: 'high',
      confirmFilterReset: false,
    });
    expect(safe.completedStepIds).toEqual([]);
    expect(safe.noteDraft).toBe('');
    expect(safe.activeBookmarkFilter).toBe('high');
    expect(safe.message).toContain('preserved');

    const confirmed = resetReplayChecklistDrawerDraftSafe({
      activeBookmarkFilter: 'high',
      confirmFilterReset: true,
    });
    expect(confirmed.completedStepIds).toEqual([]);
    expect(confirmed.noteDraft).toBe('');
    expect(confirmed.activeBookmarkFilter).toBe('all');
    expect(confirmed.message).toContain('reset to default');
  });

  it('builds deterministic replay bookmark compare strip state for identical fixture payloads', () => {
    const shelf = buildIncidentBookmarkShelf([
      {
        id: 'inc-02',
        merchantId: 'm-2',
        provider: 'mock-a',
        severity: 'high',
        updatedAt: '2026-03-18T10:00:00.000Z',
        title: 'Idempotency drift',
        status: 'investigating',
        currentAmount: 220,
        incomingAmount: 380,
        mismatchCount: 3,
      },
      {
        id: 'inc-01',
        merchantId: 'm-1',
        provider: 'mock-b',
        severity: 'critical',
        updatedAt: '2026-03-18T11:00:00.000Z',
        title: 'Replay dead-letter queue pressure',
        status: 'open',
        currentAmount: 120,
        riskFlags: ['stale_version'],
      },
      {
        id: 'inc-03',
        merchantId: 'm-3',
        provider: 'mock-b',
        severity: 'low',
        updatedAt: '2026-03-18T08:00:00.000Z',
        title: 'Late callback batch',
      },
    ]);
    const filtered = filterIncidentBookmarkShelfItems(shelf.items, 'all');
    const resolved = reconcileReplayBookmarkCompareState({
      items: filtered,
      activeBookmarkId: '',
      primaryBookmarkId: '',
      secondaryBookmarkId: '',
    });
    const first = buildReplayBookmarkCompareStrip({
      items: filtered,
      activeBookmarkId: resolved.activeBookmarkId,
      primaryBookmarkId: resolved.primaryBookmarkId,
      secondaryBookmarkId: resolved.secondaryBookmarkId,
    });
    const second = buildReplayBookmarkCompareStrip({
      items: filtered,
      activeBookmarkId: resolved.activeBookmarkId,
      primaryBookmarkId: resolved.primaryBookmarkId,
      secondaryBookmarkId: resolved.secondaryBookmarkId,
    });
    expect(first).toEqual(second);
    expect(first.canCompare).toBe(true);
    expect(first.primaryBookmark?.id).toBe('inc-01');
    expect(first.secondaryBookmark?.id).toBe('inc-02');
  });

  it('supports replay compare keyboard shortcuts for previous/next selection, swap, and clear draft', () => {
    const shelf = buildIncidentBookmarkShelf([
      {
        id: 'inc-01',
        merchantId: 'm-1',
        provider: 'mock-a',
        severity: 'critical',
        updatedAt: '2026-03-18T11:00:00.000Z',
        title: 'Critical mismatch',
      },
      {
        id: 'inc-02',
        merchantId: 'm-2',
        provider: 'mock-a',
        severity: 'high',
        updatedAt: '2026-03-18T10:00:00.000Z',
        title: 'High mismatch',
      },
      {
        id: 'inc-03',
        merchantId: 'm-3',
        provider: 'mock-b',
        severity: 'medium',
        updatedAt: '2026-03-18T09:00:00.000Z',
        title: 'Medium mismatch',
      },
    ]);
    expect(resolveReplayBookmarkCompareShortcut('[')).toBe('select_prev');
    expect(resolveReplayBookmarkCompareShortcut(']')).toBe('select_next');
    expect(resolveReplayBookmarkCompareShortcut('S')).toBe('swap');
    expect(resolveReplayBookmarkCompareShortcut('Escape')).toBe('clear_draft');

    expect(moveReplayBookmarkSelection({
      items: shelf.items,
      activeBookmarkId: 'inc-02',
      direction: 'prev',
    })).toBe('inc-01');
    expect(moveReplayBookmarkSelection({
      items: shelf.items,
      activeBookmarkId: 'inc-02',
      direction: 'next',
    })).toBe('inc-03');
    expect(swapReplayBookmarkCompareSlots({
      primaryBookmarkId: 'inc-01',
      secondaryBookmarkId: 'inc-02',
    })).toEqual({
      primaryBookmarkId: 'inc-02',
      secondaryBookmarkId: 'inc-01',
    });
  });

  it('preserves bookmark filter on safe replay compare reset unless full reset is confirmed', () => {
    const safe = resetReplayBookmarkCompareDraftSafe({
      activeBookmarkFilter: 'high',
      confirmFilterReset: false,
    });
    expect(safe.primaryBookmarkId).toBe('');
    expect(safe.secondaryBookmarkId).toBe('');
    expect(safe.activeBookmarkFilter).toBe('high');
    expect(safe.message).toContain('preserved');

    const confirmed = resetReplayBookmarkCompareDraftSafe({
      activeBookmarkFilter: 'high',
      confirmFilterReset: true,
    });
    expect(confirmed.primaryBookmarkId).toBe('');
    expect(confirmed.secondaryBookmarkId).toBe('');
    expect(confirmed.activeBookmarkFilter).toBe('all');
    expect(confirmed.message).toContain('reset to default');
  });

  it('builds operator timeline ticks in deterministic eventAt/severity/id order with stable snapshots', () => {
    const shelf = buildIncidentBookmarkShelf([
      {
        id: 'inc-c',
        merchantId: 'm-3',
        provider: 'mock-a',
        severity: 'high',
        updatedAt: '2026-03-18T10:00:00.000Z',
        title: 'C',
        riskFlags: ['stale_version', 'high_delta'],
      },
      {
        id: 'inc-a',
        merchantId: 'm-1',
        provider: 'mock-b',
        severity: 'critical',
        updatedAt: '2026-03-18T09:00:00.000Z',
        title: 'A',
        riskFlags: ['high_delta', 'stale_version'],
      },
      {
        id: 'inc-b',
        merchantId: 'm-2',
        provider: 'mock-a',
        severity: 'critical',
        updatedAt: '2026-03-18T10:00:00.000Z',
        title: 'B',
      },
    ]);

    const first = buildOperatorTimelineScrubber({
      items: shelf.items,
      activeTickId: '',
      activePreset: 'baseline',
      baselineTickId: '',
      candidateTickId: 'inc-c',
      overrideTickId: '',
    });
    const second = buildOperatorTimelineScrubber({
      items: shelf.items,
      activeTickId: '',
      activePreset: 'baseline',
      baselineTickId: '',
      candidateTickId: 'inc-c',
      overrideTickId: '',
    });

    expect(first.ticks.map((tick) => tick.id)).toEqual(['inc-a', 'inc-b', 'inc-c']);
    expect(first.compareSlots.find((slot) => slot.key === 'candidate')?.serializedSnapshot)
      .toBe(second.compareSlots.find((slot) => slot.key === 'candidate')?.serializedSnapshot);
  });

  it('resolves operator timeline keyboard shortcuts and supports preset cycle + override pinning', () => {
    expect(resolveOperatorTimelineShortcut({ key: ',' })).toBe('tick_prev');
    expect(resolveOperatorTimelineShortcut({ key: '.' })).toBe('tick_next');
    expect(resolveOperatorTimelineShortcut({ key: 'P', shiftKey: false })).toBe('cycle_preset');
    expect(resolveOperatorTimelineShortcut({ key: 'P', shiftKey: true })).toBe('pin_override');
    expect(resolveOperatorTimelineShortcut({ key: 'Escape' })).toBe('clear_draft');

    expect(cycleOperatorTimelinePreset('baseline')).toBe('candidate');
    expect(cycleOperatorTimelinePreset('candidate')).toBe('override');
    expect(cycleOperatorTimelinePreset('override')).toBe('baseline');

    expect(moveOperatorTimelineTickSelection({
      ticks: [
        {
          id: 'inc-a',
          eventAt: '2026-03-18T09:00:00.000Z',
          severity: 'critical',
          title: 'A',
          bookmark: {
            id: 'inc-a',
            merchantId: 'm-1',
            provider: 'mock-a',
            severity: 'critical',
            updatedAt: '2026-03-18T09:00:00.000Z',
            title: 'A',
            status: 'open',
            amount: 100,
            riskFlags: [],
          },
        },
        {
          id: 'inc-b',
          eventAt: '2026-03-18T10:00:00.000Z',
          severity: 'high',
          title: 'B',
          bookmark: {
            id: 'inc-b',
            merchantId: 'm-2',
            provider: 'mock-a',
            severity: 'high',
            updatedAt: '2026-03-18T10:00:00.000Z',
            title: 'B',
            status: 'open',
            amount: 120,
            riskFlags: [],
          },
        },
      ],
      activeTickId: 'inc-a',
      direction: 'next',
    })).toBe('inc-b');

    expect(pinOperatorTimelinePresetSlot({
      activePreset: 'candidate',
      activeTickId: 'inc-b',
      baselineTickId: 'inc-a',
      candidateTickId: '',
      overrideTickId: '',
    })).toEqual({
      baselineTickId: 'inc-a',
      candidateTickId: 'inc-b',
      overrideTickId: '',
    });
  });

  it('clears operator timeline compare draft safely without dropping severity filter', () => {
    const safe = resetOperatorTimelineCompareDraftSafe({
      activeSeverityFilter: 'high',
      baselineTickId: 'inc-a',
      confirmFilterReset: false,
    });
    expect(safe.baselineTickId).toBe('inc-a');
    expect(safe.candidateTickId).toBe('');
    expect(safe.overrideTickId).toBe('');
    expect(safe.activeSeverityFilter).toBe('high');
    expect(safe.message).toContain('preserved');

    const confirmed = resetOperatorTimelineCompareDraftSafe({
      activeSeverityFilter: 'high',
      baselineTickId: 'inc-a',
      confirmFilterReset: true,
    });
    expect(confirmed.activeSeverityFilter).toBe('all');
    expect(confirmed.message).toContain('reset');
  });

  it('builds replay delta inspector rows in deterministic field order', () => {
    const shelf = buildIncidentBookmarkShelf([
      {
        id: 'inc-a',
        merchantId: 'm-1',
        provider: 'mock-a',
        severity: 'critical',
        updatedAt: '2026-03-18T10:00:00.000Z',
        title: 'Replay A',
        status: 'open',
        currentAmount: 120,
        riskFlags: ['stale_version'],
      },
      {
        id: 'inc-b',
        merchantId: 'm-1',
        provider: 'mock-a',
        severity: 'high',
        updatedAt: '2026-03-18T10:05:00.000Z',
        title: 'Replay B',
        status: 'investigating',
        currentAmount: 280,
        riskFlags: ['high_delta', 'stale_version'],
      },
    ]);
    const inspector = buildReplayDeltaInspector({
      items: shelf.items,
      primaryBookmarkId: 'inc-a',
      secondaryBookmarkId: 'inc-b',
    });
    expect(inspector.canCompare).toBe(true);
    expect(inspector.rows.map((row) => row.field)).toEqual(['status', 'amount', 'riskFlags', 'updatedAt']);
    expect(inspector.rows.find((row) => row.field === 'amount')?.changed).toBe(true);
  });

  it('resets queue draft safely while preserving matrix filter until explicit confirmation', () => {
    const safe = resetOperatorDecisionQueueDraftSafe({
      activeMatrixFilter: 'conflict_projection',
      confirmFilterReset: false,
    });
    expect(safe.stagedRowIds).toEqual([]);
    expect(safe.activeMatrixFilter).toBe('conflict_projection');
    expect(safe.message).toContain('preserved');

    const confirmed = resetOperatorDecisionQueueDraftSafe({
      activeMatrixFilter: 'conflict_projection',
      confirmFilterReset: true,
    });
    expect(confirmed.stagedRowIds).toEqual([]);
    expect(confirmed.activeMatrixFilter).toBe('all');
    expect(confirmed.message).toContain('reset to default');
  });

  it('builds deterministic bulk confirmation summary for render state', () => {
    const preview = buildExceptionBulkPreview([
      { id: 'exc-1', merchantId: 'm-1', provider: 'mock-a', status: 'open', mismatchCount: 4 },
      { id: 'exc-2', merchantId: 'm-2', provider: 'mock-a', status: 'investigating', mismatchCount: 1 },
    ]);
    const confirmation = buildExceptionBulkConfirmation({
      action: 'resolve',
      preview,
      staleSelectionCount: 0,
    });
    expect(confirmation.canConfirm).toBe(true);
    expect(confirmation.validCount).toBe(2);
    expect(confirmation.statusCounts.open).toBe(1);
    expect(confirmation.statusCounts.investigating).toBe(1);
    expect(confirmation.riskCounts.high).toBe(1);
    expect(confirmation.riskCounts.medium).toBe(1);
  });

  it('emits deterministic rollback hint when malformed rows are in preview', () => {
    const preview = buildExceptionBulkPreview([
      { id: 'exc-1', merchantId: 'm-1', provider: 'mock-a', status: 'open', mismatchCount: 1 },
      { id: '', merchantId: 'm-2', provider: 'mock-a', status: 'open', mismatchCount: 1 },
    ]);
    const confirmation = buildExceptionBulkConfirmation({
      action: 'ignore',
      preview,
      staleSelectionCount: 0,
    });
    expect(confirmation.needsRollbackHint).toBe(true);
    expect(confirmation.rollbackHint).toContain('Rollback hint');
    expect(confirmation.canConfirm).toBe(false);
  });

  it('returns explicit stale/no-selection fallback for safe reset UX', () => {
    const preview = buildExceptionBulkPreview([]);
    const staleFallback = buildExceptionBulkConfirmation({
      action: 'resolve',
      preview,
      staleSelectionCount: 2,
    });
    expect(staleFallback.hasFallback).toBe(true);
    expect(staleFallback.fallbackTitle).toBe('Stale selection detected');
    expect(staleFallback.canConfirm).toBe(false);

    const noSelectionFallback = buildExceptionBulkConfirmation({
      action: 'resolve',
      preview,
      staleSelectionCount: 0,
    });
    expect(noSelectionFallback.hasFallback).toBe(true);
    expect(noSelectionFallback.fallbackTitle).toBe('No rows selected');
    expect(noSelectionFallback.fallbackMessage).toContain('safe reset');
  });

  it('builds deterministic diff inspector row order and field order', () => {
    const inspector = buildExceptionBulkDiffInspector([
      {
        id: 'exc-2',
        merchantId: 'm-2',
        provider: 'mock-a',
        status: 'investigating',
        version: 2,
        updatedAt: '2026-03-18T09:00:00.000Z',
        currentAmount: 120,
        incomingAmount: 300,
        incomingStatus: 'resolved',
        incomingVersion: 2,
        incomingUpdatedAt: '2026-03-18T09:05:00.000Z',
        mismatchCount: 2,
      },
      {
        id: 'exc-1',
        merchantId: 'm-1',
        provider: 'mock-b',
        status: 'open',
        version: 3,
        updatedAt: '2026-03-18T08:00:00.000Z',
        currentAmount: 500,
        incomingAmount: 360,
        incomingStatus: 'investigating',
        incomingVersion: 2,
        incomingUpdatedAt: '2026-03-18T07:55:00.000Z',
        mismatchCount: 4,
      },
    ]);

    expect(inspector.rows.map((row) => row.id)).toEqual(['exc-1', 'exc-2']);
    expect(inspector.rows[0].deltas.map((delta) => delta.field)).toEqual(['amount', 'status', 'updatedAt', 'version']);
  });

  it('computes stable drilldown counts and filtering for conflict reasons', () => {
    const inspector = buildExceptionBulkDiffInspector([
      {
        id: 'exc-a',
        merchantId: 'm-a',
        provider: 'mock-a',
        status: 'open',
        version: 3,
        currentAmount: 500,
        incomingAmount: 350,
        incomingStatus: 'investigating',
        incomingVersion: 2,
        mismatchCount: 4,
      },
      {
        id: 'exc-b',
        merchantId: 'm-b',
        provider: 'mock-b',
        status: 'investigating',
        version: 1,
        currentAmount: 100,
        incomingAmount: 105,
        incomingStatus: 'investigating',
        incomingVersion: 1,
        mismatchCount: 1,
      },
      {
        id: '',
        merchantId: 'broken',
        provider: 'mock-z',
        status: 'open',
        mismatchCount: 2,
      },
    ]);

    expect(inspector.reasonCounts.stale_version).toBe(1);
    expect(inspector.reasonCounts.high_delta).toBe(1);
    expect(inspector.reasonCounts.mixed_status).toBe(1);
    expect(inspector.reasonCounts.malformed).toBe(1);
    expect(filterExceptionDiffInspectorRows(inspector.rows, 'high_delta').map((row) => row.id)).toEqual(['exc-a']);
    expect(filterExceptionDiffInspectorRows(inspector.rows, 'malformed').map((row) => row.id)).toEqual(['malformed-3']);
  });

  it('moves keyboard focus deterministically across filtered diff rows', () => {
    const inspector = buildExceptionBulkDiffInspector([
      {
        id: 'exc-a',
        merchantId: 'm-a',
        provider: 'mock-a',
        status: 'open',
        version: 3,
        currentAmount: 500,
        incomingAmount: 350,
        incomingStatus: 'investigating',
        incomingVersion: 2,
        mismatchCount: 4,
      },
      {
        id: 'exc-b',
        merchantId: 'm-b',
        provider: 'mock-b',
        status: 'investigating',
        version: 1,
        currentAmount: 100,
        incomingAmount: 105,
        incomingStatus: 'investigating',
        incomingVersion: 1,
        mismatchCount: 1,
      },
    ]);
    const filtered = filterExceptionDiffInspectorRows(inspector.rows, 'all');

    expect(moveExceptionDiffInspectorFocus({
      rows: filtered,
      activeRowId: '',
      direction: 'next',
    })).toBe('exc-a');
    expect(moveExceptionDiffInspectorFocus({
      rows: filtered,
      activeRowId: 'exc-a',
      direction: 'next',
    })).toBe('exc-b');
    expect(moveExceptionDiffInspectorFocus({
      rows: filtered,
      activeRowId: 'exc-b',
      direction: 'next',
    })).toBe('exc-b');
    expect(moveExceptionDiffInspectorFocus({
      rows: filtered,
      activeRowId: 'exc-b',
      direction: 'prev',
    })).toBe('exc-a');
    expect(moveExceptionDiffInspectorFocus({
      rows: filtered,
      activeRowId: 'unknown-row',
      direction: 'prev',
    })).toBe('exc-a');
  });

  it('maps keyboard reason shortcuts to deterministic drilldown buckets', () => {
    expect(resolveExceptionConflictShortcutDrilldown('0')).toBe('all');
    expect(resolveExceptionConflictShortcutDrilldown('1')).toBe('stale_version');
    expect(resolveExceptionConflictShortcutDrilldown('2')).toBe('malformed');
    expect(resolveExceptionConflictShortcutDrilldown('3')).toBe('high_delta');
    expect(resolveExceptionConflictShortcutDrilldown('4')).toBe('mixed_status');
    expect(resolveExceptionConflictShortcutDrilldown('9')).toBeNull();
  });

  it('returns explicit empty drilldown fallback copy for safe reset path', () => {
    const globalEmpty = resolveExceptionDiffInspectorEmptyState({
      activeReason: 'all',
      totalRows: 0,
      filteredRows: 0,
    });
    expect(globalEmpty?.title).toBe('No diff rows selected');
    expect(globalEmpty?.message).toContain('safe reset');

    const drilldownEmpty = resolveExceptionDiffInspectorEmptyState({
      activeReason: 'stale_version',
      totalRows: 2,
      filteredRows: 0,
    });
    expect(drilldownEmpty?.title).toBe('No rows in this drilldown');
    expect(drilldownEmpty?.message).toContain('stale_version');
  });

  it('creates, renames, pins, applies, and deletes saved triage views deterministically', () => {
    const created = createExceptionSavedView(DEFAULT_EXCEPTION_SAVED_VIEW_STATE, {
      name: 'Ops Investigating',
      query: {
        merchantId: 'merchant-7',
        provider: 'mock-b',
        status: 'investigating',
        startDate: '2026-03-12',
        endDate: '2026-03-18',
        pageSize: 25,
      },
      nowIso: '2026-03-19T01:00:00.000Z',
    });
    expect(created.views).toHaveLength(1);
    expect(created.views[0].pinned).toBe(true);

    const createdSecond = createExceptionSavedView(created, {
      name: 'Open Backlog',
      query: {
        status: 'open',
        pageSize: 20,
      },
      nowIso: '2026-03-19T01:05:00.000Z',
    });
    const secondId = createdSecond.views.find((view) => view.name === 'Open Backlog')?.id;
    expect(secondId).toBeTruthy();

    const renamed = renameExceptionSavedView(createdSecond, {
      viewId: secondId!,
      name: 'Open Queue',
      nowIso: '2026-03-19T01:06:00.000Z',
    });
    expect(renamed.views.some((view) => view.name === 'Open Queue')).toBe(true);

    const pinned = pinExceptionSavedView(renamed, {
      viewId: secondId!,
      nowIso: '2026-03-19T01:07:00.000Z',
    });
    expect(pinned.views.filter((view) => view.pinned)).toHaveLength(1);
    expect(pinned.activeViewId).toBe(secondId);

    const activated = activateExceptionSavedView(pinned, secondId!);
    const query = buildExceptionQueryFromSavedView(activated, secondId!);
    expect(query?.status).toBe('open');
    expect(query?.page).toBe(1);
    expect(query?.pageSize).toBe(20);

    const deleted = deleteExceptionSavedView(activated, secondId!);
    expect(deleted.views).toHaveLength(1);
    expect(deleted.activeViewId).toBe(deleted.views[0].id);
  });

  it('restores saved triage view state from URL payload first, with local storage fallback', () => {
    const state = createExceptionSavedView(DEFAULT_EXCEPTION_SAVED_VIEW_STATE, {
      name: 'Investigating',
      query: {
        status: 'investigating',
        pageSize: 50,
      },
      nowIso: '2026-03-19T02:00:00.000Z',
    });
    const payload = serializeExceptionSavedViewState(state);

    const fromQuery = restoreExceptionSavedViewState({
      queryPayload: payload,
      storagePayload: '',
    });
    expect(fromQuery.source).toBe('query');
    expect(fromQuery.state.views).toHaveLength(1);

    const fromStorage = restoreExceptionSavedViewState({
      queryPayload: '',
      storagePayload: payload,
    });
    expect(fromStorage.source).toBe('storage');
    expect(fromStorage.state.views[0].name).toBe('Investigating');
  });

  it('falls back safely when saved-view payload is corrupted or unsupported', () => {
    const restored = restoreExceptionSavedViewState({
      queryPayload: '{"version":999,"views":[]}',
      storagePayload: '{bad-json',
    });
    expect(restored.source).toBe('default');
    expect(restored.state).toEqual(DEFAULT_EXCEPTION_SAVED_VIEW_STATE);
    expect(restored.recoveryReasons.length).toBeGreaterThan(0);
  });
});
