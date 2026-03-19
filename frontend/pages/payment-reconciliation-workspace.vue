<script setup lang="ts">
import {
  buildReconciliationKpis,
  buildSectionViewState,
  describeMismatchReason,
  nextRetryAttempt,
  resolveReconciliationDataSource,
  sortMismatchRowsDeterministic,
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
    transactionReference?: string;
    merchantId?: string;
    amount?: number;
    currency?: string;
    reason?: string;
    status?: string;
  }>;
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

const summaryRetryCount = ref(0);
const mismatchRetryCount = ref(0);

const paymentRows = ref<PaymentRow[]>([]);
const totalVolumeCount = ref(0);
const mismatchRows = ref<MismatchRow[]>([]);

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
    transactionReference: 'pay_rec_2003',
    merchantId: 'mrc_fixture_beta',
    amount: 380,
    currency: 'THB',
    reason: 'stuck_non_terminal',
    status: 'PENDING',
  },
  {
    transactionReference: 'pay_rec_1001',
    merchantId: 'mrc_fixture_alpha',
    amount: 1250,
    currency: 'THB',
    reason: 'paid_without_success_callback',
    status: 'PAID',
  },
  {
    transactionReference: 'pay_rec_1019',
    merchantId: 'mrc_fixture_alpha',
    amount: 1250,
    currency: 'THB',
    reason: 'failed_with_success_callback',
    status: 'FAILED',
  },
];

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

function statusBadgeClass(status: string) {
  if (status === 'PAID' || status === 'RESOLVED') return 'status-pill ok';
  if (status === 'FAILED') return 'status-pill danger';
  if (status === 'PENDING' || status === 'CREATED' || status === 'INVESTIGATING') return 'status-pill warn';
  return 'status-pill';
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
        transactionReference: String(row.transactionReference || ''),
        merchantId: String(row.merchantId || ''),
        amount: Number(row.amount || 0),
        currency: String(row.currency || 'THB'),
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

async function loadWorkspace() {
  await Promise.all([loadSummarySection(), loadMismatchSection()]);
}

async function retrySummary() {
  summaryRetryCount.value = nextRetryAttempt(summaryRetryCount.value);
  await loadSummarySection();
}

async function retryMismatches() {
  mismatchRetryCount.value = nextRetryAttempt(mismatchRetryCount.value);
  await loadMismatchSection();
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
        <button type="submit" :disabled="summaryState.loading || mismatchState.loading">
          {{ summaryState.loading || mismatchState.loading ? 'Refreshing...' : 'Refresh Workspace' }}
        </button>
      </form>
    </section>

    <section class="card">
      <h2>Summary KPIs</h2>
      <p class="state" :class="{ error: summaryViewState.key === 'error' }">{{ summaryViewState.message }}</p>
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
      <p class="state" :class="{ error: mismatchViewState.key === 'error' }">{{ mismatchViewState.message }}</p>
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
            </tr>
          </thead>
          <tbody>
            <tr v-if="mismatchViewState.key !== 'ready'">
              <td colspan="5">{{ mismatchViewState.message }}</td>
            </tr>
            <tr v-for="row in sortedMismatchRows" :key="row.transactionReference">
              <td><code>{{ row.transactionReference }}</code></td>
              <td>{{ row.merchantId }}</td>
              <td>{{ formatAmount(row.amount, row.currency) }}</td>
              <td>{{ describeMismatchReason(row.reason) }}</td>
              <td><span :class="statusBadgeClass(row.status)">{{ row.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>
