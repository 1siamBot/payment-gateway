<script setup lang="ts">
import {
  applyRiskAlertSuppressionTransition,
  applySuppressionStateToAlerts,
  buildRiskAlertViewState,
  filterRiskAlerts,
  nextRiskAlertRetryCount,
  resolveRiskAlertDataSource,
  sortRiskAlertsDeterministic,
  type RiskAlertCommandCenterMode,
  type RiskAlertFilters,
  type RiskAlertRow,
  type RiskAlertSeverity,
  type RiskAlertStatus,
  type RiskAlertSuppressionState,
} from '../utils/riskAlertCommandCenter';

const { request } = useGatewayApi();

type ActorRole = 'admin' | 'ops' | 'support';

type ObservabilityResponse = {
  alerts?: Array<{ type?: 'warning' | 'error'; message?: string }>;
  margins?: Array<{
    provider?: string;
    decisionCount?: number;
    failedAttempts?: number;
    failureRate?: number;
    weightedScore?: number | null;
  }>;
  failovers?: Array<{ at?: string; from?: string; to?: string; failoverCount?: number }>;
};

const auth = reactive({
  internalToken: '',
  actorRole: 'ops' as ActorRole,
});

const merchantId = ref('merchant_demo_alpha');
const timeframeHours = ref(24);
const mode = ref<RiskAlertCommandCenterMode>('fixture_success');
const latestApiStatusCode = ref<number | undefined>(undefined);
const retryCount = ref(0);

const filters = reactive<RiskAlertFilters>({
  severity: 'all',
  status: 'all',
  provider: 'all',
  search: '',
});

const streamState = reactive({ loading: false, error: '' });
const panelState = reactive({ loading: false, error: '', message: '' });

const rawAlerts = ref<RiskAlertRow[]>([]);
const selectedAlertId = ref('');
const suppressionState = ref<RiskAlertSuppressionState>({});
const suppressionDraft = reactive({
  note: '',
  snoozeMinutes: 60,
});

const fixtureAlerts: RiskAlertRow[] = [
  {
    id: 'risk_alert_critical_001',
    title: 'Failover pressure exceeded threshold',
    summary: 'mock-b exceeded 32% failover pressure in the last 24h.',
    merchantId: 'merchant_demo_alpha',
    provider: 'mock-b',
    severity: 'critical',
    detectedAt: '2026-03-19T08:32:00.000Z',
    status: 'new',
    signalValue: 32,
    snoozeUntil: null,
  },
  {
    id: 'risk_alert_high_002',
    title: 'Weighted score degradation',
    summary: 'mock-a weighted score dropped below 0.75.',
    merchantId: 'merchant_demo_alpha',
    provider: 'mock-a',
    severity: 'high',
    detectedAt: '2026-03-19T07:45:00.000Z',
    status: 'new',
    signalValue: 0.71,
    snoozeUntil: null,
  },
  {
    id: 'risk_alert_medium_003',
    title: 'Retry spike detected',
    summary: 'Retry sequence climbed for mock-c but recovered.',
    merchantId: 'merchant_demo_bravo',
    provider: 'mock-c',
    severity: 'medium',
    detectedAt: '2026-03-19T06:50:00.000Z',
    status: 'acknowledged',
    signalValue: 4,
    snoozeUntil: null,
  },
  {
    id: 'risk_alert_low_004',
    title: 'Minor breaker transition burst',
    summary: 'Short-lived half-open transitions observed on mock-a.',
    merchantId: 'merchant_demo_charlie',
    provider: 'mock-a',
    severity: 'low',
    detectedAt: '2026-03-18T22:05:00.000Z',
    status: 'new',
    signalValue: 2,
    snoozeUntil: null,
  },
];

const alertsWithSuppression = computed(() => applySuppressionStateToAlerts(rawAlerts.value, suppressionState.value));

const filteredAlerts = computed(() => {
  const rows = filterRiskAlerts(alertsWithSuppression.value, filters);
  return sortRiskAlertsDeterministic(rows);
});

const providerOptions = computed(() => {
  const providers = new Set(alertsWithSuppression.value.map((row) => row.provider));
  return ['all', ...[...providers].sort((left, right) => left.localeCompare(right))];
});

const streamViewState = computed(() => buildRiskAlertViewState({
  loading: streamState.loading,
  error: streamState.error,
  itemCount: filteredAlerts.value.length,
  loadingMessage: 'Loading risk alert stream...',
  emptyMessage: 'No risk alerts matched the current filters.',
  readyMessage: `${filteredAlerts.value.length} risk alert(s) loaded. Retry count: ${retryCount.value}.`,
}));

const selectedAlert = computed(() => filteredAlerts.value.find((row) => row.id === selectedAlertId.value) ?? null);

const panelViewState = computed(() => buildRiskAlertViewState({
  loading: panelState.loading,
  error: panelState.error,
  itemCount: selectedAlert.value ? 1 : 0,
  loadingMessage: 'Loading suppression workflow panel...',
  emptyMessage: 'Select an alert from the stream to start a suppression action.',
  readyMessage: selectedAlert.value
    ? `Suppression panel ready for ${selectedAlert.value.id}.`
    : 'Select an alert from the stream to start a suppression action.',
}));

const selectedSuppressionEntry = computed(() => {
  if (!selectedAlert.value) return null;
  return suppressionState.value[selectedAlert.value.id] ?? null;
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

function severityBadgeClass(severity: RiskAlertSeverity) {
  if (severity === 'critical') return 'status-pill danger';
  if (severity === 'high') return 'status-pill warn';
  if (severity === 'medium') return 'status-pill';
  return 'status-pill ok';
}

function statusBadgeClass(status: RiskAlertStatus) {
  if (status === 'suppressed') return 'status-pill ok';
  if (status === 'snoozed') return 'status-pill warn';
  if (status === 'acknowledged') return 'status-pill';
  return 'status-pill danger';
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function normalizeSeverityFromAlertType(type: string | undefined): RiskAlertSeverity {
  if (type === 'error') return 'critical';
  return 'high';
}

function normalizeStatus(raw: string | undefined): RiskAlertStatus {
  const value = String(raw || 'new').toLowerCase();
  if (value === 'acknowledged' || value === 'snoozed' || value === 'suppressed') {
    return value;
  }
  return 'new';
}

function normalizeAlertsFromApi(payload: ObservabilityResponse): RiskAlertRow[] {
  const rows: RiskAlertRow[] = [];
  const alerts = Array.isArray(payload?.alerts) ? payload.alerts : [];
  const failovers = Array.isArray(payload?.failovers) ? payload.failovers : [];
  const latestFailoverAt = failovers[0]?.at ?? new Date().toISOString();

  for (const [index, alert] of alerts.entries()) {
    const message = String(alert.message || 'Unknown risk alert');
    const providerMatch = message.match(/^([^:]+):/);
    const provider = providerMatch ? providerMatch[1].trim() : 'unknown-provider';
    rows.push({
      id: `api_alert_${index + 1}_${provider}`,
      title: 'Observability alert',
      summary: message,
      merchantId: merchantId.value.trim(),
      provider,
      severity: normalizeSeverityFromAlertType(alert.type),
      detectedAt: latestFailoverAt,
      status: 'new',
      signalValue: Number((message.match(/([0-9]+(?:\.[0-9]+)?)/)?.[1]) ?? 0),
      snoozeUntil: null,
    });
  }

  const margins = Array.isArray(payload?.margins) ? payload.margins : [];
  for (const metric of margins) {
    const provider = String(metric.provider || 'unknown-provider');
    const failureRate = Number(metric.failureRate || 0);
    const weightedScore = metric.weightedScore === null || metric.weightedScore === undefined
      ? null
      : Number(metric.weightedScore);

    if (failureRate < 10 && (weightedScore === null || weightedScore >= 0.8)) {
      continue;
    }

    rows.push({
      id: `api_margin_${provider}`,
      title: 'Provider margin risk',
      summary: `${provider} failure rate ${failureRate.toFixed(1)}% with weighted score ${weightedScore === null ? 'n/a' : weightedScore.toFixed(2)}.`,
      merchantId: merchantId.value.trim(),
      provider,
      severity: failureRate >= 25 ? 'critical' : failureRate >= 15 ? 'high' : 'medium',
      detectedAt: latestFailoverAt,
      status: 'new',
      signalValue: failureRate,
      snoozeUntil: null,
    });
  }

  return rows;
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadAlertStream() {
  streamState.loading = true;
  streamState.error = '';
  panelState.message = '';
  selectedAlertId.value = '';

  try {
    if (mode.value === 'fixture_loading') {
      await wait(700);
      rawAlerts.value = [];
      return;
    }
    if (mode.value === 'fixture_error') {
      throw new Error('Fixture mode: simulated risk alert stream fetch failure.');
    }
    if (mode.value === 'fixture_empty') {
      rawAlerts.value = [];
      latestApiStatusCode.value = undefined;
      return;
    }

    const source = resolveRiskAlertDataSource({
      mode: mode.value,
      latestApiStatusCode: latestApiStatusCode.value,
    });

    if (source === 'fixture' || mode.value === 'fixture_success') {
      rawAlerts.value = fixtureAlerts;
      latestApiStatusCode.value = undefined;
      if (rawAlerts.value.length > 0) {
        selectedAlertId.value = sortRiskAlertsDeterministic(rawAlerts.value)[0].id;
      }
      return;
    }

    if (!hasAuth()) {
      throw new Error('Internal auth token is required in API mode.');
    }

    const merchant = merchantId.value.trim();
    if (!merchant) {
      throw new Error('Merchant ID is required in API mode.');
    }

    const params = new URLSearchParams();
    params.set('merchantId', merchant);
    params.set('timeframeHours', String(timeframeHours.value));
    params.set('take', '200');

    const response = await request<ObservabilityResponse>(`/payments/observability?${params.toString()}`, {
      headers: authHeaders(),
    });

    rawAlerts.value = normalizeAlertsFromApi(response);
    latestApiStatusCode.value = undefined;
    if (rawAlerts.value.length > 0) {
      selectedAlertId.value = sortRiskAlertsDeterministic(rawAlerts.value)[0].id;
    }
  } catch (error: any) {
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : undefined;
    latestApiStatusCode.value = statusCode;

    const source = resolveRiskAlertDataSource({ mode: mode.value, latestApiStatusCode: statusCode });
    if (source === 'fixture') {
      rawAlerts.value = fixtureAlerts;
      streamState.error = '';
      if (rawAlerts.value.length > 0) {
        selectedAlertId.value = sortRiskAlertsDeterministic(rawAlerts.value)[0].id;
      }
    } else {
      rawAlerts.value = [];
      selectedAlertId.value = '';
      streamState.error = error?.message || 'Unable to load risk alert stream.';
    }
  } finally {
    streamState.loading = false;
  }
}

async function loadSuppressionPanel(alertId: string) {
  panelState.loading = true;
  panelState.error = '';

  try {
    if (!alertId) {
      panelState.message = '';
      return;
    }

    if (mode.value === 'fixture_error') {
      throw new Error('Fixture mode: simulated suppression panel load failure.');
    }

    await wait(150);
    const exists = filteredAlerts.value.some((row) => row.id === alertId);
    if (!exists) {
      throw new Error('Selected alert is no longer available in the filtered stream.');
    }

    panelState.message = '';
  } catch (error: any) {
    panelState.error = error?.message || 'Unable to load suppression panel.';
  } finally {
    panelState.loading = false;
  }
}

function retryStream() {
  retryCount.value = nextRiskAlertRetryCount(retryCount.value);
  loadAlertStream();
}

function retryPanel() {
  if (!selectedAlertId.value) {
    panelState.error = 'Select an alert before retrying the suppression panel.';
    return;
  }
  loadSuppressionPanel(selectedAlertId.value);
}

function applySuppression(action: 'acknowledge' | 'snooze' | 'suppress') {
  if (!selectedAlert.value) {
    panelState.error = 'Select an alert before applying suppression actions.';
    return;
  }

  const note = suppressionDraft.note.trim();
  if (!note) {
    panelState.error = 'Audit note is required for suppression actions.';
    return;
  }

  panelState.error = '';
  const at = new Date().toISOString();
  if (action === 'acknowledge') {
    suppressionState.value = applyRiskAlertSuppressionTransition(suppressionState.value, {
      type: 'acknowledge',
      alertId: selectedAlert.value.id,
      note,
      at,
    });
    panelState.message = `Alert ${selectedAlert.value.id} acknowledged.`;
    return;
  }

  if (action === 'snooze') {
    const snoozeMinutes = Number(suppressionDraft.snoozeMinutes);
    if (!Number.isFinite(snoozeMinutes) || snoozeMinutes <= 0) {
      panelState.error = 'Snooze minutes must be greater than 0.';
      return;
    }

    const snoozeUntil = new Date(Date.now() + (snoozeMinutes * 60 * 1000)).toISOString();
    suppressionState.value = applyRiskAlertSuppressionTransition(suppressionState.value, {
      type: 'snooze',
      alertId: selectedAlert.value.id,
      note,
      at,
      snoozeUntil,
    });
    panelState.message = `Alert ${selectedAlert.value.id} snoozed until ${formatDateTime(snoozeUntil)}.`;
    return;
  }

  suppressionState.value = applyRiskAlertSuppressionTransition(suppressionState.value, {
    type: 'suppress',
    alertId: selectedAlert.value.id,
    note,
    at,
  });
  panelState.message = `Alert ${selectedAlert.value.id} suppressed.`;
}

watch(selectedAlertId, (nextId) => {
  if (!nextId) {
    panelState.message = '';
    panelState.error = '';
    return;
  }
  loadSuppressionPanel(nextId);
});

watch(
  () => [filters.severity, filters.status, filters.provider, filters.search],
  () => {
    if (selectedAlertId.value && !filteredAlerts.value.some((row) => row.id === selectedAlertId.value)) {
      selectedAlertId.value = filteredAlerts.value[0]?.id ?? '';
    }
  },
  { deep: true },
);

loadAlertStream();
</script>

<template>
  <main class="page">
    <section class="hero">
      <h1>Risk Alert Command Center</h1>
      <p>Stream deterministic risk alerts and apply suppression actions with auditable local state transitions.</p>
      <NuxtLink class="button-link" to="/">Back to operations home</NuxtLink>
    </section>

    <section class="card">
      <h2>Data Source</h2>
      <div class="auth-grid">
        <label>
          Internal token
          <input v-model="auth.internalToken" placeholder="internal_token_ops" autocomplete="off">
        </label>
        <label>
          Actor role
          <select v-model="auth.actorRole">
            <option value="admin">admin</option>
            <option value="ops">ops</option>
            <option value="support">support</option>
          </select>
        </label>
        <label>
          Merchant ID (API mode)
          <input v-model="merchantId" placeholder="merchant_demo_alpha">
        </label>
        <label>
          Timeframe hours
          <input v-model.number="timeframeHours" type="number" min="1" max="168">
        </label>
        <label>
          Mode
          <select v-model="mode">
            <option value="api">api</option>
            <option value="fixture_success">fixture_success</option>
            <option value="fixture_loading">fixture_loading</option>
            <option value="fixture_empty">fixture_empty</option>
            <option value="fixture_error">fixture_error</option>
          </select>
        </label>
      </div>
      <div class="inline-actions">
        <button type="button" @click="loadAlertStream">Reload alert stream</button>
      </div>
      <p :class="['state', streamViewState.key === 'error' ? 'error' : '']">
        {{ streamViewState.message }}
      </p>
      <div v-if="streamViewState.showRetry" class="inline-actions compact">
        <button type="button" @click="retryStream">Retry alert stream</button>
      </div>
    </section>

    <section class="card">
      <h2>Alert Filters</h2>
      <div class="grid">
        <label>
          Severity
          <select v-model="filters.severity">
            <option value="all">all</option>
            <option value="critical">critical</option>
            <option value="high">high</option>
            <option value="medium">medium</option>
            <option value="low">low</option>
          </select>
        </label>
        <label>
          Status
          <select v-model="filters.status">
            <option value="all">all</option>
            <option value="new">new</option>
            <option value="acknowledged">acknowledged</option>
            <option value="snoozed">snoozed</option>
            <option value="suppressed">suppressed</option>
          </select>
        </label>
        <label>
          Provider
          <select v-model="filters.provider">
            <option
              v-for="providerOption in providerOptions"
              :key="providerOption"
              :value="providerOption"
            >
              {{ providerOption }}
            </option>
          </select>
        </label>
        <label>
          Search
          <input v-model="filters.search" placeholder="id, merchant, provider, or summary">
        </label>
      </div>
    </section>

    <section class="grid">
      <article class="card">
        <h2>Alert Stream</h2>
        <p :class="['state', streamViewState.key === 'error' ? 'error' : '']">
          {{ streamViewState.message }}
        </p>

        <ul class="stream-list">
          <li
            v-for="alert in filteredAlerts"
            :key="alert.id"
            :class="['stream-row', selectedAlertId === alert.id ? 'selected' : '']"
          >
            <button
              type="button"
              class="stream-select"
              @click="selectedAlertId = alert.id"
            >
              <div>
                <strong>{{ alert.title }}</strong>
                <p>{{ alert.summary }}</p>
              </div>
              <div class="stream-meta">
                <span :class="severityBadgeClass(alert.severity)">{{ alert.severity }}</span>
                <span :class="statusBadgeClass(alert.status)">{{ alert.status }}</span>
                <span>{{ alert.provider }}</span>
                <span>{{ formatDateTime(alert.detectedAt) }}</span>
              </div>
            </button>
          </li>
        </ul>
      </article>

      <article class="card">
        <h2>Suppression Workflow</h2>
        <p :class="['state', panelViewState.key === 'error' ? 'error' : '']">
          {{ panelViewState.message }}
        </p>
        <div v-if="panelViewState.showRetry" class="inline-actions compact">
          <button type="button" @click="retryPanel">Retry suppression panel</button>
        </div>

        <template v-if="selectedAlert">
          <div class="suppression-summary">
            <p><strong>Alert</strong>: {{ selectedAlert.id }}</p>
            <p><strong>Provider</strong>: {{ selectedAlert.provider }}</p>
            <p><strong>Current status</strong>: {{ selectedAlert.status }}</p>
            <p v-if="selectedAlert.snoozeUntil"><strong>Snooze until</strong>: {{ formatDateTime(selectedAlert.snoozeUntil) }}</p>
          </div>

          <div class="grid">
            <label>
              Audit note
              <textarea
                v-model="suppressionDraft.note"
                rows="3"
                placeholder="Describe why this action is being applied"
              />
            </label>
            <label>
              Snooze minutes
              <input v-model.number="suppressionDraft.snoozeMinutes" type="number" min="1" max="720">
            </label>
          </div>

          <div class="inline-actions">
            <button type="button" @click="applySuppression('acknowledge')">Acknowledge</button>
            <button type="button" class="link" @click="applySuppression('snooze')">Snooze</button>
            <button type="button" class="danger" @click="applySuppression('suppress')">Suppress</button>
          </div>

          <p :class="['state', panelState.error ? 'error' : '']">
            {{ panelState.error || panelState.message || 'No suppression action applied yet.' }}
          </p>

          <div v-if="selectedSuppressionEntry" class="timeline">
            <h3>Audit Trail</h3>
            <ul>
              <li v-for="(audit, index) in selectedSuppressionEntry.audits" :key="`${audit.at}-${index}`">
                {{ formatDateTime(audit.at) }} · {{ audit.action }} · {{ audit.note }}
                <span v-if="audit.snoozeUntil"> · until {{ formatDateTime(audit.snoozeUntil) }}</span>
              </li>
            </ul>
          </div>
        </template>
      </article>
    </section>
  </main>
</template>

<style scoped>
.stream-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.7rem;
}

.stream-row {
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
}

.stream-row.selected {
  border-color: var(--brand);
  box-shadow: 0 0 0 2px rgba(11, 60, 93, 0.18);
}

.stream-select {
  width: 100%;
  text-align: left;
  background: #fff;
  color: var(--ink);
  border: none;
  display: grid;
  gap: 0.6rem;
}

.stream-select p {
  margin: 0.35rem 0 0;
  color: var(--muted);
}

.stream-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  color: var(--muted);
  font-size: 0.86rem;
}

.suppression-summary {
  margin-bottom: 0.8rem;
  border: 1px dashed var(--line);
  border-radius: 10px;
  padding: 0.7rem;
  background: #f8fafc;
}

.suppression-summary p {
  margin: 0.2rem 0;
}
</style>
