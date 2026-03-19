<script setup lang="ts">
import {
  buildFailoverSectionViewState,
  describeRootCause,
  filterFailoverTimeline,
  filterHeatmapRows,
  nextFailoverRetryAttempt,
  resolveFailoverInsightsDataSource,
  retryOutcomeLabel,
  sortFailoverTimelineDeterministic,
  sortHealthHeatmapDeterministic,
  type FailoverFilterState,
  type FailoverIncidentRow,
  type FailoverInsightsDataMode,
  type HealthHeatmapRow,
  type RetryOutcomeMarker,
} from '../utils/providerFailoverInsights';

const { request } = useGatewayApi();

type InternalRole = 'admin' | 'ops' | 'support';

type ObservabilityResponse = {
  margins?: Array<{
    provider?: string;
    failureRate?: number;
    failedAttempts?: number;
  }>;
  failovers?: Array<{
    at?: string;
    reference?: string;
    from?: string;
    to?: string;
    failoverCount?: number;
    reasonCode?: string;
  }>;
};

const auth = reactive({
  internalToken: '',
  actorRole: 'admin' as InternalRole,
});

const merchantId = ref('mrc_fixture_alpha');
const timeframeHours = ref(24);
const selectedMode = ref<FailoverInsightsDataMode>('fixture_success');
const latestApiStatusCode = ref<number | undefined>(undefined);

const filters = reactive<FailoverFilterState>({
  provider: 'all',
  region: 'all',
  status: 'all',
});

const heatmapState = reactive({ loading: false, error: '' });
const timelineState = reactive({ loading: false, error: '' });

const heatmapRetryCount = ref(0);
const timelineRetryCount = ref(0);

const heatmapRows = ref<HealthHeatmapRow[]>([]);
const timelineRows = ref<FailoverIncidentRow[]>([]);

const fixtureHeatmapRows: HealthHeatmapRow[] = [
  {
    provider: 'mock-a',
    region: 'ap-southeast-1',
    availabilityScore: 97,
    circuitState: 'closed',
    failoverEvents: 1,
  },
  {
    provider: 'mock-a',
    region: 'eu-west-1',
    availabilityScore: 88,
    circuitState: 'half_open',
    failoverEvents: 3,
  },
  {
    provider: 'mock-b',
    region: 'ap-southeast-1',
    availabilityScore: 82,
    circuitState: 'open',
    failoverEvents: 5,
  },
  {
    provider: 'mock-c',
    region: 'us-east-1',
    availabilityScore: 99,
    circuitState: 'closed',
    failoverEvents: 0,
  },
];

const fixtureTimelineRows: FailoverIncidentRow[] = [
  {
    id: 'incident-1',
    occurredAt: '2026-03-19T08:12:00.000Z',
    provider: 'mock-b',
    region: 'ap-southeast-1',
    status: 'investigating',
    rootCause: 'Failover after provider error',
    retryOutcome: 'retry_pending',
    failoverCount: 2,
    summary: 'pay_1002 rerouted from mock-b to mock-a after timeout.',
  },
  {
    id: 'incident-2',
    occurredAt: '2026-03-19T08:16:00.000Z',
    provider: 'mock-a',
    region: 'eu-west-1',
    status: 'mitigated',
    rootCause: 'Policy selected provider switch',
    retryOutcome: 'retry_succeeded',
    failoverCount: 1,
    summary: 'pay_1009 switched to recovery lane and completed.',
  },
  {
    id: 'incident-3',
    occurredAt: '2026-03-19T08:20:00.000Z',
    provider: 'mock-c',
    region: 'us-east-1',
    status: 'detected',
    rootCause: 'Legacy fallback path used',
    retryOutcome: 'none',
    failoverCount: 0,
    summary: 'pay_1012 logged degraded probe with no reroute.',
  },
];

const sortedHeatmapRows = computed(() => sortHealthHeatmapDeterministic(heatmapRows.value));
const sortedTimelineRows = computed(() => sortFailoverTimelineDeterministic(timelineRows.value));

const filteredHeatmapRows = computed(() => filterHeatmapRows(sortedHeatmapRows.value, {
  provider: filters.provider,
  region: filters.region,
}));

const filteredTimelineRows = computed(() => filterFailoverTimeline(sortedTimelineRows.value, filters));

const providerOptions = computed(() => {
  const providers = new Set<string>();
  for (const row of [...sortedHeatmapRows.value, ...sortedTimelineRows.value]) {
    providers.add(row.provider);
  }
  return ['all', ...[...providers].sort((left, right) => left.localeCompare(right))];
});

const regionOptions = computed(() => {
  const regions = new Set<string>();
  for (const row of [...sortedHeatmapRows.value, ...sortedTimelineRows.value]) {
    regions.add(row.region);
  }
  return ['all', ...[...regions].sort((left, right) => left.localeCompare(right))];
});

const heatmapViewState = computed(() => buildFailoverSectionViewState({
  loading: heatmapState.loading,
  error: heatmapState.error,
  itemCount: filteredHeatmapRows.value.length,
  loadingMessage: 'Loading provider health heatmap...',
  emptyMessage: 'No health cells for the selected provider/region filters.',
  readyMessage: `${filteredHeatmapRows.value.length} heatmap cell(s) loaded. Retry count: ${heatmapRetryCount.value}.`,
}));

const timelineViewState = computed(() => buildFailoverSectionViewState({
  loading: timelineState.loading,
  error: timelineState.error,
  itemCount: filteredTimelineRows.value.length,
  loadingMessage: 'Loading failover incident timeline...',
  emptyMessage: 'No timeline events for the selected filter combination.',
  readyMessage: `${filteredTimelineRows.value.length} incident event(s) loaded. Retry count: ${timelineRetryCount.value}.`,
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

function statusBadgeClass(status: string) {
  if (status === 'mitigated') return 'status-pill ok';
  if (status === 'investigating') return 'status-pill warn';
  if (status === 'detected') return 'status-pill danger';
  return 'status-pill';
}

function retryBadgeClass(marker: RetryOutcomeMarker) {
  if (marker === 'retry_succeeded') return 'status-pill ok';
  if (marker === 'retry_pending') return 'status-pill warn';
  if (marker === 'retry_failed') return 'status-pill danger';
  return 'status-pill';
}

function scoreToneClass(score: number) {
  if (score >= 95) return 'state-healthy';
  if (score >= 85) return 'state-degraded';
  return 'state-critical';
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function applyFixtureHeatmap(mode: FailoverInsightsDataMode) {
  heatmapRows.value = mode === 'fixture_empty' ? [] : fixtureHeatmapRows;
}

function applyFixtureTimeline(mode: FailoverInsightsDataMode) {
  timelineRows.value = mode === 'fixture_empty' ? [] : fixtureTimelineRows;
}

function normalizeHeatmapFromApi(payload: ObservabilityResponse): HealthHeatmapRow[] {
  const margins = Array.isArray(payload?.margins) ? payload.margins : [];
  return margins.map((row) => {
    const provider = String(row.provider || 'unknown-provider');
    const failureRate = Number(row.failureRate || 0);
    const availabilityScore = Math.max(0, Math.min(100, 100 - failureRate));
    return {
      provider,
      region: 'global',
      availabilityScore,
      circuitState: failureRate >= 25 ? 'open' : failureRate >= 10 ? 'half_open' : 'closed',
      failoverEvents: Number(row.failedAttempts || 0),
    };
  });
}

function normalizeIncidentFromApi(payload: ObservabilityResponse): FailoverIncidentRow[] {
  const events = Array.isArray(payload?.failovers) ? payload.failovers : [];
  return events.map((event, index) => {
    const failoverCount = Number(event.failoverCount || 0);
    const status = failoverCount >= 2
      ? 'investigating'
      : failoverCount >= 1
        ? 'mitigated'
        : 'detected';
    const retryOutcome: RetryOutcomeMarker = failoverCount >= 3
      ? 'retry_failed'
      : failoverCount >= 2
        ? 'retry_pending'
        : failoverCount >= 1
          ? 'retry_succeeded'
          : 'none';

    return {
      id: `${String(event.reference || 'ref')}-${index + 1}`,
      occurredAt: String(event.at || new Date(0).toISOString()),
      provider: String(event.from || event.to || 'unknown-provider'),
      region: 'global',
      status,
      rootCause: describeRootCause(String(event.reasonCode || 'unknown')),
      retryOutcome,
      failoverCount,
      summary: `${String(event.reference || 'unknown_reference')} rerouted from ${String(event.from || 'unknown')} to ${String(event.to || 'unknown')}.`,
    };
  });
}

async function loadHeatmapPanel() {
  heatmapState.loading = true;
  heatmapState.error = '';

  try {
    if (selectedMode.value === 'fixture_loading') {
      await wait(650);
      heatmapRows.value = [];
      return;
    }
    if (selectedMode.value === 'fixture_error') {
      throw new Error('Fixture mode: simulated heatmap fetch failure.');
    }

    const source = resolveFailoverInsightsDataSource({
      mode: selectedMode.value,
      latestApiStatusCode: latestApiStatusCode.value,
    });

    if (source === 'fixture') {
      applyFixtureHeatmap(selectedMode.value);
      return;
    }

    if (!hasAuth()) {
      throw new Error('Internal auth token is required in API mode.');
    }
    if (!merchantId.value.trim()) {
      throw new Error('Merchant ID is required in API mode.');
    }

    const query = new URLSearchParams({
      merchantId: merchantId.value.trim(),
      timeframeHours: String(Math.max(1, timeframeHours.value || 24)),
    });

    const payload = await request<ObservabilityResponse>(
      `/payments/observability?${query.toString()}`,
      { headers: authHeaders() },
    );

    heatmapRows.value = normalizeHeatmapFromApi(payload);
    latestApiStatusCode.value = undefined;
  } catch (error: any) {
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : undefined;
    latestApiStatusCode.value = statusCode;

    if (resolveFailoverInsightsDataSource({ mode: selectedMode.value, latestApiStatusCode: statusCode }) === 'fixture') {
      applyFixtureHeatmap('fixture_success');
      heatmapState.error = '';
    } else {
      heatmapRows.value = [];
      heatmapState.error = error?.message || 'Unable to load provider health heatmap.';
    }
  } finally {
    heatmapState.loading = false;
  }
}

async function loadTimelinePanel() {
  timelineState.loading = true;
  timelineState.error = '';

  try {
    if (selectedMode.value === 'fixture_loading') {
      await wait(700);
      timelineRows.value = [];
      return;
    }
    if (selectedMode.value === 'fixture_error') {
      throw new Error('Fixture mode: simulated failover timeline fetch failure.');
    }

    const source = resolveFailoverInsightsDataSource({
      mode: selectedMode.value,
      latestApiStatusCode: latestApiStatusCode.value,
    });

    if (source === 'fixture') {
      applyFixtureTimeline(selectedMode.value);
      return;
    }

    if (!hasAuth()) {
      throw new Error('Internal auth token is required in API mode.');
    }
    if (!merchantId.value.trim()) {
      throw new Error('Merchant ID is required in API mode.');
    }

    const query = new URLSearchParams({
      merchantId: merchantId.value.trim(),
      timeframeHours: String(Math.max(1, timeframeHours.value || 24)),
    });

    const payload = await request<ObservabilityResponse>(
      `/payments/observability?${query.toString()}`,
      { headers: authHeaders() },
    );

    timelineRows.value = normalizeIncidentFromApi(payload);
    latestApiStatusCode.value = undefined;
  } catch (error: any) {
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : undefined;
    latestApiStatusCode.value = statusCode;

    if (resolveFailoverInsightsDataSource({ mode: selectedMode.value, latestApiStatusCode: statusCode }) === 'fixture') {
      applyFixtureTimeline('fixture_success');
      timelineState.error = '';
    } else {
      timelineRows.value = [];
      timelineState.error = error?.message || 'Unable to load failover timeline.';
    }
  } finally {
    timelineState.loading = false;
  }
}

async function loadInsightsBoard() {
  await Promise.all([loadHeatmapPanel(), loadTimelinePanel()]);
}

async function retryHeatmap() {
  heatmapRetryCount.value = nextFailoverRetryAttempt(heatmapRetryCount.value);
  await loadHeatmapPanel();
}

async function retryTimeline() {
  timelineRetryCount.value = nextFailoverRetryAttempt(timelineRetryCount.value);
  await loadTimelinePanel();
}

onMounted(() => {
  void loadInsightsBoard();
});
</script>

<template>
  <main class="page">
    <section class="hero">
      <h1>Provider Failover Insights Board</h1>
      <p>Deterministic health heatmap and incident timeline for failover operations on desktop and mobile.</p>
      <div class="inline-actions">
        <NuxtLink class="button-link" to="/">Open Legacy Control Tower</NuxtLink>
        <NuxtLink class="button-link" to="/payment-operations-dashboard">Open Payment Operations Dashboard</NuxtLink>
        <NuxtLink class="button-link" to="/payment-reconciliation-workspace">Open Reconciliation Workspace</NuxtLink>
      </div>
    </section>

    <section class="card">
      <h2>Board Controls</h2>
      <form class="grid" @submit.prevent="loadInsightsBoard">
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
          Merchant ID
          <input v-model="merchantId" type="text" placeholder="merchant_id" />
        </label>
        <label>
          Timeframe (hours)
          <input v-model.number="timeframeHours" type="number" min="1" step="1" />
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
        <button type="submit" :disabled="heatmapState.loading || timelineState.loading">
          {{ heatmapState.loading || timelineState.loading ? 'Refreshing...' : 'Refresh Insights Board' }}
        </button>
      </form>
    </section>

    <section class="card">
      <h2>Deterministic Filters</h2>
      <div class="grid">
        <label>
          Provider
          <select v-model="filters.provider">
            <option v-for="provider in providerOptions" :key="provider" :value="provider">{{ provider }}</option>
          </select>
        </label>
        <label>
          Region
          <select v-model="filters.region">
            <option v-for="region in regionOptions" :key="region" :value="region">{{ region }}</option>
          </select>
        </label>
        <label>
          Incident status
          <select v-model="filters.status">
            <option value="all">all</option>
            <option value="detected">detected</option>
            <option value="investigating">investigating</option>
            <option value="mitigated">mitigated</option>
          </select>
        </label>
      </div>
    </section>

    <section class="card">
      <h2>Provider Health Heatmap</h2>
      <p class="state" :class="{ error: heatmapViewState.key === 'error' }">{{ heatmapViewState.message }}</p>
      <div v-if="heatmapViewState.showRetry" class="inline-actions compact">
        <button type="button" @click="retryHeatmap">Retry Heatmap Fetch</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Region</th>
              <th>Availability Score</th>
              <th>Circuit</th>
              <th>Failover Events</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="heatmapViewState.key !== 'ready'">
              <td colspan="5">{{ heatmapViewState.message }}</td>
            </tr>
            <tr v-for="row in filteredHeatmapRows" :key="`${row.provider}-${row.region}`">
              <td><code>{{ row.provider }}</code></td>
              <td>{{ row.region }}</td>
              <td :class="scoreToneClass(row.availabilityScore)">{{ row.availabilityScore.toFixed(1) }}%</td>
              <td><span class="status-pill">{{ row.circuitState }}</span></td>
              <td>{{ row.failoverEvents }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <h2>Incident Timeline</h2>
      <p class="state" :class="{ error: timelineViewState.key === 'error' }">{{ timelineViewState.message }}</p>
      <div v-if="timelineViewState.showRetry" class="inline-actions compact">
        <button type="button" @click="retryTimeline">Retry Timeline Fetch</button>
      </div>

      <ul class="timeline-list">
        <li v-if="timelineViewState.key !== 'ready'">{{ timelineViewState.message }}</li>
        <li v-for="row in filteredTimelineRows" :key="row.id">
          <div class="timeline-row-top">
            <strong>{{ formatDateTime(row.occurredAt) }}</strong>
            <div class="inline-actions compact">
              <span :class="statusBadgeClass(row.status)">{{ row.status }}</span>
              <span :class="retryBadgeClass(row.retryOutcome)">{{ retryOutcomeLabel(row.retryOutcome) }}</span>
            </div>
          </div>
          <p><strong>Provider:</strong> {{ row.provider }} | <strong>Region:</strong> {{ row.region }}</p>
          <p><strong>Root Cause:</strong> {{ row.rootCause }}</p>
          <p><strong>Summary:</strong> {{ row.summary }}</p>
        </li>
      </ul>
    </section>
  </main>
</template>
