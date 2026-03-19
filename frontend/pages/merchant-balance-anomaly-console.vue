<script setup lang="ts">
import {
  applyActionTransition,
  buildPanelViewState,
  deriveSeverity,
  nextAnomalyRetryAttempt,
  resolveAnomalyDataSource,
  sortAnomalyAlertsDeterministic,
  validateReasonNote,
  type ActionQueueState,
  type AnomalyAlertRow,
  type AnomalyMode,
  type ReconciliationAction,
} from '../utils/merchantBalanceAnomalyConsole';

const { request } = useGatewayApi();

type InternalRole = 'admin' | 'ops' | 'support';

type ExceptionListResponse = {
  data?: Array<{
    id?: string;
    merchantId?: string;
    status?: string;
    openedReason?: string;
    deltaAmount?: number;
    createdAt?: string;
  }>;
};

type ExceptionDetailResponse = {
  id?: string;
  merchantId?: string;
  status?: string;
  openedReason?: string;
  deltaAmount?: number;
  createdAt?: string;
};

const auth = reactive({
  internalToken: '',
  actorRole: 'ops' as InternalRole,
});

const selectedMode = ref<AnomalyMode>('api');
const latestApiStatusCode = ref<number | undefined>(undefined);
const merchantFilter = ref('');

const alertListState = reactive({ loading: false, error: '' });
const actionPanelState = reactive({ loading: false, error: '', message: '' });

const alerts = ref<AnomalyAlertRow[]>([]);
const selectedAlertId = ref('');
const actionQueue = ref<ActionQueueState>({});
const reasonNote = ref('');

const listRetryCount = ref(0);
const panelRetryCount = ref(0);

const fixtureAlerts: AnomalyAlertRow[] = [
  {
    id: 'mba_fx_003',
    merchantId: 'merchant_alpha',
    severity: 'high',
    detectedAt: '2026-03-19T10:45:00.000Z',
    reason: 'callback_gap',
    deltaAmount: 890,
    currency: 'THB',
    status: 'OPEN',
  },
  {
    id: 'mba_fx_001',
    merchantId: 'merchant_alpha',
    severity: 'critical',
    detectedAt: '2026-03-19T10:00:00.000Z',
    reason: 'net_balance_negative',
    deltaAmount: 3200,
    currency: 'THB',
    status: 'INVESTIGATING',
  },
  {
    id: 'mba_fx_002',
    merchantId: 'merchant_bravo',
    severity: 'medium',
    detectedAt: '2026-03-19T11:10:00.000Z',
    reason: 'ledger_provider_delta',
    deltaAmount: 350,
    currency: 'THB',
    status: 'OPEN',
  },
];

const sortedAlerts = computed(() => sortAnomalyAlertsDeterministic(alerts.value));

const selectedAlert = computed(() => sortedAlerts.value.find((row) => row.id === selectedAlertId.value) ?? null);
const selectedActionState = computed(() => (selectedAlertId.value ? actionQueue.value[selectedAlertId.value] ?? null : null));

const alertListViewState = computed(() => buildPanelViewState({
  loading: alertListState.loading,
  error: alertListState.error,
  itemCount: sortedAlerts.value.length,
  loadingMessage: 'Loading anomaly alert list...',
  emptyMessage: 'No merchant balance anomalies detected for this filter set.',
  readyMessage: `${sortedAlerts.value.length} alert(s) loaded in deterministic order. Retry count: ${listRetryCount.value}.`,
}));

const actionPanelViewState = computed(() => buildPanelViewState({
  loading: actionPanelState.loading,
  error: actionPanelState.error,
  itemCount: selectedAlert.value ? 1 : 0,
  loadingMessage: 'Loading selected anomaly details...',
  emptyMessage: 'Select an anomaly alert to open reconciliation actions.',
  readyMessage: selectedActionState.value
    ? `Last action: ${selectedActionState.value.status} at ${new Date(selectedActionState.value.updatedAt).toLocaleString()}. Retry count: ${panelRetryCount.value}.`
    : `No action applied yet. Retry count: ${panelRetryCount.value}.`,
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

function rowStatusClass(status: string) {
  if (status === 'RESOLVED') return 'status-pill ok';
  if (status === 'INVESTIGATING') return 'status-pill warn';
  if (status === 'OPEN') return 'status-pill danger';
  return 'status-pill';
}

function severityClass(severity: string) {
  if (severity === 'critical') return 'status-pill danger';
  if (severity === 'high') return 'status-pill warn';
  if (severity === 'medium') return 'status-pill';
  return 'status-pill ok';
}

function toAlertRow(payload: any): AnomalyAlertRow {
  const deltaAmount = Number(payload?.deltaAmount ?? 0);
  const createdAt = String(payload?.createdAt || new Date(0).toISOString());
  const rawStatus = String(payload?.status || 'OPEN').toUpperCase();
  return {
    id: String(payload?.id || ''),
    merchantId: String(payload?.merchantId || ''),
    severity: deriveSeverity(deltaAmount),
    detectedAt: createdAt,
    reason: String(payload?.openedReason || 'unknown'),
    deltaAmount,
    currency: 'THB',
    status: rawStatus === 'INVESTIGATING' || rawStatus === 'RESOLVED' ? rawStatus : 'OPEN',
  };
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function resetActionPanel() {
  selectedAlertId.value = '';
  reasonNote.value = '';
  actionPanelState.error = '';
  actionPanelState.message = '';
}

async function loadAlertList() {
  alertListState.loading = true;
  alertListState.error = '';
  resetActionPanel();

  try {
    if (selectedMode.value === 'fixture_loading') {
      await wait(700);
      alerts.value = [];
      return;
    }
    if (selectedMode.value === 'fixture_error') {
      throw new Error('Fixture mode: simulated anomaly alert fetch failure.');
    }
    if (selectedMode.value === 'fixture_empty') {
      alerts.value = [];
      latestApiStatusCode.value = undefined;
      return;
    }

    const source = resolveAnomalyDataSource({
      mode: selectedMode.value,
      latestApiStatusCode: latestApiStatusCode.value,
    });
    if (source === 'fixture') {
      alerts.value = fixtureAlerts;
      latestApiStatusCode.value = undefined;
      return;
    }

    if (!hasAuth()) {
      throw new Error('Internal auth token is required in API mode.');
    }

    const params = new URLSearchParams();
    if (merchantFilter.value.trim()) {
      params.set('merchantId', merchantFilter.value.trim());
    }
    params.set('take', '100');

    const response = await request<ExceptionListResponse>(`/settlements/exceptions?${params.toString()}`, {
      headers: authHeaders(),
    });
    alerts.value = Array.isArray(response?.data) ? response.data.map((row) => toAlertRow(row)) : [];
    latestApiStatusCode.value = undefined;
  } catch (error: any) {
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : undefined;
    latestApiStatusCode.value = statusCode;
    const source = resolveAnomalyDataSource({ mode: selectedMode.value, latestApiStatusCode: statusCode });
    if (source === 'fixture') {
      alerts.value = fixtureAlerts;
      alertListState.error = '';
    } else {
      alerts.value = [];
      alertListState.error = error?.message || 'Unable to load anomaly alerts.';
    }
  } finally {
    alertListState.loading = false;
  }
}

async function loadActionPanelDetails(alertId: string) {
  selectedAlertId.value = alertId;
  actionPanelState.loading = true;
  actionPanelState.error = '';
  actionPanelState.message = '';

  try {
    if (selectedMode.value !== 'api') {
      return;
    }

    if (!hasAuth()) {
      throw new Error('Internal auth token is required in API mode.');
    }

    await request<ExceptionDetailResponse>(`/settlements/exceptions/${alertId}`, {
      headers: authHeaders(),
    });
  } catch (error: any) {
    actionPanelState.error = error?.message || 'Unable to load anomaly detail.';
  } finally {
    actionPanelState.loading = false;
  }
}

function applyAction(action: ReconciliationAction) {
  if (!selectedAlertId.value) {
    actionPanelState.error = 'Select an alert before applying actions.';
    return;
  }

  const validation = validateReasonNote(action, reasonNote.value);
  if (!validation.valid) {
    actionPanelState.error = validation.message;
    return;
  }

  actionQueue.value = applyActionTransition(actionQueue.value, {
    anomalyId: selectedAlertId.value,
    action,
    note: reasonNote.value,
    at: new Date().toISOString(),
  });

  actionPanelState.error = '';
  actionPanelState.message = `Applied ${action.replaceAll('_', ' ')} for ${selectedAlertId.value}.`;
}

async function retryAlertList() {
  listRetryCount.value = nextAnomalyRetryAttempt(listRetryCount.value);
  await loadAlertList();
}

async function retryActionPanel() {
  panelRetryCount.value = nextAnomalyRetryAttempt(panelRetryCount.value);
  if (selectedAlertId.value) {
    await loadActionPanelDetails(selectedAlertId.value);
  }
}

onMounted(() => {
  void loadAlertList();
});
</script>

<template>
  <main class="page merchant-balance-anomaly-page">
    <section class="hero">
      <h1>Merchant Balance Anomaly Console</h1>
      <p>Threshold alert triage with deterministic ordering and reconciliation action control.</p>
      <div class="inline-actions">
        <NuxtLink class="button-link" to="/">Open Legacy Control Tower</NuxtLink>
        <NuxtLink class="button-link" to="/payment-reconciliation-workspace">Open Reconciliation Workspace</NuxtLink>
        <NuxtLink class="button-link" to="/settlement-exceptions-inbox">Open Settlement Exceptions Inbox</NuxtLink>
        <NuxtLink class="button-link" to="/risk-alert-command-center">Open Risk Alert Command Center</NuxtLink>
      </div>
    </section>

    <section class="card">
      <h2>Console Controls</h2>
      <form class="grid" @submit.prevent="loadAlertList">
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
          Merchant filter
          <input v-model="merchantFilter" placeholder="merchant_id (optional)" />
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
        <button type="submit" :disabled="alertListState.loading || actionPanelState.loading">
          {{ alertListState.loading || actionPanelState.loading ? 'Refreshing...' : 'Refresh Console' }}
        </button>
      </form>
    </section>

    <section class="card">
      <h2>Threshold Alerts</h2>
      <p class="state" :class="{ error: alertListViewState.key === 'error' }">{{ alertListViewState.message }}</p>
      <div v-if="alertListViewState.showRetry" class="inline-actions compact">
        <button type="button" @click="retryAlertList">Retry Alert List</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Severity</th>
              <th>Merchant</th>
              <th>Detected At</th>
              <th>Reason</th>
              <th>Delta</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="alertListViewState.key !== 'ready'">
              <td colspan="6">{{ alertListViewState.message }}</td>
            </tr>
            <tr
              v-for="row in sortedAlerts"
              :key="row.id"
              :class="{ 'queue-row-active': row.id === selectedAlertId, 'clickable-row': true }"
              @click="loadActionPanelDetails(row.id)"
            >
              <td><span :class="severityClass(row.severity)">{{ row.severity }}</span></td>
              <td>{{ row.merchantId }}</td>
              <td>{{ new Date(row.detectedAt).toLocaleString() }}</td>
              <td>{{ row.reason }}</td>
              <td>{{ row.deltaAmount.toLocaleString() }} {{ row.currency }}</td>
              <td><span :class="rowStatusClass(row.status)">{{ row.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <h2>Reconciliation Actions</h2>
      <p class="state" :class="{ error: actionPanelViewState.key === 'error' }">{{ actionPanelViewState.message }}</p>
      <p v-if="actionPanelState.message" class="state">{{ actionPanelState.message }}</p>
      <div v-if="actionPanelViewState.showRetry" class="inline-actions compact">
        <button type="button" @click="retryActionPanel">Retry Action Panel</button>
      </div>

      <div class="detail-grid">
        <div><strong>Selected alert:</strong> {{ selectedAlert?.id || '-' }}</div>
        <div><strong>Merchant:</strong> {{ selectedAlert?.merchantId || '-' }}</div>
        <div><strong>Current state:</strong> {{ selectedActionState?.status || 'queued' }}</div>
      </div>

      <label>
        Reason note
        <textarea
          v-model="reasonNote"
          rows="3"
          placeholder="Required for open investigation / mark resolved; max 280 characters"
        />
      </label>

      <div class="inline-actions">
        <button type="button" :disabled="!selectedAlertId" @click="applyAction('acknowledge')">Acknowledge</button>
        <button type="button" :disabled="!selectedAlertId" @click="applyAction('open_investigation')">Open Investigation</button>
        <button type="button" :disabled="!selectedAlertId" @click="applyAction('mark_resolved')">Mark Resolved</button>
      </div>
    </section>
  </main>
</template>
