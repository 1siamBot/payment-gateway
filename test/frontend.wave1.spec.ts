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
  buildEvidencePackageDiffStudio,
  buildEvidenceTimelineHeatmap,
  buildChecklistAutofixHints,
  buildEvidencePacketLintConsole,
  buildQaCanonicalLinkAutofixPreview,
  buildQaHandoffPreflightSummary,
  buildCanonicalLinkAutofixPreview,
  buildDeterministicAnomalyTimelineWorkspace,
  moveDeterministicAnomalyTimelineSelection,
  resolveAnomalyTimelineShortcut,
  buildRemediationPlaybookComposerPanel,
  verifyCanonicalExportLinks,
  buildManifestDiffViewer,
  buildAnomalyTriageBoard,
  buildRemediationRunbookTimelineBoard,
  buildBlockerAwareDispatchCockpit,
  buildReleaseReadinessSimulator,
  buildPublicationWindowPlanBoard,
  buildDiagnosticsTrendDigestExplorer,
  buildDiagnosticsBaselineCompareWorkspace,
  buildDeltaBundleContractSafetyConsole,
  buildDeltaBundleLinkQualityPanel,
  buildDiagnosticsDriftSummaryChips,
  buildRemediationManifestDrillboard,
  buildRemediationDependencyGraphInspector,
  buildRemediationManifestHandoffPacket,
  buildRegressionGateOverrideSimulator,
  buildReleaseReadinessEvidenceBadges,
  classifyBlockerEtaDrift,
  filterReplayDiffInspectorRows,
  filterEvidencePacketLintFindings,
  moveEvidenceTimelineHeatmapSelection,
  moveEvidencePacketLintSelection,
  moveManifestDiffSelection,
  moveReplayDiffInspectorSelection,
  moveEvidencePackageDiffSelection,
  moveDispatchCockpitSelection,
  moveReleaseReadinessLaneSelection,
  movePublicationWindowLaneSelection,
  moveDiagnosticsBaselineDeltaSelection,
  moveDeltaBundleValidationIssueSelection,
  moveRemediationRunbookTimelineSelection,
  resolveEvidenceTimelineHeatmapShortcut,
  resolveEvidencePacketLintShortcut,
  resolveManifestDiffShortcut,
  resolveAnomalyTriageShortcut,
  resolveRemediationRunbookShortcut,
  resolveReplayDiffInspectorShortcut,
  resolveEvidencePackageDiffStudioShortcut,
  resolveDispatchCockpitShortcut,
  resolveReleaseReadinessShortcut,
  resolvePublicationWindowPlanShortcut,
  resolveDiagnosticsBaselineCompareShortcut,
  resolveDeltaBundleContractSafetyShortcut,
  resolveRemediationManifestShortcut,
  resolvePublicationWindowScoreBandFromFinalScore,
  getDefaultEvidencePacketLintChecklistDraft,
  getDefaultEvidenceGapChecklistDraft,
  getDefaultDispatchEvidenceDraft,
  applyEvidencePacketLintChecklistPrMode,
  applyDispatchEvidenceDraftPrMode,
  getDefaultRemediationRunbookHandoffPackDraft,
  applyRemediationRunbookHandoffPackPrMode,
  getDefaultBlockedLaneHandoffDrillDraft,
  applyBlockedLaneHandoffDrillPrMode,
  validateBlockedLaneHandoffDrillDraft,
  resetBlockedLaneHandoffDrillDraft,
  validateRemediationRunbookHandoffPackDraft,
  resetRemediationRunbookHandoffPackDraft,
  validateEvidencePacketLintChecklistDraft,
  validateDispatchEvidenceDraft,
  resetEvidencePacketLintChecklistDraftSafe,
  validateEvidenceGapChecklistDraft,
  resetEvidenceGapChecklistDraftSafe,
  buildEvidenceDiffRail,
  moveEvidenceDiffRailSelection,
  resolveEvidenceDiffRailShortcut,
  upsertDispatchEvidenceDraft,
  getDefaultRemediationPlaybookDraft,
  upsertRemediationPlaybookDraft,
  validateRemediationPlaybookDraft,
  resetRemediationPlaybookDraftSafe,
  moveAnomalyTriageSelection,
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

  it('builds blocker-aware dispatch cockpit rows in deterministic tuple order by blockerSeverity, updatedAt, issueIdentifier, laneType', () => {
    const cockpit = buildBlockerAwareDispatchCockpit({
      rows: [
        {
          id: 'lane-b',
          issueIdentifier: 'ONE-260',
          laneType: 'qa_verification',
          blockerSeverity: 'high',
          updatedAt: '2026-03-19T05:11:00.000Z',
          blocked: true,
        },
        {
          id: 'lane-a',
          issueIdentifier: 'ONE-259',
          laneType: 'release_readiness',
          blockerSeverity: 'critical',
          updatedAt: '2026-03-19T05:10:00.000Z',
          blocked: true,
        },
        {
          id: 'lane-c',
          issueIdentifier: 'ONE-258',
          laneType: 'evidence_lint',
          blockerSeverity: 'high',
          updatedAt: '2026-03-19T05:09:00.000Z',
          blocked: true,
        },
      ],
      activeRowId: '',
    });

    expect(cockpit.contract).toBe('settlement-blocker-aware-dispatch-cockpit.v1');
    expect(cockpit.rows.map((row) => row.id)).toEqual(['lane-a', 'lane-c', 'lane-b']);
    expect(cockpit.blockedCount).toBe(3);
  });

  it('validates dispatch draft required fields and resets blocker fields when prMode changes', () => {
    const incomplete = validateDispatchEvidenceDraft(getDefaultDispatchEvidenceDraft({
      laneId: 'lane-259',
      issueIdentifier: 'ONE-259',
      laneType: 'release_readiness',
    }));
    expect(incomplete.isComplete).toBe(false);
    expect(incomplete.errors.some((error) => error.includes('placeholder'))).toBe(true);
    expect(incomplete.missingFields).toEqual([
      'branch',
      'testCommand',
      'artifactPath',
      'dependencyIssueLinks',
      'blockerOwner',
      'blockerEta',
    ]);

    const completeDraft = {
      laneId: 'lane-259',
      issueIdentifier: 'ONE-259',
      laneType: 'release_readiness' as const,
      branch: 'feature/one-261-dispatch-cockpit',
      fullSha: '1234567890abcdef1234567890abcdef12345678',
      prMode: 'no_pr_yet' as const,
      testCommand: 'npm run test -- test/frontend.wave1.spec.ts',
      artifactPath: 'artifacts/one-261/dispatch-cockpit.md',
      dependencyIssueLinksText: '/issues/ONE-260\n/ONE/issues/ONE-259#comment-12\n/ONE/issues/ONE-241',
      blockerOwner: 'GitHub Admin / DevOps',
      blockerEta: '2026-03-21T10:00:00.000Z',
      updatedAt: '2026-03-19T05:25:00.000Z',
    };
    const complete = validateDispatchEvidenceDraft(completeDraft);
    expect(complete.isComplete).toBe(true);
    expect(complete.dependencyIssueLinks).toEqual([
      '/ONE/issues/ONE-241',
      '/ONE/issues/ONE-259#comment-12',
      '/ONE/issues/ONE-260',
    ]);

    const switched = applyDispatchEvidenceDraftPrMode({
      draft: completeDraft,
      prMode: 'pr_link',
    });
    expect(switched.blockerOwner).toBe('');
    expect(switched.blockerEta).toBe('');

    const saved = upsertDispatchEvidenceDraft({
      drafts: [],
      draft: completeDraft,
    });
    expect(saved).toHaveLength(1);
    expect(saved[0].laneId).toBe('lane-259');
  });

  it('supports dispatch cockpit keyboard workflow for focus, blocked lane navigation, save draft, and validate draft', () => {
    expect(resolveDispatchCockpitShortcut({ key: 'b', altKey: true })).toBe('focus_blocker_cockpit');
    expect(resolveDispatchCockpitShortcut({ key: 'N', altKey: true, shiftKey: true })).toBe('next_blocked_lane');
    expect(resolveDispatchCockpitShortcut({ key: 'P', altKey: true, shiftKey: true })).toBe('prev_blocked_lane');
    expect(resolveDispatchCockpitShortcut({ key: 's', shiftKey: true, ctrlKey: true })).toBe('save_active_draft');
    expect(resolveDispatchCockpitShortcut({ key: 'Enter', shiftKey: true, ctrlKey: true })).toBe('validate_active_draft');

    const cockpit = buildBlockerAwareDispatchCockpit({
      rows: [
        {
          id: 'lane-1',
          issueIdentifier: 'ONE-260',
          laneType: 'release_readiness',
          blockerSeverity: 'critical',
          updatedAt: '2026-03-19T05:10:00.000Z',
          blocked: true,
        },
        {
          id: 'lane-2',
          issueIdentifier: 'ONE-259',
          laneType: 'evidence_lint',
          blockerSeverity: 'high',
          updatedAt: '2026-03-19T05:11:00.000Z',
          blocked: false,
        },
        {
          id: 'lane-3',
          issueIdentifier: 'ONE-258',
          laneType: 'qa_verification',
          blockerSeverity: 'high',
          updatedAt: '2026-03-19T05:12:00.000Z',
          blocked: true,
        },
      ],
      activeRowId: 'lane-1',
    });

    expect(moveDispatchCockpitSelection({
      rows: cockpit.rows,
      activeRowId: 'lane-1',
      direction: 'next_blocked_lane',
    })).toBe('lane-3');
    expect(moveDispatchCockpitSelection({
      rows: cockpit.rows,
      activeRowId: 'lane-3',
      direction: 'prev_blocked_lane',
    })).toBe('lane-1');
  });

  it('builds release readiness simulator lanes with deterministic ordering by readinessScore, blockerRisk, etaDriftMinutes, issueIdentifier', () => {
    const simulator = buildReleaseReadinessSimulator({
      lanes: [
        {
          id: 'lane-c',
          issueIdentifier: 'ONE-270',
          laneType: 'release_readiness',
          readinessScore: 88,
          blockerRisk: 65,
          etaBaseline: '2026-03-19T05:00:00.000Z',
          etaLatest: '2026-03-19T05:20:00.000Z',
        },
        {
          id: 'lane-a',
          issueIdentifier: 'ONE-268',
          laneType: 'release_readiness',
          readinessScore: 92,
          blockerRisk: 80,
          etaBaseline: '2026-03-19T05:00:00.000Z',
          etaLatest: '2026-03-19T06:30:00.000Z',
        },
        {
          id: 'lane-b',
          issueIdentifier: 'ONE-269',
          laneType: 'release_readiness',
          readinessScore: 92,
          blockerRisk: 80,
          etaBaseline: '2026-03-19T05:00:00.000Z',
          etaLatest: '2026-03-19T05:45:00.000Z',
        },
      ],
      activeLaneId: '',
    });

    expect(simulator.contract).toBe('settlement-release-readiness-simulator.v1');
    expect(simulator.rows.map((row) => row.id)).toEqual(['lane-a', 'lane-b', 'lane-c']);
    expect(simulator.rows[0].driftClass).toBe('major_drift');
    expect(simulator.rows[1].driftClass).toBe('minor_drift');
    expect(simulator.rows[2].driftClass).toBe('minor_drift');
  });

  it('classifies blocker ETA drift using deterministic on_track/minor_drift/major_drift thresholds', () => {
    expect(classifyBlockerEtaDrift({
      baselineEta: '2026-03-19T05:00:00.000Z',
      latestEta: '2026-03-19T05:10:00.000Z',
    })).toEqual({
      etaDriftMinutes: 10,
      classification: 'on_track',
    });
    expect(classifyBlockerEtaDrift({
      baselineEta: '2026-03-19T05:00:00.000Z',
      latestEta: '2026-03-19T05:40:00.000Z',
    })).toEqual({
      etaDriftMinutes: 40,
      classification: 'minor_drift',
    });
    expect(classifyBlockerEtaDrift({
      baselineEta: '2026-03-19T05:00:00.000Z',
      latestEta: '2026-03-19T07:00:00.000Z',
    })).toEqual({
      etaDriftMinutes: 120,
      classification: 'major_drift',
    });
  });

  it('supports release readiness keyboard workflow and evidence badge validation for no-pr packets', () => {
    expect(resolveReleaseReadinessShortcut({ key: 'r', altKey: true })).toBe('focus_readiness_simulator');
    expect(resolveReleaseReadinessShortcut({ key: 'J', altKey: true, shiftKey: true })).toBe('next_lane');
    expect(resolveReleaseReadinessShortcut({ key: 'K', altKey: true, shiftKey: true })).toBe('prev_lane');
    expect(resolveReleaseReadinessShortcut({ key: 's', shiftKey: true, ctrlKey: true })).toBe('save_snapshot');
    expect(resolveReleaseReadinessShortcut({ key: 'Enter', shiftKey: true, ctrlKey: true }))
      .toBe('validate_active_lane_packet');

    const simulator = buildReleaseReadinessSimulator({
      lanes: [
        {
          id: 'lane-1',
          issueIdentifier: 'ONE-268',
          laneType: 'release_readiness',
          readinessScore: 91,
          blockerRisk: 80,
          etaBaseline: '2026-03-19T05:00:00.000Z',
          etaLatest: '2026-03-19T05:20:00.000Z',
        },
        {
          id: 'lane-2',
          issueIdentifier: 'ONE-269',
          laneType: 'release_readiness',
          readinessScore: 90,
          blockerRisk: 75,
          etaBaseline: '2026-03-19T05:00:00.000Z',
          etaLatest: '2026-03-19T05:15:00.000Z',
        },
      ],
      activeLaneId: 'lane-1',
    });
    expect(moveReleaseReadinessLaneSelection({
      rows: simulator.rows,
      activeLaneId: 'lane-1',
      direction: 'next_lane',
    })).toBe('lane-2');

    const badges = buildReleaseReadinessEvidenceBadges({
      laneId: 'lane-1',
      issueIdentifier: 'ONE-268',
      laneType: 'release_readiness',
      branch: 'feature/one-262-readiness',
      fullSha: '1234567890abcdef1234567890abcdef12345678',
      prMode: 'no_pr_yet',
      testCommand: 'npm run test -- test/frontend.wave1.spec.ts',
      artifactPath: 'artifacts/one-262/readiness-simulator.md',
      dependencyIssueLinksText: '/ONE/issues/ONE-261\n/ONE/issues/ONE-260\n/ONE/issues/ONE-241',
      blockerOwner: 'GitHub Admin / DevOps',
      blockerEta: '2026-03-21T10:00:00.000Z',
      updatedAt: '2026-03-19T05:40:00.000Z',
    });
    const requiredBadges = badges.filter((badge) => badge.required);
    expect(requiredBadges.every((badge) => badge.complete)).toBe(true);
  });

  it('builds publication-window board rows in deterministic tuple order', () => {
    const board = buildPublicationWindowPlanBoard({
      rows: [
        {
          id: 'lane-z',
          issueIdentifier: 'ONE-272',
          bundleCode: 'bundle-c',
          windowPriorityWeight: 2,
          blockerRisk: 50,
          etaDriftMinutes: 30,
          releaseBundleScore: { completenessScore: 90, blockerDriftPenalty: 10, dependencyRiskPenalty: 0, finalScore: 80 },
          dependencyGates: [],
        },
        {
          id: 'lane-a',
          issueIdentifier: 'ONE-270',
          bundleCode: 'bundle-a',
          windowPriorityWeight: 1,
          blockerRisk: 40,
          etaDriftMinutes: 20,
          releaseBundleScore: { completenessScore: 96, blockerDriftPenalty: 6, dependencyRiskPenalty: 0, finalScore: 90 },
          dependencyGates: [],
        },
        {
          id: 'lane-b',
          issueIdentifier: 'ONE-271',
          bundleCode: 'bundle-b',
          windowPriorityWeight: 1,
          blockerRisk: 40,
          etaDriftMinutes: 25,
          releaseBundleScore: { completenessScore: 84, blockerDriftPenalty: 9, dependencyRiskPenalty: 0, finalScore: 75 },
          dependencyGates: [],
        },
      ],
      activeLaneId: '',
    });
    expect(board.contract).toBe('settlement-publication-window-plan-board.v1');
    expect(board.rows.map((row) => row.id)).toEqual(['lane-a', 'lane-b', 'lane-z']);
    expect(board.scoreBandCounts.ready_now).toBe(1);
    expect(board.scoreBandCounts.ready_soon).toBe(2);
    expect(board.scoreBandCounts.hold).toBe(0);
  });

  it('resolves publication score-band boundaries and keyboard shortcuts', () => {
    expect(resolvePublicationWindowScoreBandFromFinalScore(85)).toBe('ready_now');
    expect(resolvePublicationWindowScoreBandFromFinalScore(84)).toBe('ready_soon');
    expect(resolvePublicationWindowScoreBandFromFinalScore(60)).toBe('ready_soon');
    expect(resolvePublicationWindowScoreBandFromFinalScore(59)).toBe('hold');
    expect(resolvePublicationWindowPlanShortcut({ key: 'w', altKey: true })).toBe('focus_publication_window_board');
    expect(resolvePublicationWindowPlanShortcut({ key: 'J', altKey: true, shiftKey: true })).toBe('next_lane');
    expect(resolvePublicationWindowPlanShortcut({ key: 'K', altKey: true, shiftKey: true })).toBe('prev_lane');
    expect(resolvePublicationWindowPlanShortcut({ key: 'e', ctrlKey: true, shiftKey: true })).toBe('open_score_explainer');
    expect(resolvePublicationWindowPlanShortcut({ key: 'g', ctrlKey: true, shiftKey: true })).toBe('open_dependency_gates');
  });

  it('normalizes and validates dependency-gate links for publication-window rows', () => {
    const board = buildPublicationWindowPlanBoard({
      rows: [
        {
          id: 'lane-links',
          issueIdentifier: 'ONE-272',
          bundleCode: 'bundle-links',
          windowPriorityWeight: 1,
          blockerRisk: 35,
          etaDriftMinutes: 10,
          releaseBundleScore: { completenessScore: 92, blockerDriftPenalty: 2, dependencyRiskPenalty: 0, finalScore: 90 },
          dependencyGates: [
            {
              issueIdentifier: 'ONE-241',
              status: 'unresolved',
              unresolvedReason: 'Awaiting QA sign-off.',
              issueLink: '/issues/ONE-241',
              documentLink: '/issues/ONE-241#document-plan',
              commentLink: '/issues/ONE-241#comment-123',
            },
            {
              issueIdentifier: 'ONE-999',
              status: 'resolved',
              issueLink: 'not-a-link',
              documentLink: '/issues/not-valid',
              commentLink: '',
            },
          ],
        },
      ],
      activeLaneId: '',
    });

    const lane = board.rows[0];
    expect(lane.dependencyGates[0].issueLink).toBe('/ONE/issues/ONE-241');
    expect(lane.dependencyGates[0].documentLink).toBe('/ONE/issues/ONE-241#document-plan');
    expect(lane.dependencyGates[0].commentLink).toBe('/ONE/issues/ONE-241#comment-123');
    expect(lane.dependencyGates[0].linksValid).toBe(true);
    expect(lane.dependencyGates[1].linksValid).toBe(false);
    expect(lane.dependencyGateErrors.length).toBe(1);
    expect(movePublicationWindowLaneSelection({
      rows: board.rows,
      activeLaneId: '',
      direction: 'next_lane',
    })).toBe('lane-links');
  });

  it('builds diagnostics trend digest rows in deterministic tuple order', () => {
    const payload = [
      {
        id: 'digest-c',
        sourceIssueIdentifier: 'ONE-276',
        snapshotSha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        generatedAt: '2026-03-19T07:10:00.000Z',
      },
      {
        id: 'digest-a',
        sourceIssueIdentifier: 'ONE-269',
        snapshotSha256: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        generatedAt: '2026-03-19T07:12:00.000Z',
      },
      {
        id: 'digest-b',
        sourceIssueIdentifier: 'ONE-269',
        snapshotSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        generatedAt: '2026-03-19T07:11:00.000Z',
      },
    ];
    const first = buildDiagnosticsTrendDigestExplorer({
      rows: payload,
      activeRowId: '',
    });
    const second = buildDiagnosticsTrendDigestExplorer({
      rows: payload,
      activeRowId: '',
    });
    expect(first.contract).toBe('settlement-diagnostics-trend-digest-explorer.v1');
    expect(first.rows.map((row) => row.id)).toEqual(['digest-b', 'digest-a', 'digest-c']);
    expect(second.rows.map((row) => row.id)).toEqual(first.rows.map((row) => row.id));
  });

  it('maps regression gate rationale chips and canonical dependency links for active digest row', () => {
    const explorer = buildDiagnosticsTrendDigestExplorer({
      rows: [
        {
          id: 'digest-warn',
          sourceIssueIdentifier: 'ONE-276',
          snapshotSha256: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
          generatedAt: '2026-03-19T07:15:00.000Z',
          recommendedGate: 'warning',
          rationaleReasons: ['Severity Escalation', 'checksum-instability', 'new drift code', 'unknown_reason'],
          dependencyLinks: [
            {
              issueIdentifier: 'ONE-272',
              issueLink: '/issues/ONE-272',
              documentLink: '/issues/ONE-272#document-plan',
              commentLink: '/issues/ONE-272#comment-444',
            },
          ],
        },
      ],
      activeRowId: 'digest-warn',
    });

    expect(explorer.rationalePanel.recommendedGate).toBe('warn');
    expect(explorer.rationalePanel.reasonChips.map((chip) => chip.code)).toEqual([
      'new_drift_code',
      'checksum_instability',
      'severity_escalation',
    ]);
    expect(explorer.canonicalDependencyLinks[0]).toMatchObject({
      issueIdentifier: 'ONE-272',
      issueLink: '/ONE/issues/ONE-272',
      documentLink: '/ONE/issues/ONE-272#document-plan',
      commentLink: '/ONE/issues/ONE-272#comment-444',
      linksValid: true,
    });
  });

  it('keeps diagnostics trend digest summary cards stable for fixed fixtures', () => {
    const payload = [
      {
        id: 'digest-block',
        sourceIssueIdentifier: 'ONE-276',
        snapshotSha256: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        generatedAt: '2026-03-19T07:20:00.000Z',
        recommendedGate: 'block',
        rationaleReasons: ['spike_in_breaking_changes', 'missing_snapshot_window'],
        summary: {
          windowSize: 14,
          stableSnapshotCount: 9,
          driftSpikeCount: 3,
          maxSeverity: 'critical',
          regressionRiskScore: 92.4,
        },
      },
    ];
    const first = buildDiagnosticsTrendDigestExplorer({
      rows: payload,
      activeRowId: 'digest-block',
    });
    const second = buildDiagnosticsTrendDigestExplorer({
      rows: payload,
      activeRowId: 'digest-block',
    });
    expect(first.summaryCards).toEqual({
      windowSize: 14,
      stableSnapshotCount: 9,
      driftSpikeCount: 3,
      maxSeverity: 'critical',
      regressionRiskScore: 92.4,
    });
    expect(second.summaryCards).toEqual(first.summaryCards);
  });

  it('builds diagnostics baseline compare workspace rows in deterministic tuple order', () => {
    const workspace = buildDiagnosticsBaselineCompareWorkspace({
      baselineDigest: [
        {
          issueIdentifier: 'ONE-276',
          bundleCode: 'bundle-b',
          fieldPath: 'recommendedGate',
          value: 'warn',
          deltaSeverityWeight: 2,
          scoreBandShiftWeight: 3,
        },
        {
          issueIdentifier: 'ONE-273',
          bundleCode: 'bundle-a',
          fieldPath: 'regressionRiskScore',
          value: '78.2',
          deltaSeverityWeight: 1,
          scoreBandShiftWeight: 2,
        },
      ],
      candidateDigest: [
        {
          issueIdentifier: 'ONE-276',
          bundleCode: 'bundle-b',
          fieldPath: 'recommendedGate',
          value: 'block',
          deltaSeverityWeight: 2,
          scoreBandShiftWeight: 3,
        },
        {
          issueIdentifier: 'ONE-273',
          bundleCode: 'bundle-a',
          fieldPath: 'regressionRiskScore',
          value: '70.5',
          deltaSeverityWeight: 1,
          scoreBandShiftWeight: 2,
        },
      ],
      activeDeltaId: '',
    });

    expect(workspace.contract).toBe('settlement-diagnostics-baseline-compare-workspace.v1');
    expect(workspace.rows.map((row) => row.id)).toEqual([
      'ONE-273|bundle-a|regressionRiskScore',
      'ONE-276|bundle-b|recommendedGate',
    ]);
    expect(workspace.rows.map((row) => row.changed)).toEqual([true, true]);
    expect(moveDiagnosticsBaselineDeltaSelection({
      rows: workspace.rows,
      activeDeltaId: workspace.rows[0].id,
      direction: 'next_section',
    })).toBe(workspace.rows[1].id);
    expect(workspace.rows[0]).toMatchObject({
      sectionWeight: 1,
      fieldPath: 'regressionRiskScore',
      fieldTypeWeight: 2,
      sourceIssueIdentifier: 'ONE-273',
    });
  });

  it('builds regression gate override simulator outcomes with deterministic machine reason handling', () => {
    const first = buildRegressionGateOverrideSimulator({
      rows: [
        {
          id: 'scenario-b',
          issueIdentifier: 'ONE-273',
          currentGate: 'warn',
          overrideGate: 'pass',
          reasonCodes: ['eta_drift'],
        },
        {
          id: 'scenario-a',
          issueIdentifier: 'ONE-276',
          currentGate: 'warn',
          overrideGate: 'pass',
          reasonCodes: ['missing_evidence', 'artifact_gap'],
        },
      ],
      activeScenarioId: '',
    });
    const second = buildRegressionGateOverrideSimulator({
      rows: [
        {
          id: 'scenario-a',
          issueIdentifier: 'ONE-276',
          currentGate: 'warn',
          overrideGate: 'pass',
          reasonCodes: ['artifact_gap', 'missing_evidence'],
        },
        {
          id: 'scenario-b',
          issueIdentifier: 'ONE-273',
          currentGate: 'warn',
          overrideGate: 'pass',
          reasonCodes: ['eta_drift'],
        },
      ],
      activeScenarioId: '',
    });

    expect(first.scenarios.map((row) => row.id)).toEqual(['scenario-a', 'scenario-b']);
    expect(first.scenarios.map((row) => row.whatIfOutcome)).toEqual(['block', 'warn']);
    expect(second.scenarios).toEqual(first.scenarios);
    expect(first.reasonCodeCounts).toMatchObject({
      missing_evidence: 1,
      artifact_gap: 1,
      eta_drift: 1,
    });
  });

  it('resolves diagnostics contract-bundle explorer shortcuts for explorer/composer workflow', () => {
    expect(resolveDiagnosticsBaselineCompareShortcut({ key: 'e', altKey: true })).toBe('focus_contract_bundle_explorer');
    expect(resolveDiagnosticsBaselineCompareShortcut({ key: 'N', altKey: true, shiftKey: true })).toBe('next_section');
    expect(resolveDiagnosticsBaselineCompareShortcut({ key: 'P', altKey: true, shiftKey: true })).toBe('prev_section');
    expect(resolveDiagnosticsBaselineCompareShortcut({ key: 'h', ctrlKey: true, shiftKey: true })).toBe('open_handoff_composer');
    expect(resolveDiagnosticsBaselineCompareShortcut({ key: 's', ctrlKey: true, shiftKey: true })).toBe('validate_handoff_packet');
  });

  it('builds deterministic diagnostics drift-summary chips in canonical reason-code order', () => {
    const workspace = buildDiagnosticsBaselineCompareWorkspace({
      baselineDigest: [
        {
          sourceIssueIdentifier: 'ONE-300',
          bundleCode: 'bundle-a',
          sectionWeight: 2,
          fieldPath: 'payload.enum',
          fieldTypeWeight: 2,
          driftReasonCode: 'enum_drift',
          value: 'A',
        },
        {
          sourceIssueIdentifier: 'ONE-301',
          bundleCode: 'bundle-b',
          sectionWeight: 1,
          fieldPath: 'payload.checksum',
          fieldTypeWeight: 3,
          driftReasonCode: 'checksum_mismatch',
          value: 'x',
        },
      ],
      candidateDigest: [
        {
          sourceIssueIdentifier: 'ONE-300',
          bundleCode: 'bundle-a',
          sectionWeight: 2,
          fieldPath: 'payload.enum',
          fieldTypeWeight: 2,
          driftReasonCode: 'enum_drift',
          value: 'B',
        },
        {
          sourceIssueIdentifier: 'ONE-301',
          bundleCode: 'bundle-b',
          sectionWeight: 1,
          fieldPath: 'payload.checksum',
          fieldTypeWeight: 3,
          driftReasonCode: 'checksum_mismatch',
          value: 'y',
        },
      ],
      activeDeltaId: '',
    });
    const chips = buildDiagnosticsDriftSummaryChips(workspace.rows);
    expect(chips.map((chip) => chip.code)).toEqual(['enum_drift', 'checksum_mismatch']);
    expect(chips.map((chip) => chip.count)).toEqual([1, 1]);
  });

  it('keeps canonical-link autofix and checklist validation stable for diagnostics handoff packet inputs', () => {
    const linksText = [
      '/issues/ONE-280',
      '/issues/ONE-280#comment-42',
      '/issues/ONE-280#document-plan',
    ].join('\n');
    const firstPreview = buildCanonicalLinkAutofixPreview({ linksText });
    const secondPreview = buildCanonicalLinkAutofixPreview({ linksText });
    expect(firstPreview).toEqual(secondPreview);
    expect(firstPreview.changedCount).toBe(3);
    expect(firstPreview.correctedOutput).toContain('/ONE/issues/ONE-280#comment-42');

    const firstValidation = validateEvidencePacketLintChecklistDraft({
      branch: 'feature/one-280-contract-bundle-explorer',
      fullSha: '1234567890abcdef1234567890abcdef12345678',
      prMode: 'no_pr_yet',
      testCommand: 'npm run test -- frontend.wave1.spec.ts',
      artifactPath: 'artifacts/one-280/diagnostics-handoff.md',
      dependencyIssueLinksText: firstPreview.correctedOutput,
      blockerOwner: 'GitHub Admin / DevOps',
      blockerEta: '2026-03-20T18:00:00.000Z',
    });
    const secondValidation = validateEvidencePacketLintChecklistDraft({
      branch: 'feature/one-280-contract-bundle-explorer',
      fullSha: '1234567890abcdef1234567890abcdef12345678',
      prMode: 'no_pr_yet',
      testCommand: 'npm run test -- frontend.wave1.spec.ts',
      artifactPath: 'artifacts/one-280/diagnostics-handoff.md',
      dependencyIssueLinksText: secondPreview.correctedOutput,
      blockerOwner: 'GitHub Admin / DevOps',
      blockerEta: '2026-03-20T18:00:00.000Z',
    });
    expect(firstValidation).toEqual(secondValidation);
    expect(firstValidation.isComplete).toBe(true);
  });

  it('builds delta-bundle contract safety rows in deterministic tuple order', () => {
    const consoleData = buildDeltaBundleContractSafetyConsole({
      entries: [
        {
          id: 'row-c',
          issueIdentifier: 'one-282',
          bundleCode: 'bundle-z',
          fieldPath: 'payload.enum',
          deltaSeverityWeight: 2,
          scoreBandShiftWeight: 4,
          baselineValue: 'A',
          candidateValue: 'B',
          contractValidation: {
            requiredFieldCoverage: 96.5,
            missingFieldPaths: ['payload.required'],
            enumDriftCodes: ['enum_new_value'],
            isContractSafe: false,
          },
        },
        {
          id: 'row-a',
          issueIdentifier: 'ONE-279',
          bundleCode: 'bundle-a',
          fieldPath: 'payload.type',
          deltaSeverityWeight: 1,
          scoreBandShiftWeight: 3,
          baselineValue: 'string',
          candidateValue: 'string',
          contractValidation: {
            requiredFieldCoverage: 100,
            missingFieldPaths: [],
            enumDriftCodes: [],
            isContractSafe: true,
          },
        },
        {
          id: 'row-b',
          issueIdentifier: 'ONE-281',
          bundleCode: 'bundle-b',
          fieldPath: 'payload.order',
          deltaSeverityWeight: 1,
          scoreBandShiftWeight: 3,
          baselineValue: '2',
          candidateValue: '3',
          contractValidation: {
            requiredFieldCoverage: 90,
            missingFieldPaths: ['payload.order'],
            enumDriftCodes: [],
            isContractSafe: false,
          },
        },
      ],
      activeEntryId: '',
    });

    expect(consoleData.rows.map((row) => `${row.deltaSeverityWeight}|${row.scoreBandShiftWeight}|${row.issueIdentifier}|${row.bundleCode}|${row.fieldPath}`)).toEqual([
      '1|3|ONE-279|bundle-a|payload.type',
      '1|3|ONE-281|bundle-b|payload.order',
      '2|4|ONE-282|bundle-z|payload.enum',
    ]);
    expect(consoleData.validatorDrillPanel.issueIds).toEqual(['row-b', 'row-c']);
    expect(consoleData.validatorDrillPanel.unsafeIssueCount).toBe(2);
    expect(consoleData.validatorDrillPanel.safeIssueCount).toBe(1);
  });

  it('keeps validator drill state stable across reruns and resolves keyboard shortcuts', () => {
    const first = buildDeltaBundleContractSafetyConsole({
      entries: [
        {
          id: 'unsafe-b',
          issueIdentifier: 'ONE-282',
          bundleCode: 'bundle-b',
          fieldPath: 'payload.required',
          deltaSeverityWeight: 1,
          scoreBandShiftWeight: 2,
          baselineValue: 'present',
          candidateValue: '',
          contractValidation: {
            requiredFieldCoverage: 75,
            missingFieldPaths: ['payload.required', 'payload.required'],
            enumDriftCodes: ['enum_drift', 'enum_drift'],
            isContractSafe: false,
          },
        },
        {
          id: 'unsafe-a',
          issueIdentifier: 'ONE-281',
          bundleCode: 'bundle-a',
          fieldPath: 'payload.enum',
          deltaSeverityWeight: 1,
          scoreBandShiftWeight: 1,
          baselineValue: 'A',
          candidateValue: 'B',
          contractValidation: {
            requiredFieldCoverage: 88,
            missingFieldPaths: [],
            enumDriftCodes: ['enum-new-value'],
            isContractSafe: false,
          },
        },
      ],
      activeEntryId: 'unsafe-b',
    });
    const second = buildDeltaBundleContractSafetyConsole({
      entries: [
        {
          id: 'unsafe-a',
          issueIdentifier: 'ONE-281',
          bundleCode: 'bundle-a',
          fieldPath: 'payload.enum',
          deltaSeverityWeight: 1,
          scoreBandShiftWeight: 1,
          baselineValue: 'A',
          candidateValue: 'B',
          contractValidation: {
            requiredFieldCoverage: 88,
            missingFieldPaths: [],
            enumDriftCodes: ['enum-new-value'],
            isContractSafe: false,
          },
        },
        {
          id: 'unsafe-b',
          issueIdentifier: 'ONE-282',
          bundleCode: 'bundle-b',
          fieldPath: 'payload.required',
          deltaSeverityWeight: 1,
          scoreBandShiftWeight: 2,
          baselineValue: 'present',
          candidateValue: '',
          contractValidation: {
            requiredFieldCoverage: 75,
            missingFieldPaths: ['payload.required'],
            enumDriftCodes: ['enum_drift'],
            isContractSafe: false,
          },
        },
      ],
      activeEntryId: 'unsafe-b',
    });

    expect(first.rows).toEqual(second.rows);
    expect(first.validatorDrillPanel).toEqual(second.validatorDrillPanel);
    expect(moveDeltaBundleValidationIssueSelection({
      issueIds: first.validatorDrillPanel.issueIds,
      activeIssueId: 'unsafe-a',
      direction: 'next_validation_issue',
    })).toBe('unsafe-b');
    expect(moveDeltaBundleValidationIssueSelection({
      issueIds: first.validatorDrillPanel.issueIds,
      activeIssueId: 'unsafe-b',
      direction: 'prev_validation_issue',
    })).toBe('unsafe-a');

    expect(resolveDeltaBundleContractSafetyShortcut({ key: 'v', altKey: true })).toBe('focus_validator_drill_panel');
    expect(resolveDeltaBundleContractSafetyShortcut({ key: 'N', altKey: true, shiftKey: true })).toBe('next_validation_issue');
    expect(resolveDeltaBundleContractSafetyShortcut({ key: 'P', altKey: true, shiftKey: true })).toBe('prev_validation_issue');
    expect(resolveDeltaBundleContractSafetyShortcut({ key: 'l', ctrlKey: true, shiftKey: true })).toBe('open_link_quality_panel');
    expect(resolveDeltaBundleContractSafetyShortcut({ key: 'Enter', ctrlKey: true, shiftKey: true })).toBe('run_deterministic_validation_pass');
  });

  it('builds delta-bundle link-quality panel with canonical autofix preview before scenario save', () => {
    const panel = buildDeltaBundleLinkQualityPanel({
      linksText: [
        '/issues/ONE-282',
        '/ONE/issues/ONE-279#comment-7',
        'not-a-paperclip-link',
      ].join('\n'),
    });

    expect(panel.rows.map((row) => row.normalized)).toEqual([
      '/ONE/issues/ONE-282',
      '/ONE/issues/ONE-279#comment-7',
      'not-a-paperclip-link',
    ]);
    expect(panel.changedCount).toBe(1);
    expect(panel.invalidCount).toBe(1);
    expect(panel.canSaveScenario).toBe(false);
    expect(panel.correctedOutput).toContain('/ONE/issues/ONE-282');
  });

  it('builds evidence packet lint console rows in deterministic tuple order and supports keyboard navigation', () => {
    const consoleData = buildEvidencePacketLintConsole({
      findings: [
        {
          id: 'finding-c',
          code: 'MISSING_BLOCKER_OWNER',
          severity: 'error',
          severityPriority: 1,
          field: 'blockerOwner',
          fieldPriority: 70,
          issueIdentifier: 'ONE-259',
          path: 'artifacts/one-259/handoff.md',
          message: 'blockerOwner is required when prMode=no_pr_yet',
        },
        {
          id: 'finding-a',
          code: 'MISSING_BRANCH',
          severity: 'error',
          severityPriority: 1,
          field: 'branch',
          fieldPriority: 10,
          issueIdentifier: 'ONE-257',
          path: 'artifacts/one-257/evidence.md',
          message: 'branch is required',
        },
        {
          id: 'finding-b',
          code: 'NON_CANONICAL_DEPENDENCY_ISSUE_LINK',
          severity: 'warning',
          severityPriority: 2,
          field: 'dependencyIssueLinks',
          fieldPriority: 60,
          issueIdentifier: 'ONE-258',
          path: 'artifacts/one-258/checklist.md',
          message: 'dependency issue link normalized to canonical format: /ONE/issues/ONE-258',
        },
      ],
      activeFilter: 'all',
      activeFindingId: '',
    });
    expect(consoleData.rows.map((row) => row.id)).toEqual(['finding-a', 'finding-c', 'finding-b']);

    const errorOnly = filterEvidencePacketLintFindings(consoleData.rows, 'error');
    expect(errorOnly.map((row) => row.id)).toEqual(['finding-a', 'finding-c']);

    expect(resolveEvidencePacketLintShortcut({ key: 'e', altKey: true })).toBe('focus_lint_list');
    expect(resolveEvidencePacketLintShortcut({ key: 'j', altKey: true })).toBe('next_finding');
    expect(resolveEvidencePacketLintShortcut({ key: 'k', altKey: true })).toBe('prev_finding');
    expect(resolveEvidencePacketLintShortcut({
      key: 'Enter',
      shiftKey: true,
      ctrlKey: true,
    })).toBe('validate_packet');

    expect(moveEvidencePacketLintSelection({
      rows: consoleData.rows,
      activeFindingId: 'finding-a',
      direction: 'next',
    })).toBe('finding-c');
    expect(moveEvidencePacketLintSelection({
      rows: consoleData.rows,
      activeFindingId: 'finding-c',
      direction: 'prev',
    })).toBe('finding-a');
  });

  it('builds canonical link autofix preview with copy-ready normalized output', () => {
    const preview = buildCanonicalLinkAutofixPreview({
      linksText: [
        '/issues/ONE-258#comment-91',
        'https://paperclip.dev/issues/ONE-257#document-plan',
        '/ONE/issues/ONE-241',
      ].join('\n'),
    });

    expect(preview.changedCount).toBe(2);
    expect(preview.rows.map((row) => row.normalized)).toEqual([
      '/ONE/issues/ONE-258#comment-91',
      '/ONE/issues/ONE-241',
      '/ONE/issues/ONE-257#document-plan',
    ]);
    expect(preview.correctedOutput).toBe([
      '/ONE/issues/ONE-258#comment-91',
      '/ONE/issues/ONE-241',
      '/ONE/issues/ONE-257#document-plan',
    ].join('\n'));
  });

  it('builds deterministic anomaly timeline workspace groups in tuple order', () => {
    const workspace = buildDeterministicAnomalyTimelineWorkspace({
      events: [
        {
          id: 'evt-c',
          issueIdentifier: 'ONE-280',
          bundleCode: 'bundle-z',
          fieldPath: 'packet.links[2]',
          severityWeight: 90,
          driftClassWeight: 20,
          occurredAt: '2026-03-19T09:03:00.000Z',
        },
        {
          id: 'evt-a',
          issueIdentifier: 'ONE-279',
          bundleCode: 'bundle-a',
          fieldPath: 'packet.branch',
          severityWeight: 100,
          driftClassWeight: 40,
          occurredAt: '2026-03-19T09:01:00.000Z',
        },
        {
          id: 'evt-b',
          issueIdentifier: 'ONE-279',
          bundleCode: 'bundle-a',
          fieldPath: 'packet.fullSha',
          severityWeight: 100,
          driftClassWeight: 20,
          occurredAt: '2026-03-19T09:02:00.000Z',
        },
      ],
      activeEventId: '',
    });

    expect(workspace.contract).toBe('settlement-anomaly-timeline-workspace.v1');
    expect(workspace.groups.map((group) => `${group.issueIdentifier}:${group.bundleCode}`)).toEqual([
      'ONE-279:bundle-a',
      'ONE-280:bundle-z',
    ]);
    expect(workspace.groups[0].events.map((event) => event.id)).toEqual(['evt-a', 'evt-b']);
    expect(workspace.activeEventId).toBe('evt-a');
    expect(moveDeterministicAnomalyTimelineSelection({
      groups: workspace.groups,
      activeEventId: 'evt-a',
      direction: 'next',
    })).toBe('evt-b');
  });

  it('builds remediation playbook composer output deterministically for semantically identical inputs', () => {
    const baseActions = [
      {
        actionCode: 'request_dependency_replay',
        reasonCode: 'dependency_open',
        severityWeight: 60,
        requiredEvidence: ['artifacts/one-284/timeline-export.json', 'artifacts/one-284/playbook.md'],
        rollbackHint: 'Rollback to previous validated dependency snapshot.',
        issueIdentifier: 'ONE-279',
        bundleCode: 'bundle-a',
        fieldPath: 'dependencyIssueLinks',
      },
      {
        actionCode: 'repair_canonical_links',
        reasonCode: 'link_noncanonical',
        severityWeight: 92,
        requiredEvidence: ['artifacts/one-284/link-verifier.md'],
        rollbackHint: 'Restore link set from last accepted handoff packet.',
        issueIdentifier: 'ONE-283',
        bundleCode: 'bundle-z',
        fieldPath: 'packet.links',
      },
    ];
    const first = buildRemediationPlaybookComposerPanel({
      actions: baseActions,
    });
    const second = buildRemediationPlaybookComposerPanel({
      actions: [...baseActions].reverse(),
    });
    expect(first.contract).toBe('settlement-remediation-playbook-composer.v1');
    expect(first.actions).toEqual(second.actions);
    expect(first.actions.map((action) => action.actionCode)).toEqual([
      'repair_canonical_links',
      'request_dependency_replay',
    ]);
    expect(first.actions[0]).toMatchObject({
      reasonCode: 'link_noncanonical',
      riskLevel: 'critical',
      requiredEvidence: ['artifacts/one-284/link-verifier.md'],
    });
  });

  it('verifies canonical issue/comment/document links with autofix preview before export', () => {
    const verification = verifyCanonicalExportLinks({
      linksText: [
        '/issues/ONE-279',
        'https://paperclip.dev/issues/ONE-283#comment-11',
        '/ONE/issues/ONE-241#document-plan',
      ].join('\n'),
    });

    expect(verification.contract).toBe('settlement-export-link-verifier.v1');
    expect(verification.invalidCount).toBe(0);
    expect(verification.changedCount).toBe(2);
    expect(verification.readyForExport).toBe(true);
    expect(verification.correctedOutput).toBe([
      '/ONE/issues/ONE-279',
      '/ONE/issues/ONE-241#document-plan',
      '/ONE/issues/ONE-283#comment-11',
    ].join('\n'));
  });

  it('resolves anomaly timeline keyboard workflow for timeline navigation and playbook export', () => {
    expect(resolveAnomalyTimelineShortcut({ key: 't', altKey: true })).toBe('focus_timeline_board');
    expect(resolveAnomalyTimelineShortcut({ key: 'N', altKey: true, shiftKey: true })).toBe('next_anomaly');
    expect(resolveAnomalyTimelineShortcut({ key: 'P', altKey: true, shiftKey: true })).toBe('prev_anomaly');
    expect(resolveAnomalyTimelineShortcut({ key: 'r', shiftKey: true, ctrlKey: true })).toBe('open_playbook_composer');
    expect(resolveAnomalyTimelineShortcut({ key: 'Enter', shiftKey: true, ctrlKey: true })).toBe('validate_export_packet');
  });

  it('builds anomaly triage board rows in deterministic order by severityWeight, stalenessMinutes, issueIdentifier, fieldPath', () => {
    const board = buildAnomalyTriageBoard({
      rows: [
        {
          id: 'anom-c',
          issueIdentifier: 'ONE-270',
          fieldPath: 'dependencyIssueLinks',
          category: 'dependency-gap',
          severityWeight: 80,
          stalenessMinutes: 40,
          summary: 'Dependency gap',
        },
        {
          id: 'anom-a',
          issueIdentifier: 'ONE-269',
          fieldPath: 'evidence.branch',
          category: 'missing',
          severityWeight: 100,
          stalenessMinutes: 33,
          summary: 'Branch missing',
        },
        {
          id: 'anom-b',
          issueIdentifier: 'ONE-268',
          fieldPath: 'packet.fullSha',
          category: 'malformed',
          severityWeight: 100,
          stalenessMinutes: 12,
          summary: 'SHA malformed',
        },
      ],
      activeRowId: '',
    });

    expect(board.contract).toBe('settlement-anomaly-triage-board.v1');
    expect(board.rows.map((row) => row.id)).toEqual(['anom-a', 'anom-b', 'anom-c']);
    expect(board.activeRowId).toBe('anom-a');
  });

  it('supports anomaly triage keyboard workflow and deterministic next/prev selection', () => {
    expect(resolveAnomalyTriageShortcut({ key: 'a', altKey: true })).toBe('focus_anomaly_board');
    expect(resolveAnomalyTriageShortcut({ key: 'J', altKey: true, shiftKey: true })).toBe('next_anomaly');
    expect(resolveAnomalyTriageShortcut({ key: 'K', altKey: true, shiftKey: true })).toBe('prev_anomaly');
    expect(resolveAnomalyTriageShortcut({ key: 'p', shiftKey: true, ctrlKey: true })).toBe('open_playbook_composer');
    expect(resolveAnomalyTriageShortcut({ key: 'Enter', shiftKey: true, ctrlKey: true })).toBe('validate_active_playbook');

    const board = buildAnomalyTriageBoard({
      rows: [
        {
          id: 'anom-a',
          issueIdentifier: 'ONE-269',
          fieldPath: 'evidence.branch',
          category: 'missing',
          severityWeight: 100,
          stalenessMinutes: 33,
          summary: 'Branch missing',
        },
        {
          id: 'anom-b',
          issueIdentifier: 'ONE-268',
          fieldPath: 'packet.fullSha',
          category: 'malformed',
          severityWeight: 100,
          stalenessMinutes: 12,
          summary: 'SHA malformed',
        },
      ],
      activeRowId: 'anom-a',
    });

    expect(moveAnomalyTriageSelection({
      rows: board.rows,
      activeRowId: 'anom-a',
      direction: 'next',
    })).toBe('anom-b');
    expect(moveAnomalyTriageSelection({
      rows: board.rows,
      activeRowId: 'anom-b',
      direction: 'prev',
    })).toBe('anom-a');
  });

  it('builds remediation runbook timeline rows in deterministic order by severityWeight, etaDriftMinutes, issueIdentifier, stepIndex', () => {
    const board = buildRemediationRunbookTimelineBoard({
      rows: [
        {
          id: 'runbook-c',
          issueIdentifier: 'ONE-266',
          stepIndex: 2,
          severityWeight: 80,
          etaDriftMinutes: 45,
        },
        {
          id: 'runbook-a',
          issueIdentifier: 'ONE-265',
          stepIndex: 1,
          severityWeight: 100,
          etaDriftMinutes: 30,
        },
        {
          id: 'runbook-b',
          issueIdentifier: 'ONE-264',
          stepIndex: 1,
          severityWeight: 100,
          etaDriftMinutes: 60,
        },
      ],
      activeRowId: '',
    });

    expect(board.contract).toBe('settlement-remediation-runbook-timeline-board.v1');
    expect(board.rows.map((row) => row.id)).toEqual(['runbook-b', 'runbook-a', 'runbook-c']);
    expect(board.activeRowId).toBe('runbook-b');
    expect(moveRemediationRunbookTimelineSelection({
      rows: board.rows,
      activeRowId: 'runbook-b',
      direction: 'next',
    })).toBe('runbook-a');
  });

  it('supports remediation runbook keyboard shortcuts and canonical autofix preview links', () => {
    expect(resolveRemediationRunbookShortcut({ key: 't', altKey: true })).toBe('focus_timeline_board');
    expect(resolveRemediationRunbookShortcut({ key: 'J', altKey: true, shiftKey: true })).toBe('next_step');
    expect(resolveRemediationRunbookShortcut({ key: 'K', altKey: true, shiftKey: true })).toBe('prev_step');
    expect(resolveRemediationRunbookShortcut({ key: 'h', shiftKey: true, ctrlKey: true })).toBe('open_handoff_pack');
    expect(resolveRemediationRunbookShortcut({ key: 'Enter', shiftKey: true, ctrlKey: true })).toBe('validate_active_pack');

    const preview = buildCanonicalLinkAutofixPreview({
      linksText: '/issues/ONE-265\n/ONE/issues/ONE-262#comment-12\nhttps://paperclip.dev/issues/ONE-241#document-plan',
    });
    expect(preview.correctedOutput).toBe([
      '/ONE/issues/ONE-265',
      '/ONE/issues/ONE-262#comment-12',
      '/ONE/issues/ONE-241#document-plan',
    ].join('\n'));
  });

  it('validates remediation runbook handoff pack draft and supports safe/full reset behavior', () => {
    const incomplete = validateRemediationRunbookHandoffPackDraft(getDefaultRemediationRunbookHandoffPackDraft({
      stepId: 'runbook-step-1',
      issueIdentifier: 'ONE-266',
    }));
    expect(incomplete.isComplete).toBe(false);
    expect(incomplete.errors.some((error) => error.includes('placeholder'))).toBe(true);
    expect(incomplete.missingFields).toEqual([
      'branch',
      'testCommand',
      'artifactPath',
      'dependencyIssueLinks',
      'blockerOwner',
      'blockerEta',
    ]);

    const completeDraft = {
      stepId: 'runbook-step-1',
      issueIdentifier: 'ONE-266',
      branch: 'feature/one-266-runbook-timeline',
      fullSha: '1234567890abcdef1234567890abcdef12345678',
      prMode: 'no_pr_yet' as const,
      testCommand: 'npm run test -- test/frontend.wave1.spec.ts',
      artifactPath: 'artifacts/one-266/remediation-runbook-pack.md',
      dependencyIssueLinksText: '/issues/ONE-265\n/ONE/issues/ONE-262#comment-12\n/ONE/issues/ONE-241',
      blockerOwner: 'GitHub Admin / DevOps',
      blockerEta: '2026-03-21T12:00:00.000Z',
      updatedAt: '2026-03-19T07:20:00.000Z',
    };
    const complete = validateRemediationRunbookHandoffPackDraft(completeDraft);
    expect(complete.isComplete).toBe(true);
    expect(complete.dependencyIssueLinks).toEqual([
      '/ONE/issues/ONE-241',
      '/ONE/issues/ONE-262#comment-12',
      '/ONE/issues/ONE-265',
    ]);

    const switchedMode = applyRemediationRunbookHandoffPackPrMode({
      draft: completeDraft,
      prMode: 'pr_link',
    });
    expect(switchedMode.blockerOwner).toBe('');
    expect(switchedMode.blockerEta).toBe('');

    const safeReset = resetRemediationRunbookHandoffPackDraft({
      stepId: 'runbook-step-1',
      issueIdentifier: 'ONE-266',
      confirmFullReset: false,
    });
    expect(safeReset.didFullReset).toBe(false);
    expect(safeReset.message).toContain('selection preserved');

    const fullReset = resetRemediationRunbookHandoffPackDraft({
      stepId: 'runbook-step-1',
      issueIdentifier: 'ONE-266',
      confirmFullReset: true,
    });
    expect(fullReset.didFullReset).toBe(true);
    expect(fullReset.message).toContain('fully reset');
  });

  it('builds manifest diff viewer rows in deterministic order by severityWeight, deltaClassWeight, issueIdentifier, fieldPath', () => {
    const viewer = buildManifestDiffViewer({
      rows: [
        {
          id: 'manifest-c',
          severityWeight: 30,
          deltaClassWeight: 30,
          issueIdentifier: 'ONE-270',
          fieldPath: 'packet.blockerOwner',
          deltaClass: 'unexpected',
        },
        {
          id: 'manifest-b',
          severityWeight: 20,
          deltaClassWeight: 20,
          issueIdentifier: 'ONE-269',
          fieldPath: 'packet.branch',
          deltaClass: 'modified',
        },
        {
          id: 'manifest-a',
          severityWeight: 20,
          deltaClassWeight: 10,
          issueIdentifier: 'ONE-268',
          fieldPath: 'packet.artifactPath',
          deltaClass: 'missing',
        },
      ],
      activeRowId: '',
    });

    expect(viewer.contract).toBe('settlement-manifest-diff-viewer.v1');
    expect(viewer.rows.map((row) => row.id)).toEqual(['manifest-a', 'manifest-b', 'manifest-c']);
    expect(viewer.activeRowId).toBe('manifest-a');
  });

  it('supports manifest diff keyboard workflow and deterministic next/prev selection', () => {
    expect(resolveManifestDiffShortcut({ key: 'm', altKey: true })).toBe('focus_manifest_diff');
    expect(resolveManifestDiffShortcut({ key: 'J', altKey: true, shiftKey: true })).toBe('next_finding');
    expect(resolveManifestDiffShortcut({ key: 'K', altKey: true, shiftKey: true })).toBe('prev_finding');
    expect(resolveManifestDiffShortcut({ key: 'd', shiftKey: true, ctrlKey: true })).toBe('open_handoff_drill');
    expect(resolveManifestDiffShortcut({ key: 'Enter', shiftKey: true, ctrlKey: true })).toBe('validate_active_packet');

    const viewer = buildManifestDiffViewer({
      rows: [
        {
          id: 'manifest-a',
          severityWeight: 10,
          deltaClassWeight: 10,
          issueIdentifier: 'ONE-268',
          fieldPath: 'packet.branch',
          deltaClass: 'missing',
        },
        {
          id: 'manifest-b',
          severityWeight: 20,
          deltaClassWeight: 10,
          issueIdentifier: 'ONE-269',
          fieldPath: 'packet.fullSha',
          deltaClass: 'modified',
        },
      ],
      activeRowId: 'manifest-a',
    });

    expect(moveManifestDiffSelection({
      rows: viewer.rows,
      activeRowId: 'manifest-a',
      direction: 'next',
    })).toBe('manifest-b');
    expect(moveManifestDiffSelection({
      rows: viewer.rows,
      activeRowId: 'manifest-b',
      direction: 'prev',
    })).toBe('manifest-a');
  });

  it('validates blocked-lane handoff drill draft and supports safe/full reset behavior with canonical link normalization', () => {
    const incomplete = validateBlockedLaneHandoffDrillDraft(getDefaultBlockedLaneHandoffDrillDraft({
      laneId: 'manifest-a',
      issueIdentifier: 'ONE-268',
    }));
    expect(incomplete.isComplete).toBe(false);
    expect(incomplete.errors.some((error) => error.includes('placeholder'))).toBe(true);
    expect(incomplete.missingFields).toEqual([
      'branch',
      'testCommand',
      'artifactPath',
      'dependencyIssueLinks',
      'blockerOwner',
      'blockerEta',
    ]);

    const completeDraft = {
      laneId: 'manifest-a',
      issueIdentifier: 'ONE-268',
      branch: 'feature/one-268-manifest-diff-viewer',
      fullSha: '1234567890abcdef1234567890abcdef12345678',
      prMode: 'no_pr_yet' as const,
      testCommand: 'npm run test -- test/frontend.wave1.spec.ts',
      artifactPath: 'artifacts/one-268/manifest-handoff-pack.md',
      dependencyIssueLinksText: '/issues/ONE-267\n/ONE/issues/ONE-266#comment-12\nhttps://paperclip.dev/issues/ONE-241#document-plan',
      blockerOwner: 'GitHub Admin / DevOps',
      blockerEta: '2026-03-22T08:00:00.000Z',
      updatedAt: '2026-03-19T07:40:00.000Z',
    };
    const complete = validateBlockedLaneHandoffDrillDraft(completeDraft);
    expect(complete.isComplete).toBe(true);
    expect(complete.dependencyIssueLinks).toEqual([
      '/ONE/issues/ONE-241#document-plan',
      '/ONE/issues/ONE-266#comment-12',
      '/ONE/issues/ONE-267',
    ]);

    const switchedMode = applyBlockedLaneHandoffDrillPrMode({
      draft: completeDraft,
      prMode: 'pr_link',
    });
    expect(switchedMode.blockerOwner).toBe('');
    expect(switchedMode.blockerEta).toBe('');

    const safeReset = resetBlockedLaneHandoffDrillDraft({
      laneId: 'manifest-a',
      issueIdentifier: 'ONE-268',
      confirmFullReset: false,
    });
    expect(safeReset.didFullReset).toBe(false);
    expect(safeReset.message).toContain('selection preserved');

    const fullReset = resetBlockedLaneHandoffDrillDraft({
      laneId: 'manifest-a',
      issueIdentifier: 'ONE-268',
      confirmFullReset: true,
    });
    expect(fullReset.didFullReset).toBe(true);
    expect(fullReset.message).toContain('fully reset');

    const preview = buildCanonicalLinkAutofixPreview({
      linksText: completeDraft.dependencyIssueLinksText,
    });
    expect(preview.correctedOutput).toBe([
      '/ONE/issues/ONE-267',
      '/ONE/issues/ONE-266#comment-12',
      '/ONE/issues/ONE-241#document-plan',
    ].join('\n'));
  });

  it('validates remediation playbook drafts and supports safe/full reset behavior', () => {
    const draft = getDefaultRemediationPlaybookDraft({
      anomalyId: 'anom-a',
      issueIdentifier: 'ONE-269',
      category: 'missing',
    });
    const incomplete = validateRemediationPlaybookDraft(draft);
    expect(incomplete.isComplete).toBe(false);
    expect(incomplete.missingFields).toEqual([
      'summary',
      'owner',
      'eta',
      'dependencyIssueLinks',
    ]);

    const completeDraft = {
      ...draft,
      summary: 'Backfill missing branch metadata before handoff.',
      owner: 'Frontend Engineer',
      eta: '2026-03-21T15:00:00.000Z',
      dependencyIssueLinksText: '/issues/ONE-263\n/ONE/issues/ONE-262#comment-12\n/ONE/issues/ONE-241',
      updatedAt: '2026-03-19T06:20:00.000Z',
    };
    const complete = validateRemediationPlaybookDraft(completeDraft);
    expect(complete.isComplete).toBe(true);
    expect(complete.dependencyIssueLinks).toEqual([
      '/ONE/issues/ONE-241',
      '/ONE/issues/ONE-262#comment-12',
      '/ONE/issues/ONE-263',
    ]);

    const upserted = upsertRemediationPlaybookDraft({
      drafts: [],
      draft: completeDraft,
    });
    expect(upserted).toHaveLength(1);
    expect(upserted[0].anomalyId).toBe('anom-a');

    const safeReset = resetRemediationPlaybookDraftSafe({
      anomalyId: 'anom-a',
      issueIdentifier: 'ONE-269',
      category: 'missing',
      confirmFullReset: false,
    });
    expect(safeReset.didFullReset).toBe(false);
    expect(safeReset.message).toContain('remain staged');

    const fullReset = resetRemediationPlaybookDraftSafe({
      anomalyId: 'anom-a',
      issueIdentifier: 'ONE-269',
      category: 'missing',
      confirmFullReset: true,
    });
    expect(fullReset.didFullReset).toBe(true);
    expect(fullReset.message).toContain('memory reset');
  });

  it('validates evidence packet checklist required fields and resets blocker fields when prMode changes', () => {
    const incomplete = validateEvidencePacketLintChecklistDraft(getDefaultEvidencePacketLintChecklistDraft());
    expect(incomplete.isComplete).toBe(false);
    expect(incomplete.errors.some((error) => error.includes('placeholder'))).toBe(true);
    expect(incomplete.missingFields).toEqual([
      'branch',
      'testCommand',
      'artifactPath',
      'dependencyIssueLinks',
      'blockerOwner',
      'blockerEta',
    ]);

    const complete = validateEvidencePacketLintChecklistDraft({
      branch: 'feature/one-259-evidence-lint',
      fullSha: '1234567890abcdef1234567890abcdef12345678',
      prMode: 'no_pr_yet',
      testCommand: 'npm run test -- test/frontend.wave1.spec.ts',
      artifactPath: 'artifacts/one-259/evidence-lint-console.txt',
      dependencyIssueLinksText: '/issues/ONE-258#comment-91\n/ONE/issues/ONE-257#document-plan\n/ONE/issues/ONE-241',
      blockerOwner: 'GitHub Admin / DevOps',
      blockerEta: '2026-03-20T18:00:00.000Z',
    });
    expect(complete.isComplete).toBe(true);
    expect(complete.dependencyIssueLinks).toEqual([
      '/ONE/issues/ONE-241',
      '/ONE/issues/ONE-257#document-plan',
      '/ONE/issues/ONE-258#comment-91',
    ]);

    const switchedMode = applyEvidencePacketLintChecklistPrMode({
      draft: {
        branch: 'feature/one-259-evidence-lint',
        fullSha: '1234567890abcdef1234567890abcdef12345678',
        prMode: 'no_pr_yet',
        testCommand: 'npm run test -- test/frontend.wave1.spec.ts',
        artifactPath: 'artifacts/one-259/evidence-lint-console.txt',
        dependencyIssueLinksText: '/ONE/issues/ONE-258',
        blockerOwner: 'GitHub Admin / DevOps',
        blockerEta: '2026-03-20T18:00:00.000Z',
      },
      prMode: 'pr_link',
    });
    expect(switchedMode.blockerOwner).toBe('');
    expect(switchedMode.blockerEta).toBe('');

    const safeReset = resetEvidencePacketLintChecklistDraftSafe({
      activeFilter: 'warning',
      activeFindingId: 'finding-b',
      confirmFullReset: false,
    });
    expect(safeReset.didFullReset).toBe(false);
    expect(safeReset.activeFilter).toBe('warning');
    expect(safeReset.activeFindingId).toBe('finding-b');
    expect(safeReset.message).toContain('preserved');
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

  it('builds remediation manifest drillboard rows in deterministic tuple order', () => {
    const board = buildRemediationManifestDrillboard({
      rows: [
        {
          id: 'row-c',
          issueIdentifier: 'ONE-309',
          runbookStepCode: 'STEP-20',
          artifactPath: 'artifacts/one-309/c.md',
          priorityWeight: 2,
          dependencyDepth: 3,
          blockerClass: 'contract_gap',
          createdAt: '2026-03-19T03:00:00.000Z',
        },
        {
          id: 'row-a',
          issueIdentifier: 'ONE-301',
          runbookStepCode: 'STEP-05',
          artifactPath: 'artifacts/one-301/a.md',
          priorityWeight: 1,
          dependencyDepth: 1,
          blockerClass: 'credential_blocker',
          createdAt: '2026-03-19T01:00:00.000Z',
        },
        {
          id: 'row-b',
          issueIdentifier: 'ONE-302',
          runbookStepCode: 'STEP-01',
          artifactPath: 'artifacts/one-302/b.md',
          priorityWeight: 1,
          dependencyDepth: 2,
          blockerClass: 'artifact_missing',
          createdAt: '2026-03-19T02:00:00.000Z',
        },
      ],
      activeRowId: '',
    });

    expect(board.contract).toBe('settlement-remediation-manifest-drillboard.v1');
    expect(board.rows.map((row) => row.id)).toEqual(['row-a', 'row-b', 'row-c']);
    expect(board.activeRowId).toBe('row-a');
  });

  it('builds dependency graph inspector with canonical class grouping and deterministic sorting', () => {
    const graph = buildRemediationDependencyGraphInspector({
      rows: [
        {
          id: 'node-z',
          issueIdentifier: 'ONE-340',
          blockerClass: 'qa_gate_pending',
          createdAt: '2026-03-19T04:00:00.000Z',
          summary: 'QA dependency pending',
        },
        {
          id: 'node-a',
          issueIdentifier: 'ONE-301',
          blockerClass: 'credential_blocker',
          createdAt: '2026-03-19T02:00:00.000Z',
          summary: 'Credential rotation pending',
        },
        {
          id: 'node-b',
          issueIdentifier: 'ONE-302',
          blockerClass: 'credential_blocker',
          createdAt: '2026-03-19T03:00:00.000Z',
          summary: 'Credential secret sync pending',
        },
        {
          id: 'node-c',
          issueIdentifier: 'ONE-399',
          blockerClass: 'link_noncanonical',
          createdAt: '2026-03-19T01:00:00.000Z',
          summary: 'Link normalization pending',
        },
      ],
      activeNodeId: '',
    });

    expect(graph.contract).toBe('settlement-remediation-dependency-graph-inspector.v1');
    expect(graph.nodes.map((node) => node.id)).toEqual(['node-a', 'node-b', 'node-z', 'node-c']);
    expect(graph.classCounts).toEqual({
      credential_blocker: 2,
      contract_gap: 0,
      artifact_missing: 0,
      qa_gate_pending: 1,
      link_noncanonical: 1,
    });
  });

  it('keeps remediation-manifest shortcut mapping and export packet output deterministic across reruns', () => {
    expect(resolveRemediationManifestShortcut({ key: 'm', altKey: true })).toBe('focus_manifest_table');
    expect(resolveRemediationManifestShortcut({ key: 'J', altKey: true, shiftKey: true })).toBe('next_row');
    expect(resolveRemediationManifestShortcut({ key: 'K', altKey: true, shiftKey: true })).toBe('prev_row');
    expect(resolveRemediationManifestShortcut({ key: 'g', ctrlKey: true, shiftKey: true })).toBe('open_dependency_graph');
    expect(resolveRemediationManifestShortcut({ key: 'e', ctrlKey: true, shiftKey: true })).toBe('export_handoff_packet');

    const board = buildRemediationManifestDrillboard({
      rows: [
        {
          id: 'row-a',
          issueIdentifier: 'ONE-301',
          runbookStepCode: 'STEP-05',
          artifactPath: 'artifacts/one-301/a.md',
          priorityWeight: 1,
          dependencyDepth: 1,
          blockerClass: 'credential_blocker',
          createdAt: '2026-03-19T01:00:00.000Z',
        },
        {
          id: 'row-b',
          issueIdentifier: 'ONE-302',
          runbookStepCode: 'STEP-07',
          artifactPath: 'artifacts/one-302/b.md',
          priorityWeight: 2,
          dependencyDepth: 1,
          blockerClass: 'contract_gap',
          createdAt: '2026-03-19T02:00:00.000Z',
        },
      ],
      activeRowId: '',
    });
    const dependencyLinksText = '/issues/ONE-281\n/issues/ONE-269#document-plan\n/issues/ONE-279#comment-12';
    const firstPacket = buildRemediationManifestHandoffPacket({
      drillboardRows: board.rows,
      dependencyLinksText,
    });
    const secondPacket = buildRemediationManifestHandoffPacket({
      drillboardRows: board.rows,
      dependencyLinksText,
    });

    expect(secondPacket).toBe(firstPacket);
    expect(firstPacket).toContain('/ONE/issues/ONE-281');
    expect(firstPacket).toContain('/ONE/issues/ONE-269#document-plan');
  });

  it('builds evidence-package diff studio rows in deterministic tuple order', () => {
    const studio = buildEvidencePackageDiffStudio({
      baselinePackage: [
        {
          issueIdentifier: 'ONE-410',
          severityWeight: 2,
          packageSectionWeight: 2,
          artifactType: 'timeline',
          artifactPath: 'artifacts/one-410/timeline.json',
          checksum: 'sha-old-410',
        },
        {
          issueIdentifier: 'ONE-402',
          severityWeight: 1,
          packageSectionWeight: 3,
          artifactType: 'playbook',
          artifactPath: 'artifacts/one-402/playbook.md',
          checksum: 'sha-old-402',
        },
      ],
      candidatePackage: [
        {
          issueIdentifier: 'ONE-410',
          severityWeight: 2,
          packageSectionWeight: 2,
          artifactType: 'timeline',
          artifactPath: 'artifacts/one-410/timeline.json',
          checksum: 'sha-new-410',
        },
        {
          issueIdentifier: 'ONE-401',
          severityWeight: 1,
          packageSectionWeight: 1,
          artifactType: 'json',
          artifactPath: 'artifacts/one-401/preflight.json',
          checksum: 'sha-new-401',
        },
      ],
      activeRowId: '',
    });

    expect(studio.contract).toBe('settlement-evidence-package-diff-studio.v1');
    expect(studio.rows.map((row) => row.id)).toEqual([
      'ONE-401|json|artifacts/one-401/preflight.json',
      'ONE-402|playbook|artifacts/one-402/playbook.md',
      'ONE-410|timeline|artifacts/one-410/timeline.json',
    ]);
    expect(studio.rows.map((row) => row.changeType)).toEqual(['added', 'removed', 'modified']);
    expect(studio.changeCounts).toEqual({
      added: 1,
      removed: 1,
      modified: 1,
      unchanged: 0,
    });
  });

  it('supports ONE-285 keyboard workflow and deterministic selection movement', () => {
    expect(resolveEvidencePackageDiffStudioShortcut({ key: 'd', altKey: true })).toBe('focus_diff_studio');
    expect(resolveEvidencePackageDiffStudioShortcut({ key: 'N', altKey: true, shiftKey: true })).toBe('next_diff');
    expect(resolveEvidencePackageDiffStudioShortcut({ key: 'P', altKey: true, shiftKey: true })).toBe('prev_diff');
    expect(resolveEvidencePackageDiffStudioShortcut({ key: 'Q', ctrlKey: true, shiftKey: true })).toBe('open_qa_preflight');
    expect(resolveEvidencePackageDiffStudioShortcut({ key: 'Enter', ctrlKey: true, shiftKey: true })).toBe('run_full_preflight');

    const rows = buildEvidencePackageDiffStudio({
      baselinePackage: [],
      candidatePackage: [
        {
          issueIdentifier: 'ONE-401',
          severityWeight: 1,
          packageSectionWeight: 1,
          artifactType: 'json',
          artifactPath: 'artifacts/one-401/preflight.json',
          checksum: 'sha-a',
        },
        {
          issueIdentifier: 'ONE-402',
          severityWeight: 1,
          packageSectionWeight: 2,
          artifactType: 'timeline',
          artifactPath: 'artifacts/one-402/timeline.json',
          checksum: 'sha-b',
        },
      ],
      activeRowId: '',
    }).rows;

    const first = rows[0].id;
    const second = moveEvidencePackageDiffSelection({
      rows,
      activeRowId: first,
      direction: 'next',
    });
    expect(second).toBe(rows[1].id);
    expect(moveEvidencePackageDiffSelection({
      rows,
      activeRowId: second,
      direction: 'prev',
    })).toBe(first);
  });

  it('keeps QA preflight summary and canonical-link autofix output stable across reruns', () => {
    const links = [
      '/issues/one-285',
      '/ONE/issues/ONE-279#comment-88',
      '/ONE/issues/ONE-241#document-plan',
      'not-a-link',
    ];
    const preview = buildQaCanonicalLinkAutofixPreview({ links });

    expect(preview.correctedOutput).toContain('/ONE/issues/ONE-285');
    expect(preview.changedCount).toBe(1);
    expect(preview.invalidCount).toBe(1);

    const first = buildQaHandoffPreflightSummary({
      requiredEvidence: [
        'artifacts/one-285/evidence-package-diff-studio.md',
        'artifacts/one-285/qa-preflight-summary.json',
      ],
      providedEvidence: [
        'artifacts/one-285/evidence-package-diff-studio.md',
      ],
      dependencyIssueLinks: [
        '/issues/one-284',
        '/ONE/issues/ONE-279',
      ],
      exportLinks: links,
    });
    const second = buildQaHandoffPreflightSummary({
      requiredEvidence: [
        'artifacts/one-285/evidence-package-diff-studio.md',
        'artifacts/one-285/qa-preflight-summary.json',
      ],
      providedEvidence: [
        'artifacts/one-285/evidence-package-diff-studio.md',
      ],
      dependencyIssueLinks: [
        '/issues/one-284',
        '/ONE/issues/ONE-279',
      ],
      exportLinks: links,
    });

    expect(first.missingEvidence).toEqual(['artifacts/one-285/qa-preflight-summary.json']);
    expect(first.readyForQa).toBe(false);
    expect(first.linkViolations).toHaveLength(1);
    expect(first.dependencyViolations).toHaveLength(0);
    expect(second.stableSummaryJson).toBe(first.stableSummaryJson);
  });
});
