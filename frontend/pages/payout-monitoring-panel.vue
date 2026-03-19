<script setup lang="ts">
import {
  buildQueueHealthCards,
  buildRetryAuditTimeline,
  buildPayoutSectionViewState,
  nextPayoutRetryAttempt,
  resolvePayoutMonitoringDataSource,
  sortPayoutRowsDeterministic,
  type PayoutDataMode,
  type PayoutQueueRow,
  type RetryAuditTimelineEvent,
} from '../utils/payoutMonitoringPanel';

const { request } = useGatewayApi();

type InternalRole = 'admin' | 'ops' | 'support';
type TimelineApiResponse = {
  events?: Array<{
    id?: string;
    occurredAt?: string;
    status?: string;
    stage?: string;
    actor?: string;
    note?: string;
  }>;
};

const auth = reactive({
  internalToken: '',
  actorRole: 'admin' as InternalRole,
});

const selectedMode = ref<PayoutDataMode>('api');
const latestApiStatusCode = ref<number | undefined>(undefined);
const selectedReference = ref('');

const queueState = reactive({ loading: false, error: '' });
const timelineState = reactive({ loading: false, error: '' });

const queueRetryCount = ref(0);
const timelineRetryCount = ref(0);

const queueRows = ref<PayoutQueueRow[]>([]);
const timelineEvents = ref<RetryAuditTimelineEvent[]>([]);

const fixtureQueueRows: PayoutQueueRow[] = [
  {
    reference: 'pay_out_001',
    merchantId: 'mrc_payout_alpha',
    status: 'CREATED',
    amount: '1400.00',
    currency: 'THB',
    createdAt: '2026-03-19T07:05:00.000Z',
    queueState: 'queued',
    retryCount: 0,
  },
  {
    reference: 'pay_out_002',
    merchantId: 'mrc_payout_bravo',
    status: 'PENDING',
    amount: '980.00',
    currency: 'THB',
    createdAt: '2026-03-19T08:10:00.000Z',
    queueState: 'processing',
    retryCount: 0,
  },
  {
    reference: 'pay_out_003',
    merchantId: 'mrc_payout_charlie',
    status: 'FAILED',
    amount: '620.00',
    currency: 'THB',
    createdAt: '2026-03-19T06:00:00.000Z',
    queueState: 'failed',
    retryCount: 1,
  },
  {
    reference: 'pay_out_004',
    merchantId: 'mrc_payout_delta',
    status: 'PENDING',
    amount: '700.00',
    currency: 'THB',
    createdAt: '2026-03-19T09:15:00.000Z',
    queueState: 'retried',
    retryCount: 2,
  },
];

const fixtureTimelineByReference: Record<string, RetryAuditTimelineEvent[]> = {
  pay_out_001: [
    {
      id: 'payout-001-1',
      payoutReference: 'pay_out_001',
      occurredAt: '2026-03-19T07:05:12.000Z',
      status: 'completed',
      stage: 'Payout queued',
      actor: 'workflow',
      note: 'Payout accepted into outbound queue.',
    },
  ],
  pay_out_002: [
    {
      id: 'payout-002-1',
      payoutReference: 'pay_out_002',
      occurredAt: '2026-03-19T08:10:05.000Z',
      status: 'completed',
      stage: 'Payout queued',
      actor: 'workflow',
      note: 'Payout queued for processor handoff.',
    },
    {
      id: 'payout-002-2',
      payoutReference: 'pay_out_002',
      occurredAt: '2026-03-19T08:11:30.000Z',
      status: 'pending',
      stage: 'Processing started',
      actor: 'gateway',
      note: 'Processor acknowledged payout task.',
    },
  ],
  pay_out_003: [
    {
      id: 'payout-003-1',
      payoutReference: 'pay_out_003',
      occurredAt: '2026-03-19T06:00:11.000Z',
      status: 'completed',
      stage: 'Payout queued',
      actor: 'workflow',
      note: 'Payout queued.',
    },
    {
      id: 'payout-003-2',
      payoutReference: 'pay_out_003',
      occurredAt: '2026-03-19T06:03:20.000Z',
      status: 'failed',
      stage: 'Processing failed',
      actor: 'provider',
      note: 'Provider timeout during processing.',
    },
    {
      id: 'payout-003-3',
      payoutReference: 'pay_out_003',
      occurredAt: '2026-03-19T06:04:03.000Z',
      status: 'info',
      stage: 'Retry scheduled',
      actor: 'gateway',
      note: 'Automatic retry scheduled after transient error.',
    },
  ],
  pay_out_004: [
    {
      id: 'payout-004-1',
      payoutReference: 'pay_out_004',
      occurredAt: '2026-03-19T09:15:05.000Z',
      status: 'completed',
      stage: 'Payout queued',
      actor: 'workflow',
      note: 'Payout accepted into outbound queue.',
    },
    {
      id: 'payout-004-2',
      payoutReference: 'pay_out_004',
      occurredAt: '2026-03-19T09:17:10.000Z',
      status: 'failed',
      stage: 'Processing failed',
      actor: 'provider',
      note: 'Transient gateway error.',
    },
    {
      id: 'payout-004-3',
      payoutReference: 'pay_out_004',
      occurredAt: '2026-03-19T09:17:42.000Z',
      status: 'info',
      stage: 'Retry scheduled',
      actor: 'gateway',
      note: 'Retry scheduled after backoff window.',
    },
    {
      id: 'payout-004-4',
      payoutReference: 'pay_out_004',
      occurredAt: '2026-03-19T09:18:25.000Z',
      status: 'completed',
      stage: 'Retry attempt sent',
      actor: 'gateway',
      note: 'Retry dispatched to payout provider.',
    },
  ],
};

const sortedQueueRows = computed(() => sortPayoutRowsDeterministic(queueRows.value));
const queueHealthCards = computed(() => buildQueueHealthCards(sortedQueueRows.value));
const sortedTimeline = computed(() => buildRetryAuditTimeline(timelineEvents.value));

const queueViewState = computed(() => buildPayoutSectionViewState({
  loading: queueState.loading,
  error: queueState.error,
  itemCount: sortedQueueRows.value.length,
  loadingMessage: 'Loading payout queue health panel...',
  emptyMessage: 'No payout rows found for this mode/filter.',
  readyMessage: `${sortedQueueRows.value.length} payout row(s) loaded. Retry count: ${queueRetryCount.value}.`,
}));

const timelineViewState = computed(() => buildPayoutSectionViewState({
  loading: timelineState.loading,
  error: timelineState.error,
  itemCount: sortedTimeline.value.length,
  loadingMessage: 'Loading retry audit timeline...',
  emptyMessage: 'Select a payout reference to view retry audit timeline events.',
  readyMessage: `${sortedTimeline.value.length} timeline event(s) loaded. Retry count: ${timelineRetryCount.value}.`,
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

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function statusBadgeClass(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === 'PAID' || normalized === 'COMPLETED') return 'status-pill ok';
  if (normalized === 'FAILED') return 'status-pill danger';
  if (normalized === 'PENDING' || normalized === 'CREATED' || normalized === 'INFO') return 'status-pill warn';
  return 'status-pill';
}

function kpiToneClass(tone: 'neutral' | 'warn' | 'danger' | 'ok') {
  if (tone === 'ok') return 'state-healthy';
  if (tone === 'danger') return 'state-critical';
  if (tone === 'warn') return 'state-degraded';
  return 'state-unknown';
}

function normalizePayoutRow(payload: any): PayoutQueueRow {
  const rawStatus = String(payload.status || 'CREATED').toUpperCase();
  const mappedStatus = rawStatus === 'WITHDRAW' ? 'CREATED' : rawStatus;
  return {
    reference: String(payload.reference || ''),
    merchantId: String(payload.merchantId || ''),
    status: mappedStatus,
    amount: String(payload.amount || '0'),
    currency: String(payload.currency || 'THB'),
    createdAt: String(payload.createdAt || new Date(0).toISOString()),
    retryCount: Number(payload.retryCount || 0),
  };
}

function normalizeTimelineEvent(reference: string, payload: any, index: number): RetryAuditTimelineEvent {
  return {
    id: String(payload.id || `${reference}-timeline-${index + 1}`),
    payoutReference: reference,
    occurredAt: String(payload.occurredAt || new Date(0).toISOString()),
    status: String(payload.status || 'info'),
    stage: String(payload.stage || 'Unknown stage'),
    actor: String(payload.actor || 'system'),
    note: String(payload.note || ''),
  };
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function applyFixtureQueueRows(mode: PayoutDataMode) {
  queueRows.value = mode === 'fixture_empty' ? [] : fixtureQueueRows;
  if (queueRows.value.length === 0) {
    selectedReference.value = '';
    timelineEvents.value = [];
    return;
  }
  if (!selectedReference.value || !queueRows.value.some((row) => row.reference === selectedReference.value)) {
    selectedReference.value = queueRows.value[0].reference;
  }
}

function applyFixtureTimeline(reference: string, mode: PayoutDataMode) {
  timelineEvents.value = mode === 'fixture_empty'
    ? []
    : fixtureTimelineByReference[reference] ?? [];
}

async function loadQueuePanel() {
  queueState.loading = true;
  queueState.error = '';

  try {
    if (selectedMode.value === 'fixture_loading') {
      await wait(650);
      queueRows.value = [];
      return;
    }
    if (selectedMode.value === 'fixture_error') {
      throw new Error('Fixture mode: simulated payout queue fetch failure.');
    }

    const source = resolvePayoutMonitoringDataSource({
      mode: selectedMode.value,
      latestApiStatusCode: latestApiStatusCode.value,
    });
    if (source === 'fixture') {
      applyFixtureQueueRows(selectedMode.value);
      return;
    }

    if (!hasAuth()) {
      throw new Error('Internal auth token is required in API mode.');
    }

    const rows = await request<any[]>('/payments?type=WITHDRAW&take=200', { headers: authHeaders() });
    queueRows.value = Array.isArray(rows)
      ? rows.map((row) => normalizePayoutRow(row))
      : [];

    latestApiStatusCode.value = undefined;

    if (queueRows.value.length > 0) {
      const first = sortPayoutRowsDeterministic(queueRows.value)[0];
      if (!selectedReference.value || !queueRows.value.some((row) => row.reference === selectedReference.value)) {
        selectedReference.value = first.reference;
      }
    } else {
      selectedReference.value = '';
      timelineEvents.value = [];
    }
  } catch (error: any) {
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : undefined;
    latestApiStatusCode.value = statusCode;
    if (resolvePayoutMonitoringDataSource({ mode: selectedMode.value, latestApiStatusCode: statusCode }) === 'fixture') {
      applyFixtureQueueRows('fixture_success');
      queueState.error = '';
    } else {
      queueRows.value = [];
      selectedReference.value = '';
      timelineEvents.value = [];
      queueState.error = error?.message || 'Unable to load payout queue panel.';
    }
  } finally {
    queueState.loading = false;
  }
}

async function loadRetryAuditTimeline(reference: string) {
  selectedReference.value = reference;
  timelineState.loading = true;
  timelineState.error = '';

  try {
    if (!reference) {
      timelineEvents.value = [];
      return;
    }
    if (selectedMode.value === 'fixture_loading') {
      await wait(650);
      timelineEvents.value = [];
      return;
    }
    if (selectedMode.value === 'fixture_error') {
      throw new Error(`Fixture mode: simulated retry timeline fetch failure for ${reference}.`);
    }

    const source = resolvePayoutMonitoringDataSource({
      mode: selectedMode.value,
      latestApiStatusCode: latestApiStatusCode.value,
    });
    if (source === 'fixture') {
      applyFixtureTimeline(reference, selectedMode.value);
      return;
    }

    if (!hasAuth()) {
      throw new Error('Internal auth token is required in API mode.');
    }

    const response = await request<TimelineApiResponse>(`/payments/${reference}/attempt-timeline`, {
      headers: authHeaders(),
    });

    timelineEvents.value = Array.isArray(response?.events)
      ? response.events.map((row, index) => normalizeTimelineEvent(reference, row, index))
      : [];

    latestApiStatusCode.value = undefined;
  } catch (error: any) {
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : undefined;
    latestApiStatusCode.value = statusCode;
    if (resolvePayoutMonitoringDataSource({ mode: selectedMode.value, latestApiStatusCode: statusCode }) === 'fixture') {
      applyFixtureTimeline(reference, 'fixture_success');
      timelineState.error = '';
    } else {
      timelineEvents.value = [];
      timelineState.error = error?.message || 'Unable to load retry audit timeline.';
    }
  } finally {
    timelineState.loading = false;
  }
}

async function loadWorkspace() {
  await loadQueuePanel();
  if (selectedReference.value) {
    await loadRetryAuditTimeline(selectedReference.value);
  }
}

async function retryQueuePanel() {
  queueRetryCount.value = nextPayoutRetryAttempt(queueRetryCount.value);
  await loadQueuePanel();
  if (selectedReference.value) {
    await loadRetryAuditTimeline(selectedReference.value);
  }
}

async function retryTimeline() {
  timelineRetryCount.value = nextPayoutRetryAttempt(timelineRetryCount.value);
  await loadRetryAuditTimeline(selectedReference.value);
}

onMounted(() => {
  void loadWorkspace();
});
</script>

<template>
  <main class="page payout-monitoring-page">
    <section class="hero">
      <h1>Payout Monitoring Panel</h1>
      <p>Queue health cards with deterministic ordering plus retry audit timeline by payout reference.</p>
      <div class="inline-actions">
        <NuxtLink class="button-link" to="/">Open Legacy Control Tower</NuxtLink>
        <NuxtLink class="button-link" to="/payment-operations-dashboard">Open Payment Operations Dashboard</NuxtLink>
        <NuxtLink class="button-link" to="/payment-reconciliation-workspace">Open Reconciliation Workspace</NuxtLink>
      </div>
    </section>

    <section class="card">
      <h2>Panel Controls</h2>
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
          Data mode
          <select v-model="selectedMode">
            <option value="api">api</option>
            <option value="fixture_success">fixture_success</option>
            <option value="fixture_loading">fixture_loading</option>
            <option value="fixture_empty">fixture_empty</option>
            <option value="fixture_error">fixture_error</option>
          </select>
        </label>
        <button type="submit" :disabled="queueState.loading || timelineState.loading">
          {{ queueState.loading || timelineState.loading ? 'Refreshing...' : 'Refresh Panel' }}
        </button>
      </form>
    </section>

    <section class="card">
      <h2>Queue Health</h2>
      <p class="state" :class="{ error: queueViewState.key === 'error' }">{{ queueViewState.message }}</p>
      <div v-if="queueViewState.showRetry" class="inline-actions compact">
        <button type="button" @click="retryQueuePanel">Retry Queue Fetch</button>
      </div>

      <div class="kpi-row">
        <article v-for="card in queueHealthCards" :key="card.key">
          <strong>{{ card.label }}</strong>
          <p :class="kpiToneClass(card.tone)">{{ card.value }}</p>
        </article>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Merchant</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Retry Count</th>
              <th>Created</th>
              <th>Timeline</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="queueViewState.key !== 'ready'">
              <td colspan="7">{{ queueViewState.message }}</td>
            </tr>
            <tr v-for="row in sortedQueueRows" :key="row.reference">
              <td><code>{{ row.reference }}</code></td>
              <td>{{ row.merchantId }}</td>
              <td><span :class="statusBadgeClass(row.status)">{{ row.status }}</span></td>
              <td>{{ row.amount }} {{ row.currency }}</td>
              <td>{{ row.retryCount ?? 0 }}</td>
              <td>{{ formatDateTime(row.createdAt) }}</td>
              <td>
                <button
                  type="button"
                  class="link"
                  :disabled="timelineState.loading"
                  @click="loadRetryAuditTimeline(row.reference)"
                >
                  {{ timelineState.loading && selectedReference === row.reference ? 'Loading...' : 'View timeline' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <h2>Retry Audit Timeline</h2>
      <p class="state" :class="{ error: timelineViewState.key === 'error' }">{{ timelineViewState.message }}</p>
      <div v-if="timelineViewState.showRetry" class="inline-actions compact">
        <button type="button" :disabled="!selectedReference" @click="retryTimeline">Retry Timeline Fetch</button>
      </div>

      <p class="state" v-if="selectedReference"><strong>Selected payout:</strong> <code>{{ selectedReference }}</code></p>

      <ul class="timeline-list" v-if="sortedTimeline.length">
        <li v-for="event in sortedTimeline" :key="event.id">
          <div class="timeline-row-top">
            <span :class="statusBadgeClass(event.status)">{{ event.status }}</span>
            <strong>{{ formatDateTime(event.occurredAt) }}</strong>
          </div>
          <p><strong>{{ event.stage }}</strong></p>
          <small>Actor: {{ event.actor }}</small>
          <p>{{ event.note }}</p>
        </li>
      </ul>
      <p v-else class="state">No retry timeline events to render.</p>
    </section>
  </main>
</template>
