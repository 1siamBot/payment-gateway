<script setup lang="ts">
import {
  applyExceptionQueryPreset,
  applyExceptionActionOptimistic,
  applyRefundStatus,
  buildExceptionActionIdempotencyKey,
  canRefundStatus,
  classifyExceptionActionFailure,
  DEFAULT_EXCEPTION_QUERY_STATE,
  filterSettlementMerchants,
  listExceptionQueryPresets,
  parseExceptionQueryState,
  normalizeExceptionStatus,
  normalizeOptional,
  prependExceptionAudit,
  resolveActiveExceptionPreset,
  serializeExceptionQueryState,
  validateExceptionActionInput,
} from '../utils/wave1';

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
const exceptionQueryRecovery = reactive({
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

function applyExceptionFixture(mode: ExceptionFixtureMode) {
  exceptionFixtureMode.value = mode;
  exceptionFixtureRetryCount.value = 0;
  exceptionState.loading = false;
  exceptionDetailState.loading = false;
  exceptionRows.value = [];
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

async function syncExceptionQueryToRoute(page = 1) {
  const queryState = buildExceptionQueryState(page);
  const exceptionQuery = serializeExceptionQueryState(queryState);
  if (exceptionFixtureMode.value !== 'api') {
    exceptionQuery.exceptionFixture = exceptionFixtureMode.value;
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
  clearExceptionQueryRecovery();
  void loadExceptions(1);
}

async function loadExceptions(page = 1) {
  resetState(exceptionState);
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
  const parsedQuery = parseExceptionQueryState(route.query as Record<string, unknown>);
  applyExceptionQueryState(parsedQuery.state);
  if (parsedQuery.recoveryReasons.length) {
    setExceptionQueryRecovery(
      `Invalid or expired query state detected. ${parsedQuery.recoveryReasons.join(' ')} Use reset to continue safely.`,
    );
  }

  const initialFixture = resolveInitialFixtureMode();
  if (initialFixture !== 'api') {
    applyExceptionFixture(initialFixture);
  }
  exceptionFixtureMode.value = initialFixture;
  void syncExceptionQueryToRoute(parsedQuery.state.page);
  void loadExceptions(parsedQuery.state.page);
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
      </div>

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

      <div class="triage-grid">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
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
                <td colspan="7">No settlement exceptions found.</td>
              </tr>
              <tr v-for="row in exceptionRows" :key="row.id">
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
