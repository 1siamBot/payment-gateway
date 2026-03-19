export type RefundableStatus = 'CREATED' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export function canRefundStatus(status: RefundableStatus): boolean {
  return status === 'PAID';
}

export function applyRefundStatus<T extends { reference: string; status: RefundableStatus }>(
  rows: T[],
  reference: string,
): T[] {
  return rows.map((row) => {
    if (row.reference !== reference) {
      return row;
    }
    return {
      ...row,
      status: 'REFUNDED',
    };
  });
}

export type SettlementMerchantSummary = {
  merchantId: string;
  paidDepositAmount: number;
  paidWithdrawAmount: number;
  refundedAmount: number;
  netSettledAmount: number;
  transactionCount: number;
};

export function filterSettlementMerchants(
  merchants: SettlementMerchantSummary[],
  merchantId?: string,
): SettlementMerchantSummary[] {
  const normalized = merchantId?.trim();
  if (!normalized) {
    return merchants;
  }
  return merchants.filter((row) => row.merchantId === normalized);
}

export type ExceptionStatus = 'open' | 'investigating' | 'resolved' | 'ignored';
export type ExceptionAction = 'resolve' | 'ignore';
export type ExceptionActionErrorKind = 'version_conflict' | 'permission' | 'transient' | 'unknown';
export type ExceptionPresetKey = 'open' | 'investigating' | 'resolved' | 'ignored' | 'high_risk_merchant';

export type SettlementExceptionRow = {
  id: string;
  merchantId: string;
  provider: string;
  status: ExceptionStatus;
  updatedAt: string;
};

export type SettlementExceptionAuditEntry = {
  id: string;
  action: ExceptionAction;
  reason: string;
  note: string | null;
  actor: string;
  createdAt: string;
};

export function normalizeOptional(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export type ExceptionRiskBucket = 'high' | 'medium' | 'low';

export type ExceptionBulkPreview = {
  selectedCount: number;
  validCount: number;
  malformedCount: number;
  isEmpty: boolean;
  statusCounts: Record<ExceptionStatus, number>;
  riskCounts: Record<ExceptionRiskBucket, number>;
  warnings: string[];
  emptyMessage: string;
  malformedMessage: string | null;
  recoveryHint: string;
  csvPreview: string;
  jsonPreview: string;
};

export type ExceptionBulkConfirmation = {
  action: ExceptionAction;
  selectedCount: number;
  validCount: number;
  malformedCount: number;
  staleSelectionCount: number;
  statusCounts: Record<ExceptionStatus, number>;
  riskCounts: Record<ExceptionRiskBucket, number>;
  hasFallback: boolean;
  fallbackTitle: string;
  fallbackMessage: string;
  needsRollbackHint: boolean;
  rollbackHint: string;
  canConfirm: boolean;
};

export type ExceptionDiffField = 'amount' | 'status' | 'updatedAt' | 'version';
export type ExceptionConflictReason = 'stale_version' | 'malformed' | 'high_delta' | 'mixed_status';
export type ExceptionConflictDrilldownKey = 'all' | ExceptionConflictReason;

export type ExceptionDiffDelta = {
  field: ExceptionDiffField;
  current: string | number;
  incoming: string | number;
  changed: boolean;
};

export type ExceptionDiffInspectorRow = {
  id: string;
  merchantId: string;
  provider: string;
  deltas: ExceptionDiffDelta[];
  reasons: ExceptionConflictReason[];
};

export type ExceptionBulkDiffInspector = {
  rows: ExceptionDiffInspectorRow[];
  reasonCounts: Record<ExceptionConflictReason, number>;
};

export type ExceptionSimulationOutcomeBucketKey =
  | 'success_projection'
  | 'conflict_projection'
  | 'rollback_recommended';
export type ScenarioCompareGroupKey =
  | ExceptionSimulationOutcomeBucketKey
  | 'unknown_input';
export type ScenarioCompareMatrixFilterKey = 'all' | ScenarioCompareGroupKey;
export type ExceptionRollbackPlanReasonCode =
  | 'MALFORMED_ROW'
  | 'STALE_VERSION_RISK'
  | 'MIXED_STATUS_SELECTION'
  | 'HIGH_DELTA_ANOMALY';
export type ExceptionRollbackPlanReasonSeverity = 'warning' | 'critical';
export type ExceptionSimulationReasonDrilldownKey = 'all' | ExceptionRollbackPlanReasonCode;

export type ExceptionSimulationOutcomeBucket = {
  key: ExceptionSimulationOutcomeBucketKey;
  label: string;
  description: string;
  count: number;
};

export type ExceptionSimulationOutcomeRow = {
  id: string;
  merchantId: string;
  provider: string;
  bucket: ExceptionSimulationOutcomeBucketKey;
  reasonCodes: ExceptionRollbackPlanReasonCode[];
};

export type ExceptionSimulationOutcomeReason = {
  code: ExceptionRollbackPlanReasonCode;
  severity: ExceptionRollbackPlanReasonSeverity;
  description: string;
  nextStep: string;
  count: number;
};

export type ExceptionSimulationOutcomePanel = {
  contract: 'settlement-bulk-simulation-outcome.v1';
  selectedCount: number;
  validCount: number;
  malformedCount: number;
  buckets: ExceptionSimulationOutcomeBucket[];
  rows: ExceptionSimulationOutcomeRow[];
  reasonCodes: ExceptionSimulationOutcomeReason[];
  fallback: {
    active: boolean;
    title: string;
    message: string;
    resetActionLabel: string;
  };
};

export type ScenarioCompareMatrixColumnKey =
  | 'mismatch_count'
  | 'current_amount'
  | 'incoming_amount'
  | 'version_gap';

export type ScenarioCompareMatrixRow = {
  id: string;
  merchantId: string;
  provider: string;
  group: ScenarioCompareGroupKey;
  reasonTags: ExceptionRollbackPlanReasonCode[];
  recommendedActionHint: string;
  columnValues: Record<ScenarioCompareMatrixColumnKey, string | number>;
};

export type ScenarioCompareMatrixGroup = {
  key: ScenarioCompareGroupKey;
  label: string;
  description: string;
  rowCount: number;
  rows: ScenarioCompareMatrixRow[];
};

export type ScenarioCompareMatrix = {
  contract: 'settlement-scenario-compare-matrix.v1';
  selectedCount: number;
  validCount: number;
  malformedCount: number;
  columns: ScenarioCompareMatrixColumnKey[];
  groups: ScenarioCompareMatrixGroup[];
  rows: ScenarioCompareMatrixRow[];
};

export type OperatorDecisionQueueItem = {
  id: string;
  rowId: string;
  merchantId: string;
  provider: string;
  group: ScenarioCompareGroupKey;
  reasonTags: ExceptionRollbackPlanReasonCode[];
  recommendedActionHint: string;
};

export type OperatorDecisionQueue = {
  contract: 'settlement-operator-decision-queue.v1';
  stagedCount: number;
  missingRowCount: number;
  items: OperatorDecisionQueueItem[];
};

export type ReviewQueuePriority = 'critical' | 'high' | 'medium' | 'low';
export type ReviewQueueLedgerFilterKey = 'all' | ReviewQueuePriority;
export type ReviewQueueLedgerShortcut =
  | 'next_row'
  | 'prev_row'
  | 'focus_handoff_packet'
  | 'validate_handoff_packet';

export type ReviewQueueLedgerRow = {
  id: string;
  merchantId: string;
  provider: string;
  priority: ReviewQueuePriority;
  eventTime: string;
  title: string;
  sourceRowId: string;
};

export type ReviewQueueLedger = {
  contract: 'settlement-review-queue-ledger.v1';
  rows: ReviewQueueLedgerRow[];
  priorityCounts: Record<ReviewQueuePriority, number>;
  activeRowId: string;
};

export type ReviewQueueHandoffMode = 'pr' | 'no_pr';

export type ReviewQueueHandoffPacketDraft = {
  branch: string;
  fullSha: string;
  mode: ReviewQueueHandoffMode;
  prLink: string;
  blockerOwner: string;
  eta: string;
  artifactPathsText: string;
  dependentIssueLinksText: string;
};

export type ReviewQueueHandoffPacketValidation = {
  isComplete: boolean;
  errors: string[];
  missingFields: string[];
  artifactPaths: string[];
  dependentIssueLinks: string[];
};

export type LineageReplayNavigatorFilterKey = 'all' | 'with_artifact' | 'without_artifact';
export type LineageReplayNavigatorShortcut =
  | 'focus_lineage_navigator'
  | 'next_row'
  | 'prev_row'
  | 'validate_evidence_packet';

export type LineageReplayNavigatorRow = {
  id: string;
  lineageDepth: number;
  sourceTypePriority: number;
  sourceIssueId: string;
  artifactPath: string;
};

export type LineageReplayNavigator = {
  contract: 'settlement-lineage-replay-navigator.v1';
  cursorVersion: string;
  windowStart: string;
  windowEnd: string;
  rows: LineageReplayNavigatorRow[];
  activeFilter: LineageReplayNavigatorFilterKey;
  activeRowId: string;
};

export type QaEvidencePacketComposerMode = 'pr' | 'no_pr';

export type QaEvidencePacketComposerDraft = {
  branch: string;
  fullSha: string;
  mode: QaEvidencePacketComposerMode;
  prLink: string;
  blockerOwner: string;
  eta: string;
  testCommandSummary: string;
  artifactPathsText: string;
  dependencyIssueLinksText: string;
};

export type QaEvidencePacketComposerValidation = {
  isComplete: boolean;
  errors: string[];
  missingFields: string[];
  artifactPaths: string[];
  dependencyIssueLinks: string[];
};

export type EvidenceDiffRailFilterKey = 'all' | 'changed' | 'unchanged';
export type EvidenceDiffRailShortcut =
  | 'next_row'
  | 'prev_row'
  | 'focus_blocker_register'
  | 'validate_blocker_register';

export type EvidenceDiffRailRow = {
  id: string;
  sectionPriority: number;
  fieldKey: string;
  currentValue: string;
  previousValue: string;
  changed: boolean;
};

export type EvidenceDiffRail = {
  contract: 'settlement-evidence-diff-rail.v1';
  rows: EvidenceDiffRailRow[];
  changedCount: number;
  unchangedCount: number;
  activeRowId: string;
  activeFilter: EvidenceDiffRailFilterKey;
};

export type BlockerOwnershipRegisterDraft = {
  blockerOwner: string;
  eta: string;
  dependencyIssueLinksText: string;
  retryTimestamp: string;
  note: string;
};

export type BlockerOwnershipRegisterValidation = {
  isComplete: boolean;
  errors: string[];
  missingFields: string[];
  dependencyIssueLinks: string[];
  serializedDraft: string;
};

export type IncidentBookmarkSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentBookmarkFilterKey = 'all' | IncidentBookmarkSeverity;

export type IncidentBookmarkShelfItem = {
  id: string;
  merchantId: string;
  provider: string;
  severity: IncidentBookmarkSeverity;
  updatedAt: string;
  title: string;
  status: ExceptionStatus;
  amount: number;
  riskFlags: string[];
};

export type IncidentBookmarkShelf = {
  contract: 'settlement-incident-bookmark-shelf.v1';
  totalCount: number;
  severityCounts: Record<IncidentBookmarkSeverity, number>;
  items: IncidentBookmarkShelfItem[];
};

export type ReplayChecklistStep = {
  id: string;
  label: string;
  completed: boolean;
};

export type ReplayChecklistDrawer = {
  contract: 'settlement-replay-checklist-drawer.v1';
  bookmark: IncidentBookmarkShelfItem | null;
  steps: ReplayChecklistStep[];
  focusedStepId: string;
  noteDraft: string;
  emptyMessage: string | null;
};

export type ReplayBookmarkCompareShortcut = 'select_prev' | 'select_next' | 'swap' | 'clear_draft';

export type ReplayBookmarkCompareStrip = {
  contract: 'settlement-replay-bookmark-compare-strip.v1';
  items: IncidentBookmarkShelfItem[];
  activeBookmarkId: string;
  primaryBookmark: IncidentBookmarkShelfItem | null;
  secondaryBookmark: IncidentBookmarkShelfItem | null;
  canCompare: boolean;
};

export type ReplayDeltaField = 'status' | 'amount' | 'riskFlags' | 'updatedAt';

export type ReplayDeltaInspectorRow = {
  field: ReplayDeltaField;
  primaryValue: string;
  secondaryValue: string;
  changed: boolean;
};

export type ReplayDeltaInspector = {
  contract: 'settlement-replay-delta-inspector.v1';
  primaryBookmark: IncidentBookmarkShelfItem | null;
  secondaryBookmark: IncidentBookmarkShelfItem | null;
  rows: ReplayDeltaInspectorRow[];
  canCompare: boolean;
  emptyMessage: string | null;
};

export type OperatorTimelinePresetKey = 'baseline' | 'candidate' | 'override';
export type OperatorTimelineShortcut =
  | 'tick_prev'
  | 'tick_next'
  | 'cycle_preset'
  | 'pin_override'
  | 'clear_draft';

export type OperatorTimelineTick = {
  id: string;
  eventAt: string;
  severity: IncidentBookmarkSeverity;
  title: string;
  bookmark: IncidentBookmarkShelfItem;
};

export type OperatorTimelineSnapshot = {
  id: string;
  eventAt: string;
  severity: IncidentBookmarkSeverity;
  status: ExceptionStatus;
  amount: string;
  riskFlags: string[];
  title: string;
};

export type OperatorTimelineComparePresetSlot = {
  key: OperatorTimelinePresetKey;
  tickId: string;
  snapshot: OperatorTimelineSnapshot | null;
  serializedSnapshot: string;
};

export type OperatorTimelineScrubber = {
  contract: 'settlement-operator-timeline-scrubber.v1';
  ticks: OperatorTimelineTick[];
  activeTickId: string;
  activePreset: OperatorTimelinePresetKey;
  compareSlots: OperatorTimelineComparePresetSlot[];
};

type ExceptionBulkPreviewRow = {
  id: string;
  merchantId: string;
  provider: string;
  status: ExceptionStatus;
  mismatchCount: number;
  version: number;
  updatedAt: string;
  amount: number;
  incomingAmount: number;
  incomingStatus: ExceptionStatus;
  incomingUpdatedAt: string;
  incomingVersion: number;
};

const DIFF_FIELD_ORDER: ExceptionDiffField[] = ['amount', 'status', 'updatedAt', 'version'];
const CONFLICT_REASON_ORDER: ExceptionConflictReason[] = ['stale_version', 'malformed', 'high_delta', 'mixed_status'];
const DIFF_FALLBACK_TIMESTAMP = '2026-03-18T00:00:00.000Z';
const SIMULATION_BUCKET_ORDER: ExceptionSimulationOutcomeBucketKey[] = [
  'success_projection',
  'conflict_projection',
  'rollback_recommended',
];
const SCENARIO_GROUP_ORDER: ScenarioCompareGroupKey[] = [
  'success_projection',
  'conflict_projection',
  'rollback_recommended',
  'unknown_input',
];
const SCENARIO_MATRIX_COLUMN_ORDER: ScenarioCompareMatrixColumnKey[] = [
  'mismatch_count',
  'current_amount',
  'incoming_amount',
  'version_gap',
];
const ROLLBACK_REASON_CODE_ORDER: ExceptionRollbackPlanReasonCode[] = [
  'MALFORMED_ROW',
  'STALE_VERSION_RISK',
  'MIXED_STATUS_SELECTION',
  'HIGH_DELTA_ANOMALY',
];
const ROLLBACK_REASON_METADATA: Record<ExceptionRollbackPlanReasonCode, {
  severity: ExceptionRollbackPlanReasonSeverity;
  description: string;
  nextStep: string;
}> = {
  MALFORMED_ROW: {
    severity: 'critical',
    description: 'Input contains malformed rows and cannot be trusted for apply-time simulation.',
    nextStep: 'Run Safe Reset Selection, then reselect only rows with valid id/merchant/provider fields.',
  },
  STALE_VERSION_RISK: {
    severity: 'warning',
    description: 'Incoming version is older than current row version and may overwrite newer state.',
    nextStep: 'Refresh the exception list and rerun simulation before confirming any bulk action.',
  },
  MIXED_STATUS_SELECTION: {
    severity: 'warning',
    description: 'Selection spans multiple statuses and should be split for deterministic operator review.',
    nextStep: 'Split rows by status and simulate each subset separately before confirmation.',
  },
  HIGH_DELTA_ANOMALY: {
    severity: 'critical',
    description: 'Projected amount deltas are high enough to require rollback-first handling.',
    nextStep: 'Open rollback plan, resolve high-delta rows first, and only then continue with normal rows.',
  },
};
const SIMULATION_BUCKET_METADATA: Record<ExceptionSimulationOutcomeBucketKey, {
  label: string;
  description: string;
}> = {
  success_projection: {
    label: 'success_projection',
    description: 'Rows with deterministic, low-risk outcomes and no rollback warning signals.',
  },
  conflict_projection: {
    label: 'conflict_projection',
    description: 'Rows with review-required conflicts (stale version or mixed-status transitions).',
  },
  rollback_recommended: {
    label: 'rollback_recommended',
    description: 'Rows or payload signals that should route through rollback planning first.',
  },
};
const INCIDENT_SEVERITY_ORDER: IncidentBookmarkSeverity[] = ['critical', 'high', 'medium', 'low'];
const REVIEW_QUEUE_PRIORITY_ORDER: ReviewQueuePriority[] = ['critical', 'high', 'medium', 'low'];
const REPLAY_DELTA_FIELD_ORDER: ReplayDeltaField[] = ['status', 'amount', 'riskFlags', 'updatedAt'];
const OPERATOR_TIMELINE_PRESET_ORDER: OperatorTimelinePresetKey[] = ['baseline', 'candidate', 'override'];
const DEFAULT_REPLAY_CHECKLIST_STEPS = [
  { id: 'load_context', label: 'Load bookmark context into replay scope.' },
  { id: 'verify_determinism', label: 'Verify deterministic ordering and incident grouping.' },
  { id: 'confirm_note', label: 'Confirm operator note for replay audit trail.' },
  { id: 'stage_replay', label: 'Stage replay run with current checklist snapshot.' },
] as const;

function parseFiniteNumber(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return input;
  }
  if (typeof input === 'string' && input.trim().length > 0) {
    const parsed = Number(input);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function resolveDateString(input: unknown, fallback: string): string {
  if (typeof input !== 'string' || input.trim().length === 0) {
    return fallback;
  }
  const parsed = new Date(input);
  if (!Number.isFinite(parsed.getTime())) {
    return fallback;
  }
  return parsed.toISOString();
}

function resolveIncomingStatus(status: ExceptionStatus, mismatchCount: number): ExceptionStatus {
  if (status === 'open') {
    return mismatchCount > 0 ? 'investigating' : 'open';
  }
  if (status === 'investigating') {
    return mismatchCount > 0 ? 'investigating' : 'resolved';
  }
  return status;
}

function parseExceptionBulkPreviewRow(raw: unknown): ExceptionBulkPreviewRow | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const id = normalizeOptional(typeof row.id === 'string' ? row.id : String(row.id ?? ''));
  const merchantId = normalizeOptional(typeof row.merchantId === 'string' ? row.merchantId : String(row.merchantId ?? ''));
  const provider = normalizeOptional(typeof row.provider === 'string' ? row.provider : String(row.provider ?? ''));
  const status = normalizeExceptionStatus(row.status);
  const mismatchCount = Number(row.mismatchCount);
  const summary = (row.summary && typeof row.summary === 'object')
    ? row.summary as Record<string, unknown>
    : null;
  const versionRaw = parseFiniteNumber(row.version ?? row.currentVersion);
  const version = versionRaw !== null ? Math.max(1, Math.trunc(versionRaw)) : 1;
  const updatedAt = resolveDateString(row.updatedAt, DIFF_FALLBACK_TIMESTAMP);
  const amountRaw = parseFiniteNumber(row.currentAmount ?? row.amount ?? row.ledgerAmount ?? summary?.ledgerAmount);
  const amount = amountRaw !== null ? amountRaw : (100 + (mismatchCount * 50));
  const incomingAmountRaw = parseFiniteNumber(
    row.incomingAmount ?? row.providerAmount ?? summary?.providerAmount ?? row.nextAmount,
  );
  const incomingAmount = incomingAmountRaw !== null
    ? incomingAmountRaw
    : amount + (mismatchCount * 35);
  const incomingStatusRaw = typeof row.incomingStatus === 'string'
    ? normalizeExceptionStatus(row.incomingStatus)
    : resolveIncomingStatus(status, Math.max(0, mismatchCount));
  const incomingVersionRaw = parseFiniteNumber(row.incomingVersion ?? row.nextVersion);
  const incomingVersion = incomingVersionRaw !== null
    ? Math.max(1, Math.trunc(incomingVersionRaw))
    : (mismatchCount >= 3 ? Math.max(1, version - 1) : version);
  const incomingUpdatedAt = resolveDateString(
    row.incomingUpdatedAt ?? row.nextUpdatedAt,
    incomingVersion < version ? '2026-03-17T23:59:00.000Z' : updatedAt,
  );

  if (!id || !merchantId || !provider) {
    return null;
  }
  if (!Number.isFinite(mismatchCount) || mismatchCount < 0) {
    return null;
  }

  return {
    id,
    merchantId,
    provider,
    status,
    mismatchCount,
    version,
    updatedAt,
    amount,
    incomingAmount,
    incomingStatus: incomingStatusRaw,
    incomingUpdatedAt,
    incomingVersion,
  };
}

function resolveExceptionRiskBucket(row: { mismatchCount: number; status: ExceptionStatus }): ExceptionRiskBucket {
  if (row.status === 'open' && row.mismatchCount >= 3) {
    return 'high';
  }
  if (row.status === 'investigating' || row.mismatchCount >= 1) {
    return 'medium';
  }
  return 'low';
}

export function buildExceptionBulkPreview(selectedRows: unknown[]): ExceptionBulkPreview {
  const statusCounts: Record<ExceptionStatus, number> = {
    open: 0,
    investigating: 0,
    resolved: 0,
    ignored: 0,
  };
  const riskCounts: Record<ExceptionRiskBucket, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };
  const normalizedRows = selectedRows
    .map((row) => parseExceptionBulkPreviewRow(row))
    .filter((row): row is ExceptionBulkPreviewRow => Boolean(row))
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const row of normalizedRows) {
    statusCounts[row.status] += 1;
    riskCounts[resolveExceptionRiskBucket(row)] += 1;
  }

  const malformedCount = selectedRows.length - normalizedRows.length;
  const warnings: string[] = [];
  if (malformedCount > 0) {
    warnings.push(`Malformed selection rows detected: ${malformedCount}.`);
  }
  if (selectedRows.length === 0) {
    warnings.push('No exception rows selected.');
  }

  const csvRows = [
    ['metric', 'value'],
    ['selected_total', String(selectedRows.length)],
    ['valid_rows', String(normalizedRows.length)],
    ['malformed_rows', String(malformedCount)],
    ['status_open', String(statusCounts.open)],
    ['status_investigating', String(statusCounts.investigating)],
    ['status_resolved', String(statusCounts.resolved)],
    ['status_ignored', String(statusCounts.ignored)],
    ['risk_high', String(riskCounts.high)],
    ['risk_medium', String(riskCounts.medium)],
    ['risk_low', String(riskCounts.low)],
  ];
  if (malformedCount > 0) {
    csvRows.push(['warning', 'malformed_rows_present']);
  }

  const csvPreview = csvRows.map((row) => row.join(',')).join('\n');
  const jsonPreview = JSON.stringify({
    selectedTotal: selectedRows.length,
    validRows: normalizedRows.length,
    malformedRows: malformedCount,
    statusCounts,
    riskCounts,
    warnings,
  }, null, 2);

  return {
    selectedCount: selectedRows.length,
    validCount: normalizedRows.length,
    malformedCount,
    isEmpty: selectedRows.length === 0,
    statusCounts,
    riskCounts,
    warnings,
    emptyMessage: 'No rows selected. Select at least one exception to preview bulk actions safely.',
    malformedMessage: malformedCount > 0
      ? `${malformedCount} malformed row(s) are excluded from preview/export until corrected.`
      : null,
    recoveryHint: 'Clear invalid rows or refresh fixture data before confirming bulk action.',
    csvPreview,
    jsonPreview,
  };
}

export function buildExceptionBulkConfirmation(input: {
  action: ExceptionAction;
  preview: ExceptionBulkPreview;
  staleSelectionCount: number;
}): ExceptionBulkConfirmation {
  const staleSelectionCount = Number.isFinite(input.staleSelectionCount)
    ? Math.max(0, Math.trunc(input.staleSelectionCount))
    : 0;
  const hasNoSelection = input.preview.isEmpty;
  const hasMalformedRows = input.preview.malformedCount > 0;
  const hasMixedConflictRisk = input.preview.riskCounts.high > 0
    && (input.preview.riskCounts.medium > 0 || input.preview.riskCounts.low > 0);
  const needsRollbackHint = hasMalformedRows || hasMixedConflictRisk;

  let fallbackTitle = '';
  let fallbackMessage = '';
  if (staleSelectionCount > 0) {
    fallbackTitle = 'Stale selection detected';
    fallbackMessage = `${staleSelectionCount} selected row(s) are no longer in the current fixture scope. Use safe reset before confirming.`;
  } else if (hasNoSelection) {
    fallbackTitle = 'No rows selected';
    fallbackMessage = `${input.preview.emptyMessage} Use safe reset to clear selection state and reselect rows.`;
  } else if (hasMalformedRows) {
    fallbackTitle = 'Malformed rows detected';
    fallbackMessage = `${input.preview.malformedMessage ?? 'Malformed rows are present.'} Use safe reset and reselect only valid rows.`;
  }

  const rollbackHint = hasMalformedRows
    ? 'Rollback hint: malformed rows are excluded. Clear malformed selections and re-run preview before submit.'
    : (hasMixedConflictRisk
      ? 'Rollback hint: mixed high-risk and non-high-risk rows detected. Split actions by risk bucket to keep rollback deterministic.'
      : 'Rollback hint: selection is deterministic and safe for fixture confirmation.');

  const canConfirm = fallbackMessage.length === 0
    && input.preview.validCount > 0;

  return {
    action: input.action,
    selectedCount: input.preview.selectedCount,
    validCount: input.preview.validCount,
    malformedCount: input.preview.malformedCount,
    staleSelectionCount,
    statusCounts: { ...input.preview.statusCounts },
    riskCounts: { ...input.preview.riskCounts },
    hasFallback: fallbackMessage.length > 0,
    fallbackTitle,
    fallbackMessage,
    needsRollbackHint,
    rollbackHint,
    canConfirm,
  };
}

function createZeroSimulationBucketCounts(): Record<ExceptionSimulationOutcomeBucketKey, number> {
  return {
    success_projection: 0,
    conflict_projection: 0,
    rollback_recommended: 0,
  };
}

function createZeroRollbackReasonCounts(): Record<ExceptionRollbackPlanReasonCode, number> {
  return {
    MALFORMED_ROW: 0,
    STALE_VERSION_RISK: 0,
    MIXED_STATUS_SELECTION: 0,
    HIGH_DELTA_ANOMALY: 0,
  };
}

function resolveSimulationReasonCodes(row: ExceptionBulkPreviewRow): ExceptionRollbackPlanReasonCode[] {
  const reasonCodes: ExceptionRollbackPlanReasonCode[] = [];
  if (row.incomingVersion < row.version) {
    reasonCodes.push('STALE_VERSION_RISK');
  }
  if (row.incomingStatus !== row.status) {
    reasonCodes.push('MIXED_STATUS_SELECTION');
  }
  if (Math.abs(row.incomingAmount - row.amount) >= 100) {
    reasonCodes.push('HIGH_DELTA_ANOMALY');
  }
  return reasonCodes;
}

function resolveSimulationBucket(reasonCodes: ExceptionRollbackPlanReasonCode[]): ExceptionSimulationOutcomeBucketKey {
  if (reasonCodes.includes('HIGH_DELTA_ANOMALY')) {
    return 'rollback_recommended';
  }
  if (reasonCodes.length > 0) {
    return 'conflict_projection';
  }
  return 'success_projection';
}

function resolveScenarioGroup(
  reasonCodes: ExceptionRollbackPlanReasonCode[],
): ScenarioCompareGroupKey {
  if (reasonCodes.includes('HIGH_DELTA_ANOMALY')) {
    return 'rollback_recommended';
  }
  if (reasonCodes.length > 0) {
    return 'conflict_projection';
  }
  return 'success_projection';
}

function resolveScenarioGroupMetadata(group: ScenarioCompareGroupKey): {
  label: string;
  description: string;
  recommendedActionHint: string;
} {
  if (group === 'success_projection') {
    return {
      label: 'success_projection',
      description: 'Low-risk rows with deterministic forward action.',
      recommendedActionHint: 'Proceed with queue submit after one final operator check.',
    };
  }
  if (group === 'conflict_projection') {
    return {
      label: 'conflict_projection',
      description: 'Rows with stale-version or status-shift conflicts.',
      recommendedActionHint: 'Split by reason tag and re-run compare before submit.',
    };
  }
  if (group === 'rollback_recommended') {
    return {
      label: 'rollback_recommended',
      description: 'Rows requiring rollback-first handling due to high risk.',
      recommendedActionHint: 'Run rollback plan first, then re-stage clean rows.',
    };
  }
  return {
    label: 'unknown_input',
    description: 'Rows with malformed payload or missing deterministic keys.',
    recommendedActionHint: 'Repair fixture input, then re-run compare.',
  };
}

export function buildScenarioCompareMatrix(selectedRows: unknown[]): ScenarioCompareMatrix {
  const normalizedRows = selectedRows
    .map((row) => parseExceptionBulkPreviewRow(row))
    .filter((row): row is ExceptionBulkPreviewRow => Boolean(row))
    .sort((a, b) => a.id.localeCompare(b.id));

  const rows: ScenarioCompareMatrixRow[] = normalizedRows.map((row) => {
    const reasonTags = resolveSimulationReasonCodes(row);
    const group = resolveScenarioGroup(reasonTags);
    const meta = resolveScenarioGroupMetadata(group);
    return {
      id: row.id,
      merchantId: row.merchantId,
      provider: row.provider,
      group,
      reasonTags,
      recommendedActionHint: meta.recommendedActionHint,
      columnValues: {
        mismatch_count: row.mismatchCount,
        current_amount: row.amount,
        incoming_amount: row.incomingAmount,
        version_gap: row.incomingVersion - row.version,
      },
    };
  });

  const malformedCount = selectedRows.length - normalizedRows.length;
  for (let index = 0; index < malformedCount; index += 1) {
    const unknownId = `unknown-${String(index + 1).padStart(4, '0')}`;
    const meta = resolveScenarioGroupMetadata('unknown_input');
    rows.push({
      id: unknownId,
      merchantId: '-',
      provider: '-',
      group: 'unknown_input',
      reasonTags: ['MALFORMED_ROW'],
      recommendedActionHint: meta.recommendedActionHint,
      columnValues: {
        mismatch_count: 'n/a',
        current_amount: 'n/a',
        incoming_amount: 'n/a',
        version_gap: 'n/a',
      },
    });
  }

  const groups = SCENARIO_GROUP_ORDER.map((groupKey) => {
    const groupMeta = resolveScenarioGroupMetadata(groupKey);
    const groupRows = rows
      .filter((row) => row.group === groupKey)
      .sort((a, b) => a.id.localeCompare(b.id));
    return {
      key: groupKey,
      label: groupMeta.label,
      description: groupMeta.description,
      rowCount: groupRows.length,
      rows: groupRows,
    };
  });

  return {
    contract: 'settlement-scenario-compare-matrix.v1',
    selectedCount: selectedRows.length,
    validCount: normalizedRows.length,
    malformedCount,
    columns: [...SCENARIO_MATRIX_COLUMN_ORDER],
    groups,
    rows: groups.flatMap((group) => group.rows),
  };
}

export function filterScenarioCompareMatrixRows(
  rows: ScenarioCompareMatrixRow[],
  filter: ScenarioCompareMatrixFilterKey,
): ScenarioCompareMatrixRow[] {
  if (filter === 'all') {
    return rows;
  }
  return rows.filter((row) => row.group === filter);
}

export function buildOperatorDecisionQueue(input: {
  matrixRows: ScenarioCompareMatrixRow[];
  stagedRowIds: string[];
}): OperatorDecisionQueue {
  const orderedUniqueRowIds = Array.from(new Set(input.stagedRowIds));
  const matrixRowById = new Map(input.matrixRows.map((row) => [row.id, row]));
  const items: OperatorDecisionQueueItem[] = [];
  let missingRowCount = 0;

  for (const rowId of orderedUniqueRowIds) {
    const row = matrixRowById.get(rowId);
    if (!row) {
      missingRowCount += 1;
      continue;
    }
    items.push({
      id: `queue-${row.id}`,
      rowId: row.id,
      merchantId: row.merchantId,
      provider: row.provider,
      group: row.group,
      reasonTags: [...row.reasonTags],
      recommendedActionHint: row.recommendedActionHint,
    });
  }

  const groupRank = new Map(SCENARIO_GROUP_ORDER.map((key, index) => [key, index]));
  items.sort((a, b) => {
    const groupOrder = (groupRank.get(a.group) ?? Number.MAX_SAFE_INTEGER)
      - (groupRank.get(b.group) ?? Number.MAX_SAFE_INTEGER);
    if (groupOrder !== 0) {
      return groupOrder;
    }
    return a.rowId.localeCompare(b.rowId);
  });

  return {
    contract: 'settlement-operator-decision-queue.v1',
    stagedCount: orderedUniqueRowIds.length,
    missingRowCount,
    items,
  };
}

function normalizeIncidentSeverity(input: unknown): IncidentBookmarkSeverity {
  if (input === 'critical' || input === 'high' || input === 'medium' || input === 'low') {
    return input;
  }
  if (input === 'CRITICAL') return 'critical';
  if (input === 'HIGH') return 'high';
  if (input === 'MEDIUM') return 'medium';
  if (input === 'LOW') return 'low';
  return 'medium';
}

function parseIncidentBookmarkItem(raw: unknown): IncidentBookmarkShelfItem | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const id = normalizeOptional(typeof row.id === 'string' ? row.id : String(row.id ?? ''));
  const merchantId = normalizeOptional(typeof row.merchantId === 'string' ? row.merchantId : String(row.merchantId ?? ''));
  const provider = normalizeOptional(typeof row.provider === 'string' ? row.provider : String(row.provider ?? ''));
  const title = normalizeOptional(typeof row.title === 'string' ? row.title : String(row.title ?? '')) ?? 'Untitled fixture incident';
  if (!id || !merchantId || !provider) {
    return null;
  }
  const status = normalizeExceptionStatus(row.status ?? row.incomingStatus);
  const amount = parseFiniteNumber(row.currentAmount ?? row.amount ?? row.ledgerAmount ?? row.providerAmount) ?? 0;
  const incomingAmount = parseFiniteNumber(row.incomingAmount ?? row.nextAmount);
  const currentVersion = parseFiniteNumber(row.version ?? row.currentVersion) ?? 1;
  const incomingVersion = parseFiniteNumber(row.incomingVersion ?? row.nextVersion) ?? currentVersion;
  const mismatchCount = Math.max(0, Math.trunc(parseFiniteNumber(row.mismatchCount) ?? 0));
  const rawRiskFlags = Array.isArray(row.riskFlags) ? row.riskFlags : [];
  const normalizedRiskFlags = rawRiskFlags
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim())
    .sort((a, b) => a.localeCompare(b));
  const derivedRiskFlags: string[] = [];
  if (Math.abs((incomingAmount ?? amount) - amount) >= 100) {
    derivedRiskFlags.push('high_delta');
  }
  if (incomingVersion < currentVersion) {
    derivedRiskFlags.push('stale_version');
  }
  if (mismatchCount >= 3) {
    derivedRiskFlags.push('mismatch_cluster');
  }
  const riskFlags = Array.from(new Set([...normalizedRiskFlags, ...derivedRiskFlags]))
    .sort((a, b) => a.localeCompare(b));
  return {
    id,
    merchantId,
    provider,
    severity: normalizeIncidentSeverity(row.severity),
    updatedAt: resolveDateString(row.updatedAt, DIFF_FALLBACK_TIMESTAMP),
    title,
    status,
    amount,
    riskFlags,
  };
}

export function buildIncidentBookmarkShelf(fixtures: unknown[]): IncidentBookmarkShelf {
  const severityRank = new Map(INCIDENT_SEVERITY_ORDER.map((severity, index) => [severity, index]));
  const severityCounts: Record<IncidentBookmarkSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  const items = fixtures
    .map((row) => parseIncidentBookmarkItem(row))
    .filter((row): row is IncidentBookmarkShelfItem => Boolean(row))
    .sort((a, b) => {
      const severitySort = (severityRank.get(a.severity) ?? Number.MAX_SAFE_INTEGER)
        - (severityRank.get(b.severity) ?? Number.MAX_SAFE_INTEGER);
      if (severitySort !== 0) {
        return severitySort;
      }
      const updatedSort = b.updatedAt.localeCompare(a.updatedAt);
      if (updatedSort !== 0) {
        return updatedSort;
      }
      return a.id.localeCompare(b.id);
    });

  for (const item of items) {
    severityCounts[item.severity] += 1;
  }

  return {
    contract: 'settlement-incident-bookmark-shelf.v1',
    totalCount: items.length,
    severityCounts,
    items,
  };
}

export function filterIncidentBookmarkShelfItems(
  items: IncidentBookmarkShelfItem[],
  filter: IncidentBookmarkFilterKey,
): IncidentBookmarkShelfItem[] {
  if (filter === 'all') {
    return [...items];
  }
  return items.filter((item) => item.severity === filter);
}

function resolveDefaultSecondaryBookmarkId(items: IncidentBookmarkShelfItem[], primaryBookmarkId: string): string {
  const next = items.find((item) => item.id !== primaryBookmarkId);
  return next?.id ?? '';
}

export function reconcileReplayBookmarkCompareState(input: {
  items: IncidentBookmarkShelfItem[];
  activeBookmarkId: string;
  primaryBookmarkId: string;
  secondaryBookmarkId: string;
}): { activeBookmarkId: string; primaryBookmarkId: string; secondaryBookmarkId: string } {
  if (input.items.length === 0) {
    return {
      activeBookmarkId: '',
      primaryBookmarkId: '',
      secondaryBookmarkId: '',
    };
  }
  const idSet = new Set(input.items.map((item) => item.id));
  const activeBookmarkId = idSet.has(input.activeBookmarkId)
    ? input.activeBookmarkId
    : input.items[0].id;
  let primaryBookmarkId = idSet.has(input.primaryBookmarkId)
    ? input.primaryBookmarkId
    : activeBookmarkId;
  let secondaryBookmarkId = idSet.has(input.secondaryBookmarkId)
    ? input.secondaryBookmarkId
    : resolveDefaultSecondaryBookmarkId(input.items, primaryBookmarkId);
  if (secondaryBookmarkId === primaryBookmarkId) {
    secondaryBookmarkId = resolveDefaultSecondaryBookmarkId(input.items, primaryBookmarkId);
  }
  if (!idSet.has(primaryBookmarkId)) {
    primaryBookmarkId = input.items[0].id;
  }
  return {
    activeBookmarkId,
    primaryBookmarkId,
    secondaryBookmarkId,
  };
}

export function buildReplayBookmarkCompareStrip(input: {
  items: IncidentBookmarkShelfItem[];
  activeBookmarkId: string;
  primaryBookmarkId: string;
  secondaryBookmarkId: string;
}): ReplayBookmarkCompareStrip {
  const resolved = reconcileReplayBookmarkCompareState(input);
  const itemById = new Map(input.items.map((item) => [item.id, item]));
  const primaryBookmark = itemById.get(resolved.primaryBookmarkId) ?? null;
  const secondaryBookmark = itemById.get(resolved.secondaryBookmarkId) ?? null;
  return {
    contract: 'settlement-replay-bookmark-compare-strip.v1',
    items: [...input.items],
    activeBookmarkId: resolved.activeBookmarkId,
    primaryBookmark,
    secondaryBookmark,
    canCompare: Boolean(primaryBookmark && secondaryBookmark),
  };
}

export function moveReplayBookmarkSelection(input: {
  items: IncidentBookmarkShelfItem[];
  activeBookmarkId: string;
  direction: 'next' | 'prev';
}): string {
  if (input.items.length === 0) {
    return '';
  }
  const currentIndex = input.items.findIndex((item) => item.id === input.activeBookmarkId);
  if (currentIndex < 0) {
    return input.items[0].id;
  }
  if (input.direction === 'next') {
    return input.items[Math.min(currentIndex + 1, input.items.length - 1)].id;
  }
  return input.items[Math.max(currentIndex - 1, 0)].id;
}

export function resolveReplayBookmarkCompareShortcut(key: string): ReplayBookmarkCompareShortcut | null {
  if (key === '[') {
    return 'select_prev';
  }
  if (key === ']') {
    return 'select_next';
  }
  if (key.toLowerCase() === 's') {
    return 'swap';
  }
  if (key === 'Escape') {
    return 'clear_draft';
  }
  return null;
}

export function swapReplayBookmarkCompareSlots(input: {
  primaryBookmarkId: string;
  secondaryBookmarkId: string;
}): { primaryBookmarkId: string; secondaryBookmarkId: string } {
  return {
    primaryBookmarkId: input.secondaryBookmarkId,
    secondaryBookmarkId: input.primaryBookmarkId,
  };
}

export function resetReplayBookmarkCompareDraftSafe(input: {
  activeBookmarkFilter: IncidentBookmarkFilterKey;
  confirmFilterReset: boolean;
}): {
  primaryBookmarkId: string;
  secondaryBookmarkId: string;
  activeBookmarkFilter: IncidentBookmarkFilterKey;
  message: string;
} {
  if (input.confirmFilterReset) {
    return {
      primaryBookmarkId: '',
      secondaryBookmarkId: '',
      activeBookmarkFilter: 'all',
      message: 'Replay compare draft and bookmark filter reset to default.',
    };
  }
  return {
    primaryBookmarkId: '',
    secondaryBookmarkId: '',
    activeBookmarkFilter: input.activeBookmarkFilter,
    message: 'Replay compare draft cleared. Bookmark filter preserved until explicit reset confirm.',
  };
}

function buildOperatorTimelineSnapshot(item: IncidentBookmarkShelfItem): OperatorTimelineSnapshot {
  return {
    id: item.id,
    eventAt: item.updatedAt,
    severity: item.severity,
    status: item.status,
    amount: item.amount.toFixed(2),
    riskFlags: [...item.riskFlags].sort((a, b) => a.localeCompare(b)),
    title: item.title,
  };
}

function serializeOperatorTimelineSnapshot(snapshot: OperatorTimelineSnapshot | null): string {
  if (!snapshot) {
    return '';
  }
  return JSON.stringify({
    id: snapshot.id,
    eventAt: snapshot.eventAt,
    severity: snapshot.severity,
    status: snapshot.status,
    amount: snapshot.amount,
    riskFlags: snapshot.riskFlags,
    title: snapshot.title,
  });
}

function buildOperatorTimelineComparePresetSlot(
  key: OperatorTimelinePresetKey,
  tickId: string,
  tickById: Map<string, OperatorTimelineTick>,
): OperatorTimelineComparePresetSlot {
  const tick = tickById.get(tickId) ?? null;
  const snapshot = tick ? buildOperatorTimelineSnapshot(tick.bookmark) : null;
  return {
    key,
    tickId: tick?.id ?? '',
    snapshot,
    serializedSnapshot: serializeOperatorTimelineSnapshot(snapshot),
  };
}

export function cycleOperatorTimelinePreset(current: OperatorTimelinePresetKey): OperatorTimelinePresetKey {
  const currentIndex = OPERATOR_TIMELINE_PRESET_ORDER.indexOf(current);
  if (currentIndex < 0) {
    return OPERATOR_TIMELINE_PRESET_ORDER[0];
  }
  return OPERATOR_TIMELINE_PRESET_ORDER[(currentIndex + 1) % OPERATOR_TIMELINE_PRESET_ORDER.length];
}

export function resolveOperatorTimelineShortcut(input: {
  key: string;
  shiftKey?: boolean;
}): OperatorTimelineShortcut | null {
  if (input.key === ',') {
    return 'tick_prev';
  }
  if (input.key === '.') {
    return 'tick_next';
  }
  if (input.key.toLowerCase() === 'p') {
    return input.shiftKey ? 'pin_override' : 'cycle_preset';
  }
  if (input.key === 'Escape') {
    return 'clear_draft';
  }
  return null;
}

export function moveOperatorTimelineTickSelection(input: {
  ticks: OperatorTimelineTick[];
  activeTickId: string;
  direction: 'next' | 'prev';
}): string {
  if (input.ticks.length === 0) {
    return '';
  }
  const currentIndex = input.ticks.findIndex((tick) => tick.id === input.activeTickId);
  if (currentIndex < 0) {
    return input.ticks[0].id;
  }
  if (input.direction === 'next') {
    return input.ticks[Math.min(currentIndex + 1, input.ticks.length - 1)].id;
  }
  return input.ticks[Math.max(currentIndex - 1, 0)].id;
}

export function pinOperatorTimelinePresetSlot(input: {
  activePreset: OperatorTimelinePresetKey;
  activeTickId: string;
  baselineTickId: string;
  candidateTickId: string;
  overrideTickId: string;
}): { baselineTickId: string; candidateTickId: string; overrideTickId: string } {
  if (input.activePreset === 'baseline') {
    return {
      baselineTickId: input.activeTickId,
      candidateTickId: input.candidateTickId,
      overrideTickId: input.overrideTickId,
    };
  }
  if (input.activePreset === 'candidate') {
    return {
      baselineTickId: input.baselineTickId,
      candidateTickId: input.activeTickId,
      overrideTickId: input.overrideTickId,
    };
  }
  return {
    baselineTickId: input.baselineTickId,
    candidateTickId: input.candidateTickId,
    overrideTickId: input.activeTickId,
  };
}

export function resetOperatorTimelineCompareDraftSafe(input: {
  activeSeverityFilter: IncidentBookmarkFilterKey;
  baselineTickId: string;
  confirmFilterReset: boolean;
}): {
  baselineTickId: string;
  candidateTickId: string;
  overrideTickId: string;
  activeSeverityFilter: IncidentBookmarkFilterKey;
  message: string;
} {
  if (input.confirmFilterReset) {
    return {
      baselineTickId: input.baselineTickId,
      candidateTickId: '',
      overrideTickId: '',
      activeSeverityFilter: 'all',
      message: 'Timeline compare draft cleared. Severity filter reset to all.',
    };
  }
  return {
    baselineTickId: input.baselineTickId,
    candidateTickId: '',
    overrideTickId: '',
    activeSeverityFilter: input.activeSeverityFilter,
    message: 'Timeline compare draft cleared. Active severity filter preserved until full reset confirmation.',
  };
}

export function buildOperatorTimelineScrubber(input: {
  items: IncidentBookmarkShelfItem[];
  activeTickId: string;
  activePreset: OperatorTimelinePresetKey;
  baselineTickId: string;
  candidateTickId: string;
  overrideTickId: string;
}): OperatorTimelineScrubber {
  const severityRank = new Map(INCIDENT_SEVERITY_ORDER.map((severity, index) => [severity, index]));
  const ticks = input.items
    .map((item): OperatorTimelineTick => ({
      id: item.id,
      eventAt: item.updatedAt,
      severity: item.severity,
      title: item.title,
      bookmark: item,
    }))
    .sort((left, right) => {
      const eventSort = left.eventAt.localeCompare(right.eventAt);
      if (eventSort !== 0) {
        return eventSort;
      }
      const severitySort = (severityRank.get(left.severity) ?? Number.MAX_SAFE_INTEGER)
        - (severityRank.get(right.severity) ?? Number.MAX_SAFE_INTEGER);
      if (severitySort !== 0) {
        return severitySort;
      }
      return left.id.localeCompare(right.id);
    });
  const tickById = new Map(ticks.map((tick) => [tick.id, tick]));
  const activeTickId = tickById.has(input.activeTickId)
    ? input.activeTickId
    : (ticks[0]?.id ?? '');
  const baselineTickId = tickById.has(input.baselineTickId)
    ? input.baselineTickId
    : activeTickId;
  const candidateTickId = tickById.has(input.candidateTickId)
    ? input.candidateTickId
    : '';
  const overrideTickId = tickById.has(input.overrideTickId)
    ? input.overrideTickId
    : '';
  const activePreset = OPERATOR_TIMELINE_PRESET_ORDER.includes(input.activePreset)
    ? input.activePreset
    : 'baseline';

  return {
    contract: 'settlement-operator-timeline-scrubber.v1',
    ticks,
    activeTickId,
    activePreset,
    compareSlots: OPERATOR_TIMELINE_PRESET_ORDER.map((key) => {
      const tickId = key === 'baseline'
        ? baselineTickId
        : key === 'candidate'
          ? candidateTickId
          : overrideTickId;
      return buildOperatorTimelineComparePresetSlot(key, tickId, tickById);
    }),
  };
}

function formatReplayDeltaAmount(amount: number): string {
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}

function formatReplayDeltaRiskFlags(flags: string[]): string {
  return flags.length ? flags.join(', ') : 'none';
}

export function buildReplayDeltaInspector(input: {
  items: IncidentBookmarkShelfItem[];
  primaryBookmarkId: string;
  secondaryBookmarkId: string;
}): ReplayDeltaInspector {
  const itemById = new Map(input.items.map((item) => [item.id, item]));
  const primaryBookmark = itemById.get(input.primaryBookmarkId) ?? null;
  const secondaryBookmark = itemById.get(input.secondaryBookmarkId) ?? null;
  if (!primaryBookmark || !secondaryBookmark) {
    return {
      contract: 'settlement-replay-delta-inspector.v1',
      primaryBookmark,
      secondaryBookmark,
      rows: [],
      canCompare: false,
      emptyMessage: 'Pin primary and secondary bookmarks to inspect deterministic replay deltas.',
    };
  }
  const rows = REPLAY_DELTA_FIELD_ORDER.map((field): ReplayDeltaInspectorRow => {
    if (field === 'status') {
      const primaryValue = primaryBookmark.status;
      const secondaryValue = secondaryBookmark.status;
      return {
        field,
        primaryValue,
        secondaryValue,
        changed: primaryValue !== secondaryValue,
      };
    }
    if (field === 'amount') {
      const primaryValue = formatReplayDeltaAmount(primaryBookmark.amount);
      const secondaryValue = formatReplayDeltaAmount(secondaryBookmark.amount);
      return {
        field,
        primaryValue,
        secondaryValue,
        changed: primaryValue !== secondaryValue,
      };
    }
    if (field === 'riskFlags') {
      const primaryValue = formatReplayDeltaRiskFlags(primaryBookmark.riskFlags);
      const secondaryValue = formatReplayDeltaRiskFlags(secondaryBookmark.riskFlags);
      return {
        field,
        primaryValue,
        secondaryValue,
        changed: primaryValue !== secondaryValue,
      };
    }
    const primaryValue = primaryBookmark.updatedAt;
    const secondaryValue = secondaryBookmark.updatedAt;
    return {
      field,
      primaryValue,
      secondaryValue,
      changed: primaryValue !== secondaryValue,
    };
  });
  return {
    contract: 'settlement-replay-delta-inspector.v1',
    primaryBookmark,
    secondaryBookmark,
    rows,
    canCompare: true,
    emptyMessage: null,
  };
}

function buildReplayChecklistSteps(completedStepIds: string[]): ReplayChecklistStep[] {
  const completed = new Set(completedStepIds);
  return DEFAULT_REPLAY_CHECKLIST_STEPS.map((step) => ({
    id: step.id,
    label: step.label,
    completed: completed.has(step.id),
  }));
}

export function buildReplayChecklistDrawer(input: {
  shelfItems: IncidentBookmarkShelfItem[];
  activeBookmarkId: string;
  completedStepIds?: string[];
  focusedStepId?: string;
  noteDraft?: string;
}): ReplayChecklistDrawer {
  const bookmark = input.shelfItems.find((item) => item.id === input.activeBookmarkId) ?? null;
  const steps = buildReplayChecklistSteps(input.completedStepIds ?? []);
  const stepIdSet = new Set(steps.map((step) => step.id));
  const focusedStepId = input.focusedStepId && stepIdSet.has(input.focusedStepId)
    ? input.focusedStepId
    : (steps[0]?.id ?? '');

  return {
    contract: 'settlement-replay-checklist-drawer.v1',
    bookmark,
    steps,
    focusedStepId,
    noteDraft: input.noteDraft ?? '',
    emptyMessage: bookmark
      ? null
      : 'Select an incident bookmark to open replay checklist context.',
  };
}

export function resolveReplayChecklistShortcut(key: string): 'focus_next' | 'focus_prev' | 'toggle_step' | 'clear_note' | null {
  const normalized = key.toLowerCase();
  if (normalized === 'arrowdown') {
    return 'focus_next';
  }
  if (normalized === 'arrowup') {
    return 'focus_prev';
  }
  if (normalized === 'enter') {
    return 'toggle_step';
  }
  if (normalized === 'backspace') {
    return 'clear_note';
  }
  return null;
}

export function moveReplayChecklistFocus(input: {
  steps: ReplayChecklistStep[];
  activeStepId: string;
  direction: 'next' | 'prev';
}): string {
  if (input.steps.length === 0) {
    return '';
  }
  const currentIndex = input.steps.findIndex((step) => step.id === input.activeStepId);
  if (currentIndex < 0) {
    return input.steps[0].id;
  }
  if (input.direction === 'next') {
    return input.steps[Math.min(currentIndex + 1, input.steps.length - 1)].id;
  }
  return input.steps[Math.max(currentIndex - 1, 0)].id;
}

export function toggleReplayChecklistStep(input: {
  steps: ReplayChecklistStep[];
  stepId: string;
}): ReplayChecklistStep[] {
  return input.steps.map((step) => (
    step.id === input.stepId
      ? { ...step, completed: !step.completed }
      : step
  ));
}

export function resetReplayChecklistDrawerDraftSafe(input: {
  activeBookmarkFilter: IncidentBookmarkFilterKey;
  confirmFilterReset: boolean;
}): {
  completedStepIds: string[];
  noteDraft: string;
  activeBookmarkFilter: IncidentBookmarkFilterKey;
  message: string;
} {
  if (input.confirmFilterReset) {
    return {
      completedStepIds: [],
      noteDraft: '',
      activeBookmarkFilter: 'all',
      message: 'Replay checklist draft and bookmark filter reset to default.',
    };
  }
  return {
    completedStepIds: [],
    noteDraft: '',
    activeBookmarkFilter: input.activeBookmarkFilter,
    message: 'Replay checklist draft cleared. Bookmark filter preserved until explicit reset confirm.',
  };
}

function normalizeReviewQueuePriority(input: unknown): ReviewQueuePriority {
  if (input === 'critical' || input === 'high' || input === 'medium' || input === 'low') {
    return input;
  }
  if (input === 'CRITICAL') return 'critical';
  if (input === 'HIGH') return 'high';
  if (input === 'MEDIUM') return 'medium';
  if (input === 'LOW') return 'low';
  return 'medium';
}

function parseReviewQueueLedgerRow(raw: unknown): ReviewQueueLedgerRow | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const id = normalizeOptional(typeof row.id === 'string' ? row.id : String(row.id ?? ''));
  const merchantId = normalizeOptional(typeof row.merchantId === 'string' ? row.merchantId : String(row.merchantId ?? ''));
  const provider = normalizeOptional(typeof row.provider === 'string' ? row.provider : String(row.provider ?? ''));
  if (!id || !merchantId || !provider) {
    return null;
  }
  const eventTime = resolveDateString(row.updatedAt ?? row.eventTime, DIFF_FALLBACK_TIMESTAMP);
  const title = normalizeOptional(typeof row.title === 'string' ? row.title : String(row.title ?? ''))
    ?? 'Deterministic review queue row';
  return {
    id,
    merchantId,
    provider,
    priority: normalizeReviewQueuePriority(row.lanePriority ?? row.priority ?? row.severity),
    eventTime,
    title,
    sourceRowId: id,
  };
}

export function buildReviewQueueLedger(input: {
  rows: unknown[];
  activeRowId: string;
}): ReviewQueueLedger {
  const priorityRank = new Map(REVIEW_QUEUE_PRIORITY_ORDER.map((priority, index) => [priority, index]));
  const priorityCounts: Record<ReviewQueuePriority, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  const rows = input.rows
    .map((row) => parseReviewQueueLedgerRow(row))
    .filter((row): row is ReviewQueueLedgerRow => Boolean(row))
    .sort((left, right) => {
      const prioritySort = (priorityRank.get(left.priority) ?? Number.MAX_SAFE_INTEGER)
        - (priorityRank.get(right.priority) ?? Number.MAX_SAFE_INTEGER);
      if (prioritySort !== 0) {
        return prioritySort;
      }
      const eventSort = left.eventTime.localeCompare(right.eventTime);
      if (eventSort !== 0) {
        return eventSort;
      }
      return left.id.localeCompare(right.id);
    });
  for (const row of rows) {
    priorityCounts[row.priority] += 1;
  }
  const rowIdSet = new Set(rows.map((row) => row.id));
  const activeRowId = rowIdSet.has(input.activeRowId)
    ? input.activeRowId
    : (rows[0]?.id ?? '');
  return {
    contract: 'settlement-review-queue-ledger.v1',
    rows,
    priorityCounts,
    activeRowId,
  };
}

export function filterReviewQueueLedgerRows(
  rows: ReviewQueueLedgerRow[],
  filter: ReviewQueueLedgerFilterKey,
): ReviewQueueLedgerRow[] {
  if (filter === 'all') {
    return [...rows];
  }
  return rows.filter((row) => row.priority === filter);
}

export function moveReviewQueueLedgerSelection(input: {
  rows: ReviewQueueLedgerRow[];
  activeRowId: string;
  direction: 'next' | 'prev';
}): string {
  if (input.rows.length === 0) {
    return '';
  }
  const currentIndex = input.rows.findIndex((row) => row.id === input.activeRowId);
  if (currentIndex < 0) {
    return input.rows[0].id;
  }
  if (input.direction === 'next') {
    return input.rows[Math.min(currentIndex + 1, input.rows.length - 1)].id;
  }
  return input.rows[Math.max(currentIndex - 1, 0)].id;
}

export function resolveReviewQueueLedgerShortcut(input: {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): ReviewQueueLedgerShortcut | null {
  const normalizedKey = input.key.toLowerCase();
  if (normalizedKey === 'j' || normalizedKey === 'arrowdown') {
    return 'next_row';
  }
  if (normalizedKey === 'k' || normalizedKey === 'arrowup') {
    return 'prev_row';
  }
  if (normalizedKey === 'p' && input.shiftKey) {
    return 'focus_handoff_packet';
  }
  if (input.key === 'Enter' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'validate_handoff_packet';
  }
  return null;
}

export function getDefaultReviewQueueHandoffPacketDraft(): ReviewQueueHandoffPacketDraft {
  return {
    branch: '',
    fullSha: '',
    mode: 'no_pr',
    prLink: '',
    blockerOwner: '',
    eta: '',
    artifactPathsText: '',
    dependentIssueLinksText: '',
  };
}

function normalizeMultilineEntries(input: string): string[] {
  return input
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function formatUtcEta(inputIso: string): string {
  const parsed = new Date(inputIso);
  if (!Number.isFinite(parsed.getTime())) {
    return '';
  }
  const nextDay = new Date(parsed.getTime() + (24 * 60 * 60 * 1000));
  return `${nextDay.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function normalizeSerializedUnknown(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeSerializedUnknown(entry));
  }
  if (value && typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(input).sort((left, right) => left.localeCompare(right))) {
      normalized[key] = normalizeSerializedUnknown(input[key]);
    }
    return normalized;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return null;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

function serializeDeterministicUnknown(value: unknown): string {
  return JSON.stringify(normalizeSerializedUnknown(value));
}

type EvidencePacketEntry = {
  id: string;
  sectionPriority: number;
  fieldKey: string;
  value: string;
};

function normalizeEvidencePacketValue(value: unknown): string {
  if (value === null || typeof value === 'undefined') {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return serializeDeterministicUnknown(value);
}

function normalizeEvidencePacketEntries(
  packet: unknown,
  source: 'current' | 'previous',
): EvidencePacketEntry[] {
  if (!packet || typeof packet !== 'object') {
    return [];
  }
  const entries: EvidencePacketEntry[] = [];
  if (Array.isArray(packet)) {
    packet.forEach((raw, index) => {
      if (!raw || typeof raw !== 'object') {
        return;
      }
      const row = raw as Record<string, unknown>;
      const fieldKey = normalizeOptional(
        typeof row.fieldKey === 'string'
          ? row.fieldKey
          : typeof row.key === 'string'
            ? row.key
            : typeof row.name === 'string'
              ? row.name
              : '',
      );
      if (!fieldKey) {
        return;
      }
      const id = normalizeOptional(
        typeof row.id === 'string'
          ? row.id
          : typeof row.fieldId === 'string'
            ? row.fieldId
            : `${fieldKey}-${String(index + 1).padStart(4, '0')}`,
      ) ?? `${fieldKey}-${String(index + 1).padStart(4, '0')}`;
      const sectionPriorityRaw = parseFiniteNumber(row.sectionPriority ?? row.priority);
      const sectionPriority = sectionPriorityRaw !== null
        ? Math.max(0, Math.trunc(sectionPriorityRaw))
        : 999;
      const preferredValue = source === 'current'
        ? (row.currentValue ?? row.value)
        : (row.previousValue ?? row.value);
      const value = normalizeEvidencePacketValue(preferredValue);
      entries.push({
        id,
        sectionPriority,
        fieldKey,
        value,
      });
    });
    return entries;
  }

  const packetObject = packet as Record<string, unknown>;
  for (const fieldKey of Object.keys(packetObject).sort((left, right) => left.localeCompare(right))) {
    const raw = packetObject[fieldKey];
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const row = raw as Record<string, unknown>;
      const id = normalizeOptional(typeof row.id === 'string' ? row.id : fieldKey) ?? fieldKey;
      const sectionPriorityRaw = parseFiniteNumber(row.sectionPriority ?? row.priority);
      const sectionPriority = sectionPriorityRaw !== null
        ? Math.max(0, Math.trunc(sectionPriorityRaw))
        : 999;
      const preferredValue = source === 'current'
        ? (row.currentValue ?? row.value)
        : (row.previousValue ?? row.value);
      entries.push({
        id,
        sectionPriority,
        fieldKey,
        value: normalizeEvidencePacketValue(preferredValue),
      });
      continue;
    }
    entries.push({
      id: fieldKey,
      sectionPriority: 999,
      fieldKey,
      value: normalizeEvidencePacketValue(raw),
    });
  }
  return entries;
}

function buildEvidenceEntryKey(entry: Pick<EvidencePacketEntry, 'sectionPriority' | 'fieldKey' | 'id'>): string {
  return `${String(entry.sectionPriority).padStart(6, '0')}|${entry.fieldKey}|${entry.id}`;
}

export function filterEvidenceDiffRailRows(
  rows: EvidenceDiffRailRow[],
  filter: EvidenceDiffRailFilterKey,
): EvidenceDiffRailRow[] {
  if (filter === 'all') {
    return [...rows];
  }
  const changed = filter === 'changed';
  return rows.filter((row) => row.changed === changed);
}

export function buildEvidenceDiffRail(input: {
  currentPacket: unknown;
  previousPacket: unknown;
  activeRowId: string;
  activeFilter?: EvidenceDiffRailFilterKey;
}): EvidenceDiffRail {
  const activeFilter = input.activeFilter ?? 'all';
  const currentEntries = normalizeEvidencePacketEntries(input.currentPacket, 'current');
  const previousEntries = normalizeEvidencePacketEntries(input.previousPacket, 'previous');
  const currentByKey = new Map<string, EvidencePacketEntry>();
  const previousByKey = new Map<string, EvidencePacketEntry>();
  for (const entry of currentEntries) {
    currentByKey.set(buildEvidenceEntryKey(entry), entry);
  }
  for (const entry of previousEntries) {
    previousByKey.set(buildEvidenceEntryKey(entry), entry);
  }
  const keys = Array.from(new Set([
    ...currentByKey.keys(),
    ...previousByKey.keys(),
  ])).sort((left, right) => left.localeCompare(right));
  const rows = keys.map((key): EvidenceDiffRailRow => {
    const currentEntry = currentByKey.get(key);
    const previousEntry = previousByKey.get(key);
    const meta = currentEntry ?? previousEntry ?? {
      id: '',
      sectionPriority: 999,
      fieldKey: '',
    };
    const currentValue = currentEntry?.value ?? '';
    const previousValue = previousEntry?.value ?? '';
    return {
      id: meta.id,
      sectionPriority: meta.sectionPriority,
      fieldKey: meta.fieldKey,
      currentValue,
      previousValue,
      changed: currentValue !== previousValue,
    };
  });
  const changedCount = rows.filter((row) => row.changed).length;
  const unchangedCount = rows.length - changedCount;
  const filteredRows = filterEvidenceDiffRailRows(rows, activeFilter);
  const rowIdSet = new Set(filteredRows.map((row) => row.id));
  const activeRowId = rowIdSet.has(input.activeRowId)
    ? input.activeRowId
    : (filteredRows[0]?.id ?? '');

  return {
    contract: 'settlement-evidence-diff-rail.v1',
    rows: filteredRows,
    changedCount,
    unchangedCount,
    activeRowId,
    activeFilter,
  };
}

export function moveEvidenceDiffRailSelection(input: {
  rows: EvidenceDiffRailRow[];
  activeRowId: string;
  direction: 'next' | 'prev';
}): string {
  if (input.rows.length === 0) {
    return '';
  }
  const currentIndex = input.rows.findIndex((row) => row.id === input.activeRowId);
  if (currentIndex < 0) {
    return input.rows[0].id;
  }
  if (input.direction === 'next') {
    return input.rows[Math.min(currentIndex + 1, input.rows.length - 1)].id;
  }
  return input.rows[Math.max(currentIndex - 1, 0)].id;
}

export function resolveEvidenceDiffRailShortcut(input: {
  key: string;
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): EvidenceDiffRailShortcut | null {
  const normalizedKey = input.key.toLowerCase();
  if (input.altKey && normalizedKey === 'j') {
    return 'next_row';
  }
  if (input.altKey && normalizedKey === 'k') {
    return 'prev_row';
  }
  if (input.shiftKey && normalizedKey === 'b') {
    return 'focus_blocker_register';
  }
  if (input.key === 'Enter' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'validate_blocker_register';
  }
  return null;
}

export function getDefaultBlockerOwnershipRegisterDraft(): BlockerOwnershipRegisterDraft {
  return {
    blockerOwner: '',
    eta: '',
    dependencyIssueLinksText: '',
    retryTimestamp: '',
    note: '',
  };
}

function normalizeDependencyIssueLinks(input: string): string[] {
  return Array.from(new Set(normalizeMultilineEntries(input)))
    .sort((left, right) => left.localeCompare(right));
}

function isValidIssueLink(input: string): boolean {
  return /^\/[A-Z0-9_-]+\/issues\/[A-Z0-9-]+$/i.test(input)
    || /^https?:\/\/[^ ]+$/i.test(input);
}

export function serializeBlockerOwnershipRegisterDraft(draft: BlockerOwnershipRegisterDraft): string {
  const normalized = {
    blockerOwner: draft.blockerOwner.trim(),
    eta: draft.eta.trim(),
    dependencyIssueLinks: normalizeDependencyIssueLinks(draft.dependencyIssueLinksText),
    retryTimestamp: draft.retryTimestamp.trim(),
    note: draft.note.trim(),
  };
  return serializeDeterministicUnknown(normalized);
}

export function validateBlockerOwnershipRegisterDraft(
  draft: BlockerOwnershipRegisterDraft,
): BlockerOwnershipRegisterValidation {
  const errors: string[] = [];
  const missingFields: string[] = [];
  const blockerOwner = draft.blockerOwner.trim();
  const eta = draft.eta.trim();
  const retryTimestamp = draft.retryTimestamp.trim();
  const dependencyIssueLinks = normalizeDependencyIssueLinks(draft.dependencyIssueLinksText);

  if (!blockerOwner) {
    missingFields.push('blockerOwner');
  }
  if (!eta) {
    missingFields.push('eta');
  } else if (!Number.isFinite(new Date(eta).getTime())) {
    errors.push('ETA must be a valid date-time string.');
  }
  if (!retryTimestamp) {
    missingFields.push('retryTimestamp');
  } else if (!Number.isFinite(new Date(retryTimestamp).getTime())) {
    errors.push('Retry timestamp must be a valid date-time string.');
  }
  if (dependencyIssueLinks.length === 0) {
    missingFields.push('dependencyIssueLinks');
  }
  for (const link of dependencyIssueLinks) {
    if (!isValidIssueLink(link)) {
      errors.push(`Dependency issue link is invalid: ${link}`);
    }
  }

  return {
    isComplete: errors.length === 0 && missingFields.length === 0,
    errors,
    missingFields,
    dependencyIssueLinks,
    serializedDraft: serializeBlockerOwnershipRegisterDraft(draft),
  };
}

export function resetBlockerOwnershipRegisterDraftSafe(input: {
  activeDiffFilter: EvidenceDiffRailFilterKey;
  activeDiffRowId: string;
  confirmFullReset: boolean;
}): {
  draft: BlockerOwnershipRegisterDraft;
  activeDiffFilter: EvidenceDiffRailFilterKey;
  activeDiffRowId: string;
  didFullReset: boolean;
  message: string;
} {
  if (input.confirmFullReset) {
    return {
      draft: getDefaultBlockerOwnershipRegisterDraft(),
      activeDiffFilter: 'all',
      activeDiffRowId: '',
      didFullReset: true,
      message: 'Blocker register draft cleared. Diff filter and active row reset to default.',
    };
  }
  return {
    draft: getDefaultBlockerOwnershipRegisterDraft(),
    activeDiffFilter: input.activeDiffFilter,
    activeDiffRowId: input.activeDiffRowId,
    didFullReset: false,
    message: 'Blocker register draft cleared. Diff filter and active row preserved.',
  };
}

export function buildReviewQueueHandoffPacketDraftFromLedgerRow(input: {
  activeRow: ReviewQueueLedgerRow | null;
  dependentIssueLinks?: string[];
  branchPrefix?: string;
}): ReviewQueueHandoffPacketDraft {
  if (!input.activeRow) {
    return getDefaultReviewQueueHandoffPacketDraft();
  }
  const branchPrefix = normalizeOptional(input.branchPrefix) ?? 'feature';
  const dependentIssueLinks = (input.dependentIssueLinks ?? [
    '/ONE/issues/ONE-248',
    '/ONE/issues/ONE-242',
    '/ONE/issues/ONE-241',
  ])
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return {
    branch: `${branchPrefix}/${input.activeRow.id.toLowerCase()}-handoff-packet`,
    fullSha: '0000000000000000000000000000000000000000',
    mode: 'no_pr',
    prLink: '',
    blockerOwner: 'GitHub Admin / DevOps',
    eta: formatUtcEta(input.activeRow.eventTime),
    artifactPathsText: [
      `artifacts/one-249/release-digest/${input.activeRow.id}.json`,
      `artifacts/one-249/publish-packets/${input.activeRow.id}.md`,
    ].join('\n'),
    dependentIssueLinksText: dependentIssueLinks.join('\n'),
  };
}

export function validateReviewQueueHandoffPacketDraft(
  draft: ReviewQueueHandoffPacketDraft,
): ReviewQueueHandoffPacketValidation {
  const errors: string[] = [];
  const missingFields: string[] = [];
  const branch = draft.branch.trim();
  const fullSha = draft.fullSha.trim();
  const prLink = draft.prLink.trim();
  const blockerOwner = draft.blockerOwner.trim();
  const eta = draft.eta.trim();
  const artifactPaths = normalizeMultilineEntries(draft.artifactPathsText);
  const dependentIssueLinks = normalizeMultilineEntries(draft.dependentIssueLinksText);

  if (!branch) {
    missingFields.push('branch');
  }
  if (!fullSha) {
    missingFields.push('fullSha');
  }
  if (fullSha && !/^[a-f0-9]{40}$/i.test(fullSha)) {
    errors.push('Full SHA must be a 40-character hexadecimal value.');
  }
  if (fullSha === '0000000000000000000000000000000000000000') {
    errors.push('Full SHA placeholder must be replaced with a real commit SHA before handoff.');
  }
  if (draft.mode === 'pr') {
    if (!prLink) {
      missingFields.push('prLink');
    } else if (!/^https:\/\/github\.com\/.+\/pull\/\d+$/i.test(prLink)) {
      errors.push('PR link must be a GitHub pull request URL.');
    }
  } else {
    if (!blockerOwner) {
      missingFields.push('blockerOwner');
    }
    if (!eta) {
      missingFields.push('eta');
    }
  }
  if (artifactPaths.length === 0) {
    missingFields.push('artifactPaths');
  }
  if (dependentIssueLinks.length === 0) {
    missingFields.push('dependentIssueLinks');
  }

  return {
    isComplete: errors.length === 0 && missingFields.length === 0,
    errors,
    missingFields,
    artifactPaths,
    dependentIssueLinks,
  };
}

export function resetReviewQueueHandoffPacketDraftSafe(input: {
  activeFilter: ReviewQueueLedgerFilterKey;
  activeRowId: string;
  confirmFullReset: boolean;
}): {
  draft: ReviewQueueHandoffPacketDraft;
  activeFilter: ReviewQueueLedgerFilterKey;
  activeRowId: string;
  didFullReset: boolean;
  message: string;
} {
  if (input.confirmFullReset) {
    return {
      draft: getDefaultReviewQueueHandoffPacketDraft(),
      activeFilter: 'all',
      activeRowId: '',
      didFullReset: true,
      message: 'Handoff packet draft cleared. Queue filter and active selection reset to default.',
    };
  }
  return {
    draft: getDefaultReviewQueueHandoffPacketDraft(),
    activeFilter: input.activeFilter,
    activeRowId: input.activeRowId,
    didFullReset: false,
    message: 'Handoff packet draft cleared. Queue filter and active selection preserved.',
  };
}

const QA_EVIDENCE_SHA_PLACEHOLDER = '0000000000000000000000000000000000000000';
const LINEAGE_REPLAY_FALLBACK_WINDOW_START = '2026-03-19T00:00:00.000Z';
const LINEAGE_REPLAY_FALLBACK_WINDOW_END = '2026-03-19T23:59:59.000Z';

function parseLineageReplayNavigatorRow(raw: unknown): LineageReplayNavigatorRow | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const id = normalizeOptional(typeof row.id === 'string' ? row.id : String(row.id ?? ''));
  const sourceIssueId = normalizeOptional(
    typeof row.sourceIssueId === 'string'
      ? row.sourceIssueId
      : String(row.sourceIssueId ?? ''),
  );
  if (!id || !sourceIssueId) {
    return null;
  }
  const lineageDepthRaw = parseFiniteNumber(row.lineageDepth);
  const sourceTypePriorityRaw = parseFiniteNumber(row.sourceTypePriority);
  if (lineageDepthRaw === null || sourceTypePriorityRaw === null) {
    return null;
  }
  const lineageDepth = Math.max(0, Math.trunc(lineageDepthRaw));
  const sourceTypePriority = Math.max(0, Math.trunc(sourceTypePriorityRaw));
  const artifactPath = normalizeOptional(
    typeof row.artifactPath === 'string'
      ? row.artifactPath
      : String(row.artifactPath ?? ''),
  ) ?? '';
  return {
    id,
    lineageDepth,
    sourceTypePriority,
    sourceIssueId,
    artifactPath,
  };
}

export function filterLineageReplayNavigatorRows(
  rows: LineageReplayNavigatorRow[],
  filter: LineageReplayNavigatorFilterKey,
): LineageReplayNavigatorRow[] {
  if (filter === 'all') {
    return [...rows];
  }
  if (filter === 'with_artifact') {
    return rows.filter((row) => row.artifactPath.length > 0);
  }
  return rows.filter((row) => row.artifactPath.length === 0);
}

export function buildLineageReplayNavigator(input: {
  rows: unknown[];
  cursorVersion: string;
  windowStart: string;
  windowEnd: string;
  activeRowId: string;
  activeFilter?: LineageReplayNavigatorFilterKey;
}): LineageReplayNavigator {
  const activeFilter = input.activeFilter ?? 'all';
  const rows = input.rows
    .map((row) => parseLineageReplayNavigatorRow(row))
    .filter((row): row is LineageReplayNavigatorRow => Boolean(row))
    .sort((left, right) => (
      left.lineageDepth - right.lineageDepth
      || left.sourceTypePriority - right.sourceTypePriority
      || left.sourceIssueId.localeCompare(right.sourceIssueId)
      || left.artifactPath.localeCompare(right.artifactPath)
      || left.id.localeCompare(right.id)
    ));
  const filteredRows = filterLineageReplayNavigatorRows(rows, activeFilter);
  const rowIdSet = new Set(filteredRows.map((row) => row.id));
  const activeRowId = rowIdSet.has(input.activeRowId)
    ? input.activeRowId
    : (filteredRows[0]?.id ?? '');
  return {
    contract: 'settlement-lineage-replay-navigator.v1',
    cursorVersion: normalizeOptional(input.cursorVersion) ?? 'cursor-v1',
    windowStart: resolveDateString(input.windowStart, LINEAGE_REPLAY_FALLBACK_WINDOW_START),
    windowEnd: resolveDateString(input.windowEnd, LINEAGE_REPLAY_FALLBACK_WINDOW_END),
    rows: filteredRows,
    activeFilter,
    activeRowId,
  };
}

export function moveLineageReplayNavigatorSelection(input: {
  rows: LineageReplayNavigatorRow[];
  activeRowId: string;
  direction: 'next' | 'prev';
}): string {
  if (input.rows.length === 0) {
    return '';
  }
  const currentIndex = input.rows.findIndex((row) => row.id === input.activeRowId);
  if (currentIndex < 0) {
    return input.rows[0].id;
  }
  if (input.direction === 'next') {
    return input.rows[Math.min(currentIndex + 1, input.rows.length - 1)].id;
  }
  return input.rows[Math.max(currentIndex - 1, 0)].id;
}

export function resolveLineageReplayNavigatorShortcut(input: {
  key: string;
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): LineageReplayNavigatorShortcut | null {
  const normalizedKey = input.key.toLowerCase();
  if (input.altKey && normalizedKey === 'l') {
    return 'focus_lineage_navigator';
  }
  if (input.altKey && normalizedKey === 'n') {
    return 'next_row';
  }
  if (input.altKey && normalizedKey === 'p') {
    return 'prev_row';
  }
  if (input.key === 'Enter' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'validate_evidence_packet';
  }
  return null;
}

export function getDefaultQaEvidencePacketComposerDraft(): QaEvidencePacketComposerDraft {
  return {
    branch: '',
    fullSha: QA_EVIDENCE_SHA_PLACEHOLDER,
    mode: 'no_pr',
    prLink: '',
    blockerOwner: '',
    eta: '',
    testCommandSummary: '',
    artifactPathsText: '',
    dependencyIssueLinksText: '',
  };
}

export function validateQaEvidencePacketComposerDraft(
  draft: QaEvidencePacketComposerDraft,
): QaEvidencePacketComposerValidation {
  const errors: string[] = [];
  const missingFields: string[] = [];
  const branch = draft.branch.trim();
  const fullSha = draft.fullSha.trim();
  const prLink = draft.prLink.trim();
  const blockerOwner = draft.blockerOwner.trim();
  const eta = draft.eta.trim();
  const testCommandSummary = draft.testCommandSummary.trim();
  const artifactPaths = normalizeMultilineEntries(draft.artifactPathsText);
  const dependencyIssueLinks = normalizeDependencyIssueLinks(draft.dependencyIssueLinksText);

  if (!branch) {
    missingFields.push('branch');
  }
  if (!fullSha) {
    missingFields.push('fullSha');
  } else if (!/^[a-f0-9]{40}$/i.test(fullSha)) {
    errors.push('Full SHA must be a 40-character hexadecimal value.');
  } else if (fullSha === QA_EVIDENCE_SHA_PLACEHOLDER) {
    errors.push('Full SHA placeholder must be replaced with a real commit SHA before completion.');
  }

  if (draft.mode === 'pr') {
    if (!prLink) {
      missingFields.push('prLink');
    } else if (!/^https:\/\/github\.com\/.+\/pull\/\d+$/i.test(prLink)) {
      errors.push('PR link must be a GitHub pull request URL.');
    }
  } else {
    if (!blockerOwner) {
      missingFields.push('blockerOwner');
    }
    if (!eta) {
      missingFields.push('eta');
    } else if (!Number.isFinite(new Date(eta).getTime())) {
      errors.push('ETA must be a valid date-time string.');
    }
  }

  if (!testCommandSummary) {
    missingFields.push('testCommandSummary');
  }
  if (artifactPaths.length === 0) {
    missingFields.push('artifactPaths');
  }
  if (dependencyIssueLinks.length === 0) {
    missingFields.push('dependencyIssueLinks');
  }
  for (const link of dependencyIssueLinks) {
    if (!isValidIssueLink(link)) {
      errors.push(`Dependency issue link is invalid: ${link}`);
    }
  }

  return {
    isComplete: errors.length === 0 && missingFields.length === 0,
    errors,
    missingFields,
    artifactPaths,
    dependencyIssueLinks,
  };
}

export function resetQaEvidencePacketComposerDraftSafe(input: {
  activeLineageFilter: LineageReplayNavigatorFilterKey;
  activeReplayRowId: string;
  confirmFullReset: boolean;
}): {
  draft: QaEvidencePacketComposerDraft;
  activeLineageFilter: LineageReplayNavigatorFilterKey;
  activeReplayRowId: string;
  didFullReset: boolean;
  message: string;
} {
  if (input.confirmFullReset) {
    return {
      draft: getDefaultQaEvidencePacketComposerDraft(),
      activeLineageFilter: 'all',
      activeReplayRowId: '',
      didFullReset: true,
      message: 'Evidence packet draft cleared. Lineage filter and active replay row reset to default.',
    };
  }
  return {
    draft: getDefaultQaEvidencePacketComposerDraft(),
    activeLineageFilter: input.activeLineageFilter,
    activeReplayRowId: input.activeReplayRowId,
    didFullReset: false,
    message: 'Evidence packet draft cleared. Lineage filter and active replay row preserved.',
  };
}

export function moveOperatorDecisionQueueFocus(input: {
  items: OperatorDecisionQueueItem[];
  activeItemId: string;
  direction: 'next' | 'prev';
}): string {
  if (input.items.length === 0) {
    return '';
  }
  const currentIndex = input.items.findIndex((item) => item.id === input.activeItemId);
  if (currentIndex < 0) {
    return input.items[0].id;
  }
  if (input.direction === 'next') {
    return input.items[Math.min(currentIndex + 1, input.items.length - 1)].id;
  }
  return input.items[Math.max(currentIndex - 1, 0)].id;
}

export function resolveOperatorDecisionQueueShortcut(key: string): 'next' | 'prev' | 'unstage' | null {
  const normalized = key.toLowerCase();
  if (normalized === 'arrowdown' || normalized === 'j') {
    return 'next';
  }
  if (normalized === 'arrowup' || normalized === 'k') {
    return 'prev';
  }
  if (normalized === 'backspace' || normalized === 'delete') {
    return 'unstage';
  }
  return null;
}

export function resetOperatorDecisionQueueDraftSafe(input: {
  activeMatrixFilter: ScenarioCompareMatrixFilterKey;
  confirmFilterReset: boolean;
}): {
  stagedRowIds: string[];
  activeMatrixFilter: ScenarioCompareMatrixFilterKey;
  message: string;
} {
  if (input.confirmFilterReset) {
    return {
      stagedRowIds: [],
      activeMatrixFilter: 'all',
      message: 'Queue draft and matrix filter reset to default.',
    };
  }
  return {
    stagedRowIds: [],
    activeMatrixFilter: input.activeMatrixFilter,
    message: 'Queue draft cleared. Matrix filter preserved until explicit reset confirm.',
  };
}

export function buildExceptionSimulationOutcomePanel(selectedRows: unknown[]): ExceptionSimulationOutcomePanel {
  const normalizedRows = selectedRows
    .map((row) => parseExceptionBulkPreviewRow(row))
    .filter((row): row is ExceptionBulkPreviewRow => Boolean(row))
    .sort((a, b) => a.id.localeCompare(b.id));
  const malformedCount = selectedRows.length - normalizedRows.length;
  const bucketCounts = createZeroSimulationBucketCounts();
  const reasonCounts = createZeroRollbackReasonCounts();

  const rows: ExceptionSimulationOutcomeRow[] = normalizedRows.map((row) => {
    const reasonCodes = resolveSimulationReasonCodes(row);
    const bucket = resolveSimulationBucket(reasonCodes);
    bucketCounts[bucket] += 1;
    for (const code of reasonCodes) {
      reasonCounts[code] += 1;
    }
    return {
      id: row.id,
      merchantId: row.merchantId,
      provider: row.provider,
      bucket,
      reasonCodes,
    };
  });

  if (malformedCount > 0) {
    reasonCounts.MALFORMED_ROW += malformedCount;
    bucketCounts.rollback_recommended += malformedCount;
  }

  const buckets = SIMULATION_BUCKET_ORDER.map((key) => ({
    key,
    label: SIMULATION_BUCKET_METADATA[key].label,
    description: SIMULATION_BUCKET_METADATA[key].description,
    count: bucketCounts[key],
  }));

  const reasonCodes = ROLLBACK_REASON_CODE_ORDER.map((code) => ({
    code,
    severity: ROLLBACK_REASON_METADATA[code].severity,
    description: ROLLBACK_REASON_METADATA[code].description,
    nextStep: ROLLBACK_REASON_METADATA[code].nextStep,
    count: reasonCounts[code],
  }));

  let fallback = {
    active: false,
    title: '',
    message: '',
    resetActionLabel: 'Safe Reset Selection',
  };
  if (selectedRows.length === 0) {
    fallback = {
      active: true,
      title: 'Simulation payload missing',
      message: 'No selected rows are available for simulation. Select rows, then rerun preview.',
      resetActionLabel: 'Safe Reset Selection',
    };
  } else if (malformedCount > 0) {
    fallback = {
      active: true,
      title: 'Malformed simulation payload',
      message: `${malformedCount} row(s) are malformed and moved to rollback_recommended fallback. Use deterministic reset before retry.`,
      resetActionLabel: 'Safe Reset Selection',
    };
  }

  return {
    contract: 'settlement-bulk-simulation-outcome.v1',
    selectedCount: selectedRows.length,
    validCount: normalizedRows.length,
    malformedCount,
    buckets,
    rows,
    reasonCodes,
    fallback,
  };
}

export function filterExceptionSimulationOutcomeRows(
  rows: ExceptionSimulationOutcomeRow[],
  drilldown: ExceptionSimulationReasonDrilldownKey,
): ExceptionSimulationOutcomeRow[] {
  if (drilldown === 'all') {
    return rows;
  }
  return rows.filter((row) => row.reasonCodes.includes(drilldown));
}

function normalizeReasons(reasons: ExceptionConflictReason[]): ExceptionConflictReason[] {
  const reasonSet = new Set<ExceptionConflictReason>(reasons);
  return CONFLICT_REASON_ORDER.filter((reason) => reasonSet.has(reason));
}

export function buildExceptionBulkDiffInspector(selectedRows: unknown[]): ExceptionBulkDiffInspector {
  const reasonCounts: Record<ExceptionConflictReason, number> = {
    stale_version: 0,
    malformed: 0,
    high_delta: 0,
    mixed_status: 0,
  };

  const rows = selectedRows.map((raw, index) => {
    const parsed = parseExceptionBulkPreviewRow(raw);
    if (!parsed) {
      const reasons = normalizeReasons(['malformed']);
      return {
        sortKey: `~malformed-${String(index + 1).padStart(4, '0')}`,
        originalIndex: index,
        row: {
          id: `malformed-${index + 1}`,
          merchantId: '-',
          provider: '-',
          deltas: DIFF_FIELD_ORDER.map((field) => ({
            field,
            current: 'n/a',
            incoming: 'n/a',
            changed: false,
          })),
          reasons,
        } satisfies ExceptionDiffInspectorRow,
      };
    }

    const deltas: ExceptionDiffDelta[] = [
      { field: 'amount', current: parsed.amount, incoming: parsed.incomingAmount, changed: parsed.amount !== parsed.incomingAmount },
      { field: 'status', current: parsed.status, incoming: parsed.incomingStatus, changed: parsed.status !== parsed.incomingStatus },
      { field: 'updatedAt', current: parsed.updatedAt, incoming: parsed.incomingUpdatedAt, changed: parsed.updatedAt !== parsed.incomingUpdatedAt },
      { field: 'version', current: parsed.version, incoming: parsed.incomingVersion, changed: parsed.version !== parsed.incomingVersion },
    ];

    const reasons: ExceptionConflictReason[] = [];
    if (parsed.incomingVersion < parsed.version) {
      reasons.push('stale_version');
    }
    if (Math.abs(parsed.incomingAmount - parsed.amount) >= 100) {
      reasons.push('high_delta');
    }
    if (parsed.incomingStatus !== parsed.status) {
      reasons.push('mixed_status');
    }

    return {
      sortKey: parsed.id,
      originalIndex: index,
      row: {
        id: parsed.id,
        merchantId: parsed.merchantId,
        provider: parsed.provider,
        deltas,
        reasons: normalizeReasons(reasons),
      } satisfies ExceptionDiffInspectorRow,
    };
  }).sort((a, b) => a.sortKey.localeCompare(b.sortKey) || (a.originalIndex - b.originalIndex));

  for (const item of rows) {
    for (const reason of item.row.reasons) {
      reasonCounts[reason] += 1;
    }
  }

  return {
    rows: rows.map((item) => item.row),
    reasonCounts,
  };
}

export function filterExceptionDiffInspectorRows(
  rows: ExceptionDiffInspectorRow[],
  drilldown: ExceptionConflictDrilldownKey,
): ExceptionDiffInspectorRow[] {
  if (drilldown === 'all') {
    return rows;
  }
  return rows.filter((row) => row.reasons.includes(drilldown));
}

export function resolveExceptionConflictShortcutDrilldown(key: string): ExceptionConflictDrilldownKey | null {
  const normalized = key.trim();
  if (normalized === '0') {
    return 'all';
  }
  if (normalized === '1') {
    return 'stale_version';
  }
  if (normalized === '2') {
    return 'malformed';
  }
  if (normalized === '3') {
    return 'high_delta';
  }
  if (normalized === '4') {
    return 'mixed_status';
  }
  return null;
}

export function moveExceptionDiffInspectorFocus(input: {
  rows: ExceptionDiffInspectorRow[];
  activeRowId: string;
  direction: 'next' | 'prev';
}): string {
  if (input.rows.length === 0) {
    return '';
  }
  const currentIndex = input.rows.findIndex((row) => row.id === input.activeRowId);
  if (currentIndex < 0) {
    return input.rows[0].id;
  }
  if (input.direction === 'next') {
    return input.rows[Math.min(currentIndex + 1, input.rows.length - 1)].id;
  }
  return input.rows[Math.max(currentIndex - 1, 0)].id;
}

export function resolveExceptionDiffInspectorEmptyState(input: {
  activeReason: ExceptionConflictDrilldownKey;
  totalRows: number;
  filteredRows: number;
}): { title: string; message: string } | null {
  if (input.totalRows === 0) {
    return {
      title: 'No diff rows selected',
      message: 'Select exception rows first, then use safe reset to recover quickly if selection becomes stale.',
    };
  }
  if (input.filteredRows === 0 && input.activeReason !== 'all') {
    return {
      title: 'No rows in this drilldown',
      message: `No rows match "${input.activeReason}". Switch drilldown or use safe reset to return to confirmation state.`,
    };
  }
  return null;
}

export type ExceptionQueryState = {
  merchantId: string;
  provider: string;
  status: '' | ExceptionStatus;
  startDate: string;
  endDate: string;
  page: number;
  pageSize: number;
  preset: '' | ExceptionPresetKey;
};

export type ExceptionQueryPreset = {
  key: ExceptionPresetKey;
  label: string;
  filters: Pick<ExceptionQueryState, 'merchantId' | 'provider' | 'status' | 'startDate' | 'endDate'>;
};

export type ExplainabilitySeverityWindow = 'all' | 'warning' | 'critical';

export type ExplainabilityPresetSlot = {
  slotIndex: 1 | 2 | 3 | 4;
  name: string;
  reasonBuckets: Record<ExceptionConflictReason, boolean>;
  severityWindow: ExplainabilitySeverityWindow;
  savedAt: string;
};

export type ExplainabilityComposerDraft = {
  name: string;
  reasonBuckets: Record<ExceptionConflictReason, boolean>;
  severityWindow: ExplainabilitySeverityWindow;
};

export type ExplainabilityFilterChip = {
  key: string;
  label: string;
  value: string;
};

type ExplainabilityPresetShortcut = {
  action: 'apply' | 'overwrite';
  slotIndex: 1 | 2 | 3 | 4;
} | null;

export const DEFAULT_EXCEPTION_QUERY_STATE: ExceptionQueryState = {
  merchantId: '',
  provider: '',
  status: 'open',
  startDate: '',
  endDate: '',
  page: 1,
  pageSize: 10,
  preset: 'open',
};

const EXCEPTION_QUERY_PRESETS: ExceptionQueryPreset[] = [
  {
    key: 'open',
    label: 'Open',
    filters: { merchantId: '', provider: '', status: 'open', startDate: '', endDate: '' },
  },
  {
    key: 'investigating',
    label: 'Investigating',
    filters: { merchantId: '', provider: '', status: 'investigating', startDate: '', endDate: '' },
  },
  {
    key: 'resolved',
    label: 'Resolved',
    filters: { merchantId: '', provider: '', status: 'resolved', startDate: '', endDate: '' },
  },
  {
    key: 'ignored',
    label: 'Ignored',
    filters: { merchantId: '', provider: '', status: 'ignored', startDate: '', endDate: '' },
  },
  {
    key: 'high_risk_merchant',
    label: 'High-Risk Merchant',
    filters: { merchantId: 'merchant-high-risk', provider: '', status: 'open', startDate: '', endDate: '' },
  },
];
const EXPLAINABILITY_SLOT_INDEXES: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];
const EXPLAINABILITY_REASON_BUCKET_ORDER: ExceptionConflictReason[] = [
  'stale_version',
  'malformed',
  'high_delta',
  'mixed_status',
];
const EXPLAINABILITY_DEFAULT_REASON_BUCKETS: Record<ExceptionConflictReason, boolean> = {
  stale_version: true,
  malformed: true,
  high_delta: true,
  mixed_status: true,
};
const EXPLAINABILITY_DEFAULT_NAMES: Record<1 | 2 | 3 | 4, string> = {
  1: 'Open + Warning',
  2: 'Critical Only',
  3: 'Mixed Status Watch',
  4: 'Stale Version Focus',
};
const EXPLAINABILITY_DEFAULT_SEVERITY: Record<1 | 2 | 3 | 4, ExplainabilitySeverityWindow> = {
  1: 'warning',
  2: 'critical',
  3: 'all',
  4: 'warning',
};
const EXPLAINABILITY_REASON_SEVERITY: Record<ExceptionConflictReason, Exclude<ExplainabilitySeverityWindow, 'all'>> = {
  stale_version: 'warning',
  mixed_status: 'warning',
  malformed: 'critical',
  high_delta: 'critical',
};

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function firstQueryValue(input: unknown): string | undefined {
  if (Array.isArray(input)) {
    const hit = input.find((value) => typeof value === 'string');
    return typeof hit === 'string' ? hit : undefined;
  }
  return typeof input === 'string' ? input : undefined;
}

function isValidDateOnly(input: string): boolean {
  if (!DATE_ONLY_RE.test(input)) {
    return false;
  }
  const date = new Date(`${input}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === input;
}

function parsePositiveInt(input: string | undefined): number | null {
  if (!input) {
    return null;
  }
  if (!/^\d+$/.test(input)) {
    return null;
  }
  const value = Number(input);
  return Number.isFinite(value) ? value : null;
}

function isExceptionPresetKey(input: string): input is ExceptionPresetKey {
  return EXCEPTION_QUERY_PRESETS.some((preset) => preset.key === input);
}

function resolvePreset(key: ExceptionPresetKey): ExceptionQueryPreset {
  return EXCEPTION_QUERY_PRESETS.find((preset) => preset.key === key) ?? EXCEPTION_QUERY_PRESETS[0];
}

export function listExceptionQueryPresets(): ExceptionQueryPreset[] {
  return EXCEPTION_QUERY_PRESETS;
}

export function createDefaultExplainabilityPresetSlots(nowIso = new Date().toISOString()): ExplainabilityPresetSlot[] {
  return EXPLAINABILITY_SLOT_INDEXES.map((slotIndex) => {
    const reasonBuckets = { ...EXPLAINABILITY_DEFAULT_REASON_BUCKETS };
    if (slotIndex === 2) {
      reasonBuckets.stale_version = false;
      reasonBuckets.mixed_status = false;
    }
    if (slotIndex === 4) {
      reasonBuckets.malformed = false;
      reasonBuckets.high_delta = false;
    }
    return {
      slotIndex,
      name: EXPLAINABILITY_DEFAULT_NAMES[slotIndex],
      reasonBuckets,
      severityWindow: EXPLAINABILITY_DEFAULT_SEVERITY[slotIndex],
      savedAt: nowIso,
    };
  });
}

export function buildExplainabilityComposerDraftFromSlot(slot: ExplainabilityPresetSlot): ExplainabilityComposerDraft {
  return {
    name: slot.name,
    reasonBuckets: { ...slot.reasonBuckets },
    severityWindow: slot.severityWindow,
  };
}

function normalizeExplainabilityDraft(
  draft: Partial<ExplainabilityComposerDraft>,
  fallbackName: string,
): ExplainabilityComposerDraft {
  return {
    name: (draft.name ?? '').trim() || fallbackName,
    reasonBuckets: {
      stale_version: draft.reasonBuckets?.stale_version ?? true,
      malformed: draft.reasonBuckets?.malformed ?? true,
      high_delta: draft.reasonBuckets?.high_delta ?? true,
      mixed_status: draft.reasonBuckets?.mixed_status ?? true,
    },
    severityWindow: draft.severityWindow === 'warning' || draft.severityWindow === 'critical'
      ? draft.severityWindow
      : 'all',
  };
}

function normalizeExplainabilitySlot(
  slot: ExplainabilityPresetSlot,
  nowIso: string,
): ExplainabilityPresetSlot {
  return {
    slotIndex: slot.slotIndex,
    name: slot.name.trim() || EXPLAINABILITY_DEFAULT_NAMES[slot.slotIndex],
    reasonBuckets: {
      stale_version: Boolean(slot.reasonBuckets.stale_version),
      malformed: Boolean(slot.reasonBuckets.malformed),
      high_delta: Boolean(slot.reasonBuckets.high_delta),
      mixed_status: Boolean(slot.reasonBuckets.mixed_status),
    },
    severityWindow: slot.severityWindow === 'warning' || slot.severityWindow === 'critical'
      ? slot.severityWindow
      : 'all',
    savedAt: slot.savedAt || nowIso,
  };
}

export function overwriteExplainabilityPresetSlot(input: {
  slots: ExplainabilityPresetSlot[];
  slotIndex: 1 | 2 | 3 | 4;
  draft: Partial<ExplainabilityComposerDraft>;
  nowIso?: string;
}): ExplainabilityPresetSlot[] {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const fallback = EXPLAINABILITY_DEFAULT_NAMES[input.slotIndex];
  const normalizedDraft = normalizeExplainabilityDraft(input.draft, fallback);
  const slots = input.slots.length
    ? input.slots
    : createDefaultExplainabilityPresetSlots(nowIso);
  return slots.map((slot) => (
    slot.slotIndex === input.slotIndex
      ? normalizeExplainabilitySlot({
        slotIndex: input.slotIndex,
        name: normalizedDraft.name,
        reasonBuckets: normalizedDraft.reasonBuckets,
        severityWindow: normalizedDraft.severityWindow,
        savedAt: nowIso,
      }, nowIso)
      : normalizeExplainabilitySlot(slot, nowIso)
  ));
}

function severityWindowMatches(
  reason: ExceptionConflictReason,
  severityWindow: ExplainabilitySeverityWindow,
): boolean {
  if (severityWindow === 'all') {
    return true;
  }
  return EXPLAINABILITY_REASON_SEVERITY[reason] === severityWindow;
}

export function buildDeterministicExplainabilityFilterChips(input: {
  slot: ExplainabilityPresetSlot;
  reasonCounts?: Partial<Record<ExceptionConflictReason, number>>;
}): ExplainabilityFilterChip[] {
  const chips: ExplainabilityFilterChip[] = [
    {
      key: 'slot',
      label: `slot-${input.slot.slotIndex}`,
      value: input.slot.name,
    },
    {
      key: 'severity',
      label: 'severity_window',
      value: input.slot.severityWindow,
    },
  ];

  for (const reason of EXPLAINABILITY_REASON_BUCKET_ORDER) {
    if (!input.slot.reasonBuckets[reason]) {
      continue;
    }
    if (!severityWindowMatches(reason, input.slot.severityWindow)) {
      continue;
    }
    const count = Number(input.reasonCounts?.[reason] ?? 0);
    chips.push({
      key: `reason-${reason}`,
      label: reason,
      value: String(Math.max(0, count)),
    });
  }
  return chips;
}

export function applyExplainabilityPresetSlot(input: {
  slots: ExplainabilityPresetSlot[];
  slotIndex: 1 | 2 | 3 | 4;
  reasonCounts?: Partial<Record<ExceptionConflictReason, number>>;
}): { activeSlotIndex: 1 | 2 | 3 | 4; chips: ExplainabilityFilterChip[] } {
  const slot = input.slots.find((candidate) => candidate.slotIndex === input.slotIndex)
    ?? createDefaultExplainabilityPresetSlots()[input.slotIndex - 1];
  return {
    activeSlotIndex: input.slotIndex,
    chips: buildDeterministicExplainabilityFilterChips({
      slot,
      reasonCounts: input.reasonCounts,
    }),
  };
}

export function resolveExplainabilityPresetShortcut(input: {
  key: string;
  altKey: boolean;
  shiftKey: boolean;
}): ExplainabilityPresetShortcut {
  if (!input.altKey) {
    return null;
  }
  if (!/^[1-4]$/.test(input.key)) {
    return null;
  }
  const slotIndex = Number(input.key) as 1 | 2 | 3 | 4;
  return {
    action: input.shiftKey ? 'overwrite' : 'apply',
    slotIndex,
  };
}

export function resetExplainabilityComposerDraftSafe(input: {
  slots: ExplainabilityPresetSlot[];
  activeSlotIndex: 1 | 2 | 3 | 4;
  appliedChips: ExplainabilityFilterChip[];
}): { draft: ExplainabilityComposerDraft; appliedChips: ExplainabilityFilterChip[] } {
  const slot = input.slots.find((candidate) => candidate.slotIndex === input.activeSlotIndex)
    ?? createDefaultExplainabilityPresetSlots()[input.activeSlotIndex - 1];
  return {
    draft: buildExplainabilityComposerDraftFromSlot(slot),
    appliedChips: [...input.appliedChips],
  };
}

export function applyExceptionQueryPreset(state: ExceptionQueryState, key: ExceptionPresetKey): ExceptionQueryState {
  const preset = resolvePreset(key);
  return {
    ...DEFAULT_EXCEPTION_QUERY_STATE,
    pageSize: state.pageSize,
    ...preset.filters,
    page: 1,
    preset: preset.key,
  };
}

export function resolveActiveExceptionPreset(state: ExceptionQueryState): '' | ExceptionPresetKey {
  for (const preset of EXCEPTION_QUERY_PRESETS) {
    if (
      state.merchantId.trim() === preset.filters.merchantId
      && state.provider.trim() === preset.filters.provider
      && state.status === preset.filters.status
      && state.startDate === preset.filters.startDate
      && state.endDate === preset.filters.endDate
    ) {
      return preset.key;
    }
  }
  return '';
}

export function serializeExceptionQueryState(state: ExceptionQueryState): Record<string, string> {
  const query: Record<string, string> = {};
  const merchantId = state.merchantId.trim();
  const provider = state.provider.trim();
  const activePreset = resolveActiveExceptionPreset(state);
  if (merchantId) query.exceptionMerchant = merchantId;
  if (provider) query.exceptionProvider = provider;
  if (state.status) query.exceptionStatus = state.status;
  if (state.startDate) query.exceptionStartDate = state.startDate;
  if (state.endDate) query.exceptionEndDate = state.endDate;
  if (state.page > 1) query.exceptionPage = String(state.page);
  if (state.pageSize !== DEFAULT_EXCEPTION_QUERY_STATE.pageSize) query.exceptionPageSize = String(state.pageSize);
  if (activePreset) query.exceptionPreset = activePreset;
  return query;
}

export type ExceptionQueryParseResult = {
  state: ExceptionQueryState;
  recoveryReasons: string[];
};

export function parseExceptionQueryState(
  query: Record<string, unknown>,
  now = new Date(),
): ExceptionQueryParseResult {
  const recoveryReasons: string[] = [];
  const presetRaw = firstQueryValue(query.exceptionPreset)?.trim() ?? '';
  const hasPreset = Boolean(presetRaw);
  const state = hasPreset && isExceptionPresetKey(presetRaw)
    ? applyExceptionQueryPreset(DEFAULT_EXCEPTION_QUERY_STATE, presetRaw)
    : { ...DEFAULT_EXCEPTION_QUERY_STATE };

  if (hasPreset && !isExceptionPresetKey(presetRaw)) {
    recoveryReasons.push(`Unknown preset "${presetRaw}".`);
  }

  const merchant = normalizeOptional(firstQueryValue(query.exceptionMerchant));
  if (merchant) state.merchantId = merchant;

  const provider = normalizeOptional(firstQueryValue(query.exceptionProvider));
  if (provider) state.provider = provider;

  const statusRaw = normalizeOptional(firstQueryValue(query.exceptionStatus));
  if (statusRaw) {
    if (statusRaw === 'open' || statusRaw === 'investigating' || statusRaw === 'resolved' || statusRaw === 'ignored') {
      state.status = statusRaw;
    } else {
      recoveryReasons.push(`Unknown status "${statusRaw}".`);
    }
  }

  const startDate = normalizeOptional(firstQueryValue(query.exceptionStartDate));
  if (startDate) {
    if (isValidDateOnly(startDate)) {
      state.startDate = startDate;
    } else {
      recoveryReasons.push(`Invalid start date "${startDate}".`);
    }
  }

  const endDate = normalizeOptional(firstQueryValue(query.exceptionEndDate));
  if (endDate) {
    if (isValidDateOnly(endDate)) {
      state.endDate = endDate;
    } else {
      recoveryReasons.push(`Invalid end date "${endDate}".`);
    }
  }

  if (state.startDate && state.endDate && state.startDate > state.endDate) {
    recoveryReasons.push('Start date is after end date.');
  }

  if (state.endDate) {
    const end = new Date(`${state.endDate}T23:59:59.000Z`);
    const ageMs = now.getTime() - end.getTime();
    const maxAgeMs = 90 * 24 * 60 * 60 * 1000;
    if (ageMs > maxAgeMs) {
      recoveryReasons.push(`Query window expired for end date "${state.endDate}".`);
    }
  }

  const pageRaw = firstQueryValue(query.exceptionPage);
  if (pageRaw) {
    const parsed = parsePositiveInt(pageRaw);
    if (parsed && parsed >= 1) {
      state.page = parsed;
    } else {
      recoveryReasons.push(`Invalid page "${pageRaw}".`);
    }
  }

  const pageSizeRaw = firstQueryValue(query.exceptionPageSize);
  if (pageSizeRaw) {
    const parsed = parsePositiveInt(pageSizeRaw);
    if (parsed && parsed >= 1 && parsed <= 100) {
      state.pageSize = parsed;
    } else {
      recoveryReasons.push(`Invalid page size "${pageSizeRaw}".`);
    }
  }

  state.preset = resolveActiveExceptionPreset(state);
  if (recoveryReasons.length > 0) {
    return {
      state: { ...DEFAULT_EXCEPTION_QUERY_STATE },
      recoveryReasons,
    };
  }

  return { state, recoveryReasons };
}

export const EXCEPTION_SAVED_VIEW_SCHEMA_VERSION = 1;
export const EXCEPTION_SAVED_VIEW_QUERY_KEY = 'exceptionSavedViews';
export const EXCEPTION_SAVED_VIEW_STORAGE_KEY = 'pg.exceptionSavedViews.v1';

export type ExceptionSavedViewQuery = Pick<
  ExceptionQueryState,
  'merchantId' | 'provider' | 'status' | 'startDate' | 'endDate' | 'pageSize'
>;

export type ExceptionSavedView = {
  id: string;
  name: string;
  pinned: boolean;
  query: ExceptionSavedViewQuery;
  createdAt: string;
  updatedAt: string;
};

export type ExceptionSavedViewState = {
  version: typeof EXCEPTION_SAVED_VIEW_SCHEMA_VERSION;
  activeViewId: string;
  views: ExceptionSavedView[];
};

export type ExceptionSavedViewRestoreResult = {
  state: ExceptionSavedViewState;
  source: 'query' | 'storage' | 'default';
  recoveryReasons: string[];
};

export const DEFAULT_EXCEPTION_SAVED_VIEW_STATE: ExceptionSavedViewState = {
  version: EXCEPTION_SAVED_VIEW_SCHEMA_VERSION,
  activeViewId: '',
  views: [],
};

function normalizeSavedViewName(input: string, fallbackIndex: number): string {
  const normalized = input.trim().replace(/\s+/g, ' ');
  if (normalized) {
    return normalized.slice(0, 64);
  }
  return `Saved View ${fallbackIndex}`;
}

function normalizeSavedViewQuery(input: Partial<ExceptionSavedViewQuery>): ExceptionSavedViewQuery {
  const status = input.status === 'open'
    || input.status === 'investigating'
    || input.status === 'resolved'
    || input.status === 'ignored'
    ? input.status
    : '';
  const startDate = typeof input.startDate === 'string' && isValidDateOnly(input.startDate) ? input.startDate : '';
  const endDate = typeof input.endDate === 'string' && isValidDateOnly(input.endDate) ? input.endDate : '';
  const pageSize = Number(input.pageSize);
  return {
    merchantId: normalizeOptional(input.merchantId) ?? '',
    provider: normalizeOptional(input.provider) ?? '',
    status,
    startDate,
    endDate,
    pageSize: Number.isFinite(pageSize) && pageSize >= 1 && pageSize <= 100 ? pageSize : DEFAULT_EXCEPTION_QUERY_STATE.pageSize,
  };
}

function sortSavedViews(views: ExceptionSavedView[]): ExceptionSavedView[] {
  return [...views].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }
    if (left.updatedAt !== right.updatedAt) {
      return right.updatedAt.localeCompare(left.updatedAt);
    }
    return left.id.localeCompare(right.id);
  });
}

function normalizeSavedViewState(raw: ExceptionSavedViewState): ExceptionSavedViewState {
  const views = sortSavedViews(raw.views.map((view) => ({
    ...view,
    query: normalizeSavedViewQuery(view.query),
    name: normalizeSavedViewName(view.name, 1),
  })));
  const pinnedViewId = views.find((view) => view.pinned)?.id ?? '';
  const activeViewId = views.some((view) => view.id === raw.activeViewId)
    ? raw.activeViewId
    : (pinnedViewId || views[0]?.id || '');
  return {
    version: EXCEPTION_SAVED_VIEW_SCHEMA_VERSION,
    activeViewId,
    views: views.map((view) => ({
      ...view,
      pinned: pinnedViewId ? view.id === pinnedViewId : false,
    })),
  };
}

export function createExceptionSavedView(
  state: ExceptionSavedViewState,
  input: {
    name: string;
    query: Partial<ExceptionSavedViewQuery>;
    nowIso?: string;
  },
): ExceptionSavedViewState {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const query = normalizeSavedViewQuery(input.query);
  const name = normalizeSavedViewName(input.name, state.views.length + 1);
  const id = `sv-${hashFNV1a(JSON.stringify({ name, query, nowIso }))}`;
  const views = sortSavedViews([
    ...state.views,
    {
      id,
      name,
      pinned: state.views.length === 0,
      query,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ]);
  return normalizeSavedViewState({
    version: EXCEPTION_SAVED_VIEW_SCHEMA_VERSION,
    activeViewId: id,
    views,
  });
}

export function renameExceptionSavedView(
  state: ExceptionSavedViewState,
  input: { viewId: string; name: string; nowIso?: string },
): ExceptionSavedViewState {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const target = state.views.find((view) => view.id === input.viewId);
  if (!target) {
    return state;
  }
  const name = normalizeSavedViewName(input.name, 1);
  if (name === target.name) {
    return state;
  }
  const views = sortSavedViews(state.views.map((view) => (
    view.id === input.viewId
      ? { ...view, name, updatedAt: nowIso }
      : view
  )));
  return normalizeSavedViewState({
    version: EXCEPTION_SAVED_VIEW_SCHEMA_VERSION,
    activeViewId: state.activeViewId,
    views,
  });
}

export function deleteExceptionSavedView(
  state: ExceptionSavedViewState,
  viewId: string,
): ExceptionSavedViewState {
  const views = state.views.filter((view) => view.id !== viewId);
  return normalizeSavedViewState({
    version: EXCEPTION_SAVED_VIEW_SCHEMA_VERSION,
    activeViewId: state.activeViewId === viewId ? '' : state.activeViewId,
    views,
  });
}

export function pinExceptionSavedView(
  state: ExceptionSavedViewState,
  input: { viewId: string; nowIso?: string },
): ExceptionSavedViewState {
  const nowIso = input.nowIso ?? new Date().toISOString();
  if (!state.views.some((view) => view.id === input.viewId)) {
    return state;
  }
  const views = sortSavedViews(state.views.map((view) => ({
    ...view,
    pinned: view.id === input.viewId,
    updatedAt: view.id === input.viewId ? nowIso : view.updatedAt,
  })));
  return normalizeSavedViewState({
    version: EXCEPTION_SAVED_VIEW_SCHEMA_VERSION,
    activeViewId: input.viewId,
    views,
  });
}

export function activateExceptionSavedView(
  state: ExceptionSavedViewState,
  viewId: string,
): ExceptionSavedViewState {
  if (!state.views.some((view) => view.id === viewId)) {
    return state;
  }
  return normalizeSavedViewState({
    version: EXCEPTION_SAVED_VIEW_SCHEMA_VERSION,
    activeViewId: viewId,
    views: state.views,
  });
}

export function buildExceptionQueryFromSavedView(
  state: ExceptionSavedViewState,
  viewId: string,
): ExceptionQueryState | null {
  const view = state.views.find((candidate) => candidate.id === viewId);
  if (!view) {
    return null;
  }
  const next: ExceptionQueryState = {
    ...DEFAULT_EXCEPTION_QUERY_STATE,
    ...normalizeSavedViewQuery(view.query),
    page: 1,
    preset: '',
  };
  next.preset = resolveActiveExceptionPreset(next);
  return next;
}

export function serializeExceptionSavedViewState(state: ExceptionSavedViewState): string {
  const normalized = normalizeSavedViewState(state);
  return JSON.stringify({
    version: normalized.version,
    activeViewId: normalized.activeViewId,
    views: normalized.views.map((view) => ({
      id: view.id,
      name: view.name,
      pinned: view.pinned,
      query: view.query,
      createdAt: view.createdAt,
      updatedAt: view.updatedAt,
    })),
  });
}

function parseExceptionSavedViewStatePayload(
  rawPayload: unknown,
): { state: ExceptionSavedViewState; recoveryReasons: string[] } {
  const payload = firstQueryValue(rawPayload)?.trim() ?? (typeof rawPayload === 'string' ? rawPayload.trim() : '');
  if (!payload) {
    return {
      state: DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
      recoveryReasons: [],
    };
  }

  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    if (parsed.version !== EXCEPTION_SAVED_VIEW_SCHEMA_VERSION) {
      return {
        state: DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
        recoveryReasons: [`Unsupported saved-view payload version "${String(parsed.version)}".`],
      };
    }
    if (!Array.isArray(parsed.views)) {
      return {
        state: DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
        recoveryReasons: ['Saved-view payload is malformed (missing views array).'],
      };
    }
    const views: ExceptionSavedView[] = [];
    for (const rawView of parsed.views) {
      if (!rawView || typeof rawView !== 'object') {
        return {
          state: DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
          recoveryReasons: ['Saved-view payload is malformed (invalid row).'],
        };
      }
      const view = rawView as Record<string, unknown>;
      if (typeof view.id !== 'string' || !view.id.trim()) {
        return {
          state: DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
          recoveryReasons: ['Saved-view payload is malformed (missing id).'],
        };
      }
      if (typeof view.name !== 'string') {
        return {
          state: DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
          recoveryReasons: ['Saved-view payload is malformed (missing name).'],
        };
      }
      if (typeof view.createdAt !== 'string' || typeof view.updatedAt !== 'string') {
        return {
          state: DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
          recoveryReasons: ['Saved-view payload is malformed (missing timestamps).'],
        };
      }
      const query = normalizeSavedViewQuery((view.query ?? {}) as Partial<ExceptionSavedViewQuery>);
      views.push({
        id: view.id.trim(),
        name: normalizeSavedViewName(view.name, views.length + 1),
        pinned: Boolean(view.pinned),
        query,
        createdAt: view.createdAt,
        updatedAt: view.updatedAt,
      });
    }
    const activeViewId = typeof parsed.activeViewId === 'string' ? parsed.activeViewId : '';
    return {
      state: normalizeSavedViewState({
        version: EXCEPTION_SAVED_VIEW_SCHEMA_VERSION,
        activeViewId,
        views,
      }),
      recoveryReasons: [],
    };
  } catch {
    return {
      state: DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
      recoveryReasons: ['Saved-view payload is not valid JSON.'],
    };
  }
}

export function restoreExceptionSavedViewState(input: {
  queryPayload: unknown;
  storagePayload: unknown;
}): ExceptionSavedViewRestoreResult {
  const queryParsed = parseExceptionSavedViewStatePayload(input.queryPayload);
  if (queryParsed.recoveryReasons.length === 0 && queryParsed.state.views.length > 0) {
    return {
      state: queryParsed.state,
      source: 'query',
      recoveryReasons: [],
    };
  }
  const storageParsed = parseExceptionSavedViewStatePayload(input.storagePayload);
  if (storageParsed.recoveryReasons.length === 0 && storageParsed.state.views.length > 0) {
    return {
      state: storageParsed.state,
      source: 'storage',
      recoveryReasons: queryParsed.recoveryReasons,
    };
  }
  return {
    state: DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
    source: 'default',
    recoveryReasons: [...queryParsed.recoveryReasons, ...storageParsed.recoveryReasons],
  };
}

export function validateExceptionActionInput(reason: string): string | null {
  const normalized = reason.trim();
  if (!normalized) {
    return 'Reason is required.';
  }
  if (normalized.length < 4) {
    return 'Reason must be at least 4 characters.';
  }
  return null;
}

export function applyExceptionActionOptimistic(
  rows: SettlementExceptionRow[],
  exceptionId: string,
  action: ExceptionAction,
  updatedAt: string,
): SettlementExceptionRow[] {
  const nextStatus: ExceptionStatus = action === 'resolve' ? 'resolved' : 'ignored';
  return rows.map((row) => {
    if (row.id !== exceptionId) {
      return row;
    }
    return {
      ...row,
      status: nextStatus,
      updatedAt,
    };
  });
}

export function prependExceptionAudit(
  entries: SettlementExceptionAuditEntry[],
  entry: SettlementExceptionAuditEntry,
): SettlementExceptionAuditEntry[] {
  return [entry, ...entries];
}

export type ExceptionActionFailure = {
  kind: ExceptionActionErrorKind;
  retryable: boolean;
  userMessage: string;
};

function coerceString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toMessageText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(', ');
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  if (value == null) {
    return '';
  }
  return String(value);
}

function parseCanonicalExceptionActionEnvelope(raw: unknown): {
  statusCode: number | null;
  code: string | null;
  reason: string | null;
  retryable: boolean | null;
  message: string;
} {
  if (!raw || typeof raw !== 'object') {
    return {
      statusCode: null,
      code: null,
      reason: null,
      retryable: null,
      message: toMessageText(raw),
    };
  }

  const payload = raw as Record<string, unknown>;
  const messageValue = payload.message;
  const messageObject = (typeof messageValue === 'object' && messageValue !== null)
    ? messageValue as Record<string, unknown>
    : null;

  return {
    statusCode: typeof payload.statusCode === 'number' ? payload.statusCode : null,
    code: coerceString(messageObject?.code ?? payload.code),
    reason: coerceString(messageObject?.reason ?? payload.reason),
    retryable: typeof (messageObject?.retryable ?? payload.retryable) === 'boolean'
      ? Boolean(messageObject?.retryable ?? payload.retryable)
      : null,
    message: toMessageText(messageObject?.message ?? messageValue ?? payload.error ?? ''),
  };
}

export function normalizeExceptionStatus(input: unknown): ExceptionStatus {
  if (input === 'open' || input === 'investigating' || input === 'resolved' || input === 'ignored') {
    return input;
  }
  if (input === 'OPEN') return 'open';
  if (input === 'INVESTIGATING') return 'investigating';
  if (input === 'RESOLVED') return 'resolved';
  if (input === 'IGNORED') return 'ignored';
  return 'open';
}

function hashFNV1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let idx = 0; idx < input.length; idx += 1) {
    hash ^= input.charCodeAt(idx);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function buildExceptionActionIdempotencyKey(input: {
  exceptionId: string;
  action: ExceptionAction;
  reason: string;
  note: string | null;
  expectedVersion: number;
  expectedUpdatedAt: string | null;
}): string {
  const fingerprint = JSON.stringify({
    exceptionId: input.exceptionId,
    action: input.action,
    reason: input.reason.trim(),
    note: input.note ?? null,
    expectedVersion: input.expectedVersion,
    expectedUpdatedAt: input.expectedUpdatedAt ?? null,
  });
  return `settlement-action-${hashFNV1a(fingerprint)}`;
}

export function classifyExceptionActionFailure(raw: unknown): ExceptionActionFailure {
  const parsed = parseCanonicalExceptionActionEnvelope(raw);
  const message = parsed.message.trim();
  const normalized = message.toLowerCase();

  if (
    parsed.code === 'SETTLEMENT_EXCEPTION_ACTION_CONFLICT'
    && (parsed.reason === 'stale_version' || parsed.reason === 'stale_updated_at')
  ) {
    return {
      kind: 'version_conflict',
      retryable: true,
      userMessage: 'This exception was updated by another operator. Refresh detail and retry with the latest version.',
    };
  }

  if (parsed.statusCode === 401 || parsed.statusCode === 403) {
    return {
      kind: 'permission',
      retryable: false,
      userMessage: 'Your role cannot perform this action. Use an admin/ops role.',
    };
  }

  if (
    parsed.code === 'SETTLEMENT_EXCEPTION_ACTION_CONFLICT'
    && (parsed.reason === 'idempotency_in_progress' || parsed.retryable === true)
  ) {
    return {
      kind: 'transient',
      retryable: true,
      userMessage: 'Action failed due to a temporary backend issue. Retry with the same reason.',
    };
  }

  if (normalized.includes('version conflict') || normalized.includes('stale version')) {
    return {
      kind: 'version_conflict',
      retryable: true,
      userMessage: 'This exception was updated by another operator. Refresh detail and retry with the latest version.',
    };
  }

  if (normalized.includes('forbidden') || normalized.includes('unauthorized') || normalized.includes('permission')) {
    return {
      kind: 'permission',
      retryable: false,
      userMessage: 'Your role cannot perform this action. Use an admin/ops role.',
    };
  }

  if (normalized.includes('timeout') || normalized.includes('temporar') || normalized.includes('unavailable')) {
    return {
      kind: 'transient',
      retryable: true,
      userMessage: 'Action failed due to a temporary backend issue. Retry with the same reason.',
    };
  }

  return {
    kind: 'unknown',
    retryable: false,
    userMessage: message || 'Action failed. Verify the input and try again.',
  };
}
