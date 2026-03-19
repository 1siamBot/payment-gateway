<script setup lang="ts">
import {
  deriveSettlementExceptionSeverity,
  sortExceptionsDeterministic,
  type SettlementExceptionInboxRow,
  type SettlementExceptionStatus,
} from '../utils/settlementExceptionsInbox';
import {
  applyCommandSuccessTransition,
  buildCommandIdempotencyKey,
  buildOperatorWorkbenchViewState,
  createSettlementExceptionCommandClient,
  resolveCommandOutcomeRail,
  resolveCommandRailMessage,
  resolveOperatorWorkbenchDataSource,
  shouldBlockDuplicateCommand,
  type CommandOutcomeRail,
  type ExceptionCommandAction,
  type OperatorWorkbenchMode,
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

const latestApiStatusCode = ref<number | undefined>(undefined);
const rows = ref<SettlementExceptionInboxRow[]>([]);
const selectedExceptionId = ref('');
const retryCount = ref(0);
const inflightKeys = ref<Set<string>>(new Set());
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

const reasonCodeMap = [
  { command: 'acknowledge', reasonCode: 'triage_started', note: 'Move OPEN -> INVESTIGATING.' },
  { command: 'assign', reasonCode: 'owner_assignment', note: 'Set owner handoff and keep INVESTIGATING.' },
  { command: 'resolve', reasonCode: 'provider_report_reconciled', note: 'Mark terminal RESOLVED once reconciled.' },
] as const;

const commandClient = createSettlementExceptionCommandClient(request, authHeaders);

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

onMounted(() => {
  void loadWorkbench();
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
    </section>
  </main>
</template>
