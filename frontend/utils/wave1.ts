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

export type DispatchCockpitBlockerSeverity = 'critical' | 'high' | 'medium' | 'low';
export type DispatchCockpitLaneType =
  | 'release_readiness'
  | 'evidence_lint'
  | 'qa_verification'
  | 'dispatch_queue'
  | 'custom';
export type DispatchCockpitShortcut =
  | 'focus_blocker_cockpit'
  | 'next_blocked_lane'
  | 'prev_blocked_lane'
  | 'save_active_draft'
  | 'validate_active_draft';
export type DispatchEvidenceDraftPrMode = 'pr_link' | 'no_pr_yet';

export type DispatchCockpitRow = {
  id: string;
  issueIdentifier: string;
  laneType: DispatchCockpitLaneType;
  blockerSeverity: DispatchCockpitBlockerSeverity;
  updatedAt: string;
  blocked: boolean;
  title: string;
  blockerReason: string;
};

export type BlockerAwareDispatchCockpit = {
  contract: 'settlement-blocker-aware-dispatch-cockpit.v1';
  rows: DispatchCockpitRow[];
  blockedCount: number;
  activeRowId: string;
};

export type DispatchEvidenceDraft = {
  laneId: string;
  issueIdentifier: string;
  laneType: DispatchCockpitLaneType;
  branch: string;
  fullSha: string;
  prMode: DispatchEvidenceDraftPrMode;
  testCommand: string;
  artifactPath: string;
  dependencyIssueLinksText: string;
  blockerOwner: string;
  blockerEta: string;
  updatedAt: string;
};

export type DispatchEvidenceDraftValidation = {
  isComplete: boolean;
  errors: string[];
  missingFields: string[];
  dependencyIssueLinks: string[];
};

export type ReleaseReadinessDriftClass = 'on_track' | 'minor_drift' | 'major_drift';
export type ReleaseReadinessShortcut =
  | 'focus_readiness_simulator'
  | 'next_lane'
  | 'prev_lane'
  | 'save_snapshot'
  | 'validate_active_lane_packet';
export type PublicationWindowPlanShortcut =
  | 'focus_publication_window_board'
  | 'next_lane'
  | 'prev_lane'
  | 'open_score_explainer'
  | 'open_dependency_gates';
export type ReleaseReadinessEvidenceField =
  | 'branch'
  | 'fullSha'
  | 'prMode'
  | 'testCommand'
  | 'artifactPath'
  | 'dependencyIssueLinks'
  | 'blockerOwner'
  | 'blockerEta';

export type ReleaseReadinessEvidenceBadge = {
  field: ReleaseReadinessEvidenceField;
  label: string;
  required: boolean;
  complete: boolean;
};

export type ReleaseReadinessSimulatorLane = {
  id: string;
  issueIdentifier: string;
  readinessScore: number;
  blockerRisk: number;
  etaBaseline: string;
  etaLatest: string;
  etaDriftMinutes: number;
  driftClass: ReleaseReadinessDriftClass;
  evidenceBadges: ReleaseReadinessEvidenceBadge[];
  evidenceCompleteCount: number;
  evidenceRequiredCount: number;
  draft: DispatchEvidenceDraft;
};

export type ReleaseReadinessSimulator = {
  contract: 'settlement-release-readiness-simulator.v1';
  rows: ReleaseReadinessSimulatorLane[];
  activeLaneId: string;
};

export type PublicationWindowScoreBand = 'ready_now' | 'ready_soon' | 'hold';

export type PublicationWindowDependencyGateRow = {
  id: string;
  issueIdentifier: string;
  status: 'resolved' | 'unresolved';
  unresolvedReason: string;
  issueLink: string;
  documentLink: string;
  commentLink: string;
  linksValid: boolean;
};

export type PublicationWindowPlanLane = {
  id: string;
  issueIdentifier: string;
  bundleCode: string;
  windowPriorityWeight: number;
  blockerRisk: number;
  etaDriftMinutes: number;
  releaseBundleScore: {
    completenessScore: number;
    blockerDriftPenalty: number;
    dependencyRiskPenalty: number;
    finalScore: number;
    scoreBand: PublicationWindowScoreBand;
    scoreBandLabel: string;
  };
  dependencyGates: PublicationWindowDependencyGateRow[];
  dependencyGateErrors: string[];
};

export type PublicationWindowPlanBoard = {
  contract: 'settlement-publication-window-plan-board.v1';
  rows: PublicationWindowPlanLane[];
  activeLaneId: string;
  scoreBandCounts: Record<PublicationWindowScoreBand, number>;
};

export type PublicationReadinessBoardShortcut =
  | 'focus_readiness_board'
  | 'next_lane'
  | 'prev_lane'
  | 'open_gap_resolver'
  | 'validate_readiness_snapshot';

export type PublicationReadinessState = 'ready' | 'blocked_publish' | 'missing_evidence';

export type PublicationReadinessGapField =
  | 'branch'
  | 'fullSha'
  | 'prOrBlocker'
  | 'testSummary'
  | 'artifactPath'
  | 'nextOwner';

export type PublicationReadinessBoardLane = {
  id: string;
  issueIdentifier: string;
  lanePriorityWeight: number;
  blockerWeight: number;
  evidenceFieldWeight: number;
  missingFields: PublicationReadinessGapField[];
  canonicalLinkViolations: string[];
  blockedByCredential: boolean;
  readyToPublish: boolean;
  nextOwner: string;
  readinessState: PublicationReadinessState;
};

export type PublicationReadinessBoard = {
  contract: 'settlement-publication-readiness-board.v1';
  rows: PublicationReadinessBoardLane[];
  activeLaneId: string;
};

export type PublicationReadinessGapResolverPanel = {
  contract: 'settlement-publication-readiness-gap-resolver.v1';
  laneId: string;
  issueIdentifier: string;
  missingFields: PublicationReadinessGapField[];
  canonicalLinkViolations: string[];
  blockedByCredential: boolean;
  readyToPublish: boolean;
  nextOwner: string;
};

export type PublicationReadinessCanonicalAutofixPreview = {
  contract: 'settlement-publication-readiness-canonical-autofix.v1';
  rows: CanonicalLinkAutofixRow[];
  patchedMarkdown: string;
  changedCount: number;
  invalidCount: number;
};

export type OfflinePublicationEvidenceShortcut =
  | 'focus_evidence_list'
  | 'next_lane'
  | 'prev_lane'
  | 'open_handoff_packet_preview'
  | 'run_deterministic_normalization_pass';

export type OfflinePublicationEvidenceMachineFields = {
  hasBranch: boolean;
  hasCommit: boolean;
  hasPr: boolean;
  hasTestCommand: boolean;
  hasArtifactPath: boolean;
  credentialBlocked: boolean;
  nextOwner: string;
  dispatchReady: boolean;
};

export type OfflinePublicationEvidenceLane = {
  id: string;
  issueIdentifier: string;
  lanePriorityWeight: number;
  readinessWeight: number;
  evidenceTypeWeight: number;
  evidenceType: string;
  evidencePath: string;
  orderingKey: [number, number, string, number, string];
  machineFields: OfflinePublicationEvidenceMachineFields;
};

export type OfflinePublicationEvidenceNormalizer = {
  contract: 'settlement-offline-publication-evidence-normalizer.v1';
  rows: OfflinePublicationEvidenceLane[];
  activeLaneId: string;
  dispatchReadyCount: number;
  blockedCount: number;
  handoffPacketMarkdown: string;
};

export type OfflinePublicationEvidenceCanonicalPatchPreview = {
  contract: 'settlement-offline-publication-evidence-canonical-patch-preview.v1';
  rows: CanonicalLinkAutofixRow[];
  patchedMarkdown: string;
  changedCount: number;
  invalidCount: number;
  copyText: string;
};

export type RemediationQueueShortcut =
  | 'focus_queue'
  | 'next_item'
  | 'prev_item'
  | 'open_handoff_panel'
  | 'run_validation_pass';

export type RemediationQueueMachineFields = {
  readyForExecution: boolean;
  missingEvidence: string[];
  blockingDependencies: string[];
  nextOwner: string;
  canonicalLinkViolations: string[];
};

export type RemediationQueueTriageRow = {
  id: string;
  issueIdentifier: string;
  remediationType: string;
  severityWeight: number;
  blockerWeight: number;
  dependencyDepthWeight: number;
  remediationTypeWeight: number;
  title: string;
  evidencePath: string;
  orderingKey: [number, number, number, string, number];
  machineFields: RemediationQueueMachineFields;
};

export type RemediationQueueTriageWorkspace = {
  contract: 'settlement-remediation-queue-triage-workspace.v1';
  rows: RemediationQueueTriageRow[];
  activeRowId: string;
};

export type RemediationQueueHandoffPanel = {
  contract: 'settlement-remediation-queue-handoff-panel.v1';
  items: Array<{
    id: string;
    issueIdentifier: string;
    readyForExecution: boolean;
    missingEvidence: string[];
    blockingDependencies: string[];
    nextOwner: string;
    canonicalLinkViolations: string[];
  }>;
  markdown: string;
};

export type RemediationQueueCanonicalAutofixPreview = {
  contract: 'settlement-remediation-queue-canonical-autofix-preview.v1';
  rows: CanonicalLinkAutofixRow[];
  patchedMarkdown: string;
  changedCount: number;
  invalidCount: number;
  copyText: string;
};

export type ReleaseGateVerdictShortcut =
  | 'focus_verdict_explorer'
  | 'next_verdict'
  | 'prev_verdict'
  | 'open_remediation_matrix'
  | 'run_deterministic_validation_pass';

export type ReleaseGateState = 'pass' | 'warn' | 'block';

export type ReleaseGateVerdictMachineFields = {
  releaseGateState: ReleaseGateState;
  requiredRemediations: string[];
  blockingDependencies: string[];
  missingEvidence: string[];
  nextOwner: string;
  readyForExecution: boolean;
};

export type ReleaseGateVerdictRow = {
  id: string;
  issueIdentifier: string;
  remediationType: string;
  gatePriorityWeight: number;
  blockerWeight: number;
  dependencyDepthWeight: number;
  remediationTypeWeight: number;
  title: string;
  evidencePath: string;
  orderingKey: [number, number, number, string, number];
  machineFields: ReleaseGateVerdictMachineFields;
  canonicalLinkViolations: string[];
};

export type ReleaseGateVerdictExplorer = {
  contract: 'settlement-release-gate-verdict-explorer.v1';
  rows: ReleaseGateVerdictRow[];
  activeVerdictId: string;
  readyCount: number;
  blockedCount: number;
};

export type ReleaseGateRemediationActionMatrix = {
  contract: 'settlement-release-gate-remediation-action-matrix.v1';
  items: Array<{
    id: string;
    issueIdentifier: string;
    releaseGateState: ReleaseGateState;
    requiredRemediations: string[];
    blockingDependencies: string[];
    missingEvidence: string[];
    nextOwner: string;
    readyForExecution: boolean;
    canonicalLinkViolations: string[];
  }>;
  markdown: string;
};

export type ReleaseGateCanonicalAutofixPreview = {
  contract: 'settlement-release-gate-canonical-autofix-preview.v1';
  rows: CanonicalLinkAutofixRow[];
  patchedMarkdown: string;
  changedCount: number;
  invalidCount: number;
  copyText: string;
};

export type DiagnosticsTrendDigestGate = 'pass' | 'warn' | 'block';
export type DiagnosticsTrendDigestReasonCode =
  | 'spike_in_breaking_changes'
  | 'new_drift_code'
  | 'checksum_instability'
  | 'severity_escalation'
  | 'missing_snapshot_window';
export type DiagnosticsTrendDigestMaxSeverity = 'critical' | 'high' | 'medium' | 'low';

export type DiagnosticsTrendDigestReasonChip = {
  code: DiagnosticsTrendDigestReasonCode;
  label: string;
};

export type DiagnosticsTrendDigestDependencyLink = {
  id: string;
  issueIdentifier: string;
  issueLink: string;
  documentLink?: string;
  commentLink?: string;
  linksValid: boolean;
};

export type DiagnosticsTrendDigestRow = {
  id: string;
  sourceIssueIdentifier: string;
  snapshotSha256: string;
  generatedAt: string;
  recommendedGate: DiagnosticsTrendDigestGate;
  reasonChips: DiagnosticsTrendDigestReasonChip[];
  windowSize: number;
  stableSnapshotCount: number;
  driftSpikeCount: number;
  maxSeverity: DiagnosticsTrendDigestMaxSeverity;
  regressionRiskScore: number;
  dependencyLinks: DiagnosticsTrendDigestDependencyLink[];
};

export type DiagnosticsTrendDigestExplorer = {
  contract: 'settlement-diagnostics-trend-digest-explorer.v1';
  rows: DiagnosticsTrendDigestRow[];
  activeRowId: string;
  summaryCards: {
    windowSize: number;
    stableSnapshotCount: number;
    driftSpikeCount: number;
    maxSeverity: DiagnosticsTrendDigestMaxSeverity;
    regressionRiskScore: number;
  };
  rationalePanel: {
    recommendedGate: DiagnosticsTrendDigestGate;
    reasonChips: DiagnosticsTrendDigestReasonChip[];
  };
  canonicalDependencyLinks: DiagnosticsTrendDigestDependencyLink[];
};

export type DiagnosticsBaselineCompareShortcut =
  | 'focus_contract_bundle_explorer'
  | 'next_section'
  | 'prev_section'
  | 'open_handoff_composer'
  | 'validate_handoff_packet';

export type DiagnosticsCanonicalReasonCode =
  | 'missing_required_field'
  | 'enum_drift'
  | 'type_mismatch'
  | 'ordering_regression'
  | 'checksum_mismatch';

export type DiagnosticsBaselineCompareRow = {
  id: string;
  sectionWeight: number;
  fieldTypeWeight: number;
  sourceIssueIdentifier: string;
  driftReasonCode: DiagnosticsCanonicalReasonCode;
  deltaSeverityWeight: number;
  scoreBandShiftWeight: number;
  issueIdentifier: string;
  bundleCode: string;
  fieldPath: string;
  baselineValue: string;
  candidateValue: string;
  changed: boolean;
};

export type DiagnosticsBaselineCompareWorkspace = {
  contract: 'settlement-diagnostics-baseline-compare-workspace.v1';
  rows: DiagnosticsBaselineCompareRow[];
  activeDeltaId: string;
};

export type DeltaBundleContractSafetyShortcut =
  | 'focus_validator_drill_panel'
  | 'next_validation_issue'
  | 'prev_validation_issue'
  | 'open_link_quality_panel'
  | 'run_deterministic_validation_pass';

export type DeltaBundleContractValidationState = {
  requiredFieldCoverage: number;
  missingFieldPaths: string[];
  enumDriftCodes: string[];
  isContractSafe: boolean;
};

export type DeltaBundleContractSafetyRow = {
  id: string;
  deltaSeverityWeight: number;
  scoreBandShiftWeight: number;
  issueIdentifier: string;
  bundleCode: string;
  fieldPath: string;
  baselineValue: string;
  candidateValue: string;
  changed: boolean;
  contractValidation: DeltaBundleContractValidationState;
};

export type DeltaBundleValidatorDrillPanel = {
  activeIssueId: string;
  issueIds: string[];
  unsafeIssueCount: number;
  safeIssueCount: number;
  averageRequiredFieldCoverage: number;
};

export type DeltaBundleContractSafetyConsole = {
  contract: 'settlement-delta-bundle-contract-safety-console.v1';
  rows: DeltaBundleContractSafetyRow[];
  activeEntryId: string;
  validatorDrillPanel: DeltaBundleValidatorDrillPanel;
};

export type DeltaBundleLinkQualityPanel = {
  contract: 'settlement-delta-bundle-link-quality-panel.v1';
  rows: CanonicalLinkAutofixRow[];
  correctedOutput: string;
  changedCount: number;
  invalidCount: number;
  canSaveScenario: boolean;
};

export type DiagnosticsDriftSummaryChip = {
  code: DiagnosticsCanonicalReasonCode;
  label: string;
  count: number;
};

export type RegressionGateOverrideReasonCode =
  | 'missing_evidence'
  | 'eta_drift'
  | 'dependency_open'
  | 'link_noncanonical'
  | 'artifact_gap';

export type RegressionGateOverrideOutcome = 'pass' | 'warn' | 'block';

export type RegressionGateOverrideScenario = {
  id: string;
  issueIdentifier: string;
  currentGate: DiagnosticsTrendDigestGate;
  overrideGate: DiagnosticsTrendDigestGate;
  reasonCodes: RegressionGateOverrideReasonCode[];
  whatIfOutcome: RegressionGateOverrideOutcome;
};

export type RegressionGateOverrideSimulator = {
  contract: 'settlement-regression-gate-override-simulator.v1';
  scenarios: RegressionGateOverrideScenario[];
  activeScenarioId: string;
  reasonCodeCounts: Record<RegressionGateOverrideReasonCode, number>;
};

export type RemediationDependencyBlockerClass =
  | 'credential_blocker'
  | 'contract_gap'
  | 'artifact_missing'
  | 'qa_gate_pending'
  | 'link_noncanonical';

export type RemediationManifestShortcut =
  | 'focus_manifest_table'
  | 'next_row'
  | 'prev_row'
  | 'open_dependency_graph'
  | 'export_handoff_packet';

export type RemediationManifestDrillboardRow = {
  id: string;
  issueIdentifier: string;
  runbookStepCode: string;
  artifactPath: string;
  priorityWeight: number;
  dependencyDepth: number;
  blockerClass: RemediationDependencyBlockerClass;
  createdAt: string;
  summary: string;
};

export type RemediationManifestDrillboard = {
  contract: 'settlement-remediation-manifest-drillboard.v1';
  rows: RemediationManifestDrillboardRow[];
  activeRowId: string;
};

export type RemediationDependencyGraphNode = {
  id: string;
  issueIdentifier: string;
  blockerClass: RemediationDependencyBlockerClass;
  classWeight: number;
  createdAt: string;
  summary: string;
};

export type RemediationDependencyGraphInspector = {
  contract: 'settlement-remediation-dependency-graph-inspector.v1';
  nodes: RemediationDependencyGraphNode[];
  activeNodeId: string;
  classCounts: Record<RemediationDependencyBlockerClass, number>;
};

export type EvidenceTimelineGapCode =
  | 'MISSING_BRANCH'
  | 'MISSING_FULL_SHA'
  | 'MISSING_PR_LINK'
  | 'MISSING_TEST_COMMAND'
  | 'MISSING_ARTIFACT_PATH'
  | 'MISSING_BLOCKER_OWNER'
  | 'MISSING_BLOCKER_ETA';

export type EvidenceTimelineHeatmapShortcut =
  | 'focus_heatmap'
  | 'next_gap_row'
  | 'prev_gap_row'
  | 'validate_checklist';

export type EvidenceTimelineHeatmapRow = {
  id: string;
  lanePriority: ReviewQueuePriority;
  missingFieldCode: EvidenceTimelineGapCode;
  missingFieldPriority: number;
  issueIdentifier: string;
  updatedAt: string;
  autofixHint: string;
};

export type EvidenceTimelineHeatmap = {
  contract: 'settlement-evidence-timeline-heatmap.v1';
  rows: EvidenceTimelineHeatmapRow[];
  laneCounts: Record<ReviewQueuePriority, number>;
  activeLane: ReviewQueueLedgerFilterKey;
  activeRowId: string;
};

export type ChecklistAutofixHint = {
  code: EvidenceTimelineGapCode;
  action: string;
};

export type EvidencePacketLintSeverity = 'error' | 'warning';
export type EvidencePacketLintFilterKey = 'all' | EvidencePacketLintSeverity;
export type EvidencePacketLintShortcut =
  | 'focus_lint_list'
  | 'next_finding'
  | 'prev_finding'
  | 'validate_packet';
export type EvidencePacketLintPrMode = 'pr_link' | 'no_pr_yet';

export type EvidencePacketLintConsoleFinding = {
  id: string;
  code: string;
  severity: EvidencePacketLintSeverity;
  severityPriority: number;
  field: string;
  fieldPriority: number;
  issueIdentifier: string;
  path: string;
  message: string;
  input: string;
  normalized: string;
};

export type EvidencePacketLintConsole = {
  contract: 'settlement-evidence-packet-lint-console.v1';
  rows: EvidencePacketLintConsoleFinding[];
  counts: {
    error: number;
    warning: number;
    total: number;
  };
  activeFilter: EvidencePacketLintFilterKey;
  activeFindingId: string;
};

export type CanonicalLinkAutofixRow = {
  id: string;
  original: string;
  normalized: string;
  changed: boolean;
};

export type CanonicalLinkAutofixPreview = {
  rows: CanonicalLinkAutofixRow[];
  correctedOutput: string;
  changedCount: number;
};

export type ManifestDiffShortcut =
  | 'focus_manifest_diff'
  | 'next_finding'
  | 'prev_finding'
  | 'open_handoff_drill'
  | 'validate_active_packet';
export type ManifestDiffDeltaClass = 'missing' | 'modified' | 'unexpected';

export type ManifestDiffViewerRow = {
  id: string;
  severityWeight: number;
  deltaClassWeight: number;
  issueIdentifier: string;
  fieldPath: string;
  deltaClass: ManifestDiffDeltaClass;
  baselineValue: string;
  currentValue: string;
  summary: string;
};

export type ManifestDiffViewer = {
  contract: 'settlement-manifest-diff-viewer.v1';
  rows: ManifestDiffViewerRow[];
  activeRowId: string;
};

export type BlockedLaneHandoffDrillPrMode = 'pr_link' | 'no_pr_yet';

export type BlockedLaneHandoffDrillDraft = {
  laneId: string;
  issueIdentifier: string;
  branch: string;
  fullSha: string;
  prMode: BlockedLaneHandoffDrillPrMode;
  testCommand: string;
  artifactPath: string;
  dependencyIssueLinksText: string;
  blockerOwner: string;
  blockerEta: string;
  updatedAt: string;
};

export type BlockedLaneHandoffDrillValidation = {
  isComplete: boolean;
  errors: string[];
  missingFields: string[];
  dependencyIssueLinks: string[];
};

export type RemediationPlaybookCategory =
  | 'missing'
  | 'stale'
  | 'malformed'
  | 'dependency-gap'
  | 'blocker-drift';

export type AnomalyTimelineShortcut =
  | 'focus_timeline_board'
  | 'next_anomaly'
  | 'prev_anomaly'
  | 'open_playbook_composer'
  | 'validate_export_packet';

export type DeterministicAnomalyTimelineEvent = {
  id: string;
  issueIdentifier: string;
  bundleCode: string;
  fieldPath: string;
  severityWeight: number;
  driftClassWeight: number;
  occurredAt: string;
  summary: string;
};

export type DeterministicAnomalyTimelineGroup = {
  id: string;
  issueIdentifier: string;
  bundleCode: string;
  events: DeterministicAnomalyTimelineEvent[];
};

export type DeterministicAnomalyTimelineWorkspace = {
  contract: 'settlement-anomaly-timeline-workspace.v1';
  groups: DeterministicAnomalyTimelineGroup[];
  activeEventId: string;
};

export type RemediationPlaybookRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type RemediationPlaybookComposerAction = {
  actionCode: string;
  reasonCode: string;
  riskLevel: RemediationPlaybookRiskLevel;
  requiredEvidence: string[];
  rollbackHint: string;
  issueIdentifier: string;
  bundleCode: string;
  fieldPath: string;
};

export type RemediationPlaybookComposerPanel = {
  contract: 'settlement-remediation-playbook-composer.v1';
  actions: RemediationPlaybookComposerAction[];
};

export type CanonicalExportLinkType = 'issue' | 'comment' | 'document' | 'unknown';

export type CanonicalExportLinkVerificationRow = {
  id: string;
  original: string;
  normalized: string;
  changed: boolean;
  valid: boolean;
  type: CanonicalExportLinkType;
};

export type CanonicalExportLinkVerification = {
  contract: 'settlement-export-link-verifier.v1';
  rows: CanonicalExportLinkVerificationRow[];
  correctedOutput: string;
  changedCount: number;
  invalidCount: number;
  hasIssueReference: boolean;
  hasCommentReference: boolean;
  hasDocumentReference: boolean;
  readyForExport: boolean;
};

export type AnomalyTriageShortcut =
  | 'focus_anomaly_board'
  | 'next_anomaly'
  | 'prev_anomaly'
  | 'open_playbook_composer'
  | 'validate_active_playbook';

export type AnomalyTriageRow = {
  id: string;
  issueIdentifier: string;
  fieldPath: string;
  category: RemediationPlaybookCategory;
  severityWeight: number;
  stalenessMinutes: number;
  summary: string;
};

export type AnomalyTriageBoard = {
  contract: 'settlement-anomaly-triage-board.v1';
  rows: AnomalyTriageRow[];
  activeRowId: string;
};

export type RemediationRunbookTimelineShortcut =
  | 'focus_timeline_board'
  | 'next_step'
  | 'prev_step'
  | 'open_handoff_pack'
  | 'validate_active_pack';
export type RemediationRunbookHandoffPrMode = 'pr_link' | 'no_pr_yet';

export type RemediationRunbookTimelineRow = {
  id: string;
  issueIdentifier: string;
  stepIndex: number;
  severityWeight: number;
  etaDriftMinutes: number;
  summary: string;
  owner: string;
};

export type RemediationRunbookTimelineBoard = {
  contract: 'settlement-remediation-runbook-timeline-board.v1';
  rows: RemediationRunbookTimelineRow[];
  activeRowId: string;
};

export type RemediationRunbookHandoffPackDraft = {
  stepId: string;
  issueIdentifier: string;
  branch: string;
  fullSha: string;
  prMode: RemediationRunbookHandoffPrMode;
  testCommand: string;
  artifactPath: string;
  dependencyIssueLinksText: string;
  blockerOwner: string;
  blockerEta: string;
  updatedAt: string;
};

export type RemediationRunbookHandoffPackValidation = {
  isComplete: boolean;
  errors: string[];
  missingFields: string[];
  dependencyIssueLinks: string[];
};

export type RemediationPlaybookDraft = {
  anomalyId: string;
  issueIdentifier: string;
  category: RemediationPlaybookCategory;
  summary: string;
  stagedActionsText: string;
  owner: string;
  eta: string;
  dependencyIssueLinksText: string;
  notes: string;
  updatedAt: string;
};

export type RemediationPlaybookValidation = {
  isComplete: boolean;
  errors: string[];
  missingFields: string[];
  dependencyIssueLinks: string[];
  stagedActions: string[];
};

export type EvidencePacketLintChecklistDraft = {
  branch: string;
  fullSha: string;
  prMode: EvidencePacketLintPrMode;
  testCommand: string;
  artifactPath: string;
  dependencyIssueLinksText: string;
  blockerOwner: string;
  blockerEta: string;
};

export type EvidencePacketLintChecklistValidation = {
  isComplete: boolean;
  errors: string[];
  missingFields: string[];
  dependencyIssueLinks: string[];
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

export type ReplayDiffInspectorFilterKey = 'all' | 'added' | 'removed' | 'modified';
export type ReplayDiffInspectorShortcut =
  | 'focus_diff_inspector'
  | 'next_row'
  | 'prev_row'
  | 'validate_checklist';

export type ReplayDiffSnapshotRow = {
  id: string;
  lineageDepth: number;
  sourceIssueId: string;
  artifactPath: string;
  payload: string;
};

export type ReplayDiffInspectorRow = {
  id: string;
  changeType: 'added' | 'removed' | 'modified';
  changeTypePriority: number;
  lineageDepth: number;
  sourceIssueId: string;
  artifactPath: string;
  previousPayload: string;
  nextPayload: string;
};

export type ReplayDiffInspector = {
  contract: 'settlement-replay-diff-inspector.v1';
  primarySnapshotId: string;
  secondarySnapshotId: string;
  rows: ReplayDiffInspectorRow[];
  activeFilter: ReplayDiffInspectorFilterKey;
  activeRowId: string;
};

export type EvidenceGapChecklistMode = 'pr' | 'no_pr';

export type EvidenceGapChecklistDraft = {
  branch: string;
  fullSha: string;
  mode: EvidenceGapChecklistMode;
  prLink: string;
  blockerOwner: string;
  eta: string;
  missingArtifactPathsText: string;
  dependencyIssueLinksText: string;
};

export type EvidenceGapChecklistValidation = {
  isComplete: boolean;
  errors: string[];
  missingFields: string[];
  missingArtifactPaths: string[];
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
const DISPATCH_BLOCKER_SEVERITY_ORDER: DispatchCockpitBlockerSeverity[] = ['critical', 'high', 'medium', 'low'];
const DISPATCH_LANE_TYPE_ORDER: DispatchCockpitLaneType[] = [
  'release_readiness',
  'evidence_lint',
  'qa_verification',
  'dispatch_queue',
  'custom',
];
const DIAGNOSTICS_TREND_REASON_CODE_ORDER: DiagnosticsTrendDigestReasonCode[] = [
  'spike_in_breaking_changes',
  'new_drift_code',
  'checksum_instability',
  'severity_escalation',
  'missing_snapshot_window',
];
const DIAGNOSTICS_CANONICAL_REASON_CODE_ORDER: DiagnosticsCanonicalReasonCode[] = [
  'missing_required_field',
  'enum_drift',
  'type_mismatch',
  'ordering_regression',
  'checksum_mismatch',
];
const REGRESSION_GATE_OVERRIDE_REASON_CODE_ORDER: RegressionGateOverrideReasonCode[] = [
  'missing_evidence',
  'eta_drift',
  'dependency_open',
  'link_noncanonical',
  'artifact_gap',
];
const REMEDIATION_DEPENDENCY_BLOCKER_CLASS_ORDER: RemediationDependencyBlockerClass[] = [
  'credential_blocker',
  'contract_gap',
  'artifact_missing',
  'qa_gate_pending',
  'link_noncanonical',
];
const DIAGNOSTICS_TREND_REASON_LABEL: Record<DiagnosticsTrendDigestReasonCode, string> = {
  spike_in_breaking_changes: 'Spike in breaking changes',
  new_drift_code: 'New drift code',
  checksum_instability: 'Checksum instability',
  severity_escalation: 'Severity escalation',
  missing_snapshot_window: 'Missing snapshot window',
};
const DIAGNOSTICS_CANONICAL_REASON_LABEL: Record<DiagnosticsCanonicalReasonCode, string> = {
  missing_required_field: 'missing_required_field',
  enum_drift: 'enum_drift',
  type_mismatch: 'type_mismatch',
  ordering_regression: 'ordering_regression',
  checksum_mismatch: 'checksum_mismatch',
};
const DIAGNOSTICS_TREND_MAX_SEVERITY_ORDER: DiagnosticsTrendDigestMaxSeverity[] = ['critical', 'high', 'medium', 'low'];
const RELEASE_READINESS_EVIDENCE_FIELD_ORDER: ReleaseReadinessEvidenceField[] = [
  'branch',
  'fullSha',
  'prMode',
  'testCommand',
  'artifactPath',
  'dependencyIssueLinks',
  'blockerOwner',
  'blockerEta',
];
const RELEASE_READINESS_EVIDENCE_FIELD_LABEL: Record<ReleaseReadinessEvidenceField, string> = {
  branch: 'branch',
  fullSha: 'fullSha',
  prMode: 'prMode',
  testCommand: 'testCommand',
  artifactPath: 'artifactPath',
  dependencyIssueLinks: 'dependencyIssueLinks',
  blockerOwner: 'blockerOwner',
  blockerEta: 'blockerEta',
};
const PUBLICATION_READINESS_GAP_FIELD_ORDER: PublicationReadinessGapField[] = [
  'branch',
  'fullSha',
  'prOrBlocker',
  'testSummary',
  'artifactPath',
  'nextOwner',
];
const PUBLICATION_READINESS_STATE_ORDER: PublicationReadinessState[] = [
  'ready',
  'blocked_publish',
  'missing_evidence',
];
const EVIDENCE_TIMELINE_GAP_CODE_ORDER: EvidenceTimelineGapCode[] = [
  'MISSING_BRANCH',
  'MISSING_FULL_SHA',
  'MISSING_PR_LINK',
  'MISSING_TEST_COMMAND',
  'MISSING_ARTIFACT_PATH',
  'MISSING_BLOCKER_OWNER',
  'MISSING_BLOCKER_ETA',
];
const EVIDENCE_TIMELINE_GAP_PRIORITY: Record<EvidenceTimelineGapCode, number> = {
  MISSING_BRANCH: 1,
  MISSING_FULL_SHA: 2,
  MISSING_PR_LINK: 3,
  MISSING_TEST_COMMAND: 4,
  MISSING_ARTIFACT_PATH: 5,
  MISSING_BLOCKER_OWNER: 6,
  MISSING_BLOCKER_ETA: 7,
};
const EVIDENCE_TIMELINE_AUTOFIX_HINTS: Record<EvidenceTimelineGapCode, string> = {
  MISSING_BRANCH: 'Copy branch name from active worktree and re-run checklist validation.',
  MISSING_FULL_SHA: 'Paste full 40-character commit SHA from git log before publishing.',
  MISSING_PR_LINK: 'Attach GitHub PR URL, or switch to no-PR mode if publish is blocked.',
  MISSING_TEST_COMMAND: 'Record exact test command and summary in evidence checklist.',
  MISSING_ARTIFACT_PATH: 'Add at least one artifact path from /artifacts for reproducible QA proof.',
  MISSING_BLOCKER_OWNER: 'Assign explicit blocker owner (team or person) for no-PR mode.',
  MISSING_BLOCKER_ETA: 'Provide ISO ETA for unblock timing and retry publication window.',
};
const EVIDENCE_PACKET_LINT_SEVERITY_PRIORITY: Record<EvidencePacketLintSeverity, number> = {
  error: 1,
  warning: 2,
};
const EVIDENCE_PACKET_LINT_FIELD_PRIORITY: Record<string, number> = {
  branch: 10,
  fullSha: 20,
  prMode: 30,
  testCommand: 40,
  artifactPath: 50,
  dependencyIssueLinks: 60,
  blockerOwner: 70,
  blockerEta: 80,
};
const EVIDENCE_PACKET_LINT_SHA_PLACEHOLDER = '0000000000000000000000000000000000000000';
const REMEDIATION_PLAYBOOK_CATEGORY_ORDER: RemediationPlaybookCategory[] = [
  'missing',
  'stale',
  'malformed',
  'dependency-gap',
  'blocker-drift',
];
const REMEDIATION_PLAYBOOK_CATEGORY_ACTIONS: Record<RemediationPlaybookCategory, string[]> = {
  missing: [
    'Backfill missing evidence field in fixture payload.',
    'Add canonical dependency links for unresolved context.',
    'Re-validate packet completeness before handoff.',
  ],
  stale: [
    'Refresh stale fixture lane snapshot and compare deltas.',
    'Record refresh timestamp in operator notes.',
    'Queue rerun for affected issue lane.',
  ],
  malformed: [
    'Repair malformed payload segment and rerun linter.',
    'Capture validation output in artifacts path.',
    'Attach remediation summary to handoff packet.',
  ],
  'dependency-gap': [
    'Identify upstream dependency issue and owner.',
    'Normalize dependency links to canonical company format.',
    'Document mitigation path if dependency remains open.',
  ],
  'blocker-drift': [
    'Reconfirm blocker owner and latest ETA.',
    'Compare ETA drift against baseline handoff.',
    'Publish escalation note for unresolved drift.',
  ],
};
const REPLAY_DELTA_FIELD_ORDER: ReplayDeltaField[] = ['status', 'amount', 'riskFlags', 'updatedAt'];
const OPERATOR_TIMELINE_PRESET_ORDER: OperatorTimelinePresetKey[] = ['baseline', 'candidate', 'override'];
const REPLAY_DIFF_CHANGE_TYPE_PRIORITY: Record<'added' | 'removed' | 'modified', number> = {
  added: 1,
  removed: 2,
  modified: 3,
};
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

function normalizeEvidenceTimelineGapCode(input: unknown): EvidenceTimelineGapCode | null {
  if (typeof input !== 'string') {
    return null;
  }
  const normalized = input.trim().toUpperCase();
  if (EVIDENCE_TIMELINE_GAP_CODE_ORDER.includes(normalized as EvidenceTimelineGapCode)) {
    return normalized as EvidenceTimelineGapCode;
  }
  return null;
}

function parseEvidenceTimelineHeatmapRow(raw: unknown): EvidenceTimelineHeatmapRow | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const lanePriority = normalizeReviewQueuePriority(row.lanePriority ?? row.priority ?? row.severity);
  const gapCode = normalizeEvidenceTimelineGapCode(
    row.missingFieldCode
    ?? row.gapCode
    ?? row.fieldCode,
  );
  const issueIdentifier = normalizeOptional(
    typeof row.issueIdentifier === 'string'
      ? row.issueIdentifier
      : typeof row.identifier === 'string'
        ? row.identifier
        : typeof row.sourceIssueId === 'string'
          ? row.sourceIssueId
          : String(row.issueIdentifier ?? row.identifier ?? row.sourceIssueId ?? row.id ?? ''),
  );
  if (!gapCode || !issueIdentifier) {
    return null;
  }
  const updatedAt = resolveDateString(row.updatedAt ?? row.eventTime, DIFF_FALLBACK_TIMESTAMP);
  const id = normalizeOptional(
    typeof row.id === 'string'
      ? row.id
      : String(row.id ?? `${lanePriority}|${gapCode}|${issueIdentifier}|${updatedAt}`),
  ) ?? `${lanePriority}|${gapCode}|${issueIdentifier}|${updatedAt}`;
  return {
    id,
    lanePriority,
    missingFieldCode: gapCode,
    missingFieldPriority: EVIDENCE_TIMELINE_GAP_PRIORITY[gapCode],
    issueIdentifier,
    updatedAt,
    autofixHint: EVIDENCE_TIMELINE_AUTOFIX_HINTS[gapCode],
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

function normalizeDispatchLaneType(input: unknown): DispatchCockpitLaneType {
  if (typeof input !== 'string') {
    return 'custom';
  }
  const normalized = input.trim().toLowerCase();
  if (normalized === 'release_readiness' || normalized === 'release' || normalized === 'readiness') {
    return 'release_readiness';
  }
  if (normalized === 'evidence_lint' || normalized === 'lint') {
    return 'evidence_lint';
  }
  if (normalized === 'qa_verification' || normalized === 'qa') {
    return 'qa_verification';
  }
  if (normalized === 'dispatch_queue' || normalized === 'dispatch') {
    return 'dispatch_queue';
  }
  return 'custom';
}

function normalizeDispatchBlockerSeverity(input: unknown): DispatchCockpitBlockerSeverity {
  if (input === 'critical' || input === 'high' || input === 'medium' || input === 'low') {
    return input;
  }
  if (input === 'CRITICAL') return 'critical';
  if (input === 'HIGH') return 'high';
  if (input === 'MEDIUM') return 'medium';
  if (input === 'LOW') return 'low';
  return 'medium';
}

function parseDispatchCockpitRow(raw: unknown): DispatchCockpitRow | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const issueIdentifier = normalizeOptional(
    typeof row.issueIdentifier === 'string'
      ? row.issueIdentifier
      : typeof row.identifier === 'string'
        ? row.identifier
        : String(row.issueIdentifier ?? row.identifier ?? row.id ?? ''),
  )?.toUpperCase();
  if (!issueIdentifier) {
    return null;
  }
  const laneType = normalizeDispatchLaneType(row.laneType ?? row.lane ?? row.type);
  const blockerSeverity = normalizeDispatchBlockerSeverity(row.blockerSeverity ?? row.severity ?? row.priority);
  const updatedAt = resolveDateString(row.updatedAt ?? row.eventTime, DIFF_FALLBACK_TIMESTAMP);
  const blocked = typeof row.blocked === 'boolean' ? row.blocked : true;
  const title = normalizeOptional(
    typeof row.title === 'string'
      ? row.title
      : String(row.title ?? ''),
  ) ?? `Blocked lane ${issueIdentifier}`;
  const blockerReason = normalizeOptional(
    typeof row.blockerReason === 'string'
      ? row.blockerReason
      : String(row.blockerReason ?? row.reason ?? ''),
  ) ?? 'Missing blocker metadata.';
  const id = normalizeOptional(
    typeof row.id === 'string'
      ? row.id
      : `${issueIdentifier}|${laneType}|${updatedAt}|${blockerSeverity}`,
  ) ?? `${issueIdentifier}|${laneType}|${updatedAt}|${blockerSeverity}`;
  return {
    id,
    issueIdentifier,
    laneType,
    blockerSeverity,
    updatedAt,
    blocked,
    title,
    blockerReason,
  };
}

export function buildBlockerAwareDispatchCockpit(input: {
  rows: unknown[];
  activeRowId: string;
}): BlockerAwareDispatchCockpit {
  const severityRank = new Map(DISPATCH_BLOCKER_SEVERITY_ORDER.map((severity, index) => [severity, index]));
  const laneRank = new Map(DISPATCH_LANE_TYPE_ORDER.map((laneType, index) => [laneType, index]));
  const rows = input.rows
    .map((row) => parseDispatchCockpitRow(row))
    .filter((row): row is DispatchCockpitRow => Boolean(row))
    .sort((left, right) => (
      (severityRank.get(left.blockerSeverity) ?? Number.MAX_SAFE_INTEGER)
      - (severityRank.get(right.blockerSeverity) ?? Number.MAX_SAFE_INTEGER)
      || left.updatedAt.localeCompare(right.updatedAt)
      || left.issueIdentifier.localeCompare(right.issueIdentifier)
      || (laneRank.get(left.laneType) ?? Number.MAX_SAFE_INTEGER)
      - (laneRank.get(right.laneType) ?? Number.MAX_SAFE_INTEGER)
      || left.id.localeCompare(right.id)
    ));
  const idSet = new Set(rows.map((row) => row.id));
  const activeRowId = idSet.has(input.activeRowId)
    ? input.activeRowId
    : (rows[0]?.id ?? '');
  return {
    contract: 'settlement-blocker-aware-dispatch-cockpit.v1',
    rows,
    blockedCount: rows.filter((row) => row.blocked).length,
    activeRowId,
  };
}

export function moveDispatchCockpitSelection(input: {
  rows: DispatchCockpitRow[];
  activeRowId: string;
  direction: 'next_blocked_lane' | 'prev_blocked_lane';
}): string {
  const blockedRows = input.rows.filter((row) => row.blocked);
  if (blockedRows.length === 0) {
    return '';
  }
  const currentIndex = blockedRows.findIndex((row) => row.id === input.activeRowId);
  if (currentIndex < 0) {
    return blockedRows[0].id;
  }
  if (input.direction === 'next_blocked_lane') {
    return blockedRows[Math.min(currentIndex + 1, blockedRows.length - 1)].id;
  }
  return blockedRows[Math.max(currentIndex - 1, 0)].id;
}

export function resolveDispatchCockpitShortcut(input: {
  key: string;
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): DispatchCockpitShortcut | null {
  const normalizedKey = input.key.toLowerCase();
  if (input.altKey && normalizedKey === 'b') {
    return 'focus_blocker_cockpit';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'n') {
    return 'next_blocked_lane';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'p') {
    return 'prev_blocked_lane';
  }
  if (normalizedKey === 's' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'save_active_draft';
  }
  if (input.key === 'Enter' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'validate_active_draft';
  }
  return null;
}

export function resolveReleaseReadinessShortcut(input: {
  key: string;
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): ReleaseReadinessShortcut | null {
  const normalizedKey = input.key.toLowerCase();
  if (input.altKey && !input.shiftKey && normalizedKey === 'r') {
    return 'focus_readiness_simulator';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'j') {
    return 'next_lane';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'k') {
    return 'prev_lane';
  }
  if (normalizedKey === 's' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'save_snapshot';
  }
  if (input.key === 'Enter' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'validate_active_lane_packet';
  }
  return null;
}

export function classifyBlockerEtaDrift(input: {
  baselineEta: string;
  latestEta: string;
  minorThresholdMinutes?: number;
  majorThresholdMinutes?: number;
}): { etaDriftMinutes: number; classification: ReleaseReadinessDriftClass } {
  const minorThresholdMinutes = Number.isFinite(input.minorThresholdMinutes)
    ? Math.max(0, Math.trunc(input.minorThresholdMinutes as number))
    : 15;
  const majorThresholdMinutes = Number.isFinite(input.majorThresholdMinutes)
    ? Math.max(minorThresholdMinutes + 1, Math.trunc(input.majorThresholdMinutes as number))
    : 60;
  const baselineMillis = new Date(input.baselineEta).getTime();
  const latestMillis = new Date(input.latestEta).getTime();
  if (!Number.isFinite(baselineMillis) || !Number.isFinite(latestMillis)) {
    return {
      etaDriftMinutes: 0,
      classification: 'major_drift',
    };
  }
  const etaDriftMinutes = Math.round((latestMillis - baselineMillis) / 60000);
  if (etaDriftMinutes <= minorThresholdMinutes) {
    return {
      etaDriftMinutes,
      classification: 'on_track',
    };
  }
  if (etaDriftMinutes <= majorThresholdMinutes) {
    return {
      etaDriftMinutes,
      classification: 'minor_drift',
    };
  }
  return {
    etaDriftMinutes,
    classification: 'major_drift',
  };
}

export function getDefaultDispatchEvidenceDraft(input: {
  laneId: string;
  issueIdentifier: string;
  laneType: DispatchCockpitLaneType;
}): DispatchEvidenceDraft {
  return {
    laneId: input.laneId,
    issueIdentifier: input.issueIdentifier,
    laneType: input.laneType,
    branch: '',
    fullSha: EVIDENCE_PACKET_LINT_SHA_PLACEHOLDER,
    prMode: 'no_pr_yet',
    testCommand: '',
    artifactPath: '',
    dependencyIssueLinksText: '',
    blockerOwner: '',
    blockerEta: '',
    updatedAt: '',
  };
}

export function applyDispatchEvidenceDraftPrMode(input: {
  draft: DispatchEvidenceDraft;
  prMode: DispatchEvidenceDraftPrMode;
}): DispatchEvidenceDraft {
  if (input.prMode === 'no_pr_yet') {
    return {
      ...input.draft,
      prMode: input.prMode,
    };
  }
  return {
    ...input.draft,
    prMode: input.prMode,
    blockerOwner: '',
    blockerEta: '',
  };
}

export function upsertDispatchEvidenceDraft(input: {
  drafts: DispatchEvidenceDraft[];
  draft: DispatchEvidenceDraft;
}): DispatchEvidenceDraft[] {
  const byLaneId = new Map(input.drafts.map((draft) => [draft.laneId, draft]));
  byLaneId.set(input.draft.laneId, input.draft);
  return [...byLaneId.values()].sort((left, right) => (
    left.issueIdentifier.localeCompare(right.issueIdentifier)
    || left.laneType.localeCompare(right.laneType)
    || left.laneId.localeCompare(right.laneId)
  ));
}

export function validateDispatchEvidenceDraft(
  draft: DispatchEvidenceDraft,
): DispatchEvidenceDraftValidation {
  const errors: string[] = [];
  const missingFields: string[] = [];
  const branch = draft.branch.trim();
  const fullSha = draft.fullSha.trim();
  const testCommand = draft.testCommand.trim();
  const artifactPath = draft.artifactPath.trim();
  const blockerOwner = draft.blockerOwner.trim();
  const blockerEta = draft.blockerEta.trim();
  const dependencyIssueLinks = normalizeMultilineEntries(draft.dependencyIssueLinksText);

  if (!branch) {
    missingFields.push('branch');
  }
  if (!fullSha) {
    missingFields.push('fullSha');
  } else if (!/^[a-f0-9]{40}$/i.test(fullSha)) {
    errors.push('Full SHA must be a 40-character hexadecimal value.');
  } else if (fullSha === EVIDENCE_PACKET_LINT_SHA_PLACEHOLDER) {
    errors.push('Full SHA placeholder must be replaced with a real commit SHA before save or validate.');
  }
  if (!draft.prMode) {
    missingFields.push('prMode');
  }
  if (!testCommand) {
    missingFields.push('testCommand');
  }
  if (!artifactPath) {
    missingFields.push('artifactPath');
  }
  if (dependencyIssueLinks.length === 0) {
    missingFields.push('dependencyIssueLinks');
  }
  for (const link of dependencyIssueLinks) {
    if (!canonicalizePaperclipIssueLink(link)) {
      errors.push(`Dependency issue link is invalid: ${link}`);
    }
  }
  if (draft.prMode === 'no_pr_yet') {
    if (!blockerOwner) {
      missingFields.push('blockerOwner');
    }
    if (!blockerEta) {
      missingFields.push('blockerEta');
    } else if (!Number.isFinite(new Date(blockerEta).getTime())) {
      errors.push('Blocker ETA must be a valid date-time string.');
    }
  }
  return {
    isComplete: errors.length === 0 && missingFields.length === 0,
    errors,
    missingFields,
    dependencyIssueLinks: dependencyIssueLinks
      .map((link) => canonicalizePaperclipIssueLink(link))
      .filter((link): link is string => Boolean(link))
      .sort((left, right) => left.localeCompare(right)),
  };
}

export function buildReleaseReadinessEvidenceBadges(
  draft: DispatchEvidenceDraft,
): ReleaseReadinessEvidenceBadge[] {
  const validation = validateDispatchEvidenceDraft(draft);
  const missingFields = new Set(validation.missingFields);
  const fullShaHasError = validation.errors.some((error) => error.toLowerCase().includes('full sha'));
  const dependencyLinkHasError = validation.errors.some((error) => error.toLowerCase().includes('dependency issue link'));

  return RELEASE_READINESS_EVIDENCE_FIELD_ORDER.map((field) => {
    const required = field === 'blockerOwner' || field === 'blockerEta'
      ? draft.prMode === 'no_pr_yet'
      : true;
    let complete = true;
    if (required && missingFields.has(field)) {
      complete = false;
    }
    if (field === 'fullSha' && fullShaHasError) {
      complete = false;
    }
    if (field === 'dependencyIssueLinks' && dependencyLinkHasError) {
      complete = false;
    }
    return {
      field,
      label: RELEASE_READINESS_EVIDENCE_FIELD_LABEL[field],
      required,
      complete,
    };
  });
}

function normalizeReleaseReadinessRisk(input: unknown): number {
  const numeric = parseFiniteNumber(input);
  if (numeric !== null) {
    return Math.max(0, Math.round(numeric));
  }
  const normalized = typeof input === 'string' ? input.trim().toLowerCase() : '';
  if (normalized === 'critical') {
    return 90;
  }
  if (normalized === 'high') {
    return 70;
  }
  if (normalized === 'medium') {
    return 45;
  }
  if (normalized === 'low') {
    return 20;
  }
  return 0;
}

function parseDispatchEvidenceDraftFromUnknown(input: {
  raw: unknown;
  laneId: string;
  issueIdentifier: string;
  laneType: DispatchCockpitLaneType;
}): DispatchEvidenceDraft {
  const draftBase = getDefaultDispatchEvidenceDraft({
    laneId: input.laneId,
    issueIdentifier: input.issueIdentifier,
    laneType: input.laneType,
  });
  if (!input.raw || typeof input.raw !== 'object') {
    return draftBase;
  }
  const raw = input.raw as Record<string, unknown>;
  const prMode: DispatchEvidenceDraftPrMode = raw.prMode === 'pr_link' ? 'pr_link' : 'no_pr_yet';
  return {
    ...draftBase,
    branch: typeof raw.branch === 'string' ? raw.branch : draftBase.branch,
    fullSha: typeof raw.fullSha === 'string' ? raw.fullSha : draftBase.fullSha,
    prMode,
    testCommand: typeof raw.testCommand === 'string' ? raw.testCommand : draftBase.testCommand,
    artifactPath: typeof raw.artifactPath === 'string' ? raw.artifactPath : draftBase.artifactPath,
    dependencyIssueLinksText: typeof raw.dependencyIssueLinksText === 'string'
      ? raw.dependencyIssueLinksText
      : draftBase.dependencyIssueLinksText,
    blockerOwner: typeof raw.blockerOwner === 'string' ? raw.blockerOwner : draftBase.blockerOwner,
    blockerEta: typeof raw.blockerEta === 'string' ? raw.blockerEta : draftBase.blockerEta,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : draftBase.updatedAt,
  };
}

function parseReleaseReadinessLane(raw: unknown): ReleaseReadinessSimulatorLane | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const issueIdentifier = normalizeOptional(
    typeof row.issueIdentifier === 'string'
      ? row.issueIdentifier
      : typeof row.identifier === 'string'
        ? row.identifier
        : String(row.issueIdentifier ?? row.identifier ?? row.id ?? ''),
  )?.toUpperCase();
  if (!issueIdentifier) {
    return null;
  }
  const laneType = normalizeDispatchLaneType(row.laneType ?? row.lane ?? row.type);
  const id = normalizeOptional(typeof row.id === 'string' ? row.id : `${issueIdentifier}|${laneType}`)
    ?? `${issueIdentifier}|${laneType}`;
  const readinessScore = parseFiniteNumber(row.readinessScore) ?? 0;
  const blockerRisk = normalizeReleaseReadinessRisk(row.blockerRisk ?? row.blockerSeverity ?? row.priority);
  const etaBaseline = resolveDateString(
    row.etaBaseline ?? row.blockerEtaBaseline ?? row.baselineEta,
    DIFF_FALLBACK_TIMESTAMP,
  );
  const etaLatest = resolveDateString(
    row.etaLatest ?? row.blockerEtaLatest ?? row.latestEta ?? row.updatedAt,
    etaBaseline,
  );
  const drift = classifyBlockerEtaDrift({
    baselineEta: etaBaseline,
    latestEta: etaLatest,
  });
  const draft = parseDispatchEvidenceDraftFromUnknown({
    raw: row.draft,
    laneId: id,
    issueIdentifier,
    laneType,
  });
  const evidenceBadges = buildReleaseReadinessEvidenceBadges(draft);
  const requiredBadges = evidenceBadges.filter((badge) => badge.required);
  const evidenceCompleteCount = requiredBadges.filter((badge) => badge.complete).length;
  return {
    id,
    issueIdentifier,
    readinessScore,
    blockerRisk,
    etaBaseline,
    etaLatest,
    etaDriftMinutes: drift.etaDriftMinutes,
    driftClass: drift.classification,
    evidenceBadges,
    evidenceCompleteCount,
    evidenceRequiredCount: requiredBadges.length,
    draft,
  };
}

export function buildReleaseReadinessSimulator(input: {
  lanes: unknown[];
  activeLaneId: string;
}): ReleaseReadinessSimulator {
  const rows = input.lanes
    .map((lane) => parseReleaseReadinessLane(lane))
    .filter((lane): lane is ReleaseReadinessSimulatorLane => Boolean(lane))
    .sort((left, right) => (
      right.readinessScore - left.readinessScore
      || right.blockerRisk - left.blockerRisk
      || right.etaDriftMinutes - left.etaDriftMinutes
      || left.issueIdentifier.localeCompare(right.issueIdentifier)
      || left.id.localeCompare(right.id)
    ));
  const idSet = new Set(rows.map((row) => row.id));
  const activeLaneId = idSet.has(input.activeLaneId)
    ? input.activeLaneId
    : (rows[0]?.id ?? '');
  return {
    contract: 'settlement-release-readiness-simulator.v1',
    rows,
    activeLaneId,
  };
}

export function moveReleaseReadinessLaneSelection(input: {
  rows: ReleaseReadinessSimulatorLane[];
  activeLaneId: string;
  direction: 'next_lane' | 'prev_lane';
}): string {
  if (input.rows.length === 0) {
    return '';
  }
  const currentIndex = input.rows.findIndex((row) => row.id === input.activeLaneId);
  if (currentIndex < 0) {
    return input.rows[0].id;
  }
  if (input.direction === 'next_lane') {
    return input.rows[Math.min(currentIndex + 1, input.rows.length - 1)].id;
  }
  return input.rows[Math.max(currentIndex - 1, 0)].id;
}

function normalizePublicationWindowScoreBand(input: unknown): PublicationWindowScoreBand {
  const normalized = typeof input === 'string' ? input.trim().toLowerCase() : '';
  if (normalized === 'ready_now' || normalized === 'ready_soon' || normalized === 'hold') {
    return normalized;
  }
  return 'hold';
}

export function resolvePublicationWindowScoreBandFromFinalScore(finalScore: number): PublicationWindowScoreBand {
  if (finalScore >= 85) {
    return 'ready_now';
  }
  if (finalScore >= 60) {
    return 'ready_soon';
  }
  return 'hold';
}

export function resolvePublicationWindowScoreBandLabel(scoreBand: PublicationWindowScoreBand): string {
  if (scoreBand === 'ready_now') {
    return 'Ready now';
  }
  if (scoreBand === 'ready_soon') {
    return 'Ready soon';
  }
  return 'Hold';
}

function normalizePublicationWindowDependencyGate(
  value: unknown,
  laneIssueIdentifier: string,
  laneBundleCode: string,
  gateIndex: number,
): PublicationWindowDependencyGateRow {
  const gate = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
  const issueIdentifier = normalizeOptional(
    typeof gate.issueIdentifier === 'string'
      ? gate.issueIdentifier
      : typeof gate.issueId === 'string'
        ? gate.issueId
        : '',
  )?.toUpperCase() ?? `UNKNOWN-${gateIndex + 1}`;
  const status = gate.status === 'resolved' ? 'resolved' : 'unresolved';
  const unresolvedReason = normalizeOptional(
    typeof gate.unresolvedReason === 'string'
      ? gate.unresolvedReason
      : typeof gate.reason === 'string'
        ? gate.reason
        : '',
  ) ?? (status === 'unresolved' ? 'No unresolved reason supplied.' : '');

  const issueLink = normalizeOptional(typeof gate.issueLink === 'string' ? gate.issueLink : '')
    ?? `/${issueIdentifier.split('-')[0] ?? 'ONE'}/issues/${issueIdentifier}`;
  const documentLink = normalizeOptional(typeof gate.documentLink === 'string' ? gate.documentLink : '')
    ?? `${issueLink}#document-plan`;
  const commentLink = normalizeOptional(typeof gate.commentLink === 'string' ? gate.commentLink : '')
    ?? '';

  const issueCanonical = canonicalizePaperclipIssueLink(issueLink);
  const documentCanonical = canonicalizePaperclipIssueLink(documentLink);
  const commentCanonical = commentLink ? canonicalizePaperclipIssueLink(commentLink) : '';
  const linksValid = Boolean(issueCanonical && documentCanonical && (!commentLink || commentCanonical));

  const id = `${laneIssueIdentifier}|${laneBundleCode}|${issueIdentifier}|${gateIndex}`;
  return {
    id,
    issueIdentifier,
    status,
    unresolvedReason,
    issueLink: issueCanonical ?? issueLink,
    documentLink: documentCanonical ?? documentLink,
    commentLink: commentCanonical || commentLink || '-',
    linksValid,
  };
}

function parsePublicationWindowPlanLane(raw: unknown): PublicationWindowPlanLane | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const issueIdentifier = normalizeOptional(
    typeof row.issueIdentifier === 'string'
      ? row.issueIdentifier
      : typeof row.issueId === 'string'
        ? row.issueId
        : '',
  )?.toUpperCase();
  const bundleCode = normalizeOptional(
    typeof row.bundleCode === 'string'
      ? row.bundleCode
      : typeof row.artifactCode === 'string'
        ? row.artifactCode
        : '',
  );
  if (!issueIdentifier || !bundleCode) {
    return null;
  }

  const id = normalizeOptional(typeof row.id === 'string' ? row.id : `${issueIdentifier}:${bundleCode}`)
    ?? `${issueIdentifier}:${bundleCode}`;
  const windowPriorityWeight = parseFiniteNumber(row.windowPriorityWeight) ?? 999;
  const blockerRisk = parseFiniteNumber(row.blockerRisk) ?? 0;
  const etaDriftMinutes = parseFiniteNumber(row.etaDriftMinutes) ?? 0;

  const releaseBundleScoreRaw = row.releaseBundleScore && typeof row.releaseBundleScore === 'object'
    ? row.releaseBundleScore as Record<string, unknown>
    : {};
  const completenessScore = parseFiniteNumber(releaseBundleScoreRaw.completenessScore) ?? 0;
  const blockerDriftPenalty = parseFiniteNumber(releaseBundleScoreRaw.blockerDriftPenalty) ?? 0;
  const dependencyRiskPenalty = parseFiniteNumber(releaseBundleScoreRaw.dependencyRiskPenalty) ?? 0;
  const finalScore = parseFiniteNumber(releaseBundleScoreRaw.finalScore) ?? Math.max(
    0,
    Math.round(completenessScore - blockerDriftPenalty - dependencyRiskPenalty),
  );
  const normalizedFinalScore = Math.max(0, Math.min(100, Math.round(finalScore)));
  const scoreBand = releaseBundleScoreRaw.scoreBand
    ? normalizePublicationWindowScoreBand(releaseBundleScoreRaw.scoreBand)
    : resolvePublicationWindowScoreBandFromFinalScore(normalizedFinalScore);
  const scoreBandLabel = resolvePublicationWindowScoreBandLabel(scoreBand);

  const dependencyGates = Array.isArray(row.dependencyGates)
    ? row.dependencyGates.map((gate, gateIndex) => (
      normalizePublicationWindowDependencyGate(gate, issueIdentifier, bundleCode, gateIndex)
    ))
    : [];
  const dependencyGateErrors = dependencyGates
    .filter((gate) => !gate.linksValid || (gate.status === 'unresolved' && !normalizeOptional(gate.unresolvedReason)))
    .map((gate) => (
      !gate.linksValid
        ? `${gate.issueIdentifier}: canonical issue/document/comment link required`
        : `${gate.issueIdentifier}: unresolved dependency requires unresolvedReason`
    ));

  return {
    id,
    issueIdentifier,
    bundleCode,
    windowPriorityWeight,
    blockerRisk,
    etaDriftMinutes,
    releaseBundleScore: {
      completenessScore,
      blockerDriftPenalty,
      dependencyRiskPenalty,
      finalScore: normalizedFinalScore,
      scoreBand,
      scoreBandLabel,
    },
    dependencyGates,
    dependencyGateErrors,
  };
}

export function buildPublicationWindowPlanBoard(input: {
  rows: unknown[];
  activeLaneId: string;
}): PublicationWindowPlanBoard {
  const rows = input.rows
    .map((row) => parsePublicationWindowPlanLane(row))
    .filter((row): row is PublicationWindowPlanLane => Boolean(row))
    .sort((left, right) => (
      left.windowPriorityWeight - right.windowPriorityWeight
      || left.blockerRisk - right.blockerRisk
      || left.etaDriftMinutes - right.etaDriftMinutes
      || left.issueIdentifier.localeCompare(right.issueIdentifier)
      || left.bundleCode.localeCompare(right.bundleCode)
      || left.id.localeCompare(right.id)
    ));
  const rowIdSet = new Set(rows.map((row) => row.id));
  const activeLaneId = rowIdSet.has(input.activeLaneId)
    ? input.activeLaneId
    : (rows[0]?.id ?? '');
  const scoreBandCounts: Record<PublicationWindowScoreBand, number> = {
    ready_now: 0,
    ready_soon: 0,
    hold: 0,
  };
  rows.forEach((row) => {
    scoreBandCounts[row.releaseBundleScore.scoreBand] += 1;
  });
  return {
    contract: 'settlement-publication-window-plan-board.v1',
    rows,
    activeLaneId,
    scoreBandCounts,
  };
}

export function movePublicationWindowLaneSelection(input: {
  rows: PublicationWindowPlanLane[];
  activeLaneId: string;
  direction: 'next_lane' | 'prev_lane';
}): string {
  if (input.rows.length === 0) {
    return '';
  }
  const currentIndex = input.rows.findIndex((row) => row.id === input.activeLaneId);
  if (currentIndex < 0) {
    return input.rows[0].id;
  }
  if (input.direction === 'next_lane') {
    return input.rows[Math.min(currentIndex + 1, input.rows.length - 1)].id;
  }
  return input.rows[Math.max(currentIndex - 1, 0)].id;
}

export function resolvePublicationWindowPlanShortcut(input: {
  key: string;
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): PublicationWindowPlanShortcut | null {
  const normalizedKey = input.key.toLowerCase();
  if (input.altKey && !input.shiftKey && normalizedKey === 'w') {
    return 'focus_publication_window_board';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'j') {
    return 'next_lane';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'k') {
    return 'prev_lane';
  }
  if (normalizedKey === 'e' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'open_score_explainer';
  }
  if (normalizedKey === 'g' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'open_dependency_gates';
  }
  return null;
}

function parsePublicationReadinessLane(input: unknown): PublicationReadinessBoardLane | null {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const row = input as Record<string, unknown>;
  const issueIdentifier = normalizeOptional(
    typeof row.issueIdentifier === 'string'
      ? row.issueIdentifier
      : typeof row.issueId === 'string'
        ? row.issueId
        : '',
  )?.toUpperCase();
  if (!issueIdentifier) {
    return null;
  }
  const id = normalizeOptional(
    typeof row.id === 'string'
      ? row.id
      : `${issueIdentifier}:readiness`,
  ) ?? `${issueIdentifier}:readiness`;

  const lanePriorityWeight = parseFiniteNumber(row.lanePriorityWeight) ?? 999;
  const blockerWeight = parseFiniteNumber(row.blockerWeight) ?? 999;
  const evidenceFieldWeight = parseFiniteNumber(row.evidenceFieldWeight) ?? 999;
  const branch = normalizeOptional(typeof row.branch === 'string' ? row.branch : '');
  const fullSha = normalizeOptional(typeof row.fullSha === 'string' ? row.fullSha : '');
  const prUrl = normalizeOptional(
    typeof row.prUrl === 'string'
      ? row.prUrl
      : typeof row.prLink === 'string'
        ? row.prLink
        : '',
  );
  const blockerPacketUrl = normalizeOptional(
    typeof row.blockerPacketUrl === 'string'
      ? row.blockerPacketUrl
      : typeof row.blockerLink === 'string'
        ? row.blockerLink
        : '',
  );
  const testSummary = normalizeOptional(
    typeof row.testSummary === 'string'
      ? row.testSummary
      : typeof row.testCommandSummary === 'string'
        ? row.testCommandSummary
        : '',
  );
  const artifactPath = normalizeOptional(
    typeof row.artifactPath === 'string'
      ? row.artifactPath
      : typeof row.artifactUrl === 'string'
        ? row.artifactUrl
        : '',
  );
  const blockedByCredential = Boolean(row.blockedByCredential);
  const nextOwner = normalizeOptional(typeof row.nextOwner === 'string' ? row.nextOwner : '') ?? '';

  const rawCanonicalLinks = Array.isArray(row.canonicalLinks)
    ? row.canonicalLinks
    : [row.issueLink, row.commentLink, row.documentLink].filter((value) => typeof value === 'string');
  const canonicalLinkViolations = rawCanonicalLinks
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim())
    .filter((value) => !canonicalizePaperclipIssueLink(value))
    .sort((left, right) => left.localeCompare(right));

  const missing = new Set<PublicationReadinessGapField>();
  if (!branch) {
    missing.add('branch');
  }
  if (!fullSha) {
    missing.add('fullSha');
  } else if (!/^[a-f0-9]{40}$/i.test(fullSha)) {
    missing.add('fullSha');
  }
  if (!prUrl && !blockerPacketUrl) {
    missing.add('prOrBlocker');
  }
  if (!testSummary) {
    missing.add('testSummary');
  }
  if (!artifactPath) {
    missing.add('artifactPath');
  }
  if (!nextOwner) {
    missing.add('nextOwner');
  }

  const hasBlockingGap = missing.has('prOrBlocker') || blockedByCredential;
  const readyToPublish = missing.size === 0 && canonicalLinkViolations.length === 0 && !blockedByCredential;
  const readinessState: PublicationReadinessState = readyToPublish
    ? 'ready'
    : hasBlockingGap
      ? 'blocked_publish'
      : 'missing_evidence';

  const missingFields = PUBLICATION_READINESS_GAP_FIELD_ORDER.filter((field) => missing.has(field));
  return {
    id,
    issueIdentifier,
    lanePriorityWeight,
    blockerWeight,
    evidenceFieldWeight,
    missingFields,
    canonicalLinkViolations,
    blockedByCredential,
    readyToPublish,
    nextOwner: nextOwner || 'unassigned',
    readinessState,
  };
}

export function buildPublicationReadinessBoard(input: {
  rows: unknown[];
  activeLaneId: string;
}): PublicationReadinessBoard {
  const rows = input.rows
    .map((row) => parsePublicationReadinessLane(row))
    .filter((row): row is PublicationReadinessBoardLane => Boolean(row))
    .sort((left, right) => (
      left.lanePriorityWeight - right.lanePriorityWeight
      || left.blockerWeight - right.blockerWeight
      || left.issueIdentifier.localeCompare(right.issueIdentifier)
      || left.evidenceFieldWeight - right.evidenceFieldWeight
      || left.id.localeCompare(right.id)
    ));
  const laneIds = new Set(rows.map((row) => row.id));
  const activeLaneId = laneIds.has(input.activeLaneId)
    ? input.activeLaneId
    : (rows[0]?.id ?? '');
  return {
    contract: 'settlement-publication-readiness-board.v1',
    rows,
    activeLaneId,
  };
}

export function movePublicationReadinessLaneSelection(input: {
  rows: PublicationReadinessBoardLane[];
  activeLaneId: string;
  direction: 'next_lane' | 'prev_lane';
}): string {
  if (input.rows.length === 0) {
    return '';
  }
  const currentIndex = input.rows.findIndex((row) => row.id === input.activeLaneId);
  if (currentIndex < 0) {
    return input.rows[0].id;
  }
  if (input.direction === 'next_lane') {
    return input.rows[Math.min(currentIndex + 1, input.rows.length - 1)].id;
  }
  return input.rows[Math.max(currentIndex - 1, 0)].id;
}

export function resolvePublicationReadinessShortcut(input: {
  key: string;
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): PublicationReadinessBoardShortcut | null {
  const normalizedKey = input.key.toLowerCase();
  if (input.altKey && !input.shiftKey && normalizedKey === 'r') {
    return 'focus_readiness_board';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'n') {
    return 'next_lane';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'p') {
    return 'prev_lane';
  }
  if (normalizedKey === 'g' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'open_gap_resolver';
  }
  if (input.key === 'Enter' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'validate_readiness_snapshot';
  }
  return null;
}

export function buildPublicationReadinessGapResolverPanel(input: {
  rows: unknown[];
  activeLaneId: string;
}): PublicationReadinessGapResolverPanel {
  const board = buildPublicationReadinessBoard(input);
  const lane = board.rows.find((row) => row.id === board.activeLaneId);
  if (!lane) {
    return {
      contract: 'settlement-publication-readiness-gap-resolver.v1',
      laneId: '',
      issueIdentifier: '',
      missingFields: [],
      canonicalLinkViolations: [],
      blockedByCredential: false,
      readyToPublish: false,
      nextOwner: 'unassigned',
    };
  }
  return {
    contract: 'settlement-publication-readiness-gap-resolver.v1',
    laneId: lane.id,
    issueIdentifier: lane.issueIdentifier,
    missingFields: [...lane.missingFields],
    canonicalLinkViolations: [...lane.canonicalLinkViolations],
    blockedByCredential: lane.blockedByCredential,
    readyToPublish: lane.readyToPublish,
    nextOwner: lane.nextOwner,
  };
}

export function buildPublicationReadinessCanonicalAutofixPreview(input: {
  markdown: string;
}): PublicationReadinessCanonicalAutofixPreview {
  const candidates: string[] = [];
  const hrefPattern = /(?:https?:\/\/[^\s)]+\/issues\/[A-Za-z0-9-]+(?:#[^\s)]+)?|\/[A-Za-z0-9_-]+\/issues\/[A-Za-z0-9-]+(?:#[^\s)]+)?|\/issues\/[A-Za-z0-9-]+(?:#[^\s)]+)?)/g;
  const patchedMarkdown = input.markdown.replace(hrefPattern, (match) => {
    const trailingPunctuation = match.match(/[.,;:!?]+$/)?.[0] ?? '';
    const candidate = trailingPunctuation
      ? match.slice(0, -trailingPunctuation.length)
      : match;
    const canonical = canonicalizePaperclipIssueLink(candidate);
    candidates.push(candidate);
    return `${canonical ?? candidate}${trailingPunctuation}`;
  });

  const rows = [...new Set(candidates)]
    .map((original, index) => {
      const normalized = canonicalizePaperclipIssueLink(original) ?? original;
      return {
        id: `readiness-autofix-${index}-${original}`,
        original,
        normalized,
        changed: normalized !== original,
      };
    })
    .sort((left, right) => left.original.localeCompare(right.original));

  const invalidCount = rows.filter((row) => !canonicalizePaperclipIssueLink(row.original)).length;
  const changedCount = rows.filter((row) => row.changed).length;
  return {
    contract: 'settlement-publication-readiness-canonical-autofix.v1',
    rows,
    patchedMarkdown,
    changedCount,
    invalidCount,
  };
}

function normalizeOfflinePublicationIssueIdentifier(input: unknown): string | null {
  const normalized = normalizeOptional(
    typeof input === 'string' ? input : String(input ?? ''),
  )?.toUpperCase();
  if (!normalized) {
    return null;
  }
  return /^[A-Z0-9]+-\d+$/.test(normalized) ? normalized : null;
}

function normalizeOfflinePublicationWeight(input: unknown, fallback = 999): number {
  const parsed = parseFiniteNumber(input);
  if (parsed === null) {
    return fallback;
  }
  return Math.max(0, Math.trunc(parsed));
}

function parseOfflinePublicationEvidenceLane(input: unknown, index: number): OfflinePublicationEvidenceLane | null {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const row = input as Record<string, unknown>;
  const issueIdentifier = normalizeOfflinePublicationIssueIdentifier(
    row.issueIdentifier ?? row.issueId,
  );
  if (!issueIdentifier) {
    return null;
  }
  const id = normalizeOptional(
    typeof row.id === 'string'
      ? row.id
      : `${issueIdentifier}:offline-evidence:${index + 1}`,
  ) ?? `${issueIdentifier}:offline-evidence:${index + 1}`;
  const lanePriorityWeight = normalizeOfflinePublicationWeight(
    row.lanePriorityWeight ?? row.priorityWeight ?? row.lanePriority,
  );
  const readinessWeight = normalizeOfflinePublicationWeight(
    row.readinessWeight ?? row.readinessRank ?? row.readinessPriority,
  );
  const evidenceTypeWeight = normalizeOfflinePublicationWeight(
    row.evidenceTypeWeight ?? row.typeWeight,
  );
  const evidenceType = normalizeOptional(
    typeof row.evidenceType === 'string'
      ? row.evidenceType
      : typeof row.type === 'string'
        ? row.type
        : '',
  ) ?? 'evidence';
  const evidencePath = normalizeOptional(
    typeof row.evidencePath === 'string'
      ? row.evidencePath
      : typeof row.path === 'string'
        ? row.path
        : typeof row.artifactPath === 'string'
          ? row.artifactPath
          : '',
  ) ?? '';
  const branch = normalizeOptional(typeof row.branch === 'string' ? row.branch : '');
  const commit = normalizeOptional(
    typeof row.fullSha === 'string'
      ? row.fullSha
      : typeof row.commitSha === 'string'
        ? row.commitSha
        : typeof row.commit === 'string'
          ? row.commit
          : '',
  );
  const pr = normalizeOptional(
    typeof row.prUrl === 'string'
      ? row.prUrl
      : typeof row.prLink === 'string'
        ? row.prLink
        : typeof row.pullRequestUrl === 'string'
          ? row.pullRequestUrl
          : '',
  );
  const testCommand = normalizeOptional(
    typeof row.testCommand === 'string'
      ? row.testCommand
      : typeof row.testSummary === 'string'
        ? row.testSummary
        : '',
  );
  const artifactPath = normalizeOptional(
    typeof row.artifactPath === 'string'
      ? row.artifactPath
      : evidencePath,
  );
  const credentialBlocked = Boolean(
    row.credentialBlocked
    ?? row.blockedByCredential
    ?? row.credentialsBlocked,
  );
  const nextOwner = normalizeOptional(typeof row.nextOwner === 'string' ? row.nextOwner : '') ?? 'unassigned';
  const hasBranch = Boolean(branch);
  const hasCommit = Boolean(commit && /^[a-f0-9]{40}$/i.test(commit));
  const hasPr = Boolean(pr);
  const hasTestCommand = Boolean(testCommand);
  const hasArtifactPath = Boolean(artifactPath);
  const dispatchReady = hasBranch
    && hasCommit
    && hasPr
    && hasTestCommand
    && hasArtifactPath
    && !credentialBlocked;

  return {
    id,
    issueIdentifier,
    lanePriorityWeight,
    readinessWeight,
    evidenceTypeWeight,
    evidenceType,
    evidencePath,
    orderingKey: [
      lanePriorityWeight,
      readinessWeight,
      issueIdentifier,
      evidenceTypeWeight,
      evidencePath,
    ],
    machineFields: {
      hasBranch,
      hasCommit,
      hasPr,
      hasTestCommand,
      hasArtifactPath,
      credentialBlocked,
      nextOwner,
      dispatchReady,
    },
  };
}

function buildOfflinePublicationEvidenceHandoffPacketMarkdown(rows: OfflinePublicationEvidenceLane[]): string {
  const lines: string[] = [
    '# Offline Publication Handoff Packet',
    '',
    '| Issue | Evidence | Dispatch Ready | Missing | Next Owner |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const row of rows) {
    const issueLink = `/${row.issueIdentifier.split('-')[0]}/issues/${row.issueIdentifier}`;
    const missing: string[] = [];
    if (!row.machineFields.hasBranch) missing.push('branch');
    if (!row.machineFields.hasCommit) missing.push('commit');
    if (!row.machineFields.hasPr) missing.push('pr');
    if (!row.machineFields.hasTestCommand) missing.push('testCommand');
    if (!row.machineFields.hasArtifactPath) missing.push('artifactPath');
    if (row.machineFields.credentialBlocked) missing.push('credentialBlocked');
    lines.push(
      `| ${issueLink} | ${row.evidenceType} (${row.evidencePath || 'n/a'}) | ${row.machineFields.dispatchReady ? 'yes' : 'no'} | ${missing.join(', ') || 'none'} | ${row.machineFields.nextOwner} |`,
    );
  }
  return lines.join('\n');
}

export function buildOfflinePublicationEvidenceNormalizer(input: {
  rows: unknown[];
  activeLaneId: string;
}): OfflinePublicationEvidenceNormalizer {
  const rows = input.rows
    .map((row, index) => parseOfflinePublicationEvidenceLane(row, index))
    .filter((row): row is OfflinePublicationEvidenceLane => Boolean(row))
    .sort((left, right) => (
      left.lanePriorityWeight - right.lanePriorityWeight
      || left.readinessWeight - right.readinessWeight
      || left.issueIdentifier.localeCompare(right.issueIdentifier)
      || left.evidenceTypeWeight - right.evidenceTypeWeight
      || left.evidencePath.localeCompare(right.evidencePath)
      || left.id.localeCompare(right.id)
    ));
  const rowIds = new Set(rows.map((row) => row.id));
  const activeLaneId = rowIds.has(input.activeLaneId)
    ? input.activeLaneId
    : (rows[0]?.id ?? '');
  return {
    contract: 'settlement-offline-publication-evidence-normalizer.v1',
    rows,
    activeLaneId,
    dispatchReadyCount: rows.filter((row) => row.machineFields.dispatchReady).length,
    blockedCount: rows.filter((row) => row.machineFields.credentialBlocked).length,
    handoffPacketMarkdown: buildOfflinePublicationEvidenceHandoffPacketMarkdown(rows),
  };
}

export function moveOfflinePublicationEvidenceLaneSelection(input: {
  rows: OfflinePublicationEvidenceLane[];
  activeLaneId: string;
  direction: 'next_lane' | 'prev_lane';
}): string {
  if (input.rows.length === 0) {
    return '';
  }
  const currentIndex = input.rows.findIndex((row) => row.id === input.activeLaneId);
  if (currentIndex < 0) {
    return input.rows[0].id;
  }
  if (input.direction === 'next_lane') {
    return input.rows[Math.min(currentIndex + 1, input.rows.length - 1)].id;
  }
  return input.rows[Math.max(currentIndex - 1, 0)].id;
}

export function resolveOfflinePublicationEvidenceShortcut(input: {
  key: string;
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): OfflinePublicationEvidenceShortcut | null {
  const normalizedKey = input.key.toLowerCase();
  if (input.altKey && !input.shiftKey && normalizedKey === 'e') {
    return 'focus_evidence_list';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'n') {
    return 'next_lane';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'p') {
    return 'prev_lane';
  }
  if (normalizedKey === 'h' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'open_handoff_packet_preview';
  }
  if (input.key === 'Enter' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'run_deterministic_normalization_pass';
  }
  return null;
}

export function buildOfflinePublicationEvidenceCanonicalPatchPreview(input: {
  markdown: string;
}): OfflinePublicationEvidenceCanonicalPatchPreview {
  const candidates: string[] = [];
  const hrefPattern = /(?:https?:\/\/[^\s)]+\/issues\/[A-Za-z0-9-]+(?:#[^\s)]+)?|\/[A-Za-z0-9_-]+\/issues\/[A-Za-z0-9-]+(?:#[^\s)]+)?|\/issues\/[A-Za-z0-9-]+(?:#[^\s)]+)?)/g;
  const patchedMarkdown = input.markdown.replace(hrefPattern, (match) => {
    const trailingPunctuation = match.match(/[.,;:!?]+$/)?.[0] ?? '';
    const candidate = trailingPunctuation
      ? match.slice(0, -trailingPunctuation.length)
      : match;
    const canonical = canonicalizePaperclipIssueLink(candidate);
    candidates.push(candidate);
    return `${canonical ?? candidate}${trailingPunctuation}`;
  });

  const rows = [...new Set(candidates)]
    .map((original, index) => {
      const normalized = canonicalizePaperclipIssueLink(original) ?? original;
      return {
        id: `offline-patch-${index}-${original}`,
        original,
        normalized,
        changed: normalized !== original,
      };
    })
    .sort((left, right) => left.original.localeCompare(right.original));
  const changedCount = rows.filter((row) => row.changed).length;
  const invalidCount = rows.filter((row) => !canonicalizePaperclipIssueLink(row.original)).length;

  return {
    contract: 'settlement-offline-publication-evidence-canonical-patch-preview.v1',
    rows,
    patchedMarkdown,
    changedCount,
    invalidCount,
    copyText: patchedMarkdown,
  };
}

function normalizeRemediationQueueIdentifier(raw: unknown, fallbackIndex: number): string {
  if (typeof raw === 'string') {
    const value = raw.trim().toUpperCase();
    if (/^[A-Z0-9]+-\d+$/.test(value)) {
      return value;
    }
  }
  return `ONE-${1000 + fallbackIndex}`;
}

function normalizeRemediationQueueWeight(raw: unknown, fallback: number): number {
  const value = Number(raw);
  if (Number.isFinite(value) && value >= 0) {
    return value;
  }
  return fallback;
}

function parseRemediationQueueRow(row: unknown, index: number): RemediationQueueTriageRow | null {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const payload = row as Record<string, unknown>;
  const issueIdentifier = normalizeRemediationQueueIdentifier(payload.issueIdentifier, index);
  const idRaw = normalizeOptional(typeof payload.id === 'string' ? payload.id : '');
  const id = idRaw ?? `remediation-queue-${index + 1}`;
  const remediationType = normalizeOptional(typeof payload.remediationType === 'string' ? payload.remediationType : '')
    ?? 'unspecified';
  const severityWeight = normalizeRemediationQueueWeight(payload.severityWeight, 5);
  const blockerWeight = normalizeRemediationQueueWeight(payload.blockerWeight, 5);
  const dependencyDepthWeight = normalizeRemediationQueueWeight(payload.dependencyDepthWeight, 5);
  const remediationTypeWeight = normalizeRemediationQueueWeight(payload.remediationTypeWeight, 5);
  const title = normalizeOptional(typeof payload.title === 'string' ? payload.title : '')
    ?? `${issueIdentifier} remediation lane`;
  const evidencePath = normalizeOptional(
    typeof payload.evidencePath === 'string'
      ? payload.evidencePath
      : (typeof payload.artifactPath === 'string' ? payload.artifactPath : ''),
  ) ?? `artifacts/${issueIdentifier.toLowerCase()}/handoff.md`;
  const nextOwner = normalizeOptional(typeof payload.nextOwner === 'string' ? payload.nextOwner : '') ?? 'unassigned';

  const missingEvidence = Array.isArray(payload.missingEvidence)
    ? payload.missingEvidence.map((value) => String(value).trim()).filter(Boolean)
    : [];
  const evidenceChecks = [
    ['branch', normalizeOptional(typeof payload.branch === 'string' ? payload.branch : '')],
    ['fullSha', normalizeOptional(typeof payload.fullSha === 'string' ? payload.fullSha : '')],
    ['prLink', normalizeOptional(typeof payload.prLink === 'string' ? payload.prLink : '')],
    ['testCommand', normalizeOptional(typeof payload.testCommand === 'string' ? payload.testCommand : '')],
    ['artifactPath', normalizeOptional(typeof payload.artifactPath === 'string' ? payload.artifactPath : '')],
  ] as const;
  for (const [field, value] of evidenceChecks) {
    if (!value) {
      missingEvidence.push(field);
    }
  }
  const uniqueMissingEvidence = [...new Set(missingEvidence)].sort((left, right) => left.localeCompare(right));

  const blockingDependencies = Array.isArray(payload.blockingDependencies)
    ? payload.blockingDependencies.map((value) => String(value).trim()).filter(Boolean)
    : [];

  const canonicalCandidates = [
    ...(Array.isArray(payload.canonicalLinks) ? payload.canonicalLinks : []),
    ...(Array.isArray(payload.dependencyLinks) ? payload.dependencyLinks : []),
  ]
    .map((value) => String(value).trim())
    .filter(Boolean);
  const canonicalLinkViolations = canonicalCandidates
    .map((link) => {
      const normalized = canonicalizePaperclipIssueLink(link);
      if (!normalized) {
        return link;
      }
      return normalized === link ? '' : link;
    })
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));

  return {
    id,
    issueIdentifier,
    remediationType,
    severityWeight,
    blockerWeight,
    dependencyDepthWeight,
    remediationTypeWeight,
    title,
    evidencePath,
    orderingKey: [
      severityWeight,
      blockerWeight,
      dependencyDepthWeight,
      issueIdentifier,
      remediationTypeWeight,
    ],
    machineFields: {
      readyForExecution: uniqueMissingEvidence.length === 0
        && blockingDependencies.length === 0
        && canonicalLinkViolations.length === 0,
      missingEvidence: uniqueMissingEvidence,
      blockingDependencies: [...blockingDependencies].sort((left, right) => left.localeCompare(right)),
      nextOwner,
      canonicalLinkViolations,
    },
  };
}

export function buildRemediationQueueTriageWorkspace(input: {
  rows: unknown[];
  activeRowId: string;
}): RemediationQueueTriageWorkspace {
  const rows = input.rows
    .map((row, index) => parseRemediationQueueRow(row, index))
    .filter((row): row is RemediationQueueTriageRow => Boolean(row))
    .sort((left, right) => (
      left.severityWeight - right.severityWeight
      || left.blockerWeight - right.blockerWeight
      || left.dependencyDepthWeight - right.dependencyDepthWeight
      || left.issueIdentifier.localeCompare(right.issueIdentifier)
      || left.remediationTypeWeight - right.remediationTypeWeight
      || left.id.localeCompare(right.id)
    ));
  const rowIds = new Set(rows.map((row) => row.id));
  const activeRowId = rowIds.has(input.activeRowId)
    ? input.activeRowId
    : (rows[0]?.id ?? '');
  return {
    contract: 'settlement-remediation-queue-triage-workspace.v1',
    rows,
    activeRowId,
  };
}

export function moveRemediationQueueSelection(input: {
  rows: RemediationQueueTriageRow[];
  activeRowId: string;
  direction: 'next_item' | 'prev_item';
}): string {
  if (input.rows.length === 0) {
    return '';
  }
  const currentIndex = input.rows.findIndex((row) => row.id === input.activeRowId);
  if (currentIndex < 0) {
    return input.rows[0].id;
  }
  if (input.direction === 'next_item') {
    return input.rows[Math.min(currentIndex + 1, input.rows.length - 1)].id;
  }
  return input.rows[Math.max(currentIndex - 1, 0)].id;
}

export function resolveRemediationQueueShortcut(input: {
  key: string;
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): RemediationQueueShortcut | null {
  const normalizedKey = input.key.toLowerCase();
  if (input.altKey && !input.shiftKey && normalizedKey === 'q') {
    return 'focus_queue';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'n') {
    return 'next_item';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'p') {
    return 'prev_item';
  }
  if (normalizedKey === 'h' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'open_handoff_panel';
  }
  if (input.key === 'Enter' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'run_validation_pass';
  }
  return null;
}

function buildRemediationQueueHandoffMarkdown(rows: RemediationQueueTriageRow[]): string {
  const lines = [
    '# Remediation Queue Handoff',
    '',
    '| Issue | Ready | Missing Evidence | Blocking Dependencies | Next Owner | Canonical Link Violations |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const row of rows) {
    const issueLink = `/${row.issueIdentifier.split('-')[0]}/issues/${row.issueIdentifier}`;
    lines.push([
      '|',
      issueLink,
      '|',
      row.machineFields.readyForExecution ? 'yes' : 'no',
      '|',
      row.machineFields.missingEvidence.join(', ') || 'none',
      '|',
      row.machineFields.blockingDependencies.join(', ') || 'none',
      '|',
      row.machineFields.nextOwner,
      '|',
      row.machineFields.canonicalLinkViolations.join(', ') || 'none',
      '|',
    ].join(' '));
  }
  return lines.join('\n');
}

export function buildRemediationQueueHandoffPanel(input: {
  rows: RemediationQueueTriageRow[];
}): RemediationQueueHandoffPanel {
  const items = input.rows.map((row) => ({
    id: row.id,
    issueIdentifier: row.issueIdentifier,
    readyForExecution: row.machineFields.readyForExecution,
    missingEvidence: [...row.machineFields.missingEvidence],
    blockingDependencies: [...row.machineFields.blockingDependencies],
    nextOwner: row.machineFields.nextOwner,
    canonicalLinkViolations: [...row.machineFields.canonicalLinkViolations],
  }));
  return {
    contract: 'settlement-remediation-queue-handoff-panel.v1',
    items,
    markdown: buildRemediationQueueHandoffMarkdown(input.rows),
  };
}

export function buildRemediationQueueCanonicalAutofixPreview(input: {
  markdown: string;
}): RemediationQueueCanonicalAutofixPreview {
  const candidates: string[] = [];
  const hrefPattern = /(?:https?:\/\/[^\s)]+\/issues\/[A-Za-z0-9-]+(?:#[^\s)]+)?|\/[A-Za-z0-9_-]+\/issues\/[A-Za-z0-9-]+(?:#[^\s)]+)?|\/issues\/[A-Za-z0-9-]+(?:#[^\s)]+)?)/g;
  const patchedMarkdown = input.markdown.replace(hrefPattern, (match) => {
    const trailingPunctuation = match.match(/[.,;:!?]+$/)?.[0] ?? '';
    const candidate = trailingPunctuation
      ? match.slice(0, -trailingPunctuation.length)
      : match;
    const canonical = canonicalizePaperclipIssueLink(candidate);
    candidates.push(candidate);
    return `${canonical ?? candidate}${trailingPunctuation}`;
  });
  const rows = [...new Set(candidates)]
    .map((original, index) => {
      const normalized = canonicalizePaperclipIssueLink(original) ?? original;
      return {
        id: `remediation-autofix-${index}-${original}`,
        original,
        normalized,
        changed: normalized !== original,
      };
    })
    .sort((left, right) => left.original.localeCompare(right.original));
  const changedCount = rows.filter((row) => row.changed).length;
  const invalidCount = rows.filter((row) => !canonicalizePaperclipIssueLink(row.original)).length;
  return {
    contract: 'settlement-remediation-queue-canonical-autofix-preview.v1',
    rows,
    patchedMarkdown,
    changedCount,
    invalidCount,
    copyText: patchedMarkdown,
  };
}

function normalizeReleaseGateState(input: unknown): ReleaseGateState {
  if (typeof input !== 'string') {
    return 'pass';
  }
  const normalized = input.trim().toLowerCase();
  if (normalized === 'block' || normalized === 'blocked' || normalized === 'fail' || normalized === 'failed') {
    return 'block';
  }
  if (normalized === 'warn' || normalized === 'warning') {
    return 'warn';
  }
  return 'pass';
}

function normalizeReleaseGateVerdictIdentifier(raw: unknown, fallbackIndex: number): string {
  if (typeof raw === 'string') {
    const value = raw.trim().toUpperCase();
    if (/^[A-Z0-9]+-\d+$/.test(value)) {
      return value;
    }
  }
  return `ONE-${1200 + fallbackIndex}`;
}

function normalizeReleaseGateVerdictWeight(raw: unknown, fallback: number): number {
  const value = Number(raw);
  if (Number.isFinite(value) && value >= 0) {
    return value;
  }
  return fallback;
}

function parseReleaseGateVerdictRow(row: unknown, index: number): ReleaseGateVerdictRow | null {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const payload = row as Record<string, unknown>;
  const issueIdentifier = normalizeReleaseGateVerdictIdentifier(payload.issueIdentifier, index);
  const idRaw = normalizeOptional(typeof payload.id === 'string' ? payload.id : '');
  const id = idRaw ?? `release-gate-verdict-${index + 1}`;
  const remediationType = normalizeOptional(typeof payload.remediationType === 'string' ? payload.remediationType : '')
    ?? 'unspecified';
  const gatePriorityWeight = normalizeReleaseGateVerdictWeight(payload.gatePriorityWeight, 5);
  const blockerWeight = normalizeReleaseGateVerdictWeight(payload.blockerWeight, 5);
  const dependencyDepthWeight = normalizeReleaseGateVerdictWeight(payload.dependencyDepthWeight, 5);
  const remediationTypeWeight = normalizeReleaseGateVerdictWeight(payload.remediationTypeWeight, 5);
  const title = normalizeOptional(typeof payload.title === 'string' ? payload.title : '')
    ?? `${issueIdentifier} release gate lane`;
  const evidencePath = normalizeOptional(
    typeof payload.evidencePath === 'string'
      ? payload.evidencePath
      : (typeof payload.artifactPath === 'string' ? payload.artifactPath : ''),
  ) ?? `artifacts/${issueIdentifier.toLowerCase()}/release-gate.md`;
  const nextOwner = normalizeOptional(typeof payload.nextOwner === 'string' ? payload.nextOwner : '') ?? 'unassigned';
  const releaseGateState = normalizeReleaseGateState(payload.releaseGateState);

  const requiredRemediations = Array.isArray(payload.requiredRemediations)
    ? payload.requiredRemediations.map((value) => String(value).trim()).filter(Boolean)
    : [];
  const blockingDependencies = Array.isArray(payload.blockingDependencies)
    ? payload.blockingDependencies.map((value) => String(value).trim()).filter(Boolean)
    : [];
  const missingEvidence = Array.isArray(payload.missingEvidence)
    ? payload.missingEvidence.map((value) => String(value).trim()).filter(Boolean)
    : [];

  const evidenceChecks = [
    ['branch', normalizeOptional(typeof payload.branch === 'string' ? payload.branch : '')],
    ['fullSha', normalizeOptional(typeof payload.fullSha === 'string' ? payload.fullSha : '')],
    ['prLink', normalizeOptional(typeof payload.prLink === 'string' ? payload.prLink : '')],
    ['testCommand', normalizeOptional(typeof payload.testCommand === 'string' ? payload.testCommand : '')],
    ['artifactPath', normalizeOptional(typeof payload.artifactPath === 'string' ? payload.artifactPath : '')],
  ] as const;
  for (const [field, value] of evidenceChecks) {
    if (!value) {
      missingEvidence.push(field);
    }
  }
  const uniqueMissingEvidence = [...new Set(missingEvidence)].sort((left, right) => left.localeCompare(right));
  const uniqueRequiredRemediations = [...new Set(requiredRemediations)].sort((left, right) => left.localeCompare(right));
  const uniqueBlockingDependencies = [...new Set(blockingDependencies)].sort((left, right) => left.localeCompare(right));

  const canonicalCandidates = [
    ...(Array.isArray(payload.canonicalLinks) ? payload.canonicalLinks : []),
    ...(Array.isArray(payload.dependencyLinks) ? payload.dependencyLinks : []),
    payload.issueLink,
    payload.documentLink,
    payload.commentLink,
  ]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);
  const canonicalLinkViolations = canonicalCandidates
    .map((link) => {
      const normalized = canonicalizePaperclipIssueLink(link);
      if (!normalized) {
        return link;
      }
      return normalized === link ? '' : link;
    })
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));

  return {
    id,
    issueIdentifier,
    remediationType,
    gatePriorityWeight,
    blockerWeight,
    dependencyDepthWeight,
    remediationTypeWeight,
    title,
    evidencePath,
    orderingKey: [
      gatePriorityWeight,
      blockerWeight,
      dependencyDepthWeight,
      issueIdentifier,
      remediationTypeWeight,
    ],
    machineFields: {
      releaseGateState,
      requiredRemediations: uniqueRequiredRemediations,
      blockingDependencies: uniqueBlockingDependencies,
      missingEvidence: uniqueMissingEvidence,
      nextOwner,
      readyForExecution: releaseGateState !== 'block'
        && uniqueRequiredRemediations.length === 0
        && uniqueBlockingDependencies.length === 0
        && uniqueMissingEvidence.length === 0
        && canonicalLinkViolations.length === 0,
    },
    canonicalLinkViolations,
  };
}

export function buildReleaseGateVerdictExplorer(input: {
  rows: unknown[];
  activeVerdictId: string;
}): ReleaseGateVerdictExplorer {
  const rows = input.rows
    .map((row, index) => parseReleaseGateVerdictRow(row, index))
    .filter((row): row is ReleaseGateVerdictRow => Boolean(row))
    .sort((left, right) => (
      left.gatePriorityWeight - right.gatePriorityWeight
      || left.blockerWeight - right.blockerWeight
      || left.dependencyDepthWeight - right.dependencyDepthWeight
      || left.issueIdentifier.localeCompare(right.issueIdentifier)
      || left.remediationTypeWeight - right.remediationTypeWeight
      || left.id.localeCompare(right.id)
    ));
  const rowIds = new Set(rows.map((row) => row.id));
  const activeVerdictId = rowIds.has(input.activeVerdictId)
    ? input.activeVerdictId
    : (rows[0]?.id ?? '');
  return {
    contract: 'settlement-release-gate-verdict-explorer.v1',
    rows,
    activeVerdictId,
    readyCount: rows.filter((row) => row.machineFields.readyForExecution).length,
    blockedCount: rows.filter((row) => !row.machineFields.readyForExecution).length,
  };
}

export function moveReleaseGateVerdictSelection(input: {
  rows: ReleaseGateVerdictRow[];
  activeVerdictId: string;
  direction: 'next_verdict' | 'prev_verdict';
}): string {
  if (input.rows.length === 0) {
    return '';
  }
  const currentIndex = input.rows.findIndex((row) => row.id === input.activeVerdictId);
  if (currentIndex < 0) {
    return input.rows[0].id;
  }
  if (input.direction === 'next_verdict') {
    return input.rows[Math.min(currentIndex + 1, input.rows.length - 1)].id;
  }
  return input.rows[Math.max(currentIndex - 1, 0)].id;
}

export function resolveReleaseGateVerdictShortcut(input: {
  key: string;
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): ReleaseGateVerdictShortcut | null {
  const normalizedKey = input.key.toLowerCase();
  if (input.altKey && !input.shiftKey && normalizedKey === 'g') {
    return 'focus_verdict_explorer';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'n') {
    return 'next_verdict';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'p') {
    return 'prev_verdict';
  }
  if (normalizedKey === 'm' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'open_remediation_matrix';
  }
  if (input.key === 'Enter' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'run_deterministic_validation_pass';
  }
  return null;
}

function buildReleaseGateRemediationActionMatrixMarkdown(rows: ReleaseGateVerdictRow[]): string {
  const lines = [
    '# Release Gate Remediation Action Matrix',
    '',
    '| Issue | releaseGateState | requiredRemediations[] | blockingDependencies[] | missingEvidence[] | nextOwner | readyForExecution |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const row of rows) {
    const issueLink = `/${row.issueIdentifier.split('-')[0]}/issues/${row.issueIdentifier}`;
    lines.push([
      '|',
      issueLink,
      '|',
      row.machineFields.releaseGateState,
      '|',
      row.machineFields.requiredRemediations.join(', ') || 'none',
      '|',
      row.machineFields.blockingDependencies.join(', ') || 'none',
      '|',
      row.machineFields.missingEvidence.join(', ') || 'none',
      '|',
      row.machineFields.nextOwner,
      '|',
      row.machineFields.readyForExecution ? 'yes' : 'no',
      '|',
    ].join(' '));
  }
  return lines.join('\n');
}

export function buildReleaseGateRemediationActionMatrix(input: {
  rows: ReleaseGateVerdictRow[];
}): ReleaseGateRemediationActionMatrix {
  const items = input.rows.map((row) => ({
    id: row.id,
    issueIdentifier: row.issueIdentifier,
    releaseGateState: row.machineFields.releaseGateState,
    requiredRemediations: [...row.machineFields.requiredRemediations],
    blockingDependencies: [...row.machineFields.blockingDependencies],
    missingEvidence: [...row.machineFields.missingEvidence],
    nextOwner: row.machineFields.nextOwner,
    readyForExecution: row.machineFields.readyForExecution,
    canonicalLinkViolations: [...row.canonicalLinkViolations],
  }));
  return {
    contract: 'settlement-release-gate-remediation-action-matrix.v1',
    items,
    markdown: buildReleaseGateRemediationActionMatrixMarkdown(input.rows),
  };
}

export function buildReleaseGateCanonicalAutofixPreview(input: {
  markdown: string;
}): ReleaseGateCanonicalAutofixPreview {
  const candidates: string[] = [];
  const hrefPattern = /(?:https?:\/\/[^\s)]+\/issues\/[A-Za-z0-9-]+(?:#[^\s)]+)?|\/[A-Za-z0-9_-]+\/issues\/[A-Za-z0-9-]+(?:#[^\s)]+)?|\/issues\/[A-Za-z0-9-]+(?:#[^\s)]+)?)/g;
  const patchedMarkdown = input.markdown.replace(hrefPattern, (match) => {
    const trailingPunctuation = match.match(/[.,;:!?]+$/)?.[0] ?? '';
    const candidate = trailingPunctuation
      ? match.slice(0, -trailingPunctuation.length)
      : match;
    const canonical = canonicalizePaperclipIssueLink(candidate);
    candidates.push(candidate);
    return `${canonical ?? candidate}${trailingPunctuation}`;
  });
  const rows = [...new Set(candidates)]
    .map((original, index) => {
      const normalized = canonicalizePaperclipIssueLink(original) ?? original;
      return {
        id: `release-gate-autofix-${index}-${original}`,
        original,
        normalized,
        changed: normalized !== original,
      };
    })
    .sort((left, right) => left.original.localeCompare(right.original));
  const changedCount = rows.filter((row) => row.changed).length;
  const invalidCount = rows.filter((row) => !canonicalizePaperclipIssueLink(row.original)).length;
  return {
    contract: 'settlement-release-gate-canonical-autofix-preview.v1',
    rows,
    patchedMarkdown,
    changedCount,
    invalidCount,
    copyText: patchedMarkdown,
  };
}

function normalizeDiagnosticsTrendGate(input: unknown): DiagnosticsTrendDigestGate {
  if (typeof input !== 'string') {
    return 'pass';
  }
  const normalized = input.trim().toLowerCase();
  if (normalized === 'block' || normalized === 'blocked') {
    return 'block';
  }
  if (normalized === 'warn' || normalized === 'warning') {
    return 'warn';
  }
  return 'pass';
}

function normalizeDiagnosticsTrendReasonCode(input: unknown): DiagnosticsTrendDigestReasonCode | null {
  if (typeof input !== 'string') {
    return null;
  }
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (normalized === 'spike_in_breaking_changes') {
    return 'spike_in_breaking_changes';
  }
  if (normalized === 'new_drift_code') {
    return 'new_drift_code';
  }
  if (normalized === 'checksum_instability') {
    return 'checksum_instability';
  }
  if (normalized === 'severity_escalation') {
    return 'severity_escalation';
  }
  if (normalized === 'missing_snapshot_window') {
    return 'missing_snapshot_window';
  }
  return null;
}

function normalizeDiagnosticsTrendReasonChips(input: unknown): DiagnosticsTrendDigestReasonChip[] {
  const rawValues = Array.isArray(input)
    ? input
    : (typeof input === 'string' ? input.split(',') : []);
  const normalized = rawValues
    .map((value) => normalizeDiagnosticsTrendReasonCode(value))
    .filter((code): code is DiagnosticsTrendDigestReasonCode => Boolean(code));
  const unique = Array.from(new Set(normalized));
  unique.sort(
    (left, right) => DIAGNOSTICS_TREND_REASON_CODE_ORDER.indexOf(left) - DIAGNOSTICS_TREND_REASON_CODE_ORDER.indexOf(right),
  );
  return unique.map((code) => ({
    code,
    label: DIAGNOSTICS_TREND_REASON_LABEL[code],
  }));
}

function normalizeDiagnosticsTrendMaxSeverity(input: unknown): DiagnosticsTrendDigestMaxSeverity {
  if (typeof input !== 'string') {
    return 'low';
  }
  const normalized = input.trim().toLowerCase();
  if (normalized === 'critical' || normalized === 'high' || normalized === 'medium' || normalized === 'low') {
    return normalized;
  }
  return 'low';
}

function normalizeNonNegativeInteger(input: unknown): number {
  const parsed = parseFiniteNumber(input);
  if (parsed === null) {
    return 0;
  }
  return Math.max(0, Math.trunc(parsed));
}

function normalizeBoundedRiskScore(input: unknown): number {
  const parsed = parseFiniteNumber(input);
  if (parsed === null) {
    return 0;
  }
  const rounded = Math.round(parsed * 100) / 100;
  return Math.max(0, Math.min(100, rounded));
}

function resolveIssueIdentifierFromCanonicalLink(input: string): string | null {
  const canonical = canonicalizePaperclipIssueLink(input);
  if (!canonical) {
    return null;
  }
  const match = canonical.match(/^\/[A-Za-z0-9_-]+\/issues\/([A-Za-z0-9]+-\d+)(?:#.+)?$/);
  if (!match) {
    return null;
  }
  return match[1].toUpperCase();
}

function normalizeDiagnosticsTrendDependencyLink(
  input: unknown,
  fallbackIssueIdentifier: string,
  index: number,
): DiagnosticsTrendDigestDependencyLink | null {
  const raw = input && typeof input === 'object'
    ? input as Record<string, unknown>
    : {};
  const issueIdentifierFromField = normalizeOptional(
    typeof raw.issueIdentifier === 'string'
      ? raw.issueIdentifier
      : '',
  )?.toUpperCase();
  const issueLinkRaw = normalizeOptional(
    typeof raw.issueLink === 'string'
      ? raw.issueLink
      : typeof input === 'string'
        ? input
        : '',
  );
  const issueIdentifierFromLink = issueLinkRaw ? resolveIssueIdentifierFromCanonicalLink(issueLinkRaw) : null;
  const issueIdentifier = issueIdentifierFromField ?? issueIdentifierFromLink ?? fallbackIssueIdentifier;
  const issueLink = canonicalizePaperclipIssueLink(issueLinkRaw ?? `/${issueIdentifier.split('-')[0]}/issues/${issueIdentifier}`);
  if (!issueLink) {
    return null;
  }

  const documentLinkRaw = normalizeOptional(typeof raw.documentLink === 'string' ? raw.documentLink : '');
  const commentLinkRaw = normalizeOptional(typeof raw.commentLink === 'string' ? raw.commentLink : '');
  const documentLink = documentLinkRaw ? canonicalizePaperclipIssueLink(documentLinkRaw) : null;
  const commentLink = commentLinkRaw ? canonicalizePaperclipIssueLink(commentLinkRaw) : null;
  const linksValid = Boolean(issueLink && (!documentLinkRaw || documentLink) && (!commentLinkRaw || commentLink));

  return {
    id: `${issueIdentifier}|${index}`,
    issueIdentifier,
    issueLink,
    documentLink: documentLink ?? undefined,
    commentLink: commentLink ?? undefined,
    linksValid,
  };
}

function parseDiagnosticsTrendDigestRow(raw: unknown, index: number): DiagnosticsTrendDigestRow | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const sourceIssueIdentifier = normalizeOptional(
    typeof row.sourceIssueIdentifier === 'string'
      ? row.sourceIssueIdentifier
      : typeof row.issueIdentifier === 'string'
        ? row.issueIdentifier
        : '',
  )?.toUpperCase();
  if (!sourceIssueIdentifier) {
    return null;
  }
  const summary = row.summary && typeof row.summary === 'object'
    ? row.summary as Record<string, unknown>
    : {};
  const snapshotSha256 = normalizeOptional(
    typeof row.snapshotSha256 === 'string'
      ? row.snapshotSha256
      : typeof row.snapshotFingerprint === 'string'
        ? row.snapshotFingerprint
        : '',
  )?.toLowerCase() ?? '0000000000000000000000000000000000000000000000000000000000000000';
  const generatedAt = resolveDateString(
    row.generatedAt ?? row.snapshotGeneratedAt ?? summary.generatedAt,
    DIFF_FALLBACK_TIMESTAMP,
  );
  const id = normalizeOptional(
    typeof row.id === 'string'
      ? row.id
      : `${sourceIssueIdentifier}:${snapshotSha256}:${generatedAt}`,
  ) ?? `${sourceIssueIdentifier}:${snapshotSha256}:${generatedAt}`;

  const reasonChips = normalizeDiagnosticsTrendReasonChips(
    row.rationaleReasons ?? row.reasonCodes ?? summary.rationaleReasons ?? summary.reasonCodes,
  );
  const rawDependencyLinks = Array.isArray(row.dependencyLinks)
    ? row.dependencyLinks
    : Array.isArray(row.canonicalDependencyLinks)
      ? row.canonicalDependencyLinks
      : Array.isArray(summary.dependencyLinks)
        ? summary.dependencyLinks
        : [];
  const dependencyLinks = rawDependencyLinks
    .map((value, dependencyIndex) => normalizeDiagnosticsTrendDependencyLink(
      value,
      sourceIssueIdentifier,
      dependencyIndex,
    ))
    .filter((value): value is DiagnosticsTrendDigestDependencyLink => Boolean(value))
    .sort((left, right) => (
      left.issueIdentifier.localeCompare(right.issueIdentifier)
      || left.issueLink.localeCompare(right.issueLink)
      || left.id.localeCompare(right.id)
    ));

  return {
    id,
    sourceIssueIdentifier,
    snapshotSha256,
    generatedAt,
    recommendedGate: normalizeDiagnosticsTrendGate(row.recommendedGate ?? row.gate ?? summary.recommendedGate),
    reasonChips,
    windowSize: normalizeNonNegativeInteger(row.windowSize ?? summary.windowSize),
    stableSnapshotCount: normalizeNonNegativeInteger(row.stableSnapshotCount ?? summary.stableSnapshotCount),
    driftSpikeCount: normalizeNonNegativeInteger(row.driftSpikeCount ?? summary.driftSpikeCount),
    maxSeverity: normalizeDiagnosticsTrendMaxSeverity(row.maxSeverity ?? summary.maxSeverity),
    regressionRiskScore: normalizeBoundedRiskScore(row.regressionRiskScore ?? summary.regressionRiskScore),
    dependencyLinks,
  };
}

export function buildDiagnosticsTrendDigestExplorer(input: {
  rows: unknown[];
  activeRowId: string;
}): DiagnosticsTrendDigestExplorer {
  const rows = input.rows
    .map((row, index) => parseDiagnosticsTrendDigestRow(row, index))
    .filter((row): row is DiagnosticsTrendDigestRow => Boolean(row))
    .sort((left, right) => (
      left.sourceIssueIdentifier.localeCompare(right.sourceIssueIdentifier)
      || left.snapshotSha256.localeCompare(right.snapshotSha256)
      || left.generatedAt.localeCompare(right.generatedAt)
      || left.id.localeCompare(right.id)
    ));
  const rowIdSet = new Set(rows.map((row) => row.id));
  const activeRowId = rowIdSet.has(input.activeRowId)
    ? input.activeRowId
    : (rows[0]?.id ?? '');
  const activeRow = rows.find((row) => row.id === activeRowId);

  const summaryCards = activeRow
    ? {
      windowSize: activeRow.windowSize,
      stableSnapshotCount: activeRow.stableSnapshotCount,
      driftSpikeCount: activeRow.driftSpikeCount,
      maxSeverity: activeRow.maxSeverity,
      regressionRiskScore: activeRow.regressionRiskScore,
    }
    : {
      windowSize: 0,
      stableSnapshotCount: 0,
      driftSpikeCount: 0,
      maxSeverity: DIAGNOSTICS_TREND_MAX_SEVERITY_ORDER[DIAGNOSTICS_TREND_MAX_SEVERITY_ORDER.length - 1],
      regressionRiskScore: 0,
    };

  return {
    contract: 'settlement-diagnostics-trend-digest-explorer.v1',
    rows,
    activeRowId,
    summaryCards,
    rationalePanel: {
      recommendedGate: activeRow?.recommendedGate ?? 'pass',
      reasonChips: activeRow ? [...activeRow.reasonChips] : [],
    },
    canonicalDependencyLinks: activeRow ? [...activeRow.dependencyLinks] : [],
  };
}

function parseDiagnosticsCompareNumber(input: unknown, fallback = 0): number {
  const parsed = parseFiniteNumber(input);
  if (parsed === null) {
    return fallback;
  }
  return Math.max(0, Math.trunc(parsed));
}

function normalizeDiagnosticsCompareValue(input: unknown): string {
  if (typeof input === 'string') {
    return input.trim();
  }
  if (typeof input === 'number' && Number.isFinite(input)) {
    return String(input);
  }
  if (typeof input === 'boolean') {
    return input ? 'true' : 'false';
  }
  if (input === null || input === undefined) {
    return '';
  }
  return String(input);
}

function normalizeDeltaBundleStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return Array.from(
    new Set(
      input
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value) => Boolean(value)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function normalizeDeltaBundleRequiredFieldCoverage(input: unknown): number {
  const parsed = parseFiniteNumber(input);
  if (parsed === null) {
    return 0;
  }
  const bounded = Math.max(0, Math.min(100, parsed));
  return Math.round(bounded * 100) / 100;
}

function parseDeltaBundleContractSafetyRow(raw: unknown, index: number): DeltaBundleContractSafetyRow | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const issueIdentifier = normalizeOptional(
    typeof row.issueIdentifier === 'string'
      ? row.issueIdentifier
      : typeof row.sourceIssueIdentifier === 'string'
        ? row.sourceIssueIdentifier
        : '',
  )?.toUpperCase();
  if (!issueIdentifier) {
    return null;
  }
  const bundleCode = normalizeOptional(
    typeof row.bundleCode === 'string'
      ? row.bundleCode
      : typeof row.bundle === 'string'
        ? row.bundle
        : '',
  ) ?? 'core';
  const fieldPath = normalizeOptional(
    typeof row.fieldPath === 'string'
      ? row.fieldPath
      : '',
  ) ?? `deltaBundle.entries[${index}]`;
  const deltaSeverityWeight = parseDiagnosticsCompareNumber(
    row.deltaSeverityWeight ?? row.sectionWeight ?? row.severityWeight,
    99,
  );
  const scoreBandShiftWeight = parseDiagnosticsCompareNumber(
    row.scoreBandShiftWeight ?? row.fieldTypeWeight ?? row.bandShiftWeight ?? row.scoreBandShift,
    99,
  );
  const baselineValue = normalizeDiagnosticsCompareValue(row.baselineValue ?? row.previousValue ?? row.baseline);
  const candidateValue = normalizeDiagnosticsCompareValue(row.candidateValue ?? row.currentValue ?? row.value);

  const validationRaw = row.contractValidation && typeof row.contractValidation === 'object'
    ? row.contractValidation as Record<string, unknown>
    : {};
  const requiredFieldCoverage = normalizeDeltaBundleRequiredFieldCoverage(
    validationRaw.requiredFieldCoverage ?? row.requiredFieldCoverage,
  );
  const missingFieldPaths = normalizeDeltaBundleStringArray(
    validationRaw.missingFieldPaths ?? row.missingFieldPaths,
  );
  const enumDriftCodes = normalizeDeltaBundleStringArray(
    validationRaw.enumDriftCodes ?? row.enumDriftCodes,
  ).map((code) => code.toUpperCase());
  const isContractSafe = typeof validationRaw.isContractSafe === 'boolean'
    ? validationRaw.isContractSafe
    : (missingFieldPaths.length === 0 && enumDriftCodes.length === 0 && requiredFieldCoverage >= 100);
  const id = normalizeOptional(
    typeof row.id === 'string'
      ? row.id
      : `${issueIdentifier}|${bundleCode}|${fieldPath}`,
  ) ?? `${issueIdentifier}|${bundleCode}|${fieldPath}`;

  return {
    id,
    deltaSeverityWeight,
    scoreBandShiftWeight,
    issueIdentifier,
    bundleCode,
    fieldPath,
    baselineValue,
    candidateValue,
    changed: baselineValue !== candidateValue,
    contractValidation: {
      requiredFieldCoverage,
      missingFieldPaths,
      enumDriftCodes,
      isContractSafe,
    },
  };
}

function buildDeltaBundleValidatorDrillPanel(input: {
  rows: DeltaBundleContractSafetyRow[];
  activeEntryId: string;
}): DeltaBundleValidatorDrillPanel {
  const issueIds = input.rows
    .filter((row) => !row.contractValidation.isContractSafe)
    .map((row) => row.id);
  const resolvedIssueIds = issueIds.length ? issueIds : input.rows.map((row) => row.id);
  const unsafeIssueCount = input.rows.filter((row) => !row.contractValidation.isContractSafe).length;
  const safeIssueCount = input.rows.length - unsafeIssueCount;
  const averageRequiredFieldCoverage = input.rows.length
    ? Math.round(
      (input.rows.reduce((total, row) => total + row.contractValidation.requiredFieldCoverage, 0) / input.rows.length)
        * 100,
    ) / 100
    : 0;

  return {
    activeIssueId: resolvedIssueIds.includes(input.activeEntryId)
      ? input.activeEntryId
      : (resolvedIssueIds[0] ?? ''),
    issueIds: resolvedIssueIds,
    unsafeIssueCount,
    safeIssueCount,
    averageRequiredFieldCoverage,
  };
}

type DiagnosticsCompareDigestEntry = {
  issueIdentifier: string;
  bundleCode: string;
  fieldPath: string;
  value: string;
  sectionWeight: number;
  fieldTypeWeight: number;
  driftReasonCode: DiagnosticsCanonicalReasonCode;
};

function normalizeDiagnosticsCanonicalReasonCode(input: unknown): DiagnosticsCanonicalReasonCode | null {
  if (typeof input !== 'string') {
    return null;
  }
  const normalized = input.trim().toLowerCase().replace(/-/g, '_');
  if ((DIAGNOSTICS_CANONICAL_REASON_CODE_ORDER as string[]).includes(normalized)) {
    return normalized as DiagnosticsCanonicalReasonCode;
  }
  return null;
}

function inferDiagnosticsReasonCodeFromFieldPath(fieldPath: string): DiagnosticsCanonicalReasonCode {
  const normalized = fieldPath.toLowerCase();
  if (normalized.includes('required')) {
    return 'missing_required_field';
  }
  if (normalized.includes('enum')) {
    return 'enum_drift';
  }
  if (normalized.includes('type')) {
    return 'type_mismatch';
  }
  if (normalized.includes('order')) {
    return 'ordering_regression';
  }
  return 'checksum_mismatch';
}

function parseDiagnosticsCompareDigestEntry(raw: unknown): DiagnosticsCompareDigestEntry[] {
  if (!raw || typeof raw !== 'object') {
    return [];
  }
  const row = raw as Record<string, unknown>;
  const issueIdentifier = normalizeOptional(
    typeof row.issueIdentifier === 'string'
      ? row.issueIdentifier
      : typeof row.sourceIssueIdentifier === 'string'
        ? row.sourceIssueIdentifier
        : '',
  )?.toUpperCase();
  if (!issueIdentifier) {
    return [];
  }
  const bundleCode = normalizeOptional(
    typeof row.bundleCode === 'string'
      ? row.bundleCode
      : typeof row.bundle === 'string'
        ? row.bundle
        : 'core',
  ) ?? 'core';
  const sectionWeight = parseDiagnosticsCompareNumber(
    row.sectionWeight ?? row.deltaSeverityWeight ?? row.severityWeight ?? row.severity ?? row.priority,
    99,
  );
  const fieldTypeWeight = parseDiagnosticsCompareNumber(
    row.fieldTypeWeight ?? row.scoreBandShiftWeight ?? row.bandShiftWeight ?? row.scoreBandShift ?? row.scoreBandDelta,
    99,
  );
  const driftReasonCode = normalizeDiagnosticsCanonicalReasonCode(
    row.driftReasonCode
    ?? row.reasonCode
    ?? row.driftCode,
  );

  const directFieldPath = normalizeOptional(
    typeof row.fieldPath === 'string'
      ? row.fieldPath
      : '',
  );
  const directValue = normalizeDiagnosticsCompareValue(
    row.value ?? row.metricValue ?? row.regressionRiskScore ?? row.recommendedGate ?? row.maxSeverity,
  );
  if (directFieldPath) {
    return [{
      issueIdentifier,
      bundleCode,
      fieldPath: directFieldPath,
      value: directValue,
      sectionWeight,
      fieldTypeWeight,
      driftReasonCode: driftReasonCode ?? inferDiagnosticsReasonCodeFromFieldPath(directFieldPath),
    }];
  }

  const entries: DiagnosticsCompareDigestEntry[] = [];
  if (row.regressionRiskScore !== undefined) {
    entries.push({
      issueIdentifier,
      bundleCode,
      fieldPath: 'regressionRiskScore',
      value: normalizeDiagnosticsCompareValue(row.regressionRiskScore),
      sectionWeight,
      fieldTypeWeight,
      driftReasonCode: driftReasonCode ?? inferDiagnosticsReasonCodeFromFieldPath('regressionRiskScore'),
    });
  }
  if (row.recommendedGate !== undefined) {
    entries.push({
      issueIdentifier,
      bundleCode,
      fieldPath: 'recommendedGate',
      value: normalizeDiagnosticsCompareValue(row.recommendedGate),
      sectionWeight,
      fieldTypeWeight,
      driftReasonCode: driftReasonCode ?? inferDiagnosticsReasonCodeFromFieldPath('recommendedGate'),
    });
  }
  if (row.maxSeverity !== undefined) {
    entries.push({
      issueIdentifier,
      bundleCode,
      fieldPath: 'maxSeverity',
      value: normalizeDiagnosticsCompareValue(row.maxSeverity),
      sectionWeight,
      fieldTypeWeight,
      driftReasonCode: driftReasonCode ?? inferDiagnosticsReasonCodeFromFieldPath('maxSeverity'),
    });
  }
  return entries;
}

export function buildDiagnosticsBaselineCompareWorkspace(input: {
  baselineDigest: unknown[];
  candidateDigest: unknown[];
  activeDeltaId: string;
}): DiagnosticsBaselineCompareWorkspace {
  const baselineByKey = new Map<string, DiagnosticsCompareDigestEntry>();
  for (const entry of input.baselineDigest.flatMap((row) => parseDiagnosticsCompareDigestEntry(row))) {
    baselineByKey.set(`${entry.issueIdentifier}|${entry.bundleCode}|${entry.fieldPath}`, entry);
  }
  const candidateByKey = new Map<string, DiagnosticsCompareDigestEntry>();
  for (const entry of input.candidateDigest.flatMap((row) => parseDiagnosticsCompareDigestEntry(row))) {
    candidateByKey.set(`${entry.issueIdentifier}|${entry.bundleCode}|${entry.fieldPath}`, entry);
  }

  const keySet = new Set<string>([
    ...baselineByKey.keys(),
    ...candidateByKey.keys(),
  ]);
  const rows = [...keySet]
    .map((key): DiagnosticsBaselineCompareRow => {
      const baseline = baselineByKey.get(key);
      const candidate = candidateByKey.get(key);
      const sourceIssueIdentifier = candidate?.issueIdentifier ?? baseline?.issueIdentifier ?? 'UNKNOWN-0';
      const bundleCode = candidate?.bundleCode ?? baseline?.bundleCode ?? 'core';
      const fieldPath = candidate?.fieldPath ?? baseline?.fieldPath ?? 'unknown';
      const baselineValue = baseline?.value ?? '';
      const candidateValue = candidate?.value ?? '';
      const sectionWeight = Math.min(
        baseline?.sectionWeight ?? Number.MAX_SAFE_INTEGER,
        candidate?.sectionWeight ?? Number.MAX_SAFE_INTEGER,
      );
      const fieldTypeWeight = Math.min(
        baseline?.fieldTypeWeight ?? Number.MAX_SAFE_INTEGER,
        candidate?.fieldTypeWeight ?? Number.MAX_SAFE_INTEGER,
      );
      const driftReasonCode = candidate?.driftReasonCode
        ?? baseline?.driftReasonCode
        ?? inferDiagnosticsReasonCodeFromFieldPath(fieldPath);
      return {
        id: `${sourceIssueIdentifier}|${bundleCode}|${fieldPath}`,
        sectionWeight,
        fieldTypeWeight,
        sourceIssueIdentifier,
        driftReasonCode,
        deltaSeverityWeight: sectionWeight,
        scoreBandShiftWeight: fieldTypeWeight,
        issueIdentifier: sourceIssueIdentifier,
        bundleCode,
        fieldPath,
        baselineValue,
        candidateValue,
        changed: baselineValue !== candidateValue,
      };
    })
    .sort((left, right) => (
      left.sectionWeight - right.sectionWeight
      || left.fieldPath.localeCompare(right.fieldPath)
      || left.fieldTypeWeight - right.fieldTypeWeight
      || left.sourceIssueIdentifier.localeCompare(right.sourceIssueIdentifier)
      || left.bundleCode.localeCompare(right.bundleCode)
      || left.id.localeCompare(right.id)
    ));

  const rowIdSet = new Set(rows.map((row) => row.id));
  const activeDeltaId = rowIdSet.has(input.activeDeltaId)
    ? input.activeDeltaId
    : (rows[0]?.id ?? '');
  return {
    contract: 'settlement-diagnostics-baseline-compare-workspace.v1',
    rows,
    activeDeltaId,
  };
}

export function moveDiagnosticsBaselineDeltaSelection(input: {
  rows: DiagnosticsBaselineCompareRow[];
  activeDeltaId: string;
  direction: 'next_section' | 'prev_section';
}): string {
  if (!input.rows.length) {
    return '';
  }
  const currentIndex = input.rows.findIndex((row) => row.id === input.activeDeltaId);
  if (currentIndex < 0) {
    return input.rows[0].id;
  }
  if (input.direction === 'next_section') {
    return input.rows[Math.min(currentIndex + 1, input.rows.length - 1)].id;
  }
  return input.rows[Math.max(currentIndex - 1, 0)].id;
}

export function resolveDiagnosticsBaselineCompareShortcut(input: {
  key: string;
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): DiagnosticsBaselineCompareShortcut | null {
  const normalizedKey = input.key.toLowerCase();
  if (input.altKey && !input.shiftKey && normalizedKey === 'e') {
    return 'focus_contract_bundle_explorer';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'n') {
    return 'next_section';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'p') {
    return 'prev_section';
  }
  if (normalizedKey === 'h' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'open_handoff_composer';
  }
  if (normalizedKey === 's' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'validate_handoff_packet';
  }
  return null;
}

export function buildDeltaBundleContractSafetyConsole(input: {
  entries: unknown[];
  activeEntryId: string;
}): DeltaBundleContractSafetyConsole {
  const rows = input.entries
    .map((entry, index) => parseDeltaBundleContractSafetyRow(entry, index))
    .filter((entry): entry is DeltaBundleContractSafetyRow => Boolean(entry))
    .sort((left, right) => (
      left.deltaSeverityWeight - right.deltaSeverityWeight
      || left.scoreBandShiftWeight - right.scoreBandShiftWeight
      || left.issueIdentifier.localeCompare(right.issueIdentifier)
      || left.bundleCode.localeCompare(right.bundleCode)
      || left.fieldPath.localeCompare(right.fieldPath)
      || left.id.localeCompare(right.id)
    ));
  const rowIdSet = new Set(rows.map((row) => row.id));
  const activeEntryId = rowIdSet.has(input.activeEntryId)
    ? input.activeEntryId
    : (rows[0]?.id ?? '');

  return {
    contract: 'settlement-delta-bundle-contract-safety-console.v1',
    rows,
    activeEntryId,
    validatorDrillPanel: buildDeltaBundleValidatorDrillPanel({
      rows,
      activeEntryId,
    }),
  };
}

export function moveDeltaBundleValidationIssueSelection(input: {
  issueIds: string[];
  activeIssueId: string;
  direction: 'next_validation_issue' | 'prev_validation_issue';
}): string {
  if (!input.issueIds.length) {
    return '';
  }
  const currentIndex = input.issueIds.findIndex((issueId) => issueId === input.activeIssueId);
  if (currentIndex < 0) {
    return input.issueIds[0];
  }
  if (input.direction === 'next_validation_issue') {
    return input.issueIds[Math.min(currentIndex + 1, input.issueIds.length - 1)];
  }
  return input.issueIds[Math.max(currentIndex - 1, 0)];
}

export function resolveDeltaBundleContractSafetyShortcut(input: {
  key: string;
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): DeltaBundleContractSafetyShortcut | null {
  const key = input.key.toLowerCase();
  if (input.altKey && !input.shiftKey && key === 'v') {
    return 'focus_validator_drill_panel';
  }
  if (input.altKey && input.shiftKey && key === 'n') {
    return 'next_validation_issue';
  }
  if (input.altKey && input.shiftKey && key === 'p') {
    return 'prev_validation_issue';
  }
  if (key === 'l' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'open_link_quality_panel';
  }
  if (key === 'enter' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'run_deterministic_validation_pass';
  }
  return null;
}

export function buildDeltaBundleLinkQualityPanel(input: {
  linksText: string;
}): DeltaBundleLinkQualityPanel {
  const preview = buildCanonicalLinkAutofixPreview({ linksText: input.linksText });
  const invalidCount = preview.rows.filter((row) => !canonicalizePaperclipIssueLink(row.original)).length;
  return {
    contract: 'settlement-delta-bundle-link-quality-panel.v1',
    rows: preview.rows,
    correctedOutput: preview.correctedOutput,
    changedCount: preview.changedCount,
    invalidCount,
    canSaveScenario: invalidCount === 0,
  };
}

function normalizeRemediationDependencyBlockerClass(input: unknown): RemediationDependencyBlockerClass {
  if (typeof input !== 'string') {
    return 'artifact_missing';
  }
  const normalized = input.trim().toLowerCase().replace(/-/g, '_');
  if ((REMEDIATION_DEPENDENCY_BLOCKER_CLASS_ORDER as string[]).includes(normalized)) {
    return normalized as RemediationDependencyBlockerClass;
  }
  if (normalized === 'credential') {
    return 'credential_blocker';
  }
  if (normalized === 'contract') {
    return 'contract_gap';
  }
  if (normalized === 'artifact') {
    return 'artifact_missing';
  }
  if (normalized === 'qa') {
    return 'qa_gate_pending';
  }
  if (normalized === 'link') {
    return 'link_noncanonical';
  }
  return 'artifact_missing';
}

function parseRemediationManifestDrillboardRow(raw: unknown, index: number): RemediationManifestDrillboardRow | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const issueIdentifier = normalizeOptional(
    typeof row.issueIdentifier === 'string'
      ? row.issueIdentifier.toUpperCase()
      : String(row.issueIdentifier ?? '').toUpperCase(),
  );
  if (!issueIdentifier) {
    return null;
  }
  const runbookStepCode = normalizeOptional(
    typeof row.runbookStepCode === 'string'
      ? row.runbookStepCode.toUpperCase()
      : String(row.runbookStepCode ?? '').toUpperCase(),
  ) ?? `STEP-${String(index + 1).padStart(2, '0')}`;
  const artifactPath = normalizeOptional(
    typeof row.artifactPath === 'string'
      ? row.artifactPath
      : String(row.artifactPath ?? ''),
  ) ?? `artifacts/${issueIdentifier.toLowerCase()}/remediation-pack.md`;
  const priorityWeight = Math.max(0, Math.trunc(parseFiniteNumber(row.priorityWeight) ?? Number.MAX_SAFE_INTEGER));
  const dependencyDepth = Math.max(0, Math.trunc(parseFiniteNumber(row.dependencyDepth) ?? 0));
  const blockerClass = normalizeRemediationDependencyBlockerClass(row.blockerClass);
  const createdAt = normalizeOptional(
    typeof row.createdAt === 'string'
      ? row.createdAt
      : String(row.createdAt ?? ''),
  ) ?? '1970-01-01T00:00:00.000Z';
  const summary = normalizeOptional(
    typeof row.summary === 'string'
      ? row.summary
      : String(row.summary ?? ''),
  ) ?? `${issueIdentifier} requires deterministic remediation handoff evidence.`;
  const id = normalizeOptional(
    typeof row.id === 'string'
      ? row.id
      : `${issueIdentifier}|${runbookStepCode}|${artifactPath}`,
  ) ?? `${issueIdentifier}|${runbookStepCode}|${artifactPath}`;
  return {
    id,
    issueIdentifier,
    runbookStepCode,
    artifactPath,
    priorityWeight,
    dependencyDepth,
    blockerClass,
    createdAt,
    summary,
  };
}

export function buildRemediationManifestDrillboard(input: {
  rows: unknown[];
  activeRowId: string;
}): RemediationManifestDrillboard {
  const rows = input.rows
    .map((row, index) => parseRemediationManifestDrillboardRow(row, index))
    .filter((row): row is RemediationManifestDrillboardRow => Boolean(row))
    .sort((left, right) => (
      left.priorityWeight - right.priorityWeight
      || left.dependencyDepth - right.dependencyDepth
      || left.issueIdentifier.localeCompare(right.issueIdentifier)
      || left.runbookStepCode.localeCompare(right.runbookStepCode)
      || left.artifactPath.localeCompare(right.artifactPath)
      || left.id.localeCompare(right.id)
    ));
  const idSet = new Set(rows.map((row) => row.id));
  const activeRowId = idSet.has(input.activeRowId)
    ? input.activeRowId
    : (rows[0]?.id ?? '');
  return {
    contract: 'settlement-remediation-manifest-drillboard.v1',
    rows,
    activeRowId,
  };
}

export function moveRemediationManifestRowSelection(input: {
  rows: RemediationManifestDrillboardRow[];
  activeRowId: string;
  direction: 'next' | 'prev';
}): string {
  if (!input.rows.length) {
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

export function resolveRemediationManifestShortcut(input: {
  key: string;
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): RemediationManifestShortcut | null {
  const normalizedKey = input.key.toLowerCase();
  if (input.altKey && !input.shiftKey && normalizedKey === 'm') {
    return 'focus_manifest_table';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'j') {
    return 'next_row';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'k') {
    return 'prev_row';
  }
  if (normalizedKey === 'g' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'open_dependency_graph';
  }
  if (normalizedKey === 'e' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'export_handoff_packet';
  }
  return null;
}

export function buildRemediationDependencyGraphInspector(input: {
  rows: unknown[];
  activeNodeId: string;
}): RemediationDependencyGraphInspector {
  const classRank = new Map(REMEDIATION_DEPENDENCY_BLOCKER_CLASS_ORDER.map((value, index) => [value, index]));
  const nodes = input.rows
    .map((row, index) => parseRemediationManifestDrillboardRow(row, index))
    .filter((row): row is RemediationManifestDrillboardRow => Boolean(row))
    .map((row) => ({
      id: row.id,
      issueIdentifier: row.issueIdentifier,
      blockerClass: row.blockerClass,
      classWeight: classRank.get(row.blockerClass) ?? Number.MAX_SAFE_INTEGER,
      createdAt: row.createdAt,
      summary: row.summary,
    }))
    .sort((left, right) => (
      left.classWeight - right.classWeight
      || left.issueIdentifier.localeCompare(right.issueIdentifier)
      || left.createdAt.localeCompare(right.createdAt)
      || left.id.localeCompare(right.id)
    ));
  const classCounts: Record<RemediationDependencyBlockerClass, number> = {
    credential_blocker: 0,
    contract_gap: 0,
    artifact_missing: 0,
    qa_gate_pending: 0,
    link_noncanonical: 0,
  };
  for (const node of nodes) {
    classCounts[node.blockerClass] += 1;
  }
  const idSet = new Set(nodes.map((node) => node.id));
  const activeNodeId = idSet.has(input.activeNodeId)
    ? input.activeNodeId
    : (nodes[0]?.id ?? '');
  return {
    contract: 'settlement-remediation-dependency-graph-inspector.v1',
    nodes,
    activeNodeId,
    classCounts,
  };
}

export function buildRemediationManifestHandoffPacket(input: {
  drillboardRows: RemediationManifestDrillboardRow[];
  dependencyLinksText: string;
}): string {
  const canonicalLinks = normalizeMultilineEntries(input.dependencyLinksText)
    .map((link) => canonicalizePaperclipIssueLink(link) ?? link)
    .sort((left, right) => left.localeCompare(right));
  const lines = [
    '## Remediation Manifest Handoff Packet',
    '',
    '### Manifest Rows',
    ...(input.drillboardRows.length
      ? input.drillboardRows.map((row) => (
        `- ${row.issueIdentifier} | ${row.runbookStepCode} | ${row.artifactPath} | priority=${row.priorityWeight} | depth=${row.dependencyDepth} | class=${row.blockerClass}`
      ))
      : ['- (none)']),
    '',
    '### Canonical Dependency Links',
    ...(canonicalLinks.length ? canonicalLinks.map((link) => `- ${link}`) : ['- (none)']),
  ];
  return lines.join('\n');
}

function normalizeRegressionGateOverrideReasonCode(input: unknown): RegressionGateOverrideReasonCode | null {
  if (typeof input !== 'string') {
    return null;
  }
  const normalized = input.trim().toLowerCase().replace(/-/g, '_');
  if ((REGRESSION_GATE_OVERRIDE_REASON_CODE_ORDER as string[]).includes(normalized)) {
    return normalized as RegressionGateOverrideReasonCode;
  }
  if (normalized === 'noncanonical_link') {
    return 'link_noncanonical';
  }
  return null;
}

function resolveRegressionGateOverrideOutcome(input: {
  overrideGate: DiagnosticsTrendDigestGate;
  reasonCodes: RegressionGateOverrideReasonCode[];
}): RegressionGateOverrideOutcome {
  if (input.reasonCodes.includes('missing_evidence')
    || input.reasonCodes.includes('dependency_open')
    || input.reasonCodes.includes('artifact_gap')) {
    return 'block';
  }
  if (input.reasonCodes.includes('eta_drift') || input.reasonCodes.includes('link_noncanonical')) {
    return input.overrideGate === 'pass' ? 'warn' : input.overrideGate;
  }
  return input.overrideGate;
}

function parseRegressionGateOverrideScenario(raw: unknown, index: number): RegressionGateOverrideScenario | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const issueIdentifier = normalizeOptional(
    typeof row.issueIdentifier === 'string'
      ? row.issueIdentifier
      : typeof row.sourceIssueIdentifier === 'string'
        ? row.sourceIssueIdentifier
        : '',
  )?.toUpperCase();
  if (!issueIdentifier) {
    return null;
  }
  const currentGate = normalizeDiagnosticsTrendGate(row.currentGate ?? row.recommendedGate ?? 'pass');
  const overrideGate = normalizeDiagnosticsTrendGate(row.overrideGate ?? currentGate);
  const reasonCodes = (Array.isArray(row.reasonCodes) ? row.reasonCodes : [])
    .map((reason) => normalizeRegressionGateOverrideReasonCode(reason))
    .filter((reason): reason is RegressionGateOverrideReasonCode => Boolean(reason))
    .sort((left, right) => (
      REGRESSION_GATE_OVERRIDE_REASON_CODE_ORDER.indexOf(left)
      - REGRESSION_GATE_OVERRIDE_REASON_CODE_ORDER.indexOf(right)
    ));
  const id = normalizeOptional(
    typeof row.id === 'string'
      ? row.id
      : `${issueIdentifier}|${String(index + 1).padStart(3, '0')}`,
  ) ?? `${issueIdentifier}|${String(index + 1).padStart(3, '0')}`;
  return {
    id,
    issueIdentifier,
    currentGate,
    overrideGate,
    reasonCodes,
    whatIfOutcome: resolveRegressionGateOverrideOutcome({ overrideGate, reasonCodes }),
  };
}

export function buildRegressionGateOverrideSimulator(input: {
  rows: unknown[];
  activeScenarioId: string;
}): RegressionGateOverrideSimulator {
  const outcomeRank: Record<RegressionGateOverrideOutcome, number> = {
    pass: 1,
    warn: 2,
    block: 3,
  };
  const reasonCodeCounts: Record<RegressionGateOverrideReasonCode, number> = {
    missing_evidence: 0,
    eta_drift: 0,
    dependency_open: 0,
    link_noncanonical: 0,
    artifact_gap: 0,
  };
  const scenarios = input.rows
    .map((row, index) => parseRegressionGateOverrideScenario(row, index))
    .filter((row): row is RegressionGateOverrideScenario => Boolean(row))
    .sort((left, right) => (
      outcomeRank[right.whatIfOutcome] - outcomeRank[left.whatIfOutcome]
      || left.issueIdentifier.localeCompare(right.issueIdentifier)
      || left.id.localeCompare(right.id)
    ));
  for (const scenario of scenarios) {
    for (const reasonCode of scenario.reasonCodes) {
      reasonCodeCounts[reasonCode] += 1;
    }
  }
  const idSet = new Set(scenarios.map((scenario) => scenario.id));
  const activeScenarioId = idSet.has(input.activeScenarioId)
    ? input.activeScenarioId
    : (scenarios[0]?.id ?? '');
  return {
    contract: 'settlement-regression-gate-override-simulator.v1',
    scenarios,
    activeScenarioId,
    reasonCodeCounts,
  };
}

export function buildDiagnosticsDriftSummaryChips(rows: DiagnosticsBaselineCompareRow[]): DiagnosticsDriftSummaryChip[] {
  const counts = new Map<DiagnosticsCanonicalReasonCode, number>();
  for (const row of rows) {
    counts.set(row.driftReasonCode, (counts.get(row.driftReasonCode) ?? 0) + 1);
  }
  return DIAGNOSTICS_CANONICAL_REASON_CODE_ORDER
    .map((code) => ({
      code,
      label: DIAGNOSTICS_CANONICAL_REASON_LABEL[code],
      count: counts.get(code) ?? 0,
    }))
    .filter((chip) => chip.count > 0);
}

export function buildChecklistAutofixHints(): ChecklistAutofixHint[] {
  return EVIDENCE_TIMELINE_GAP_CODE_ORDER.map((code) => ({
    code,
    action: EVIDENCE_TIMELINE_AUTOFIX_HINTS[code],
  }));
}

export function buildEvidenceTimelineHeatmap(input: {
  rows: unknown[];
  activeLane?: ReviewQueueLedgerFilterKey;
  activeRowId: string;
}): EvidenceTimelineHeatmap {
  const activeLane = input.activeLane ?? 'all';
  const laneCounts: Record<ReviewQueuePriority, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  const allRows = input.rows
    .map((row) => parseEvidenceTimelineHeatmapRow(row))
    .filter((row): row is EvidenceTimelineHeatmapRow => Boolean(row))
    .sort((left, right) => (
      REVIEW_QUEUE_PRIORITY_ORDER.indexOf(left.lanePriority) - REVIEW_QUEUE_PRIORITY_ORDER.indexOf(right.lanePriority)
      || left.missingFieldPriority - right.missingFieldPriority
      || left.issueIdentifier.localeCompare(right.issueIdentifier)
      || left.updatedAt.localeCompare(right.updatedAt)
      || left.id.localeCompare(right.id)
    ));
  for (const row of allRows) {
    laneCounts[row.lanePriority] += 1;
  }
  const filteredRows = activeLane === 'all'
    ? allRows
    : allRows.filter((row) => row.lanePriority === activeLane);
  const rowIdSet = new Set(filteredRows.map((row) => row.id));
  const activeRowId = rowIdSet.has(input.activeRowId)
    ? input.activeRowId
    : (filteredRows[0]?.id ?? '');
  return {
    contract: 'settlement-evidence-timeline-heatmap.v1',
    rows: filteredRows,
    laneCounts,
    activeLane,
    activeRowId,
  };
}

export function moveEvidenceTimelineHeatmapSelection(input: {
  rows: EvidenceTimelineHeatmapRow[];
  activeRowId: string;
  direction: 'next_gap_row' | 'prev_gap_row';
}): string {
  if (input.rows.length === 0) {
    return '';
  }
  const currentIndex = input.rows.findIndex((row) => row.id === input.activeRowId);
  if (currentIndex < 0) {
    return input.rows[0].id;
  }
  if (input.direction === 'next_gap_row') {
    return input.rows[Math.min(currentIndex + 1, input.rows.length - 1)].id;
  }
  return input.rows[Math.max(currentIndex - 1, 0)].id;
}

export function resolveEvidenceTimelineHeatmapShortcut(input: {
  key: string;
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): EvidenceTimelineHeatmapShortcut | null {
  const normalizedKey = input.key.toLowerCase();
  if (input.altKey && normalizedKey === 'h') {
    return 'focus_heatmap';
  }
  if (input.altKey && normalizedKey === 'arrowdown') {
    return 'next_gap_row';
  }
  if (input.altKey && normalizedKey === 'arrowup') {
    return 'prev_gap_row';
  }
  if (input.key === 'Enter' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'validate_checklist';
  }
  return null;
}

function parseEvidencePacketLintFinding(raw: unknown): EvidencePacketLintConsoleFinding | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const finding = raw as Record<string, unknown>;
  const severityRaw = normalizeOptional(
    typeof finding.severity === 'string'
      ? finding.severity
      : String(finding.severity ?? ''),
  );
  const severity: EvidencePacketLintSeverity = severityRaw === 'warning' ? 'warning' : 'error';
  const severityPriorityRaw = parseFiniteNumber(finding.severityPriority);
  const severityPriority = severityPriorityRaw !== null
    ? Math.max(1, Math.trunc(severityPriorityRaw))
    : EVIDENCE_PACKET_LINT_SEVERITY_PRIORITY[severity];
  const field = normalizeOptional(
    typeof finding.field === 'string'
      ? finding.field
      : String(finding.field ?? ''),
  ) ?? 'unknown';
  const fieldPriorityRaw = parseFiniteNumber(finding.fieldPriority);
  const fieldPriority = fieldPriorityRaw !== null
    ? Math.max(1, Math.trunc(fieldPriorityRaw))
    : (EVIDENCE_PACKET_LINT_FIELD_PRIORITY[field] ?? 999);
  const issueIdentifier = normalizeOptional(
    typeof finding.issueIdentifier === 'string'
      ? finding.issueIdentifier
      : String(finding.issueIdentifier ?? ''),
  );
  const path = normalizeOptional(
    typeof finding.path === 'string'
      ? finding.path
      : String(finding.path ?? ''),
  );
  if (!issueIdentifier || !path) {
    return null;
  }
  const code = normalizeOptional(typeof finding.code === 'string' ? finding.code : String(finding.code ?? ''))
    ?? 'UNKNOWN_FINDING';
  const message = normalizeOptional(
    typeof finding.message === 'string'
      ? finding.message
      : String(finding.message ?? ''),
  ) ?? 'Missing lint finding message.';
  const inputValue = normalizeOptional(
    typeof finding.input === 'string'
      ? finding.input
      : String(finding.input ?? ''),
  ) ?? '';
  const normalizedValue = normalizeOptional(
    typeof finding.normalized === 'string'
      ? finding.normalized
      : String(finding.normalized ?? ''),
  ) ?? '';
  const id = normalizeOptional(
    typeof finding.id === 'string'
      ? finding.id
      : String(finding.id ?? `${severityPriority}|${fieldPriority}|${issueIdentifier}|${path}|${code}`),
  ) ?? `${severityPriority}|${fieldPriority}|${issueIdentifier}|${path}|${code}`;
  return {
    id,
    code,
    severity,
    severityPriority,
    field,
    fieldPriority,
    issueIdentifier,
    path,
    message,
    input: inputValue,
    normalized: normalizedValue,
  };
}

export function filterEvidencePacketLintFindings(
  rows: EvidencePacketLintConsoleFinding[],
  filter: EvidencePacketLintFilterKey,
): EvidencePacketLintConsoleFinding[] {
  if (filter === 'all') {
    return [...rows];
  }
  return rows.filter((row) => row.severity === filter);
}

export function buildEvidencePacketLintConsole(input: {
  findings: unknown[];
  activeFilter?: EvidencePacketLintFilterKey;
  activeFindingId: string;
}): EvidencePacketLintConsole {
  const activeFilter = input.activeFilter ?? 'all';
  const counts = {
    error: 0,
    warning: 0,
    total: 0,
  };
  const allRows = input.findings
    .map((finding) => parseEvidencePacketLintFinding(finding))
    .filter((finding): finding is EvidencePacketLintConsoleFinding => Boolean(finding))
    .sort((left, right) => (
      left.severityPriority - right.severityPriority
      || left.fieldPriority - right.fieldPriority
      || left.issueIdentifier.localeCompare(right.issueIdentifier)
      || left.path.localeCompare(right.path)
      || left.id.localeCompare(right.id)
    ));
  for (const row of allRows) {
    counts[row.severity] += 1;
    counts.total += 1;
  }
  const rows = filterEvidencePacketLintFindings(allRows, activeFilter);
  const idSet = new Set(rows.map((row) => row.id));
  const activeFindingId = idSet.has(input.activeFindingId)
    ? input.activeFindingId
    : (rows[0]?.id ?? '');
  return {
    contract: 'settlement-evidence-packet-lint-console.v1',
    rows,
    counts,
    activeFilter,
    activeFindingId,
  };
}

export function moveEvidencePacketLintSelection(input: {
  rows: EvidencePacketLintConsoleFinding[];
  activeFindingId: string;
  direction: 'next' | 'prev';
}): string {
  if (input.rows.length === 0) {
    return '';
  }
  const currentIndex = input.rows.findIndex((row) => row.id === input.activeFindingId);
  if (currentIndex < 0) {
    return input.rows[0].id;
  }
  if (input.direction === 'next') {
    return input.rows[Math.min(currentIndex + 1, input.rows.length - 1)].id;
  }
  return input.rows[Math.max(currentIndex - 1, 0)].id;
}

export function resolveEvidencePacketLintShortcut(input: {
  key: string;
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): EvidencePacketLintShortcut | null {
  const normalizedKey = input.key.toLowerCase();
  if (input.altKey && normalizedKey === 'e') {
    return 'focus_lint_list';
  }
  if (input.altKey && normalizedKey === 'j') {
    return 'next_finding';
  }
  if (input.altKey && normalizedKey === 'k') {
    return 'prev_finding';
  }
  if (input.key === 'Enter' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'validate_packet';
  }
  return null;
}

function normalizeManifestDiffDeltaClass(input: unknown): ManifestDiffDeltaClass {
  if (typeof input !== 'string') {
    return 'modified';
  }
  const normalized = input.trim().toLowerCase();
  if (normalized === 'missing' || normalized === 'modified' || normalized === 'unexpected') {
    return normalized;
  }
  return 'modified';
}

function parseManifestDiffViewerRow(row: unknown): ManifestDiffViewerRow | null {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const raw = row as Record<string, unknown>;
  const issueIdentifier = normalizeOptional(
    typeof raw.issueIdentifier === 'string'
      ? raw.issueIdentifier.toUpperCase()
      : String(raw.issueIdentifier ?? '').toUpperCase(),
  );
  if (!issueIdentifier) {
    return null;
  }
  const fieldPath = normalizeOptional(
    typeof raw.fieldPath === 'string'
      ? raw.fieldPath
      : String(raw.fieldPath ?? ''),
  ) ?? 'unknown.field';
  const deltaClass = normalizeManifestDiffDeltaClass(raw.deltaClass);
  const severityWeight = Math.max(0, Math.trunc(parseFiniteNumber(raw.severityWeight ?? raw.severity ?? raw.priority) ?? 0));
  const deltaClassWeight = Math.max(0, Math.trunc(parseFiniteNumber(raw.deltaClassWeight ?? raw.deltaWeight) ?? 0));
  const baselineValue = normalizeOptional(
    typeof raw.baselineValue === 'string'
      ? raw.baselineValue
      : String(raw.baselineValue ?? ''),
  ) ?? '';
  const currentValue = normalizeOptional(
    typeof raw.currentValue === 'string'
      ? raw.currentValue
      : String(raw.currentValue ?? ''),
  ) ?? '';
  const summary = normalizeOptional(
    typeof raw.summary === 'string'
      ? raw.summary
      : String(raw.summary ?? ''),
  ) ?? `${issueIdentifier} ${fieldPath} changed (${deltaClass}).`;
  const id = normalizeOptional(
    typeof raw.id === 'string'
      ? raw.id
      : `${severityWeight}|${deltaClassWeight}|${issueIdentifier}|${fieldPath}|${deltaClass}`,
  ) ?? `${severityWeight}|${deltaClassWeight}|${issueIdentifier}|${fieldPath}|${deltaClass}`;
  return {
    id,
    severityWeight,
    deltaClassWeight,
    issueIdentifier,
    fieldPath,
    deltaClass,
    baselineValue,
    currentValue,
    summary,
  };
}

export function buildManifestDiffViewer(input: {
  rows: unknown[];
  activeRowId: string;
}): ManifestDiffViewer {
  const rows = input.rows
    .map((row) => parseManifestDiffViewerRow(row))
    .filter((row): row is ManifestDiffViewerRow => Boolean(row))
    .sort((left, right) => (
      left.severityWeight - right.severityWeight
      || left.deltaClassWeight - right.deltaClassWeight
      || left.issueIdentifier.localeCompare(right.issueIdentifier)
      || left.fieldPath.localeCompare(right.fieldPath)
      || left.id.localeCompare(right.id)
    ));
  const idSet = new Set(rows.map((row) => row.id));
  const activeRowId = idSet.has(input.activeRowId)
    ? input.activeRowId
    : (rows[0]?.id ?? '');
  return {
    contract: 'settlement-manifest-diff-viewer.v1',
    rows,
    activeRowId,
  };
}

export function moveManifestDiffSelection(input: {
  rows: ManifestDiffViewerRow[];
  activeRowId: string;
  direction: 'next' | 'prev';
}): string {
  if (!input.rows.length) {
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

export function resolveManifestDiffShortcut(input: {
  key: string;
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): ManifestDiffShortcut | null {
  const normalizedKey = input.key.toLowerCase();
  if (input.altKey && !input.shiftKey && normalizedKey === 'm') {
    return 'focus_manifest_diff';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'j') {
    return 'next_finding';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'k') {
    return 'prev_finding';
  }
  if (normalizedKey === 'd' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'open_handoff_drill';
  }
  if (input.key === 'Enter' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'validate_active_packet';
  }
  return null;
}

export function getDefaultBlockedLaneHandoffDrillDraft(input: {
  laneId: string;
  issueIdentifier: string;
}): BlockedLaneHandoffDrillDraft {
  return {
    laneId: input.laneId,
    issueIdentifier: input.issueIdentifier,
    branch: '',
    fullSha: EVIDENCE_PACKET_LINT_SHA_PLACEHOLDER,
    prMode: 'no_pr_yet',
    testCommand: '',
    artifactPath: '',
    dependencyIssueLinksText: '',
    blockerOwner: '',
    blockerEta: '',
    updatedAt: '',
  };
}

export function applyBlockedLaneHandoffDrillPrMode(input: {
  draft: BlockedLaneHandoffDrillDraft;
  prMode: BlockedLaneHandoffDrillPrMode;
}): BlockedLaneHandoffDrillDraft {
  if (input.prMode === 'no_pr_yet') {
    return {
      ...input.draft,
      prMode: input.prMode,
    };
  }
  return {
    ...input.draft,
    prMode: input.prMode,
    blockerOwner: '',
    blockerEta: '',
  };
}

export function validateBlockedLaneHandoffDrillDraft(
  draft: BlockedLaneHandoffDrillDraft,
): BlockedLaneHandoffDrillValidation {
  const errors: string[] = [];
  const missingFields: string[] = [];
  const branch = draft.branch.trim();
  const fullSha = draft.fullSha.trim();
  const testCommand = draft.testCommand.trim();
  const artifactPath = draft.artifactPath.trim();
  const blockerOwner = draft.blockerOwner.trim();
  const blockerEta = draft.blockerEta.trim();
  const dependencyIssueLinks = normalizeMultilineEntries(draft.dependencyIssueLinksText);

  if (!branch) {
    missingFields.push('branch');
  }
  if (!fullSha) {
    missingFields.push('fullSha');
  } else if (!/^[a-f0-9]{40}$/i.test(fullSha)) {
    errors.push('Full SHA must be a 40-character hexadecimal value.');
  } else if (fullSha === EVIDENCE_PACKET_LINT_SHA_PLACEHOLDER) {
    errors.push('Full SHA placeholder must be replaced with a real commit SHA before handoff.');
  }
  if (!draft.prMode) {
    missingFields.push('prMode');
  }
  if (!testCommand) {
    missingFields.push('testCommand');
  }
  if (!artifactPath) {
    missingFields.push('artifactPath');
  }
  if (dependencyIssueLinks.length === 0) {
    missingFields.push('dependencyIssueLinks');
  }
  for (const link of dependencyIssueLinks) {
    if (!canonicalizePaperclipIssueLink(link)) {
      errors.push(`Dependency issue link is invalid: ${link}`);
    }
  }
  if (draft.prMode === 'no_pr_yet') {
    if (!blockerOwner) {
      missingFields.push('blockerOwner');
    }
    if (!blockerEta) {
      missingFields.push('blockerEta');
    } else if (!Number.isFinite(new Date(blockerEta).getTime())) {
      errors.push('Blocker ETA must be a valid date-time string.');
    }
  }

  return {
    isComplete: errors.length === 0 && missingFields.length === 0,
    errors,
    missingFields,
    dependencyIssueLinks: dependencyIssueLinks
      .map((link) => canonicalizePaperclipIssueLink(link))
      .filter((link): link is string => Boolean(link))
      .sort((left, right) => left.localeCompare(right)),
  };
}

export function resetBlockedLaneHandoffDrillDraft(input: {
  laneId: string;
  issueIdentifier: string;
  confirmFullReset: boolean;
}): {
  draft: BlockedLaneHandoffDrillDraft;
  didFullReset: boolean;
  message: string;
} {
  const draft = getDefaultBlockedLaneHandoffDrillDraft({
    laneId: input.laneId,
    issueIdentifier: input.issueIdentifier,
  });
  if (input.confirmFullReset) {
    return {
      draft,
      didFullReset: true,
      message: 'Blocked-lane handoff drill fully reset. Reconfirm active manifest finding before handoff.',
    };
  }
  return {
    draft,
    didFullReset: false,
    message: 'Blocked-lane handoff drill cleared for active finding. Manifest selection preserved.',
  };
}

function canonicalizePaperclipIssueLink(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  let pathname = trimmed;
  let hash = '';
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      pathname = parsed.pathname;
      hash = parsed.hash;
    } catch {
      return null;
    }
  } else {
    const hashIndex = trimmed.indexOf('#');
    if (hashIndex >= 0) {
      pathname = trimmed.slice(0, hashIndex);
      hash = trimmed.slice(hashIndex);
    }
  }
  const canonicalMatch = pathname.match(/^\/([A-Za-z0-9_-]+)\/issues\/([A-Za-z0-9]+-\d+)$/);
  if (canonicalMatch) {
    const identifier = canonicalMatch[2].toUpperCase();
    const prefix = identifier.split('-')[0];
    if (!hash) {
      return `/${prefix}/issues/${identifier}`;
    }
    const normalizedHash = hash.match(/^#(comment-\d+|document-[a-z0-9_-]+)$/i);
    return normalizedHash ? `/${prefix}/issues/${identifier}#${normalizedHash[1]}` : null;
  }
  const unprefixedMatch = pathname.match(/^\/issues\/([A-Za-z0-9]+-\d+)$/);
  if (unprefixedMatch) {
    const identifier = unprefixedMatch[1].toUpperCase();
    const prefix = identifier.split('-')[0];
    if (!hash) {
      return `/${prefix}/issues/${identifier}`;
    }
    const normalizedHash = hash.match(/^#(comment-\d+|document-[a-z0-9_-]+)$/i);
    return normalizedHash ? `/${prefix}/issues/${identifier}#${normalizedHash[1]}` : null;
  }
  return null;
}

function normalizeRemediationPlaybookCategory(input: unknown): RemediationPlaybookCategory {
  if (typeof input !== 'string') {
    return 'missing';
  }
  const normalized = input.trim().toLowerCase();
  if (normalized === 'missing'
    || normalized === 'stale'
    || normalized === 'malformed'
    || normalized === 'dependency-gap'
    || normalized === 'blocker-drift') {
    return normalized;
  }
  return 'missing';
}

function parseAnomalyTriageRow(row: unknown): AnomalyTriageRow | null {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const raw = row as Record<string, unknown>;
  const issueIdentifier = normalizeOptional(
    typeof raw.issueIdentifier === 'string'
      ? raw.issueIdentifier.toUpperCase()
      : String(raw.issueIdentifier ?? '').toUpperCase(),
  );
  if (!issueIdentifier) {
    return null;
  }
  const fieldPath = normalizeOptional(
    typeof raw.fieldPath === 'string'
      ? raw.fieldPath
      : String(raw.fieldPath ?? ''),
  ) ?? 'unknown.field';
  const category = normalizeRemediationPlaybookCategory(raw.category);
  const severityWeight = parseFiniteNumber(raw.severityWeight ?? raw.severity ?? raw.priority) ?? 0;
  const stalenessMinutes = Math.max(0, Math.trunc(parseFiniteNumber(raw.stalenessMinutes) ?? 0));
  const summary = normalizeOptional(
    typeof raw.summary === 'string'
      ? raw.summary
      : String(raw.summary ?? ''),
  ) ?? `${issueIdentifier} requires remediation for ${fieldPath}.`;
  const id = normalizeOptional(
    typeof raw.id === 'string'
      ? raw.id
      : `${issueIdentifier}|${fieldPath}|${category}|${severityWeight}|${stalenessMinutes}`,
  ) ?? `${issueIdentifier}|${fieldPath}|${category}|${severityWeight}|${stalenessMinutes}`;
  return {
    id,
    issueIdentifier,
    fieldPath,
    category,
    severityWeight,
    stalenessMinutes,
    summary,
  };
}

function parseDeterministicTimelineEvent(row: unknown): DeterministicAnomalyTimelineEvent | null {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const raw = row as Record<string, unknown>;
  const issueIdentifier = normalizeOptional(
    typeof raw.issueIdentifier === 'string'
      ? raw.issueIdentifier.toUpperCase()
      : String(raw.issueIdentifier ?? '').toUpperCase(),
  );
  if (!issueIdentifier) {
    return null;
  }
  const bundleCode = normalizeOptional(
    typeof raw.bundleCode === 'string'
      ? raw.bundleCode.toLowerCase()
      : String(raw.bundleCode ?? '').toLowerCase(),
  ) ?? 'default';
  const fieldPath = normalizeOptional(
    typeof raw.fieldPath === 'string'
      ? raw.fieldPath
      : String(raw.fieldPath ?? ''),
  ) ?? 'unknown.field';
  const severityWeight = Math.max(0, Math.trunc(parseFiniteNumber(raw.severityWeight) ?? 0));
  const driftClassWeight = Math.max(0, Math.trunc(parseFiniteNumber(raw.driftClassWeight) ?? 0));
  const occurredAt = normalizeOptional(
    typeof raw.occurredAt === 'string'
      ? raw.occurredAt
      : String(raw.occurredAt ?? ''),
  ) ?? '1970-01-01T00:00:00.000Z';
  const summary = normalizeOptional(
    typeof raw.summary === 'string'
      ? raw.summary
      : String(raw.summary ?? ''),
  ) ?? `${issueIdentifier} anomaly detected for ${fieldPath}.`;
  const id = normalizeOptional(
    typeof raw.id === 'string'
      ? raw.id
      : `${issueIdentifier}|${bundleCode}|${fieldPath}|${occurredAt}|${severityWeight}|${driftClassWeight}`,
  ) ?? `${issueIdentifier}|${bundleCode}|${fieldPath}|${occurredAt}|${severityWeight}|${driftClassWeight}`;
  return {
    id,
    issueIdentifier,
    bundleCode,
    fieldPath,
    severityWeight,
    driftClassWeight,
    occurredAt,
    summary,
  };
}

function parseOccurredAtMillis(value: string): number {
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return 0;
}

function classifyReferenceType(link: string): CanonicalExportLinkType {
  const hash = link.split('#')[1] ?? '';
  if (!hash) {
    return 'issue';
  }
  if (/^comment-\d+$/i.test(hash)) {
    return 'comment';
  }
  if (/^document-[a-z0-9_-]+$/i.test(hash)) {
    return 'document';
  }
  return 'unknown';
}

function parseRemediationComposerAction(
  action: unknown,
  index: number,
): RemediationPlaybookComposerAction | null {
  if (!action || typeof action !== 'object') {
    return null;
  }
  const raw = action as Record<string, unknown>;
  const actionCode = normalizeOptional(
    typeof raw.actionCode === 'string' ? raw.actionCode.toLowerCase() : String(raw.actionCode ?? '').toLowerCase(),
  );
  const reasonCode = normalizeOptional(
    typeof raw.reasonCode === 'string' ? raw.reasonCode.toLowerCase() : String(raw.reasonCode ?? '').toLowerCase(),
  );
  const issueIdentifier = normalizeOptional(
    typeof raw.issueIdentifier === 'string'
      ? raw.issueIdentifier.toUpperCase()
      : String(raw.issueIdentifier ?? '').toUpperCase(),
  );
  if (!actionCode || !reasonCode || !issueIdentifier) {
    return null;
  }
  const severityWeight = Math.max(0, Math.trunc(parseFiniteNumber(raw.severityWeight) ?? 0));
  const riskLevel = severityWeight >= 90
    ? 'critical'
    : severityWeight >= 70
      ? 'high'
      : severityWeight >= 40
        ? 'medium'
        : 'low';
  const requiredEvidence = Array.isArray(raw.requiredEvidence)
    ? raw.requiredEvidence
      .map((item) => normalizeOptional(typeof item === 'string' ? item : String(item ?? '')))
      .filter((item): item is string => Boolean(item))
      .sort((left, right) => left.localeCompare(right))
    : [];
  const rollbackHint = normalizeOptional(
    typeof raw.rollbackHint === 'string' ? raw.rollbackHint : String(raw.rollbackHint ?? ''),
  ) ?? `Rollback ${actionCode} and revert to previous stable fixture for ${issueIdentifier}.`;
  const bundleCode = normalizeOptional(
    typeof raw.bundleCode === 'string' ? raw.bundleCode.toLowerCase() : String(raw.bundleCode ?? '').toLowerCase(),
  ) ?? `bundle-${index}`;
  const fieldPath = normalizeOptional(
    typeof raw.fieldPath === 'string' ? raw.fieldPath : String(raw.fieldPath ?? ''),
  ) ?? 'unknown.field';
  return {
    actionCode,
    reasonCode,
    riskLevel,
    requiredEvidence,
    rollbackHint,
    issueIdentifier,
    bundleCode,
    fieldPath,
  };
}

function riskLevelWeight(level: RemediationPlaybookRiskLevel): number {
  if (level === 'critical') {
    return 4;
  }
  if (level === 'high') {
    return 3;
  }
  if (level === 'medium') {
    return 2;
  }
  return 1;
}

export function buildDeterministicAnomalyTimelineWorkspace(input: {
  events: unknown[];
  activeEventId: string;
}): DeterministicAnomalyTimelineWorkspace {
  const events = input.events
    .map((row) => parseDeterministicTimelineEvent(row))
    .filter((row): row is DeterministicAnomalyTimelineEvent => Boolean(row))
    .sort((left, right) => (
      right.severityWeight - left.severityWeight
      || right.driftClassWeight - left.driftClassWeight
      || left.issueIdentifier.localeCompare(right.issueIdentifier)
      || left.bundleCode.localeCompare(right.bundleCode)
      || parseOccurredAtMillis(left.occurredAt) - parseOccurredAtMillis(right.occurredAt)
      || left.fieldPath.localeCompare(right.fieldPath)
      || left.id.localeCompare(right.id)
    ));
  const grouped = new Map<string, DeterministicAnomalyTimelineGroup>();
  for (const event of events) {
    const key = `${event.issueIdentifier}|${event.bundleCode}`;
    const current = grouped.get(key);
    if (current) {
      current.events.push(event);
      continue;
    }
    grouped.set(key, {
      id: key,
      issueIdentifier: event.issueIdentifier,
      bundleCode: event.bundleCode,
      events: [event],
    });
  }
  const eventIdSet = new Set(events.map((event) => event.id));
  const activeEventId = eventIdSet.has(input.activeEventId)
    ? input.activeEventId
    : (events[0]?.id ?? '');
  return {
    contract: 'settlement-anomaly-timeline-workspace.v1',
    groups: [...grouped.values()],
    activeEventId,
  };
}

export function moveDeterministicAnomalyTimelineSelection(input: {
  groups: DeterministicAnomalyTimelineGroup[];
  activeEventId: string;
  direction: 'next' | 'prev';
}): string {
  const events = input.groups.flatMap((group) => group.events);
  if (events.length === 0) {
    return '';
  }
  const index = events.findIndex((event) => event.id === input.activeEventId);
  if (index < 0) {
    return events[0].id;
  }
  if (input.direction === 'next') {
    return events[Math.min(index + 1, events.length - 1)].id;
  }
  return events[Math.max(index - 1, 0)].id;
}

export function resolveAnomalyTimelineShortcut(input: {
  key: string;
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): AnomalyTimelineShortcut | null {
  const normalized = input.key.toLowerCase();
  if (input.altKey && !input.shiftKey && normalized === 't') {
    return 'focus_timeline_board';
  }
  if (input.altKey && input.shiftKey && normalized === 'n') {
    return 'next_anomaly';
  }
  if (input.altKey && input.shiftKey && normalized === 'p') {
    return 'prev_anomaly';
  }
  if (normalized === 'r' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'open_playbook_composer';
  }
  if (input.key === 'Enter' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'validate_export_packet';
  }
  return null;
}

export function buildRemediationPlaybookComposerPanel(input: {
  actions: unknown[];
}): RemediationPlaybookComposerPanel {
  const actions = input.actions
    .map((action, index) => parseRemediationComposerAction(action, index))
    .filter((action): action is RemediationPlaybookComposerAction => Boolean(action))
    .sort((left, right) => (
      riskLevelWeight(right.riskLevel) - riskLevelWeight(left.riskLevel)
      || left.actionCode.localeCompare(right.actionCode)
      || left.reasonCode.localeCompare(right.reasonCode)
      || left.issueIdentifier.localeCompare(right.issueIdentifier)
      || left.bundleCode.localeCompare(right.bundleCode)
      || left.fieldPath.localeCompare(right.fieldPath)
    ));
  return {
    contract: 'settlement-remediation-playbook-composer.v1',
    actions,
  };
}

export function verifyCanonicalExportLinks(input: {
  linksText: string;
}): CanonicalExportLinkVerification {
  const rows = normalizeMultilineEntries(input.linksText)
    .map((original, index) => {
      const normalized = canonicalizePaperclipIssueLink(original) ?? original;
      const valid = Boolean(canonicalizePaperclipIssueLink(original));
      return {
        id: `export-link-${index}`,
        original,
        normalized,
        changed: normalized !== original,
        valid,
        type: valid ? classifyReferenceType(normalized) : 'unknown',
      } satisfies CanonicalExportLinkVerificationRow;
    })
    .sort((left, right) => left.original.localeCompare(right.original));
  const hasIssueReference = rows.some((row) => row.valid && row.type === 'issue');
  const hasCommentReference = rows.some((row) => row.valid && row.type === 'comment');
  const hasDocumentReference = rows.some((row) => row.valid && row.type === 'document');
  return {
    contract: 'settlement-export-link-verifier.v1',
    rows,
    correctedOutput: rows.map((row) => row.normalized).join('\n'),
    changedCount: rows.filter((row) => row.changed).length,
    invalidCount: rows.filter((row) => !row.valid).length,
    hasIssueReference,
    hasCommentReference,
    hasDocumentReference,
    readyForExport: rows.length > 0
      && rows.every((row) => row.valid)
      && hasIssueReference
      && hasCommentReference
      && hasDocumentReference,
  };
}

export function buildAnomalyTriageBoard(input: {
  rows: unknown[];
  activeRowId: string;
}): AnomalyTriageBoard {
  const categoryRank = new Map(REMEDIATION_PLAYBOOK_CATEGORY_ORDER.map((category, index) => [category, index]));
  const rows = input.rows
    .map((row) => parseAnomalyTriageRow(row))
    .filter((row): row is AnomalyTriageRow => Boolean(row))
    .sort((left, right) => (
      right.severityWeight - left.severityWeight
      || right.stalenessMinutes - left.stalenessMinutes
      || left.issueIdentifier.localeCompare(right.issueIdentifier)
      || left.fieldPath.localeCompare(right.fieldPath)
      || (categoryRank.get(left.category) ?? Number.MAX_SAFE_INTEGER)
      - (categoryRank.get(right.category) ?? Number.MAX_SAFE_INTEGER)
      || left.id.localeCompare(right.id)
    ));
  const idSet = new Set(rows.map((row) => row.id));
  const activeRowId = idSet.has(input.activeRowId)
    ? input.activeRowId
    : (rows[0]?.id ?? '');
  return {
    contract: 'settlement-anomaly-triage-board.v1',
    rows,
    activeRowId,
  };
}

export function moveAnomalyTriageSelection(input: {
  rows: AnomalyTriageRow[];
  activeRowId: string;
  direction: 'next' | 'prev';
}): string {
  if (!input.rows.length) {
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

export function resolveAnomalyTriageShortcut(input: {
  key: string;
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): AnomalyTriageShortcut | null {
  const normalizedKey = input.key.toLowerCase();
  if (input.altKey && !input.shiftKey && normalizedKey === 'a') {
    return 'focus_anomaly_board';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'j') {
    return 'next_anomaly';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'k') {
    return 'prev_anomaly';
  }
  if (normalizedKey === 'p' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'open_playbook_composer';
  }
  if (input.key === 'Enter' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'validate_active_playbook';
  }
  return null;
}

function parseRemediationRunbookTimelineRow(row: unknown): RemediationRunbookTimelineRow | null {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const raw = row as Record<string, unknown>;
  const issueIdentifier = normalizeOptional(
    typeof raw.issueIdentifier === 'string'
      ? raw.issueIdentifier.toUpperCase()
      : String(raw.issueIdentifier ?? '').toUpperCase(),
  );
  if (!issueIdentifier) {
    return null;
  }
  const stepIndex = Math.max(0, Math.trunc(parseFiniteNumber(raw.stepIndex) ?? 0));
  const severityWeight = Math.max(0, Math.trunc(parseFiniteNumber(raw.severityWeight) ?? 0));
  const etaDriftMinutes = Math.max(0, Math.trunc(parseFiniteNumber(raw.etaDriftMinutes) ?? 0));
  const summary = normalizeOptional(
    typeof raw.summary === 'string'
      ? raw.summary
      : String(raw.summary ?? ''),
  ) ?? `${issueIdentifier} step ${stepIndex} requires remediation sequencing.`;
  const owner = normalizeOptional(
    typeof raw.owner === 'string'
      ? raw.owner
      : String(raw.owner ?? ''),
  ) ?? 'unassigned';
  const id = normalizeOptional(
    typeof raw.id === 'string'
      ? raw.id
      : `${issueIdentifier}|${stepIndex}|${severityWeight}|${etaDriftMinutes}`,
  ) ?? `${issueIdentifier}|${stepIndex}|${severityWeight}|${etaDriftMinutes}`;
  return {
    id,
    issueIdentifier,
    stepIndex,
    severityWeight,
    etaDriftMinutes,
    summary,
    owner,
  };
}

export function buildRemediationRunbookTimelineBoard(input: {
  rows: unknown[];
  activeRowId: string;
}): RemediationRunbookTimelineBoard {
  const rows = input.rows
    .map((row) => parseRemediationRunbookTimelineRow(row))
    .filter((row): row is RemediationRunbookTimelineRow => Boolean(row))
    .sort((left, right) => (
      right.severityWeight - left.severityWeight
      || right.etaDriftMinutes - left.etaDriftMinutes
      || left.issueIdentifier.localeCompare(right.issueIdentifier)
      || left.stepIndex - right.stepIndex
      || left.id.localeCompare(right.id)
    ));
  const idSet = new Set(rows.map((row) => row.id));
  const activeRowId = idSet.has(input.activeRowId)
    ? input.activeRowId
    : (rows[0]?.id ?? '');
  return {
    contract: 'settlement-remediation-runbook-timeline-board.v1',
    rows,
    activeRowId,
  };
}

export function moveRemediationRunbookTimelineSelection(input: {
  rows: RemediationRunbookTimelineRow[];
  activeRowId: string;
  direction: 'next' | 'prev';
}): string {
  if (!input.rows.length) {
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

export function resolveRemediationRunbookShortcut(input: {
  key: string;
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): RemediationRunbookTimelineShortcut | null {
  const normalizedKey = input.key.toLowerCase();
  if (input.altKey && !input.shiftKey && normalizedKey === 't') {
    return 'focus_timeline_board';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'j') {
    return 'next_step';
  }
  if (input.altKey && input.shiftKey && normalizedKey === 'k') {
    return 'prev_step';
  }
  if (normalizedKey === 'h' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'open_handoff_pack';
  }
  if (input.key === 'Enter' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'validate_active_pack';
  }
  return null;
}

export function getDefaultRemediationRunbookHandoffPackDraft(input: {
  stepId: string;
  issueIdentifier: string;
}): RemediationRunbookHandoffPackDraft {
  return {
    stepId: input.stepId,
    issueIdentifier: input.issueIdentifier,
    branch: '',
    fullSha: EVIDENCE_PACKET_LINT_SHA_PLACEHOLDER,
    prMode: 'no_pr_yet',
    testCommand: '',
    artifactPath: '',
    dependencyIssueLinksText: '',
    blockerOwner: '',
    blockerEta: '',
    updatedAt: '',
  };
}

export function applyRemediationRunbookHandoffPackPrMode(input: {
  draft: RemediationRunbookHandoffPackDraft;
  prMode: RemediationRunbookHandoffPrMode;
}): RemediationRunbookHandoffPackDraft {
  if (input.prMode === 'no_pr_yet') {
    return {
      ...input.draft,
      prMode: input.prMode,
    };
  }
  return {
    ...input.draft,
    prMode: input.prMode,
    blockerOwner: '',
    blockerEta: '',
  };
}

export function validateRemediationRunbookHandoffPackDraft(
  draft: RemediationRunbookHandoffPackDraft,
): RemediationRunbookHandoffPackValidation {
  const errors: string[] = [];
  const missingFields: string[] = [];
  const branch = draft.branch.trim();
  const fullSha = draft.fullSha.trim();
  const testCommand = draft.testCommand.trim();
  const artifactPath = draft.artifactPath.trim();
  const blockerOwner = draft.blockerOwner.trim();
  const blockerEta = draft.blockerEta.trim();
  const dependencyIssueLinks = normalizeMultilineEntries(draft.dependencyIssueLinksText);

  if (!branch) {
    missingFields.push('branch');
  }
  if (!fullSha) {
    missingFields.push('fullSha');
  } else if (!/^[a-f0-9]{40}$/i.test(fullSha)) {
    errors.push('Full SHA must be a 40-character hexadecimal value.');
  } else if (fullSha === EVIDENCE_PACKET_LINT_SHA_PLACEHOLDER) {
    errors.push('Full SHA placeholder must be replaced with a real commit SHA before handoff.');
  }
  if (!draft.prMode) {
    missingFields.push('prMode');
  }
  if (!testCommand) {
    missingFields.push('testCommand');
  }
  if (!artifactPath) {
    missingFields.push('artifactPath');
  }
  if (dependencyIssueLinks.length === 0) {
    missingFields.push('dependencyIssueLinks');
  }
  for (const link of dependencyIssueLinks) {
    if (!canonicalizePaperclipIssueLink(link)) {
      errors.push(`Dependency issue link is invalid: ${link}`);
    }
  }
  if (draft.prMode === 'no_pr_yet') {
    if (!blockerOwner) {
      missingFields.push('blockerOwner');
    }
    if (!blockerEta) {
      missingFields.push('blockerEta');
    } else if (!Number.isFinite(new Date(blockerEta).getTime())) {
      errors.push('Blocker ETA must be a valid date-time string.');
    }
  }
  return {
    isComplete: errors.length === 0 && missingFields.length === 0,
    errors,
    missingFields,
    dependencyIssueLinks: dependencyIssueLinks
      .map((link) => canonicalizePaperclipIssueLink(link))
      .filter((link): link is string => Boolean(link))
      .sort((left, right) => left.localeCompare(right)),
  };
}

export function resetRemediationRunbookHandoffPackDraft(input: {
  stepId: string;
  issueIdentifier: string;
  confirmFullReset: boolean;
}): {
  draft: RemediationRunbookHandoffPackDraft;
  didFullReset: boolean;
  message: string;
} {
  const draft = getDefaultRemediationRunbookHandoffPackDraft({
    stepId: input.stepId,
    issueIdentifier: input.issueIdentifier,
  });
  if (input.confirmFullReset) {
    return {
      draft,
      didFullReset: true,
      message: 'Runbook handoff draft fully reset. Active step selection should be rechecked.',
    };
  }
  return {
    draft,
    didFullReset: false,
    message: 'Runbook handoff draft cleared for active step. Timeline selection preserved.',
  };
}

export function getDefaultRemediationPlaybookDraft(input: {
  anomalyId: string;
  issueIdentifier: string;
  category: RemediationPlaybookCategory;
}): RemediationPlaybookDraft {
  return {
    anomalyId: input.anomalyId,
    issueIdentifier: input.issueIdentifier,
    category: input.category,
    summary: '',
    stagedActionsText: REMEDIATION_PLAYBOOK_CATEGORY_ACTIONS[input.category].join('\n'),
    owner: '',
    eta: '',
    dependencyIssueLinksText: '',
    notes: '',
    updatedAt: '',
  };
}

export function upsertRemediationPlaybookDraft(input: {
  drafts: RemediationPlaybookDraft[];
  draft: RemediationPlaybookDraft;
}): RemediationPlaybookDraft[] {
  const byAnomaly = new Map(input.drafts.map((draft) => [draft.anomalyId, draft]));
  byAnomaly.set(input.draft.anomalyId, input.draft);
  return [...byAnomaly.values()].sort((left, right) => (
    left.issueIdentifier.localeCompare(right.issueIdentifier)
    || left.category.localeCompare(right.category)
    || left.anomalyId.localeCompare(right.anomalyId)
  ));
}

export function validateRemediationPlaybookDraft(
  draft: RemediationPlaybookDraft,
): RemediationPlaybookValidation {
  const errors: string[] = [];
  const missingFields: string[] = [];
  const summary = draft.summary.trim();
  const stagedActions = normalizeMultilineEntries(draft.stagedActionsText);
  const owner = draft.owner.trim();
  const eta = draft.eta.trim();
  const dependencyIssueLinks = normalizeMultilineEntries(draft.dependencyIssueLinksText);
  if (!summary) {
    missingFields.push('summary');
  }
  if (!stagedActions.length) {
    missingFields.push('stagedActions');
  }
  if (!owner) {
    missingFields.push('owner');
  }
  if (!eta) {
    missingFields.push('eta');
  } else if (!Number.isFinite(new Date(eta).getTime())) {
    errors.push('ETA must be a valid date-time string.');
  }
  if (!dependencyIssueLinks.length) {
    missingFields.push('dependencyIssueLinks');
  }
  for (const link of dependencyIssueLinks) {
    if (!canonicalizePaperclipIssueLink(link)) {
      errors.push(`Dependency issue link is invalid: ${link}`);
    }
  }
  return {
    isComplete: errors.length === 0 && missingFields.length === 0,
    errors,
    missingFields,
    dependencyIssueLinks: dependencyIssueLinks
      .map((link) => canonicalizePaperclipIssueLink(link))
      .filter((link): link is string => Boolean(link))
      .sort((left, right) => left.localeCompare(right)),
    stagedActions,
  };
}

export function resetRemediationPlaybookDraftSafe(input: {
  anomalyId: string;
  issueIdentifier: string;
  category: RemediationPlaybookCategory;
  confirmFullReset: boolean;
}): {
  draft: RemediationPlaybookDraft;
  didFullReset: boolean;
  message: string;
} {
  const draft = getDefaultRemediationPlaybookDraft({
    anomalyId: input.anomalyId,
    issueIdentifier: input.issueIdentifier,
    category: input.category,
  });
  if (input.confirmFullReset) {
    return {
      draft,
      didFullReset: true,
      message: 'Remediation playbook drafts cleared. Lane-scoped draft memory reset.',
    };
  }
  return {
    draft,
    didFullReset: false,
    message: 'Active remediation draft cleared. Other lane drafts remain staged.',
  };
}

export function buildCanonicalLinkAutofixPreview(input: {
  linksText: string;
}): CanonicalLinkAutofixPreview {
  const rows = normalizeMultilineEntries(input.linksText)
    .map((original, index) => {
      const normalized = canonicalizePaperclipIssueLink(original) ?? original;
      return {
        id: `autofix-${index}-${original}`,
        original,
        normalized,
        changed: normalized !== original,
      };
    })
    .sort((left, right) => left.original.localeCompare(right.original));
  return {
    rows,
    correctedOutput: rows.map((row) => row.normalized).join('\n'),
    changedCount: rows.filter((row) => row.changed).length,
  };
}

export function getDefaultEvidencePacketLintChecklistDraft(): EvidencePacketLintChecklistDraft {
  return {
    branch: '',
    fullSha: EVIDENCE_PACKET_LINT_SHA_PLACEHOLDER,
    prMode: 'no_pr_yet',
    testCommand: '',
    artifactPath: '',
    dependencyIssueLinksText: '',
    blockerOwner: '',
    blockerEta: '',
  };
}

export function applyEvidencePacketLintChecklistPrMode(input: {
  draft: EvidencePacketLintChecklistDraft;
  prMode: EvidencePacketLintPrMode;
}): EvidencePacketLintChecklistDraft {
  if (input.prMode === 'no_pr_yet') {
    return {
      ...input.draft,
      prMode: input.prMode,
    };
  }
  return {
    ...input.draft,
    prMode: input.prMode,
    blockerOwner: '',
    blockerEta: '',
  };
}

export function validateEvidencePacketLintChecklistDraft(
  draft: EvidencePacketLintChecklistDraft,
): EvidencePacketLintChecklistValidation {
  const errors: string[] = [];
  const missingFields: string[] = [];
  const branch = draft.branch.trim();
  const fullSha = draft.fullSha.trim();
  const testCommand = draft.testCommand.trim();
  const artifactPath = draft.artifactPath.trim();
  const blockerOwner = draft.blockerOwner.trim();
  const blockerEta = draft.blockerEta.trim();
  const dependencyIssueLinks = normalizeMultilineEntries(draft.dependencyIssueLinksText);

  if (!branch) {
    missingFields.push('branch');
  }
  if (!fullSha) {
    missingFields.push('fullSha');
  } else if (!/^[a-f0-9]{40}$/i.test(fullSha)) {
    errors.push('Full SHA must be a 40-character hexadecimal value.');
  } else if (fullSha === EVIDENCE_PACKET_LINT_SHA_PLACEHOLDER) {
    errors.push('Full SHA placeholder must be replaced with a real commit SHA before completion.');
  }
  if (!draft.prMode) {
    missingFields.push('prMode');
  }
  if (!testCommand) {
    missingFields.push('testCommand');
  }
  if (!artifactPath) {
    missingFields.push('artifactPath');
  }
  if (dependencyIssueLinks.length === 0) {
    missingFields.push('dependencyIssueLinks');
  }
  for (const link of dependencyIssueLinks) {
    if (!canonicalizePaperclipIssueLink(link)) {
      errors.push(`Dependency issue link is invalid: ${link}`);
    }
  }
  if (draft.prMode === 'no_pr_yet') {
    if (!blockerOwner) {
      missingFields.push('blockerOwner');
    }
    if (!blockerEta) {
      missingFields.push('blockerEta');
    } else if (!Number.isFinite(new Date(blockerEta).getTime())) {
      errors.push('Blocker ETA must be a valid date-time string.');
    }
  }
  return {
    isComplete: errors.length === 0 && missingFields.length === 0,
    errors,
    missingFields,
    dependencyIssueLinks: dependencyIssueLinks
      .map((link) => canonicalizePaperclipIssueLink(link))
      .filter((link): link is string => Boolean(link))
      .sort((left, right) => left.localeCompare(right)),
  };
}

export function resetEvidencePacketLintChecklistDraftSafe(input: {
  activeFilter: EvidencePacketLintFilterKey;
  activeFindingId: string;
  confirmFullReset: boolean;
}): {
  draft: EvidencePacketLintChecklistDraft;
  activeFilter: EvidencePacketLintFilterKey;
  activeFindingId: string;
  didFullReset: boolean;
  message: string;
} {
  if (input.confirmFullReset) {
    return {
      draft: getDefaultEvidencePacketLintChecklistDraft(),
      activeFilter: 'all',
      activeFindingId: '',
      didFullReset: true,
      message: 'Evidence packet checklist cleared. Lint filter and active finding reset to default.',
    };
  }
  return {
    draft: getDefaultEvidencePacketLintChecklistDraft(),
    activeFilter: input.activeFilter,
    activeFindingId: input.activeFindingId,
    didFullReset: false,
    message: 'Evidence packet checklist cleared. Lint filter and active finding preserved.',
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
const EVIDENCE_GAP_SHA_PLACEHOLDER = '0000000000000000000000000000000000000000';

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

function parseReplayDiffSnapshotRow(raw: unknown): ReplayDiffSnapshotRow | null {
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
  if (lineageDepthRaw === null) {
    return null;
  }
  const artifactPath = normalizeOptional(
    typeof row.artifactPath === 'string'
      ? row.artifactPath
      : String(row.artifactPath ?? ''),
  ) ?? '';
  const payload = normalizeOptional(
    typeof row.payload === 'string'
      ? row.payload
      : String(row.payload ?? ''),
  ) ?? '';
  return {
    id,
    lineageDepth: Math.max(0, Math.trunc(lineageDepthRaw)),
    sourceIssueId,
    artifactPath,
    payload,
  };
}

function replayDiffSnapshotRowKey(row: Pick<ReplayDiffSnapshotRow, 'lineageDepth' | 'sourceIssueId' | 'artifactPath'>): string {
  return `${row.lineageDepth}|${row.sourceIssueId}|${row.artifactPath}`;
}

export function filterReplayDiffInspectorRows(
  rows: ReplayDiffInspectorRow[],
  filter: ReplayDiffInspectorFilterKey,
): ReplayDiffInspectorRow[] {
  if (filter === 'all') {
    return [...rows];
  }
  return rows.filter((row) => row.changeType === filter);
}

export function buildReplayDiffInspector(input: {
  primarySnapshotId: string;
  secondarySnapshotId: string;
  primaryRows: unknown[];
  secondaryRows: unknown[];
  activeRowId: string;
  activeFilter?: ReplayDiffInspectorFilterKey;
}): ReplayDiffInspector {
  const activeFilter = input.activeFilter ?? 'all';
  const primaryRows = input.primaryRows
    .map((row) => parseReplayDiffSnapshotRow(row))
    .filter((row): row is ReplayDiffSnapshotRow => Boolean(row));
  const secondaryRows = input.secondaryRows
    .map((row) => parseReplayDiffSnapshotRow(row))
    .filter((row): row is ReplayDiffSnapshotRow => Boolean(row));
  const primaryMap = new Map(primaryRows.map((row) => [replayDiffSnapshotRowKey(row), row] as const));
  const secondaryMap = new Map(secondaryRows.map((row) => [replayDiffSnapshotRowKey(row), row] as const));
  const rowKeys = Array.from(new Set([
    ...primaryMap.keys(),
    ...secondaryMap.keys(),
  ]));
  const rows = rowKeys
    .map((rowKey) => {
      const previousRow = primaryMap.get(rowKey) ?? null;
      const nextRow = secondaryMap.get(rowKey) ?? null;
      if (!previousRow && !nextRow) {
        return null;
      }
      let changeType: 'added' | 'removed' | 'modified' = 'modified';
      if (!previousRow && nextRow) {
        changeType = 'added';
      } else if (previousRow && !nextRow) {
        changeType = 'removed';
      } else if ((previousRow?.payload ?? '') !== (nextRow?.payload ?? '')) {
        changeType = 'modified';
      } else {
        return null;
      }

      const lineageDepth = previousRow?.lineageDepth ?? nextRow?.lineageDepth ?? 0;
      const sourceIssueId = previousRow?.sourceIssueId ?? nextRow?.sourceIssueId ?? '';
      const artifactPath = previousRow?.artifactPath ?? nextRow?.artifactPath ?? '';
      const id = `${changeType}|${lineageDepth}|${sourceIssueId}|${artifactPath}`;
      return {
        id,
        changeType,
        changeTypePriority: REPLAY_DIFF_CHANGE_TYPE_PRIORITY[changeType],
        lineageDepth,
        sourceIssueId,
        artifactPath,
        previousPayload: previousRow?.payload ?? '',
        nextPayload: nextRow?.payload ?? '',
      };
    })
    .filter((row): row is ReplayDiffInspectorRow => Boolean(row))
    .sort((left, right) => (
      left.changeTypePriority - right.changeTypePriority
      || left.lineageDepth - right.lineageDepth
      || left.sourceIssueId.localeCompare(right.sourceIssueId)
      || left.artifactPath.localeCompare(right.artifactPath)
      || left.id.localeCompare(right.id)
    ));
  const filteredRows = filterReplayDiffInspectorRows(rows, activeFilter);
  const rowIdSet = new Set(filteredRows.map((row) => row.id));
  const activeRowId = rowIdSet.has(input.activeRowId)
    ? input.activeRowId
    : (filteredRows[0]?.id ?? '');
  return {
    contract: 'settlement-replay-diff-inspector.v1',
    primarySnapshotId: normalizeOptional(input.primarySnapshotId) ?? '',
    secondarySnapshotId: normalizeOptional(input.secondarySnapshotId) ?? '',
    rows: filteredRows,
    activeFilter,
    activeRowId,
  };
}

export function moveReplayDiffInspectorSelection(input: {
  rows: ReplayDiffInspectorRow[];
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

export function resolveReplayDiffInspectorShortcut(input: {
  key: string;
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): ReplayDiffInspectorShortcut | null {
  const normalizedKey = input.key.toLowerCase();
  if (input.altKey && normalizedKey === 'd') {
    return 'focus_diff_inspector';
  }
  if (input.altKey && normalizedKey === 'arrowright') {
    return 'next_row';
  }
  if (input.altKey && normalizedKey === 'arrowleft') {
    return 'prev_row';
  }
  if (input.key === 'Enter' && input.shiftKey && (input.ctrlKey || input.metaKey)) {
    return 'validate_checklist';
  }
  return null;
}

export function getDefaultEvidenceGapChecklistDraft(): EvidenceGapChecklistDraft {
  return {
    branch: '',
    fullSha: EVIDENCE_GAP_SHA_PLACEHOLDER,
    mode: 'no_pr',
    prLink: '',
    blockerOwner: '',
    eta: '',
    missingArtifactPathsText: '',
    dependencyIssueLinksText: '',
  };
}

export function validateEvidenceGapChecklistDraft(
  draft: EvidenceGapChecklistDraft,
): EvidenceGapChecklistValidation {
  const errors: string[] = [];
  const missingFields: string[] = [];
  const branch = draft.branch.trim();
  const fullSha = draft.fullSha.trim();
  const prLink = draft.prLink.trim();
  const blockerOwner = draft.blockerOwner.trim();
  const eta = draft.eta.trim();
  const missingArtifactPaths = normalizeMultilineEntries(draft.missingArtifactPathsText);
  const dependencyIssueLinks = normalizeDependencyIssueLinks(draft.dependencyIssueLinksText);

  if (!branch) {
    missingFields.push('branch');
  }
  if (!fullSha) {
    missingFields.push('fullSha');
  } else if (!/^[a-f0-9]{40}$/i.test(fullSha)) {
    errors.push('Full SHA must be a 40-character hexadecimal value.');
  } else if (fullSha === EVIDENCE_GAP_SHA_PLACEHOLDER) {
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

  if (missingArtifactPaths.length === 0) {
    missingFields.push('missingArtifactPaths');
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
    missingArtifactPaths,
    dependencyIssueLinks,
  };
}

export function resetEvidenceGapChecklistDraftSafe(input: {
  activeDiffFilter: ReplayDiffInspectorFilterKey;
  primarySnapshotId: string;
  secondarySnapshotId: string;
  activeHeatmapLane: ReviewQueueLedgerFilterKey;
  activeHeatmapRowId: string;
  confirmFullReset: boolean;
}): {
  draft: EvidenceGapChecklistDraft;
  activeDiffFilter: ReplayDiffInspectorFilterKey;
  primarySnapshotId: string;
  secondarySnapshotId: string;
  activeHeatmapLane: ReviewQueueLedgerFilterKey;
  activeHeatmapRowId: string;
  didFullReset: boolean;
  message: string;
} {
  if (input.confirmFullReset) {
    return {
      draft: getDefaultEvidenceGapChecklistDraft(),
      activeDiffFilter: 'all',
      primarySnapshotId: '',
      secondarySnapshotId: '',
      activeHeatmapLane: 'all',
      activeHeatmapRowId: '',
      didFullReset: true,
      message: 'Evidence-gap checklist draft cleared. Diff filter, selected lane, and snapshot pair reset to default.',
    };
  }
  return {
    draft: getDefaultEvidenceGapChecklistDraft(),
    activeDiffFilter: input.activeDiffFilter,
    primarySnapshotId: input.primarySnapshotId,
    secondarySnapshotId: input.secondarySnapshotId,
    activeHeatmapLane: input.activeHeatmapLane,
    activeHeatmapRowId: input.activeHeatmapRowId,
    didFullReset: false,
    message: 'Evidence-gap checklist draft cleared. Active filters, selected lane, and snapshot pair preserved.',
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
