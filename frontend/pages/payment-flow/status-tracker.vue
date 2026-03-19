<script setup lang="ts">
type InternalRole = 'admin' | 'ops' | 'support';

type PaymentRow = {
  reference: string;
  merchantId: string;
  status: 'CREATED' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: string;
  currency: string;
  providerName?: string | null;
  createdAt: string;
};

const { request } = useGatewayApi();

const auth = reactive({
  internalToken: '',
  actorRole: 'ops' as InternalRole,
});

const filters = reactive({
  merchantId: '',
  status: '',
  type: '',
  reference: '',
  take: 20,
});

const referenceLookup = ref('');
const rows = ref<PaymentRow[]>([]);
const selectedPayment = ref<any>(null);

const listState = reactive({
  loading: false,
  message: 'Set filters and load payments.',
  error: '',
});

const lookupState = reactive({
  loading: false,
  message: 'Enter reference to fetch one payment.',
  error: '',
});

function authHeaders() {
  return {
    'x-internal-token': auth.internalToken.trim(),
    'x-actor-role': auth.actorRole,
  };
}

async function loadPayments() {
  listState.loading = true;
  listState.error = '';
  try {
    const params = new URLSearchParams();
    if (filters.merchantId.trim()) params.set('merchantId', filters.merchantId.trim());
    if (filters.status.trim()) params.set('status', filters.status.trim());
    if (filters.type.trim()) params.set('type', filters.type.trim());
    if (filters.reference.trim()) params.set('reference', filters.reference.trim());
    params.set('take', String(filters.take || 20));

    rows.value = await request<PaymentRow[]>(`/payments?${params.toString()}`, { headers: authHeaders() });
    listState.message = rows.value.length ? `Loaded ${rows.value.length} payment(s).` : 'No matching payments.';
  } catch (error: any) {
    listState.error = error.message || 'Unable to load payments.';
  } finally {
    listState.loading = false;
  }
}

async function lookupPayment() {
  lookupState.loading = true;
  lookupState.error = '';
  try {
    selectedPayment.value = await request(`/payments/${referenceLookup.value.trim()}`, {
      headers: authHeaders(),
    });
    lookupState.message = `Loaded ${selectedPayment.value.reference ?? referenceLookup.value.trim()}.`;
  } catch (error: any) {
    lookupState.error = error.message || 'Unable to fetch payment reference.';
    selectedPayment.value = null;
  } finally {
    lookupState.loading = false;
  }
}
</script>

<template>
  <main class="page">
    <section class="hero">
      <h1>Flow 3: Payment Status Tracker</h1>
      <p>Monitor payment lifecycle by list filters and direct reference lookup.</p>
      <div class="inline-actions">
        <NuxtLink class="button-link" to="/payment-flow">Back to Flow Hub</NuxtLink>
      </div>
    </section>

    <section class="card">
      <h2>Access Context</h2>
      <div class="auth-grid">
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
      </div>
    </section>

    <section class="card">
      <h2>Lifecycle List</h2>
      <form class="grid" @submit.prevent="loadPayments">
        <label>
          Merchant ID
          <input v-model="filters.merchantId" placeholder="merchant_xxx" />
        </label>
        <label>
          Status
          <select v-model="filters.status">
            <option value="">all</option>
            <option value="CREATED">CREATED</option>
            <option value="PENDING">PENDING</option>
            <option value="PAID">PAID</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </label>
        <label>
          Type
          <select v-model="filters.type">
            <option value="">all</option>
            <option value="DEPOSIT">DEPOSIT</option>
            <option value="WITHDRAW">WITHDRAW</option>
          </select>
        </label>
        <label>
          Reference
          <input v-model="filters.reference" placeholder="optional reference" />
        </label>
        <label>
          Take
          <input v-model.number="filters.take" type="number" min="1" max="100" />
        </label>
        <button type="submit" :disabled="listState.loading">
          {{ listState.loading ? 'Loading...' : 'Load Payments' }}
        </button>
      </form>
      <p class="state" :class="{ error: listState.error }">{{ listState.error || listState.message }}</p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Merchant</th>
              <th>Status</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Provider</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!rows.length">
              <td colspan="7">No payments loaded.</td>
            </tr>
            <tr v-for="row in rows" :key="row.reference">
              <td>{{ row.reference }}</td>
              <td>{{ row.merchantId }}</td>
              <td>{{ row.status }}</td>
              <td>{{ row.type }}</td>
              <td>{{ row.amount }} {{ row.currency }}</td>
              <td>{{ row.providerName || '-' }}</td>
              <td>{{ new Date(row.createdAt).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <h2>Reference Lookup</h2>
      <form class="auth-grid" @submit.prevent="lookupPayment">
        <label>
          Payment reference
          <input v-model="referenceLookup" placeholder="pay_xxx" required />
        </label>
        <button type="submit" :disabled="lookupState.loading">
          {{ lookupState.loading ? 'Fetching...' : 'Fetch Payment' }}
        </button>
      </form>
      <p class="state" :class="{ error: lookupState.error }">{{ lookupState.error || lookupState.message }}</p>
      <pre v-if="selectedPayment" class="secret">{{ JSON.stringify(selectedPayment, null, 2) }}</pre>
    </section>
  </main>
</template>
