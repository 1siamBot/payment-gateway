import {
  activateExceptionSavedView,
  applyRefundStatus,
  buildExceptionQueryFromSavedView,
  buildExceptionBulkPreview,
  applyExceptionQueryPreset,
  applyExceptionActionOptimistic,
  buildExceptionCompareDrawerModel,
  buildExceptionBulkDiffInspector,
  buildExceptionBulkConfirmation,
  buildExceptionReasonQuickActions,
  buildExceptionReasonTimeline,
  buildExceptionActionIdempotencyKey,
  classifyExceptionActionFailure,
  createExceptionSavedView,
  DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
  deleteExceptionSavedView,
  DEFAULT_EXCEPTION_QUERY_STATE,
  pinExceptionSavedView,
  renameExceptionSavedView,
  restoreExceptionSavedViewState,
  serializeExceptionSavedViewState,
  canRefundStatus,
  filterSettlementMerchants,
  parseExceptionQueryState,
  resetExceptionCompareState,
  resolveExceptionDecisionNoteShortcut,
  resolveExceptionDecisionNoteTemplate,
  normalizeExceptionStatus,
  normalizeOptional,
  moveExceptionDiffInspectorFocus,
  prependExceptionAudit,
  resolveActiveExceptionPreset,
  resolveExceptionConflictShortcutDrilldown,
  resolveExceptionDiffInspectorEmptyState,
  serializeExceptionQueryState,
  filterExceptionDiffInspectorRows,
  validateExceptionActionInput,
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

  it('builds deterministic compare drawer ordering across selection order', () => {
    const inspector = buildExceptionBulkDiffInspector([
      {
        id: 'exc-b',
        merchantId: 'm-b',
        provider: 'mock-b',
        status: 'open',
        version: 2,
        currentAmount: 300,
        incomingAmount: 210,
        incomingStatus: 'investigating',
        incomingVersion: 1,
        mismatchCount: 2,
      },
      {
        id: 'exc-a',
        merchantId: 'm-a',
        provider: 'mock-a',
        status: 'open',
        version: 3,
        currentAmount: 500,
        incomingAmount: 450,
        incomingStatus: 'open',
        incomingVersion: 3,
        mismatchCount: 1,
      },
    ]);

    const compareA = buildExceptionCompareDrawerModel({
      rows: inspector.rows,
      selectedRowIds: ['exc-b', 'exc-a'],
    });
    const compareB = buildExceptionCompareDrawerModel({
      rows: inspector.rows,
      selectedRowIds: ['exc-a', 'exc-b'],
    });

    expect(compareA.rowIds).toEqual(['exc-a', 'exc-b']);
    expect(compareB.rowIds).toEqual(['exc-a', 'exc-b']);
    expect(compareA.fieldOrder).toEqual(['amount', 'status', 'updatedAt', 'version']);
  });

  it('maps reason quick actions with stable reason order and compare candidates', () => {
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
    const actions = buildExceptionReasonQuickActions(inspector.rows);

    expect(actions.map((item) => item.reason)).toEqual(['stale_version', 'malformed', 'high_delta', 'mixed_status']);
    expect(actions.find((item) => item.reason === 'stale_version')?.compareRowIds).toEqual(['exc-a']);
    expect(actions.find((item) => item.reason === 'malformed')?.compareRowIds).toEqual(['malformed-3']);
    expect(actions.find((item) => item.reason === 'stale_version')?.shortcut).toBe('1');
  });

  it('resets compare state without mutating selected exception ids', () => {
    const selectedExceptionIds = ['exc-1', 'exc-2', 'exc-3'];
    const resetState = resetExceptionCompareState({
      selectedExceptionIds,
      activeTimelineRowId: 'exc-2',
    });

    expect(resetState.selectedExceptionIds).toEqual(selectedExceptionIds);
    expect(resetState.compareRowIds).toEqual([]);
    expect(resetState.decisionNoteDraft).toBe('');
    expect(resetState.decisionNoteReason).toBe('');
    expect(resetState.activeTimelineRowId).toBe('exc-2');
    expect(resetState.selectedExceptionIds).not.toBe(selectedExceptionIds);
  });

  it('builds deterministic reason timeline ordering for selected anomaly row', () => {
    const inspector = buildExceptionBulkDiffInspector([
      {
        id: 'exc-a',
        merchantId: 'm-a',
        provider: 'mock-a',
        status: 'open',
        version: 3,
        updatedAt: '2026-03-18T08:00:00.000Z',
        currentAmount: 500,
        incomingAmount: 350,
        incomingStatus: 'investigating',
        incomingVersion: 2,
        incomingUpdatedAt: '2026-03-18T08:01:00.000Z',
        mismatchCount: 4,
      },
    ]);

    const first = buildExceptionReasonTimeline({
      rows: inspector.rows,
      activeRowId: 'exc-a',
    });
    const second = buildExceptionReasonTimeline({
      rows: inspector.rows,
      activeRowId: 'exc-a',
    });

    expect(first).toEqual(second);
    expect(first.map((entry) => entry.reason)).toEqual(['mixed_status', 'stale_version', 'high_delta']);
    expect(first.map((entry) => entry.severity)).toEqual(['warning', 'critical', 'warning']);
    expect(first[0].timestampLabel).toBe(first[0].occurredAt);
  });

  it('maps note templates and shortcuts to deterministic reason buckets', () => {
    const staleTemplate = resolveExceptionDecisionNoteTemplate('stale_version');
    const malformedTemplate = resolveExceptionDecisionNoteTemplate('malformed');

    expect(staleTemplate.shortcut).toBe('1');
    expect(staleTemplate.body).toContain('stale_version');
    expect(malformedTemplate.shortcut).toBe('2');
    expect(malformedTemplate.body).toContain('malformed');
    expect(resolveExceptionDecisionNoteShortcut('1')).toBe('stale_version');
    expect(resolveExceptionDecisionNoteShortcut('4')).toBe('mixed_status');
    expect(resolveExceptionDecisionNoteShortcut('0')).toBeNull();
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
