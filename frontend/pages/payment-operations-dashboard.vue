<script setup lang="ts">
import {
  buildDetailViewState,
  buildListViewState,
  buildPaymentTimeline,
  filterPayments,
  sortPaymentsDeterministic,
  type PaymentDetail,
  type PaymentFilters,
  type PaymentListItem,
  type PaymentStatus,
} from '../utils/paymentOperationsDashboard';

const { request } = useGatewayApi();

type ActorRole = 'admin' | 'ops' | 'support';
type FixtureMode = 'api' | 'fixture_success' | 'fixture_loading' | 'fixture_empty' | 'fixture_error';

const auth = reactive({
  internalToken: '',
  actorRole: 'admin' as ActorRole,
});

const fixtureMode = ref<FixtureMode>('api');

const filters = reactive<PaymentFilters>({
  status: 'ALL',
  merchant: '',
  reference: '',
  dateFrom: '',
  dateTo: '',
});

const listState = reactive({
  loading: false,
  error: '',
});

const detailState = reactive({
  loading: false,
  error: '',
});

const allRows = ref<PaymentListItem[]>([]);
const selectedReference = ref('');
const selectedDetail = ref<PaymentDetail | null>(null);

const fixtureRows: PaymentListItem[] = [
  {
    reference: 'pay_fix_1001',
    merchantId: 'mrc_demo_001',
    status: 'PAID',
    type: 'DEPOSIT',
    amount: '1500.00',
    currency: 'THB',
    providerName: 'mock-a',
    createdAt: '2026-03-18T08:45:00.000Z',
  },
  {
    reference: 'pay_fix_1002',
    merchantId: 'mrc_demo_001',
    status: 'FAILED',
    type: 'DEPOSIT',
    amount: '750.00',
    currency: 'THB',
    providerName: 'mock-b',
    createdAt: '2026-03-18T09:00:00.000Z',
  },
  {
    reference: 'pay_fix_2001',
    merchantId: 'mrc_demo_002',
    status: 'REFUNDED',
    type: 'WITHDRAW',
    amount: '500.00',
    currency: 'THB',
    providerName: 'mock-a',
    createdAt: '2026-03-19T07:30:00.000Z',
  },
];

const fixtureDetailByReference: Record<string, PaymentDetail> = {
  pay_fix_1001: {
    reference: 'pay_fix_1001',
    merchantId: 'mrc_demo_001',
    status: 'PAID',
    createdAt: '2026-03-18T08:45:00.000Z',
    updatedAt: '2026-03-18T08:48:20.000Z',
    audits: [
      {
        id: 'audit_fix_1001_pending',
        eventType: 'transaction.transition',
        actor: 'router',
        createdAt: '2026-03-18T08:45:40.000Z',
        metadata: JSON.stringify({ toStatus: 'PENDING', note: 'Authorization requested.' }),
      },
      {
        id: 'audit_fix_1001_paid',
        eventType: 'transaction.transition',
        actor: 'provider',
        createdAt: '2026-03-18T08:48:20.000Z',
        metadata: JSON.stringify({ toStatus: 'PAID', note: 'Capture confirmed.' }),
      },
    ],
  },
  pay_fix_1002: {
    reference: 'pay_fix_1002',
    merchantId: 'mrc_demo_001',
    status: 'FAILED',
    createdAt: '2026-03-18T09:00:00.000Z',
    updatedAt: '2026-03-18T09:03:00.000Z',
    audits: [
      {
        id: 'audit_fix_1002_pending',
        eventType: 'transaction.transition',
        actor: 'router',
        createdAt: '2026-03-18T09:00:20.000Z',
        metadata: JSON.stringify({ toStatus: 'PENDING', note: 'Authorization requested.' }),
      },
      {
        id: 'audit_fix_1002_failed',
        eventType: 'transaction.transition',
        actor: 'provider',
        createdAt: '2026-03-18T09:03:00.000Z',
        metadata: JSON.stringify({ toStatus: 'FAILED', note: 'Insufficient funds.' }),
      },
    ],
  },
  pay_fix_2001: {
    reference: 'pay_fix_2001',
    merchantId: 'mrc_demo_002',
    status: 'REFUNDED',
    createdAt: '2026-03-19T07:30:00.000Z',
    updatedAt: '2026-03-19T08:10:00.000Z',
    audits: [
      {
        id: 'audit_fix_2001_pending',
        eventType: 'transaction.transition',
        actor: 'router',
        createdAt: '2026-03-19T07:30:30.000Z',
        metadata: JSON.stringify({ toStatus: 'PENDING', note: 'Authorization requested.' }),
      },
      {
        id: 'audit_fix_2001_paid',
        eventType: 'transaction.transition',
        actor: 'provider',
        createdAt: '2026-03-19T07:33:40.000Z',
        metadata: JSON.stringify({ toStatus: 'PAID', note: 'Capture confirmed.' }),
      },
      {
        id: 'audit_fix_2001_refunded',
        eventType: 'transaction.transition',
        actor: 'support',
        createdAt: '2026-03-19T08:10:00.000Z',
        metadata: JSON.stringify({ toStatus: 'REFUNDED', note: 'Refund completed.' }),
      },
    ],
  },
};

const filteredRows = computed(() => {
  const rows = filterPayments(allRows.value, filters);
  return sortPaymentsDeterministic(rows);
});

const listViewState = computed(() => buildListViewState({
  loading: listState.loading,
  error: listState.error,
  rows: filteredRows.value,
}));

const detailViewState = computed(() => buildDetailViewState({
  loading: detailState.loading,
  error: detailState.error,
  detail: selectedDetail.value,
}));

const timelineEntries = computed(() => {
  if (!selectedDetail.value) {
    return [];
  }
  return buildPaymentTimeline(selectedDetail.value);
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

function clearListState() {
  listState.error = '';
}

function clearDetailState() {
  detailState.error = '';
}

function resetDetailSelection() {
  selectedReference.value = '';
  selectedDetail.value = null;
  clearDetailState();
}

function normalizeRow(payload: any): PaymentListItem {
  return {
    reference: String(payload.reference || ''),
    merchantId: String(payload.merchantId || ''),
    status: String(payload.status || 'CREATED') as PaymentStatus,
    type: String(payload.type || '-'),
    amount: String(payload.amount || '0'),
    currency: String(payload.currency || '-'),
    providerName: payload.providerName || null,
    createdAt: String(payload.createdAt || new Date(0).toISOString()),
  };
}

async function loadPayments() {
  listState.loading = true;
  clearListState();
  resetDetailSelection();

  try {
    if (fixtureMode.value === 'fixture_loading') {
      await wait(700);
      allRows.value = [];
      return;
    }
    if (fixtureMode.value === 'fixture_empty') {
      allRows.value = [];
      return;
    }
    if (fixtureMode.value === 'fixture_error') {
      throw new Error('Fixture mode: simulated list fetch failure.');
    }
    if (fixtureMode.value === 'fixture_success') {
      allRows.value = fixtureRows;
      return;
    }

    if (!hasAuth()) {
      throw new Error('Internal auth token is required in API mode.');
    }

    const params = new URLSearchParams();
    if (filters.merchant.trim()) {
      params.set('merchantId', filters.merchant.trim());
    }
    if (filters.status !== 'ALL') {
      params.set('status', filters.status);
    }
    if (filters.reference.trim()) {
      params.set('reference', filters.reference.trim());
    }
    params.set('take', '100');

    const rows = await request<any[]>(`/payments?${params.toString()}`, { headers: authHeaders() });
    allRows.value = rows.map((row) => normalizeRow(row));
  } catch (error: any) {
    allRows.value = [];
    listState.error = error?.message || 'Unable to load payments.';
  } finally {
    listState.loading = false;
  }
}

async function loadPaymentDetail(reference: string) {
  selectedReference.value = reference;
  detailState.loading = true;
  clearDetailState();

  try {
    if (fixtureMode.value === 'fixture_loading') {
      await wait(600);
      selectedDetail.value = null;
      return;
    }
    if (fixtureMode.value === 'fixture_empty') {
      selectedDetail.value = null;
      return;
    }
    if (fixtureMode.value === 'fixture_error') {
      throw new Error(`Fixture mode: simulated detail fetch failure for ${reference}.`);
    }
    if (fixtureMode.value === 'fixture_success') {
      selectedDetail.value = fixtureDetailByReference[reference] ?? null;
      if (!selectedDetail.value) {
        throw new Error(`Fixture detail for ${reference} was not found.`);
      }
      return;
    }

    if (!hasAuth()) {
      throw new Error('Internal auth token is required in API mode.');
    }

    const detail = await request<any>(`/payments/${reference}`, { headers: authHeaders() });
    selectedDetail.value = {
      reference: String(detail.reference || reference),
      merchantId: String(detail.merchantId || ''),
      status: String(detail.status || 'CREATED') as PaymentStatus,
      createdAt: String(detail.createdAt || new Date(0).toISOString()),
      updatedAt: String(detail.updatedAt || detail.createdAt || new Date(0).toISOString()),
      audits: Array.isArray(detail.audits)
        ? detail.audits.map((audit: any) => ({
          id: String(audit.id || Math.random()),
          eventType: String(audit.eventType || ''),
          actor: typeof audit.actor === 'string' ? audit.actor : null,
          createdAt: typeof audit.createdAt === 'string' ? audit.createdAt : null,
          metadata: typeof audit.metadata === 'string' ? audit.metadata : null,
        }))
        : [],
    };
  } catch (error: any) {
    selectedDetail.value = null;
    detailState.error = error?.message || 'Unable to load payment detail.';
  } finally {
    detailState.loading = false;
  }
}

function statusBadgeClass(status: PaymentStatus) {
  if (status === 'PAID' || status === 'REFUNDED') return 'status-pill ok';
  if (status === 'FAILED') return 'status-pill danger';
  if (status === 'PENDING') return 'status-pill warn';
  return 'status-pill';
}

function stageBadgeClass(stage: string) {
  if (stage === 'captured' || stage === 'refunded') return 'status-pill ok';
  if (stage === 'failed') return 'status-pill danger';
  if (stage === 'authorized') return 'status-pill warn';
  return 'status-pill';
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

onMounted(() => {
  void loadPayments();
});
</script>

<template>
  <main class="page payment-operations-page">
    <section class="hero">
      <h1>Payment Operations Dashboard</h1>
      <p>Deterministic payment history, detail inspection, and timeline review for operations.</p>
      <div class="inline-actions">
        <NuxtLink class="button-link" to="/">Open Legacy Control Tower</NuxtLink>
        <NuxtLink class="button-link" to="/payment-flow">Open Multi-Flow Workspace</NuxtLink>
        <NuxtLink class="button-link" to="/payment-reconciliation-workspace">Open Reconciliation Workspace</NuxtLink>
        <NuxtLink class="button-link" to="/settlement-exceptions-inbox">Open Settlement Exceptions Inbox</NuxtLink>
        <NuxtLink class="button-link" to="/merchant-operations">Open Merchant Operations Panel</NuxtLink>
      </div>
    </section>

    <section class="card">
      <h2>List Filters</h2>
      <form class="grid" @submit.prevent="loadPayments">
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
          <select v-model="fixtureMode">
            <option value="api">api</option>
            <option value="fixture_success">fixture_success</option>
            <option value="fixture_loading">fixture_loading</option>
            <option value="fixture_empty">fixture_empty</option>
            <option value="fixture_error">fixture_error</option>
          </select>
        </label>
        <label>
          Merchant
          <input v-model="filters.merchant" placeholder="mrc_demo_001" />
        </label>
        <label>
          Status
          <select v-model="filters.status">
            <option value="ALL">ALL</option>
            <option value="CREATED">CREATED</option>
            <option value="PENDING">PENDING</option>
            <option value="PAID">PAID</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </label>
        <label>
          Reference
          <input v-model="filters.reference" placeholder="pay_" />
        </label>
        <label>
          Date from
          <input v-model="filters.dateFrom" type="date" />
        </label>
        <label>
          Date to
          <input v-model="filters.dateTo" type="date" />
        </label>
        <button type="submit" :disabled="listState.loading">{{ listState.loading ? 'Loading...' : 'Apply Filters' }}</button>
      </form>
      <p class="state" :class="{ error: listViewState.key === 'error' }">{{ listViewState.message }}</p>
      <div v-if="listViewState.showRetry" class="inline-actions compact">
        <button type="button" @click="loadPayments">Retry List Fetch</button>
      </div>
    </section>

    <section class="operations-layout">
      <article class="card">
        <h2>Payment History</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Merchant</th>
                <th>Status</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="listViewState.key === 'empty' || listViewState.key === 'loading' || listViewState.key === 'error'">
                <td colspan="7">{{ listViewState.message }}</td>
              </tr>
              <tr v-for="row in filteredRows" :key="row.reference">
                <td><code>{{ row.reference }}</code></td>
                <td>{{ row.merchantId }}</td>
                <td><span :class="statusBadgeClass(row.status)">{{ row.status }}</span></td>
                <td>{{ row.type }}</td>
                <td>{{ row.amount }} {{ row.currency }}</td>
                <td>{{ formatDateTime(row.createdAt) }}</td>
                <td>
                  <button
                    type="button"
                    class="link"
                    :disabled="detailState.loading"
                    @click="loadPaymentDetail(row.reference)"
                  >
                    {{ detailState.loading && selectedReference === row.reference ? 'Loading...' : 'View detail' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="card">
        <h2>Payment Detail</h2>
        <p class="state" :class="{ error: detailViewState.key === 'error' }">{{ detailViewState.message }}</p>
        <div v-if="detailViewState.showRetry" class="inline-actions compact">
          <button type="button" :disabled="!selectedReference" @click="loadPaymentDetail(selectedReference)">Retry Detail Fetch</button>
        </div>

        <div v-if="selectedDetail" class="detail-grid">
          <p><strong>Reference:</strong> <code>{{ selectedDetail.reference }}</code></p>
          <p><strong>Merchant:</strong> {{ selectedDetail.merchantId }}</p>
          <p>
            <strong>Status:</strong>
            <span :class="statusBadgeClass(selectedDetail.status)">{{ selectedDetail.status }}</span>
          </p>
          <p><strong>Created:</strong> {{ formatDateTime(selectedDetail.createdAt) }}</p>
        </div>

        <h3>Timeline</h3>
        <ul class="timeline-list" v-if="timelineEntries.length">
          <li v-for="entry in timelineEntries" :key="entry.id">
            <div class="timeline-row-top">
              <span :class="stageBadgeClass(entry.stage)">{{ entry.stage }}</span>
              <strong>{{ formatDateTime(entry.occurredAt) }}</strong>
            </div>
            <small>Actor: {{ entry.actor }}</small>
            <p>{{ entry.note }}</p>
          </li>
        </ul>
        <p v-else class="state">No timeline events to render.</p>
      </article>
    </section>
  </main>
</template>
