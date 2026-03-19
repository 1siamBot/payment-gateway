<script setup lang="ts">
import {
  buildReconciliationKpis,
  buildSectionViewState,
  describeMismatchReason,
  labelForMismatchCategory,
  mapReasonToMismatchCategory,
  nextRetryAttempt,
  normalizeMismatchCategory,
  resolveReconciliationDataSource,
  sortMismatchRowsDeterministic,
  type MismatchCategory,
  type MismatchRow,
  type MismatchSort,
  type MismatchSortKey,
  type ReconciliationDataMode,
} from '../utils/paymentReconciliationWorkspace';

const { request } = useGatewayApi();

type InternalRole = 'admin' | 'ops' | 'support';
type PaymentStatus = 'CREATED' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

type PaymentRow = {
  status: PaymentStatus;
};

type DailySummaryResponse = {
  summary?: {
    transactionCount?: number;
  };
};

type MismatchApiResponse = {
  mismatches?: Array<{
    mismatchDetailId?: string;
    transactionReference?: string;
    merchantId?: string;
    amount?: number;
    currency?: string;
    category?: string;
    reason?: string;
    status?: string;
  }>;
};

type MismatchDetailResponse = {
  mismatch?: {
    id?: string;
    category?: string;
    transactionReference?: string;
    merchantId?: string;
    reasonCode?: string;
    summary?: {
      mismatchCount?: number;
      normalizedFieldPaths?: string[];
      fallbackApplied?: boolean;
    };
    expected?: {
      source?: string;
      payload?: Record<string, unknown>;
    };
    actual?: {
      source?: string;
      payload?: Record<string, unknown>;
    };
    diffs?: Array<{
      path?: string;
      reasonCode?: string;
      expected?: string | number | boolean | null;
      actual?: string | number | boolean | null;
    }>;
  };
};

type NormalizedDiff = {
  path: string;
  reasonCode: string;
  expected: string | number | boolean | null;
  actual: string | number | boolean | null;
};

type NormalizedMismatchDetail = {
  id: string;
  category: MismatchCategory;
  transactionReference: string;
  merchantId: string;
  reasonCode: string;
  mismatchCount: number;
  normalizedFieldPaths: string[];
  fallbackApplied: boolean;
  expectedSource: string;
  actualSource: string;
  expectedPayload: Record<string, unknown>;
  actualPayload: Record<string, unknown>;
  diffs: NormalizedDiff[];
};

const auth = reactive({
  internalToken: '',
  actorRole: 'admin' as InternalRole,
});

const reportDate = ref(new Date().toISOString().slice(0, 10));
const selectedMode = ref<ReconciliationDataMode>('api');
const latestApiStatusCode = ref<number | undefined>(undefined);

const summaryState = reactive({ loading: false, error: '' });
const mismatchState = reactive({ loading: false, error: '' });
const detailState = reactive({ loading: false, error: '' });

const summaryRetryCount = ref(0);
const mismatchRetryCount = ref(0);
const detailRetryCount = ref(0);

const paymentRows = ref<PaymentRow[]>([]);
const totalVolumeCount = ref(0);
const mismatchRows = ref<MismatchRow[]>([]);
const selectedMismatch = ref<MismatchRow | null>(null);
const selectedDetail = ref<NormalizedMismatchDetail | null>(null);
const drawerOpen = ref(false);

const sort = reactive<MismatchSort>({
  key: 'transactionReference',
  direction: 'asc',
});

const fixturePayments: PaymentRow[] = [
  { status: 'PAID' },
  { status: 'PAID' },
  { status: 'FAILED' },
  { status: 'PENDING' },
  { status: 'PAID' },
  { status: 'FAILED' },
];

const fixtureSummaryTransactionCount = 6;

const fixtureMismatches: MismatchRow[] = [
  {
    mismatchDetailId: 'recon_mismatch_amount_001',
    transactionReference: 'pay_recon_1002',
    merchantId: 'merchant_beta',
    amount: 2000,
    currency: 'THB',
    category: 'amount',
    reason: 'amount_mismatch',
    status: 'INVESTIGATING',
  },
  {
    mismatchDetailId: 'recon_mismatch_currency_001',
    transactionReference: 'pay_recon_1005',
    merchantId: 'merchant_epsilon',
    amount: 1200,
    currency: 'THB',
    category: 'currency',
    reason: 'currency_mismatch',
    status: 'PENDING',
  },
  {
    mismatchDetailId: 'recon_mismatch_missing_event_001',
    transactionReference: 'pay_recon_1003',
    merchantId: 'merchant_gamma',
    amount: 880,
    currency: 'THB',
    category: 'missing-event',
    reason: 'missing_event',
    status: 'PENDING',
  },
  {
    mismatchDetailId: 'recon_mismatch_duplicate_event_001',
    transactionReference: 'pay_recon_1004',
    merchantId: 'merchant_delta',
    amount: 990,
    currency: 'THB',
    category: 'duplicate-event',
    reason: 'duplicate_event',
    status: 'INVESTIGATING',
  },
  {
    mismatchDetailId: 'recon_mismatch_stale_status_001',
    transactionReference: 'pay_recon_1006',
    merchantId: 'merchant_zeta',
    amount: 450,
    currency: 'THB',
    category: 'stale-status',
    reason: 'stale_status',
    status: 'CREATED',
  },
];

const fixtureDetailById: Record<string, NormalizedMismatchDetail> = {
  recon_mismatch_amount_001: {
    id: 'recon_mismatch_amount_001',
    category: 'amount',
    transactionReference: 'pay_recon_1002',
    merchantId: 'merchant_beta',
    reasonCode: 'RECON_AMOUNT_MISMATCH',
    mismatchCount: 1,
    normalizedFieldPaths: ['amount.value'],
    fallbackApplied: false,
    expectedSource: 'ledger',
    actualSource: 'provider',
    expectedPayload: {
      ledgerEventId: 'evt_ledger_1002',
      amount: { value: '2000.00', currency: 'THB' },
    },
    actualPayload: {
      providerEventId: 'evt_provider_1002',
      amount: { value: '1980.00', currency: 'THB' },
    },
    diffs: [{ path: 'amount.value', reasonCode: 'RECON_AMOUNT_MISMATCH', expected: '2000.00', actual: '1980.00' }],
  },
  recon_mismatch_currency_001: {
    id: 'recon_mismatch_currency_001',
    category: 'currency',
    transactionReference: 'pay_recon_1005',
    merchantId: 'merchant_epsilon',
    reasonCode: 'RECON_CURRENCY_MISMATCH',
    mismatchCount: 1,
    normalizedFieldPaths: ['amount.currency'],
    fallbackApplied: false,
    expectedSource: 'ledger',
    actualSource: 'provider',
    expectedPayload: {
      ledgerEventId: 'evt_ledger_1005',
      amount: { value: '1200.00', currency: 'THB' },
    },
    actualPayload: {
      providerEventId: 'evt_provider_1005',
      amount: { value: '1200.00', currency: 'USD' },
    },
    diffs: [{ path: 'amount.currency', reasonCode: 'RECON_CURRENCY_MISMATCH', expected: 'THB', actual: 'USD' }],
  },
  recon_mismatch_missing_event_001: {
    id: 'recon_mismatch_missing_event_001',
    category: 'missing-event',
    transactionReference: 'pay_recon_1003',
    merchantId: 'merchant_gamma',
    reasonCode: 'RECON_MISSING_EVENT',
    mismatchCount: 1,
    normalizedFieldPaths: ['events.capture.succeeded'],
    fallbackApplied: false,
    expectedSource: 'ledger',
    actualSource: 'provider',
    expectedPayload: {
      expectedEventType: 'capture.succeeded',
      expectedEventId: 'evt_capture_1003',
    },
    actualPayload: {
      observedEvents: ['authorization.succeeded'],
    },
    diffs: [{ path: 'events.capture.succeeded', reasonCode: 'RECON_MISSING_EVENT', expected: 'present', actual: null }],
  },
  recon_mismatch_duplicate_event_001: {
    id: 'recon_mismatch_duplicate_event_001',
    category: 'duplicate-event',
    transactionReference: 'pay_recon_1004',
    merchantId: 'merchant_delta',
    reasonCode: 'RECON_DUPLICATE_EVENT',
    mismatchCount: 1,
    normalizedFieldPaths: ['events.capture.succeeded.count'],
    fallbackApplied: false,
    expectedSource: 'ledger',
    actualSource: 'provider',
    expectedPayload: {
      expectedOccurrences: 1,
      eventType: 'capture.succeeded',
    },
    actualPayload: {
      observedOccurrences: 3,
      eventIds: ['evt_cap_1', 'evt_cap_2', 'evt_cap_3'],
    },
    diffs: [{ path: 'events.capture.succeeded.count', reasonCode: 'RECON_DUPLICATE_EVENT', expected: 1, actual: 3 }],
  },
  recon_mismatch_stale_status_001: {
    id: 'recon_mismatch_stale_status_001',
    category: 'stale-status',
    transactionReference: 'pay_recon_1006',
    merchantId: 'merchant_zeta',
    reasonCode: 'RECON_STALE_STATUS',
    mismatchCount: 2,
    normalizedFieldPaths: ['status.current', 'status.updatedAt'],
    fallbackApplied: false,
    expectedSource: 'ledger',
    actualSource: 'provider',
    expectedPayload: {
      ledgerStatus: 'paid',
      expectedUpdatedAt: '2026-03-19T12:35:00.000Z',
    },
    actualPayload: {
      providerStatus: 'authorized',
      providerUpdatedAt: '2026-03-19T11:30:00.000Z',
    },
    diffs: [
      { path: 'status.current', reasonCode: 'RECON_STALE_STATUS', expected: 'paid', actual: 'authorized' },
      {
        path: 'status.updatedAt',
        reasonCode: 'RECON_STALE_STATUS',
        expected: '2026-03-19T12:35:00.000Z',
        actual: '2026-03-19T11:30:00.000Z',
      },
    ],
  },
};

const detailFixtureIdByCategory: Record<MismatchCategory, string> = {
  amount: 'recon_mismatch_amount_001',
  currency: 'recon_mismatch_currency_001',
  'missing-event': 'recon_mismatch_missing_event_001',
  'duplicate-event': 'recon_mismatch_duplicate_event_001',
  'stale-status': 'recon_mismatch_stale_status_001',
};

const sortedMismatchRows = computed(() => sortMismatchRowsDeterministic(mismatchRows.value, sort));

const kpiCards = computed(() => buildReconciliationKpis({
  totalVolume: totalVolumeCount.value,
  successCount: paymentRows.value.filter((row) => row.status === 'PAID').length,
  failCount: paymentRows.value.filter((row) => row.status === 'FAILED').length,
  pendingAnomalies: mismatchRows.value.filter((row) => row.status === 'CREATED' || row.status === 'PENDING').length,
}));

const summaryViewState = computed(() => buildSectionViewState({
  loading: summaryState.loading,
  error: summaryState.error,
  itemCount: kpiCards.value.length,
  loadingMessage: 'Loading reconciliation summary cards...',
  emptyMessage: 'No summary metrics available for this date/mode.',
  readyMessage: `Summary cards loaded in deterministic order. Retry count: ${summaryRetryCount.value}.`,
}));

const mismatchViewState = computed(() => buildSectionViewState({
  loading: mismatchState.loading,
  error: mismatchState.error,
  itemCount: mismatchRows.value.length,
  loadingMessage: 'Loading mismatch drilldown rows...',
  emptyMessage: 'No mismatch rows for this date/filter.',
  readyMessage: `${mismatchRows.value.length} mismatch row(s) loaded. Retry count: ${mismatchRetryCount.value}.`,
}));

const detailViewState = computed(() => buildSectionViewState({
  loading: detailState.loading,
  error: detailState.error,
  itemCount: selectedDetail.value ? 1 : 0,
  loadingMessage: selectedMismatch.value
    ? `Loading mismatch detail for ${selectedMismatch.value.transactionReference}...`
    : 'Loading mismatch detail...',
  emptyMessage: selectedMismatch.value
    ? `No mismatch detail available for ${selectedMismatch.value.transactionReference}.`
    : 'Select a mismatch row to open detail.',
  readyMessage: selectedDetail.value
    ? `Mismatch detail loaded for ${selectedDetail.value.transactionReference}. Retry count: ${detailRetryCount.value}.`
    : 'Select a mismatch row to open detail.',
}));

function authHeaders() {
  return {
    'x-internal-token': auth.internalToken.trim(),
    'x-actor-role': auth.actorRole,
  };
}

function hasAuth() {
  return Boolean(auth.internalToken.trim());
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatAmount(amount: number, currency: string) {
  return `${formatNumber(amount)} ${currency}`;
}

function formatDiffValue(value: string | number | boolean | null) {
  return value === null ? 'null' : String(value);
}

function prettyPayload(payload: Record<string, unknown>) {
  return JSON.stringify(payload, null, 2);
}

function statusBadgeClass(status: string) {
  if (status === 'PAID' || status === 'RESOLVED') return 'status-pill ok';
  if (status === 'FAILED') return 'status-pill danger';
  if (status === 'PENDING' || status === 'CREATED' || status === 'INVESTIGATING') return 'status-pill warn';
  return 'status-pill';
}

function categoryBadgeClass(category: MismatchCategory) {
  if (category === 'amount') return 'category-pill danger';
  if (category === 'currency') return 'category-pill warn';
  if (category === 'missing-event') return 'category-pill danger';
  if (category === 'duplicate-event') return 'category-pill warn';
  return 'category-pill neutral';
}

function kpiToneClass(tone: 'neutral' | 'ok' | 'danger' | 'warn') {
  if (tone === 'ok') return 'state-healthy';
  if (tone === 'danger') return 'state-critical';
  if (tone === 'warn') return 'state-degraded';
  return 'state-unknown';
}

function toggleSort(key: MismatchSortKey) {
  if (sort.key === key) {
    sort.direction = sort.direction === 'asc' ? 'desc' : 'asc';
    return;
  }
  sort.key = key;
  sort.direction = 'asc';
}

function sortButtonLabel(key: MismatchSortKey, label: string) {
  if (sort.key !== key) {
    return `${label} ↕`;
  }
  return `${label} ${sort.direction === 'asc' ? '↑' : '↓'}`;
}

function resetSummaryData() {
  paymentRows.value = [];
  totalVolumeCount.value = 0;
}

function applyFixtureSummary(mode: ReconciliationDataMode) {
  if (mode === 'fixture_empty') {
    resetSummaryData();
    return;
  }
  paymentRows.value = fixturePayments;
  totalVolumeCount.value = fixtureSummaryTransactionCount;
}

function applyFixtureMismatches(mode: ReconciliationDataMode) {
  mismatchRows.value = mode === 'fixture_empty' ? [] : fixtureMismatches;
}

function resolveMismatchDetailId(row: MismatchRow): string {
  return row.mismatchDetailId || detailFixtureIdByCategory[row.category];
}

function normalizeDetailResponse(input: MismatchDetailResponse, fallbackId: string): NormalizedMismatchDetail {
  const mismatch = input.mismatch || {};
  const diffs = Array.isArray(mismatch.diffs) ? mismatch.diffs : [];

  return {
    id: String(mismatch.id || fallbackId),
    category: normalizeMismatchCategory(mismatch.category),
    transactionReference: String(mismatch.transactionReference || selectedMismatch.value?.transactionReference || '-'),
    merchantId: String(mismatch.merchantId || selectedMismatch.value?.merchantId || '-'),
    reasonCode: String(mismatch.reasonCode || 'RECON_MISMATCH_UNSPECIFIED'),
    mismatchCount: Number(mismatch.summary?.mismatchCount ?? diffs.length),
    normalizedFieldPaths: Array.isArray(mismatch.summary?.normalizedFieldPaths)
      ? mismatch.summary?.normalizedFieldPaths.map((path) => String(path))
      : diffs.map((diff) => String(diff.path || 'payload')),
    fallbackApplied: Boolean(mismatch.summary?.fallbackApplied),
    expectedSource: String(mismatch.expected?.source || 'ledger'),
    actualSource: String(mismatch.actual?.source || 'provider'),
    expectedPayload: typeof mismatch.expected?.payload === 'object' && mismatch.expected?.payload
      ? mismatch.expected.payload
      : {},
    actualPayload: typeof mismatch.actual?.payload === 'object' && mismatch.actual?.payload
      ? mismatch.actual.payload
      : {},
    diffs: diffs.map((diff) => ({
      path: String(diff.path || 'payload'),
      reasonCode: String(diff.reasonCode || 'RECON_MISMATCH_UNSPECIFIED'),
      expected: diff.expected ?? null,
      actual: diff.actual ?? null,
    })),
  };
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadSummarySection() {
  summaryState.loading = true;
  summaryState.error = '';

  try {
    if (selectedMode.value === 'fixture_loading') {
      await wait(650);
      resetSummaryData();
      return;
    }
    if (selectedMode.value === 'fixture_error') {
      throw new Error('Fixture mode: simulated summary fetch failure.');
    }
    const source = resolveReconciliationDataSource({
      mode: selectedMode.value,
      latestApiStatusCode: latestApiStatusCode.value,
    });
    if (source === 'fixture') {
      applyFixtureSummary(selectedMode.value);
      return;
    }

    if (!hasAuth()) {
      throw new Error('Internal auth token is required in API mode.');
    }

    const dateParam = encodeURIComponent(reportDate.value);
    const [summary, payments] = await Promise.all([
      request<DailySummaryResponse>(`/settlements/daily-summary?date=${dateParam}`, { headers: authHeaders() }),
      request<PaymentRow[]>('/payments?take=300', { headers: authHeaders() }),
    ]);

    totalVolumeCount.value = Number(summary?.summary?.transactionCount ?? 0);
    paymentRows.value = Array.isArray(payments) ? payments : [];
    latestApiStatusCode.value = undefined;
  } catch (error: any) {
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : undefined;
    latestApiStatusCode.value = statusCode;
    if (resolveReconciliationDataSource({ mode: selectedMode.value, latestApiStatusCode: statusCode }) === 'fixture') {
      applyFixtureSummary('fixture_success');
      summaryState.error = '';
    } else {
      resetSummaryData();
      summaryState.error = error?.message || 'Unable to load reconciliation summary.';
    }
  } finally {
    summaryState.loading = false;
  }
}

async function loadMismatchSection() {
  mismatchState.loading = true;
  mismatchState.error = '';

  try {
    if (selectedMode.value === 'fixture_loading') {
      await wait(700);
      mismatchRows.value = [];
      return;
    }
    if (selectedMode.value === 'fixture_error') {
      throw new Error('Fixture mode: simulated mismatch fetch failure.');
    }

    const source = resolveReconciliationDataSource({
      mode: selectedMode.value,
      latestApiStatusCode: latestApiStatusCode.value,
    });
    if (source === 'fixture') {
      applyFixtureMismatches(selectedMode.value);
      return;
    }

    if (!hasAuth()) {
      throw new Error('Internal auth token is required in API mode.');
    }

    const dateParam = encodeURIComponent(reportDate.value);
    const response = await request<MismatchApiResponse>(
      `/settlements/reconciliation/mismatches?date=${dateParam}`,
      { headers: authHeaders() },
    );

    mismatchRows.value = Array.isArray(response?.mismatches)
      ? response.mismatches.map((row) => ({
        mismatchDetailId: row.mismatchDetailId ? String(row.mismatchDetailId) : undefined,
        transactionReference: String(row.transactionReference || ''),
        merchantId: String(row.merchantId || ''),
        amount: Number(row.amount || 0),
        currency: String(row.currency || 'THB'),
        category: normalizeMismatchCategory(row.category || mapReasonToMismatchCategory(String(row.reason || ''))),
        reason: String(row.reason || ''),
        status: String(row.status || 'UNKNOWN'),
      }))
      : [];

    latestApiStatusCode.value = undefined;
  } catch (error: any) {
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : undefined;
    latestApiStatusCode.value = statusCode;
    if (resolveReconciliationDataSource({ mode: selectedMode.value, latestApiStatusCode: statusCode }) === 'fixture') {
      applyFixtureMismatches('fixture_success');
      mismatchState.error = '';
    } else {
      mismatchRows.value = [];
      mismatchState.error = error?.message || 'Unable to load mismatch drilldown.';
    }
  } finally {
    mismatchState.loading = false;
  }
}

async function loadMismatchDetail(row: MismatchRow) {
  detailState.loading = true;
  detailState.error = '';
  selectedDetail.value = null;

  const mismatchDetailId = resolveMismatchDetailId(row);

  try {
    if (selectedMode.value === 'fixture_loading') {
      await wait(550);
      return;
    }
    if (selectedMode.value === 'fixture_error') {
      throw new Error('Fixture mode: simulated mismatch detail fetch failure.');
    }
    if (selectedMode.value === 'fixture_empty') {
      return;
    }

    const source = resolveReconciliationDataSource({
      mode: selectedMode.value,
      latestApiStatusCode: latestApiStatusCode.value,
    });

    if (source === 'fixture') {
      selectedDetail.value = fixtureDetailById[mismatchDetailId] || null;
      return;
    }

    if (!hasAuth()) {
      throw new Error('Internal auth token is required in API mode.');
    }

    const response = await request<MismatchDetailResponse>(
      `/settlements/reconciliation/mismatch-details/${encodeURIComponent(mismatchDetailId)}`,
      { headers: authHeaders() },
    );

    selectedDetail.value = normalizeDetailResponse(response, mismatchDetailId);
    latestApiStatusCode.value = undefined;
  } catch (error: any) {
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : undefined;
    latestApiStatusCode.value = statusCode;
    if (resolveReconciliationDataSource({ mode: selectedMode.value, latestApiStatusCode: statusCode }) === 'fixture') {
      selectedDetail.value = fixtureDetailById[mismatchDetailId] || null;
      detailState.error = '';
    } else {
      selectedDetail.value = null;
      detailState.error = error?.message || 'Unable to load mismatch detail.';
    }
  } finally {
    detailState.loading = false;
  }
}

async function loadWorkspace() {
  await Promise.all([loadSummarySection(), loadMismatchSection()]);
  if (drawerOpen.value && selectedMismatch.value) {
    await loadMismatchDetail(selectedMismatch.value);
  }
}

async function retrySummary() {
  summaryRetryCount.value = nextRetryAttempt(summaryRetryCount.value);
  await loadSummarySection();
}

async function retryMismatches() {
  mismatchRetryCount.value = nextRetryAttempt(mismatchRetryCount.value);
  await loadMismatchSection();
}

async function retryMismatchDetail() {
  if (!selectedMismatch.value) {
    return;
  }
  detailRetryCount.value = nextRetryAttempt(detailRetryCount.value);
  await loadMismatchDetail(selectedMismatch.value);
}

async function openMismatchDetail(row: MismatchRow) {
  selectedMismatch.value = row;
  drawerOpen.value = true;
  await loadMismatchDetail(row);
}

function closeMismatchDetail() {
  drawerOpen.value = false;
}

onMounted(() => {
  void loadWorkspace();
});
</script>

<template>
  <main class="page reconciliation-page">
    <section class="hero">
      <h1>Payment Reconciliation Workspace</h1>
      <p>Daily KPI summary with deterministic mismatch drilldown for operations and finance triage.</p>
      <div class="inline-actions">
        <NuxtLink class="button-link" to="/">Open Legacy Control Tower</NuxtLink>
        <NuxtLink class="button-link" to="/payment-operations-dashboard">Open Payment Operations Dashboard</NuxtLink>
        <NuxtLink class="button-link" to="/settlement-exceptions-inbox">Open Settlement Exceptions Inbox</NuxtLink>
        <NuxtLink class="button-link" to="/merchant-balance-anomaly-console">Open Merchant Balance Anomaly Console</NuxtLink>
        <NuxtLink class="button-link" to="/provider-failover-insights">Open Provider Failover Insights</NuxtLink>
        <NuxtLink class="button-link" to="/merchant-operations">Open Merchant Operations Panel</NuxtLink>
      </div>
    </section>

    <section class="card">
      <h2>Workspace Controls</h2>
      <form class="grid" @submit.prevent="loadWorkspace">
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
        <label>
          Date
          <input v-model="reportDate" type="date" />
        </label>
        <label>
          Data mode
          <select v-model="selectedMode">
            <option value="api">api</option>
            <option value="fixture_success">fixture_success</option>
            <option value="fixture_loading">fixture_loading</option>
            <option value="fixture_empty">fixture_empty</option>
            <option value="fixture_error">fixture_error</option>
          </select>
        </label>
        <button type="submit" :disabled="summaryState.loading || mismatchState.loading || detailState.loading">
          {{ summaryState.loading || mismatchState.loading || detailState.loading ? 'Refreshing...' : 'Refresh Workspace' }}
        </button>
      </form>
    </section>

    <section class="card">
      <h2>Summary KPIs</h2>
      <p class="state" :class="{ error: summaryViewState.key === 'error' }" data-testid="recon-summary-state">{{ summaryViewState.message }}</p>
      <div v-if="summaryViewState.showRetry" class="inline-actions compact">
        <button type="button" @click="retrySummary">Retry Summary Fetch</button>
      </div>
      <div class="kpi-row">
        <article v-for="kpi in kpiCards" :key="kpi.key">
          <strong>{{ kpi.label }}</strong>
          <p :class="kpiToneClass(kpi.tone)">{{ formatNumber(kpi.value) }}</p>
        </article>
      </div>
    </section>

    <section class="card">
      <h2>Mismatch Drilldown</h2>
      <p class="state" :class="{ error: mismatchViewState.key === 'error' }" data-testid="recon-mismatch-state">{{ mismatchViewState.message }}</p>
      <div v-if="mismatchViewState.showRetry" class="inline-actions compact">
        <button type="button" @click="retryMismatches">Retry Drilldown Fetch</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                <button type="button" class="table-sort" @click="toggleSort('transactionReference')">
                  {{ sortButtonLabel('transactionReference', 'Reference') }}
                </button>
              </th>
              <th>
                <button type="button" class="table-sort" @click="toggleSort('merchantId')">
                  {{ sortButtonLabel('merchantId', 'Merchant') }}
                </button>
              </th>
              <th>
                <button type="button" class="table-sort" @click="toggleSort('amount')">
                  {{ sortButtonLabel('amount', 'Amount') }}
                </button>
              </th>
              <th>
                <button type="button" class="table-sort" @click="toggleSort('reason')">
                  {{ sortButtonLabel('reason', 'Mismatch Type') }}
                </button>
              </th>
              <th>
                <button type="button" class="table-sort" @click="toggleSort('status')">
                  {{ sortButtonLabel('status', 'Status') }}
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="mismatchViewState.key !== 'ready'">
              <td colspan="6">{{ mismatchViewState.message }}</td>
            </tr>
            <tr
              v-for="row in sortedMismatchRows"
              :key="row.transactionReference"
              :class="{ 'active-mismatch-row': selectedMismatch?.transactionReference === row.transactionReference }"
            >
              <td><code>{{ row.transactionReference }}</code></td>
              <td>{{ row.merchantId }}</td>
              <td>{{ formatAmount(row.amount, row.currency) }}</td>
              <td>
                <div class="mismatch-type-cell">
                  <span :class="categoryBadgeClass(row.category)">{{ labelForMismatchCategory(row.category) }}</span>
                  <span>{{ describeMismatchReason(row.reason) }}</span>
                </div>
              </td>
              <td><span :class="statusBadgeClass(row.status)">{{ row.status }}</span></td>
              <td>
                <button
                  type="button"
                  class="link"
                  :disabled="detailState.loading"
                  @click="openMismatchDetail(row)"
                >
                  {{ detailState.loading && selectedMismatch?.transactionReference === row.transactionReference ? 'Opening...' : 'Open Detail' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="drawerOpen" class="drawer-shell" data-testid="mismatch-detail-drawer" @click.self="closeMismatchDetail">
      <aside class="mismatch-drawer">
        <header class="drawer-header">
          <div>
            <h2>Mismatch Detail Drawer</h2>
            <p v-if="selectedMismatch" class="state">Reference: {{ selectedMismatch.transactionReference }}</p>
          </div>
          <button type="button" class="link" @click="closeMismatchDetail">Close</button>
        </header>

        <p class="state" :class="{ error: detailViewState.key === 'error' }">{{ detailViewState.message }}</p>

        <div v-if="detailViewState.key === 'error'" class="inline-actions compact">
          <button type="button" @click="retryMismatchDetail">Retry Detail Fetch</button>
        </div>

        <p v-if="detailViewState.key === 'loading'" data-testid="mismatch-detail-loading-state">Loading deterministic event diff...</p>
        <p v-else-if="detailViewState.key === 'empty'" data-testid="mismatch-detail-empty-state">No event diff available for this mismatch selection.</p>

        <div v-if="selectedDetail && detailViewState.key === 'ready'" class="drawer-content" data-testid="mismatch-detail-ready-state">
          <div class="drawer-summary-grid">
            <article>
              <strong>Mismatch Category</strong>
              <p><span :class="categoryBadgeClass(selectedDetail.category)">{{ labelForMismatchCategory(selectedDetail.category) }}</span></p>
            </article>
            <article>
              <strong>Reason Code</strong>
              <p><code>{{ selectedDetail.reasonCode }}</code></p>
            </article>
            <article>
              <strong>Normalized Paths</strong>
              <p><code>{{ selectedDetail.normalizedFieldPaths.join(', ') }}</code></p>
            </article>
            <article>
              <strong>Fallback Applied</strong>
              <p>{{ selectedDetail.fallbackApplied ? 'true' : 'false' }}</p>
            </article>
          </div>

          <div class="payload-grid">
            <article class="card payload-card" data-testid="mismatch-expected-payload">
              <h3>Expected Event Payload ({{ selectedDetail.expectedSource }})</h3>
              <pre>{{ prettyPayload(selectedDetail.expectedPayload) }}</pre>
            </article>
            <article class="card payload-card" data-testid="mismatch-actual-payload">
              <h3>Actual Event Payload ({{ selectedDetail.actualSource }})</h3>
              <pre>{{ prettyPayload(selectedDetail.actualPayload) }}</pre>
            </article>
          </div>

          <section class="card">
            <h3>Deterministic Event Diff</h3>
            <div class="table-wrap">
              <table data-testid="mismatch-diff-table">
                <thead>
                  <tr>
                    <th>Path</th>
                    <th>Reason Code</th>
                    <th>Expected</th>
                    <th>Actual</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="diff in selectedDetail.diffs" :key="`${selectedDetail.id}:${diff.path}:${diff.reasonCode}`">
                    <td><code>{{ diff.path }}</code></td>
                    <td><code>{{ diff.reasonCode }}</code></td>
                    <td><code>{{ formatDiffValue(diff.expected) }}</code></td>
                    <td><code>{{ formatDiffValue(diff.actual) }}</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.mismatch-type-cell {
  display: grid;
  gap: 0.35rem;
}

.active-mismatch-row {
  background: #f8fbfe;
}

.drawer-shell {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(15, 23, 42, 0.3);
  display: flex;
  justify-content: flex-end;
}

.mismatch-drawer {
  width: min(860px, 100%);
  height: 100%;
  overflow: auto;
  background: #ffffff;
  border-left: 1px solid #d0d8e2;
  padding: 1rem;
  display: grid;
  gap: 0.85rem;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.8rem;
}

.drawer-summary-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.drawer-summary-grid article {
  border: 1px solid #d0d8e2;
  border-radius: 10px;
  padding: 0.7rem;
  background: #f8fafc;
}

.drawer-summary-grid p {
  margin: 0.3rem 0 0;
}

.payload-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.payload-card {
  margin: 0;
  padding: 0.75rem;
}

.payload-card h3 {
  margin-bottom: 0.5rem;
}

.payload-card pre {
  margin: 0;
  border: 1px solid #d0d8e2;
  border-radius: 10px;
  background: #0f172a;
  color: #f8fafc;
  font-size: 0.78rem;
  line-height: 1.45;
  padding: 0.7rem;
  overflow: auto;
  min-height: 180px;
}

.category-pill {
  display: inline-flex;
  width: fit-content;
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 0.2rem 0.5rem;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
}

.category-pill.neutral {
  background: #e2e8f0;
  color: #334155;
}

.category-pill.warn {
  background: #ffedd5;
  color: #9a3412;
}

.category-pill.danger {
  background: #fee2e2;
  color: #991b1b;
}

@media (max-width: 760px) {
  .mismatch-drawer {
    width: 100%;
  }

  .payload-grid {
    grid-template-columns: 1fr;
  }
}
</style>
