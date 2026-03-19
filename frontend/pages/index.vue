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
  resolveReplayDiffInspectorShortcut,
  resolveEvidenceTimelineHeatmapShortcut,
  resetOperatorDecisionQueueDraftSafe,
  resetReviewQueueHandoffPacketDraftSafe,
  resetEvidenceGapChecklistDraftSafe,
  swapReplayBookmarkCompareSlots,
  validateExceptionActionInput,
  validateEvidenceGapChecklistDraft,
  buildEvidenceTimelineHeatmap,
  buildChecklistAutofixHints,
  moveEvidenceTimelineHeatmapSelection,
  getDefaultEvidenceGapChecklistDraft,
  buildReviewQueueLedger,
  filterReviewQueueLedgerRows,
  moveReviewQueueLedgerSelection,
  moveReplayDiffInspectorSelection,
  filterReplayDiffInspectorRows,
  buildReplayDiffInspector,
  buildReviewQueueHandoffPacketDraftFromLedgerRow,
  validateReviewQueueHandoffPacketDraft,
} from '../utils/wave1';
import type { ExceptionConflictDrilldownKey } from '../utils/wave1';
import type { ExceptionSimulationReasonDrilldownKey } from '../utils/wave1';
import type { ScenarioCompareMatrixFilterKey } from '../utils/wave1';
import type { ExplainabilityComposerDraft, ExplainabilityPresetSlot } from '../utils/wave1';
import type { IncidentBookmarkFilterKey } from '../utils/wave1';
import type { OperatorTimelinePresetKey } from '../utils/wave1';
import type { ReviewQueueLedgerFilterKey } from '../utils/wave1';
import type { ReplayDiffInspectorFilterKey } from '../utils/wave1';

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
const activeReviewQueueFilter = ref<ReviewQueueLedgerFilterKey>('all');
const activeReviewQueueRowId = ref('');
const activeEvidenceTimelineLane = ref<ReviewQueueLedgerFilterKey>('all');
const activeEvidenceTimelineRowId = ref('');
const reviewQueueHandoffDraft = ref(buildReviewQueueHandoffPacketDraftFromLedgerRow({ activeRow: null }));
const reviewQueueHandoffValidation = reactive({
  message: '',
  error: '',
});
const reviewQueueHandoffMissingFields = ref<Set<string>>(new Set());
const reviewQueueHandoffPanelRef = ref<HTMLElement | null>(null);
const reviewQueueHandoffBranchInputRef = ref<HTMLInputElement | null>(null);
const evidenceTimelineHeatmapPanelRef = ref<HTMLElement | null>(null);
const queueDraftRowIds = ref<string[]>([]);
const activeDecisionQueueItemId = ref('');
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
});
onBeforeUnmount(() => {
  if (!import.meta.client) return;
  window.removeEventListener('keydown', onExplainabilityComposerKeydown);
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

function resetReviewQueueHandoffValidation() {
  reviewQueueHandoffValidation.message = '';
  reviewQueueHandoffValidation.error = '';
  reviewQueueHandoffMissingFields.value = new Set();
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

watch(evidenceTimelineHeatmap, (heatmap) => {
  if (!heatmap.rows.length) {
    activeEvidenceTimelineRowId.value = '';
    return;
  }
  if (!heatmap.rows.some((row) => row.id === activeEvidenceTimelineRowId.value)) {
    activeEvidenceTimelineRowId.value = heatmap.activeRowId;
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
  resetTimelineScrubberState();
  queueDraftRowIds.value = [];
  activeScenarioMatrixFilter.value = 'all';
  activeReviewQueueFilter.value = 'all';
  activeReviewQueueRowId.value = '';
  activeEvidenceTimelineLane.value = 'all';
  activeEvidenceTimelineRowId.value = '';
  reviewQueueHandoffDraft.value = buildReviewQueueHandoffPacketDraftFromLedgerRow({ activeRow: null });

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
