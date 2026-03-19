<script setup lang="ts">
import {
  deriveSettlementExceptionSeverity,
  sortExceptionsDeterministic,
  type SettlementExceptionInboxRow,
  type SettlementExceptionStatus,
} from '../utils/settlementExceptionsInbox';
import {
  applyCommandSuccessTransition,
  buildActivityTimelineViewState,
  buildCommandIdempotencyKey,
  buildFixtureActivityTimelinePage,
  buildOperatorWorkbenchViewState,
  createSettlementExceptionActivityTimelineClient,
  createSettlementExceptionCommandClient,
  resolveActivityReasonCodeLabel,
  resolveActivityTimelineErrorRail,
  resolveCommandOutcomeRail,
  resolveCommandRailMessage,
  resolveOperatorWorkbenchDataSource,
  sortActivityTimelineDeterministic,
  shouldBlockDuplicateCommand,
  type ActivityTimelineErrorRail,
  type CommandOutcomeRail,
  type ExceptionCommandAction,
  type OperatorWorkbenchMode,
  type SettlementExceptionActivityEvent,
} from '../utils/settlementExceptionsOperatorWorkbench';

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

const auth = reactive({
  internalToken: '',
  actorRole: 'ops' as ActorRole,
});

const mode = ref<OperatorWorkbenchMode>('api');
const listState = reactive({ loading: false, error: '' });
const actionState = reactive({ loading: false, rail: 'idle' as CommandOutcomeRail, message: '' });
const timelineState = reactive({
  loading: false,
  rail: 'none' as ActivityTimelineErrorRail,
});

const latestApiStatusCode = ref<number | undefined>(undefined);
const latestTimelineApiStatusCode = ref<number | undefined>(undefined);
const rows = ref<SettlementExceptionInboxRow[]>([]);
const selectedExceptionId = ref('');
const retryCount = ref(0);
const timelineRetryCount = ref(0);
const inflightKeys = ref<Set<string>>(new Set());
const timelineRows = ref<SettlementExceptionActivityEvent[]>([]);
const timelineCurrentCursor = ref<string | null>(null);
const timelineNextCursor = ref<string | null>(null);
const timelineCursorHistory = ref<Array<string | null>>([]);
const timelineLimit = 2;
const form = reactive({
  reason: 'triage_started',
  note: '',
  owner: '',
});

const fixtureRows: SettlementExceptionInboxRow[] = [
  {
    id: 'se_workbench_001',
    reference: 'se_workbench_001',
    merchantId: 'merchant_demo_alpha',
    providerName: 'mock-a',
    status: 'OPEN',
    severity: 'critical',
    openedReason: 'ledger_provider_mismatch',
    deltaAmount: 1400,
    windowDate: '2026-03-19',
    createdAt: '2026-03-19T06:30:00.000Z',
    updatedAt: '2026-03-19T06:30:00.000Z',
    version: 4,
  },
  {
    id: 'se_workbench_002',
    reference: 'se_workbench_002',
    merchantId: 'merchant_demo_bravo',
    providerName: 'mock-b',
    status: 'INVESTIGATING',
    severity: 'high',
    openedReason: 'callback_gap',
    deltaAmount: 380,
    windowDate: '2026-03-19',
    createdAt: '2026-03-19T07:15:00.000Z',
    updatedAt: '2026-03-19T08:20:00.000Z',
    version: 6,
  },
];

const fixtureTimelineByException: Record<string, SettlementExceptionActivityEvent[]> = {
  se_workbench_001: [
    {
      id: 'fx_evt_003',
      eventType: 'exception_mark_resolved',
      actorType: 'operator',
      reasonCode: 'resolved_after_manual_review',
      fromStatus: 'INVESTIGATING',
      toStatus: 'RESOLVED',
      occurredAt: '2026-03-19T09:20:00.000Z',
    },
    {
      id: 'fx_evt_002',
      eventType: 'exception_acknowledged',
      actorType: 'operator',
      reasonCode: 'investigation_started',
      fromStatus: 'OPEN',
      toStatus: 'INVESTIGATING',
      occurredAt: '2026-03-19T09:10:00.000Z',
    },
    {
      id: 'fx_evt_001',
      eventType: 'exception_opened',
      actorType: 'system',
      reasonCode: 'ledger_provider_mismatch',
      fromStatus: null,
      toStatus: 'OPEN',
      occurredAt: '2026-03-19T09:00:00.000Z',
    },
  ],
  se_workbench_002: [
    {
      id: 'fx_evt_006',
      eventType: 'exception_acknowledged',
      actorType: 'operator',
      reasonCode: 'investigation_started',
      fromStatus: 'OPEN',
      toStatus: 'INVESTIGATING',
      occurredAt: '2026-03-19T08:30:00.000Z',
    },
    {
      id: 'fx_evt_005',
      eventType: 'exception_opened',
      actorType: 'system',
      reasonCode: 'callback_gap',
      fromStatus: null,
      toStatus: 'OPEN',
      occurredAt: '2026-03-19T08:20:00.000Z',
    },
  ],
};

const reasonCodeMap = [
  { command: 'acknowledge', reasonCode: 'triage_started', note: 'Move OPEN -> INVESTIGATING.' },
  { command: 'assign', reasonCode: 'owner_assignment', note: 'Set owner handoff and keep INVESTIGATING.' },
  { command: 'resolve', reasonCode: 'provider_report_reconciled', note: 'Mark terminal RESOLVED once reconciled.' },
] as const;

const commandClient = createSettlementExceptionCommandClient(request, authHeaders);
const timelineClient = createSettlementExceptionActivityTimelineClient(request, authHeaders);

const sortedRows = computed(() => sortExceptionsDeterministic(rows.value));
const selectedRow = computed(() => sortedRows.value.find((row) => row.id === selectedExceptionId.value) ?? null);
const workbenchViewState = computed(() => buildOperatorWorkbenchViewState({
  loading: listState.loading,
  error: listState.error,
  rows: sortedRows.value,
  loadingMessage: 'Loading settlement exceptions workbench...',
  emptyMessage: 'No settlement exceptions available for command execution.',
  readyMessage: `${sortedRows.value.length} exception row(s) ready. Retry count: ${retryCount.value}.`,
}));
const timelineViewState = computed(() => buildActivityTimelineViewState({
  loading: timelineState.loading,
  rail: timelineState.rail,
  eventCount: timelineRows.value.length,
  loadingMessage: 'Loading exception activity timeline...',
  emptyMessage: 'No activity events found for this settlement exception.',
  readyMessage: `Timeline page ${timelineCursorHistory.value.length + 1} loaded with ${timelineRows.value.length} event(s). Retry count: ${timelineRetryCount.value}.`,
}));
const timelineCanPrev = computed(() => timelineCursorHistory.value.length > 0 && !timelineState.loading);
const timelineCanNext = computed(() => Boolean(timelineNextCursor.value) && !timelineState.loading);

function authHeaders() {
  return {
    'x-internal-token': auth.internalToken.trim(),
    'x-actor-role': auth.actorRole,
  };
}

function hasAuth() {
  return Boolean(auth.internalToken.trim());
}

function normalizeStatus(raw: unknown): SettlementExceptionStatus {
  const value = String(raw || 'OPEN').toUpperCase();
  if (value === 'INVESTIGATING' || value === 'RESOLVED' || value === 'IGNORED') return value;
  return 'OPEN';
}

function toRow(payload: any): SettlementExceptionInboxRow {
  const deltaAmount = Number(payload?.deltaAmount ?? 0);
  const createdAt = String(payload?.createdAt || new Date(0).toISOString());
  const id = String(payload?.id || '');
  return {
    id,
    reference: id,
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

function statusClass(status: SettlementExceptionStatus) {
  if (status === 'RESOLVED') return 'status-pill ok';
  if (status === 'OPEN') return 'status-pill danger';
  if (status === 'INVESTIGATING') return 'status-pill warn';
  return 'status-pill';
}

function railClass(rail: CommandOutcomeRail) {
  if (rail === 'success') return 'state success';
  if (rail === 'idle') return 'state';
  if (rail === 'loading') return 'state';
  return 'state error';
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function toTimelineEvent(payload: any): SettlementExceptionActivityEvent | null {
  const id = String(payload?.id || '').trim();
  const occurredAt = String(payload?.occurredAt || '').trim();
  const actorType = String(payload?.actorType || '').trim().toLowerCase();
  const toStatus = normalizeStatus(payload?.toStatus);
  if (!id || !occurredAt || Number.isNaN(new Date(occurredAt).getTime())) return null;
  return {
    id,
    eventType: String(payload?.eventType || 'exception_status_updated'),
    actorType: actorType === 'system' || actorType === 'merchant' ? actorType : 'operator',
    reasonCode: String(payload?.reasonCode || ''),
    fromStatus: payload?.fromStatus ? normalizeStatus(payload?.fromStatus) : null,
    toStatus,
    occurredAt,
  };
}

function resetTimelineCursor() {
  timelineCurrentCursor.value = null;
  timelineNextCursor.value = null;
  timelineCursorHistory.value = [];
}

function clearTimeline() {
  resetTimelineCursor();
  timelineRows.value = [];
  timelineState.rail = 'none';
}

function resolveFixtureTimelineEvents(exceptionId: string): SettlementExceptionActivityEvent[] {
  if (mode.value === 'fixture_empty') return [];
  return fixtureTimelineByException[exceptionId] ?? fixtureTimelineByException.se_workbench_001;
}

function applyTimelinePage(payload: {
  data: SettlementExceptionActivityEvent[];
  nextCursor: string | null;
}) {
  timelineRows.value = sortActivityTimelineDeterministic(payload.data);
  timelineNextCursor.value = payload.nextCursor;
  timelineState.rail = 'none';
}

async function loadActivityTimelinePage(cursor: string | null) {
  if (!selectedRow.value) {
    clearTimeline();
    return;
  }

  timelineState.loading = true;
  timelineState.rail = 'none';

  try {
    if (mode.value === 'fixture_loading') {
      await wait(600);
    }

    if (mode.value === 'fixture_timeline_invalid_cursor') {
      timelineState.rail = 'invalid_cursor';
      timelineRows.value = [];
      timelineNextCursor.value = null;
      return;
    }
    if (mode.value === 'fixture_timeline_stale_cursor') {
      timelineState.rail = 'stale_cursor';
      timelineRows.value = [];
      timelineNextCursor.value = null;
      return;
    }
    if (mode.value === 'fixture_timeline_error') {
      timelineState.rail = 'fetch_failed';
      timelineRows.value = [];
      timelineNextCursor.value = null;
      return;
    }

    const source = resolveOperatorWorkbenchDataSource({
      mode: mode.value,
      latestApiStatusCode: latestTimelineApiStatusCode.value,
    });

    if (source === 'fixture') {
      const fixturePage = buildFixtureActivityTimelinePage({
        events: resolveFixtureTimelineEvents(selectedRow.value.id),
        cursor,
        limit: timelineLimit,
      });
      timelineState.rail = fixturePage.rail;
      timelineRows.value = fixturePage.data;
      timelineNextCursor.value = fixturePage.nextCursor;
      return;
    }

    if (!hasAuth()) {
      timelineState.rail = 'fetch_failed';
      return;
    }

    const response = await timelineClient.list({
      exceptionId: selectedRow.value.id,
      limit: timelineLimit,
      cursor: cursor || undefined,
      mode: 'live',
    });

    const payloadRows = Array.isArray(response?.data)
      ? response.data.map((row) => toTimelineEvent(row)).filter((row): row is SettlementExceptionActivityEvent => Boolean(row))
      : null;
    const nextCursor = typeof response?.pageInfo?.nextCursor === 'string' ? response.pageInfo.nextCursor : null;

    if (response?.contract !== 'settlement-exception-activity-timeline.v1' || !payloadRows) {
      throw new Error('Unexpected timeline response contract.');
    }

    latestTimelineApiStatusCode.value = undefined;
    applyTimelinePage({ data: payloadRows, nextCursor });
  } catch (error: any) {
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : undefined;
    latestTimelineApiStatusCode.value = statusCode;

    const source = resolveOperatorWorkbenchDataSource({
      mode: mode.value,
      latestApiStatusCode: statusCode,
    });
    if (source === 'fixture') {
      const fixturePage = buildFixtureActivityTimelinePage({
        events: resolveFixtureTimelineEvents(selectedRow.value.id),
        cursor,
        limit: timelineLimit,
      });
      timelineState.rail = fixturePage.rail;
      timelineRows.value = fixturePage.data;
      timelineNextCursor.value = fixturePage.nextCursor;
    } else {
      timelineState.rail = resolveActivityTimelineErrorRail(error);
      timelineRows.value = [];
      timelineNextCursor.value = null;
    }
  } finally {
    timelineState.loading = false;
  }
}

async function loadActivityTimelineFirstPage() {
  resetTimelineCursor();
  await loadActivityTimelinePage(null);
}

async function loadActivityTimelineNextPage() {
  if (!timelineNextCursor.value || timelineState.loading) return;
  const nextCursor = timelineNextCursor.value;
  const nextHistory = [...timelineCursorHistory.value, timelineCurrentCursor.value];
  await loadActivityTimelinePage(nextCursor);
  if (timelineState.rail === 'none') {
    timelineCursorHistory.value = nextHistory;
    timelineCurrentCursor.value = nextCursor;
  }
}

async function loadActivityTimelinePreviousPage() {
  if (timelineCursorHistory.value.length === 0 || timelineState.loading) return;
  const history = [...timelineCursorHistory.value];
  const previousCursor = history.pop() ?? null;
  await loadActivityTimelinePage(previousCursor);
  if (timelineState.rail === 'none') {
    timelineCursorHistory.value = history;
    timelineCurrentCursor.value = previousCursor;
  }
}

async function retryTimeline() {
  timelineRetryCount.value += 1;
  await loadActivityTimelinePage(timelineCurrentCursor.value);
}

async function loadWorkbench() {
  listState.loading = true;
  listState.error = '';

  try {
    if (mode.value === 'fixture_loading') {
      await wait(700);
      rows.value = fixtureRows;
      return;
    }
    if (mode.value === 'fixture_empty') {
      rows.value = [];
      selectedExceptionId.value = '';
      clearTimeline();
      return;
    }

    const source = resolveOperatorWorkbenchDataSource({
      mode: mode.value,
      latestApiStatusCode: latestApiStatusCode.value,
    });
    if (source === 'fixture') {
      rows.value = fixtureRows;
      if (!selectedExceptionId.value && rows.value.length > 0) {
        selectedExceptionId.value = rows.value[0].id;
      }
      return;
    }

    if (!hasAuth()) {
      throw new Error('Internal auth token is required in API mode.');
    }

    const response = await request<ExceptionListResponse>('/settlements/exceptions?take=100', { headers: authHeaders() });
    rows.value = Array.isArray(response?.data) ? response.data.map((item) => toRow(item)) : [];
    latestApiStatusCode.value = undefined;
    if (!selectedExceptionId.value && rows.value.length > 0) {
      selectedExceptionId.value = rows.value[0].id;
    }
  } catch (error: any) {
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : undefined;
    latestApiStatusCode.value = statusCode;
    const source = resolveOperatorWorkbenchDataSource({
      mode: mode.value,
      latestApiStatusCode: statusCode,
    });
    if (source === 'fixture') {
      rows.value = fixtureRows;
      listState.error = '';
      if (!selectedExceptionId.value && rows.value.length > 0) {
        selectedExceptionId.value = rows.value[0].id;
      }
    } else {
      rows.value = [];
      selectedExceptionId.value = '';
      clearTimeline();
      listState.error = error?.message || 'Unable to load settlement exceptions.';
    }
  } finally {
    listState.loading = false;
  }
}

function assertCommandInput(action: ExceptionCommandAction) {
  if (!selectedRow.value) {
    actionState.rail = 'backend_validation_error';
    actionState.message = 'Select an exception before sending command actions.';
    return false;
  }
  if (!form.reason.trim()) {
    actionState.rail = 'backend_validation_error';
    actionState.message = 'Reason code is required.';
    return false;
  }
  if (action === 'assign' && !form.owner.trim()) {
    actionState.rail = 'backend_validation_error';
    actionState.message = 'Owner is required for assign command.';
    return false;
  }
  return true;
}

async function runCommand(action: ExceptionCommandAction) {
  if (!assertCommandInput(action) || !selectedRow.value) return;

  const idempotencyKey = buildCommandIdempotencyKey({
    exceptionId: selectedRow.value.id,
    action,
    reason: form.reason,
    owner: action === 'assign' ? form.owner : undefined,
    expectedVersion: selectedRow.value.version,
  });

  if (shouldBlockDuplicateCommand(inflightKeys.value, idempotencyKey)) {
    actionState.rail = 'duplicate_event';
    actionState.message = resolveCommandRailMessage('duplicate_event', action);
    return;
  }

  inflightKeys.value = new Set(inflightKeys.value).add(idempotencyKey);
  actionState.loading = true;
  actionState.rail = 'loading';
  actionState.message = resolveCommandRailMessage('loading', action);

  try {
    if (mode.value === 'fixture_validation_error') {
      actionState.rail = 'backend_validation_error';
      actionState.message = resolveCommandRailMessage('backend_validation_error', action);
      return;
    }
    if (mode.value === 'fixture_stale_conflict') {
      actionState.rail = 'stale_transition_update';
      actionState.message = resolveCommandRailMessage('stale_transition_update', action);
      return;
    }
    if (mode.value === 'fixture_duplicate_event') {
      actionState.rail = 'duplicate_event';
      actionState.message = resolveCommandRailMessage('duplicate_event', action);
      return;
    }

    if (mode.value === 'api') {
      if (!hasAuth()) {
        actionState.rail = 'backend_validation_error';
        actionState.message = 'Internal auth token is required in API mode.';
        return;
      }

      const payload = {
        exceptionId: selectedRow.value.id,
        reason: form.reason.trim(),
        note: form.note.trim(),
        owner: action === 'assign' ? form.owner.trim() : undefined,
        expectedVersion: selectedRow.value.version,
        expectedUpdatedAt: selectedRow.value.updatedAt,
        idempotencyKey,
      };

      if (action === 'acknowledge') {
        await commandClient.acknowledge(payload);
      } else if (action === 'assign') {
        await commandClient.assign(payload);
      } else {
        await commandClient.resolve(payload);
      }

      await loadWorkbench();
    } else {
      const timestamp = new Date().toISOString();
      rows.value = rows.value.map((row) => (row.id === selectedRow.value?.id
        ? applyCommandSuccessTransition(row, action, timestamp)
        : row));
    }

    actionState.rail = 'success';
    actionState.message = resolveCommandRailMessage('success', action);
  } catch (error: any) {
    const rail = resolveCommandOutcomeRail(error);
    actionState.rail = rail;
    actionState.message = resolveCommandRailMessage(rail, action);
  } finally {
    const next = new Set(inflightKeys.value);
    next.delete(idempotencyKey);
    inflightKeys.value = next;
    actionState.loading = false;
  }
}

async function retryWorkbench() {
  retryCount.value += 1;
  await loadWorkbench();
}

watch(selectedExceptionId, async (nextId, prevId) => {
  if (nextId === prevId) return;
  if (!nextId) {
    clearTimeline();
    return;
  }
  await loadActivityTimelineFirstPage();
});

watch(mode, async (nextMode, prevMode) => {
  if (nextMode === prevMode) return;
  clearTimeline();
  if (selectedExceptionId.value) {
    await loadActivityTimelineFirstPage();
  }
});

onMounted(() => {
  void loadWorkbench();
  if (selectedExceptionId.value) {
    void loadActivityTimelineFirstPage();
  }
});
</script>

<template>
  <main class="page settlement-exceptions-operator-workbench-page">
    <section class="hero">
      <h1>Settlement Exceptions Operator Workbench</h1>
      <p>Command-action console with deterministic outcome rails and operator safety guards.</p>
      <div class="inline-actions">
        <NuxtLink class="button-link" to="/payment-operations-dashboard">Open Payment Operations Dashboard</NuxtLink>
        <NuxtLink class="button-link" to="/settlement-exceptions-inbox">Open Settlement Exceptions Inbox</NuxtLink>
        <NuxtLink class="button-link" to="/payment-reconciliation-workspace">Open Reconciliation Workspace</NuxtLink>
      </div>
    </section>

    <section class="card">
      <h2>Workbench Controls</h2>
      <form class="grid" @submit.prevent="loadWorkbench">
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
            <option value="fixture_validation_error">fixture_validation_error</option>
            <option value="fixture_stale_conflict">fixture_stale_conflict</option>
            <option value="fixture_duplicate_event">fixture_duplicate_event</option>
            <option value="fixture_timeline_invalid_cursor">fixture_timeline_invalid_cursor</option>
            <option value="fixture_timeline_stale_cursor">fixture_timeline_stale_cursor</option>
            <option value="fixture_timeline_error">fixture_timeline_error</option>
          </select>
        </label>
        <button type="submit" :disabled="listState.loading">{{ listState.loading ? 'Refreshing...' : 'Refresh Workbench' }}</button>
      </form>

      <p class="state" :class="{ error: workbenchViewState.key === 'error' }">{{ workbenchViewState.message }}</p>
      <div v-if="workbenchViewState.showRetry" class="inline-actions compact">
        <button type="button" @click="retryWorkbench">Retry Workbench Fetch</button>
      </div>
    </section>

    <section class="operations-layout">
      <article class="card">
        <h2>Exception Queue</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Status</th>
                <th>Merchant</th>
                <th>Version</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="workbenchViewState.key !== 'ready'">
                <td colspan="6">{{ workbenchViewState.message }}</td>
              </tr>
              <tr v-for="row in sortedRows" :key="row.id">
                <td><code>{{ row.reference }}</code></td>
                <td><span :class="statusClass(row.status)">{{ row.status }}</span></td>
                <td>{{ row.merchantId }}</td>
                <td>{{ row.version }}</td>
                <td>{{ row.updatedAt }}</td>
                <td>
                  <button
                    type="button"
                    class="link"
                    :disabled="actionState.loading"
                    @click="selectedExceptionId = row.id"
                  >
                    {{ selectedExceptionId === row.id ? 'Selected' : 'Select' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="card">
        <h2>Command Action Rail</h2>
        <p class="state">{{ selectedRow ? `Selected: ${selectedRow.reference}` : 'Select an exception row first.' }}</p>

        <div class="detail-grid">
          <p><strong>Status:</strong> {{ selectedRow?.status || '-' }}</p>
          <p><strong>Version:</strong> {{ selectedRow?.version || '-' }}</p>
          <p><strong>Provider:</strong> {{ selectedRow?.providerName || '-' }}</p>
          <p><strong>Opened reason:</strong> {{ selectedRow?.openedReason || '-' }}</p>
        </div>

        <div class="grid">
          <label>
            Reason code
            <input v-model="form.reason" placeholder="triage_started" />
          </label>
          <label>
            Assign owner
            <input v-model="form.owner" placeholder="ops-user" />
          </label>
          <label>
            Note
            <input v-model="form.note" placeholder="optional operator note" />
          </label>
        </div>

        <div class="inline-actions">
          <button type="button" :disabled="actionState.loading || !selectedRow" @click="runCommand('acknowledge')">
            {{ actionState.loading ? 'Submitting...' : 'Acknowledge' }}
          </button>
          <button type="button" :disabled="actionState.loading || !selectedRow" @click="runCommand('assign')">
            {{ actionState.loading ? 'Submitting...' : 'Assign' }}
          </button>
          <button type="button" :disabled="actionState.loading || !selectedRow" @click="runCommand('resolve')">
            {{ actionState.loading ? 'Submitting...' : 'Resolve' }}
          </button>
        </div>

        <p :class="railClass(actionState.rail)">{{ actionState.message || resolveCommandRailMessage('idle', 'acknowledge') }}</p>

        <h3>Reason Code Mapping</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Command</th>
                <th>Reason Code</th>
                <th>Mapping</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in reasonCodeMap" :key="entry.command">
                <td><code>{{ entry.command }}</code></td>
                <td><code>{{ entry.reasonCode }}</code></td>
                <td>{{ entry.note }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="card">
        <h2>Activity Timeline</h2>
        <p class="state" :class="{ error: timelineViewState.key === 'error' }">
          {{ selectedRow ? timelineViewState.message : 'Select an exception row to view activity timeline.' }}
        </p>
        <div v-if="selectedRow" class="inline-actions compact">
          <button type="button" :disabled="!timelineCanPrev" @click="loadActivityTimelinePreviousPage">Previous Page</button>
          <button type="button" :disabled="!timelineCanNext" @click="loadActivityTimelineNextPage">Next Page</button>
          <button type="button" :disabled="timelineState.loading" @click="loadActivityTimelineFirstPage">Reset Cursor</button>
        </div>
        <div v-if="selectedRow && timelineViewState.showRetry" class="inline-actions compact">
          <button type="button" :disabled="timelineState.loading" @click="retryTimeline">Retry Timeline Fetch</button>
        </div>

        <ul v-if="selectedRow && timelineState.loading" class="timeline-list">
          <li v-for="line in 3" :key="`timeline-loading-${line}`">
            <strong>Loading timeline event...</strong>
            <small>Fetching deterministic page {{ timelineCursorHistory.length + 1 }}.</small>
          </li>
        </ul>

        <ul v-else-if="selectedRow && timelineRows.length" class="timeline-list">
          <li v-for="event in timelineRows" :key="event.id">
            <div class="timeline-row-top">
              <strong>{{ event.eventType }}</strong>
              <small>{{ event.occurredAt }}</small>
            </div>
            <p>
              {{ event.fromStatus || 'NONE' }} -> {{ event.toStatus }}
              <span class="pill">{{ event.actorType }}</span>
            </p>
            <small>
              Reason: <code>{{ event.reasonCode }}</code> ({{ resolveActivityReasonCodeLabel(event.reasonCode) }})
            </small>
          </li>
        </ul>

        <p v-else-if="selectedRow" class="state">No activity timeline events to render.</p>
      </article>
    </section>
  </main>
</template>
