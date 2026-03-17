<script setup lang="ts">
type PaymentRow = {
  reference: string;
  merchantId: string;
  customerId?: string | null;
  type: 'DEPOSIT' | 'WITHDRAW';
  status: 'CREATED' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  amount: string;
  currency: string;
  providerName?: string | null;
  createdAt: string;
};

type Customer = {
  id: string;
  merchantId: string;
  name?: string | null;
  email?: string | null;
  externalId?: string | null;
};

const { request } = useGatewayApi();

const createForm = reactive({
  merchantId: '',
  amount: '100',
  currency: 'USD',
  type: 'deposit',
  idempotencyKey: `ui-${Date.now()}`,
  customerExternalId: '',
  customerEmail: '',
  customerName: '',
});

const createState = reactive({ loading: false, message: '', error: '' });

const filters = reactive({
  merchantId: '',
  customerId: '',
  reference: '',
  status: '',
  type: '',
});
const payments = ref<PaymentRow[]>([]);
const listState = reactive({ loading: false, message: 'Set merchant ID and load payments.', error: '' });

const referenceLookup = ref('');
const detail = ref<any>(null);
const detailState = reactive({ loading: false, message: '', error: '' });
const refundReason = ref('Customer requested manual reversal');

const customerMerchantId = ref('');
const customerQuery = ref('');
const customers = ref<Customer[]>([]);
const customerState = reactive({ loading: false, message: '', error: '' });
const customerPayments = ref<any[]>([]);
const customerPaymentsTitle = ref('');

function resetState(state: { message: string; error: string }) {
  state.message = '';
  state.error = '';
}

async function createPayment() {
  resetState(createState);
  if (!createForm.merchantId.trim()) {
    createState.error = 'Merchant ID is required.';
    return;
  }
  if (Number(createForm.amount) <= 0) {
    createState.error = 'Amount must be greater than zero.';
    return;
  }

  createState.loading = true;
  try {
    const payload = {
      merchantId: createForm.merchantId.trim(),
      amount: Number(createForm.amount),
      currency: createForm.currency.trim().toUpperCase(),
      type: createForm.type,
      idempotencyKey: createForm.idempotencyKey.trim(),
      customer: {
        externalId: createForm.customerExternalId.trim() || undefined,
        email: createForm.customerEmail.trim() || undefined,
        name: createForm.customerName.trim() || undefined,
      },
    };

    const result = await request<{ reference: string; status: string; provider: string | null }>('/payments', {
      method: 'POST',
      body: payload,
    });

    createState.message = `Created ${result.reference} (${result.status}) via ${result.provider || 'n/a'}.`;
    filters.merchantId = createForm.merchantId.trim();
    referenceLookup.value = result.reference;
    createForm.idempotencyKey = `ui-${Date.now()}`;
    await loadPayments();
  } catch (error: any) {
    createState.error = error.message;
  } finally {
    createState.loading = false;
  }
}

async function loadPayments() {
  resetState(listState);
  if (!filters.merchantId.trim()) {
    payments.value = [];
    listState.message = 'Merchant ID is required for dashboard queries.';
    return;
  }

  listState.loading = true;
  try {
    const query = new URLSearchParams();
    query.set('merchantId', filters.merchantId.trim());
    if (filters.customerId.trim()) query.set('customerId', filters.customerId.trim());
    if (filters.reference.trim()) query.set('reference', filters.reference.trim());
    if (filters.status) query.set('status', filters.status);
    if (filters.type) query.set('type', filters.type);
    query.set('take', '50');

    payments.value = await request<PaymentRow[]>(`/payments?${query.toString()}`);
    listState.message = payments.value.length
      ? `Loaded ${payments.value.length} payment(s).`
      : 'No payments found for the selected filters.';
  } catch (error: any) {
    payments.value = [];
    listState.error = error.message;
  } finally {
    listState.loading = false;
  }
}

async function lookupPayment(reference = referenceLookup.value) {
  resetState(detailState);
  if (!reference.trim()) {
    detail.value = null;
    detailState.message = 'Enter a payment reference to inspect details.';
    return;
  }

  detailState.loading = true;
  try {
    detail.value = await request(`/payments/${reference.trim()}`);
    detailState.message = `Loaded details for ${reference.trim()}.`;
  } catch (error: any) {
    detail.value = null;
    detailState.error = error.message;
  } finally {
    detailState.loading = false;
  }
}

async function triggerRefund() {
  resetState(detailState);
  if (!detail.value?.reference) {
    detailState.error = 'Lookup a payment first.';
    return;
  }

  detailState.loading = true;
  try {
    const result = await request<{ sourceReference: string; status: string }>(`/payments/${detail.value.reference}/refund`, {
      method: 'POST',
      body: { reason: refundReason.value || undefined },
    });
    detailState.message = `Refund applied for ${result.sourceReference} (${result.status}).`;
    await lookupPayment(detail.value.reference);
    await loadPayments();
  } catch (error: any) {
    detailState.error = error.message;
  } finally {
    detailState.loading = false;
  }
}

async function searchCustomers() {
  resetState(customerState);
  customerPayments.value = [];
  customerPaymentsTitle.value = '';

  if (!customerMerchantId.value.trim()) {
    customers.value = [];
    customerState.error = 'Merchant ID is required to search customers.';
    return;
  }

  customerState.loading = true;
  try {
    const query = new URLSearchParams({
      merchantId: customerMerchantId.value.trim(),
      query: customerQuery.value.trim(),
    });
    customers.value = await request<Customer[]>(`/customers/search?${query.toString()}`);
    customerState.message = customers.value.length
      ? `Found ${customers.value.length} customer(s).`
      : 'No customers matched this query.';
  } catch (error: any) {
    customers.value = [];
    customerState.error = error.message;
  } finally {
    customerState.loading = false;
  }
}

async function loadCustomerPayments(customer: Customer) {
  resetState(customerState);
  customerState.loading = true;
  try {
    const query = new URLSearchParams({ merchantId: customer.merchantId });
    const result = await request<{ customer: Customer; payments: any[] }>(`/customers/${customer.id}/payments?${query.toString()}`);
    customerPaymentsTitle.value = `${result.customer.name || result.customer.email || result.customer.id} payments`;
    customerPayments.value = result.payments;
    customerState.message = `Loaded ${result.payments.length} payment(s) for selected customer.`;
  } catch (error: any) {
    customerPayments.value = [];
    customerPaymentsTitle.value = '';
    customerState.error = error.message;
  } finally {
    customerState.loading = false;
  }
}

function fmtAmount(value: string, currency: string) {
  const num = Number(value);
  if (!Number.isFinite(num)) return `${value} ${currency}`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
}

function selectPayment(reference: string) {
  referenceLookup.value = reference;
  void lookupPayment(reference);
}
</script>

<template>
  <main class="shell">
    <section class="hero">
      <h1>Payment Gateway Operations</h1>
      <p>Merchant dashboard, payment detail, and support refund operations in one Nuxt console.</p>
      <code>API base: {{ useRuntimeConfig().public.apiBaseUrl }}</code>
    </section>

    <section class="card">
      <h2>Create Payment</h2>
      <form class="grid" @submit.prevent="createPayment">
        <label>Merchant ID <input v-model="createForm.merchantId" required /></label>
        <label>Amount <input v-model="createForm.amount" type="number" min="0.01" step="0.01" required /></label>
        <label>Currency <input v-model="createForm.currency" minlength="3" maxlength="3" required /></label>
        <label>
          Type
          <select v-model="createForm.type">
            <option value="deposit">deposit</option>
            <option value="withdraw">withdraw</option>
          </select>
        </label>
        <label>Idempotency Key <input v-model="createForm.idempotencyKey" required /></label>
        <label>Customer External ID <input v-model="createForm.customerExternalId" /></label>
        <label>Customer Email <input v-model="createForm.customerEmail" type="email" /></label>
        <label>Customer Name <input v-model="createForm.customerName" /></label>
        <button :disabled="createState.loading" type="submit">{{ createState.loading ? 'Creating...' : 'Create Payment' }}</button>
      </form>
      <p class="state" :class="{ error: createState.error }">{{ createState.error || createState.message }}</p>
    </section>

    <section class="card">
      <h2>Merchant Dashboard</h2>
      <form class="grid" @submit.prevent="loadPayments">
        <label>Merchant ID <input v-model="filters.merchantId" required /></label>
        <label>Customer ID <input v-model="filters.customerId" /></label>
        <label>Reference <input v-model="filters.reference" /></label>
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
        <button :disabled="listState.loading" type="submit">{{ listState.loading ? 'Loading...' : 'Apply Filters' }}</button>
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
            </tr>
          </thead>
          <tbody>
            <tr v-if="!payments.length">
              <td colspan="5">No rows yet.</td>
            </tr>
            <tr v-for="row in payments" :key="row.reference">
              <td><button type="button" class="link" @click="selectPayment(row.reference)">{{ row.reference }}</button></td>
              <td>{{ row.merchantId }}</td>
              <td><span class="pill">{{ row.status }}</span></td>
              <td>{{ row.type }}</td>
              <td>{{ fmtAmount(row.amount, row.currency) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <h2>Support Lookup & Refund</h2>
      <form class="inline" @submit.prevent="lookupPayment()">
        <input v-model="referenceLookup" placeholder="Payment reference" required />
        <button :disabled="detailState.loading" type="submit">{{ detailState.loading ? 'Looking up...' : 'Lookup' }}</button>
      </form>
      <label class="refund-field">Refund reason <input v-model="refundReason" /></label>
      <button class="danger" :disabled="!detail?.reference || detailState.loading" type="button" @click="triggerRefund">
        Trigger Refund
      </button>
      <p class="state" :class="{ error: detailState.error }">{{ detailState.error || detailState.message || 'No payment selected.' }}</p>
      <pre class="detail">{{ detail ? JSON.stringify(detail, null, 2) : 'Payment detail will appear here.' }}</pre>
    </section>

    <section class="card">
      <h2>Customer Search</h2>
      <form class="grid" @submit.prevent="searchCustomers">
        <label>Merchant ID <input v-model="customerMerchantId" required /></label>
        <label>Query <input v-model="customerQuery" placeholder="name / email / external id" /></label>
        <button :disabled="customerState.loading" type="submit">{{ customerState.loading ? 'Searching...' : 'Search Customers' }}</button>
      </form>
      <p class="state" :class="{ error: customerState.error }">{{ customerState.error || customerState.message }}</p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Email</th>
              <th>External ID</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!customers.length">
              <td colspan="4">No customer rows yet.</td>
            </tr>
            <tr v-for="customer in customers" :key="customer.id">
              <td>{{ customer.name || '-' }}</td>
              <td>{{ customer.email || '-' }}</td>
              <td>{{ customer.externalId || '-' }}</td>
              <td>
                <button type="button" class="link" @click="loadCustomerPayments(customer)">View Payments</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 v-if="customerPaymentsTitle">{{ customerPaymentsTitle }}</h3>
      <div class="table-wrap" v-if="customerPaymentsTitle">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Status</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!customerPayments.length">
              <td colspan="5">No payments for selected customer.</td>
            </tr>
            <tr v-for="row in customerPayments" :key="row.reference">
              <td>{{ row.reference }}</td>
              <td>{{ row.status }}</td>
              <td>{{ row.type }}</td>
              <td>{{ fmtAmount(row.amount, row.currency) }}</td>
              <td>{{ new Date(row.createdAt).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>
