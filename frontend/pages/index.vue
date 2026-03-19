<script setup lang="ts">
import {
  applyExplainabilityPresetSlot,
  activateExceptionSavedView,
  applyExceptionQueryPreset,
  applyExceptionActionOptimistic,
  applyRefundStatus,
  buildScenarioCompareMatrix,
  buildOperatorDecisionQueue,
  buildDeterministicExplainabilityFilterChips,
  buildExplainabilityComposerDraftFromSlot,
  buildExceptionBulkDiffInspector,
  buildExceptionQueryFromSavedView,
  buildExceptionActionIdempotencyKey,
  buildExceptionBulkConfirmation,
  buildExceptionBulkPreview,
  buildIncidentBookmarkShelf,
  canRefundStatus,
  classifyExceptionActionFailure,
  createExceptionSavedView,
  createDefaultExplainabilityPresetSlots,
  DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
  DEFAULT_EXCEPTION_QUERY_STATE,
  deleteExceptionSavedView,
  EXCEPTION_SAVED_VIEW_QUERY_KEY,
  EXCEPTION_SAVED_VIEW_STORAGE_KEY,
  filterSettlementMerchants,
  filterScenarioCompareMatrixRows,
  filterExceptionSimulationOutcomeRows,
  listExceptionQueryPresets,
  parseExceptionQueryState,
  pinExceptionSavedView,
  normalizeExceptionStatus,
  normalizeOptional,
  overwriteExplainabilityPresetSlot,
  prependExceptionAudit,
  resetExplainabilityComposerDraftSafe,
  renameExceptionSavedView,
  resolveExplainabilityPresetShortcut,
  resolveActiveExceptionPreset,
  resolveExceptionConflictShortcutDrilldown,
  resolveExceptionDiffInspectorEmptyState,
  buildExceptionSimulationOutcomePanel,
  buildReplayBookmarkCompareStrip,
  buildReplayDeltaInspector,
  buildOperatorTimelineScrubber,
  cycleOperatorTimelinePreset,
  restoreExceptionSavedViewState,
  serializeExceptionSavedViewState,
  serializeExceptionQueryState,
  filterIncidentBookmarkShelfItems,
  filterExceptionDiffInspectorRows,
  moveOperatorTimelineTickSelection,
  moveReplayBookmarkSelection,
  moveExceptionDiffInspectorFocus,
  moveOperatorDecisionQueueFocus,
  pinOperatorTimelinePresetSlot,
  reconcileReplayBookmarkCompareState,
  resetOperatorTimelineCompareDraftSafe,
  resetReplayBookmarkCompareDraftSafe,
  resolveOperatorTimelineShortcut,
  resolveReplayBookmarkCompareShortcut,
  resolveOperatorDecisionQueueShortcut,
  resolveReviewQueueLedgerShortcut,
  resolveDispatchCockpitShortcut,
  resolveReleaseReadinessShortcut,
  resolvePublicationWindowPlanShortcut,
  resolveDiagnosticsBaselineCompareShortcut,
  resolveRemediationManifestShortcut,
  resolveEvidencePacketLintShortcut,
  resolveManifestDiffShortcut,
  resolveAnomalyTriageShortcut,
  resolveReplayDiffInspectorShortcut,
  resolveEvidenceTimelineHeatmapShortcut,
  resetOperatorDecisionQueueDraftSafe,
  resetReviewQueueHandoffPacketDraftSafe,
  resetEvidencePacketLintChecklistDraftSafe,
  resetEvidenceGapChecklistDraftSafe,
  swapReplayBookmarkCompareSlots,
  applyEvidencePacketLintChecklistPrMode,
  validateExceptionActionInput,
  validateEvidencePacketLintChecklistDraft,
  validateEvidenceGapChecklistDraft,
  buildEvidencePacketLintConsole,
  buildCanonicalLinkAutofixPreview,
  buildManifestDiffViewer,
  buildAnomalyTriageBoard,
  buildRemediationRunbookTimelineBoard,
  buildEvidenceTimelineHeatmap,
  buildChecklistAutofixHints,
  buildReleaseReadinessSimulator,
  buildPublicationWindowPlanBoard,
  buildDiagnosticsBaselineCompareWorkspace,
  buildDiagnosticsDriftSummaryChips,
  buildRemediationManifestDrillboard,
  buildRemediationDependencyGraphInspector,
  buildRemediationManifestHandoffPacket,
  buildRegressionGateOverrideSimulator,
  buildReleaseReadinessEvidenceBadges,
  classifyBlockerEtaDrift,
  moveEvidencePacketLintSelection,
  moveManifestDiffSelection,
  moveEvidenceTimelineHeatmapSelection,
  moveRemediationRunbookTimelineSelection,
  movePublicationWindowLaneSelection,
  moveDiagnosticsBaselineDeltaSelection,
  moveRemediationManifestRowSelection,
  getDefaultEvidencePacketLintChecklistDraft,
  getDefaultEvidenceGapChecklistDraft,
  buildReviewQueueLedger,
  filterReviewQueueLedgerRows,
  moveReviewQueueLedgerSelection,
  moveReplayDiffInspectorSelection,
  filterReplayDiffInspectorRows,
  buildReplayDiffInspector,
  buildReviewQueueHandoffPacketDraftFromLedgerRow,
  validateReviewQueueHandoffPacketDraft,
  buildBlockerAwareDispatchCockpit,
  moveDispatchCockpitSelection,
  moveReleaseReadinessLaneSelection,
  getDefaultDispatchEvidenceDraft,
  applyDispatchEvidenceDraftPrMode,
  upsertDispatchEvidenceDraft,
  validateDispatchEvidenceDraft,
  getDefaultRemediationRunbookHandoffPackDraft,
  applyRemediationRunbookHandoffPackPrMode,
  getDefaultBlockedLaneHandoffDrillDraft,
  applyBlockedLaneHandoffDrillPrMode,
  validateBlockedLaneHandoffDrillDraft,
  resetBlockedLaneHandoffDrillDraft,
  validateRemediationRunbookHandoffPackDraft,
  resetRemediationRunbookHandoffPackDraft,
  validateRemediationPlaybookDraft,
  getDefaultRemediationPlaybookDraft,
  resetRemediationPlaybookDraftSafe,
  moveAnomalyTriageSelection,
  upsertRemediationPlaybookDraft,
  resolveRemediationRunbookShortcut,
} from '../utils/wave1';
import type { ExceptionConflictDrilldownKey } from '../utils/wave1';
import type { ExceptionSimulationReasonDrilldownKey } from '../utils/wave1';
import type { ScenarioCompareMatrixFilterKey } from '../utils/wave1';
import type { ExplainabilityComposerDraft, ExplainabilityPresetSlot } from '../utils/wave1';
import type { IncidentBookmarkFilterKey } from '../utils/wave1';
import type { OperatorTimelinePresetKey } from '../utils/wave1';
import type { ReviewQueueLedgerFilterKey } from '../utils/wave1';
import type { ReplayDiffInspectorFilterKey } from '../utils/wave1';
import type { EvidencePacketLintFilterKey } from '../utils/wave1';
import type { RemediationPlaybookCategory } from '../utils/wave1';

type InternalRole = 'admin' | 'ops' | 'support';

type Merchant = {
  id: string;
  name: string;
  webhookUrl?: string | null;
  createdAt?: string;
};

type ApiKeyAction = {
  at: string;
  action: 'created' | 'rotated' | 'revoked';
  merchantId: string;
  keyId: string;
  detail: string;
};

type ObservabilityAlert = {
  type: 'warning' | 'error';
  message: string;
};

type ObservabilityDecision = {
  at: string;
  reference: string;
  provider: string;
  reasonCode: string;
  algorithm: string;
  failoverCount: number;
};

type ObservabilityMargin = {
  provider: string;
  decisionCount: number;
  failedAttempts: number;
  failureRate: number;
  weightedScore: number | null;
};

type ObservabilityDashboard = {
  merchantId: string;
  timeframeHours: number;
  summary: { analyzedTransactions: number; decisions: number };
  providers: string[];
  alerts: ObservabilityAlert[];
  decisions: ObservabilityDecision[];
  margins: ObservabilityMargin[];
};

type PaymentRow = {
  reference: string;
  merchantId: string;
  status: 'CREATED' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: string;
  currency: string;
  providerName?: string | null;
  createdAt: string;
};

type RoutingTelemetry = {
  decision?: {
    algorithm?: string;
    reasonCode?: string;
    provider?: string;
    scores?: Array<{ providerName?: string; latencyMs?: number }>;
  };
};

type SettlementMerchantSummary = {
  merchantId: string;
  paidDepositAmount: number;
  paidWithdrawAmount: number;
  refundedAmount: number;
  netSettledAmount: number;
  transactionCount: number;
};

type SettlementMismatch = {
  transactionId: string;
  transactionReference: string;
  merchantId: string;
  status: PaymentRow['status'];
  amount: number;
  currency: string;
  reason: 'paid_without_success_callback' | 'failed_with_success_callback' | 'stuck_non_terminal';
};

type SettlementReport = {
  reportDate: string;
  windowStart: string;
  windowEnd: string;
  generatedAt: string;
  merchants: SettlementMerchantSummary[];
  mismatches: SettlementMismatch[];
};

type SettlementExceptionStatus = 'open' | 'investigating' | 'resolved' | 'ignored';
type SettlementExceptionAction = 'resolve' | 'ignore';
type ExceptionFixtureMode = 'api' | 'loading' | 'empty' | 'permission_error' | 'stale_conflict' | 'action_failure_retry';

type SettlementExceptionRow = {
  id: string;
  merchantId: string;
  provider: string;
  status: SettlementExceptionStatus;
  version: number;
  fingerprint: string;
  mismatchCount: number;
  openedAt: string;
  updatedAt: string;
};

type SettlementExceptionAudit = {
  id: string;
  action: SettlementExceptionAction;
  reason: string;
  note: string | null;
  actor: string;
  createdAt: string;
};

type SettlementExceptionDetail = SettlementExceptionRow & {
  windowStart: string;
  windowEnd: string;
  summary?: {
    ledgerAmount?: number;
    providerAmount?: number;
    deltaAmount?: number;
    currency?: string;
  } | null;
  mismatches: Array<{
    eventKey: string;
    title: string;
    detail: string;
    amount?: number | null;
    currency?: string | null;
    occurredAt?: string | null;
  }>;
  audits: SettlementExceptionAudit[];
};

type WebhookDelivery = {
  id: string;
  eventType: string;
  status: 'PENDING' | 'DELIVERED' | 'FAILED';
  attemptCount: number;
  maxAttempts: number;
  transaction?: { reference?: string; merchantId?: string };
  lastError?: string | null;
  createdAt: string;
  nextRetryAt?: string | null;
};

const { request } = useGatewayApi();
const route = useRoute();
const router = useRouter();
const exceptionPresets = listExceptionQueryPresets();

const auth = reactive({
  internalToken: 'dev-internal-token',
  actorRole: 'admin' as InternalRole,
});

const onboardingForm = reactive({
  name: '',
  webhookUrl: '',
  kycStatus: 'pending',
});

const onboardingChecklist = reactive({
  webhookEndpointAdded: false,
  callbackSecretStored: false,
  retryPolicyConfirmed: false,
});

const onboardingState = reactive({ loading: false, message: '', error: '' });
const merchants = ref<Merchant[]>([]);
const selectedMerchantId = ref('');

const apiKeyForm = reactive({ merchantId: '', name: 'primary-key' });
const apiKeyActions = ref<ApiKeyAction[]>([]);
const apiKeyState = reactive({ loading: false, message: '', error: '' });
const keyActionForm = reactive({ keyId: '' });
const latestRawApiKey = ref('');

const routingControls = reactive({
  policyMode: 'policy' as 'policy' | 'legacy' | 'shadow',
  primaryProvider: 'mock-a',
  fallbackProvider: 'mock-b',
});

const routingState = reactive({
  loading: false,
  message: 'Select merchant and sync to fetch active routing strategy.',
  error: '',
  backendAlgorithm: '-',
  backendReasonCode: '-',
  backendProvider: '-',
});

const healthFilters = reactive({
  merchantId: '',
  timeframeHours: 24,
  provider: '',
  autoRefreshSec: 15,
});

const healthState = reactive({ loading: false, message: 'Set merchant ID to load live metrics.', error: '' });
const healthData = ref<ObservabilityDashboard | null>(null);
const latencyP95Ms = ref<number | null>(null);
const autoRefreshHandle = ref<number | null>(null);

const opsFilters = reactive({
  merchantId: '',
  provider: '',
  status: '',
  startDate: '',
  endDate: '',
});

const opsState = reactive({ loading: false, message: 'Apply filters to load reconciliation feed.', error: '' });
const opsRows = ref<PaymentRow[]>([]);
const disputeMap = reactive<Record<string, 'open' | 'resolved'>>({});
const refundForm = reactive({ reference: '', reason: '' });
const refundState = reactive({ loading: false, message: '', error: '' });

const settlementFilters = reactive({
  date: new Date().toISOString().slice(0, 10),
  merchantId: '',
});
const settlementState = reactive({
  loading: false,
  message: 'Load settlement summary to review net settled amounts.',
  error: '',
});
const settlementReport = ref<SettlementReport | null>(null);
const exceptionFilters = reactive({
  merchantId: '',
  provider: '',
  status: 'open' as '' | SettlementExceptionStatus,
  startDate: '',
  endDate: '',
  page: 1,
  pageSize: 10,
});
const exceptionState = reactive({
  loading: false,
  message: 'Load exception list to start settlement triage.',
  error: '',
});
const exceptionRows = ref<SettlementExceptionRow[]>([]);
const selectedExceptionIds = ref<string[]>([]);
const exceptionPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
});
const selectedExceptionId = ref('');
const exceptionDetailState = reactive({
  loading: false,
  message: 'Select an exception to view mismatch breakdown.',
  error: '',
});
const exceptionDetail = ref<SettlementExceptionDetail | null>(null);
const exceptionAction = reactive({
  open: false,
  action: 'resolve' as SettlementExceptionAction,
  reason: '',
  note: '',
  loading: false,
  error: '',
});
const exceptionFixtureMode = ref<ExceptionFixtureMode>('api');
const exceptionFixtureRetryCount = ref(0);
const bulkPreviewConfirmState = reactive({
  message: '',
  error: '',
});
const bulkPreviewDrawer = reactive({
  open: false,
  action: 'resolve' as SettlementExceptionAction,
  error: '',
});
const staleExceptionSelectionCount = ref(0);
const exceptionQueryRecovery = reactive({
  active: false,
  message: '',
});
const exceptionSavedViewState = ref(DEFAULT_EXCEPTION_SAVED_VIEW_STATE);
const exceptionSavedViewDraftName = ref('');
const exceptionSavedViewRenameDraft = reactive<Record<string, string>>({});
const exceptionSavedViewRecovery = reactive({
  active: false,
  message: '',
});
const activeExceptionPreset = computed(() => resolveActiveExceptionPreset({
  merchantId: exceptionFilters.merchantId,
  provider: exceptionFilters.provider,
  status: exceptionFilters.status,
  startDate: exceptionFilters.startDate,
  endDate: exceptionFilters.endDate,
  page: exceptionPagination.page,
  pageSize: exceptionFilters.pageSize,
  preset: '',
}));
const selectedExceptionRows = computed(() => exceptionRows.value.filter((row) => selectedExceptionIds.value.includes(row.id)));
const activeBookmarkFilter = ref<IncidentBookmarkFilterKey>('all');
const activeReplayBookmarkId = ref('');
const replayComparePrimaryBookmarkId = ref('');
const replayCompareSecondaryBookmarkId = ref('');
const replayCompareState = reactive({
  message: '',
  error: '',
});
const activeTimelineTickId = ref('');
const activeTimelinePreset = ref<OperatorTimelinePresetKey>('baseline');
const timelineBaselineTickId = ref('');
const timelineCandidateTickId = ref('');
const timelineOverrideTickId = ref('');
const timelineScrubberState = reactive({
  message: '',
  error: '',
});
const replayBookmarkFilterOptions: Array<{ key: IncidentBookmarkFilterKey; label: string }> = [
  { key: 'all', label: 'all' },
  { key: 'critical', label: 'critical' },
  { key: 'high', label: 'high' },
  { key: 'medium', label: 'medium' },
  { key: 'low', label: 'low' },
];
const incidentBookmarkShelf = computed(() => buildIncidentBookmarkShelf(selectedExceptionRows.value));
const filteredIncidentBookmarkItems = computed(() => filterIncidentBookmarkShelfItems(
  incidentBookmarkShelf.value.items,
  activeBookmarkFilter.value,
));
const replayCompareStrip = computed(() => buildReplayBookmarkCompareStrip({
  items: filteredIncidentBookmarkItems.value,
  activeBookmarkId: activeReplayBookmarkId.value,
  primaryBookmarkId: replayComparePrimaryBookmarkId.value,
  secondaryBookmarkId: replayCompareSecondaryBookmarkId.value,
}));
const replayDeltaInspector = computed(() => buildReplayDeltaInspector({
  items: filteredIncidentBookmarkItems.value,
  primaryBookmarkId: replayComparePrimaryBookmarkId.value,
  secondaryBookmarkId: replayCompareSecondaryBookmarkId.value,
}));
const activeReplayDiffFilter = ref<ReplayDiffInspectorFilterKey>('all');
const activeReplayDiffRowId = ref('');
const replayDiffState = reactive({
  message: '',
  error: '',
});
const evidenceGapChecklistDraft = ref(getDefaultEvidenceGapChecklistDraft());
const evidenceGapChecklistMissingFields = ref<Set<string>>(new Set());
const replayDiffPanelRef = ref<HTMLElement | null>(null);
const evidenceGapBranchInputRef = ref<HTMLInputElement | null>(null);
const replayDiffFilterOptions: Array<{ key: ReplayDiffInspectorFilterKey; label: string }> = [
  { key: 'all', label: 'all' },
  { key: 'added', label: 'added' },
  { key: 'removed', label: 'removed' },
  { key: 'modified', label: 'modified' },
];
const replaySnapshotRowsByBookmarkId = computed(() => {
  const map = new Map<string, Array<{
    id: string;
    lineageDepth: number;
    sourceIssueId: string;
    artifactPath: string;
    payload: string;
  }>>();
  for (const item of filteredIncidentBookmarkItems.value) {
    map.set(item.id, [
      {
        id: `${item.id}-root`,
        lineageDepth: 0,
        sourceIssueId: 'ONE-253',
        artifactPath: `artifacts/one-253/${item.id}-lineage.json`,
        payload: `${item.status}|${item.amount}|${item.riskFlags.join(',')}`,
      },
      {
        id: `${item.id}-evidence`,
        lineageDepth: 1,
        sourceIssueId: 'ONE-254',
        artifactPath: `artifacts/one-254/${item.id}-evidence.md`,
        payload: `${item.title}|${item.updatedAt}`,
      },
      {
        id: `${item.id}-qa`,
        lineageDepth: 1,
        sourceIssueId: 'ONE-241',
        artifactPath: `artifacts/one-241/${item.id}-qa-checklist.md`,
        payload: item.riskFlags.join(','),
      },
    ]);
  }
  return map;
});
const replayDiffInspector = computed(() => buildReplayDiffInspector({
  primarySnapshotId: replayComparePrimaryBookmarkId.value,
  secondarySnapshotId: replayCompareSecondaryBookmarkId.value,
  primaryRows: replaySnapshotRowsByBookmarkId.value.get(replayComparePrimaryBookmarkId.value) ?? [],
  secondaryRows: replaySnapshotRowsByBookmarkId.value.get(replayCompareSecondaryBookmarkId.value) ?? [],
  activeRowId: activeReplayDiffRowId.value,
  activeFilter: activeReplayDiffFilter.value,
}));
const operatorTimelineScrubber = computed(() => buildOperatorTimelineScrubber({
  items: filteredIncidentBookmarkItems.value,
  activeTickId: activeTimelineTickId.value,
  activePreset: activeTimelinePreset.value,
  baselineTickId: timelineBaselineTickId.value,
  candidateTickId: timelineCandidateTickId.value,
  overrideTickId: timelineOverrideTickId.value,
}));
const bulkExceptionPreview = computed(() => buildExceptionBulkPreview(selectedExceptionRows.value));
const bulkDiffInspector = computed(() => buildExceptionBulkDiffInspector(selectedExceptionRows.value));
const bulkSimulationOutcome = computed(() => buildExceptionSimulationOutcomePanel(selectedExceptionRows.value));
const scenarioCompareMatrix = computed(() => buildScenarioCompareMatrix(selectedExceptionRows.value));
const activeScenarioMatrixFilter = ref<ScenarioCompareMatrixFilterKey>('all');
const filteredScenarioMatrixRows = computed(() => filterScenarioCompareMatrixRows(
  scenarioCompareMatrix.value.rows,
  activeScenarioMatrixFilter.value,
));
const scenarioMatrixFilterOptions = computed(() => ([
  { key: 'all' as ScenarioCompareMatrixFilterKey, label: 'all', count: scenarioCompareMatrix.value.rows.length },
  ...scenarioCompareMatrix.value.groups.map((group) => ({
    key: group.key as ScenarioCompareMatrixFilterKey,
    label: group.label,
    count: group.rowCount,
  })),
]));
const decisionQueueState = reactive({
  message: '',
  error: '',
});
const reviewQueueLedgerState = reactive({
  message: '',
  error: '',
});
const dispatchCockpitState = reactive({
  message: '',
  error: '',
});
const releaseReadinessState = reactive({
  message: '',
  error: '',
});
const publicationWindowState = reactive({
  message: '',
  error: '',
});
const diagnosticsBaselineState = reactive({
  message: '',
  error: '',
});
const remediationManifestState = reactive({
  message: '',
  error: '',
});
const activeReleaseReadinessLaneId = ref('');
const activePublicationWindowLaneId = ref('');
const activeDiagnosticsDeltaId = ref('');
const activeRemediationManifestRowId = ref('');
const activeOverrideScenarioId = ref('');
const remediationManifestDependencyGraphOpen = ref(false);
const remediationManifestExportOpen = ref(false);
const remediationManifestDependencyLinksText = ref('/ONE/issues/ONE-280\n/ONE/issues/ONE-279\n/ONE/issues/ONE-269\n/ONE/issues/ONE-241');
const overrideScenarioLinksText = ref('');
const overrideSimulatorOpen = ref(false);
const diagnosticsHandoffComposerOpen = ref(false);
const diagnosticsHandoffDraft = ref(getDefaultEvidencePacketLintChecklistDraft());
const diagnosticsHandoffMissingFields = ref<Set<string>>(new Set());
const releaseReadinessSnapshots = ref<Array<{
  laneId: string;
  issueIdentifier: string;
  savedAt: string;
}>>([]);
const publicationWindowScoreExplainerOpen = ref(false);
const publicationWindowDependencyGatesOpen = ref(false);
const activeDispatchCockpitRowId = ref('');
const dispatchDraftBank = ref<Array<ReturnType<typeof getDefaultDispatchEvidenceDraft>>>([]);
const dispatchDraft = ref(getDefaultDispatchEvidenceDraft({
  laneId: '',
  issueIdentifier: '',
  laneType: 'dispatch_queue',
}));
const dispatchDraftMissingFields = ref<Set<string>>(new Set());
const activeReviewQueueFilter = ref<ReviewQueueLedgerFilterKey>('all');
const activeReviewQueueRowId = ref('');
const activeEvidencePacketLintFilter = ref<EvidencePacketLintFilterKey>('all');
const activeEvidencePacketLintFindingId = ref('');
const activeEvidenceTimelineLane = ref<ReviewQueueLedgerFilterKey>('all');
const activeEvidenceTimelineRowId = ref('');
const reviewQueueHandoffDraft = ref(buildReviewQueueHandoffPacketDraftFromLedgerRow({ activeRow: null }));
const reviewQueueHandoffValidation = reactive({
  message: '',
  error: '',
});
const reviewQueueHandoffMissingFields = ref<Set<string>>(new Set());
const evidencePacketLintState = reactive({
  message: '',
  error: '',
});
const evidencePacketLintChecklistDraft = ref(getDefaultEvidencePacketLintChecklistDraft());
const evidencePacketLintChecklistMissingFields = ref<Set<string>>(new Set());
const reviewQueueHandoffPanelRef = ref<HTMLElement | null>(null);
const reviewQueueHandoffBranchInputRef = ref<HTMLInputElement | null>(null);
const dispatchCockpitPanelRef = ref<HTMLElement | null>(null);
const releaseReadinessPanelRef = ref<HTMLElement | null>(null);
const publicationWindowPanelRef = ref<HTMLElement | null>(null);
const diagnosticsBaselinePanelRef = ref<HTMLElement | null>(null);
const remediationManifestPanelRef = ref<HTMLElement | null>(null);
const dispatchDraftBranchInputRef = ref<HTMLInputElement | null>(null);
const evidencePacketLintPanelRef = ref<HTMLElement | null>(null);
const evidencePacketLintBranchInputRef = ref<HTMLInputElement | null>(null);
const evidenceTimelineHeatmapPanelRef = ref<HTMLElement | null>(null);
const anomalyTriageBoardPanelRef = ref<HTMLElement | null>(null);
const remediationPlaybookOwnerInputRef = ref<HTMLInputElement | null>(null);
const remediationPlaybookComposerOpen = ref(false);
const remediationPlaybookState = reactive({
  message: '',
  error: '',
});
const remediationRunbookState = reactive({
  message: '',
  error: '',
});
const remediationRunbookComposerOpen = ref(false);
const activeRemediationRunbookStepId = ref('');
const remediationRunbookTimelinePanelRef = ref<HTMLElement | null>(null);
const remediationRunbookBranchInputRef = ref<HTMLInputElement | null>(null);
const remediationRunbookHandoffMissingFields = ref<Set<string>>(new Set());
const remediationRunbookHandoffDraft = ref(getDefaultRemediationRunbookHandoffPackDraft({
  stepId: '',
  issueIdentifier: '',
}));
const manifestDiffState = reactive({
  message: '',
  error: '',
});
const manifestDiffPanelRef = ref<HTMLElement | null>(null);
const manifestDiffBranchInputRef = ref<HTMLInputElement | null>(null);
const activeManifestDiffRowId = ref('');
const manifestHandoffDrillOpen = ref(false);
const manifestHandoffMissingFields = ref<Set<string>>(new Set());
const manifestHandoffDrillDraft = ref(getDefaultBlockedLaneHandoffDrillDraft({
  laneId: '',
  issueIdentifier: '',
}));
const activeAnomalyTriageRowId = ref('');
const remediationPlaybookDraftBank = ref<Array<ReturnType<typeof getDefaultRemediationPlaybookDraft>>>([]);
const remediationPlaybookDraft = ref(getDefaultRemediationPlaybookDraft({
  anomalyId: '',
  issueIdentifier: '',
  category: 'missing',
}));
const remediationPlaybookMissingFields = ref<Set<string>>(new Set());
const queueDraftRowIds = ref<string[]>([]);
const activeDecisionQueueItemId = ref('');
const remediationCategoryCycle: RemediationPlaybookCategory[] = [
  'missing',
  'stale',
  'malformed',
  'dependency-gap',
  'blocker-drift',
];
const anomalyFieldPathByCategory: Record<RemediationPlaybookCategory, string> = {
  missing: 'evidence.branch',
  stale: 'timeline.updatedAt',
  malformed: 'packet.fullSha',
  'dependency-gap': 'dependencyIssueLinks',
  'blocker-drift': 'blocker.eta',
};
const operatorDecisionQueue = computed(() => buildOperatorDecisionQueue({
  matrixRows: scenarioCompareMatrix.value.rows,
  stagedRowIds: queueDraftRowIds.value,
}));
const reviewQueueLedger = computed(() => buildReviewQueueLedger({
  rows: selectedExceptionRows.value.map((row) => {
    const priority = row.mismatchCount >= 4
      ? 'critical'
      : row.mismatchCount >= 2
        ? 'high'
        : row.status === 'investigating'
          ? 'medium'
          : 'low';
    return {
      id: row.id,
      merchantId: row.merchantId,
      provider: row.provider,
      lanePriority: priority,
      updatedAt: row.updatedAt,
      title: `Exception ${row.id} (${row.status})`,
    };
  }),
  activeRowId: activeReviewQueueRowId.value,
}));
const dispatchCockpitSourceRows = computed(() => reviewQueueLedger.value.rows.map((row, index) => {
  const laneType = index % 3 === 0
    ? 'release_readiness'
    : index % 3 === 1
      ? 'evidence_lint'
      : 'qa_verification';
  return {
    id: `dispatch-${row.id}-${laneType}`,
    issueIdentifier: row.id.toUpperCase(),
    laneType,
    blockerSeverity: row.priority,
    updatedAt: row.eventTime,
    blocked: row.priority !== 'low',
    title: `${row.title} (${laneType})`,
    blockerReason: row.priority === 'low'
      ? 'Lane is actionable.'
      : 'GitHub publish credentials unresolved for this lane.',
  };
}));
const dispatchCockpit = computed(() => buildBlockerAwareDispatchCockpit({
  rows: dispatchCockpitSourceRows.value,
  activeRowId: activeDispatchCockpitRowId.value,
}));
const releaseReadinessSourceLanes = computed(() => reviewQueueLedger.value.rows.map((row) => {
  const riskScore = row.priority === 'critical'
    ? 90
    : row.priority === 'high'
      ? 70
      : row.priority === 'medium'
        ? 45
        : 20;
  const readinessScore = row.priority === 'critical'
    ? 55
    : row.priority === 'high'
      ? 70
      : row.priority === 'medium'
        ? 82
        : 93;
  const baselineMs = new Date(row.eventTime).getTime();
  const baselineEta = Number.isFinite(baselineMs)
    ? new Date(baselineMs + (45 * 60000)).toISOString()
    : row.eventTime;
  const latestMs = Number.isFinite(baselineMs)
    ? new Date(baselineMs + ((45 + (row.priority === 'critical' ? 115 : row.priority === 'high' ? 52 : 12)) * 60000)).toISOString()
    : row.eventTime;
  const laneType = 'release_readiness';
  const laneId = `readiness-${row.id}`;
  const issueIdentifier = row.id.toUpperCase();
  const draft = dispatchDraftBank.value.find((draftRow) => draftRow.issueIdentifier === issueIdentifier)
    ?? getDefaultDispatchEvidenceDraft({
      laneId,
      issueIdentifier,
      laneType,
    });
  return {
    id: laneId,
    issueIdentifier,
    laneType,
    readinessScore,
    blockerRisk: riskScore,
    etaBaseline: baselineEta,
    etaLatest: latestMs,
    draft,
  };
}));
const releaseReadinessSimulator = computed(() => buildReleaseReadinessSimulator({
  lanes: releaseReadinessSourceLanes.value,
  activeLaneId: activeReleaseReadinessLaneId.value,
}));
const publicationWindowSourceRows = computed(() => releaseReadinessSimulator.value.rows.map((lane, index) => {
  const prefix = lane.issueIdentifier.split('-')[0] ?? 'ONE';
  return {
    id: `pub-window-${lane.id}`,
    issueIdentifier: lane.issueIdentifier,
    bundleCode: `bundle-${String(index + 1).padStart(2, '0')}`,
    windowPriorityWeight: index + 1,
    blockerRisk: lane.blockerRisk,
    etaDriftMinutes: lane.etaDriftMinutes,
    releaseBundleScore: {
      completenessScore: lane.readinessScore,
      blockerDriftPenalty: Math.min(40, Math.round(Math.max(0, lane.etaDriftMinutes) / 15)),
      dependencyRiskPenalty: index % 3 === 0 ? 0 : index % 3 === 1 ? 15 : 30,
      finalScore: Math.max(0, Math.min(100, lane.readinessScore - (index % 3 === 0 ? 0 : index % 3 === 1 ? 15 : 30))),
      scoreBand: index % 3 === 0 ? 'ready_now' : index % 3 === 1 ? 'ready_soon' : 'hold',
    },
    dependencyGates: [
      {
        issueIdentifier: `ONE-${241 + (index % 4)}`,
        status: index % 2 === 0 ? 'resolved' : 'unresolved',
        unresolvedReason: index % 2 === 0 ? '' : 'Awaiting upstream QA evidence sign-off.',
        issueLink: `/${prefix}/issues/ONE-${241 + (index % 4)}`,
        documentLink: `/${prefix}/issues/ONE-${241 + (index % 4)}#document-plan`,
        commentLink: index % 2 === 0 ? '' : `/${prefix}/issues/ONE-${241 + (index % 4)}#comment-${100 + index}`,
      },
    ],
  };
}));
const publicationWindowPlanBoard = computed(() => buildPublicationWindowPlanBoard({
  rows: publicationWindowSourceRows.value,
  activeLaneId: activePublicationWindowLaneId.value,
}));
const activePublicationWindowLane = computed(() => publicationWindowPlanBoard.value.rows
  .find((lane) => lane.id === activePublicationWindowLaneId.value) ?? null);
const activeReleaseReadinessLane = computed(() => releaseReadinessSimulator.value.rows
  .find((row) => row.id === activeReleaseReadinessLaneId.value) ?? null);
const activeDispatchCockpitRow = computed(() => dispatchCockpit.value.rows
  .find((row) => row.id === activeDispatchCockpitRowId.value) ?? null);
const dispatchDraftCanonicalPreview = computed(() => buildCanonicalLinkAutofixPreview({
  linksText: dispatchDraft.value.dependencyIssueLinksText,
}));
const remediationRunbookTimelineSourceRows = computed(() => reviewQueueLedger.value.rows.flatMap((row, index) => (
  [1, 2].map((stepIndex) => ({
    id: `runbook-${row.id}-${stepIndex}`,
    issueIdentifier: row.id.toUpperCase(),
    stepIndex,
    severityWeight: row.priority === 'critical'
      ? 100 - (stepIndex * 4)
      : row.priority === 'high'
        ? 80 - (stepIndex * 4)
        : row.priority === 'medium'
          ? 60 - (stepIndex * 4)
          : 40 - (stepIndex * 4),
    etaDriftMinutes: (index + 1) * 12 + (stepIndex * (row.priority === 'critical' ? 20 : 8)),
    summary: `Step ${stepIndex} for ${row.id.toUpperCase()}: align remediation lane handoff evidence.`,
    owner: stepIndex % 2 === 0 ? 'Frontend Engineer' : 'Ops',
  }))
)));
const remediationRunbookTimelineBoard = computed(() => buildRemediationRunbookTimelineBoard({
  rows: remediationRunbookTimelineSourceRows.value,
  activeRowId: activeRemediationRunbookStepId.value,
}));
const activeRemediationRunbookStep = computed(() => remediationRunbookTimelineBoard.value.rows
  .find((row) => row.id === activeRemediationRunbookStepId.value) ?? null);
const remediationRunbookCanonicalPreview = computed(() => buildCanonicalLinkAutofixPreview({
  linksText: remediationRunbookHandoffDraft.value.dependencyIssueLinksText,
}));
const manifestDiffSourceRows = computed(() => reviewQueueLedger.value.rows.flatMap((row, index) => {
  const severityWeight = row.priority === 'critical'
    ? 10
    : row.priority === 'high'
      ? 20
      : row.priority === 'medium'
        ? 30
        : 40;
  const issueIdentifier = row.id.toUpperCase();
  return [
    {
      id: `manifest-${row.id}-branch`,
      severityWeight,
      deltaClassWeight: 10,
      issueIdentifier,
      fieldPath: 'packet.branch',
      deltaClass: 'missing',
      baselineValue: 'feature/main-stabilize',
      currentValue: '',
      summary: `${issueIdentifier} is missing branch metadata in active manifest.`,
    },
    {
      id: `manifest-${row.id}-artifact`,
      severityWeight,
      deltaClassWeight: 20,
      issueIdentifier,
      fieldPath: 'packet.artifactPath',
      deltaClass: 'modified',
      baselineValue: `artifacts/${row.id.toLowerCase()}/baseline-pack.md`,
      currentValue: `artifacts/${row.id.toLowerCase()}/active-pack.md`,
      summary: `${issueIdentifier} artifact path differs from baseline manifest packet.`,
    },
    {
      id: `manifest-${row.id}-owner`,
      severityWeight,
      deltaClassWeight: index % 2 === 0 ? 30 : 40,
      issueIdentifier,
      fieldPath: 'packet.blockerOwner',
      deltaClass: index % 2 === 0 ? 'unexpected' : 'modified',
      baselineValue: 'GitHub Admin / DevOps',
      currentValue: index % 2 === 0 ? 'Frontend Engineer' : 'GitHub Admin / DevOps',
      summary: `${issueIdentifier} blocker ownership metadata requires handoff confirmation.`,
    },
  ];
}));
const manifestDiffViewer = computed(() => buildManifestDiffViewer({
  rows: manifestDiffSourceRows.value,
  activeRowId: activeManifestDiffRowId.value,
}));
const activeManifestDiffRow = computed(() => manifestDiffViewer.value.rows
  .find((row) => row.id === activeManifestDiffRowId.value) ?? null);
const manifestHandoffCanonicalPreview = computed(() => buildCanonicalLinkAutofixPreview({
  linksText: manifestHandoffDrillDraft.value.dependencyIssueLinksText,
}));
const anomalyTriageSourceRows = computed(() => reviewQueueLedger.value.rows.map((row, index) => {
  const category = remediationCategoryCycle[index % remediationCategoryCycle.length];
  const severityWeight = row.priority === 'critical'
    ? 100
    : row.priority === 'high'
      ? 80
      : row.priority === 'medium'
        ? 50
        : 20;
  return {
    id: `anomaly-${row.id}-${category}`,
    issueIdentifier: row.id.toUpperCase(),
    fieldPath: anomalyFieldPathByCategory[category],
    category,
    severityWeight,
    stalenessMinutes: (index + 1) * 13 + (row.priority === 'critical' ? 34 : row.priority === 'high' ? 21 : 8),
    summary: `${row.title} requires ${category} remediation in ${anomalyFieldPathByCategory[category]}.`,
  };
}));
const anomalyTriageBoard = computed(() => buildAnomalyTriageBoard({
  rows: anomalyTriageSourceRows.value,
  activeRowId: activeAnomalyTriageRowId.value,
}));
const activeAnomalyTriageRow = computed(() => anomalyTriageBoard.value.rows
  .find((row) => row.id === activeAnomalyTriageRowId.value) ?? null);
const remediationPlaybookCanonicalPreview = computed(() => buildCanonicalLinkAutofixPreview({
  linksText: remediationPlaybookDraft.value.dependencyIssueLinksText,
}));
const reviewQueueFilterOptions = computed(() => ([
  { key: 'all' as ReviewQueueLedgerFilterKey, label: 'all', count: reviewQueueLedger.value.rows.length },
  { key: 'critical' as ReviewQueueLedgerFilterKey, label: 'critical', count: reviewQueueLedger.value.priorityCounts.critical },
  { key: 'high' as ReviewQueueLedgerFilterKey, label: 'high', count: reviewQueueLedger.value.priorityCounts.high },
  { key: 'medium' as ReviewQueueLedgerFilterKey, label: 'medium', count: reviewQueueLedger.value.priorityCounts.medium },
  { key: 'low' as ReviewQueueLedgerFilterKey, label: 'low', count: reviewQueueLedger.value.priorityCounts.low },
]));
const filteredReviewQueueLedgerRows = computed(() => filterReviewQueueLedgerRows(
  reviewQueueLedger.value.rows,
  activeReviewQueueFilter.value,
));
const activeReviewQueueRow = computed(() => reviewQueueLedger.value.rows
  .find((row) => row.id === activeReviewQueueRowId.value) ?? null);
const diagnosticsBaselineDigestRows = computed(() => reviewQueueLedger.value.rows.flatMap((row, index) => {
  const sourceIssueIdentifier = row.id.toUpperCase();
  const sectionWeight = row.priority === 'critical' ? 1 : row.priority === 'high' ? 2 : row.priority === 'medium' ? 3 : 4;
  const bundleCode = index % 2 === 0 ? 'contract-core' : 'contract-edge';
  return [
    {
      sourceIssueIdentifier,
      bundleCode,
      sectionWeight,
      fieldPath: 'sections.requiredField',
      fieldTypeWeight: 1,
      driftReasonCode: 'missing_required_field',
      value: `required:${sourceIssueIdentifier.toLowerCase().replace('-', '_')}`,
    },
    {
      sourceIssueIdentifier,
      bundleCode,
      sectionWeight,
      fieldPath: 'sections.eventType',
      fieldTypeWeight: 2,
      driftReasonCode: 'enum_drift',
      value: row.priority === 'critical' ? 'capture_failed' : 'capture_pending',
    },
    {
      sourceIssueIdentifier,
      bundleCode,
      sectionWeight,
      fieldPath: 'sections.payloadChecksum',
      fieldTypeWeight: 3,
      driftReasonCode: 'checksum_mismatch',
      value: `baseline-${index + 1}-${sectionWeight}`,
    },
  ];
}));
const diagnosticsCandidateDigestRows = computed(() => reviewQueueLedger.value.rows.flatMap((row, index) => {
  const sourceIssueIdentifier = row.id.toUpperCase();
  const sectionWeight = row.priority === 'critical' ? 1 : row.priority === 'high' ? 2 : row.priority === 'medium' ? 3 : 4;
  const bundleCode = index % 2 === 0 ? 'contract-core' : 'contract-edge';
  return [
    {
      sourceIssueIdentifier,
      bundleCode,
      sectionWeight,
      fieldPath: 'sections.requiredField',
      fieldTypeWeight: 1,
      driftReasonCode: 'missing_required_field',
      value: index % 3 === 0 ? `required:${sourceIssueIdentifier.toLowerCase().replace('-', '_')}:v2` : `required:${sourceIssueIdentifier.toLowerCase().replace('-', '_')}`,
    },
    {
      sourceIssueIdentifier,
      bundleCode,
      sectionWeight,
      fieldPath: 'sections.eventType',
      fieldTypeWeight: 2,
      driftReasonCode: 'enum_drift',
      value: row.priority === 'critical' || index % 2 === 0 ? 'capture_failed' : 'capture_pending',
    },
    {
      sourceIssueIdentifier,
      bundleCode,
      sectionWeight,
      fieldPath: 'sections.payloadChecksum',
      fieldTypeWeight: 3,
      driftReasonCode: 'checksum_mismatch',
      value: index % 2 === 0 ? `candidate-${index + 1}-${sectionWeight}` : `baseline-${index + 1}-${sectionWeight}`,
    },
  ];
}));
const diagnosticsBaselineCompareWorkspace = computed(() => buildDiagnosticsBaselineCompareWorkspace({
  baselineDigest: diagnosticsBaselineDigestRows.value,
  candidateDigest: diagnosticsCandidateDigestRows.value,
  activeDeltaId: activeDiagnosticsDeltaId.value,
}));
const diagnosticsDriftSummaryChips = computed(() => buildDiagnosticsDriftSummaryChips(
  diagnosticsBaselineCompareWorkspace.value.rows,
));
const activeDiagnosticsDelta = computed(() => diagnosticsBaselineCompareWorkspace.value.rows
  .find((row) => row.id === activeDiagnosticsDeltaId.value) ?? null);
const regressionGateOverrideSimulator = computed(() => buildRegressionGateOverrideSimulator({
  rows: diagnosticsBaselineCompareWorkspace.value.rows.map((row) => ({
    id: `scenario-${row.id}`,
    issueIdentifier: row.issueIdentifier,
    currentGate: row.baselineValue,
    overrideGate: row.candidateValue,
    reasonCodes: [
      row.changed ? 'eta_drift' : '',
      row.candidateValue === 'block' ? 'dependency_open' : '',
      row.issueIdentifier.endsWith('241') ? 'missing_evidence' : '',
      row.bundleCode.includes('edge') ? 'artifact_gap' : '',
    ].filter((code) => Boolean(code)),
  })),
  activeScenarioId: activeOverrideScenarioId.value,
}));
const activeOverrideScenario = computed(() => regressionGateOverrideSimulator.value.scenarios
  .find((scenario) => scenario.id === activeOverrideScenarioId.value) ?? null);
const overrideScenarioLinkPreview = computed(() => buildCanonicalLinkAutofixPreview({
  linksText: overrideScenarioLinksText.value,
}));
const diagnosticsHandoffLinkPreview = computed(() => buildCanonicalLinkAutofixPreview({
  linksText: diagnosticsHandoffDraft.value.dependencyIssueLinksText,
}));
const diagnosticsHandoffPacketMarkdown = computed(() => {
  const normalizedLinks = diagnosticsHandoffLinkPreview.value.rows.map((row) => row.normalized);
  const activeIssue = activeDiagnosticsDelta.value?.sourceIssueIdentifier || 'UNKNOWN-0';
  const bundleCode = activeDiagnosticsDelta.value?.bundleCode || 'contract-core';
  const lines = [
    '## Diagnostics Handoff Evidence Packet',
    '',
    `- Issue: ${activeIssue}`,
    `- Bundle: ${bundleCode}`,
    `- Branch: ${diagnosticsHandoffDraft.value.branch.trim() || '-'}`,
    `- Full SHA: ${diagnosticsHandoffDraft.value.fullSha.trim() || '-'}`,
    `- Test Command: ${diagnosticsHandoffDraft.value.testCommand.trim() || '-'}`,
    `- Artifact Path: ${diagnosticsHandoffDraft.value.artifactPath.trim() || '-'}`,
    '',
    '### Canonical Links',
    ...(normalizedLinks.length ? normalizedLinks.map((link) => `- ${link}`) : ['- (none)']),
  ];
  if (diagnosticsHandoffDraft.value.prMode === 'no_pr_yet') {
    lines.push(
      '',
      '### No PR Yet Blocker',
      `- Blocker Owner: ${diagnosticsHandoffDraft.value.blockerOwner.trim() || '-'}`,
      `- Blocker ETA: ${diagnosticsHandoffDraft.value.blockerEta.trim() || '-'}`,
    );
  }
  return lines.join('\n');
});
const remediationManifestSourceRows = computed(() => reviewQueueLedger.value.rows.map((row, index) => {
  const blockerClasses = [
    'credential_blocker',
    'contract_gap',
    'artifact_missing',
    'qa_gate_pending',
    'link_noncanonical',
  ] as const;
  const blockerClass = blockerClasses[index % blockerClasses.length];
  return {
    id: `manifest-drill-${row.id}-${index}`,
    issueIdentifier: row.id.toUpperCase(),
    runbookStepCode: `STEP-${String((index % 4) + 1).padStart(2, '0')}`,
    artifactPath: `artifacts/${row.id.toLowerCase()}/remediation-manifest-${String(index + 1).padStart(2, '0')}.md`,
    priorityWeight: row.priority === 'critical' ? 1 : row.priority === 'high' ? 2 : row.priority === 'medium' ? 3 : 4,
    dependencyDepth: (index % 3) + 1,
    blockerClass,
    createdAt: row.eventTime,
    summary: `${row.id.toUpperCase()} requires ${blockerClass} remediation sequencing before handoff.`,
  };
}));
const remediationManifestDrillboard = computed(() => buildRemediationManifestDrillboard({
  rows: remediationManifestSourceRows.value,
  activeRowId: activeRemediationManifestRowId.value,
}));
const activeRemediationManifestRow = computed(() => remediationManifestDrillboard.value.rows
  .find((row) => row.id === activeRemediationManifestRowId.value) ?? null);
const remediationDependencyGraphInspector = computed(() => buildRemediationDependencyGraphInspector({
  rows: remediationManifestSourceRows.value,
  activeNodeId: activeRemediationManifestRowId.value,
}));
const remediationManifestCanonicalPreview = computed(() => buildCanonicalLinkAutofixPreview({
  linksText: remediationManifestDependencyLinksText.value,
}));
const remediationManifestExportPacket = computed(() => buildRemediationManifestHandoffPacket({
  drillboardRows: remediationManifestDrillboard.value.rows,
  dependencyLinksText: remediationManifestCanonicalPreview.value.correctedOutput,
}));
const evidencePacketLintFindingSourceRows = computed(() => {
  const baseRows = reviewQueueLedger.value.rows;
  if (!baseRows.length) {
    return [];
  }
  return baseRows.slice(0, 6).map((row, index) => {
    const issueIdentifier = row.id.toUpperCase();
    if (index % 3 === 0) {
      return {
        id: `lint-${row.id}-branch`,
        code: 'MISSING_BRANCH',
        severity: 'error',
        severityPriority: 1,
        field: 'branch',
        fieldPriority: 10,
        issueIdentifier,
        path: `artifacts/${row.id.toLowerCase()}/evidence.md`,
        message: 'branch is required',
        input: '',
        normalized: '',
      };
    }
    if (index % 3 === 1) {
      const original = `https://paperclip.dev/issues/${issueIdentifier}`;
      const normalized = `/${issueIdentifier.split('-')[0]}/issues/${issueIdentifier}`;
      return {
        id: `lint-${row.id}-canonical`,
        code: 'NON_CANONICAL_DEPENDENCY_ISSUE_LINK',
        severity: 'warning',
        severityPriority: 2,
        field: 'dependencyIssueLinks',
        fieldPriority: 60,
        issueIdentifier,
        path: `artifacts/${row.id.toLowerCase()}/checklist.md`,
        message: `dependency issue link normalized to canonical format: ${normalized}`,
        input: original,
        normalized,
      };
    }
    return {
      id: `lint-${row.id}-blocker`,
      code: 'MISSING_BLOCKER_OWNER',
      severity: 'error',
      severityPriority: 1,
      field: 'blockerOwner',
      fieldPriority: 70,
      issueIdentifier,
      path: `artifacts/${row.id.toLowerCase()}/handoff.md`,
      message: 'blockerOwner is required when prMode=no_pr_yet',
      input: '',
      normalized: '',
    };
  });
});
const evidencePacketLintConsole = computed(() => buildEvidencePacketLintConsole({
  findings: evidencePacketLintFindingSourceRows.value,
  activeFilter: activeEvidencePacketLintFilter.value,
  activeFindingId: activeEvidencePacketLintFindingId.value,
}));
const evidencePacketLintFilterOptions = computed(() => ([
  { key: 'all' as EvidencePacketLintFilterKey, label: 'all', count: evidencePacketLintConsole.value.counts.total },
  { key: 'error' as EvidencePacketLintFilterKey, label: 'error', count: evidencePacketLintConsole.value.counts.error },
  { key: 'warning' as EvidencePacketLintFilterKey, label: 'warning', count: evidencePacketLintConsole.value.counts.warning },
]));
const canonicalLinkAutofixPreview = computed(() => buildCanonicalLinkAutofixPreview({
  linksText: evidencePacketLintChecklistDraft.value.dependencyIssueLinksText,
}));
const evidenceTimelineHeatmapSourceRows = computed(() => {
  const gapCodes = [
    'MISSING_BRANCH',
    'MISSING_FULL_SHA',
    'MISSING_PR_LINK',
    'MISSING_TEST_COMMAND',
    'MISSING_ARTIFACT_PATH',
    'MISSING_BLOCKER_OWNER',
    'MISSING_BLOCKER_ETA',
  ] as const;
  return reviewQueueLedger.value.rows.map((row, index) => ({
    id: `gap-${row.id}-${index % gapCodes.length}`,
    lanePriority: row.priority,
    missingFieldCode: gapCodes[index % gapCodes.length],
    issueIdentifier: row.id.toUpperCase(),
    updatedAt: row.eventTime,
  }));
});
const evidenceTimelineHeatmap = computed(() => buildEvidenceTimelineHeatmap({
  rows: evidenceTimelineHeatmapSourceRows.value,
  activeLane: activeEvidenceTimelineLane.value,
  activeRowId: activeEvidenceTimelineRowId.value,
}));
const evidenceTimelineLaneOptions = computed(() => ([
  { key: 'all' as ReviewQueueLedgerFilterKey, label: 'all', count: evidenceTimelineHeatmapSourceRows.value.length },
  { key: 'critical' as ReviewQueueLedgerFilterKey, label: 'critical', count: evidenceTimelineHeatmap.value.laneCounts.critical },
  { key: 'high' as ReviewQueueLedgerFilterKey, label: 'high', count: evidenceTimelineHeatmap.value.laneCounts.high },
  { key: 'medium' as ReviewQueueLedgerFilterKey, label: 'medium', count: evidenceTimelineHeatmap.value.laneCounts.medium },
  { key: 'low' as ReviewQueueLedgerFilterKey, label: 'low', count: evidenceTimelineHeatmap.value.laneCounts.low },
]));
const evidenceChecklistAutofixHints = computed(() => buildChecklistAutofixHints());
const activeConflictDrilldown = ref<ExceptionConflictDrilldownKey>('all');
const activeRollbackPlanReason = ref<ExceptionSimulationReasonDrilldownKey>('all');
const conflictDrilldownOptions: Array<{ key: ExceptionConflictDrilldownKey; label: string }> = [
  { key: 'all', label: 'all' },
  { key: 'stale_version', label: 'stale_version' },
  { key: 'malformed', label: 'malformed' },
  { key: 'high_delta', label: 'high_delta' },
  { key: 'mixed_status', label: 'mixed_status' },
];
const explainabilityPresetSlots = ref<ExplainabilityPresetSlot[]>(createDefaultExplainabilityPresetSlots());
const activeExplainabilitySlotIndex = ref<1 | 2 | 3 | 4>(1);
const explainabilityComposerOpen = ref(false);
const explainabilityPendingReplaceSlot = ref<1 | 2 | 3 | 4 | null>(null);
const explainabilityComposerState = reactive({
  message: '',
  error: '',
});
const explainabilityDraft = reactive<ExplainabilityComposerDraft>({
  ...buildExplainabilityComposerDraftFromSlot(explainabilityPresetSlots.value[0]),
});
const explainabilityAppliedChips = ref(buildDeterministicExplainabilityFilterChips({
  slot: explainabilityPresetSlots.value[0],
  reasonCounts: {},
}));
const rollbackPlanReasonOptions = computed(() => {
  const options: Array<{ key: ExceptionSimulationReasonDrilldownKey; label: string; count: number }> = [
    {
      key: 'all',
      label: 'all',
      count: bulkSimulationOutcome.value.rows.length,
    },
  ];
  for (const reason of bulkSimulationOutcome.value.reasonCodes) {
    if (reason.count <= 0) {
      continue;
    }
    options.push({
      key: reason.code,
      label: reason.code,
      count: reason.count,
    });
  }
  return options;
});
const activeRollbackPlanReasonMeta = computed(() => bulkSimulationOutcome.value.reasonCodes
  .find((reason) => reason.code === activeRollbackPlanReason.value));
const activeBulkDiffRowId = ref('');
const filteredBulkDiffRows = computed(() => filterExceptionDiffInspectorRows(
  bulkDiffInspector.value.rows,
  activeConflictDrilldown.value,
));
const rollbackPlanDrilldownRows = computed(() => filterExceptionSimulationOutcomeRows(
  bulkSimulationOutcome.value.rows,
  activeRollbackPlanReason.value,
));
const bulkDiffEmptyState = computed(() => resolveExceptionDiffInspectorEmptyState({
  activeReason: activeConflictDrilldown.value,
  totalRows: bulkDiffInspector.value.rows.length,
  filteredRows: filteredBulkDiffRows.value.length,
}));
const bulkConfirmation = computed(() => buildExceptionBulkConfirmation({
  action: bulkPreviewDrawer.action,
  preview: bulkExceptionPreview.value,
  staleSelectionCount: staleExceptionSelectionCount.value,
}));
const areAllExceptionRowsSelected = computed(() => exceptionRows.value.length > 0
  && exceptionRows.value.every((row) => selectedExceptionIds.value.includes(row.id)));
const exceptionSavedViews = computed(() => exceptionSavedViewState.value.views);

const webhookFilters = reactive({
  merchantId: '',
  limit: 25,
});
const webhookState = reactive({
  loading: false,
  message: 'Load webhook delivery visibility if endpoint is available.',
  error: '',
  unsupported: false,
});
const webhookRows = ref<WebhookDelivery[]>([]);

function resetState(state: { message: string; error: string }) {
  state.message = '';
  state.error = '';
}

function authHeaders() {
  return {
    'x-internal-token': auth.internalToken.trim(),
    'x-actor-role': auth.actorRole,
  };
}

function hasAuth() {
  return Boolean(auth.internalToken.trim());
}

function ensureAuth(state: { error: string }) {
  if (!hasAuth()) {
    state.error = 'Internal auth token is required.';
    return false;
  }
  return true;
}

function applySelectedMerchant(merchantId: string) {
  selectedMerchantId.value = merchantId;
  apiKeyForm.merchantId = merchantId;
  healthFilters.merchantId = merchantId;
  opsFilters.merchantId = merchantId;
  settlementFilters.merchantId = merchantId;
  webhookFilters.merchantId = merchantId;
}

async function loadMerchants() {
  resetState(onboardingState);
  if (!ensureAuth(onboardingState)) return;

  onboardingState.loading = true;
  try {
    merchants.value = await request<Merchant[]>('/merchants', { headers: authHeaders() });
    if (merchants.value.length && !selectedMerchantId.value) {
      applySelectedMerchant(merchants.value[0].id);
    }
    onboardingState.message = `Loaded ${merchants.value.length} merchant(s).`;
  } catch (error: any) {
    onboardingState.error = error.message;
  } finally {
    onboardingState.loading = false;
  }
}

async function createMerchant() {
  resetState(onboardingState);
  if (!ensureAuth(onboardingState)) return;
  if (!onboardingForm.name.trim()) {
    onboardingState.error = 'Merchant name is required.';
    return;
  }

  onboardingState.loading = true;
  try {
    const created = await request<Merchant>('/merchants', {
      method: 'POST',
      headers: authHeaders(),
      body: {
        name: onboardingForm.name.trim(),
        webhookUrl: onboardingForm.webhookUrl.trim() || undefined,
      },
    });

    onboardingState.message = `Merchant ${created.name} created. KYC set to ${onboardingForm.kycStatus.toUpperCase()}.`;
    applySelectedMerchant(created.id);
    onboardingForm.name = '';
    onboardingForm.webhookUrl = '';
    await loadMerchants();
  } catch (error: any) {
    onboardingState.error = error.message;
  } finally {
    onboardingState.loading = false;
  }
}

function pushApiKeyAction(action: ApiKeyAction) {
  apiKeyActions.value.unshift(action);
  apiKeyActions.value = apiKeyActions.value.slice(0, 20);
}

async function createApiKey() {
  resetState(apiKeyState);
  if (!ensureAuth(apiKeyState)) return;
  if (!apiKeyForm.merchantId.trim() || !apiKeyForm.name.trim()) {
    apiKeyState.error = 'Merchant ID and key name are required.';
    return;
  }

  apiKeyState.loading = true;
  try {
    const created = await request<{ id: string; apiKey: string }>('/api-keys/create', {
      method: 'POST',
      headers: authHeaders(),
      body: {
        merchantId: apiKeyForm.merchantId.trim(),
        name: apiKeyForm.name.trim(),
      },
    });

    latestRawApiKey.value = created.apiKey;
    keyActionForm.keyId = created.id;
    pushApiKeyAction({
      at: new Date().toISOString(),
      action: 'created',
      merchantId: apiKeyForm.merchantId.trim(),
      keyId: created.id,
      detail: 'API key issued',
    });
    apiKeyState.message = `Created key ${created.id}. Save raw key now; it will not be shown again.`;
  } catch (error: any) {
    apiKeyState.error = error.message;
  } finally {
    apiKeyState.loading = false;
  }
}

async function rotateApiKey() {
  resetState(apiKeyState);
  if (!ensureAuth(apiKeyState)) return;
  if (!keyActionForm.keyId.trim()) {
    apiKeyState.error = 'Key ID is required for rotate.';
    return;
  }
  if (import.meta.client && !window.confirm(`Rotate key ${keyActionForm.keyId.trim()}?`)) return;

  apiKeyState.loading = true;
  try {
    const rotated = await request<{ id: string; apiKey: string }>('/api-keys/rotate', {
      method: 'POST',
      headers: authHeaders(),
      body: { keyId: keyActionForm.keyId.trim() },
    });

    latestRawApiKey.value = rotated.apiKey;
    keyActionForm.keyId = rotated.id;
    pushApiKeyAction({
      at: new Date().toISOString(),
      action: 'rotated',
      merchantId: apiKeyForm.merchantId.trim() || selectedMerchantId.value,
      keyId: rotated.id,
      detail: 'API key rotated and replacement issued',
    });
    apiKeyState.message = `Rotated key. New key ID: ${rotated.id}.`;
  } catch (error: any) {
    apiKeyState.error = error.message;
  } finally {
    apiKeyState.loading = false;
  }
}

async function revokeApiKey() {
  resetState(apiKeyState);
  if (!ensureAuth(apiKeyState)) return;
  if (!keyActionForm.keyId.trim()) {
    apiKeyState.error = 'Key ID is required for revoke.';
    return;
  }
  if (import.meta.client && !window.confirm(`Revoke key ${keyActionForm.keyId.trim()}?`)) return;

  apiKeyState.loading = true;
  try {
    await request('/api-keys/revoke', {
      method: 'POST',
      headers: authHeaders(),
      body: { keyId: keyActionForm.keyId.trim() },
    });

    pushApiKeyAction({
      at: new Date().toISOString(),
      action: 'revoked',
      merchantId: apiKeyForm.merchantId.trim() || selectedMerchantId.value,
      keyId: keyActionForm.keyId.trim(),
      detail: 'API key revoked',
    });
    apiKeyState.message = `Revoked key ${keyActionForm.keyId.trim()}.`;
  } catch (error: any) {
    apiKeyState.error = error.message;
  } finally {
    apiKeyState.loading = false;
  }
}

function saveRoutingControls() {
  resetState(routingState);
  if (routingControls.primaryProvider === routingControls.fallbackProvider) {
    routingState.error = 'Primary and fallback providers must be different.';
    return;
  }
  routingState.message = 'Routing controls saved in UI model. Backend config endpoint is pending in this sprint.';
}

async function syncRoutingFromBackend() {
  resetState(routingState);
  if (!ensureAuth(routingState)) return;
  if (!healthFilters.merchantId.trim()) {
    routingState.error = 'Merchant ID is required.';
    return;
  }

  routingState.loading = true;
  try {
    const params = new URLSearchParams({
      merchantId: healthFilters.merchantId.trim(),
      timeframeHours: String(healthFilters.timeframeHours),
      take: '50',
    });

    const dashboard = await request<ObservabilityDashboard>(`/payments/observability?${params.toString()}`, {
      headers: authHeaders(),
    });

    const latest = dashboard.decisions[0];
    routingState.backendAlgorithm = latest?.algorithm || '-';
    routingState.backendReasonCode = latest?.reasonCode || '-';
    routingState.backendProvider = latest?.provider || '-';
    routingState.message = latest
      ? `Synced active strategy from latest decision ${latest.reference}.`
      : 'No routing decisions in selected window.';
  } catch (error: any) {
    routingState.error = error.message;
  } finally {
    routingState.loading = false;
  }
}

function computeSummarySuccessRate(data: ObservabilityDashboard | null): number | null {
  if (!data?.margins.length) return null;
  const totals = data.margins.reduce((acc, row) => {
    acc.decisions += row.decisionCount;
    acc.attempts += row.decisionCount + row.failedAttempts;
    return acc;
  }, { decisions: 0, attempts: 0 });

  if (!totals.attempts) return null;
  return (totals.decisions / totals.attempts) * 100;
}

async function refreshLatencyP95(decisions: ObservabilityDecision[]) {
  const refs = decisions.slice(0, 15).map((item) => item.reference);
  if (!refs.length) {
    latencyP95Ms.value = null;
    return;
  }

  const feeds = await Promise.all(
    refs.map(async (reference) => {
      try {
        return await request<RoutingTelemetry>(`/payments/${reference}/routing-telemetry`, {
          headers: authHeaders(),
        });
      } catch {
        return null;
      }
    }),
  );

  const latencies: number[] = [];
  for (const feed of feeds) {
    const selectedProvider = feed?.decision?.provider;
    const selectedScore = feed?.decision?.scores?.find((score) => score.providerName === selectedProvider);
    if (typeof selectedScore?.latencyMs === 'number') {
      latencies.push(selectedScore.latencyMs);
    }
  }

  if (!latencies.length) {
    latencyP95Ms.value = null;
    return;
  }

  latencies.sort((a, b) => a - b);
  const idx = Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95));
  latencyP95Ms.value = latencies[idx] ?? null;
}

async function loadHealthDashboard() {
  resetState(healthState);
  if (!ensureAuth(healthState)) return;
  if (!healthFilters.merchantId.trim()) {
    healthState.error = 'Merchant ID is required for health dashboard.';
    return;
  }

  healthState.loading = true;
  try {
    const params = new URLSearchParams({
      merchantId: healthFilters.merchantId.trim(),
      timeframeHours: String(healthFilters.timeframeHours),
      take: '250',
    });
    if (healthFilters.provider) params.set('provider', healthFilters.provider);

    const dashboard = await request<ObservabilityDashboard>(`/payments/observability?${params.toString()}`, {
      headers: authHeaders(),
    });

    healthData.value = dashboard;
    await refreshLatencyP95(dashboard.decisions);
    healthState.message = `Live refresh at ${new Date().toLocaleTimeString()} (${dashboard.summary.decisions} decisions).`;
  } catch (error: any) {
    healthData.value = null;
    latencyP95Ms.value = null;
    healthState.error = error.message;
  } finally {
    healthState.loading = false;
  }
}

function clearAutoRefresh() {
  if (autoRefreshHandle.value !== null && import.meta.client) {
    window.clearInterval(autoRefreshHandle.value);
  }
  autoRefreshHandle.value = null;
}

function setupAutoRefresh() {
  clearAutoRefresh();
  if (!import.meta.client) return;
  if (!Number.isFinite(healthFilters.autoRefreshSec) || healthFilters.autoRefreshSec < 5) return;

  autoRefreshHandle.value = window.setInterval(() => {
    if (!healthState.loading && healthFilters.merchantId.trim()) {
      void loadHealthDashboard();
    }
  }, healthFilters.autoRefreshSec * 1000);
}

watch(() => healthFilters.autoRefreshSec, setupAutoRefresh);
onMounted(setupAutoRefresh);
onBeforeUnmount(clearAutoRefresh);
onMounted(() => {
  if (!import.meta.client) return;
  window.addEventListener('keydown', onExplainabilityComposerKeydown);
  window.addEventListener('keydown', onDiagnosticsBaselineKeydown);
  window.addEventListener('keydown', onRemediationManifestKeydown);
  window.addEventListener('keydown', onDispatchCockpitKeydown);
  window.addEventListener('keydown', onPublicationWindowKeydown);
  window.addEventListener('keydown', onManifestDiffKeydown);
  window.addEventListener('keydown', onAnomalyTriageKeydown);
});
onBeforeUnmount(() => {
  if (!import.meta.client) return;
  window.removeEventListener('keydown', onExplainabilityComposerKeydown);
  window.removeEventListener('keydown', onDiagnosticsBaselineKeydown);
  window.removeEventListener('keydown', onRemediationManifestKeydown);
  window.removeEventListener('keydown', onDispatchCockpitKeydown);
  window.removeEventListener('keydown', onPublicationWindowKeydown);
  window.removeEventListener('keydown', onManifestDiffKeydown);
  window.removeEventListener('keydown', onAnomalyTriageKeydown);
});

const healthLevel = computed(() => {
  const data = healthData.value;
  if (!data) return 'unknown';

  const hasCriticalAlert = data.alerts.some((alert) => alert.type === 'error');
  const hasWarningAlert = data.alerts.some((alert) => alert.type === 'warning');
  const successRate = computeSummarySuccessRate(data);

  if (hasCriticalAlert || (successRate !== null && successRate < 80) || (latencyP95Ms.value !== null && latencyP95Ms.value > 1200)) {
    return 'critical';
  }

  if (hasWarningAlert || (successRate !== null && successRate < 95) || (latencyP95Ms.value !== null && latencyP95Ms.value > 800)) {
    return 'degraded';
  }

  return 'healthy';
});

async function loadReconciliation() {
  resetState(opsState);
  if (!ensureAuth(opsState)) return;
  if (!opsFilters.merchantId.trim()) {
    opsState.error = 'Merchant ID is required.';
    return;
  }

  opsState.loading = true;
  try {
    const params = new URLSearchParams({
      merchantId: opsFilters.merchantId.trim(),
      take: '100',
    });

    if (opsFilters.status) params.set('status', opsFilters.status);

    const rows = await request<PaymentRow[]>(`/payments?${params.toString()}`, {
      headers: authHeaders(),
    });

    const startAt = opsFilters.startDate ? new Date(`${opsFilters.startDate}T00:00:00`).getTime() : null;
    const endAt = opsFilters.endDate ? new Date(`${opsFilters.endDate}T23:59:59`).getTime() : null;

    opsRows.value = rows.filter((row) => {
      if (opsFilters.provider && row.providerName !== opsFilters.provider) return false;
      const createdAt = new Date(row.createdAt).getTime();
      if (startAt !== null && createdAt < startAt) return false;
      if (endAt !== null && createdAt > endAt) return false;
      return true;
    });

    opsState.message = `Loaded ${opsRows.value.length} reconciliation row(s).`;
  } catch (error: any) {
    opsRows.value = [];
    opsState.error = error.message;
  } finally {
    opsState.loading = false;
  }
}

function openRefund(reference: string) {
  refundForm.reference = reference;
  refundForm.reason = '';
  refundState.error = '';
  refundState.message = '';
}

async function submitRefund() {
  resetState(refundState);
  if (!ensureAuth(refundState)) return;
  if (!refundForm.reference.trim()) {
    refundState.error = 'Payment reference is required.';
    return;
  }

  refundState.loading = true;
  try {
    await request(`/payments/${refundForm.reference.trim()}/refund`, {
      method: 'POST',
      headers: authHeaders(),
      body: { reason: refundForm.reason.trim() || undefined },
    });
    opsRows.value = applyRefundStatus(opsRows.value, refundForm.reference.trim());
    refundState.message = `Refund submitted for ${refundForm.reference.trim()}.`;
  } catch (error: any) {
    refundState.error = error.message;
  } finally {
    refundState.loading = false;
  }
}

async function loadSettlementSummary() {
  resetState(settlementState);
  if (!ensureAuth(settlementState)) return;

  settlementState.loading = true;
  try {
    const dateParam = settlementFilters.date.trim();
    const report = await request<SettlementReport>(
      `/settlements/reconciliation/generate${dateParam ? `?date=${encodeURIComponent(dateParam)}` : ''}`,
      {
        method: 'POST',
        headers: authHeaders(),
      },
    );

    settlementReport.value = report;
    if (!report.merchants.length) {
      settlementState.message = 'No settlement rows in this date window.';
    } else {
      settlementState.message = `Loaded settlement report ${report.reportDate} with ${report.merchants.length} merchant row(s).`;
    }
  } catch (error: any) {
    settlementReport.value = null;
    settlementState.error = error.message;
  } finally {
    settlementState.loading = false;
  }
}

async function loadWebhookVisibility() {
  resetState(webhookState);
  webhookState.unsupported = false;
  if (!ensureAuth(webhookState)) return;

  webhookState.loading = true;
  try {
    const params = new URLSearchParams({
      limit: String(webhookFilters.limit || 25),
    });
    if (webhookFilters.merchantId.trim()) {
      params.set('merchantId', webhookFilters.merchantId.trim());
    }

    webhookRows.value = await request<WebhookDelivery[]>(`/webhooks/deliveries?${params.toString()}`, {
      headers: authHeaders(),
    });

    webhookState.message = webhookRows.value.length
      ? `Loaded ${webhookRows.value.length} webhook delivery record(s).`
      : 'No webhook delivery records found.';
  } catch (error: any) {
    webhookRows.value = [];
    if (String(error.message).includes('Cannot GET /webhooks/deliveries') || String(error.message).includes('Not Found')) {
      webhookState.unsupported = true;
      webhookState.message = 'Webhook delivery log endpoint is not available in this backend build.';
    } else {
      webhookState.error = error.message;
    }
  } finally {
    webhookState.loading = false;
  }
}

async function retryPendingWebhooks() {
  resetState(webhookState);
  webhookState.unsupported = false;
  if (!ensureAuth(webhookState)) return;

  webhookState.loading = true;
  try {
    const summary = await request<{ processed: number; delivered: number; failed: number }>('/webhooks/retry-pending', {
      method: 'POST',
      headers: authHeaders(),
      body: { limit: webhookFilters.limit || 25 },
    });
    webhookState.message = `Retry executed: processed ${summary.processed}, delivered ${summary.delivered}, failed ${summary.failed}.`;
    await loadWebhookVisibility();
  } catch (error: any) {
    webhookState.error = error.message;
  } finally {
    webhookState.loading = false;
  }
}

function toggleDispute(reference: string) {
  const current = disputeMap[reference];
  disputeMap[reference] = current === 'open' ? 'resolved' : 'open';
}

const providerChoices = computed(() => {
  const providerSet = new Set<string>(['mock-a', 'mock-b']);
  for (const row of healthData.value?.margins ?? []) providerSet.add(row.provider);
  for (const row of opsRows.value) if (row.providerName) providerSet.add(row.providerName);
  return [...providerSet];
});

const settlementRows = computed(() => filterSettlementMerchants(
  settlementReport.value?.merchants ?? [],
  settlementFilters.merchantId,
));

const settlementMismatches = computed(() => {
  const rows = settlementReport.value?.mismatches ?? [];
  if (!settlementFilters.merchantId.trim()) return rows;
  return rows.filter((row) => row.merchantId === settlementFilters.merchantId.trim());
});

const successRate = computed(() => computeSummarySuccessRate(healthData.value));

function fmtPct(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'n/a';
  return `${value.toFixed(1)}%`;
}

function fmtAmount(value: string, currency: string) {
  const num = Number(value);
  if (!Number.isFinite(num)) return `${value} ${currency}`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
}

function mapExceptionRow(input: any): SettlementExceptionRow {
  return {
    id: String(input?.id ?? input?.exceptionId ?? ''),
    merchantId: String(input?.merchantId ?? ''),
    provider: String(input?.provider ?? input?.providerName ?? '-'),
    status: normalizeExceptionStatus(input?.status),
    version: Number(input?.version ?? input?.currentVersion ?? 1),
    fingerprint: String(input?.fingerprint ?? '-'),
    mismatchCount: Number(input?.mismatchCount ?? input?.mismatches?.length ?? 0),
    openedAt: String(input?.openedAt ?? input?.createdAt ?? new Date().toISOString()),
    updatedAt: String(input?.updatedAt ?? input?.openedAt ?? new Date().toISOString()),
  };
}

function mapExceptionDetail(input: any): SettlementExceptionDetail {
  const row = mapExceptionRow(input);
  const mismatches = Array.isArray(input?.mismatches) ? input.mismatches : [];
  const audits = Array.isArray(input?.audits)
    ? input.audits
    : Array.isArray(input?.auditTrail)
      ? input.auditTrail
      : [];
  return {
    ...row,
    windowStart: String(input?.windowStart ?? input?.dateRange?.from ?? row.openedAt),
    windowEnd: String(input?.windowEnd ?? input?.dateRange?.to ?? row.updatedAt),
    summary: input?.summary ?? null,
    mismatches: mismatches.map((item: any, idx: number) => ({
      eventKey: String(item?.eventKey ?? item?.id ?? `${row.id}-event-${idx}`),
      title: String(item?.title ?? item?.reason ?? 'Mismatch'),
      detail: String(item?.detail ?? item?.description ?? '-'),
      amount: typeof item?.amount === 'number' ? item.amount : null,
      currency: item?.currency ? String(item.currency) : null,
      occurredAt: item?.occurredAt ? String(item.occurredAt) : null,
    })),
    audits: audits.map((item: any, idx: number) => ({
      id: String(item?.id ?? `${row.id}-audit-${idx}`),
      action: item?.action === 'ignore' ? 'ignore' : 'resolve',
      reason: String(item?.reason ?? '-'),
      note: item?.note ? String(item.note) : null,
      actor: String(item?.actor ?? item?.operator ?? 'unknown'),
      createdAt: String(item?.createdAt ?? row.updatedAt),
    })),
  };
}

function isExceptionFixtureMode(input: unknown): input is ExceptionFixtureMode {
  return input === 'api'
    || input === 'loading'
    || input === 'empty'
    || input === 'permission_error'
    || input === 'stale_conflict'
      || input === 'action_failure_retry';
}

function readRouteQueryString(key: string): string | undefined {
  const raw = route.query[key];
  if (Array.isArray(raw)) {
    return typeof raw[0] === 'string' ? raw[0] : undefined;
  }
  return typeof raw === 'string' ? raw : undefined;
}

function resolveInitialFixtureMode(): ExceptionFixtureMode {
  const raw = readRouteQueryString('exceptionFixture');
  if (isExceptionFixtureMode(raw)) {
    return raw;
  }
  return 'api';
}

function fixtureExceptionDetail(status: SettlementExceptionStatus): SettlementExceptionDetail {
  return {
    id: 'fx-exception-001',
    merchantId: 'merchant-fixture',
    provider: 'mock-a',
    status,
    fingerprint: 'fx-fingerprint-001',
    version: 1,
    mismatchCount: 2,
    openedAt: '2026-03-18T08:00:00.000Z',
    updatedAt: '2026-03-18T08:30:00.000Z',
    windowStart: '2026-03-18T07:00:00.000Z',
    windowEnd: '2026-03-18T08:00:00.000Z',
    summary: {
      ledgerAmount: 1200,
      providerAmount: 1100,
      deltaAmount: 100,
      currency: 'USD',
    },
    mismatches: [
      {
        eventKey: 'fx-mismatch-1',
        title: 'Paid without success callback',
        detail: 'Provider marked paid but callback was missing in retry window.',
        amount: 700,
        currency: 'USD',
        occurredAt: '2026-03-18T07:20:00.000Z',
      },
      {
        eventKey: 'fx-mismatch-2',
        title: 'Stuck non-terminal',
        detail: 'Transaction stayed pending longer than SLA threshold.',
        amount: 500,
        currency: 'USD',
        occurredAt: '2026-03-18T07:36:00.000Z',
      },
    ],
    audits: [
      {
        id: 'fx-audit-1',
        action: 'resolve',
        reason: 'manual fixture seed',
        note: null,
        actor: 'ops',
        createdAt: '2026-03-18T08:10:00.000Z',
      },
    ],
  };
}

function resetBulkPreviewConfirmState() {
  bulkPreviewConfirmState.message = '';
  bulkPreviewConfirmState.error = '';
}

function resetDecisionQueueState() {
  decisionQueueState.message = '';
  decisionQueueState.error = '';
}

function resetReviewQueueLedgerState() {
  reviewQueueLedgerState.message = '';
  reviewQueueLedgerState.error = '';
}

function resetDispatchCockpitState() {
  dispatchCockpitState.message = '';
  dispatchCockpitState.error = '';
  dispatchDraftMissingFields.value = new Set();
}

function resetRemediationPlaybookState() {
  remediationPlaybookState.message = '';
  remediationPlaybookState.error = '';
}

function resetRemediationRunbookState() {
  remediationRunbookState.message = '';
  remediationRunbookState.error = '';
  remediationRunbookHandoffMissingFields.value = new Set();
}

function resetManifestDiffState() {
  manifestDiffState.message = '';
  manifestDiffState.error = '';
  manifestHandoffMissingFields.value = new Set();
}

function resetReleaseReadinessState() {
  releaseReadinessState.message = '';
  releaseReadinessState.error = '';
}

function resetPublicationWindowState() {
  publicationWindowState.message = '';
  publicationWindowState.error = '';
}

function resetReviewQueueHandoffValidation() {
  reviewQueueHandoffValidation.message = '';
  reviewQueueHandoffValidation.error = '';
  reviewQueueHandoffMissingFields.value = new Set();
}

function resetEvidencePacketLintState() {
  evidencePacketLintState.message = '';
  evidencePacketLintState.error = '';
  evidencePacketLintChecklistMissingFields.value = new Set();
}

watch(filteredBulkDiffRows, (rows) => {
  if (!rows.length) {
    activeBulkDiffRowId.value = '';
    return;
  }
  if (!rows.some((row) => row.id === activeBulkDiffRowId.value)) {
    activeBulkDiffRowId.value = rows[0].id;
  }
}, { immediate: true });

watch(selectedExceptionIds, (selectedIds) => {
  const selectedSet = new Set(selectedIds);
  queueDraftRowIds.value = queueDraftRowIds.value.filter((rowId) => selectedSet.has(rowId));
}, { deep: true });

watch(filteredIncidentBookmarkItems, (items) => {
  const reconciled = reconcileReplayBookmarkCompareState({
    items,
    activeBookmarkId: activeReplayBookmarkId.value,
    primaryBookmarkId: replayComparePrimaryBookmarkId.value,
    secondaryBookmarkId: replayCompareSecondaryBookmarkId.value,
  });
  activeReplayBookmarkId.value = reconciled.activeBookmarkId;
  replayComparePrimaryBookmarkId.value = reconciled.primaryBookmarkId;
  replayCompareSecondaryBookmarkId.value = reconciled.secondaryBookmarkId;
  const scrubber = buildOperatorTimelineScrubber({
    items,
    activeTickId: activeTimelineTickId.value,
    activePreset: activeTimelinePreset.value,
    baselineTickId: timelineBaselineTickId.value,
    candidateTickId: timelineCandidateTickId.value,
    overrideTickId: timelineOverrideTickId.value,
  });
  activeTimelineTickId.value = scrubber.activeTickId;
  timelineBaselineTickId.value = scrubber.compareSlots.find((slot) => slot.key === 'baseline')?.tickId ?? '';
  timelineCandidateTickId.value = scrubber.compareSlots.find((slot) => slot.key === 'candidate')?.tickId ?? '';
  timelineOverrideTickId.value = scrubber.compareSlots.find((slot) => slot.key === 'override')?.tickId ?? '';
}, { immediate: true, deep: true });

watch(operatorDecisionQueue, (queue) => {
  if (!queue.items.length) {
    activeDecisionQueueItemId.value = '';
    return;
  }
  if (!queue.items.some((item) => item.id === activeDecisionQueueItemId.value)) {
    activeDecisionQueueItemId.value = queue.items[0].id;
  }
}, { deep: true, immediate: true });

watch(replayDiffInspector, (inspector) => {
  if (!inspector.rows.length) {
    activeReplayDiffRowId.value = '';
    return;
  }
  if (!inspector.rows.some((row) => row.id === activeReplayDiffRowId.value)) {
    activeReplayDiffRowId.value = inspector.activeRowId;
  }
}, { deep: true, immediate: true });

watch(reviewQueueLedger, (ledger) => {
  if (!ledger.rows.length) {
    activeReviewQueueRowId.value = '';
    activeEvidencePacketLintFindingId.value = '';
    activeEvidenceTimelineRowId.value = '';
    reviewQueueHandoffDraft.value = buildReviewQueueHandoffPacketDraftFromLedgerRow({ activeRow: null });
    return;
  }
  if (!ledger.rows.some((row) => row.id === activeReviewQueueRowId.value)) {
    activeReviewQueueRowId.value = ledger.activeRowId;
    const activeRow = ledger.rows.find((row) => row.id === ledger.activeRowId) ?? null;
    reviewQueueHandoffDraft.value = buildReviewQueueHandoffPacketDraftFromLedgerRow({ activeRow });
  }
}, { deep: true, immediate: true });

watch(dispatchCockpit, (cockpit) => {
  if (!cockpit.rows.length) {
    activeDispatchCockpitRowId.value = '';
    dispatchDraft.value = getDefaultDispatchEvidenceDraft({
      laneId: '',
      issueIdentifier: '',
      laneType: 'dispatch_queue',
    });
    return;
  }
  if (!cockpit.rows.some((row) => row.id === activeDispatchCockpitRowId.value)) {
    activeDispatchCockpitRowId.value = cockpit.activeRowId;
  }
  const activeLane = cockpit.rows.find((row) => row.id === activeDispatchCockpitRowId.value) ?? null;
  if (!activeLane) {
    return;
  }
  const existing = dispatchDraftBank.value.find((draftRow) => draftRow.laneId === activeLane.id);
  dispatchDraft.value = existing
    ? { ...existing }
    : getDefaultDispatchEvidenceDraft({
      laneId: activeLane.id,
      issueIdentifier: activeLane.issueIdentifier,
      laneType: activeLane.laneType,
    });
}, { deep: true, immediate: true });

watch(releaseReadinessSimulator, (simulator) => {
  if (!simulator.rows.length) {
    activeReleaseReadinessLaneId.value = '';
    return;
  }
  if (!simulator.rows.some((row) => row.id === activeReleaseReadinessLaneId.value)) {
    activeReleaseReadinessLaneId.value = simulator.activeLaneId;
  }
}, { deep: true, immediate: true });

watch(publicationWindowPlanBoard, (board) => {
  if (!board.rows.length) {
    activePublicationWindowLaneId.value = '';
    publicationWindowScoreExplainerOpen.value = false;
    publicationWindowDependencyGatesOpen.value = false;
    return;
  }
  if (!board.rows.some((row) => row.id === activePublicationWindowLaneId.value)) {
    activePublicationWindowLaneId.value = board.activeLaneId;
  }
}, { deep: true, immediate: true });

watch(evidencePacketLintConsole, (consoleData) => {
  if (!consoleData.rows.length) {
    activeEvidencePacketLintFindingId.value = '';
    return;
  }
  if (!consoleData.rows.some((row) => row.id === activeEvidencePacketLintFindingId.value)) {
    activeEvidencePacketLintFindingId.value = consoleData.activeFindingId;
  }
}, { deep: true, immediate: true });

watch(evidenceTimelineHeatmap, (heatmap) => {
  if (!heatmap.rows.length) {
    activeEvidenceTimelineRowId.value = '';
    return;
  }
  if (!heatmap.rows.some((row) => row.id === activeEvidenceTimelineRowId.value)) {
    activeEvidenceTimelineRowId.value = heatmap.activeRowId;
  }
}, { deep: true, immediate: true });

watch(remediationRunbookTimelineBoard, (board) => {
  if (!board.rows.length) {
    activeRemediationRunbookStepId.value = '';
    remediationRunbookHandoffDraft.value = getDefaultRemediationRunbookHandoffPackDraft({
      stepId: '',
      issueIdentifier: '',
    });
    return;
  }
  if (!board.rows.some((row) => row.id === activeRemediationRunbookStepId.value)) {
    setActiveRemediationRunbookStep(board.activeRowId);
  }
}, { deep: true, immediate: true });

watch(manifestDiffViewer, (viewer) => {
  if (!viewer.rows.length) {
    activeManifestDiffRowId.value = '';
    manifestHandoffDrillDraft.value = getDefaultBlockedLaneHandoffDrillDraft({
      laneId: '',
      issueIdentifier: '',
    });
    return;
  }
  if (!viewer.rows.some((row) => row.id === activeManifestDiffRowId.value)) {
    setActiveManifestDiffRow(viewer.activeRowId);
  }
}, { deep: true, immediate: true });

watch(remediationManifestDrillboard, (board) => {
  if (!board.rows.length) {
    activeRemediationManifestRowId.value = '';
    remediationManifestDependencyGraphOpen.value = false;
    remediationManifestExportOpen.value = false;
    return;
  }
  if (!board.rows.some((row) => row.id === activeRemediationManifestRowId.value)) {
    activeRemediationManifestRowId.value = board.activeRowId;
  }
}, { deep: true, immediate: true });

watch(anomalyTriageBoard, (board) => {
  if (!board.rows.length) {
    activeAnomalyTriageRowId.value = '';
    remediationPlaybookDraft.value = getDefaultRemediationPlaybookDraft({
      anomalyId: '',
      issueIdentifier: '',
      category: 'missing',
    });
    return;
  }
  if (!board.rows.some((row) => row.id === activeAnomalyTriageRowId.value)) {
    setActiveAnomalyTriageRow(board.activeRowId, false);
  }
}, { deep: true, immediate: true });

watch(diagnosticsBaselineCompareWorkspace, (workspace) => {
  if (!workspace.rows.length) {
    activeDiagnosticsDeltaId.value = '';
    return;
  }
  if (!workspace.rows.some((row) => row.id === activeDiagnosticsDeltaId.value)) {
    activeDiagnosticsDeltaId.value = workspace.activeDeltaId;
  }
}, { deep: true, immediate: true });

watch(regressionGateOverrideSimulator, (simulator) => {
  if (!simulator.scenarios.length) {
    activeOverrideScenarioId.value = '';
    return;
  }
  if (!simulator.scenarios.some((scenario) => scenario.id === activeOverrideScenarioId.value)) {
    activeOverrideScenarioId.value = simulator.activeScenarioId;
  }
}, { deep: true, immediate: true });

watch(() => bulkDiffInspector.value.reasonCounts, () => {
  const applied = applyExplainabilityPresetSlot({
    slots: explainabilityPresetSlots.value,
    slotIndex: activeExplainabilitySlotIndex.value,
    reasonCounts: resolveExplainabilityReasonCounts(),
  });
  explainabilityAppliedChips.value = applied.chips;
}, { deep: true, immediate: true });

function isDispatchDraftFieldMissing(fieldKey: string): boolean {
  return dispatchDraftMissingFields.value.has(fieldKey);
}

function setActiveReleaseReadinessLane(laneId: string) {
  resetReleaseReadinessState();
  activeReleaseReadinessLaneId.value = laneId;
}

function setActivePublicationWindowLane(laneId: string) {
  resetPublicationWindowState();
  activePublicationWindowLaneId.value = laneId;
}

function focusReleaseReadinessSimulator() {
  releaseReadinessPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  releaseReadinessPanelRef.value?.focus();
}

function focusPublicationWindowPlanBoard() {
  publicationWindowPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  publicationWindowPanelRef.value?.focus();
}

function focusDiagnosticsBaselineCompare() {
  diagnosticsBaselinePanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  diagnosticsBaselinePanelRef.value?.focus();
}

function focusRemediationManifestDrillboard() {
  remediationManifestPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  remediationManifestPanelRef.value?.focus();
}

function setActiveRemediationManifestRow(rowId: string) {
  activeRemediationManifestRowId.value = rowId;
  remediationManifestState.error = '';
}

function openRemediationManifestDependencyGraph() {
  remediationManifestDependencyGraphOpen.value = true;
  remediationManifestState.error = '';
  remediationManifestState.message = 'Dependency graph inspector opened for canonical blocker classes.';
}

function openRemediationManifestExportPacket() {
  remediationManifestExportOpen.value = true;
  remediationManifestState.error = '';
  remediationManifestState.message = `Export packet generated for ${remediationManifestDrillboard.value.rows.length} manifest row(s).`;
}

function isDiagnosticsHandoffFieldMissing(fieldKey: string): boolean {
  return diagnosticsHandoffMissingFields.value.has(fieldKey);
}

function validateActiveOverrideScenario() {
  diagnosticsBaselineState.error = '';
  diagnosticsBaselineState.message = '';
  const scenario = activeOverrideScenario.value;
  if (!scenario) {
    diagnosticsBaselineState.error = 'Select an override scenario before validation.';
    return;
  }
  if (overrideScenarioLinkPreview.value.changedCount > 0) {
    diagnosticsBaselineState.error = `Canonicalize ${overrideScenarioLinkPreview.value.changedCount} link(s) before save.`;
    return;
  }
  diagnosticsBaselineState.message = `Scenario ${scenario.issueIdentifier} validated with simulated outcome ${scenario.whatIfOutcome}.`;
}

function validateDiagnosticsHandoffPacket() {
  diagnosticsBaselineState.error = '';
  diagnosticsBaselineState.message = '';
  diagnosticsHandoffMissingFields.value = new Set();
  const activeRow = activeDiagnosticsDelta.value;
  if (!activeRow) {
    diagnosticsBaselineState.error = 'Select a contract-bundle section before validating handoff evidence.';
    return;
  }
  if (diagnosticsHandoffLinkPreview.value.changedCount > 0) {
    diagnosticsBaselineState.error = `Canonicalize ${diagnosticsHandoffLinkPreview.value.changedCount} link(s) before validating packet.`;
    return;
  }
  const validation = validateEvidencePacketLintChecklistDraft(diagnosticsHandoffDraft.value);
  diagnosticsHandoffMissingFields.value = new Set(validation.missingFields);
  if (validation.errors.length > 0) {
    diagnosticsBaselineState.error = validation.errors[0];
    return;
  }
  if (!validation.isComplete) {
    diagnosticsBaselineState.error = `Packet is incomplete. Missing fields: ${validation.missingFields.join(', ')}.`;
    return;
  }
  diagnosticsBaselineState.message = `Handoff packet validated for ${activeRow.sourceIssueIdentifier} (${activeRow.fieldPath}).`;
}

function saveReleaseReadinessSnapshot() {
  resetReleaseReadinessState();
  const lane = activeReleaseReadinessLane.value;
  if (!lane) {
    releaseReadinessState.error = 'Select a readiness lane before saving scenario snapshot.';
    return;
  }
  const savedAt = new Date().toISOString();
  const byLane = new Map(releaseReadinessSnapshots.value.map((snapshot) => [snapshot.laneId, snapshot]));
  byLane.set(lane.id, {
    laneId: lane.id,
    issueIdentifier: lane.issueIdentifier,
    savedAt,
  });
  releaseReadinessSnapshots.value = [...byLane.values()]
    .sort((left, right) => left.issueIdentifier.localeCompare(right.issueIdentifier));
  releaseReadinessState.message = `Saved scenario snapshot for ${lane.issueIdentifier} at ${savedAt}.`;
}

function validateReleaseReadinessLanePacket() {
  resetReleaseReadinessState();
  const lane = activeReleaseReadinessLane.value;
  if (!lane) {
    releaseReadinessState.error = 'Select a readiness lane before validating packet.';
    return;
  }
  const badges = buildReleaseReadinessEvidenceBadges(lane.draft);
  const missingRequired = badges.filter((badge) => badge.required && !badge.complete);
  const drift = classifyBlockerEtaDrift({
    baselineEta: lane.etaBaseline,
    latestEta: lane.etaLatest,
  });
  if (missingRequired.length > 0) {
    releaseReadinessState.error = `Missing required evidence fields: ${missingRequired.map((badge) => badge.field).join(', ')}.`;
    return;
  }
  releaseReadinessState.message = `Lane packet validated (${drift.classification}, drift ${drift.etaDriftMinutes}m).`;
}

function setActiveDispatchCockpitRow(rowId: string) {
  resetDispatchCockpitState();
  activeDispatchCockpitRowId.value = rowId;
  const activeLane = dispatchCockpit.value.rows.find((row) => row.id === rowId) ?? null;
  if (!activeLane) {
    dispatchDraft.value = getDefaultDispatchEvidenceDraft({
      laneId: '',
      issueIdentifier: '',
      laneType: 'dispatch_queue',
    });
    return;
  }
  const existing = dispatchDraftBank.value.find((draftRow) => draftRow.laneId === activeLane.id);
  dispatchDraft.value = existing
    ? { ...existing }
    : getDefaultDispatchEvidenceDraft({
      laneId: activeLane.id,
      issueIdentifier: activeLane.issueIdentifier,
      laneType: activeLane.laneType,
    });
}

function updateDispatchDraftPrMode(mode: 'pr_link' | 'no_pr_yet') {
  dispatchDraft.value = applyDispatchEvidenceDraftPrMode({
    draft: dispatchDraft.value,
    prMode: mode,
  });
}

function saveDispatchDraft() {
  resetDispatchCockpitState();
  const activeLane = activeDispatchCockpitRow.value;
  if (!activeLane) {
    dispatchCockpitState.error = 'Select a blocked lane before saving.';
    return;
  }
  const draftToSave = {
    ...dispatchDraft.value,
    laneId: activeLane.id,
    issueIdentifier: activeLane.issueIdentifier,
    laneType: activeLane.laneType,
    updatedAt: new Date().toISOString(),
  };
  dispatchDraftBank.value = upsertDispatchEvidenceDraft({
    drafts: dispatchDraftBank.value,
    draft: draftToSave,
  });
  dispatchDraft.value = draftToSave;
  dispatchCockpitState.message = `Saved queued draft for ${activeLane.issueIdentifier} (${activeLane.laneType}).`;
}

function validateDispatchDraft() {
  resetDispatchCockpitState();
  const validation = validateDispatchEvidenceDraft(dispatchDraft.value);
  dispatchDraftMissingFields.value = new Set(validation.missingFields);
  if (validation.isComplete) {
    dispatchCockpitState.message = `Draft validated. Canonical links: ${validation.dependencyIssueLinks.length}.`;
    return;
  }
  const errorParts: string[] = [];
  if (validation.missingFields.length > 0) {
    errorParts.push(`Missing: ${validation.missingFields.join(', ')}`);
  }
  if (validation.errors.length > 0) {
    errorParts.push(validation.errors.join(' '));
  }
  dispatchCockpitState.error = errorParts.join(' | ') || 'Dispatch draft is incomplete.';
}

function focusDispatchCockpit() {
  dispatchCockpitPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  dispatchDraftBranchInputRef.value?.focus();
}

function setActiveRemediationRunbookStep(stepId: string) {
  resetRemediationRunbookState();
  activeRemediationRunbookStepId.value = stepId;
  const step = remediationRunbookTimelineBoard.value.rows.find((row) => row.id === stepId) ?? null;
  if (!step) {
    remediationRunbookHandoffDraft.value = getDefaultRemediationRunbookHandoffPackDraft({
      stepId: '',
      issueIdentifier: '',
    });
    return;
  }
  const existing = remediationRunbookHandoffDraft.value;
  if (existing.stepId === step.id) {
    return;
  }
  remediationRunbookHandoffDraft.value = getDefaultRemediationRunbookHandoffPackDraft({
    stepId: step.id,
    issueIdentifier: step.issueIdentifier,
  });
}

function focusRemediationRunbookTimelineBoard() {
  remediationRunbookTimelinePanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  remediationRunbookTimelinePanelRef.value?.focus();
}

function openRemediationRunbookComposer() {
  resetRemediationRunbookState();
  if (!activeRemediationRunbookStep.value && remediationRunbookTimelineBoard.value.rows.length) {
    setActiveRemediationRunbookStep(remediationRunbookTimelineBoard.value.rows[0].id);
  }
  remediationRunbookComposerOpen.value = true;
  nextTick(() => {
    remediationRunbookBranchInputRef.value?.focus();
  });
}

function updateRemediationRunbookHandoffPrMode(mode: 'pr_link' | 'no_pr_yet') {
  remediationRunbookHandoffDraft.value = applyRemediationRunbookHandoffPackPrMode({
    draft: remediationRunbookHandoffDraft.value,
    prMode: mode,
  });
}

function validateRemediationRunbookHandoffPack() {
  resetRemediationRunbookState();
  const step = activeRemediationRunbookStep.value;
  if (!step) {
    remediationRunbookState.error = 'Select a runbook step before validating handoff pack.';
    return;
  }
  const validation = validateRemediationRunbookHandoffPackDraft({
    ...remediationRunbookHandoffDraft.value,
    stepId: step.id,
    issueIdentifier: step.issueIdentifier,
    updatedAt: new Date().toISOString(),
  });
  remediationRunbookHandoffMissingFields.value = new Set(validation.missingFields);
  if (validation.isComplete) {
    remediationRunbookState.message = `Runbook handoff validated. Canonical links: ${validation.dependencyIssueLinks.length}.`;
    return;
  }
  const errorParts: string[] = [];
  if (validation.missingFields.length > 0) {
    errorParts.push(`Missing: ${validation.missingFields.join(', ')}`);
  }
  if (validation.errors.length > 0) {
    errorParts.push(validation.errors.join(' '));
  }
  remediationRunbookState.error = errorParts.join(' | ') || 'Runbook handoff pack is incomplete.';
}

function clearRemediationRunbookHandoffPack(confirmFullReset: boolean) {
  resetRemediationRunbookState();
  const step = activeRemediationRunbookStep.value;
  if (!step) {
    remediationRunbookState.error = 'Select a runbook step before clearing handoff pack.';
    return;
  }
  const next = resetRemediationRunbookHandoffPackDraft({
    stepId: step.id,
    issueIdentifier: step.issueIdentifier,
    confirmFullReset,
  });
  remediationRunbookHandoffDraft.value = next.draft;
  remediationRunbookState.message = next.message;
  if (next.didFullReset) {
    remediationRunbookComposerOpen.value = false;
  }
}

function clearRemediationRunbookHandoffPackWithConfirm() {
  if (import.meta.client && !window.confirm('Full reset clears the active runbook handoff draft. Continue?')) {
    return;
  }
  clearRemediationRunbookHandoffPack(true);
}

function isRemediationRunbookHandoffFieldMissing(fieldKey: string): boolean {
  return remediationRunbookHandoffMissingFields.value.has(fieldKey);
}

function setActiveManifestDiffRow(rowId: string) {
  resetManifestDiffState();
  activeManifestDiffRowId.value = rowId;
  const row = manifestDiffViewer.value.rows.find((candidate) => candidate.id === rowId) ?? null;
  if (!row) {
    manifestHandoffDrillDraft.value = getDefaultBlockedLaneHandoffDrillDraft({
      laneId: '',
      issueIdentifier: '',
    });
    return;
  }
  const existing = manifestHandoffDrillDraft.value;
  if (existing.laneId === row.id) {
    return;
  }
  manifestHandoffDrillDraft.value = getDefaultBlockedLaneHandoffDrillDraft({
    laneId: row.id,
    issueIdentifier: row.issueIdentifier,
  });
}

function focusManifestDiffViewer() {
  manifestDiffPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  manifestDiffPanelRef.value?.focus();
}

function openManifestHandoffDrill() {
  resetManifestDiffState();
  if (!activeManifestDiffRow.value && manifestDiffViewer.value.rows.length) {
    setActiveManifestDiffRow(manifestDiffViewer.value.rows[0].id);
  }
  manifestHandoffDrillOpen.value = true;
  nextTick(() => {
    manifestDiffBranchInputRef.value?.focus();
  });
}

function updateManifestHandoffPrMode(mode: 'pr_link' | 'no_pr_yet') {
  manifestHandoffDrillDraft.value = applyBlockedLaneHandoffDrillPrMode({
    draft: manifestHandoffDrillDraft.value,
    prMode: mode,
  });
}

function validateManifestHandoffDrill() {
  resetManifestDiffState();
  const row = activeManifestDiffRow.value;
  if (!row) {
    manifestDiffState.error = 'Select a manifest finding before validating handoff drill.';
    return;
  }
  const validation = validateBlockedLaneHandoffDrillDraft({
    ...manifestHandoffDrillDraft.value,
    laneId: row.id,
    issueIdentifier: row.issueIdentifier,
    updatedAt: new Date().toISOString(),
  });
  manifestHandoffMissingFields.value = new Set(validation.missingFields);
  if (validation.isComplete) {
    manifestDiffState.message = `Handoff drill packet validated. Canonical links: ${validation.dependencyIssueLinks.length}.`;
    return;
  }
  const errorParts: string[] = [];
  if (validation.missingFields.length > 0) {
    errorParts.push(`Missing: ${validation.missingFields.join(', ')}`);
  }
  if (validation.errors.length > 0) {
    errorParts.push(validation.errors.join(' '));
  }
  manifestDiffState.error = errorParts.join(' | ') || 'Manifest handoff drill packet is incomplete.';
}

function clearManifestHandoffDrill(confirmFullReset: boolean) {
  resetManifestDiffState();
  const row = activeManifestDiffRow.value;
  if (!row) {
    manifestDiffState.error = 'Select a manifest finding before clearing handoff drill.';
    return;
  }
  const next = resetBlockedLaneHandoffDrillDraft({
    laneId: row.id,
    issueIdentifier: row.issueIdentifier,
    confirmFullReset,
  });
  manifestHandoffDrillDraft.value = next.draft;
  manifestDiffState.message = next.message;
  if (next.didFullReset) {
    manifestHandoffDrillOpen.value = false;
  }
}

function clearManifestHandoffDrillWithConfirm() {
  if (import.meta.client && !window.confirm('Full reset clears the active blocked-lane handoff drill. Continue?')) {
    return;
  }
  clearManifestHandoffDrill(true);
}

function isManifestHandoffFieldMissing(fieldKey: string): boolean {
  return manifestHandoffMissingFields.value.has(fieldKey);
}

function isRemediationPlaybookFieldMissing(fieldKey: string): boolean {
  return remediationPlaybookMissingFields.value.has(fieldKey);
}

function setActiveAnomalyTriageRow(rowId: string, preserveCurrentDraft = true) {
  resetRemediationPlaybookState();
  const currentDraft = remediationPlaybookDraft.value;
  if (preserveCurrentDraft && currentDraft.anomalyId) {
    remediationPlaybookDraftBank.value = upsertRemediationPlaybookDraft({
      drafts: remediationPlaybookDraftBank.value,
      draft: currentDraft,
    });
  }
  activeAnomalyTriageRowId.value = rowId;
  const row = anomalyTriageBoard.value.rows.find((candidate) => candidate.id === rowId) ?? null;
  if (!row) {
    remediationPlaybookDraft.value = getDefaultRemediationPlaybookDraft({
      anomalyId: '',
      issueIdentifier: '',
      category: 'missing',
    });
    return;
  }
  const existing = remediationPlaybookDraftBank.value.find((draft) => draft.anomalyId === row.id);
  remediationPlaybookDraft.value = existing
    ? { ...existing }
    : getDefaultRemediationPlaybookDraft({
      anomalyId: row.id,
      issueIdentifier: row.issueIdentifier,
      category: row.category,
    });
  remediationPlaybookMissingFields.value = new Set();
}

function focusAnomalyTriageBoard() {
  anomalyTriageBoardPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  anomalyTriageBoardPanelRef.value?.focus();
}

function openRemediationPlaybookComposer() {
  resetRemediationPlaybookState();
  if (!activeAnomalyTriageRow.value && anomalyTriageBoard.value.rows.length) {
    setActiveAnomalyTriageRow(anomalyTriageBoard.value.rows[0].id, false);
  }
  remediationPlaybookComposerOpen.value = true;
  nextTick(() => {
    remediationPlaybookOwnerInputRef.value?.focus();
  });
}

function closeRemediationPlaybookComposer() {
  remediationPlaybookComposerOpen.value = false;
}

function saveRemediationPlaybookDraft() {
  resetRemediationPlaybookState();
  const row = activeAnomalyTriageRow.value;
  if (!row) {
    remediationPlaybookState.error = 'Select an anomaly row before saving playbook draft.';
    return;
  }
  const draftToSave = {
    ...remediationPlaybookDraft.value,
    anomalyId: row.id,
    issueIdentifier: row.issueIdentifier,
    category: row.category,
    updatedAt: new Date().toISOString(),
  };
  remediationPlaybookDraftBank.value = upsertRemediationPlaybookDraft({
    drafts: remediationPlaybookDraftBank.value,
    draft: draftToSave,
  });
  remediationPlaybookDraft.value = draftToSave;
  remediationPlaybookState.message = `Saved remediation draft for ${row.issueIdentifier} (${row.category}).`;
}

function validateActiveRemediationPlaybook() {
  resetRemediationPlaybookState();
  const validation = validateRemediationPlaybookDraft(remediationPlaybookDraft.value);
  remediationPlaybookMissingFields.value = new Set(validation.missingFields);
  if (!validation.isComplete) {
    const errorParts: string[] = [];
    if (validation.missingFields.length > 0) {
      errorParts.push(`Missing: ${validation.missingFields.join(', ')}`);
    }
    if (validation.errors.length > 0) {
      errorParts.push(validation.errors.join(' '));
    }
    remediationPlaybookState.error = errorParts.join(' | ') || 'Remediation playbook is incomplete.';
    return;
  }
  saveRemediationPlaybookDraft();
  remediationPlaybookState.message = `Playbook packet validated. Canonical links: ${validation.dependencyIssueLinks.length}.`;
}

function clearRemediationPlaybookDraft(confirmFullReset: boolean) {
  resetRemediationPlaybookState();
  const row = activeAnomalyTriageRow.value;
  if (!row) {
    remediationPlaybookState.error = 'Select an anomaly row before clearing playbook draft.';
    return;
  }
  const next = resetRemediationPlaybookDraftSafe({
    anomalyId: row.id,
    issueIdentifier: row.issueIdentifier,
    category: row.category,
    confirmFullReset,
  });
  if (next.didFullReset) {
    remediationPlaybookDraftBank.value = [];
  } else {
    remediationPlaybookDraftBank.value = remediationPlaybookDraftBank.value.filter((draft) => draft.anomalyId !== row.id);
  }
  remediationPlaybookDraft.value = next.draft;
  remediationPlaybookMissingFields.value = new Set();
  remediationPlaybookState.message = next.message;
}

function clearRemediationPlaybookDraftWithConfirm() {
  if (import.meta.client && !window.confirm('Full reset clears all staged remediation drafts across anomaly lanes. Continue?')) {
    return;
  }
  clearRemediationPlaybookDraft(true);
}

function setActiveConflictDrilldown(key: ExceptionConflictDrilldownKey) {
  activeConflictDrilldown.value = key;
  const nextRows = filterExceptionDiffInspectorRows(bulkDiffInspector.value.rows, key);
  activeBulkDiffRowId.value = nextRows[0]?.id ?? '';
}

function setActiveBulkDiffRow(rowId: string) {
  activeBulkDiffRowId.value = rowId;
}

function setActiveRollbackPlanReason(reasonCode: ExceptionSimulationReasonDrilldownKey) {
  activeRollbackPlanReason.value = reasonCode;
}

function setActiveScenarioMatrixFilter(filter: ScenarioCompareMatrixFilterKey) {
  activeScenarioMatrixFilter.value = filter;
}

function stageSelectedRowsIntoDecisionQueue() {
  resetDecisionQueueState();
  if (!selectedExceptionIds.value.length) {
    decisionQueueState.error = 'Select rows first, then stage them into the operator queue.';
    return;
  }
  queueDraftRowIds.value = Array.from(new Set([
    ...queueDraftRowIds.value,
    ...selectedExceptionIds.value,
  ]));
  decisionQueueState.message = `Staged ${operatorDecisionQueue.value.items.length} row(s) in the operator decision queue.`;
}

function unstageDecisionQueueItem(itemId: string) {
  resetDecisionQueueState();
  const item = operatorDecisionQueue.value.items.find((queueItem) => queueItem.id === itemId);
  if (!item) {
    return;
  }
  queueDraftRowIds.value = queueDraftRowIds.value.filter((rowId) => rowId !== item.rowId);
  decisionQueueState.message = `Unstaged ${item.rowId} from operator decision queue.`;
}

function resetDecisionQueueDraftSafe() {
  resetDecisionQueueState();
  const safe = resetOperatorDecisionQueueDraftSafe({
    activeMatrixFilter: activeScenarioMatrixFilter.value,
    confirmFilterReset: false,
  });
  queueDraftRowIds.value = safe.stagedRowIds;
  activeScenarioMatrixFilter.value = safe.activeMatrixFilter;
  decisionQueueState.message = safe.message;
}

function resetDecisionQueueDraftWithFilterConfirm() {
  resetDecisionQueueState();
  if (import.meta.client && !window.confirm('Reset queue draft and matrix filter to all?')) {
    return;
  }
  const confirmed = resetOperatorDecisionQueueDraftSafe({
    activeMatrixFilter: activeScenarioMatrixFilter.value,
    confirmFilterReset: true,
  });
  queueDraftRowIds.value = confirmed.stagedRowIds;
  activeScenarioMatrixFilter.value = confirmed.activeMatrixFilter;
  decisionQueueState.message = confirmed.message;
}

function setActiveReviewQueueFilter(filter: ReviewQueueLedgerFilterKey) {
  resetReviewQueueLedgerState();
  activeReviewQueueFilter.value = filter;
  const nextRows = filterReviewQueueLedgerRows(reviewQueueLedger.value.rows, filter);
  if (!nextRows.some((row) => row.id === activeReviewQueueRowId.value)) {
    activeReviewQueueRowId.value = nextRows[0]?.id ?? '';
  }
}

function setActiveEvidencePacketLintFilter(filter: EvidencePacketLintFilterKey) {
  resetEvidencePacketLintState();
  activeEvidencePacketLintFilter.value = filter;
  const nextRows = evidencePacketLintConsole.value.rows;
  if (!nextRows.some((row) => row.id === activeEvidencePacketLintFindingId.value)) {
    activeEvidencePacketLintFindingId.value = nextRows[0]?.id ?? '';
  }
}

function setActiveEvidencePacketLintFinding(findingId: string) {
  resetEvidencePacketLintState();
  activeEvidencePacketLintFindingId.value = findingId;
}

function updateEvidencePacketLintPrMode(mode: 'pr_link' | 'no_pr_yet') {
  evidencePacketLintChecklistDraft.value = applyEvidencePacketLintChecklistPrMode({
    draft: evidencePacketLintChecklistDraft.value,
    prMode: mode,
  });
}

function validateEvidencePacketLintChecklist() {
  resetEvidencePacketLintState();
  const validation = validateEvidencePacketLintChecklistDraft(evidencePacketLintChecklistDraft.value);
  evidencePacketLintChecklistMissingFields.value = new Set(validation.missingFields);
  if (validation.isComplete) {
    evidencePacketLintState.message = `Evidence packet checklist validated. Dependency links: ${validation.dependencyIssueLinks.length}.`;
    return;
  }
  const errorParts: string[] = [];
  if (validation.missingFields.length > 0) {
    errorParts.push(`Missing: ${validation.missingFields.join(', ')}`);
  }
  if (validation.errors.length > 0) {
    errorParts.push(validation.errors.join(' '));
  }
  evidencePacketLintState.error = errorParts.join(' | ') || 'Evidence packet checklist is incomplete.';
}

function clearEvidencePacketLintChecklistDraft(confirmFullReset: boolean) {
  resetEvidencePacketLintState();
  const next = resetEvidencePacketLintChecklistDraftSafe({
    activeFilter: activeEvidencePacketLintFilter.value,
    activeFindingId: activeEvidencePacketLintFindingId.value,
    confirmFullReset,
  });
  evidencePacketLintChecklistDraft.value = next.draft;
  activeEvidencePacketLintFilter.value = next.activeFilter;
  activeEvidencePacketLintFindingId.value = next.activeFindingId;
  evidencePacketLintState.message = next.message;
}

function clearEvidencePacketLintChecklistDraftWithConfirm() {
  if (import.meta.client && !window.confirm('Full reset clears checklist draft, filter, and active lint finding. Continue?')) {
    return;
  }
  clearEvidencePacketLintChecklistDraft(true);
}

function focusEvidencePacketLintList() {
  evidencePacketLintPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  evidencePacketLintBranchInputRef.value?.focus();
}

function isEvidencePacketLintFieldMissing(fieldKey: string): boolean {
  return evidencePacketLintChecklistMissingFields.value.has(fieldKey);
}

function setActiveEvidenceTimelineLane(lane: ReviewQueueLedgerFilterKey) {
  activeEvidenceTimelineLane.value = lane;
  const nextRows = evidenceTimelineHeatmap.value.rows;
  if (!nextRows.some((row) => row.id === activeEvidenceTimelineRowId.value)) {
    activeEvidenceTimelineRowId.value = nextRows[0]?.id ?? '';
  }
}

function setActiveEvidenceTimelineRow(rowId: string) {
  activeEvidenceTimelineRowId.value = rowId;
}

function focusEvidenceTimelineHeatmap() {
  evidenceTimelineHeatmapPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  evidenceTimelineHeatmapPanelRef.value?.focus();
}

function selectReviewQueueLedgerRow(rowId: string) {
  resetReviewQueueLedgerState();
  activeReviewQueueRowId.value = rowId;
  reviewQueueLedgerState.message = `Selected digest row ${rowId}.`;
}

function autofillReviewQueueHandoffPacketFromActiveRow() {
  resetReviewQueueLedgerState();
  resetReviewQueueHandoffValidation();
  const activeRow = activeReviewQueueRow.value;
  if (!activeRow) {
    reviewQueueLedgerState.error = 'Select a digest row before autofill.';
    return;
  }
  reviewQueueHandoffDraft.value = buildReviewQueueHandoffPacketDraftFromLedgerRow({
    activeRow,
  });
  reviewQueueLedgerState.message = `Autofilled publish packet for ${activeRow.id}.`;
}

function validateReviewQueueHandoffPacket() {
  resetReviewQueueHandoffValidation();
  const validation = validateReviewQueueHandoffPacketDraft(reviewQueueHandoffDraft.value);
  reviewQueueHandoffMissingFields.value = new Set(validation.missingFields);
  if (validation.isComplete) {
    reviewQueueHandoffValidation.message = `Publish packet validated. Artifacts: ${validation.artifactPaths.length}, related issues: ${validation.dependentIssueLinks.length}.`;
    return;
  }
  const errorParts: string[] = [];
  if (validation.missingFields.length > 0) {
    errorParts.push(`Missing: ${validation.missingFields.join(', ')}`);
  }
  if (validation.errors.length > 0) {
    errorParts.push(validation.errors.join(' '));
  }
  reviewQueueHandoffValidation.error = errorParts.join(' | ') || 'Publish packet is incomplete.';
}

function clearReviewQueueHandoffPacketDraft(confirmFullReset: boolean) {
  resetReviewQueueLedgerState();
  resetReviewQueueHandoffValidation();
  const next = resetReviewQueueHandoffPacketDraftSafe({
    activeFilter: activeReviewQueueFilter.value,
    activeRowId: activeReviewQueueRowId.value,
    confirmFullReset,
  });
  reviewQueueHandoffDraft.value = next.draft;
  activeReviewQueueFilter.value = next.activeFilter;
  activeReviewQueueRowId.value = next.activeRowId;
  reviewQueueLedgerState.message = next.message;
}

function clearReviewQueueHandoffPacketDraftWithConfirm() {
  if (import.meta.client && !window.confirm('Full reset clears packet draft, queue filter, and active selection. Continue?')) {
    return;
  }
  clearReviewQueueHandoffPacketDraft(true);
}

function focusReviewQueueHandoffPacket() {
  reviewQueueHandoffPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  reviewQueueHandoffBranchInputRef.value?.focus();
}

function isPublishPacketFieldMissing(fieldKey: string): boolean {
  return reviewQueueHandoffMissingFields.value.has(fieldKey);
}

function resetReplayCompareState() {
  replayCompareState.error = '';
  replayCompareState.message = '';
}

function resetReplayDiffState() {
  replayDiffState.error = '';
  replayDiffState.message = '';
  evidenceGapChecklistMissingFields.value = new Set();
}

function resetTimelineScrubberState() {
  timelineScrubberState.error = '';
  timelineScrubberState.message = '';
}

function setActiveBookmarkFilter(filter: IncidentBookmarkFilterKey) {
  resetReplayCompareState();
  activeBookmarkFilter.value = filter;
}

function setActiveReplayBookmark(bookmarkId: string) {
  activeReplayBookmarkId.value = bookmarkId;
}

function pinReplayBookmarkPrimary(bookmarkId: string) {
  resetReplayCompareState();
  replayComparePrimaryBookmarkId.value = bookmarkId;
  if (replayCompareSecondaryBookmarkId.value === bookmarkId) {
    replayCompareSecondaryBookmarkId.value = '';
  }
  replayCompareState.message = `Pinned ${bookmarkId} as primary bookmark.`;
}

function pinReplayBookmarkSecondary(bookmarkId: string) {
  resetReplayCompareState();
  replayCompareSecondaryBookmarkId.value = bookmarkId;
  if (replayComparePrimaryBookmarkId.value === bookmarkId) {
    replayComparePrimaryBookmarkId.value = '';
  }
  replayCompareState.message = `Pinned ${bookmarkId} as secondary bookmark.`;
}

function swapReplayComparePins() {
  resetReplayCompareState();
  const swapped = swapReplayBookmarkCompareSlots({
    primaryBookmarkId: replayComparePrimaryBookmarkId.value,
    secondaryBookmarkId: replayCompareSecondaryBookmarkId.value,
  });
  replayComparePrimaryBookmarkId.value = swapped.primaryBookmarkId;
  replayCompareSecondaryBookmarkId.value = swapped.secondaryBookmarkId;
  replayCompareState.message = 'Swapped primary and secondary bookmarks.';
}

function clearReplayCompareDraftSafe() {
  resetReplayCompareState();
  const safe = resetReplayBookmarkCompareDraftSafe({
    activeBookmarkFilter: activeBookmarkFilter.value,
    confirmFilterReset: false,
  });
  replayComparePrimaryBookmarkId.value = safe.primaryBookmarkId;
  replayCompareSecondaryBookmarkId.value = safe.secondaryBookmarkId;
  activeBookmarkFilter.value = safe.activeBookmarkFilter;
  replayCompareState.message = safe.message;
}

function clearReplayCompareDraftWithFilterConfirm() {
  resetReplayCompareState();
  if (import.meta.client && !window.confirm('Reset replay compare draft and bookmark severity filter to all?')) {
    return;
  }
  const confirmed = resetReplayBookmarkCompareDraftSafe({
    activeBookmarkFilter: activeBookmarkFilter.value,
    confirmFilterReset: true,
  });
  replayComparePrimaryBookmarkId.value = confirmed.primaryBookmarkId;
  replayCompareSecondaryBookmarkId.value = confirmed.secondaryBookmarkId;
  activeBookmarkFilter.value = confirmed.activeBookmarkFilter;
  replayCompareState.message = confirmed.message;
}

function pinActiveTimelineTickToPreset() {
  resetTimelineScrubberState();
  const pinned = pinOperatorTimelinePresetSlot({
    activePreset: activeTimelinePreset.value,
    activeTickId: activeTimelineTickId.value,
    baselineTickId: timelineBaselineTickId.value,
    candidateTickId: timelineCandidateTickId.value,
    overrideTickId: timelineOverrideTickId.value,
  });
  timelineBaselineTickId.value = pinned.baselineTickId;
  timelineCandidateTickId.value = pinned.candidateTickId;
  timelineOverrideTickId.value = pinned.overrideTickId;
  timelineScrubberState.message = `Pinned ${activeTimelineTickId.value || 'none'} to ${activeTimelinePreset.value}.`;
}

function pinActiveTimelineTickToOverride() {
  resetTimelineScrubberState();
  const pinned = pinOperatorTimelinePresetSlot({
    activePreset: 'override',
    activeTickId: activeTimelineTickId.value,
    baselineTickId: timelineBaselineTickId.value,
    candidateTickId: timelineCandidateTickId.value,
    overrideTickId: timelineOverrideTickId.value,
  });
  timelineBaselineTickId.value = pinned.baselineTickId;
  timelineCandidateTickId.value = pinned.candidateTickId;
  timelineOverrideTickId.value = pinned.overrideTickId;
  timelineScrubberState.message = `Pinned ${activeTimelineTickId.value || 'none'} to override slot.`;
}

function clearTimelineCompareDraftSafe() {
  resetTimelineScrubberState();
  const safe = resetOperatorTimelineCompareDraftSafe({
    activeSeverityFilter: activeBookmarkFilter.value,
    baselineTickId: timelineBaselineTickId.value,
    confirmFilterReset: false,
  });
  timelineBaselineTickId.value = safe.baselineTickId;
  timelineCandidateTickId.value = safe.candidateTickId;
  timelineOverrideTickId.value = safe.overrideTickId;
  activeBookmarkFilter.value = safe.activeSeverityFilter;
  timelineScrubberState.message = safe.message;
}

function setActiveReplayDiffFilter(filter: ReplayDiffInspectorFilterKey) {
  resetReplayDiffState();
  activeReplayDiffFilter.value = filter;
  const nextRows = filterReplayDiffInspectorRows(replayDiffInspector.value.rows, filter);
  if (!nextRows.some((row) => row.id === activeReplayDiffRowId.value)) {
    activeReplayDiffRowId.value = nextRows[0]?.id ?? '';
  }
}

function setActiveReplayDiffRow(rowId: string) {
  resetReplayDiffState();
  activeReplayDiffRowId.value = rowId;
}

function validateEvidenceGapChecklist() {
  resetReplayDiffState();
  const validation = validateEvidenceGapChecklistDraft(evidenceGapChecklistDraft.value);
  evidenceGapChecklistMissingFields.value = new Set(validation.missingFields);
  if (validation.isComplete) {
    replayDiffState.message = `Evidence-gap checklist validated. Missing artifacts: ${validation.missingArtifactPaths.length}, dependencies: ${validation.dependencyIssueLinks.length}.`;
    return;
  }
  const errorParts: string[] = [];
  if (validation.missingFields.length > 0) {
    errorParts.push(`Missing: ${validation.missingFields.join(', ')}`);
  }
  if (validation.errors.length > 0) {
    errorParts.push(validation.errors.join(' '));
  }
  replayDiffState.error = errorParts.join(' | ') || 'Evidence-gap checklist is incomplete.';
}

function clearEvidenceGapChecklistDraft(confirmFullReset: boolean) {
  resetReplayDiffState();
  const next = resetEvidenceGapChecklistDraftSafe({
    activeDiffFilter: activeReplayDiffFilter.value,
    primarySnapshotId: replayComparePrimaryBookmarkId.value,
    secondarySnapshotId: replayCompareSecondaryBookmarkId.value,
    activeHeatmapLane: activeEvidenceTimelineLane.value,
    activeHeatmapRowId: activeEvidenceTimelineRowId.value,
    confirmFullReset,
  });
  evidenceGapChecklistDraft.value = next.draft;
  activeReplayDiffFilter.value = next.activeDiffFilter;
  replayComparePrimaryBookmarkId.value = next.primarySnapshotId;
  replayCompareSecondaryBookmarkId.value = next.secondarySnapshotId;
  activeEvidenceTimelineLane.value = next.activeHeatmapLane;
  activeEvidenceTimelineRowId.value = next.activeHeatmapRowId;
  replayDiffState.message = next.message;
}

function clearEvidenceGapChecklistDraftWithConfirm() {
  if (import.meta.client && !window.confirm('Full reset clears checklist draft, diff filter, and selected snapshot pair. Continue?')) {
    return;
  }
  clearEvidenceGapChecklistDraft(true);
}

function focusReplayDiffInspector() {
  replayDiffPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  evidenceGapBranchInputRef.value?.focus();
}

function isEvidenceGapFieldMissing(fieldKey: string): boolean {
  return evidenceGapChecklistMissingFields.value.has(fieldKey);
}

function onReplayCompareKeydown(event: KeyboardEvent) {
  const targetTag = (event.target as HTMLElement | null)?.tagName ?? '';
  if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') {
    return;
  }
  const shortcut = resolveReplayBookmarkCompareShortcut(event.key);
  if (!shortcut) {
    return;
  }
  event.preventDefault();
  if (shortcut === 'select_prev' || shortcut === 'select_next') {
    activeReplayBookmarkId.value = moveReplayBookmarkSelection({
      items: filteredIncidentBookmarkItems.value,
      activeBookmarkId: activeReplayBookmarkId.value,
      direction: shortcut === 'select_prev' ? 'prev' : 'next',
    });
    replayCompareState.message = `Selected ${activeReplayBookmarkId.value || 'none'} in bookmark shelf.`;
    replayCompareState.error = '';
    return;
  }
  if (shortcut === 'swap') {
    swapReplayComparePins();
    return;
  }
  clearReplayCompareDraftSafe();
}

function onOperatorTimelineKeydown(event: KeyboardEvent) {
  const targetTag = (event.target as HTMLElement | null)?.tagName ?? '';
  if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') {
    return;
  }
  const shortcut = resolveOperatorTimelineShortcut({
    key: event.key,
    shiftKey: event.shiftKey,
  });
  if (!shortcut) {
    return;
  }
  event.preventDefault();
  if (shortcut === 'tick_prev' || shortcut === 'tick_next') {
    activeTimelineTickId.value = moveOperatorTimelineTickSelection({
      ticks: operatorTimelineScrubber.value.ticks,
      activeTickId: activeTimelineTickId.value,
      direction: shortcut === 'tick_prev' ? 'prev' : 'next',
    });
    timelineScrubberState.message = `Selected timeline tick ${activeTimelineTickId.value || 'none'}.`;
    timelineScrubberState.error = '';
    return;
  }
  if (shortcut === 'cycle_preset') {
    activeTimelinePreset.value = cycleOperatorTimelinePreset(activeTimelinePreset.value);
    timelineScrubberState.message = `Active compare preset switched to ${activeTimelinePreset.value}.`;
    timelineScrubberState.error = '';
    return;
  }
  if (shortcut === 'pin_override') {
    pinActiveTimelineTickToOverride();
    return;
  }
  clearTimelineCompareDraftSafe();
}

function onReplayDiffInspectorKeydown(event: KeyboardEvent) {
  const shortcut = resolveReplayDiffInspectorShortcut({
    key: event.key,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  });
  if (!shortcut) {
    return;
  }
  const targetTag = (event.target as HTMLElement | null)?.tagName ?? '';
  if ((targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT')
    && shortcut !== 'validate_checklist') {
    return;
  }
  event.preventDefault();
  if (shortcut === 'focus_diff_inspector') {
    focusReplayDiffInspector();
    return;
  }
  if (shortcut === 'next_row' || shortcut === 'prev_row') {
    activeReplayDiffRowId.value = moveReplayDiffInspectorSelection({
      rows: replayDiffInspector.value.rows,
      activeRowId: activeReplayDiffRowId.value,
      direction: shortcut === 'next_row' ? 'next' : 'prev',
    });
    return;
  }
  validateEvidenceGapChecklist();
}

function onEvidencePacketLintKeydown(event: KeyboardEvent) {
  const shortcut = resolveEvidencePacketLintShortcut({
    key: event.key,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  });
  if (!shortcut) {
    return;
  }
  const targetTag = (event.target as HTMLElement | null)?.tagName ?? '';
  if ((targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT')
    && shortcut !== 'validate_packet') {
    return;
  }
  event.preventDefault();
  if (shortcut === 'focus_lint_list') {
    focusEvidencePacketLintList();
    return;
  }
  if (shortcut === 'next_finding' || shortcut === 'prev_finding') {
    activeEvidencePacketLintFindingId.value = moveEvidencePacketLintSelection({
      rows: evidencePacketLintConsole.value.rows,
      activeFindingId: activeEvidencePacketLintFindingId.value,
      direction: shortcut === 'next_finding' ? 'next' : 'prev',
    });
    return;
  }
  validateEvidencePacketLintChecklist();
}

function onEvidenceTimelineHeatmapKeydown(event: KeyboardEvent) {
  const shortcut = resolveEvidenceTimelineHeatmapShortcut({
    key: event.key,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  });
  if (!shortcut) {
    return;
  }
  const targetTag = (event.target as HTMLElement | null)?.tagName ?? '';
  if ((targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT')
    && shortcut !== 'validate_checklist') {
    return;
  }
  event.preventDefault();
  if (shortcut === 'focus_heatmap') {
    focusEvidenceTimelineHeatmap();
    return;
  }
  if (shortcut === 'next_gap_row' || shortcut === 'prev_gap_row') {
    activeEvidenceTimelineRowId.value = moveEvidenceTimelineHeatmapSelection({
      rows: evidenceTimelineHeatmap.value.rows,
      activeRowId: activeEvidenceTimelineRowId.value,
      direction: shortcut,
    });
    return;
  }
  validateEvidenceGapChecklist();
}

function onDecisionQueueKeydown(event: KeyboardEvent) {
  const targetTag = (event.target as HTMLElement | null)?.tagName ?? '';
  if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') {
    return;
  }
  const shortcut = resolveOperatorDecisionQueueShortcut(event.key);
  if (!shortcut) {
    return;
  }
  event.preventDefault();
  if (shortcut === 'next' || shortcut === 'prev') {
    activeDecisionQueueItemId.value = moveOperatorDecisionQueueFocus({
      items: operatorDecisionQueue.value.items,
      activeItemId: activeDecisionQueueItemId.value,
      direction: shortcut === 'next' ? 'next' : 'prev',
    });
    return;
  }
  if (shortcut === 'unstage' && activeDecisionQueueItemId.value) {
    unstageDecisionQueueItem(activeDecisionQueueItemId.value);
  }
}

function onReviewQueueLedgerKeydown(event: KeyboardEvent) {
  const shortcut = resolveReviewQueueLedgerShortcut({
    key: event.key,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  });
  if (!shortcut) {
    return;
  }
  const targetTag = (event.target as HTMLElement | null)?.tagName ?? '';
  if ((targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT')
    && shortcut !== 'validate_handoff_packet') {
    return;
  }
  event.preventDefault();
  if (shortcut === 'next_row' || shortcut === 'prev_row') {
    activeReviewQueueRowId.value = moveReviewQueueLedgerSelection({
      rows: filteredReviewQueueLedgerRows.value,
      activeRowId: activeReviewQueueRowId.value,
      direction: shortcut === 'next_row' ? 'next' : 'prev',
    });
    return;
  }
  if (shortcut === 'focus_handoff_packet') {
    focusReviewQueueHandoffPacket();
    return;
  }
  validateReviewQueueHandoffPacket();
}

function onRemediationRunbookKeydown(event: KeyboardEvent) {
  const shortcut = resolveRemediationRunbookShortcut({
    key: event.key,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  });
  if (!shortcut) {
    return;
  }
  const targetTag = (event.target as HTMLElement | null)?.tagName ?? '';
  if ((targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT')
    && shortcut !== 'open_handoff_pack'
    && shortcut !== 'validate_active_pack') {
    return;
  }
  event.preventDefault();
  if (shortcut === 'focus_timeline_board') {
    focusRemediationRunbookTimelineBoard();
    return;
  }
  if (shortcut === 'next_step' || shortcut === 'prev_step') {
    const nextId = moveRemediationRunbookTimelineSelection({
      rows: remediationRunbookTimelineBoard.value.rows,
      activeRowId: activeRemediationRunbookStepId.value,
      direction: shortcut === 'next_step' ? 'next' : 'prev',
    });
    if (nextId) {
      setActiveRemediationRunbookStep(nextId);
    }
    return;
  }
  if (shortcut === 'open_handoff_pack') {
    openRemediationRunbookComposer();
    return;
  }
  validateRemediationRunbookHandoffPack();
}

function onManifestDiffKeydown(event: KeyboardEvent) {
  const shortcut = resolveManifestDiffShortcut({
    key: event.key,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  });
  if (!shortcut) {
    return;
  }
  const targetTag = (event.target as HTMLElement | null)?.tagName ?? '';
  if ((targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT')
    && shortcut !== 'open_handoff_drill'
    && shortcut !== 'validate_active_packet') {
    return;
  }
  event.preventDefault();
  if (shortcut === 'focus_manifest_diff') {
    focusManifestDiffViewer();
    return;
  }
  if (shortcut === 'next_finding' || shortcut === 'prev_finding') {
    const nextId = moveManifestDiffSelection({
      rows: manifestDiffViewer.value.rows,
      activeRowId: activeManifestDiffRowId.value,
      direction: shortcut === 'next_finding' ? 'next' : 'prev',
    });
    if (nextId) {
      setActiveManifestDiffRow(nextId);
    }
    return;
  }
  if (shortcut === 'open_handoff_drill') {
    openManifestHandoffDrill();
    return;
  }
  validateManifestHandoffDrill();
}

function onAnomalyTriageKeydown(event: KeyboardEvent) {
  const shortcut = resolveAnomalyTriageShortcut({
    key: event.key,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  });
  if (!shortcut) {
    return;
  }
  const targetTag = (event.target as HTMLElement | null)?.tagName ?? '';
  if ((targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT')
    && shortcut !== 'open_playbook_composer'
    && shortcut !== 'validate_active_playbook') {
    return;
  }
  event.preventDefault();
  if (shortcut === 'focus_anomaly_board') {
    focusAnomalyTriageBoard();
    return;
  }
  if (shortcut === 'next_anomaly' || shortcut === 'prev_anomaly') {
    const nextId = moveAnomalyTriageSelection({
      rows: anomalyTriageBoard.value.rows,
      activeRowId: activeAnomalyTriageRowId.value,
      direction: shortcut === 'next_anomaly' ? 'next' : 'prev',
    });
    if (nextId) {
      setActiveAnomalyTriageRow(nextId);
    }
    return;
  }
  if (shortcut === 'open_playbook_composer') {
    openRemediationPlaybookComposer();
    return;
  }
  validateActiveRemediationPlaybook();
}

function onPublicationWindowKeydown(event: KeyboardEvent) {
  const shortcut = resolvePublicationWindowPlanShortcut({
    key: event.key,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  });
  if (!shortcut) {
    return;
  }
  const targetTag = (event.target as HTMLElement | null)?.tagName ?? '';
  if ((targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT')
    && shortcut !== 'open_score_explainer'
    && shortcut !== 'open_dependency_gates') {
    return;
  }
  event.preventDefault();
  if (shortcut === 'focus_publication_window_board') {
    focusPublicationWindowPlanBoard();
    return;
  }
  if (shortcut === 'next_lane' || shortcut === 'prev_lane') {
    const nextLaneId = movePublicationWindowLaneSelection({
      rows: publicationWindowPlanBoard.value.rows,
      activeLaneId: activePublicationWindowLaneId.value,
      direction: shortcut,
    });
    setActivePublicationWindowLane(nextLaneId);
    return;
  }
  if (shortcut === 'open_score_explainer') {
    publicationWindowScoreExplainerOpen.value = true;
    publicationWindowState.message = 'Release-bundle score explainer opened for active lane.';
    return;
  }
  publicationWindowDependencyGatesOpen.value = true;
  publicationWindowState.message = 'Dependency-gate panel opened for active lane.';
}

function onDiagnosticsBaselineKeydown(event: KeyboardEvent) {
  const shortcut = resolveDiagnosticsBaselineCompareShortcut({
    key: event.key,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  });
  if (!shortcut) {
    return;
  }
  const targetTag = (event.target as HTMLElement | null)?.tagName ?? '';
  if ((targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT')
    && shortcut !== 'open_handoff_composer'
    && shortcut !== 'validate_handoff_packet') {
    return;
  }
  event.preventDefault();
  diagnosticsBaselineState.error = '';
  if (shortcut === 'focus_contract_bundle_explorer') {
    focusDiagnosticsBaselineCompare();
    return;
  }
  if (shortcut === 'next_section' || shortcut === 'prev_section') {
    activeDiagnosticsDeltaId.value = moveDiagnosticsBaselineDeltaSelection({
      rows: diagnosticsBaselineCompareWorkspace.value.rows,
      activeDeltaId: activeDiagnosticsDeltaId.value,
      direction: shortcut,
    });
    diagnosticsBaselineState.message = `Selected contract section ${activeDiagnosticsDeltaId.value || 'none'}.`;
    return;
  }
  if (shortcut === 'open_handoff_composer') {
    diagnosticsHandoffComposerOpen.value = true;
    diagnosticsBaselineState.message = 'Handoff evidence composer opened.';
    return;
  }
  validateDiagnosticsHandoffPacket();
}

function onRemediationManifestKeydown(event: KeyboardEvent) {
  const shortcut = resolveRemediationManifestShortcut({
    key: event.key,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  });
  if (!shortcut) {
    return;
  }
  const targetTag = (event.target as HTMLElement | null)?.tagName ?? '';
  if ((targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT')
    && shortcut !== 'open_dependency_graph'
    && shortcut !== 'export_handoff_packet') {
    return;
  }
  event.preventDefault();
  if (shortcut === 'focus_manifest_table') {
    focusRemediationManifestDrillboard();
    return;
  }
  if (shortcut === 'next_row' || shortcut === 'prev_row') {
    const nextRowId = moveRemediationManifestRowSelection({
      rows: remediationManifestDrillboard.value.rows,
      activeRowId: activeRemediationManifestRowId.value,
      direction: shortcut === 'next_row' ? 'next' : 'prev',
    });
    if (nextRowId) {
      setActiveRemediationManifestRow(nextRowId);
      remediationManifestState.message = `Selected remediation row ${nextRowId}.`;
    }
    return;
  }
  if (shortcut === 'open_dependency_graph') {
    openRemediationManifestDependencyGraph();
    return;
  }
  openRemediationManifestExportPacket();
}

function onDispatchCockpitKeydown(event: KeyboardEvent) {
  const releaseShortcut = resolveReleaseReadinessShortcut({
    key: event.key,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  });
  if (releaseShortcut) {
    const targetTag = (event.target as HTMLElement | null)?.tagName ?? '';
    if ((targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT')
      && releaseShortcut !== 'save_snapshot'
      && releaseShortcut !== 'validate_active_lane_packet') {
      return;
    }
    event.preventDefault();
    if (releaseShortcut === 'focus_readiness_simulator') {
      focusReleaseReadinessSimulator();
      return;
    }
    if (releaseShortcut === 'next_lane' || releaseShortcut === 'prev_lane') {
      activeReleaseReadinessLaneId.value = moveReleaseReadinessLaneSelection({
        rows: releaseReadinessSimulator.value.rows,
        activeLaneId: activeReleaseReadinessLaneId.value,
        direction: releaseShortcut,
      });
      setActiveReleaseReadinessLane(activeReleaseReadinessLaneId.value);
      return;
    }
    if (releaseShortcut === 'save_snapshot') {
      saveReleaseReadinessSnapshot();
      return;
    }
    validateReleaseReadinessLanePacket();
    return;
  }

  const shortcut = resolveDispatchCockpitShortcut({
    key: event.key,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  });
  if (!shortcut) {
    return;
  }
  const targetTag = (event.target as HTMLElement | null)?.tagName ?? '';
  if ((targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT')
    && shortcut !== 'save_active_draft'
    && shortcut !== 'validate_active_draft') {
    return;
  }
  event.preventDefault();
  if (shortcut === 'focus_blocker_cockpit') {
    focusDispatchCockpit();
    return;
  }
  if (shortcut === 'next_blocked_lane' || shortcut === 'prev_blocked_lane') {
    activeDispatchCockpitRowId.value = moveDispatchCockpitSelection({
      rows: dispatchCockpit.value.rows,
      activeRowId: activeDispatchCockpitRowId.value,
      direction: shortcut,
    });
    setActiveDispatchCockpitRow(activeDispatchCockpitRowId.value);
    return;
  }
  if (shortcut === 'save_active_draft') {
    saveDispatchDraft();
    return;
  }
  validateDispatchDraft();
}

function resolveExplainabilityReasonCounts() {
  return {
    stale_version: bulkDiffInspector.value.reasonCounts.stale_version,
    malformed: bulkDiffInspector.value.reasonCounts.malformed,
    high_delta: bulkDiffInspector.value.reasonCounts.high_delta,
    mixed_status: bulkDiffInspector.value.reasonCounts.mixed_status,
  };
}

function loadExplainabilityDraftForSlot(slotIndex: 1 | 2 | 3 | 4) {
  const slot = explainabilityPresetSlots.value.find((candidate) => candidate.slotIndex === slotIndex);
  if (!slot) {
    return;
  }
  const draft = buildExplainabilityComposerDraftFromSlot(slot);
  explainabilityDraft.name = draft.name;
  explainabilityDraft.reasonBuckets = { ...draft.reasonBuckets };
  explainabilityDraft.severityWindow = draft.severityWindow;
}

function openExplainabilityComposer(slotIndex = activeExplainabilitySlotIndex.value) {
  explainabilityComposerOpen.value = true;
  activeExplainabilitySlotIndex.value = slotIndex as 1 | 2 | 3 | 4;
  explainabilityComposerState.error = '';
  explainabilityComposerState.message = '';
  loadExplainabilityDraftForSlot(activeExplainabilitySlotIndex.value);
}

function closeExplainabilityComposer(resetDraftOnly = true) {
  if (resetDraftOnly) {
    const safe = resetExplainabilityComposerDraftSafe({
      slots: explainabilityPresetSlots.value,
      activeSlotIndex: activeExplainabilitySlotIndex.value,
      appliedChips: explainabilityAppliedChips.value,
    });
    explainabilityDraft.name = safe.draft.name;
    explainabilityDraft.reasonBuckets = { ...safe.draft.reasonBuckets };
    explainabilityDraft.severityWindow = safe.draft.severityWindow;
    explainabilityAppliedChips.value = safe.appliedChips;
  }
  explainabilityComposerOpen.value = false;
}

function applyExplainabilitySlot(slotIndex: 1 | 2 | 3 | 4) {
  const applied = applyExplainabilityPresetSlot({
    slots: explainabilityPresetSlots.value,
    slotIndex,
    reasonCounts: resolveExplainabilityReasonCounts(),
  });
  activeExplainabilitySlotIndex.value = applied.activeSlotIndex;
  explainabilityAppliedChips.value = applied.chips;
  explainabilityPendingReplaceSlot.value = null;
  explainabilityComposerState.message = `Applied explainability slot ${slotIndex}.`;
  explainabilityComposerState.error = '';
  loadExplainabilityDraftForSlot(slotIndex);
}

function overwriteExplainabilitySlot(slotIndex: 1 | 2 | 3 | 4) {
  explainabilityPresetSlots.value = overwriteExplainabilityPresetSlot({
    slots: explainabilityPresetSlots.value,
    slotIndex,
    draft: explainabilityDraft,
  });
  activeExplainabilitySlotIndex.value = slotIndex;
  explainabilityPendingReplaceSlot.value = slotIndex;
  explainabilityComposerState.error = '';
  explainabilityComposerState.message = `Slot ${slotIndex} overwritten. Confirm replacement to apply updated chips.`;
}

function confirmExplainabilityReplacement() {
  const slotIndex = explainabilityPendingReplaceSlot.value;
  if (!slotIndex) {
    return;
  }
  applyExplainabilitySlot(slotIndex);
}

function applyExplainabilityResetSafe() {
  const safe = resetExplainabilityComposerDraftSafe({
    slots: explainabilityPresetSlots.value,
    activeSlotIndex: activeExplainabilitySlotIndex.value,
    appliedChips: explainabilityAppliedChips.value,
  });
  explainabilityDraft.name = safe.draft.name;
  explainabilityDraft.reasonBuckets = { ...safe.draft.reasonBuckets };
  explainabilityDraft.severityWindow = safe.draft.severityWindow;
  explainabilityAppliedChips.value = safe.appliedChips;
  explainabilityComposerState.message = 'Reset-safe: draft cleared; applied chips preserved until replacement is confirmed.';
  explainabilityComposerState.error = '';
}

function resetBulkInspectorViewState() {
  activeConflictDrilldown.value = 'all';
  activeRollbackPlanReason.value = 'all';
  activeBulkDiffRowId.value = filteredBulkDiffRows.value[0]?.id ?? '';
  bulkPreviewConfirmState.error = '';
  bulkPreviewConfirmState.message = 'Inspector view reset. Bulk selection is preserved.';
}

function onBulkDiffKeydown(event: KeyboardEvent) {
  const targetTag = (event.target as HTMLElement | null)?.tagName ?? '';
  if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') {
    return;
  }
  const shortcutReason = resolveExceptionConflictShortcutDrilldown(event.key);
  if (shortcutReason) {
    event.preventDefault();
    setActiveConflictDrilldown(shortcutReason);
    return;
  }

  if (event.key === 'ArrowDown' || event.key.toLowerCase() === 'j') {
    event.preventDefault();
    activeBulkDiffRowId.value = moveExceptionDiffInspectorFocus({
      rows: filteredBulkDiffRows.value,
      activeRowId: activeBulkDiffRowId.value,
      direction: 'next',
    });
    return;
  }

  if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'k') {
    event.preventDefault();
    activeBulkDiffRowId.value = moveExceptionDiffInspectorFocus({
      rows: filteredBulkDiffRows.value,
      activeRowId: activeBulkDiffRowId.value,
      direction: 'prev',
    });
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    resetBulkInspectorViewState();
  }
}

function onExplainabilityComposerKeydown(event: KeyboardEvent) {
  const targetTag = (event.target as HTMLElement | null)?.tagName ?? '';
  const shortcut = resolveExplainabilityPresetShortcut({
    key: event.key,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
  });

  if (shortcut) {
    event.preventDefault();
    openExplainabilityComposer(shortcut.slotIndex);
    if (shortcut.action === 'apply') {
      applyExplainabilitySlot(shortcut.slotIndex);
      return;
    }
    overwriteExplainabilitySlot(shortcut.slotIndex);
    return;
  }

  if (event.key === 'Escape' && explainabilityComposerOpen.value) {
    event.preventDefault();
    closeExplainabilityComposer(true);
    explainabilityComposerState.message = 'Composer closed. Applied chips were not changed.';
    return;
  }

  if ((targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') && !event.altKey) {
    return;
  }
}

function resetBulkPreviewDrawer() {
  bulkPreviewDrawer.open = false;
  bulkPreviewDrawer.action = 'resolve';
  bulkPreviewDrawer.error = '';
}

function toggleExceptionSelection(exceptionId: string, checked: boolean) {
  staleExceptionSelectionCount.value = 0;
  if (checked) {
    if (!selectedExceptionIds.value.includes(exceptionId)) {
      selectedExceptionIds.value = [...selectedExceptionIds.value, exceptionId];
    }
    return;
  }
  selectedExceptionIds.value = selectedExceptionIds.value.filter((id) => id !== exceptionId);
}

function toggleAllExceptionSelections(checked: boolean) {
  staleExceptionSelectionCount.value = 0;
  if (checked) {
    selectedExceptionIds.value = exceptionRows.value.map((row) => row.id);
    return;
  }
  selectedExceptionIds.value = [];
}

function onToggleAllExceptionSelections(event: Event) {
  const target = event.target as HTMLInputElement | null;
  toggleAllExceptionSelections(Boolean(target?.checked));
}

function onToggleExceptionSelection(exceptionId: string, event: Event) {
  const target = event.target as HTMLInputElement | null;
  toggleExceptionSelection(exceptionId, Boolean(target?.checked));
}

function openBulkPreviewDrawer(action: SettlementExceptionAction) {
  resetBulkPreviewConfirmState();
  bulkPreviewDrawer.action = action;
  bulkPreviewDrawer.error = '';
  bulkPreviewDrawer.open = true;
}

function closeBulkPreviewDrawer() {
  resetBulkPreviewDrawer();
}

function resetBulkSelectionSafe() {
  selectedExceptionIds.value = [];
  staleExceptionSelectionCount.value = 0;
  resetReplayCompareState();
  resetTimelineScrubberState();
  resetEvidencePacketLintState();
  resetBulkInspectorViewState();
  const safeQueueReset = resetOperatorDecisionQueueDraftSafe({
    activeMatrixFilter: activeScenarioMatrixFilter.value,
    confirmFilterReset: false,
  });
  const safeReviewQueueReset = resetReviewQueueHandoffPacketDraftSafe({
    activeFilter: activeReviewQueueFilter.value,
    activeRowId: activeReviewQueueRowId.value,
    confirmFullReset: false,
  });
  queueDraftRowIds.value = safeQueueReset.stagedRowIds;
  activeScenarioMatrixFilter.value = safeQueueReset.activeMatrixFilter;
  reviewQueueHandoffDraft.value = safeReviewQueueReset.draft;
  activeReviewQueueFilter.value = safeReviewQueueReset.activeFilter;
  activeReviewQueueRowId.value = safeReviewQueueReset.activeRowId;
  evidencePacketLintChecklistDraft.value = getDefaultEvidencePacketLintChecklistDraft();
  activeEvidencePacketLintFilter.value = 'all';
  activeEvidencePacketLintFindingId.value = '';
  bulkPreviewDrawer.error = '';
  bulkPreviewConfirmState.error = '';
  decisionQueueState.error = '';
  decisionQueueState.message = safeQueueReset.message;
  reviewQueueLedgerState.error = '';
  reviewQueueLedgerState.message = safeReviewQueueReset.message;
  resetReviewQueueHandoffValidation();
  bulkPreviewConfirmState.message = 'Selection safely reset. Reselect rows, then reopen confirmation preview.';
}

function confirmBulkPreviewFromDrawer() {
  resetBulkPreviewConfirmState();
  bulkPreviewDrawer.error = '';
  if (!bulkConfirmation.value.canConfirm) {
    bulkPreviewDrawer.error = bulkConfirmation.value.fallbackMessage || 'Selection is not ready for confirmation.';
    return;
  }
  bulkPreviewConfirmState.message = `Bulk ${bulkPreviewDrawer.action} preview confirmed for ${bulkConfirmation.value.validCount} valid row(s). Deterministic export summaries are ready below.`;
  staleExceptionSelectionCount.value = 0;
  closeBulkPreviewDrawer();
}

function applyExceptionFixture(mode: ExceptionFixtureMode) {
  staleExceptionSelectionCount.value = selectedExceptionIds.value.length;
  exceptionFixtureMode.value = mode;
  exceptionFixtureRetryCount.value = 0;
  exceptionState.loading = false;
  exceptionDetailState.loading = false;
  exceptionRows.value = [];
  selectedExceptionIds.value = [];
  exceptionDetail.value = null;
  selectedExceptionId.value = '';
  exceptionPagination.total = 0;
  exceptionPagination.totalPages = 1;
  exceptionPagination.page = 1;
  exceptionAction.open = false;
  exceptionAction.reason = '';
  exceptionAction.note = '';
  exceptionAction.error = '';
  resetState(exceptionState);
  resetState(exceptionDetailState);
  resetBulkPreviewConfirmState();
  resetBulkPreviewDrawer();
  resetDecisionQueueState();
  resetReviewQueueLedgerState();
  resetReviewQueueHandoffValidation();
  resetEvidencePacketLintState();
  resetTimelineScrubberState();
  queueDraftRowIds.value = [];
  activeScenarioMatrixFilter.value = 'all';
  activeReviewQueueFilter.value = 'all';
  activeReviewQueueRowId.value = '';
  activeEvidencePacketLintFilter.value = 'all';
  activeEvidencePacketLintFindingId.value = '';
  activeEvidenceTimelineLane.value = 'all';
  activeEvidenceTimelineRowId.value = '';
  reviewQueueHandoffDraft.value = buildReviewQueueHandoffPacketDraftFromLedgerRow({ activeRow: null });
  evidencePacketLintChecklistDraft.value = getDefaultEvidencePacketLintChecklistDraft();

  if (mode === 'loading') {
    exceptionState.loading = true;
    exceptionState.message = 'Fixture: loading state for exception list.';
    exceptionDetailState.message = 'Fixture: detail is unavailable while list is loading.';
    return;
  }

  if (mode === 'empty') {
    exceptionState.message = 'Fixture: no settlement exceptions found.';
    exceptionDetailState.message = 'Fixture: select an exception row to view detail.';
    return;
  }

  if (mode === 'permission_error') {
    exceptionState.error = 'Forbidden: admin or ops role is required to load settlement exceptions.';
    exceptionDetailState.error = 'Permission denied.';
    return;
  }

  const status = mode === 'stale_conflict' ? 'investigating' : 'open';
  const detail = fixtureExceptionDetail(status);
  exceptionRows.value = [detail];
  exceptionPagination.total = 1;
  exceptionPagination.totalPages = 1;
  exceptionPagination.page = 1;
  selectedExceptionId.value = detail.id;
  exceptionDetail.value = detail;
  exceptionState.message = 'Fixture: loaded deterministic settlement exception.';
  exceptionDetailState.message = `Fixture: loaded exception ${detail.id} detail.`;

  if (mode === 'stale_conflict') {
    exceptionAction.open = true;
    exceptionAction.action = 'resolve';
    exceptionAction.reason = 'Provider statement already reconciled';
    exceptionAction.error = 'This exception was updated by another operator. Refresh detail and retry with the latest version.';
  }

  if (mode === 'action_failure_retry') {
    exceptionRows.value = [
      detail,
      {
        ...detail,
        id: 'fx-malformed-001',
        merchantId: '',
        mismatchCount: -1,
      },
    ];
    exceptionPagination.total = 2;
    exceptionAction.open = true;
    exceptionAction.action = 'ignore';
    exceptionAction.reason = 'Known provider lag in settlement batch';
    exceptionAction.error = 'Action failed due to a temporary backend issue. Retry with the same reason.';
  }
}

function buildExceptionQueryState(page = 1) {
  return {
    merchantId: exceptionFilters.merchantId,
    provider: exceptionFilters.provider,
    status: exceptionFilters.status,
    startDate: exceptionFilters.startDate,
    endDate: exceptionFilters.endDate,
    page,
    pageSize: exceptionFilters.pageSize,
    preset: activeExceptionPreset.value,
  };
}

function applyExceptionQueryState(state: {
  merchantId: string;
  provider: string;
  status: '' | SettlementExceptionStatus;
  startDate: string;
  endDate: string;
  page: number;
  pageSize: number;
}) {
  exceptionFilters.merchantId = state.merchantId;
  exceptionFilters.provider = state.provider;
  exceptionFilters.status = state.status;
  exceptionFilters.startDate = state.startDate;
  exceptionFilters.endDate = state.endDate;
  exceptionFilters.page = state.page;
  exceptionFilters.pageSize = state.pageSize;
  exceptionPagination.page = state.page;
  exceptionPagination.pageSize = state.pageSize;
}

function setExceptionQueryRecovery(message: string) {
  exceptionQueryRecovery.active = true;
  exceptionQueryRecovery.message = message;
  exceptionState.error = message;
}

function clearExceptionQueryRecovery() {
  exceptionQueryRecovery.active = false;
  exceptionQueryRecovery.message = '';
}

function setExceptionSavedViewRecovery(message: string) {
  exceptionSavedViewRecovery.active = true;
  exceptionSavedViewRecovery.message = message;
}

function clearExceptionSavedViewRecovery() {
  exceptionSavedViewRecovery.active = false;
  exceptionSavedViewRecovery.message = '';
}

function hasExceptionQueryFilters(query: Record<string, unknown>): boolean {
  return Boolean(
    query.exceptionMerchant
    || query.exceptionProvider
    || query.exceptionStatus
    || query.exceptionStartDate
    || query.exceptionEndDate
    || query.exceptionPage
    || query.exceptionPageSize
    || query.exceptionPreset,
  );
}

function readSavedViewStoragePayload(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.localStorage.getItem(EXCEPTION_SAVED_VIEW_STORAGE_KEY) ?? '';
}

function writeSavedViewStoragePayload(payload: string) {
  if (typeof window === 'undefined') {
    return;
  }
  if (exceptionSavedViewState.value.views.length === 0) {
    window.localStorage.removeItem(EXCEPTION_SAVED_VIEW_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(EXCEPTION_SAVED_VIEW_STORAGE_KEY, payload);
}

function persistSavedViewState(nextState: typeof DEFAULT_EXCEPTION_SAVED_VIEW_STATE) {
  exceptionSavedViewState.value = nextState;
  for (const view of nextState.views) {
    exceptionSavedViewRenameDraft[view.id] = view.name;
  }
  const validIds = new Set(nextState.views.map((view) => view.id));
  for (const id of Object.keys(exceptionSavedViewRenameDraft)) {
    if (!validIds.has(id)) {
      delete exceptionSavedViewRenameDraft[id];
    }
  }
  writeSavedViewStoragePayload(serializeExceptionSavedViewState(nextState));
}

function applySavedViewAndReload(viewId: string) {
  const nextState = activateExceptionSavedView(exceptionSavedViewState.value, viewId);
  persistSavedViewState(nextState);
  const query = buildExceptionQueryFromSavedView(nextState, viewId);
  if (!query) {
    exceptionState.error = `Saved view ${viewId} not found.`;
    return;
  }
  applyExceptionQueryState(query);
  clearExceptionQueryRecovery();
  void loadExceptions(1);
}

function createSavedExceptionViewFromFilters() {
  const nextState = createExceptionSavedView(exceptionSavedViewState.value, {
    name: exceptionSavedViewDraftName.value,
    query: {
      merchantId: exceptionFilters.merchantId,
      provider: exceptionFilters.provider,
      status: exceptionFilters.status,
      startDate: exceptionFilters.startDate,
      endDate: exceptionFilters.endDate,
      pageSize: exceptionFilters.pageSize,
    },
  });
  persistSavedViewState(nextState);
  exceptionSavedViewDraftName.value = '';
  clearExceptionSavedViewRecovery();
  exceptionState.message = `Saved triage view "${nextState.views.find((view) => view.id === nextState.activeViewId)?.name ?? 'new view'}" created.`;
  void syncExceptionQueryToRoute(exceptionFilters.page);
}

function renameSavedExceptionView(viewId: string) {
  const name = exceptionSavedViewRenameDraft[viewId] ?? '';
  const nextState = renameExceptionSavedView(exceptionSavedViewState.value, {
    viewId,
    name,
  });
  persistSavedViewState(nextState);
  exceptionState.message = `Saved view ${viewId} renamed.`;
  void syncExceptionQueryToRoute(exceptionFilters.page);
}

function deleteSavedExceptionViewAndRefresh(viewId: string) {
  const nextState = deleteExceptionSavedView(exceptionSavedViewState.value, viewId);
  persistSavedViewState(nextState);
  if (!nextState.views.length) {
    clearExceptionSavedViewRecovery();
  }
  if (nextState.activeViewId) {
    const query = buildExceptionQueryFromSavedView(nextState, nextState.activeViewId);
    if (query) {
      applyExceptionQueryState(query);
    }
  }
  exceptionState.message = `Saved view ${viewId} deleted.`;
  void loadExceptions(1);
}

function pinSavedExceptionViewAndApply(viewId: string) {
  const pinned = pinExceptionSavedView(exceptionSavedViewState.value, { viewId });
  persistSavedViewState(pinned);
  clearExceptionSavedViewRecovery();
  applySavedViewAndReload(viewId);
}

function resetSavedViewsToSafeDefaults() {
  persistSavedViewState(DEFAULT_EXCEPTION_SAVED_VIEW_STATE);
  clearExceptionSavedViewRecovery();
  exceptionState.message = 'Saved views were reset to safe defaults.';
  void syncExceptionQueryToRoute(exceptionFilters.page);
}

async function syncExceptionQueryToRoute(page = 1) {
  const queryState = buildExceptionQueryState(page);
  const exceptionQuery = serializeExceptionQueryState(queryState);
  if (exceptionFixtureMode.value !== 'api') {
    exceptionQuery.exceptionFixture = exceptionFixtureMode.value;
  }
  if (exceptionSavedViewState.value.views.length > 0) {
    exceptionQuery[EXCEPTION_SAVED_VIEW_QUERY_KEY] = serializeExceptionSavedViewState(exceptionSavedViewState.value);
  }

  const nextQuery = {
    ...route.query,
    ...exceptionQuery,
  } as Record<string, string | (string | null)[] | null | undefined>;

  delete nextQuery.exceptionMerchant;
  delete nextQuery.exceptionProvider;
  delete nextQuery.exceptionStatus;
  delete nextQuery.exceptionStartDate;
  delete nextQuery.exceptionEndDate;
  delete nextQuery.exceptionPage;
  delete nextQuery.exceptionPageSize;
  delete nextQuery.exceptionPreset;
  delete nextQuery.exceptionFixture;
  delete nextQuery[EXCEPTION_SAVED_VIEW_QUERY_KEY];

  await router.replace({
    query: {
      ...nextQuery,
      ...exceptionQuery,
    },
  });
}

function applyExceptionPresetAndLoad(presetKey: 'open' | 'investigating' | 'resolved' | 'ignored' | 'high_risk_merchant') {
  const next = applyExceptionQueryPreset(buildExceptionQueryState(1), presetKey);
  applyExceptionQueryState(next);
  clearExceptionQueryRecovery();
  void loadExceptions(1);
}

function resetExceptionQueryState() {
  applyExceptionQueryState(DEFAULT_EXCEPTION_QUERY_STATE);
  exceptionFixtureMode.value = 'api';
  applyExplainabilityResetSafe();
  clearExceptionQueryRecovery();
  void loadExceptions(1);
}

async function loadExceptions(page = 1) {
  resetState(exceptionState);
  resetBulkPreviewConfirmState();
  resetBulkPreviewDrawer();
  if (!ensureAuth(exceptionState)) return;

  exceptionFilters.page = page;
  await syncExceptionQueryToRoute(page);

  if (exceptionFixtureMode.value !== 'api') {
    applyExceptionFixture(exceptionFixtureMode.value);
    clearExceptionQueryRecovery();
    return;
  }

  exceptionState.loading = true;
  try {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(exceptionFilters.pageSize),
    });
    const merchantId = normalizeOptional(exceptionFilters.merchantId);
    const provider = normalizeOptional(exceptionFilters.provider);
    const status = normalizeOptional(exceptionFilters.status);
    const startDate = normalizeOptional(exceptionFilters.startDate);
    const endDate = normalizeOptional(exceptionFilters.endDate);
    if (merchantId) params.set('merchantId', merchantId);
    if (provider) params.set('provider', provider);
    if (status) params.set('status', status);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    const response = await request<any>(`/settlements/exceptions?${params.toString()}`, {
      headers: authHeaders(),
    });
    const items = Array.isArray(response) ? response : (response?.items ?? response?.data ?? []);

    exceptionRows.value = items.map((item: any) => mapExceptionRow(item));
    const previousSelectionCount = selectedExceptionIds.value.length;
    selectedExceptionIds.value = selectedExceptionIds.value.filter((id) => exceptionRows.value.some((row) => row.id === id));
    staleExceptionSelectionCount.value = Math.max(0, previousSelectionCount - selectedExceptionIds.value.length);
    const total = Number(response?.total ?? response?.meta?.total ?? exceptionRows.value.length);
    const totalPages = Number(response?.totalPages ?? response?.meta?.totalPages ?? Math.max(1, Math.ceil(total / exceptionFilters.pageSize)));
    const currentPage = Number(response?.page ?? response?.meta?.page ?? page);
    const currentPageSize = Number(response?.pageSize ?? response?.meta?.pageSize ?? exceptionFilters.pageSize);
    exceptionPagination.total = total;
    exceptionPagination.totalPages = totalPages || 1;
    exceptionPagination.page = currentPage;
    exceptionPagination.pageSize = currentPageSize;
    exceptionFilters.page = currentPage;
    exceptionFilters.pageSize = currentPageSize;
    await syncExceptionQueryToRoute(currentPage);
    clearExceptionQueryRecovery();
    exceptionState.message = `Loaded ${exceptionRows.value.length} exception row(s), page ${exceptionPagination.page} of ${exceptionPagination.totalPages}.`;

    if (selectedExceptionId.value && !exceptionRows.value.some((item) => item.id === selectedExceptionId.value)) {
      selectedExceptionId.value = '';
      exceptionDetail.value = null;
    }
    if (!selectedExceptionId.value && exceptionRows.value.length) {
      await loadExceptionDetail(exceptionRows.value[0].id);
    }
  } catch (error: any) {
    exceptionRows.value = [];
    staleExceptionSelectionCount.value = selectedExceptionIds.value.length;
    selectedExceptionIds.value = [];
    exceptionPagination.total = 0;
    exceptionPagination.totalPages = 1;
    exceptionState.error = error.message;
  } finally {
    exceptionState.loading = false;
  }
}

async function loadExceptionDetail(exceptionId: string) {
  resetState(exceptionDetailState);
  if (!ensureAuth(exceptionDetailState)) return;
  if (!exceptionId) {
    exceptionDetail.value = null;
    return;
  }

  selectedExceptionId.value = exceptionId;

  if (exceptionFixtureMode.value !== 'api') {
    const hit = exceptionRows.value.find((row) => row.id === exceptionId);
    if (!hit) {
      exceptionDetail.value = null;
      exceptionDetailState.error = `Fixture row ${exceptionId} was not found.`;
      return;
    }
    exceptionDetail.value = fixtureExceptionDetail(hit.status);
    exceptionDetailState.message = `Fixture: loaded exception ${exceptionId} detail.`;
    return;
  }

  exceptionDetailState.loading = true;
  try {
    const detail = await request<any>(`/settlements/exceptions/${exceptionId}`, {
      headers: authHeaders(),
    });
    exceptionDetail.value = mapExceptionDetail(detail);
    exceptionDetailState.message = `Loaded exception ${exceptionId} detail.`;
  } catch (error: any) {
    exceptionDetail.value = null;
    exceptionDetailState.error = error.message;
  } finally {
    exceptionDetailState.loading = false;
  }
}

function openExceptionAction(action: SettlementExceptionAction) {
  exceptionAction.open = true;
  exceptionAction.action = action;
  exceptionAction.reason = '';
  exceptionAction.note = '';
  exceptionAction.error = '';
}

function closeExceptionAction() {
  exceptionAction.open = false;
  exceptionAction.reason = '';
  exceptionAction.note = '';
  exceptionAction.error = '';
}

async function submitExceptionAction() {
  exceptionAction.error = '';
  if (!exceptionDetail.value?.id) {
    exceptionAction.error = 'Select an exception before submitting action.';
    return;
  }
  const reasonError = validateExceptionActionInput(exceptionAction.reason);
  if (reasonError) {
    exceptionAction.error = reasonError;
    return;
  }
  if (!ensureAuth(exceptionState)) return;

  const exceptionId = exceptionDetail.value.id;
  const reason = exceptionAction.reason.trim();
  const note = normalizeOptional(exceptionAction.note) ?? null;
  const expectedVersion = Number.isFinite(Number(exceptionDetail.value.version))
    ? Number(exceptionDetail.value.version)
    : 1;
  const expectedUpdatedAt = exceptionDetail.value.updatedAt || null;
  const idempotencyKey = buildExceptionActionIdempotencyKey({
    exceptionId,
    action: exceptionAction.action,
    reason,
    note,
    expectedVersion,
    expectedUpdatedAt,
  });
  const optimisticAt = new Date().toISOString();
  const previousRows = [...exceptionRows.value];
  const previousDetail = exceptionDetail.value;

  exceptionAction.loading = true;
  exceptionRows.value = applyExceptionActionOptimistic(
    exceptionRows.value,
    exceptionId,
    exceptionAction.action,
    optimisticAt,
  );
  exceptionDetail.value = {
    ...exceptionDetail.value,
    status: exceptionAction.action === 'resolve' ? 'resolved' : 'ignored',
    version: exceptionDetail.value.version + 1,
    updatedAt: optimisticAt,
    audits: prependExceptionAudit(exceptionDetail.value.audits, {
      id: `optimistic-${optimisticAt}`,
      action: exceptionAction.action,
      reason,
      note,
      actor: auth.actorRole,
      createdAt: optimisticAt,
    }),
  };

  try {
    if (exceptionFixtureMode.value === 'stale_conflict') {
      throw new Error('Version conflict; refresh and retry with current version');
    }

    if (exceptionFixtureMode.value === 'action_failure_retry' && exceptionFixtureRetryCount.value === 0) {
      exceptionFixtureRetryCount.value += 1;
      throw new Error('Gateway timeout while updating exception action');
    }

    if (exceptionFixtureMode.value !== 'api') {
      closeExceptionAction();
      exceptionState.message = `Fixture: exception ${exceptionId} marked ${exceptionAction.action}d on retry path.`;
      await loadExceptionDetail(exceptionId);
      return;
    }

    await request(`/settlements/exceptions/${exceptionId}/action`, {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Idempotency-Key': idempotencyKey,
      },
      body: {
        action: exceptionAction.action,
        reason,
        note,
        idempotencyKey,
        expectedVersion,
        expectedUpdatedAt,
      },
    });
    closeExceptionAction();
    exceptionState.message = `Exception ${exceptionId} marked ${exceptionAction.action}d.`;
    await loadExceptionDetail(exceptionId);
  } catch (error: any) {
    exceptionRows.value = previousRows;
    exceptionDetail.value = previousDetail;
    const failure = classifyExceptionActionFailure(error?.payload ?? error?.message ?? '');
    exceptionAction.error = failure.userMessage;
    if (failure.kind === 'version_conflict') {
      await loadExceptionDetail(exceptionId);
    }
  } finally {
    exceptionAction.loading = false;
  }
}

onMounted(() => {
  const routeQuery = route.query as Record<string, unknown>;
  const parsedQuery = parseExceptionQueryState(routeQuery);
  applyExceptionQueryState(parsedQuery.state);
  if (parsedQuery.recoveryReasons.length) {
    setExceptionQueryRecovery(
      `Invalid or expired query state detected. ${parsedQuery.recoveryReasons.join(' ')} Use reset to continue safely.`,
    );
  }

  const restoredSavedViews = restoreExceptionSavedViewState({
    queryPayload: routeQuery[EXCEPTION_SAVED_VIEW_QUERY_KEY],
    storagePayload: readSavedViewStoragePayload(),
  });
  persistSavedViewState(restoredSavedViews.state);
  if (restoredSavedViews.recoveryReasons.length > 0) {
    setExceptionSavedViewRecovery(
      `Saved-view payload recovery applied (${restoredSavedViews.source}). ${restoredSavedViews.recoveryReasons.join(' ')}`,
    );
  } else {
    clearExceptionSavedViewRecovery();
  }
  if (!hasExceptionQueryFilters(routeQuery) && restoredSavedViews.state.views.length > 0) {
    const defaultViewId = restoredSavedViews.state.activeViewId
      || restoredSavedViews.state.views.find((view) => view.pinned)?.id
      || restoredSavedViews.state.views[0].id;
    const restoredQuery = buildExceptionQueryFromSavedView(restoredSavedViews.state, defaultViewId);
    if (restoredQuery) {
      applyExceptionQueryState(restoredQuery);
    }
  }

  const initialFixture = resolveInitialFixtureMode();
  if (initialFixture !== 'api') {
    applyExceptionFixture(initialFixture);
  }
  exceptionFixtureMode.value = initialFixture;
  void syncExceptionQueryToRoute(exceptionFilters.page);
  void loadExceptions(exceptionFilters.page);
  void loadMerchants();
});
</script>

<template>
  <main class="page">
    <section class="hero">
      <h1>Merchant Control Tower</h1>
      <p>Onboarding, routing controls, live provider health, and reconciliation/dispute operations.</p>
      <div class="inline-actions">
        <NuxtLink class="button-link" to="/payment-flow">Open Multi-Flow Payment Workspace</NuxtLink>
        <NuxtLink class="button-link" to="/payment-operations-dashboard">Open Payment Operations Dashboard</NuxtLink>
        <NuxtLink class="button-link" to="/payout-monitoring-panel">Open Payout Monitoring Panel</NuxtLink>
        <NuxtLink class="button-link" to="/payment-reconciliation-workspace">Open Reconciliation Workspace</NuxtLink>
        <NuxtLink class="button-link" to="/settlement-exceptions-inbox">Open Settlement Exceptions Inbox</NuxtLink>
        <NuxtLink class="button-link" to="/merchant-operations">Open Merchant Operations Panel</NuxtLink>
      </div>
      <div class="auth-grid">
        <label>
          Internal token
          <input v-model="auth.internalToken" type="password" placeholder="INTERNAL_API_TOKEN" />
        </label>
        <label>
          Role
          <select v-model="auth.actorRole">
            <option value="admin">admin</option>
            <option value="ops">ops</option>
            <option value="support">support</option>
          </select>
        </label>
        <button type="button" @click="loadMerchants">Refresh Merchant List</button>
      </div>
    </section>

    <section class="card">
      <h2>Merchant Onboarding</h2>
      <form class="grid" @submit.prevent="createMerchant">
        <label>
          Merchant name
          <input v-model="onboardingForm.name" required />
        </label>
        <label>
          Webhook endpoint
          <input v-model="onboardingForm.webhookUrl" type="url" placeholder="https://merchant.example.com/hook" />
        </label>
        <label>
          KYC status
          <select v-model="onboardingForm.kycStatus">
            <option value="pending">pending</option>
            <option value="in_review">in_review</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </select>
        </label>
        <button :disabled="onboardingState.loading" type="submit">
          {{ onboardingState.loading ? 'Creating...' : 'Create Merchant' }}
        </button>
      </form>

      <div class="checklist">
        <h3>Webhook Verification Checklist</h3>
        <label><input v-model="onboardingChecklist.webhookEndpointAdded" type="checkbox" /> Endpoint registered</label>
        <label><input v-model="onboardingChecklist.callbackSecretStored" type="checkbox" /> Callback secret stored securely</label>
        <label><input v-model="onboardingChecklist.retryPolicyConfirmed" type="checkbox" /> Retry policy confirmed</label>
      </div>

      <p class="state" :class="{ error: onboardingState.error }">{{ onboardingState.error || onboardingState.message }}</p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Merchant ID</th>
              <th>Name</th>
              <th>Webhook</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!merchants.length">
              <td colspan="4">No merchants yet.</td>
            </tr>
            <tr v-for="merchant in merchants" :key="merchant.id">
              <td>{{ merchant.id }}</td>
              <td>{{ merchant.name }}</td>
              <td>{{ merchant.webhookUrl || '-' }}</td>
              <td>
                <button
                  class="link"
                  type="button"
                  @click="applySelectedMerchant(merchant.id)"
                >
                  Select
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>API Key Lifecycle</h3>
      <form class="grid" @submit.prevent="createApiKey">
        <label>
          Merchant ID
          <input v-model="apiKeyForm.merchantId" required />
        </label>
        <label>
          Key name
          <input v-model="apiKeyForm.name" required />
        </label>
        <label>
          Existing key ID
          <input v-model="keyActionForm.keyId" placeholder="for rotate/revoke" />
        </label>
        <button :disabled="apiKeyState.loading" type="submit">Create Key</button>
      </form>

      <div class="inline-actions">
        <button :disabled="apiKeyState.loading" type="button" @click="rotateApiKey">Rotate Key</button>
        <button class="danger" :disabled="apiKeyState.loading" type="button" @click="revokeApiKey">Revoke Key</button>
      </div>

      <p class="state" :class="{ error: apiKeyState.error }">{{ apiKeyState.error || apiKeyState.message }}</p>
      <p v-if="latestRawApiKey" class="secret">Latest raw key: {{ latestRawApiKey }}</p>

      <div class="timeline" v-if="apiKeyActions.length">
        <h4>Audit Trail Surface</h4>
        <ul>
          <li v-for="item in apiKeyActions" :key="`${item.at}-${item.keyId}-${item.action}`">
            {{ new Date(item.at).toLocaleString() }} • {{ item.action.toUpperCase() }} • {{ item.keyId }} • {{ item.detail }}
          </li>
        </ul>
      </div>
    </section>

    <section class="card">
      <h2>Routing Controls</h2>
      <form class="grid" @submit.prevent="saveRoutingControls">
        <label>
          Policy mode
          <select v-model="routingControls.policyMode">
            <option value="policy">policy</option>
            <option value="legacy">legacy</option>
            <option value="shadow">shadow</option>
          </select>
        </label>
        <label>
          Primary provider
          <select v-model="routingControls.primaryProvider">
            <option v-for="provider in providerChoices" :key="`primary-${provider}`" :value="provider">{{ provider }}</option>
          </select>
        </label>
        <label>
          Fallback provider
          <select v-model="routingControls.fallbackProvider">
            <option v-for="provider in providerChoices" :key="`fallback-${provider}`" :value="provider">{{ provider }}</option>
          </select>
        </label>
        <button type="submit">Save Controls</button>
      </form>

      <div class="inline-actions">
        <button :disabled="routingState.loading" type="button" @click="syncRoutingFromBackend">
          {{ routingState.loading ? 'Syncing...' : 'Sync Active Strategy from Backend' }}
        </button>
      </div>

      <p class="state" :class="{ error: routingState.error }">{{ routingState.error || routingState.message }}</p>
      <div class="kpi-row">
        <article>
          <h4>Active Algorithm</h4>
          <p>{{ routingState.backendAlgorithm }}</p>
        </article>
        <article>
          <h4>Reason Code</h4>
          <p>{{ routingState.backendReasonCode }}</p>
        </article>
        <article>
          <h4>Selected Provider</h4>
          <p>{{ routingState.backendProvider }}</p>
        </article>
      </div>
    </section>

    <section class="card">
      <h2>Live Provider Health Dashboard</h2>
      <form class="grid" @submit.prevent="loadHealthDashboard">
        <label>
          Merchant ID
          <input v-model="healthFilters.merchantId" required />
        </label>
        <label>
          Timeframe (hours)
          <input v-model.number="healthFilters.timeframeHours" type="number" min="1" max="168" />
        </label>
        <label>
          Provider
          <select v-model="healthFilters.provider">
            <option value="">all</option>
            <option v-for="provider in providerChoices" :key="`health-${provider}`" :value="provider">{{ provider }}</option>
          </select>
        </label>
        <label>
          Auto-refresh seconds
          <input v-model.number="healthFilters.autoRefreshSec" type="number" min="5" max="120" />
        </label>
        <button :disabled="healthState.loading" type="submit">{{ healthState.loading ? 'Refreshing...' : 'Refresh Health' }}</button>
      </form>

      <p class="state" :class="{ error: healthState.error }">{{ healthState.error || healthState.message }}</p>

      <div class="kpi-row">
        <article>
          <h4>Success Rate</h4>
          <p>{{ fmtPct(successRate) }}</p>
        </article>
        <article>
          <h4>p95 Latency</h4>
          <p>{{ latencyP95Ms === null ? 'n/a' : `${latencyP95Ms} ms` }}</p>
        </article>
        <article>
          <h4>Health State</h4>
          <p :class="`state-${healthLevel}`">{{ healthLevel }}</p>
        </article>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Decisions</th>
              <th>Failed Attempts</th>
              <th>Failure Rate</th>
              <th>Weighted Score</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!healthData?.margins?.length">
              <td colspan="5">No margin rows available.</td>
            </tr>
            <tr v-for="row in healthData?.margins || []" :key="row.provider">
              <td>{{ row.provider }}</td>
              <td>{{ row.decisionCount }}</td>
              <td>{{ row.failedAttempts }}</td>
              <td>{{ row.failureRate.toFixed(1) }}%</td>
              <td>{{ row.weightedScore === null ? 'n/a' : row.weightedScore.toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <h2>Reconciliation & Dispute Operations</h2>
      <form class="grid" @submit.prevent="loadReconciliation">
        <label>
          Merchant ID
          <input v-model="opsFilters.merchantId" required />
        </label>
        <label>
          Provider
          <select v-model="opsFilters.provider">
            <option value="">all</option>
            <option v-for="provider in providerChoices" :key="`ops-${provider}`" :value="provider">{{ provider }}</option>
          </select>
        </label>
        <label>
          Status
          <select v-model="opsFilters.status">
            <option value="">all</option>
            <option value="CREATED">CREATED</option>
            <option value="PENDING">PENDING</option>
            <option value="PAID">PAID</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </label>
        <label>
          Start date
          <input v-model="opsFilters.startDate" type="date" />
        </label>
        <label>
          End date
          <input v-model="opsFilters.endDate" type="date" />
        </label>
        <button :disabled="opsState.loading" type="submit">{{ opsState.loading ? 'Loading...' : 'Load Reconciliation' }}</button>
      </form>

      <p class="state" :class="{ error: opsState.error }">{{ opsState.error || opsState.message }}</p>
      <form class="grid refund-grid" @submit.prevent="submitRefund">
        <label>
          Refund reference
          <input v-model="refundForm.reference" placeholder="txn reference" />
        </label>
        <label>
          Refund reason
          <input v-model="refundForm.reason" placeholder="optional reason" />
        </label>
        <button :disabled="refundState.loading" type="submit">{{ refundState.loading ? 'Submitting...' : 'Submit Refund' }}</button>
      </form>
      <p class="state" :class="{ error: refundState.error }">{{ refundState.error || refundState.message }}</p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Created</th>
              <th>Refund</th>
              <th>Dispute</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!opsRows.length">
              <td colspan="7">No operations rows available.</td>
            </tr>
            <tr v-for="row in opsRows" :key="row.reference">
              <td>{{ row.reference }}</td>
              <td>{{ row.providerName || '-' }}</td>
              <td>{{ row.status }}</td>
              <td>{{ fmtAmount(row.amount, row.currency) }}</td>
              <td>{{ new Date(row.createdAt).toLocaleString() }}</td>
              <td>
                <button
                  type="button"
                  class="link"
                  :disabled="!canRefundStatus(row.status)"
                  @click="openRefund(row.reference)"
                >
                  {{ canRefundStatus(row.status) ? 'Prepare Refund' : 'Not Eligible' }}
                </button>
              </td>
              <td>
                <button type="button" class="link" @click="toggleDispute(row.reference)">
                  {{ disputeMap[row.reference] === 'open' ? 'Resolve' : 'Open Dispute' }}
                </button>
                <small>{{ disputeMap[row.reference] || 'none' }}</small>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <h2>Settlement Exception Triage Console</h2>
      <div class="fixture-bar">
        <label>
          Triage fixture mode
          <select v-model="exceptionFixtureMode">
            <option value="api">live api</option>
            <option value="loading">loading</option>
            <option value="empty">empty</option>
            <option value="permission_error">permission error</option>
            <option value="stale_conflict">stale version conflict</option>
            <option value="action_failure_retry">action failure retry</option>
          </select>
        </label>
        <button type="button" class="link" @click="loadExceptions(1)">
          Apply Fixture
        </button>
      </div>

      <div class="preset-bar">
        <button
          v-for="preset in exceptionPresets"
          :key="preset.key"
          type="button"
          class="preset-chip"
          :class="{ active: activeExceptionPreset === preset.key }"
          @click="applyExceptionPresetAndLoad(preset.key)"
        >
          {{ preset.label }}
        </button>
        <button type="button" class="link" @click="openExplainabilityComposer()">
          Open Explainability Composer
        </button>
      </div>
      <p class="state" :class="{ error: explainabilityComposerState.error }">
        {{ explainabilityComposerState.error
          || explainabilityComposerState.message
          || 'Keyboard shortcuts: Alt+1..4 apply slot, Alt+Shift+1..4 overwrite slot, Esc closes composer safely.' }}
      </p>

      <article class="saved-view-panel">
        <h3>Saved Triage Views</h3>
        <p class="state" :class="{ error: exceptionSavedViewRecovery.active }">
          {{ exceptionSavedViewRecovery.active
            ? exceptionSavedViewRecovery.message
            : 'Save, pin, and reapply deterministic triage filters without backend credentials.' }}
        </p>
        <div class="saved-view-create">
          <label>
            View name
            <input
              v-model="exceptionSavedViewDraftName"
              placeholder="e.g. high risk pending investigation"
            />
          </label>
          <button type="button" @click="createSavedExceptionViewFromFilters">
            Save Current Filters
          </button>
        </div>
        <div class="inline-actions">
          <button
            v-if="exceptionSavedViewRecovery.active"
            type="button"
            class="link"
            @click="resetSavedViewsToSafeDefaults"
          >
            Reset Saved Views To Safe Defaults
          </button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Pinned</th>
                <th>Scope</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!exceptionSavedViews.length">
                <td colspan="4">No saved triage views yet.</td>
              </tr>
              <tr
                v-for="view in exceptionSavedViews"
                :key="view.id"
                :class="{ 'saved-view-active': exceptionSavedViewState.activeViewId === view.id }"
              >
                <td>
                  <label>
                    Rename
                    <input v-model="exceptionSavedViewRenameDraft[view.id]" />
                  </label>
                  <small>ID: {{ view.id }}</small>
                </td>
                <td>{{ view.pinned ? 'yes' : 'no' }}</td>
                <td>
                  status={{ view.query.status || 'all' }},
                  merchant={{ view.query.merchantId || '-' }},
                  provider={{ view.query.provider || '-' }},
                  pageSize={{ view.query.pageSize }}
                </td>
                <td>
                  <div class="inline-actions">
                    <button type="button" class="link" @click="applySavedViewAndReload(view.id)">Apply</button>
                    <button type="button" class="link" @click="pinSavedExceptionViewAndApply(view.id)">Pin Default</button>
                    <button type="button" class="link" @click="renameSavedExceptionView(view.id)">Save Name</button>
                    <button type="button" class="danger" @click="deleteSavedExceptionViewAndRefresh(view.id)">Delete</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <div v-if="exceptionQueryRecovery.active" class="query-recovery">
        <p>{{ exceptionQueryRecovery.message }}</p>
        <button type="button" class="link" @click="resetExceptionQueryState">
          Reset Query To Safe Defaults
        </button>
      </div>

      <form class="grid" @submit.prevent="loadExceptions(1)">
        <label>
          Merchant filter
          <input v-model="exceptionFilters.merchantId" placeholder="optional merchant id" />
        </label>
        <label>
          Provider filter
          <input v-model="exceptionFilters.provider" placeholder="optional provider" />
        </label>
        <label>
          Status
          <select v-model="exceptionFilters.status">
            <option value="">all</option>
            <option value="open">open</option>
            <option value="investigating">investigating</option>
            <option value="resolved">resolved</option>
            <option value="ignored">ignored</option>
          </select>
        </label>
        <label>
          Start date
          <input v-model="exceptionFilters.startDate" type="date" />
        </label>
        <label>
          End date
          <input v-model="exceptionFilters.endDate" type="date" />
        </label>
        <label>
          Page size
          <input v-model.number="exceptionFilters.pageSize" type="number" min="1" max="100" />
        </label>
        <button :disabled="exceptionState.loading" type="submit">
          {{ exceptionState.loading ? 'Loading...' : 'Load Exceptions' }}
        </button>
      </form>

      <div class="inline-actions">
        <button
          type="button"
          class="link"
          :disabled="exceptionState.loading || exceptionPagination.page <= 1"
          @click="loadExceptions(exceptionPagination.page - 1)"
        >
          Previous Page
        </button>
        <button
          type="button"
          class="link"
          :disabled="exceptionState.loading || exceptionPagination.page >= exceptionPagination.totalPages"
          @click="loadExceptions(exceptionPagination.page + 1)"
        >
          Next Page
        </button>
      </div>

      <p class="state" :class="{ error: exceptionState.error }">{{ exceptionState.error || exceptionState.message }}</p>

      <article class="bulk-preview-panel">
        <h3>Bulk Action Preview</h3>
        <p class="state" :class="{ error: bulkPreviewConfirmState.error }">
          {{ bulkPreviewConfirmState.error || bulkPreviewConfirmState.message || 'Review selected rows before confirming a bulk action.' }}
        </p>
        <div class="inline-actions">
          <button type="button" @click="openBulkPreviewDrawer('resolve')">Review Bulk Resolve</button>
          <button type="button" class="danger" @click="openBulkPreviewDrawer('ignore')">Review Bulk Ignore</button>
          <button type="button" class="link" @click="resetBulkSelectionSafe">Safe Reset Selection</button>
        </div>

        <div class="bulk-preview-grid">
          <div>
            <h4>Selection Summary</h4>
            <p><strong>Selected:</strong> {{ bulkExceptionPreview.selectedCount }}</p>
            <p><strong>Valid:</strong> {{ bulkExceptionPreview.validCount }}</p>
            <p><strong>Malformed:</strong> {{ bulkExceptionPreview.malformedCount }}</p>
            <ul class="timeline-list">
              <li>Status: open {{ bulkExceptionPreview.statusCounts.open }}, investigating {{ bulkExceptionPreview.statusCounts.investigating }}, resolved {{ bulkExceptionPreview.statusCounts.resolved }}, ignored {{ bulkExceptionPreview.statusCounts.ignored }}</li>
              <li>Risk buckets: high {{ bulkExceptionPreview.riskCounts.high }}, medium {{ bulkExceptionPreview.riskCounts.medium }}, low {{ bulkExceptionPreview.riskCounts.low }}</li>
            </ul>
            <p v-if="bulkExceptionPreview.isEmpty" class="state">{{ bulkExceptionPreview.emptyMessage }}</p>
            <p v-if="bulkExceptionPreview.malformedMessage" class="state error">{{ bulkExceptionPreview.malformedMessage }}</p>
            <p v-if="bulkExceptionPreview.isEmpty || bulkExceptionPreview.malformedCount > 0" class="state">{{ bulkExceptionPreview.recoveryHint }}</p>
            <p v-if="staleExceptionSelectionCount > 0" class="state error">
              Stale selection fallback: {{ staleExceptionSelectionCount }} row(s) dropped from current list scope. Use safe reset.
            </p>
            <p v-if="bulkConfirmation.needsRollbackHint" class="state">
              {{ bulkConfirmation.rollbackHint }}
            </p>

            <div class="simulation-outcome-panel">
              <h4>Replay Bookmark Compare Strip</h4>
              <p class="state" :class="{ error: replayCompareState.error }">
                {{ replayCompareState.error || replayCompareState.message || 'Pin two bookmarks to compare deterministic replay deltas. Keyboard: [ previous, ] next, S swap, Esc clear draft.' }}
              </p>
              <div class="chip-row">
                <button
                  v-for="option in replayBookmarkFilterOptions"
                  :key="`bookmark-filter-${option.key}`"
                  type="button"
                  class="preset-chip"
                  :class="{ active: activeBookmarkFilter === option.key }"
                  @click="setActiveBookmarkFilter(option.key)"
                >
                  {{ option.label }}
                  ({{ option.key === 'all'
                    ? incidentBookmarkShelf.totalCount
                    : incidentBookmarkShelf.severityCounts[option.key] }})
                </button>
              </div>
              <div class="replay-compare-strip-wrap" tabindex="0" @keydown="onReplayCompareKeydown">
                <ul class="replay-bookmark-list">
                  <li v-if="!filteredIncidentBookmarkItems.length" class="state">No bookmarks in current severity filter.</li>
                  <li
                    v-for="item in filteredIncidentBookmarkItems"
                    :key="`bookmark-${item.id}`"
                    class="replay-bookmark-item"
                    :class="{ active: replayCompareStrip.activeBookmarkId === item.id }"
                    @click="setActiveReplayBookmark(item.id)"
                  >
                    <div>
                      <strong>{{ item.id }}</strong>
                      <small>{{ item.merchantId }} / {{ item.provider }} / {{ item.severity }}</small>
                    </div>
                    <div class="inline-actions compact">
                      <button type="button" class="link" @click.stop="pinReplayBookmarkPrimary(item.id)">Pin Primary</button>
                      <button type="button" class="link" @click.stop="pinReplayBookmarkSecondary(item.id)">Pin Secondary</button>
                    </div>
                  </li>
                </ul>
                <div class="replay-compare-slots">
                  <article>
                    <h5>Primary</h5>
                    <p><strong>{{ replayCompareStrip.primaryBookmark?.id || '-' }}</strong></p>
                    <p class="state">{{ replayCompareStrip.primaryBookmark?.title || 'No bookmark pinned.' }}</p>
                  </article>
                  <article>
                    <h5>Secondary</h5>
                    <p><strong>{{ replayCompareStrip.secondaryBookmark?.id || '-' }}</strong></p>
                    <p class="state">{{ replayCompareStrip.secondaryBookmark?.title || 'No bookmark pinned.' }}</p>
                  </article>
                </div>
              </div>
              <div class="inline-actions">
                <button type="button" :disabled="!replayCompareStrip.canCompare" @click="swapReplayComparePins">Swap Primary/Secondary</button>
                <button type="button" class="link" @click="clearReplayCompareDraftSafe">Safe Clear Compare Draft</button>
                <button type="button" class="link" @click="clearReplayCompareDraftWithFilterConfirm">Clear Draft + Reset Severity Filter</button>
              </div>
              <p class="state">
                Active pair:
                {{ replayCompareStrip.primaryBookmark?.id || '-' }}
                vs
                {{ replayCompareStrip.secondaryBookmark?.id || '-' }}.
              </p>
            </div>

            <div class="simulation-outcome-panel">
              <h4>Operator Timeline Scrubber</h4>
              <p class="state" :class="{ error: timelineScrubberState.error }">
                {{ timelineScrubberState.error || timelineScrubberState.message || 'Keyboard: , previous tick, . next tick, P cycle preset, Shift+P pin override, Esc clear compare draft safely.' }}
              </p>
              <div class="chip-row">
                <button
                  v-for="slot in operatorTimelineScrubber.compareSlots"
                  :key="`timeline-slot-${slot.key}`"
                  type="button"
                  class="preset-chip"
                  :class="{ active: activeTimelinePreset === slot.key }"
                  @click="activeTimelinePreset = slot.key"
                >
                  {{ slot.key }}
                  <small>{{ slot.tickId || '-' }}</small>
                </button>
              </div>
              <div class="replay-compare-strip-wrap" tabindex="0" @keydown="onOperatorTimelineKeydown">
                <ul class="replay-bookmark-list">
                  <li v-if="!operatorTimelineScrubber.ticks.length" class="state">No timeline ticks in current severity scope.</li>
                  <li
                    v-for="tick in operatorTimelineScrubber.ticks"
                    :key="`timeline-tick-${tick.id}`"
                    class="replay-bookmark-item"
                    :class="{ active: operatorTimelineScrubber.activeTickId === tick.id }"
                    @click="activeTimelineTickId = tick.id"
                  >
                    <div>
                      <strong>{{ tick.id }}</strong>
                      <small>{{ tick.eventAt }} / {{ tick.severity }}</small>
                    </div>
                    <p class="state">{{ tick.title }}</p>
                  </li>
                </ul>
                <div class="replay-compare-slots">
                  <article v-for="slot in operatorTimelineScrubber.compareSlots" :key="`timeline-compare-${slot.key}`">
                    <h5>{{ slot.key }}</h5>
                    <p><strong>{{ slot.tickId || '-' }}</strong></p>
                    <p class="state">{{ slot.snapshot?.title || 'No timeline tick pinned.' }}</p>
                    <small class="state">{{ slot.serializedSnapshot || 'empty snapshot' }}</small>
                  </article>
                </div>
              </div>
              <div class="inline-actions">
                <button type="button" :disabled="!operatorTimelineScrubber.activeTickId" @click="pinActiveTimelineTickToPreset">
                  Pin Active Tick To {{ activeTimelinePreset }}
                </button>
                <button type="button" class="link" :disabled="!operatorTimelineScrubber.activeTickId" @click="pinActiveTimelineTickToOverride">
                  Pin Active Tick To Override
                </button>
                <button type="button" class="link" @click="clearTimelineCompareDraftSafe">
                  Safe Clear Timeline Compare Draft
                </button>
              </div>
            </div>

            <div class="simulation-outcome-panel">
              <h4>Simulation Outcome Panel</h4>
              <p class="state">Deterministic buckets: <code>success_projection</code>, <code>conflict_projection</code>, <code>rollback_recommended</code>.</p>
              <div class="simulation-outcome-grid">
                <article
                  v-for="bucket in bulkSimulationOutcome.buckets"
                  :key="bucket.key"
                  class="simulation-bucket"
                >
                  <h5>{{ bucket.label }}</h5>
                  <p><strong>{{ bucket.count }}</strong> row(s)</p>
                  <p class="state">{{ bucket.description }}</p>
                </article>
              </div>
              <p v-if="bulkSimulationOutcome.fallback.active" class="state error">
                <strong>{{ bulkSimulationOutcome.fallback.title }}:</strong> {{ bulkSimulationOutcome.fallback.message }}
              </p>
              <button
                v-if="bulkSimulationOutcome.fallback.active"
                type="button"
                class="link"
                @click="resetBulkSelectionSafe"
              >
                {{ bulkSimulationOutcome.fallback.resetActionLabel }}
              </button>

              <h5>Rollback Plan Drilldown</h5>
              <div class="chip-row">
                <button
                  v-for="option in rollbackPlanReasonOptions"
                  :key="`rollback-${option.key}`"
                  type="button"
                  class="preset-chip"
                  :class="{ active: activeRollbackPlanReason === option.key }"
                  @click="setActiveRollbackPlanReason(option.key)"
                >
                  {{ option.label }} ({{ option.count }})
                </button>
              </div>
              <p v-if="activeRollbackPlanReasonMeta" class="state">
                <strong>{{ activeRollbackPlanReasonMeta.code }}</strong> ({{ activeRollbackPlanReasonMeta.severity }}):
                {{ activeRollbackPlanReasonMeta.description }}
                Next step: {{ activeRollbackPlanReasonMeta.nextStep }}
              </p>
              <p v-else class="state">Pick a reason code to inspect rollback plan steps and affected rows.</p>
              <ul v-if="rollbackPlanDrilldownRows.length" class="timeline-list">
                <li v-for="row in rollbackPlanDrilldownRows" :key="`rollback-row-${row.id}`">
                  <strong>{{ row.id }}</strong> ({{ row.merchantId }} / {{ row.provider }})
                  <small>Bucket: {{ row.bucket }}</small>
                  <small>Reasons: {{ row.reasonCodes.length ? row.reasonCodes.join(', ') : 'none' }}</small>
                </li>
              </ul>
              <p v-else class="state">No rows match this rollback reason drilldown.</p>
            </div>

            <div class="simulation-outcome-panel">
              <h4>Scenario Compare Matrix</h4>
              <p class="state">
                Deterministic row groups:
                <code>success_projection</code>, <code>conflict_projection</code>, <code>rollback_recommended</code>, <code>unknown_input</code>.
              </p>
              <div class="chip-row">
                <button
                  v-for="option in scenarioMatrixFilterOptions"
                  :key="`matrix-filter-${option.key}`"
                  type="button"
                  class="preset-chip"
                  :class="{ active: activeScenarioMatrixFilter === option.key }"
                  @click="setActiveScenarioMatrixFilter(option.key)"
                >
                  {{ option.label }} ({{ option.count }})
                </button>
              </div>
              <div class="matrix-table-wrap">
                <table class="matrix-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Group</th>
                      <th>Reason Tags</th>
                      <th>mismatch_count</th>
                      <th>current_amount</th>
                      <th>incoming_amount</th>
                      <th>version_gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!filteredScenarioMatrixRows.length">
                      <td colspan="7">No rows in this matrix group filter.</td>
                    </tr>
                    <tr
                      v-for="row in filteredScenarioMatrixRows"
                      :key="`matrix-row-${row.id}`"
                    >
                      <td>
                        <strong>{{ row.id }}</strong>
                        <small>{{ row.merchantId }} / {{ row.provider }}</small>
                      </td>
                      <td>{{ row.group }}</td>
                      <td>{{ row.reasonTags.length ? row.reasonTags.join(', ') : 'none' }}</td>
                      <td>{{ row.columnValues.mismatch_count }}</td>
                      <td>{{ row.columnValues.current_amount }}</td>
                      <td>{{ row.columnValues.incoming_amount }}</td>
                      <td>{{ row.columnValues.version_gap }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="simulation-outcome-panel">
              <h4>Operator Decision Queue</h4>
              <p class="state" :class="{ error: decisionQueueState.error }">
                {{ decisionQueueState.error || decisionQueueState.message || 'Stage selected matrix rows, then triage with keyboard (↑/↓ or j/k, Backspace/Delete to unstage).' }}
              </p>
              <div class="inline-actions">
                <button type="button" @click="stageSelectedRowsIntoDecisionQueue">Stage Selected Rows</button>
                <button type="button" class="link" @click="resetDecisionQueueDraftSafe">Safe Reset Queue Draft</button>
                <button type="button" class="link" @click="resetDecisionQueueDraftWithFilterConfirm">Reset Queue + Matrix Filter</button>
              </div>
              <p class="state" v-if="operatorDecisionQueue.missingRowCount > 0">
                {{ operatorDecisionQueue.missingRowCount }} staged row(s) were dropped because they are not in current matrix scope.
              </p>
              <div class="queue-table-wrap" tabindex="0" @keydown="onDecisionQueueKeydown">
                <table class="queue-table">
                  <thead>
                    <tr>
                      <th>Queue Row</th>
                      <th>Group</th>
                      <th>Reason Tags</th>
                      <th>Hint</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!operatorDecisionQueue.items.length">
                      <td colspan="5">Queue is empty. Select exceptions, then stage rows.</td>
                    </tr>
                    <tr
                      v-for="item in operatorDecisionQueue.items"
                      :key="item.id"
                      :class="{ 'queue-row-active': activeDecisionQueueItemId === item.id }"
                      @click="activeDecisionQueueItemId = item.id"
                    >
                      <td>
                        <strong>{{ item.rowId }}</strong>
                        <small>{{ item.merchantId }} / {{ item.provider }}</small>
                      </td>
                      <td>{{ item.group }}</td>
                      <td>{{ item.reasonTags.length ? item.reasonTags.join(', ') : 'none' }}</td>
                      <td>{{ item.recommendedActionHint }}</td>
                      <td>
                        <button type="button" class="link" @click="unstageDecisionQueueItem(item.id)">
                          Unstage
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="simulation-outcome-panel">
              <h4>Release-Readiness Digest Board</h4>
              <p class="state" :class="{ error: reviewQueueLedgerState.error }">
                {{ reviewQueueLedgerState.error
                  || reviewQueueLedgerState.message
                  || 'Deterministic order: lanePriority, updatedAt, id. Keyboard: J previous, K next, Shift+P focus packet, Ctrl+Shift+Enter validate packet.' }}
              </p>
              <div class="chip-row">
                <button
                  v-for="option in reviewQueueFilterOptions"
                  :key="`review-queue-filter-${option.key}`"
                  type="button"
                  class="preset-chip"
                  :class="{ active: activeReviewQueueFilter === option.key }"
                  @click="setActiveReviewQueueFilter(option.key)"
                >
                  {{ option.label }} ({{ option.count }})
                </button>
              </div>
              <div class="queue-table-wrap" tabindex="0" @keydown="onReviewQueueLedgerKeydown">
                <table class="queue-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Lane Priority</th>
                      <th>Updated At</th>
                      <th>Title</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!filteredReviewQueueLedgerRows.length">
                      <td colspan="4">No rows in current digest filter.</td>
                    </tr>
                    <tr
                      v-for="row in filteredReviewQueueLedgerRows"
                      :key="`review-ledger-${row.id}`"
                      :class="{ 'queue-row-active': activeReviewQueueRowId === row.id }"
                      @click="selectReviewQueueLedgerRow(row.id)"
                    >
                      <td>
                        <strong>{{ row.id }}</strong>
                        <small>{{ row.merchantId }} / {{ row.provider }}</small>
                      </td>
                      <td>{{ row.priority }}</td>
                      <td>{{ row.eventTime }}</td>
                      <td>{{ row.title }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div ref="reviewQueueHandoffPanelRef" class="simulation-outcome-panel">
                <h4>Publish Packet Guardrails</h4>
                <p class="state" :class="{ error: reviewQueueHandoffValidation.error }">
                  {{ reviewQueueHandoffValidation.error
                    || reviewQueueHandoffValidation.message
                    || 'Autofill derives branch, SHA placeholder, mode, blocker owner, ETA, evidence artifact paths, and related issue links from active digest row.' }}
                </p>
                <div class="inline-actions">
                  <button type="button" @click="autofillReviewQueueHandoffPacketFromActiveRow">Autofill From Active Row</button>
                  <button type="button" class="link" @click="validateReviewQueueHandoffPacket">Validate Packet</button>
                  <button type="button" class="link" @click="clearReviewQueueHandoffPacketDraft(false)">Clear Draft Only</button>
                  <button
                    type="button"
                    class="link"
                    @click="clearReviewQueueHandoffPacketDraftWithConfirm"
                  >
                    Full Reset
                  </button>
                </div>
                <div class="triage-grid">
                  <label :class="{ 'field-missing': isPublishPacketFieldMissing('branch') }">
                    Branch
                    <input
                      ref="reviewQueueHandoffBranchInputRef"
                      v-model="reviewQueueHandoffDraft.branch"
                      placeholder="feature/one-249-release-packet"
                    />
                  </label>
                  <label :class="{ 'field-missing': isPublishPacketFieldMissing('fullSha') }">
                    Full SHA
                    <input v-model="reviewQueueHandoffDraft.fullSha" placeholder="40-char commit SHA" />
                  </label>
                  <label>
                    Mode
                    <select v-model="reviewQueueHandoffDraft.mode">
                      <option value="pr">PR</option>
                      <option value="no_pr">No PR</option>
                    </select>
                  </label>
                  <label :class="{ 'field-missing': isPublishPacketFieldMissing('prLink') }">
                    PR Link
                    <input v-model="reviewQueueHandoffDraft.prLink" placeholder="https://github.com/org/repo/pull/123" />
                  </label>
                  <label :class="{ 'field-missing': isPublishPacketFieldMissing('blockerOwner') }">
                    Blocker Owner
                    <input v-model="reviewQueueHandoffDraft.blockerOwner" placeholder="GitHub Admin / DevOps" />
                  </label>
                  <label :class="{ 'field-missing': isPublishPacketFieldMissing('eta') }">
                    ETA
                    <input v-model="reviewQueueHandoffDraft.eta" placeholder="2026-03-20 18:00 UTC" />
                  </label>
                </div>
                <label :class="{ 'field-missing': isPublishPacketFieldMissing('artifactPaths') }">
                  Evidence Artifact Paths (one per line)
                  <textarea v-model="reviewQueueHandoffDraft.artifactPathsText" rows="4" placeholder="artifacts/one-249/release-digest/inc-1.json"></textarea>
                </label>
                <label :class="{ 'field-missing': isPublishPacketFieldMissing('dependentIssueLinks') }">
                  Related Issue Links (one per line)
                  <textarea v-model="reviewQueueHandoffDraft.dependentIssueLinksText" rows="4" placeholder="/ONE/issues/ONE-248"></textarea>
                </label>
              </div>
            </div>
          </div>
          <div>
            <div
              ref="diagnosticsBaselinePanelRef"
              class="simulation-outcome-panel"
              tabindex="0"
              @keydown="onDiagnosticsBaselineKeydown"
            >
              <h4>Diagnostics Contract-Bundle Explorer</h4>
              <p class="state" :class="{ error: diagnosticsBaselineState.error }">
                {{ diagnosticsBaselineState.error
                  || diagnosticsBaselineState.message
                  || 'Deterministic order: (sectionWeight, fieldPath, fieldTypeWeight, sourceIssueIdentifier). Keyboard: Alt+E focus explorer, Alt+Shift+N next section, Alt+Shift+P previous section, Ctrl+Shift+H open handoff composer, Ctrl+Shift+S validate packet.' }}
              </p>
              <p class="state">Active section: {{ activeDiagnosticsDelta?.id || 'none' }}</p>
              <p class="state">
                Drift summary chips:
                <span v-if="!diagnosticsDriftSummaryChips.length"> none </span>
                <template v-else>
                  <span v-for="chip in diagnosticsDriftSummaryChips" :key="`drift-chip-${chip.code}`">
                    {{ chip.label }}={{ chip.count }}
                  </span>
                </template>
              </p>
              <div class="queue-table-wrap">
                <table class="queue-table">
                  <thead>
                    <tr>
                      <th>Section W</th>
                      <th>Field</th>
                      <th>Type W</th>
                      <th>Source Issue</th>
                      <th>Reason Code</th>
                      <th>Bundle</th>
                      <th>Baseline</th>
                      <th>Candidate</th>
                      <th>Changed</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!diagnosticsBaselineCompareWorkspace.rows.length">
                      <td colspan="9">No diagnostics baseline/candidate rows available.</td>
                    </tr>
                    <tr
                      v-for="row in diagnosticsBaselineCompareWorkspace.rows"
                      :key="`diagnostics-delta-${row.id}`"
                      :class="{ 'queue-row-active': activeDiagnosticsDeltaId === row.id }"
                      @click="activeDiagnosticsDeltaId = row.id"
                    >
                      <td>{{ row.sectionWeight }}</td>
                      <td><code>{{ row.fieldPath }}</code></td>
                      <td>{{ row.fieldTypeWeight }}</td>
                      <td>{{ row.sourceIssueIdentifier }}</td>
                      <td><code>{{ row.driftReasonCode }}</code></td>
                      <td>{{ row.bundleCode }}</td>
                      <td><code>{{ row.baselineValue || '-' }}</code></td>
                      <td><code>{{ row.candidateValue || '-' }}</code></td>
                      <td>{{ row.changed ? 'yes' : 'no' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="inline-actions">
                <button type="button" class="link" @click="diagnosticsHandoffComposerOpen = true">Open Handoff Composer</button>
                <button type="button" class="link" @click="validateDiagnosticsHandoffPacket">Validate Handoff Packet</button>
                <button type="button" class="link" @click="overrideSimulatorOpen = true">Open Override Simulator</button>
              </div>

              <div v-if="diagnosticsHandoffComposerOpen" class="card">
                <h5>Handoff Evidence Composer</h5>
                <div class="triage-grid">
                  <label :class="{ 'field-missing': isDiagnosticsHandoffFieldMissing('branch') }">
                    Branch
                    <input v-model="diagnosticsHandoffDraft.branch" placeholder="feature/one-280-contract-bundle-explorer" />
                  </label>
                  <label :class="{ 'field-missing': isDiagnosticsHandoffFieldMissing('fullSha') }">
                    Full SHA
                    <input v-model="diagnosticsHandoffDraft.fullSha" placeholder="40-char commit SHA" />
                  </label>
                  <label>
                    Mode
                    <select v-model="diagnosticsHandoffDraft.prMode">
                      <option value="pr_link">PR</option>
                      <option value="no_pr_yet">No PR yet</option>
                    </select>
                  </label>
                  <label :class="{ 'field-missing': isDiagnosticsHandoffFieldMissing('testCommand') }">
                    Test Command
                    <input v-model="diagnosticsHandoffDraft.testCommand" placeholder="npm run test -- frontend.wave1.spec.ts" />
                  </label>
                  <label :class="{ 'field-missing': isDiagnosticsHandoffFieldMissing('artifactPath') }">
                    Artifact Path
                    <input v-model="diagnosticsHandoffDraft.artifactPath" placeholder="artifacts/one-280/diagnostics-handoff.md" />
                  </label>
                  <label v-if="diagnosticsHandoffDraft.prMode === 'no_pr_yet'" :class="{ 'field-missing': isDiagnosticsHandoffFieldMissing('blockerOwner') }">
                    Blocker Owner
                    <input v-model="diagnosticsHandoffDraft.blockerOwner" placeholder="GitHub Admin / DevOps" />
                  </label>
                  <label v-if="diagnosticsHandoffDraft.prMode === 'no_pr_yet'" :class="{ 'field-missing': isDiagnosticsHandoffFieldMissing('blockerEta') }">
                    Blocker ETA
                    <input v-model="diagnosticsHandoffDraft.blockerEta" placeholder="2026-03-20T18:00:00.000Z" />
                  </label>
                </div>
                <label :class="{ 'field-missing': isDiagnosticsHandoffFieldMissing('dependencyIssueLinks') }">
                  Canonical Issue/Comment/Document Links (one per line)
                  <textarea
                    v-model="diagnosticsHandoffDraft.dependencyIssueLinksText"
                    rows="4"
                    placeholder="/issues/ONE-280&#10;/issues/ONE-280#comment-1&#10;/issues/ONE-280#document-plan"
                  />
                </label>
                <div class="queue-table-wrap">
                  <table class="queue-table">
                    <thead>
                      <tr>
                        <th>Original</th>
                        <th>Autofix</th>
                        <th>Changed</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="!diagnosticsHandoffLinkPreview.rows.length">
                        <td colspan="3">Add links to preview canonical normalization.</td>
                      </tr>
                      <tr v-for="row in diagnosticsHandoffLinkPreview.rows" :key="`handoff-link-${row.id}`">
                        <td><code>{{ row.original }}</code></td>
                        <td><code>{{ row.normalized }}</code></td>
                        <td>{{ row.changed ? 'yes' : 'no' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <label>
                  Markdown-ready Handoff Packet
                  <textarea :value="diagnosticsHandoffPacketMarkdown" rows="10" readonly />
                </label>
              </div>

              <div v-if="overrideSimulatorOpen">
                <h5>Regression Gate Override Simulator</h5>
                <p class="state">
                  Reason code counts:
                  missing_evidence={{ regressionGateOverrideSimulator.reasonCodeCounts.missing_evidence }},
                  eta_drift={{ regressionGateOverrideSimulator.reasonCodeCounts.eta_drift }},
                  dependency_open={{ regressionGateOverrideSimulator.reasonCodeCounts.dependency_open }},
                  link_noncanonical={{ regressionGateOverrideSimulator.reasonCodeCounts.link_noncanonical }},
                  artifact_gap={{ regressionGateOverrideSimulator.reasonCodeCounts.artifact_gap }}.
                </p>
                <div class="queue-table-wrap">
                  <table class="queue-table">
                    <thead>
                      <tr>
                        <th>Issue</th>
                        <th>Current Gate</th>
                        <th>Override Gate</th>
                        <th>Reason Codes</th>
                        <th>What-if Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="!regressionGateOverrideSimulator.scenarios.length">
                        <td colspan="5">No override scenarios available.</td>
                      </tr>
                      <tr
                        v-for="scenario in regressionGateOverrideSimulator.scenarios"
                        :key="scenario.id"
                        :class="{ 'queue-row-active': activeOverrideScenarioId === scenario.id }"
                        @click="activeOverrideScenarioId = scenario.id"
                      >
                        <td>{{ scenario.issueIdentifier }}</td>
                        <td>{{ scenario.currentGate }}</td>
                        <td>{{ scenario.overrideGate }}</td>
                        <td>{{ scenario.reasonCodes.length ? scenario.reasonCodes.join(', ') : 'none' }}</td>
                        <td>{{ scenario.whatIfOutcome }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h5>Canonical Internal Link Inspector</h5>
                <label>
                  Override Scenario Links (issue/comment/document; one per line)
                  <textarea
                    v-model="overrideScenarioLinksText"
                    rows="4"
                    placeholder="/issues/ONE-276#comment-12"
                  />
                </label>
                <div class="queue-table-wrap">
                  <table class="queue-table">
                    <thead>
                      <tr>
                        <th>Original</th>
                        <th>Normalized</th>
                        <th>Changed</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="!overrideScenarioLinkPreview.rows.length">
                        <td colspan="3">Add links to preview canonical /ONE/... normalization.</td>
                      </tr>
                      <tr v-for="row in overrideScenarioLinkPreview.rows" :key="`override-link-${row.id}`">
                        <td><code>{{ row.original }}</code></td>
                        <td><code>{{ row.normalized }}</code></td>
                        <td>{{ row.changed ? 'yes' : 'no' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <label>
                  Corrected Link Output (copy-ready)
                  <textarea :value="overrideScenarioLinkPreview.correctedOutput" rows="3" readonly />
                </label>
              </div>
            </div>
            <div
              ref="remediationManifestPanelRef"
              class="simulation-outcome-panel"
              tabindex="0"
              @keydown="onRemediationManifestKeydown"
            >
              <h4>Remediation-Manifest Drillboard</h4>
              <p class="state" :class="{ error: remediationManifestState.error }">
                {{ remediationManifestState.error
                  || remediationManifestState.message
                  || 'Deterministic order: (priorityWeight, dependencyDepth, issueIdentifier, runbookStepCode, artifactPath). Keyboard: Alt+M focus table, Alt+Shift+J next row, Alt+Shift+K previous row, Ctrl+Shift+G open dependency graph, Ctrl+Shift+E export packet.' }}
              </p>
              <p class="state">Active remediation row: {{ activeRemediationManifestRow?.id || 'none' }}</p>
              <div class="queue-table-wrap">
                <table class="queue-table">
                  <thead>
                    <tr>
                      <th>Priority</th>
                      <th>Depth</th>
                      <th>Issue</th>
                      <th>Step</th>
                      <th>Artifact</th>
                      <th>Blocker Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!remediationManifestDrillboard.rows.length">
                      <td colspan="6">No remediation-manifest rows available.</td>
                    </tr>
                    <tr
                      v-for="row in remediationManifestDrillboard.rows"
                      :key="`remediation-manifest-row-${row.id}`"
                      :class="{ 'queue-row-active': activeRemediationManifestRowId === row.id }"
                      @click="setActiveRemediationManifestRow(row.id)"
                    >
                      <td>{{ row.priorityWeight }}</td>
                      <td>{{ row.dependencyDepth }}</td>
                      <td>{{ row.issueIdentifier }}</td>
                      <td><code>{{ row.runbookStepCode }}</code></td>
                      <td><code>{{ row.artifactPath }}</code></td>
                      <td><code>{{ row.blockerClass }}</code></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="inline-actions">
                <button type="button" class="link" @click="openRemediationManifestDependencyGraph">Open Dependency Graph</button>
                <button type="button" class="link" @click="openRemediationManifestExportPacket">Export Handoff Packet</button>
              </div>
              <label>
                Canonical Links (issue/comment/document; one per line)
                <textarea
                  v-model="remediationManifestDependencyLinksText"
                  rows="4"
                  placeholder="/issues/ONE-281&#10;/issues/ONE-269#document-plan&#10;/issues/ONE-279#comment-12"
                />
              </label>
              <div class="queue-table-wrap">
                <table class="queue-table">
                  <thead>
                    <tr>
                      <th>Original</th>
                      <th>Normalized</th>
                      <th>Changed</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!remediationManifestCanonicalPreview.rows.length">
                      <td colspan="3">Add links to preview canonical normalization before export.</td>
                    </tr>
                    <tr v-for="row in remediationManifestCanonicalPreview.rows" :key="`remediation-manifest-link-${row.id}`">
                      <td><code>{{ row.original }}</code></td>
                      <td><code>{{ row.normalized }}</code></td>
                      <td>{{ row.changed ? 'yes' : 'no' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-if="remediationManifestDependencyGraphOpen">
                <h5>Dependency Graph Inspector</h5>
                <p class="state">
                  credential_blocker={{ remediationDependencyGraphInspector.classCounts.credential_blocker }},
                  contract_gap={{ remediationDependencyGraphInspector.classCounts.contract_gap }},
                  artifact_missing={{ remediationDependencyGraphInspector.classCounts.artifact_missing }},
                  qa_gate_pending={{ remediationDependencyGraphInspector.classCounts.qa_gate_pending }},
                  link_noncanonical={{ remediationDependencyGraphInspector.classCounts.link_noncanonical }}.
                </p>
                <div class="queue-table-wrap">
                  <table class="queue-table">
                    <thead>
                      <tr>
                        <th>Class Weight</th>
                        <th>Class</th>
                        <th>Issue</th>
                        <th>Created</th>
                        <th>Summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="!remediationDependencyGraphInspector.nodes.length">
                        <td colspan="5">No dependency graph nodes available.</td>
                      </tr>
                      <tr
                        v-for="node in remediationDependencyGraphInspector.nodes"
                        :key="`remediation-dependency-node-${node.id}`"
                        :class="{ 'queue-row-active': remediationDependencyGraphInspector.activeNodeId === node.id }"
                      >
                        <td>{{ node.classWeight }}</td>
                        <td><code>{{ node.blockerClass }}</code></td>
                        <td>{{ node.issueIdentifier }}</td>
                        <td>{{ node.createdAt }}</td>
                        <td>{{ node.summary }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div v-if="remediationManifestExportOpen">
                <h5>Deterministic Handoff Export</h5>
                <label>
                  Export Packet (byte-stable for identical fixtures)
                  <textarea :value="remediationManifestExportPacket" rows="10" readonly />
                </label>
              </div>
            </div>
            <div
              ref="publicationWindowPanelRef"
              class="simulation-outcome-panel"
              tabindex="0"
              @keydown="onPublicationWindowKeydown"
            >
              <h4>Publication-Window Plan Board</h4>
              <p class="state" :class="{ error: publicationWindowState.error }">
                {{ publicationWindowState.error
                  || publicationWindowState.message
                  || 'Deterministic order: windowPriorityWeight, blockerRisk, etaDriftMinutes, issueIdentifier, bundleCode. Keyboard: Alt+W focus, Alt+Shift+J next lane, Alt+Shift+K previous lane, Ctrl+Shift+E open score explainer, Ctrl+Shift+G open dependency gates.' }}
              </p>
              <p class="state">
                Lanes: {{ publicationWindowPlanBoard.rows.length }}
                | Ready now: {{ publicationWindowPlanBoard.scoreBandCounts.ready_now }}
                | Ready soon: {{ publicationWindowPlanBoard.scoreBandCounts.ready_soon }}
                | Hold: {{ publicationWindowPlanBoard.scoreBandCounts.hold }}
              </p>
              <div class="queue-table-wrap">
                <table class="queue-table">
                  <thead>
                    <tr>
                      <th>Issue</th>
                      <th>Bundle</th>
                      <th>Window Priority</th>
                      <th>Blocker Risk</th>
                      <th>ETA Drift</th>
                      <th>Final Score</th>
                      <th>Score Band</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!publicationWindowPlanBoard.rows.length">
                      <td colspan="7">No publication-window rows available.</td>
                    </tr>
                    <tr
                      v-for="row in publicationWindowPlanBoard.rows"
                      :key="`publication-window-${row.id}`"
                      :class="{ 'queue-row-active': activePublicationWindowLaneId === row.id }"
                      @click="setActivePublicationWindowLane(row.id)"
                    >
                      <td>{{ row.issueIdentifier }}</td>
                      <td>{{ row.bundleCode }}</td>
                      <td>{{ row.windowPriorityWeight }}</td>
                      <td>{{ row.blockerRisk }}</td>
                      <td>{{ row.etaDriftMinutes }}m</td>
                      <td>{{ row.releaseBundleScore.finalScore }}</td>
                      <td>{{ row.releaseBundleScore.scoreBandLabel }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="inline-actions">
                <button type="button" class="link" @click="publicationWindowScoreExplainerOpen = true">
                  Open Score Explainer
                </button>
                <button type="button" class="link" @click="publicationWindowDependencyGatesOpen = true">
                  Open Dependency Gates
                </button>
              </div>
              <div v-if="publicationWindowScoreExplainerOpen && activePublicationWindowLane">
                <h5>Release-Bundle Score Explainer</h5>
                <div class="triage-grid">
                  <label>
                    Completeness Score
                    <input :value="activePublicationWindowLane.releaseBundleScore.completenessScore" readonly />
                  </label>
                  <label>
                    Blocker Drift Penalty
                    <input :value="activePublicationWindowLane.releaseBundleScore.blockerDriftPenalty" readonly />
                  </label>
                  <label>
                    Dependency Risk Penalty
                    <input :value="activePublicationWindowLane.releaseBundleScore.dependencyRiskPenalty" readonly />
                  </label>
                  <label>
                    Final Score
                    <input :value="activePublicationWindowLane.releaseBundleScore.finalScore" readonly />
                  </label>
                  <label>
                    Score Band
                    <input :value="activePublicationWindowLane.releaseBundleScore.scoreBandLabel" readonly />
                  </label>
                </div>
              </div>
              <div v-if="publicationWindowDependencyGatesOpen && activePublicationWindowLane">
                <h5>Dependency Gates</h5>
                <p class="state" v-if="activePublicationWindowLane.dependencyGateErrors.length">
                  {{ activePublicationWindowLane.dependencyGateErrors.join(' | ') }}
                </p>
                <div class="queue-table-wrap">
                  <table class="queue-table">
                    <thead>
                      <tr>
                        <th>Dependency</th>
                        <th>Status</th>
                        <th>Unresolved Reason</th>
                        <th>Issue</th>
                        <th>Document</th>
                        <th>Comment</th>
                        <th>Canonical</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="!activePublicationWindowLane.dependencyGates.length">
                        <td colspan="7">No dependency gates for active lane.</td>
                      </tr>
                      <tr
                        v-for="gate in activePublicationWindowLane.dependencyGates"
                        :key="`publication-dependency-${gate.id}`"
                      >
                        <td>{{ gate.issueIdentifier }}</td>
                        <td>{{ gate.status }}</td>
                        <td>{{ gate.unresolvedReason || '-' }}</td>
                        <td><code>{{ gate.issueLink }}</code></td>
                        <td><code>{{ gate.documentLink }}</code></td>
                        <td><code>{{ gate.commentLink }}</code></td>
                        <td>{{ gate.linksValid ? 'yes' : 'no' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div
              ref="releaseReadinessPanelRef"
              class="simulation-outcome-panel"
              tabindex="0"
            >
              <h4>Release-Readiness Simulator</h4>
              <p class="state" :class="{ error: releaseReadinessState.error }">
                {{ releaseReadinessState.error
                  || releaseReadinessState.message
                  || 'Deterministic order: readinessScore desc, blockerRisk desc, etaDriftMinutes desc, issueIdentifier asc. Keyboard: Alt+R focus, Alt+Shift+J next lane, Alt+Shift+K previous lane, Ctrl+Shift+S save snapshot, Ctrl+Shift+Enter validate lane packet.' }}
              </p>
              <p class="state">Lanes: {{ releaseReadinessSimulator.rows.length }} | Snapshots: {{ releaseReadinessSnapshots.length }}</p>
              <div class="queue-table-wrap">
                <table class="queue-table">
                  <thead>
                    <tr>
                      <th>Issue</th>
                      <th>Readiness</th>
                      <th>Blocker Risk</th>
                      <th>ETA Baseline</th>
                      <th>ETA Latest</th>
                      <th>ETA Drift</th>
                      <th>Drift Class</th>
                      <th>Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!releaseReadinessSimulator.rows.length">
                      <td colspan="8">No release-readiness lanes available.</td>
                    </tr>
                    <tr
                      v-for="row in releaseReadinessSimulator.rows"
                      :key="`release-readiness-${row.id}`"
                      :class="{ 'queue-row-active': activeReleaseReadinessLaneId === row.id }"
                      @click="setActiveReleaseReadinessLane(row.id)"
                    >
                      <td>{{ row.issueIdentifier }}</td>
                      <td>{{ row.readinessScore }}</td>
                      <td>{{ row.blockerRisk }}</td>
                      <td>{{ row.etaBaseline }}</td>
                      <td>{{ row.etaLatest }}</td>
                      <td>{{ row.etaDriftMinutes }}m</td>
                      <td>{{ row.driftClass }}</td>
                      <td>{{ row.evidenceCompleteCount }}/{{ row.evidenceRequiredCount }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="inline-actions">
                <button type="button" class="link" @click="saveReleaseReadinessSnapshot">Save Scenario Snapshot</button>
                <button type="button" class="link" @click="validateReleaseReadinessLanePacket">Validate Active Lane Packet</button>
              </div>
              <div class="chip-row" v-if="activeReleaseReadinessLane">
                <button
                  v-for="badge in activeReleaseReadinessLane.evidenceBadges"
                  :key="`readiness-badge-${badge.field}`"
                  type="button"
                  class="preset-chip"
                  :class="{ active: badge.complete }"
                >
                  {{ badge.label }}: {{ badge.required ? (badge.complete ? 'ok' : 'missing') : 'optional' }}
                </button>
              </div>
            </div>
            <div
              ref="dispatchCockpitPanelRef"
              class="simulation-outcome-panel"
              tabindex="0"
            >
              <h4>Blocker-Aware Dispatch Cockpit</h4>
              <p class="state" :class="{ error: dispatchCockpitState.error }">
                {{ dispatchCockpitState.error
                  || dispatchCockpitState.message
                  || 'Deterministic order: blockerSeverity, updatedAt, issueIdentifier, laneType. Keyboard: Alt+B focus, Alt+Shift+N next blocked lane, Alt+Shift+P previous blocked lane, Ctrl+Shift+S save draft, Ctrl+Shift+Enter validate draft.' }}
              </p>
              <p class="state">Blocked lanes: {{ dispatchCockpit.blockedCount }} / {{ dispatchCockpit.rows.length }}</p>
              <div class="queue-table-wrap">
                <table class="queue-table">
                  <thead>
                    <tr>
                      <th>Issue</th>
                      <th>Lane</th>
                      <th>Severity</th>
                      <th>Updated At</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!dispatchCockpit.rows.length">
                      <td colspan="5">No dispatch lanes available.</td>
                    </tr>
                    <tr
                      v-for="row in dispatchCockpit.rows"
                      :key="`dispatch-cockpit-${row.id}`"
                      :class="{ 'queue-row-active': activeDispatchCockpitRowId === row.id }"
                      @click="setActiveDispatchCockpitRow(row.id)"
                    >
                      <td>{{ row.issueIdentifier }}</td>
                      <td>{{ row.laneType }}</td>
                      <td>{{ row.blockerSeverity }}</td>
                      <td>{{ row.updatedAt }}</td>
                      <td>{{ row.blocked ? 'blocked' : 'ready' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h5>Queued Evidence Draft Bank</h5>
              <div class="inline-actions">
                <button type="button" class="link" @click="saveDispatchDraft">Save Active Draft</button>
                <button type="button" class="link" @click="validateDispatchDraft">Validate Active Draft</button>
              </div>
              <div class="triage-grid">
                <label :class="{ 'field-missing': isDispatchDraftFieldMissing('branch') }">
                  Branch
                  <input
                    ref="dispatchDraftBranchInputRef"
                    v-model="dispatchDraft.branch"
                    placeholder="feature/one-261-dispatch-cockpit"
                  />
                </label>
                <label :class="{ 'field-missing': isDispatchDraftFieldMissing('fullSha') }">
                  Full SHA
                  <input v-model="dispatchDraft.fullSha" placeholder="40-char commit SHA" />
                </label>
                <label :class="{ 'field-missing': isDispatchDraftFieldMissing('prMode') }">
                  PR Mode
                  <select
                    :value="dispatchDraft.prMode"
                    @change="updateDispatchDraftPrMode(($event.target as HTMLSelectElement).value as 'pr_link' | 'no_pr_yet')"
                  >
                    <option value="pr_link">pr_link</option>
                    <option value="no_pr_yet">no_pr_yet</option>
                  </select>
                </label>
                <label :class="{ 'field-missing': isDispatchDraftFieldMissing('testCommand') }">
                  Test Command
                  <input v-model="dispatchDraft.testCommand" placeholder="npm run test -- test/frontend.wave1.spec.ts" />
                </label>
                <label :class="{ 'field-missing': isDispatchDraftFieldMissing('artifactPath') }">
                  Artifact Path
                  <input v-model="dispatchDraft.artifactPath" placeholder="artifacts/one-261/dispatch-cockpit.md" />
                </label>
              </div>
              <label :class="{ 'field-missing': isDispatchDraftFieldMissing('dependencyIssueLinks') }">
                Dependency Issue Links (one per line)
                <textarea v-model="dispatchDraft.dependencyIssueLinksText" rows="3" placeholder="/issues/ONE-260"></textarea>
              </label>
              <div class="triage-grid" v-if="dispatchDraft.prMode === 'no_pr_yet'">
                <label :class="{ 'field-missing': isDispatchDraftFieldMissing('blockerOwner') }">
                  Blocker Owner
                  <input v-model="dispatchDraft.blockerOwner" placeholder="GitHub Admin / DevOps" />
                </label>
                <label :class="{ 'field-missing': isDispatchDraftFieldMissing('blockerEta') }">
                  Blocker ETA
                  <input v-model="dispatchDraft.blockerEta" placeholder="2026-03-21T10:00:00.000Z" />
                </label>
              </div>

              <h5>Canonical Link Normalizer Preview</h5>
              <div class="queue-table-wrap">
                <table class="queue-table">
                  <thead>
                    <tr>
                      <th>Original</th>
                      <th>Normalized</th>
                      <th>Changed</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!dispatchDraftCanonicalPreview.rows.length">
                      <td colspan="3">Add dependency links to preview canonical normalized output.</td>
                    </tr>
                    <tr v-for="row in dispatchDraftCanonicalPreview.rows" :key="`dispatch-autofix-${row.id}`">
                      <td><code>{{ row.original }}</code></td>
                      <td><code>{{ row.normalized }}</code></td>
                      <td>{{ row.changed ? 'yes' : 'no' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h5>Saved Drafts</h5>
              <div class="queue-table-wrap">
                <table class="queue-table">
                  <thead>
                    <tr>
                      <th>Issue</th>
                      <th>Lane</th>
                      <th>Updated At</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!dispatchDraftBank.length">
                      <td colspan="4">No queued drafts saved yet.</td>
                    </tr>
                    <tr v-for="draftRow in dispatchDraftBank" :key="`dispatch-draft-bank-${draftRow.laneId}`">
                      <td>{{ draftRow.issueIdentifier }}</td>
                      <td>{{ draftRow.laneType }}</td>
                      <td>{{ draftRow.updatedAt || 'unsaved' }}</td>
                      <td>
                        <button type="button" class="link" @click="setActiveDispatchCockpitRow(draftRow.laneId)">
                          Load Lane
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div
              ref="remediationRunbookTimelinePanelRef"
              class="simulation-outcome-panel"
              tabindex="0"
              @keydown="onRemediationRunbookKeydown"
            >
              <h4>Remediation Runbook Timeline Board</h4>
              <p class="state" :class="{ error: remediationRunbookState.error }">
                {{ remediationRunbookState.error
                  || remediationRunbookState.message
                  || 'Deterministic order: severityWeight, etaDriftMinutes, issueIdentifier, stepIndex. Keyboard: Alt+T focus, Alt+Shift+J next step, Alt+Shift+K previous step, Ctrl+Shift+H open handoff pack, Ctrl+Shift+Enter validate pack.' }}
              </p>
              <div class="queue-table-wrap">
                <table class="queue-table">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>ETA Drift</th>
                      <th>Issue</th>
                      <th>Step</th>
                      <th>Owner</th>
                      <th>Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!remediationRunbookTimelineBoard.rows.length">
                      <td colspan="6">No runbook timeline steps available in current fixture set.</td>
                    </tr>
                    <tr
                      v-for="row in remediationRunbookTimelineBoard.rows"
                      :key="row.id"
                      :class="{ 'queue-row-active': activeRemediationRunbookStepId === row.id }"
                      @click="setActiveRemediationRunbookStep(row.id)"
                    >
                      <td>{{ row.severityWeight }}</td>
                      <td>{{ row.etaDriftMinutes }}m</td>
                      <td>{{ row.issueIdentifier }}</td>
                      <td>{{ row.stepIndex }}</td>
                      <td>{{ row.owner }}</td>
                      <td>{{ row.summary }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="inline-actions">
                <button type="button" class="link" @click="openRemediationRunbookComposer">Open Handoff Pack Composer</button>
                <button type="button" class="link" @click="validateRemediationRunbookHandoffPack">Validate Active Pack</button>
                <button type="button" class="link" @click="clearRemediationRunbookHandoffPack(false)">Clear Draft Only</button>
                <button type="button" class="link" @click="clearRemediationRunbookHandoffPackWithConfirm">Full Reset</button>
              </div>
              <div v-if="remediationRunbookComposerOpen">
                <h5>Publish-Readiness Handoff Pack Composer</h5>
                <div class="triage-grid">
                  <label :class="{ 'field-missing': isRemediationRunbookHandoffFieldMissing('branch') }">
                    Branch
                    <input
                      ref="remediationRunbookBranchInputRef"
                      v-model="remediationRunbookHandoffDraft.branch"
                      placeholder="feature/one-266-runbook-timeline"
                    />
                  </label>
                  <label :class="{ 'field-missing': isRemediationRunbookHandoffFieldMissing('fullSha') }">
                    Full SHA
                    <input v-model="remediationRunbookHandoffDraft.fullSha" placeholder="40-char commit SHA" />
                  </label>
                  <label :class="{ 'field-missing': isRemediationRunbookHandoffFieldMissing('prMode') }">
                    PR Mode
                    <select
                      :value="remediationRunbookHandoffDraft.prMode"
                      @change="updateRemediationRunbookHandoffPrMode(($event.target as HTMLSelectElement).value as 'pr_link' | 'no_pr_yet')"
                    >
                      <option value="pr_link">pr_link</option>
                      <option value="no_pr_yet">no_pr_yet</option>
                    </select>
                  </label>
                  <label :class="{ 'field-missing': isRemediationRunbookHandoffFieldMissing('testCommand') }">
                    Test Command
                    <input v-model="remediationRunbookHandoffDraft.testCommand" placeholder="npm run test -- test/frontend.wave1.spec.ts" />
                  </label>
                  <label :class="{ 'field-missing': isRemediationRunbookHandoffFieldMissing('artifactPath') }">
                    Artifact Path
                    <input v-model="remediationRunbookHandoffDraft.artifactPath" placeholder="artifacts/one-266/remediation-runbook-pack.md" />
                  </label>
                </div>
                <label :class="{ 'field-missing': isRemediationRunbookHandoffFieldMissing('dependencyIssueLinks') }">
                  Dependency Issue Links (one per line)
                  <textarea v-model="remediationRunbookHandoffDraft.dependencyIssueLinksText" rows="3" placeholder="/issues/ONE-265"></textarea>
                </label>
                <div class="triage-grid" v-if="remediationRunbookHandoffDraft.prMode === 'no_pr_yet'">
                  <label :class="{ 'field-missing': isRemediationRunbookHandoffFieldMissing('blockerOwner') }">
                    Blocker Owner
                    <input v-model="remediationRunbookHandoffDraft.blockerOwner" placeholder="GitHub Admin / DevOps" />
                  </label>
                  <label :class="{ 'field-missing': isRemediationRunbookHandoffFieldMissing('blockerEta') }">
                    Blocker ETA
                    <input v-model="remediationRunbookHandoffDraft.blockerEta" placeholder="2026-03-21T12:00:00.000Z" />
                  </label>
                </div>
                <h5>Canonical Link Autofix Preview</h5>
                <div class="queue-table-wrap">
                  <table class="queue-table">
                    <thead>
                      <tr>
                        <th>Original</th>
                        <th>Normalized</th>
                        <th>Changed</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="!remediationRunbookCanonicalPreview.rows.length">
                        <td colspan="3">Add dependency links to preview canonical normalized output.</td>
                      </tr>
                      <tr v-for="row in remediationRunbookCanonicalPreview.rows" :key="`runbook-autofix-${row.id}`">
                        <td><code>{{ row.original }}</code></td>
                        <td><code>{{ row.normalized }}</code></td>
                        <td>{{ row.changed ? 'yes' : 'no' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div
              ref="manifestDiffPanelRef"
              class="simulation-outcome-panel"
              tabindex="0"
              @keydown="onManifestDiffKeydown"
            >
              <h4>Manifest Diff Viewer</h4>
              <p class="state" :class="{ error: manifestDiffState.error }">
                {{ manifestDiffState.error
                  || manifestDiffState.message
                  || 'Deterministic order: severityWeight, deltaClassWeight, issueIdentifier, fieldPath. Keyboard: Alt+M focus, Alt+Shift+J next finding, Alt+Shift+K previous finding, Ctrl+Shift+D open handoff drill, Ctrl+Shift+Enter validate packet.' }}
              </p>
              <div class="queue-table-wrap">
                <table class="queue-table">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Delta Weight</th>
                      <th>Issue</th>
                      <th>Field Path</th>
                      <th>Delta Class</th>
                      <th>Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!manifestDiffViewer.rows.length">
                      <td colspan="6">No manifest diff findings in the current deterministic fixture set.</td>
                    </tr>
                    <tr
                      v-for="row in manifestDiffViewer.rows"
                      :key="row.id"
                      :class="{ 'queue-row-active': activeManifestDiffRowId === row.id }"
                      @click="setActiveManifestDiffRow(row.id)"
                    >
                      <td>{{ row.severityWeight }}</td>
                      <td>{{ row.deltaClassWeight }}</td>
                      <td>{{ row.issueIdentifier }}</td>
                      <td><code>{{ row.fieldPath }}</code></td>
                      <td>{{ row.deltaClass }}</td>
                      <td>{{ row.summary }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="inline-actions">
                <button type="button" class="link" @click="openManifestHandoffDrill">Open Blocked-Lane Handoff Drill</button>
                <button type="button" class="link" @click="validateManifestHandoffDrill">Validate Active Packet</button>
                <button type="button" class="link" @click="clearManifestHandoffDrill(false)">Clear Draft Only</button>
                <button type="button" class="link" @click="clearManifestHandoffDrillWithConfirm">Full Reset</button>
              </div>
              <div v-if="manifestHandoffDrillOpen">
                <h5>Blocked-Lane Handoff Drill Console</h5>
                <div class="triage-grid">
                  <label :class="{ 'field-missing': isManifestHandoffFieldMissing('branch') }">
                    Branch
                    <input
                      ref="manifestDiffBranchInputRef"
                      v-model="manifestHandoffDrillDraft.branch"
                      placeholder="feature/one-268-manifest-diff-viewer"
                    />
                  </label>
                  <label :class="{ 'field-missing': isManifestHandoffFieldMissing('fullSha') }">
                    Full SHA
                    <input v-model="manifestHandoffDrillDraft.fullSha" placeholder="40-char commit SHA" />
                  </label>
                  <label :class="{ 'field-missing': isManifestHandoffFieldMissing('prMode') }">
                    PR Mode
                    <select
                      :value="manifestHandoffDrillDraft.prMode"
                      @change="updateManifestHandoffPrMode(($event.target as HTMLSelectElement).value as 'pr_link' | 'no_pr_yet')"
                    >
                      <option value="pr_link">pr_link</option>
                      <option value="no_pr_yet">no_pr_yet</option>
                    </select>
                  </label>
                  <label :class="{ 'field-missing': isManifestHandoffFieldMissing('testCommand') }">
                    Test Command
                    <input v-model="manifestHandoffDrillDraft.testCommand" placeholder="npm run test -- test/frontend.wave1.spec.ts" />
                  </label>
                  <label :class="{ 'field-missing': isManifestHandoffFieldMissing('artifactPath') }">
                    Artifact Path
                    <input v-model="manifestHandoffDrillDraft.artifactPath" placeholder="artifacts/one-268/manifest-handoff-pack.md" />
                  </label>
                </div>
                <label :class="{ 'field-missing': isManifestHandoffFieldMissing('dependencyIssueLinks') }">
                  Dependency Issue Links (one per line)
                  <textarea v-model="manifestHandoffDrillDraft.dependencyIssueLinksText" rows="3" placeholder="/issues/ONE-267"></textarea>
                </label>
                <div class="triage-grid" v-if="manifestHandoffDrillDraft.prMode === 'no_pr_yet'">
                  <label :class="{ 'field-missing': isManifestHandoffFieldMissing('blockerOwner') }">
                    Blocker Owner
                    <input v-model="manifestHandoffDrillDraft.blockerOwner" placeholder="GitHub Admin / DevOps" />
                  </label>
                  <label :class="{ 'field-missing': isManifestHandoffFieldMissing('blockerEta') }">
                    Blocker ETA
                    <input v-model="manifestHandoffDrillDraft.blockerEta" placeholder="2026-03-22T08:00:00.000Z" />
                  </label>
                </div>
                <h5>Canonical Link Autofix Preview</h5>
                <div class="queue-table-wrap">
                  <table class="queue-table">
                    <thead>
                      <tr>
                        <th>Original</th>
                        <th>Normalized</th>
                        <th>Changed</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="!manifestHandoffCanonicalPreview.rows.length">
                        <td colspan="3">Add dependency links to preview canonical normalized output.</td>
                      </tr>
                      <tr v-for="row in manifestHandoffCanonicalPreview.rows" :key="`manifest-autofix-${row.id}`">
                        <td><code>{{ row.original }}</code></td>
                        <td><code>{{ row.normalized }}</code></td>
                        <td>{{ row.changed ? 'yes' : 'no' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <label>
                  Corrected Link Output (copy-ready)
                  <textarea :value="manifestHandoffCanonicalPreview.correctedOutput" rows="3" readonly />
                </label>
              </div>
            </div>
            <div
              ref="anomalyTriageBoardPanelRef"
              class="simulation-outcome-panel"
              tabindex="0"
              @keydown="onAnomalyTriageKeydown"
            >
              <h4>Anomaly Triage Board</h4>
              <p class="state" :class="{ error: remediationPlaybookState.error }">
                {{ remediationPlaybookState.error
                  || remediationPlaybookState.message
                  || 'Deterministic order: severityWeight desc, stalenessMinutes desc, issueIdentifier asc, fieldPath asc. Keyboard: Alt+A focus, Alt+Shift+J next anomaly, Alt+Shift+K previous anomaly, Ctrl+Shift+P open playbook composer, Ctrl+Shift+Enter validate playbook.' }}
              </p>
              <div class="queue-table-wrap">
                <table class="queue-table">
                  <thead>
                    <tr>
                      <th>Severity Weight</th>
                      <th>Staleness (min)</th>
                      <th>Issue</th>
                      <th>Field Path</th>
                      <th>Category</th>
                      <th>Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!anomalyTriageBoard.rows.length">
                      <td colspan="6">No anomaly rows available in the current deterministic fixture set.</td>
                    </tr>
                    <tr
                      v-for="row in anomalyTriageBoard.rows"
                      :key="row.id"
                      :class="{ 'queue-row-active': activeAnomalyTriageRowId === row.id }"
                      @click="setActiveAnomalyTriageRow(row.id)"
                    >
                      <td>{{ row.severityWeight }}</td>
                      <td>{{ row.stalenessMinutes }}</td>
                      <td>{{ row.issueIdentifier }}</td>
                      <td><code>{{ row.fieldPath }}</code></td>
                      <td>{{ row.category }}</td>
                      <td>{{ row.summary }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="inline-actions">
                <button type="button" class="link" @click="openRemediationPlaybookComposer">Open Playbook Composer</button>
                <button type="button" class="link" @click="validateActiveRemediationPlaybook">Validate Active Playbook</button>
                <button type="button" class="link" @click="saveRemediationPlaybookDraft">Save Draft</button>
              </div>
              <h5>Canonical Link Autofix Preview</h5>
              <p class="state">Canonicalized to company-prefixed issue/comment/document links before playbook submission.</p>
              <div class="queue-table-wrap">
                <table class="queue-table">
                  <thead>
                    <tr>
                      <th>Original</th>
                      <th>Normalized</th>
                      <th>Changed</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!remediationPlaybookCanonicalPreview.rows.length">
                      <td colspan="3">Add dependency issue links in the playbook composer to preview canonical normalization.</td>
                    </tr>
                    <tr v-for="row in remediationPlaybookCanonicalPreview.rows" :key="`playbook-autofix-${row.id}`">
                      <td><code>{{ row.original }}</code></td>
                      <td><code>{{ row.normalized }}</code></td>
                      <td>{{ row.changed ? 'yes' : 'no' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <label>
                Corrected Link Output (copy-ready)
                <textarea :value="remediationPlaybookCanonicalPreview.correctedOutput" rows="3" readonly />
              </label>
            </div>
            <div
              ref="evidencePacketLintPanelRef"
              class="simulation-outcome-panel"
              tabindex="0"
              @keydown="onEvidencePacketLintKeydown"
            >
              <h4>Evidence Packet Lint Console</h4>
              <p class="state" :class="{ error: evidencePacketLintState.error }">
                {{ evidencePacketLintState.error
                  || evidencePacketLintState.message
                  || 'Deterministic order: severityPriority, fieldPriority, issueIdentifier, path. Keyboard: Alt+E focus, Alt+J next finding, Alt+K previous finding, Ctrl+Shift+Enter validate packet.' }}
              </p>
              <div class="chip-row">
                <button
                  v-for="option in evidencePacketLintFilterOptions"
                  :key="`evidence-lint-filter-${option.key}`"
                  type="button"
                  class="preset-chip"
                  :class="{ active: activeEvidencePacketLintFilter === option.key }"
                  @click="setActiveEvidencePacketLintFilter(option.key)"
                >
                  {{ option.label }} ({{ option.count }})
                </button>
              </div>
              <div class="queue-table-wrap">
                <table class="queue-table">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Field</th>
                      <th>Issue</th>
                      <th>Path</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!evidencePacketLintConsole.rows.length">
                      <td colspan="5">No lint findings for this filter.</td>
                    </tr>
                    <tr
                      v-for="row in evidencePacketLintConsole.rows"
                      :key="`evidence-lint-${row.id}`"
                      :class="{ 'queue-row-active': activeEvidencePacketLintFindingId === row.id }"
                      @click="setActiveEvidencePacketLintFinding(row.id)"
                    >
                      <td>{{ row.severity }}</td>
                      <td>{{ row.field }}</td>
                      <td>{{ row.issueIdentifier }}</td>
                      <td>{{ row.path }}</td>
                      <td>{{ row.message }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h5>Canonical Link Autofix Preview</h5>
              <p class="state">Original vs normalized company-prefixed issue/comment/document links with copy-ready corrected output.</p>
              <div class="queue-table-wrap">
                <table class="queue-table">
                  <thead>
                    <tr>
                      <th>Original</th>
                      <th>Normalized</th>
                      <th>Changed</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!canonicalLinkAutofixPreview.rows.length">
                      <td colspan="3">Add dependency issue links below to preview canonical autofix output.</td>
                    </tr>
                    <tr
                      v-for="row in canonicalLinkAutofixPreview.rows"
                      :key="row.id"
                    >
                      <td><code>{{ row.original }}</code></td>
                      <td><code>{{ row.normalized }}</code></td>
                      <td>{{ row.changed ? 'yes' : 'no' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <label>
                Corrected Link Output (copy-ready)
                <textarea :value="canonicalLinkAutofixPreview.correctedOutput" rows="3" readonly />
              </label>

              <h5>Required Field Checklist</h5>
              <div class="inline-actions">
                <button type="button" class="link" @click="validateEvidencePacketLintChecklist">Validate Packet</button>
                <button type="button" class="link" @click="clearEvidencePacketLintChecklistDraft(false)">Clear Draft Only</button>
                <button type="button" class="link" @click="clearEvidencePacketLintChecklistDraftWithConfirm">Full Reset</button>
              </div>
              <div class="triage-grid">
                <label :class="{ 'field-missing': isEvidencePacketLintFieldMissing('branch') }">
                  Branch
                  <input
                    ref="evidencePacketLintBranchInputRef"
                    v-model="evidencePacketLintChecklistDraft.branch"
                    placeholder="feature/one-259-evidence-lint-console"
                  />
                </label>
                <label :class="{ 'field-missing': isEvidencePacketLintFieldMissing('fullSha') }">
                  Full SHA
                  <input v-model="evidencePacketLintChecklistDraft.fullSha" placeholder="40-char commit SHA" />
                </label>
                <label :class="{ 'field-missing': isEvidencePacketLintFieldMissing('prMode') }">
                  PR Mode
                  <select
                    :value="evidencePacketLintChecklistDraft.prMode"
                    @change="updateEvidencePacketLintPrMode(($event.target as HTMLSelectElement).value as 'pr_link' | 'no_pr_yet')"
                  >
                    <option value="pr_link">pr_link</option>
                    <option value="no_pr_yet">no_pr_yet</option>
                  </select>
                </label>
                <label :class="{ 'field-missing': isEvidencePacketLintFieldMissing('testCommand') }">
                  Test Command
                  <input v-model="evidencePacketLintChecklistDraft.testCommand" placeholder="npm run test -- test/frontend.wave1.spec.ts" />
                </label>
                <label :class="{ 'field-missing': isEvidencePacketLintFieldMissing('artifactPath') }">
                  Artifact Path
                  <input v-model="evidencePacketLintChecklistDraft.artifactPath" placeholder="artifacts/one-259/evidence-lint-console.txt" />
                </label>
              </div>
              <label :class="{ 'field-missing': isEvidencePacketLintFieldMissing('dependencyIssueLinks') }">
                Dependency Issue Links (one per line)
                <textarea v-model="evidencePacketLintChecklistDraft.dependencyIssueLinksText" rows="4" placeholder="/ONE/issues/ONE-258"></textarea>
              </label>
              <div class="triage-grid" v-if="evidencePacketLintChecklistDraft.prMode === 'no_pr_yet'">
                <label :class="{ 'field-missing': isEvidencePacketLintFieldMissing('blockerOwner') }">
                  Blocker Owner
                  <input v-model="evidencePacketLintChecklistDraft.blockerOwner" placeholder="GitHub Admin / DevOps" />
                </label>
                <label :class="{ 'field-missing': isEvidencePacketLintFieldMissing('blockerEta') }">
                  Blocker ETA
                  <input v-model="evidencePacketLintChecklistDraft.blockerEta" placeholder="2026-03-20T18:00:00.000Z" />
                </label>
              </div>
            </div>
            <div
              ref="evidenceTimelineHeatmapPanelRef"
              class="simulation-outcome-panel"
              tabindex="0"
              @keydown="onEvidenceTimelineHeatmapKeydown"
            >
              <h4>Evidence Timeline Heatmap</h4>
              <p class="state">
                Deterministic order: lanePriority, missingFieldPriority, issueIdentifier, updatedAt.
                Keyboard: Alt+H focus, Alt+Down next gap row, Alt+Up previous gap row, Ctrl+Shift+Enter validate checklist.
              </p>
              <div class="chip-row">
                <button
                  v-for="option in evidenceTimelineLaneOptions"
                  :key="`evidence-timeline-lane-${option.key}`"
                  type="button"
                  class="preset-chip"
                  :class="{ active: activeEvidenceTimelineLane === option.key }"
                  @click="setActiveEvidenceTimelineLane(option.key)"
                >
                  {{ option.label }} ({{ option.count }})
                </button>
              </div>
              <div class="queue-table-wrap">
                <table class="queue-table">
                  <thead>
                    <tr>
                      <th>Lane</th>
                      <th>Gap Code</th>
                      <th>Issue</th>
                      <th>Updated At</th>
                      <th>Autofix Hint</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!evidenceTimelineHeatmap.rows.length">
                      <td colspan="5">No evidence-gap rows for this lane filter.</td>
                    </tr>
                    <tr
                      v-for="row in evidenceTimelineHeatmap.rows"
                      :key="`evidence-heatmap-${row.id}`"
                      :class="{ 'queue-row-active': activeEvidenceTimelineRowId === row.id }"
                      @click="setActiveEvidenceTimelineRow(row.id)"
                    >
                      <td>{{ row.lanePriority }}</td>
                      <td>{{ row.missingFieldCode }}</td>
                      <td>{{ row.issueIdentifier }}</td>
                      <td>{{ row.updatedAt }}</td>
                      <td>{{ row.autofixHint }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <h5>Checklist Autofix Hints</h5>
              <ul class="timeline-list">
                <li v-for="hint in evidenceChecklistAutofixHints" :key="`autofix-${hint.code}`">
                  <strong>{{ hint.code }}</strong>
                  <small>{{ hint.action }}</small>
                </li>
              </ul>
            </div>
            <div ref="replayDiffPanelRef" class="simulation-outcome-panel" tabindex="0" @keydown="onReplayDiffInspectorKeydown">
              <h4>Replay Diff Inspector</h4>
              <p class="state" :class="{ error: replayDiffState.error }">
                {{ replayDiffState.error
                  || replayDiffState.message
                  || 'Deterministic order: changeTypePriority, lineageDepth, sourceIssueId, artifactPath. Keyboard: Alt+D focus, Alt+Right next, Alt+Left previous, Ctrl+Shift+Enter validate checklist.' }}
              </p>
              <div class="chip-row">
                <button
                  v-for="option in replayDiffFilterOptions"
                  :key="`replay-diff-filter-${option.key}`"
                  type="button"
                  class="preset-chip"
                  :class="{ active: activeReplayDiffFilter === option.key }"
                  @click="setActiveReplayDiffFilter(option.key)"
                >
                  {{ option.label }}
                  ({{ option.key === 'all'
                    ? replayDiffInspector.rows.length
                    : replayDiffInspector.rows.filter((row) => row.changeType === option.key).length }})
                </button>
              </div>
              <div class="queue-table-wrap">
                <table class="queue-table">
                  <thead>
                    <tr>
                      <th>Change</th>
                      <th>lineageDepth</th>
                      <th>sourceIssueId</th>
                      <th>artifactPath</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!replayDiffInspector.rows.length">
                      <td colspan="4">Select primary and secondary bookmarks to inspect replay diffs.</td>
                    </tr>
                    <tr
                      v-for="row in replayDiffInspector.rows"
                      :key="row.id"
                      :class="{ 'queue-row-active': activeReplayDiffRowId === row.id }"
                      @click="setActiveReplayDiffRow(row.id)"
                    >
                      <td>{{ row.changeType }}</td>
                      <td>{{ row.lineageDepth }}</td>
                      <td>{{ row.sourceIssueId }}</td>
                      <td>{{ row.artifactPath || '(none)' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h5>Evidence Gap Checklist</h5>
              <div class="inline-actions">
                <button type="button" class="link" @click="validateEvidenceGapChecklist">Validate Checklist</button>
                <button type="button" class="link" @click="clearEvidenceGapChecklistDraft(false)">Clear Draft Only</button>
                <button type="button" class="link" @click="clearEvidenceGapChecklistDraftWithConfirm">Full Reset</button>
              </div>
              <div class="triage-grid">
                <label :class="{ 'field-missing': isEvidenceGapFieldMissing('branch') }">
                  Branch
                  <input
                    ref="evidenceGapBranchInputRef"
                    v-model="evidenceGapChecklistDraft.branch"
                    placeholder="frontend/one-255-replay-diff"
                  />
                </label>
                <label :class="{ 'field-missing': isEvidenceGapFieldMissing('fullSha') }">
                  Full SHA
                  <input v-model="evidenceGapChecklistDraft.fullSha" placeholder="40-char commit SHA" />
                </label>
                <label>
                  PR / no-PR mode
                  <select v-model="evidenceGapChecklistDraft.mode">
                    <option value="pr">PR</option>
                    <option value="no_pr">No PR</option>
                  </select>
                </label>
                <label :class="{ 'field-missing': isEvidenceGapFieldMissing('prLink') }">
                  PR Link
                  <input v-model="evidenceGapChecklistDraft.prLink" placeholder="https://github.com/org/repo/pull/123" />
                </label>
                <label :class="{ 'field-missing': isEvidenceGapFieldMissing('blockerOwner') }">
                  Blocker Owner
                  <input v-model="evidenceGapChecklistDraft.blockerOwner" placeholder="GitHub Admin / DevOps" />
                </label>
                <label :class="{ 'field-missing': isEvidenceGapFieldMissing('eta') }">
                  ETA
                  <input v-model="evidenceGapChecklistDraft.eta" placeholder="2026-03-20 18:00 UTC" />
                </label>
              </div>
              <label :class="{ 'field-missing': isEvidenceGapFieldMissing('missingArtifactPaths') }">
                Missing Artifact Paths (one per line)
                <textarea v-model="evidenceGapChecklistDraft.missingArtifactPathsText" rows="4" placeholder="artifacts/one-255/replay-diff-inspector.json"></textarea>
              </label>
              <label :class="{ 'field-missing': isEvidenceGapFieldMissing('dependencyIssueLinks') }">
                Dependency Issue Links (one per line)
                <textarea v-model="evidenceGapChecklistDraft.dependencyIssueLinksText" rows="4" placeholder="/ONE/issues/ONE-253"></textarea>
              </label>
            </div>
            <h4>Replay Delta Inspector</h4>
            <p class="state">Field-level compare order is deterministic: status, amount, riskFlags, updatedAt.</p>
            <div class="replay-delta-table-wrap">
              <table class="replay-delta-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Primary</th>
                    <th>Secondary</th>
                    <th>Changed</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!replayDeltaInspector.canCompare">
                    <td colspan="4">{{ replayDeltaInspector.emptyMessage }}</td>
                  </tr>
                  <tr
                    v-for="row in replayDeltaInspector.rows"
                    :key="`replay-delta-${row.field}`"
                    :class="{ 'replay-delta-row-changed': row.changed }"
                  >
                    <td>{{ row.field }}</td>
                    <td>{{ row.primaryValue }}</td>
                    <td>{{ row.secondaryValue }}</td>
                    <td>{{ row.changed ? 'yes' : 'no' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <h4>Diff Inspector</h4>
            <p class="state">Per-row current vs incoming deltas use deterministic field order: amount, status, updatedAt, version.</p>
            <p class="state">Keyboard: <code>↑/↓</code> or <code>j/k</code> to move row focus, <code>0-4</code> to jump reason bucket, <code>Esc</code> to reset view.</p>
            <div class="sticky-anomaly-bar" role="status" aria-live="polite">
              <span>stale_version {{ bulkDiffInspector.reasonCounts.stale_version }}</span>
              <span>malformed {{ bulkDiffInspector.reasonCounts.malformed }}</span>
              <span>high_delta {{ bulkDiffInspector.reasonCounts.high_delta }}</span>
              <span>mixed_status {{ bulkDiffInspector.reasonCounts.mixed_status }}</span>
              <span
                v-for="chip in explainabilityAppliedChips"
                :key="chip.key"
                class="anomaly-chip"
              >
                {{ chip.label }}: {{ chip.value }}
              </span>
            </div>
            <div class="chip-row">
              <button
                v-for="option in conflictDrilldownOptions"
                :key="option.key"
                type="button"
                class="preset-chip"
                :class="{ active: activeConflictDrilldown === option.key }"
                @click="setActiveConflictDrilldown(option.key)"
              >
                {{ option.label }}
                ({{ option.key === 'all'
                  ? bulkDiffInspector.rows.length
                  : bulkDiffInspector.reasonCounts[option.key] }})
              </button>
              <button
                type="button"
                class="link"
                @click="resetBulkInspectorViewState"
              >
                Reset Inspector View
              </button>
            </div>
            <p v-if="bulkDiffEmptyState" class="state error">
              <strong>{{ bulkDiffEmptyState.title }}:</strong> {{ bulkDiffEmptyState.message }}
            </p>
            <div v-else class="bulk-diff-table-wrap" tabindex="0" @keydown="onBulkDiffKeydown">
              <table class="bulk-diff-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Reasons</th>
                    <th>amount</th>
                    <th>status</th>
                    <th>updatedAt</th>
                    <th>version</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in filteredBulkDiffRows"
                    :key="row.id"
                    :class="{ 'bulk-diff-row-active': activeBulkDiffRowId === row.id }"
                    @click="setActiveBulkDiffRow(row.id)"
                  >
                    <td>
                      <span class="focus-indicator" :class="{ active: activeBulkDiffRowId === row.id }" aria-hidden="true"></span>
                      {{ row.id }}
                      <small>{{ row.merchantId }} / {{ row.provider }}</small>
                    </td>
                    <td>{{ row.reasons.length ? row.reasons.join(', ') : 'none' }}</td>
                    <td v-for="delta in row.deltas" :key="`${row.id}-${delta.field}`">
                      <strong>{{ delta.current }}</strong>
                      <small>&rarr; {{ delta.incoming }}</small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <h4>Deterministic CSV Export Preview</h4>
            <pre class="code-preview">{{ bulkExceptionPreview.csvPreview }}</pre>
            <h4>Deterministic JSON Export Preview</h4>
            <pre class="code-preview">{{ bulkExceptionPreview.jsonPreview }}</pre>
          </div>
        </div>
      </article>

      <div class="triage-grid">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    :checked="areAllExceptionRowsSelected"
                    :disabled="!exceptionRows.length"
                    @change="onToggleAllExceptionSelections"
                  />
                </th>
                <th>Exception ID</th>
                <th>Merchant</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Mismatches</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!exceptionRows.length">
                <td colspan="8">No settlement exceptions found.</td>
              </tr>
              <tr v-for="row in exceptionRows" :key="row.id">
                <td>
                  <input
                    type="checkbox"
                    :checked="selectedExceptionIds.includes(row.id)"
                    @change="onToggleExceptionSelection(row.id, $event)"
                  />
                </td>
                <td>{{ row.id }}</td>
                <td>{{ row.merchantId }}</td>
                <td>{{ row.provider }}</td>
                <td>{{ row.status }}</td>
                <td>{{ row.mismatchCount }}</td>
                <td>{{ new Date(row.updatedAt).toLocaleString() }}</td>
                <td>
                  <button type="button" class="link" @click="loadExceptionDetail(row.id)">
                    View Detail
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <article class="detail-panel">
          <h3>Exception Detail</h3>
          <p class="state" :class="{ error: exceptionDetailState.error }">
            {{ exceptionDetailState.error || exceptionDetailState.message }}
          </p>
          <template v-if="exceptionDetail">
            <p><strong>ID:</strong> {{ exceptionDetail.id }}</p>
            <p><strong>Status:</strong> {{ exceptionDetail.status }}</p>
            <p><strong>Window:</strong> {{ new Date(exceptionDetail.windowStart).toLocaleString() }} - {{ new Date(exceptionDetail.windowEnd).toLocaleString() }}</p>

            <div class="inline-actions">
              <button type="button" :disabled="exceptionAction.loading" @click="openExceptionAction('resolve')">Resolve</button>
              <button type="button" class="danger" :disabled="exceptionAction.loading" @click="openExceptionAction('ignore')">Ignore</button>
            </div>

            <h4>Mismatch Breakdown</h4>
            <ul class="timeline-list">
              <li v-if="!exceptionDetail.mismatches.length">No mismatch rows.</li>
              <li v-for="item in exceptionDetail.mismatches" :key="item.eventKey">
                <strong>{{ item.title }}</strong>
                <div>{{ item.detail }}</div>
                <small v-if="item.occurredAt">{{ new Date(item.occurredAt).toLocaleString() }}</small>
              </li>
            </ul>

            <h4>Audit Timeline</h4>
            <ul class="timeline-list">
              <li v-if="!exceptionDetail.audits.length">No audit actions yet.</li>
              <li v-for="entry in exceptionDetail.audits" :key="entry.id">
                <strong>{{ entry.action.toUpperCase() }}</strong> by {{ entry.actor }} at {{ new Date(entry.createdAt).toLocaleString() }}
                <div>Reason: {{ entry.reason }}</div>
                <small v-if="entry.note">Note: {{ entry.note }}</small>
              </li>
            </ul>
          </template>
          <p v-else class="state">Select an exception row to load detail.</p>
        </article>
      </div>

      <div v-if="exceptionAction.open" class="modal-backdrop" @click.self="closeExceptionAction">
        <div class="modal">
          <h3>{{ exceptionAction.action === 'resolve' ? 'Resolve Exception' : 'Ignore Exception' }}</h3>
          <form class="grid" @submit.prevent="submitExceptionAction">
            <label>
              Reason (required)
              <input v-model="exceptionAction.reason" required />
            </label>
            <label>
              Operator note
              <input v-model="exceptionAction.note" placeholder="optional note" />
            </label>
            <button :disabled="exceptionAction.loading" type="submit">
              {{ exceptionAction.loading ? 'Submitting...' : 'Confirm Action' }}
            </button>
            <button type="button" class="link" :disabled="exceptionAction.loading" @click="closeExceptionAction">Cancel</button>
          </form>
          <p class="state error" v-if="exceptionAction.error">{{ exceptionAction.error }}</p>
        </div>
      </div>

      <div v-if="bulkPreviewDrawer.open" class="modal-backdrop" @click.self="closeBulkPreviewDrawer">
        <div class="modal">
          <h3>{{ bulkPreviewDrawer.action === 'resolve' ? 'Bulk Resolve Confirmation' : 'Bulk Ignore Confirmation' }}</h3>
          <p class="state">
            Confirm {{ bulkPreviewDrawer.action }} for {{ bulkConfirmation.validCount }} valid row(s) out of {{ bulkConfirmation.selectedCount }} selected.
          </p>
          <ul class="timeline-list">
            <li>Status breakdown: open {{ bulkConfirmation.statusCounts.open }}, investigating {{ bulkConfirmation.statusCounts.investigating }}, resolved {{ bulkConfirmation.statusCounts.resolved }}, ignored {{ bulkConfirmation.statusCounts.ignored }}</li>
            <li>Risk buckets: high {{ bulkConfirmation.riskCounts.high }}, medium {{ bulkConfirmation.riskCounts.medium }}, low {{ bulkConfirmation.riskCounts.low }}</li>
            <li v-if="bulkConfirmation.needsRollbackHint">{{ bulkConfirmation.rollbackHint }}</li>
          </ul>
          <p v-if="bulkConfirmation.hasFallback" class="state error">
            {{ bulkConfirmation.fallbackTitle }}: {{ bulkConfirmation.fallbackMessage }}
          </p>
          <p v-if="bulkPreviewDrawer.error" class="state error">{{ bulkPreviewDrawer.error }}</p>
          <div class="inline-actions">
            <button type="button" :disabled="!bulkConfirmation.canConfirm" @click="confirmBulkPreviewFromDrawer">
              Confirm {{ bulkPreviewDrawer.action === 'resolve' ? 'Resolve' : 'Ignore' }} Preview
            </button>
            <button type="button" class="link" @click="resetBulkSelectionSafe">
              Safe Reset Selection
            </button>
            <button type="button" class="link" @click="closeBulkPreviewDrawer">
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div v-if="remediationPlaybookComposerOpen" class="modal-backdrop" @click.self="closeRemediationPlaybookComposer">
        <div class="modal explainability-modal">
          <h3>Remediation Playbook Composer</h3>
          <p class="state">
            Keyboard: <code>Alt+A</code> focus anomaly board, <code>Alt+Shift+J/K</code> move anomalies, <code>Ctrl+Shift+P</code> open composer, <code>Ctrl+Shift+Enter</code> validate active playbook.
          </p>
          <div class="chip-row">
            <button
              v-for="row in anomalyTriageBoard.rows"
              :key="`playbook-anomaly-${row.id}`"
              type="button"
              class="preset-chip"
              :class="{ active: activeAnomalyTriageRowId === row.id }"
              @click="setActiveAnomalyTriageRow(row.id)"
            >
              {{ row.issueIdentifier }} / {{ row.category }}
            </button>
          </div>
          <form class="grid" @submit.prevent="validateActiveRemediationPlaybook">
            <label>
              Active anomaly
              <input :value="activeAnomalyTriageRow ? `${activeAnomalyTriageRow.issueIdentifier} / ${activeAnomalyTriageRow.fieldPath}` : '-'" disabled />
            </label>
            <label>
              Category
              <select v-model="remediationPlaybookDraft.category">
                <option value="missing">missing</option>
                <option value="stale">stale</option>
                <option value="malformed">malformed</option>
                <option value="dependency-gap">dependency-gap</option>
                <option value="blocker-drift">blocker-drift</option>
              </select>
            </label>
            <label :class="{ 'field-missing': isRemediationPlaybookFieldMissing('summary') }">
              Summary
              <textarea v-model="remediationPlaybookDraft.summary" rows="2" placeholder="Operator-facing remediation summary." />
            </label>
            <label :class="{ 'field-missing': isRemediationPlaybookFieldMissing('stagedActions') }">
              Staged Actions (one per line)
              <textarea v-model="remediationPlaybookDraft.stagedActionsText" rows="4" />
            </label>
            <label :class="{ 'field-missing': isRemediationPlaybookFieldMissing('owner') }">
              Owner
              <input
                ref="remediationPlaybookOwnerInputRef"
                v-model="remediationPlaybookDraft.owner"
                placeholder="Frontend Engineer / Ops"
              />
            </label>
            <label :class="{ 'field-missing': isRemediationPlaybookFieldMissing('eta') }">
              ETA
              <input v-model="remediationPlaybookDraft.eta" placeholder="2026-03-21T15:00:00.000Z" />
            </label>
            <label :class="{ 'field-missing': isRemediationPlaybookFieldMissing('dependencyIssueLinks') }">
              Dependency Issue Links (one per line)
              <textarea v-model="remediationPlaybookDraft.dependencyIssueLinksText" rows="3" placeholder="/ONE/issues/ONE-263" />
            </label>
            <label>
              Notes
              <textarea v-model="remediationPlaybookDraft.notes" rows="2" placeholder="Optional operator notes." />
            </label>
            <div class="inline-actions">
              <button type="submit">Validate Active Playbook</button>
              <button type="button" class="link" @click="saveRemediationPlaybookDraft">Save Draft</button>
              <button type="button" class="link" @click="clearRemediationPlaybookDraft(false)">Clear Draft Only</button>
              <button type="button" class="link" @click="clearRemediationPlaybookDraftWithConfirm">Full Reset</button>
              <button type="button" class="link" @click="closeRemediationPlaybookComposer">Close</button>
            </div>
          </form>
        </div>
      </div>

      <div v-if="explainabilityComposerOpen" class="modal-backdrop" @click.self="closeExplainabilityComposer(true)">
        <div class="modal explainability-modal">
          <h3>Explainability Preset Composer</h3>
          <p class="state">
            Slot shortcuts: <code>Alt+1..4</code> apply, <code>Alt+Shift+1..4</code> overwrite, <code>Esc</code> close safely.
          </p>
          <div class="chip-row">
            <button
              v-for="slot in explainabilityPresetSlots"
              :key="`composer-slot-${slot.slotIndex}`"
              type="button"
              class="preset-chip"
              :class="{ active: activeExplainabilitySlotIndex === slot.slotIndex }"
              @click="openExplainabilityComposer(slot.slotIndex)"
            >
              Slot {{ slot.slotIndex }}: {{ slot.name }}
            </button>
          </div>
          <form class="grid" @submit.prevent="overwriteExplainabilitySlot(activeExplainabilitySlotIndex)">
            <label>
              Slot name
              <input v-model="explainabilityDraft.name" maxlength="42" placeholder="Preset label" />
            </label>
            <label>
              Severity window
              <select v-model="explainabilityDraft.severityWindow">
                <option value="all">all</option>
                <option value="warning">warning</option>
                <option value="critical">critical</option>
              </select>
            </label>
            <label>
              Last saved
              <input
                :value="explainabilityPresetSlots.find((slot) => slot.slotIndex === activeExplainabilitySlotIndex)?.savedAt || '-'"
                disabled
              />
            </label>
            <fieldset class="composer-fieldset">
              <legend>Reason bucket toggles</legend>
              <label><input v-model="explainabilityDraft.reasonBuckets.stale_version" type="checkbox" /> stale_version</label>
              <label><input v-model="explainabilityDraft.reasonBuckets.malformed" type="checkbox" /> malformed</label>
              <label><input v-model="explainabilityDraft.reasonBuckets.high_delta" type="checkbox" /> high_delta</label>
              <label><input v-model="explainabilityDraft.reasonBuckets.mixed_status" type="checkbox" /> mixed_status</label>
            </fieldset>
            <div class="inline-actions">
              <button type="submit">Overwrite Slot {{ activeExplainabilitySlotIndex }}</button>
              <button type="button" class="link" @click="applyExplainabilitySlot(activeExplainabilitySlotIndex)">
                Apply Slot {{ activeExplainabilitySlotIndex }}
              </button>
              <button
                v-if="explainabilityPendingReplaceSlot"
                type="button"
                class="link"
                @click="confirmExplainabilityReplacement"
              >
                Confirm Replacement For Slot {{ explainabilityPendingReplaceSlot }}
              </button>
              <button type="button" class="link" @click="applyExplainabilityResetSafe">
                Reset Draft (Preserve Applied Chips)
              </button>
              <button type="button" class="link" @click="closeExplainabilityComposer(true)">
                Close
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Settlement Daily Summary</h2>
      <form class="grid" @submit.prevent="loadSettlementSummary">
        <label>
          Report date (UTC)
          <input v-model="settlementFilters.date" type="date" />
        </label>
        <label>
          Merchant filter
          <input v-model="settlementFilters.merchantId" placeholder="optional merchant id" />
        </label>
        <button :disabled="settlementState.loading" type="submit">
          {{ settlementState.loading ? 'Loading...' : 'Load Settlement Summary' }}
        </button>
      </form>

      <p class="state" :class="{ error: settlementState.error }">{{ settlementState.error || settlementState.message }}</p>

      <div class="kpi-row" v-if="settlementReport">
        <article>
          <h4>Report Date</h4>
          <p>{{ settlementReport.reportDate }}</p>
        </article>
        <article>
          <h4>Window Start</h4>
          <p>{{ new Date(settlementReport.windowStart).toLocaleString() }}</p>
        </article>
        <article>
          <h4>Mismatch Count</h4>
          <p>{{ settlementMismatches.length }}</p>
        </article>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Merchant</th>
              <th>Paid Deposit</th>
              <th>Paid Withdraw</th>
              <th>Refunded</th>
              <th>Net Settled</th>
              <th>Transactions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!settlementRows.length">
              <td colspan="6">No settlement summary rows.</td>
            </tr>
            <tr v-for="row in settlementRows" :key="row.merchantId">
              <td>{{ row.merchantId }}</td>
              <td>{{ row.paidDepositAmount.toFixed(2) }}</td>
              <td>{{ row.paidWithdrawAmount.toFixed(2) }}</td>
              <td>{{ row.refundedAmount.toFixed(2) }}</td>
              <td>{{ row.netSettledAmount.toFixed(2) }}</td>
              <td>{{ row.transactionCount }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Settlement Mismatches</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Merchant</th>
              <th>Status</th>
              <th>Reason</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!settlementMismatches.length">
              <td colspan="5">No mismatches in selected scope.</td>
            </tr>
            <tr v-for="row in settlementMismatches" :key="row.transactionId">
              <td>{{ row.transactionReference }}</td>
              <td>{{ row.merchantId }}</td>
              <td>{{ row.status }}</td>
              <td>{{ row.reason }}</td>
              <td>{{ fmtAmount(String(row.amount), row.currency) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <h2>Webhook Delivery Visibility</h2>
      <form class="grid" @submit.prevent="loadWebhookVisibility">
        <label>
          Merchant filter
          <input v-model="webhookFilters.merchantId" placeholder="optional merchant id" />
        </label>
        <label>
          Limit
          <input v-model.number="webhookFilters.limit" type="number" min="1" max="100" />
        </label>
        <button :disabled="webhookState.loading" type="submit">
          {{ webhookState.loading ? 'Loading...' : 'Load Delivery Logs' }}
        </button>
      </form>
      <div class="inline-actions">
        <button :disabled="webhookState.loading" type="button" @click="retryPendingWebhooks">
          {{ webhookState.loading ? 'Processing...' : 'Retry Pending Webhooks' }}
        </button>
      </div>

      <p class="state" :class="{ error: webhookState.error }">
        {{ webhookState.error || webhookState.message }}
      </p>
      <p v-if="webhookState.unsupported" class="state">Using fallback visibility: retry summary only.</p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Status</th>
              <th>Attempt</th>
              <th>Reference</th>
              <th>Next Retry</th>
              <th>Last Error</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!webhookRows.length">
              <td colspan="6">No webhook delivery rows available.</td>
            </tr>
            <tr v-for="row in webhookRows" :key="row.id">
              <td>{{ row.eventType }}</td>
              <td>{{ row.status }}</td>
              <td>{{ row.attemptCount }}/{{ row.maxAttempts }}</td>
              <td>{{ row.transaction?.reference || '-' }}</td>
              <td>{{ row.nextRetryAt ? new Date(row.nextRetryAt).toLocaleString() : '-' }}</td>
              <td>{{ row.lastError || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>
