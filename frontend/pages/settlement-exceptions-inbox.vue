<script setup lang="ts">
import {
  applyActionQueueTransition,
  buildSettlementExceptionsViewState,
  deriveSettlementExceptionSeverity,
  filterExceptions,
  nextRetryCount,
  resolveSettlementExceptionsDataSource,
  sortExceptionsDeterministic,
  type SettlementExceptionInboxFilters,
  type SettlementExceptionInboxRow,
  type SettlementExceptionQueueState,
  type SettlementExceptionStatus,
  type SettlementExceptionsInboxMode,
} from '../utils/settlementExceptionsInbox';

const { request } = useGatewayApi();

type ActorRole = 'admin' | 'ops';

type ExceptionListResponse = {
  data?: Array<{
    id?: string;
    merchantId?: string;
    providerName?: string;
    status?: string;
    openedReason?: string;
    deltaAmount?: number;
    windowDate?: string;
    createdAt?: string;
    updatedAt?: string;
    version?: number;
  }>;
};

type ExceptionDetailResponse = {
  id?: string;
  merchantId?: string;
  providerName?: string;
  status?: string;
  openedReason?: string;
  deltaAmount?: number;
  windowDate?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  audits?: Array<{ id?: string; reason?: string; actor?: string; createdAt?: string }>;
};

const auth = reactive({
  internalToken: '',
  actorRole: 'ops' as ActorRole,
});

const mode = ref<SettlementExceptionsInboxMode>('api');
const latestApiStatusCode = ref<number | undefined>(undefined);
const retryCount = ref(0);

const filters = reactive<SettlementExceptionInboxFilters>({
  status: 'ALL',
  merchantId: '',
  dateFrom: '',
  dateTo: '',
});

const listState = reactive({ loading: false, error: '' });
const detailState = reactive({ loading: false, error: '' });
const queueState = reactive({ loading: false, error: '', message: '' });

const allRows = ref<SettlementExceptionInboxRow[]>([]);
const selectedExceptionId = ref('');
const selectedDetail = ref<ExceptionDetailResponse | null>(null);
const queueByException = ref<SettlementExceptionQueueState>({});
const queueDraft = reactive({
  owner: '',
  resolutionReason: '',
});

const fixtureRows: SettlementExceptionInboxRow[] = [
  {
    id: 'se_fx_critical_001',
    reference: 'se_fx_critical_001',
    merchantId: 'merchant_demo_alpha',
    providerName: 'mock-a',
    status: 'OPEN',
    severity: 'critical',
    openedReason: 'ledger_provider_mismatch',
    deltaAmount: 1200,
    windowDate: '2026-03-18',
    createdAt: '2026-03-18T09:01:00.000Z',
    updatedAt: '2026-03-18T09:01:00.000Z',
    version: 1,
  },
  {
    id: 'se_fx_high_002',
    reference: 'se_fx_high_002',
    merchantId: 'merchant_demo_bravo',
    providerName: 'mock-b',
    status: 'INVESTIGATING',
    severity: 'high',
    openedReason: 'callback_gap',
    deltaAmount: 480,
    windowDate: '2026-03-18',
    createdAt: '2026-03-18T08:45:00.000Z',
    updatedAt: '2026-03-18T09:10:00.000Z',
    version: 2,
  },
  {
    id: 'se_fx_medium_003',
    reference: 'se_fx_medium_003',
    merchantId: 'merchant_demo_alpha',
    providerName: 'mock-a',
    status: 'OPEN',
    severity: 'medium',
    openedReason: 'stale_webhook',
    deltaAmount: 150,
    windowDate: '2026-03-19',
    createdAt: '2026-03-19T06:00:00.000Z',
    updatedAt: '2026-03-19T06:00:00.000Z',
    version: 1,
  },
];

const filteredRows = computed(() => {
  const rows = filterExceptions(allRows.value, filters);
  return sortExceptionsDeterministic(rows);
});

const listViewState = computed(() => buildSettlementExceptionsViewState({
  loading: listState.loading,
  error: listState.error,
  rows: filteredRows.value,
  loadingMessage: 'Loading settlement exceptions...',
  emptyMessage: 'No settlement exceptions matched this filter set.',
  readyMessage: `${filteredRows.value.length} exception row(s) loaded. Retry count: ${retryCount.value}.`,
}));

const selectedQueueEntry = computed(() => {
  if (!selectedExceptionId.value) return null;
  return queueByException.value[selectedExceptionId.value] ?? null;
});

function authHeaders() {
  return {
    'x-internal-token': auth.internalToken.trim(),
    'x-actor-role': auth.actorRole,
  };
}

function hasAuth() {
  return Boolean(auth.internalToken.trim());
}

function toInboxRow(payload: any): SettlementExceptionInboxRow {
  const deltaAmount = Number(payload?.deltaAmount ?? 0);
  const createdAt = String(payload?.createdAt || new Date(0).toISOString());
  return {
    id: String(payload?.id || ''),
    reference: String(payload?.id || ''),
    merchantId: String(payload?.merchantId || ''),
    providerName: String(payload?.providerName || ''),
    status: normalizeStatus(payload?.status),
    severity: deriveSettlementExceptionSeverity(deltaAmount),
    openedReason: String(payload?.openedReason || ''),
    deltaAmount,
    windowDate: String(payload?.windowDate || createdAt.slice(0, 10)),
    createdAt,
    updatedAt: String(payload?.updatedAt || createdAt),
    version: Number(payload?.version ?? 1),
  };
}

function normalizeStatus(raw: unknown): SettlementExceptionStatus {
  const value = String(raw || 'OPEN').toUpperCase();
  if (value === 'INVESTIGATING' || value === 'RESOLVED' || value === 'IGNORED') {
    return value;
  }
  return 'OPEN';
}

function queueEntryLabel(status: SettlementExceptionStatus) {
  if (status === 'RESOLVED') return 'status-pill ok';
  if (status === 'OPEN') return 'status-pill danger';
  if (status === 'INVESTIGATING') return 'status-pill warn';
  return 'status-pill';
}

function severityClass(severity: SettlementExceptionInboxRow['severity']) {
  if (severity === 'critical') return 'status-pill danger';
  if (severity === 'high') return 'status-pill warn';
  if (severity === 'medium') return 'status-pill';
  return 'status-pill ok';
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadExceptions() {
  listState.loading = true;
  listState.error = '';
  queueState.message = '';
  selectedExceptionId.value = '';
  selectedDetail.value = null;
  detailState.error = '';

  try {
    if (mode.value === 'fixture_loading') {
      await wait(700);
      allRows.value = [];
      return;
    }
    if (mode.value === 'fixture_error') {
      throw new Error('Fixture mode: simulated exceptions inbox fetch failure.');
    }
    if (mode.value === 'fixture_empty') {
      allRows.value = [];
      return;
    }

    const source = resolveSettlementExceptionsDataSource({
      mode: mode.value,
      latestApiStatusCode: latestApiStatusCode.value,
    });
    if (source === 'fixture' || mode.value === 'fixture_success') {
      allRows.value = fixtureRows;
      latestApiStatusCode.value = undefined;
      return;
    }

    if (!hasAuth()) {
      throw new Error('Internal auth token is required in API mode.');
    }

    const params = new URLSearchParams();
    if (filters.status !== 'ALL') params.set('status', filters.status);
    if (filters.merchantId.trim()) params.set('merchantId', filters.merchantId.trim());
    if (filters.dateFrom.trim()) params.set('dateFrom', filters.dateFrom.trim());
    if (filters.dateTo.trim()) params.set('dateTo', filters.dateTo.trim());
    params.set('take', '100');

    const response = await request<ExceptionListResponse>(`/settlements/exceptions?${params.toString()}`, {
      headers: authHeaders(),
    });
    allRows.value = Array.isArray(response?.data) ? response.data.map((row) => toInboxRow(row)) : [];
    latestApiStatusCode.value = undefined;
  } catch (error: any) {
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : undefined;
    latestApiStatusCode.value = statusCode;
    const source = resolveSettlementExceptionsDataSource({ mode: mode.value, latestApiStatusCode: statusCode });
    if (source === 'fixture') {
      allRows.value = fixtureRows;
      listState.error = '';
    } else {
      allRows.value = [];
      listState.error = error?.message || 'Unable to load settlement exceptions.';
    }
  } finally {
    listState.loading = false;
  }
}

async function loadDetail(exceptionId: string) {
  selectedExceptionId.value = exceptionId;
  detailState.loading = true;
  detailState.error = '';

  try {
    if (mode.value !== 'api') {
      selectedDetail.value = allRows.value.find((row) => row.id === exceptionId) ?? null;
      if (!selectedDetail.value) {
        throw new Error('Fixture detail not found for selected exception.');
      }
      return;
    }

    if (!hasAuth()) {
      throw new Error('Internal auth token is required in API mode.');
    }

    const detail = await request<ExceptionDetailResponse>(`/settlements/exceptions/${exceptionId}`, {
      headers: authHeaders(),
    });
    selectedDetail.value = detail;
  } catch (error: any) {
    selectedDetail.value = null;
    detailState.error = error?.message || 'Unable to load exception detail.';
  } finally {
    detailState.loading = false;
  }
}

function acknowledgeSelected() {
  if (!selectedExceptionId.value) {
    queueState.error = 'Select an exception before acknowledging.';
    return;
  }
  queueState.error = '';
  queueState.message = `Acknowledged ${selectedExceptionId.value}.`;
  queueByException.value = applyActionQueueTransition(queueByException.value, {
    type: 'acknowledge',
    exceptionId: selectedExceptionId.value,
  });
}

function assignOwner() {
  if (!selectedExceptionId.value) {
    queueState.error = 'Select an exception before assigning owner.';
    return;
  }
  if (!queueDraft.owner.trim()) {
    queueState.error = 'Owner is required for assign owner action.';
    return;
  }

  queueState.error = '';
  queueByException.value = applyActionQueueTransition(queueByException.value, {
    type: 'assign_owner',
    exceptionId: selectedExceptionId.value,
    owner: queueDraft.owner,
  });
  queueState.message = `Assigned ${selectedExceptionId.value} to ${queueDraft.owner.trim()}.`;
}

async function markResolved() {
  if (!selectedExceptionId.value) {
    queueState.error = 'Select an exception before marking resolved.';
    return;
  }
  if (!queueDraft.resolutionReason.trim()) {
    queueState.error = 'Resolution reason is required.';
    return;
  }

  queueState.loading = true;
  queueState.error = '';
  queueState.message = '';

  const resolvedAt = new Date().toISOString();
  try {
    queueByException.value = applyActionQueueTransition(queueByException.value, {
      type: 'mark_resolved',
      exceptionId: selectedExceptionId.value,
      reason: queueDraft.resolutionReason,
      resolvedAt,
    });

    if (mode.value === 'api') {
      if (!hasAuth()) {
        throw new Error('Internal auth token is required in API mode.');
      }
      const row = allRows.value.find((item) => item.id === selectedExceptionId.value);
      if (!row) {
        throw new Error('Selected exception row is not loaded.');
      }
      await request(`/settlements/exceptions/${selectedExceptionId.value}/action`, {
        method: 'POST',
        headers: authHeaders(),
        body: {
          action: 'resolve',
          reason: queueDraft.resolutionReason.trim(),
          note: `owner=${queueDraft.owner.trim() || 'unassigned'}`,
          expectedVersion: row.version,
          expectedUpdatedAt: row.updatedAt,
        },
      });
      await loadExceptions();
      await loadDetail(selectedExceptionId.value);
    } else {
      allRows.value = allRows.value.map((item) => (item.id === selectedExceptionId.value
        ? { ...item, status: 'RESOLVED', updatedAt: resolvedAt, version: item.version + 1 }
        : item));
    }

    queueState.message = `Resolved ${selectedExceptionId.value}.`;
  } catch (error: any) {
    queueState.error = error?.message || 'Unable to mark exception resolved.';
  } finally {
    queueState.loading = false;
  }
}

async function retryList() {
  retryCount.value = nextRetryCount(retryCount.value);
  await loadExceptions();
}

function formatDateTime(value: string | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

onMounted(() => {
  void loadExceptions();
});
</script>

<template>
  <main class="page settlement-exceptions-inbox-page">
    <section class="hero">
      <h1>Settlement Exceptions Inbox</h1>
      <p>Deterministic exception triage with filters, action queue controls, and resilient state handling.</p>
      <div class="inline-actions">
        <NuxtLink class="button-link" to="/">Open Legacy Control Tower</NuxtLink>
        <NuxtLink class="button-link" to="/payment-reconciliation-workspace">Open Reconciliation Workspace</NuxtLink>
        <NuxtLink class="button-link" to="/payment-operations-dashboard">Open Payment Operations Dashboard</NuxtLink>
      </div>
    </section>

    <section class="card">
      <h2>Inbox Controls</h2>
      <form class="grid" @submit.prevent="loadExceptions">
        <label>
          Internal token
          <input v-model="auth.internalToken" type="password" placeholder="INTERNAL_API_TOKEN" />
        </label>
        <label>
          Role
          <select v-model="auth.actorRole">
            <option value="ops">ops</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <label>
          Data mode
          <select v-model="mode">
            <option value="api">api</option>
            <option value="fixture_success">fixture_success</option>
            <option value="fixture_loading">fixture_loading</option>
            <option value="fixture_empty">fixture_empty</option>
            <option value="fixture_error">fixture_error</option>
          </select>
        </label>
        <label>
          Status
          <select v-model="filters.status">
            <option value="ALL">ALL</option>
            <option value="OPEN">OPEN</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="IGNORED">IGNORED</option>
          </select>
        </label>
        <label>
          Merchant
          <input v-model="filters.merchantId" placeholder="merchant_demo" />
        </label>
        <label>
          Date from
          <input v-model="filters.dateFrom" type="date" />
        </label>
        <label>
          Date to
          <input v-model="filters.dateTo" type="date" />
        </label>
        <button :disabled="listState.loading" type="submit">
          {{ listState.loading ? 'Refreshing...' : 'Refresh Inbox' }}
        </button>
      </form>
      <p class="state" :class="{ error: listViewState.key === 'error' }">{{ listViewState.message }}</p>
      <div v-if="listViewState.showRetry" class="inline-actions compact">
        <button type="button" @click="retryList">Retry Inbox Fetch</button>
      </div>
    </section>

    <section class="operations-layout">
      <article class="card">
        <h2>Exceptions List</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Merchant</th>
                <th>Window</th>
                <th>Delta</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="listViewState.key !== 'ready'">
                <td colspan="7">{{ listViewState.message }}</td>
              </tr>
              <tr v-for="row in filteredRows" :key="row.id">
                <td><code>{{ row.reference }}</code></td>
                <td><span :class="severityClass(row.severity)">{{ row.severity }}</span></td>
                <td><span :class="queueEntryLabel(row.status)">{{ row.status }}</span></td>
                <td>{{ row.merchantId }}</td>
                <td>{{ row.windowDate }}</td>
                <td>{{ row.deltaAmount }}</td>
                <td>
                  <button type="button" class="link" :disabled="detailState.loading" @click="loadDetail(row.id)">
                    {{ detailState.loading && selectedExceptionId === row.id ? 'Loading...' : 'Open queue' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="card">
        <h2>Action Queue</h2>
        <p class="state" :class="{ error: detailState.error }">
          {{ detailState.error || `Selected: ${selectedExceptionId || '-'}` }}
        </p>
        <div v-if="selectedDetail" class="detail-grid">
          <p><strong>ID:</strong> <code>{{ selectedDetail.id }}</code></p>
          <p><strong>Status:</strong> {{ selectedDetail.status }}</p>
          <p><strong>Provider:</strong> {{ selectedDetail.providerName }}</p>
          <p><strong>Opened Reason:</strong> {{ selectedDetail.openedReason }}</p>
          <p><strong>Updated:</strong> {{ formatDateTime(selectedDetail.updatedAt) }}</p>
        </div>
        <p v-else class="state">Select an exception to enable queue actions.</p>

        <div class="grid">
          <label>
            Assign owner
            <input v-model="queueDraft.owner" placeholder="ops-user" />
          </label>
          <label>
            Resolution reason
            <input v-model="queueDraft.resolutionReason" placeholder="Provider callback reconciled" />
          </label>
        </div>

        <div class="inline-actions">
          <button type="button" :disabled="queueState.loading || !selectedExceptionId" @click="acknowledgeSelected">
            Acknowledge
          </button>
          <button type="button" :disabled="queueState.loading || !selectedExceptionId" @click="assignOwner">
            Assign Owner
          </button>
          <button type="button" :disabled="queueState.loading || !selectedExceptionId" @click="markResolved">
            {{ queueState.loading ? 'Resolving...' : 'Mark Resolved' }}
          </button>
        </div>

        <p class="state" :class="{ error: queueState.error }">
          {{ queueState.error || queueState.message || 'Queue actions will apply deterministic transitions.' }}
        </p>

        <div v-if="selectedQueueEntry" class="detail-grid">
          <p><strong>Acknowledged:</strong> {{ selectedQueueEntry.acknowledged ? 'yes' : 'no' }}</p>
          <p><strong>Owner:</strong> {{ selectedQueueEntry.owner || '-' }}</p>
          <p><strong>Resolved at:</strong> {{ formatDateTime(selectedQueueEntry.resolvedAt || undefined) }}</p>
          <p><strong>Resolution reason:</strong> {{ selectedQueueEntry.resolutionReason || '-' }}</p>
        </div>
      </article>
    </section>
  </main>
</template>
