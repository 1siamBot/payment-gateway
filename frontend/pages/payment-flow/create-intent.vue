<script setup lang="ts">
type InternalRole = 'admin' | 'ops' | 'support';

const { request } = useGatewayApi();

const auth = reactive({
  internalToken: '',
  actorRole: 'ops' as InternalRole,
});

const form = reactive({
  merchantId: '',
  amount: 0,
  currency: 'THB',
  type: 'deposit' as 'deposit' | 'withdraw',
  idempotencyKey: '',
  customerExternalId: '',
  customerEmail: '',
  customerName: '',
});

const state = reactive({
  loading: false,
  message: 'Fill payload and submit to create payment intent.',
  error: '',
});

const createdPayment = ref<any>(null);

function authHeaders() {
  return {
    'x-internal-token': auth.internalToken.trim(),
    'x-actor-role': auth.actorRole,
  };
}

function generateIdempotencyKey() {
  form.idempotencyKey = `intent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function createIntent() {
  state.loading = true;
  state.error = '';
  try {
    const payload: Record<string, unknown> = {
      merchantId: form.merchantId.trim(),
      amount: Number(form.amount),
      currency: form.currency.trim().toUpperCase(),
      type: form.type,
      idempotencyKey: form.idempotencyKey.trim(),
    };

    const customer: Record<string, string> = {};
    if (form.customerExternalId.trim()) customer.externalId = form.customerExternalId.trim();
    if (form.customerEmail.trim()) customer.email = form.customerEmail.trim();
    if (form.customerName.trim()) customer.name = form.customerName.trim();
    if (Object.keys(customer).length) payload.customer = customer;

    createdPayment.value = await request('/payments', {
      method: 'POST',
      headers: authHeaders(),
      body: payload,
    });

    state.message = `Payment intent ${createdPayment.value.reference ?? '-'} created.`;
  } catch (error: any) {
    state.error = error.message || 'Unable to create payment intent.';
    createdPayment.value = null;
  } finally {
    state.loading = false;
  }
}
</script>

<template>
  <main class="page">
    <section class="hero">
      <h1>Flow 2: Payment Intent Creation</h1>
      <p>Create deposit or withdraw intents with deterministic idempotency handling.</p>
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
      <h2>Create Intent</h2>
      <form class="grid" @submit.prevent="createIntent">
        <label>
          Merchant ID
          <input v-model="form.merchantId" required placeholder="merchant_xxx" />
        </label>
        <label>
          Amount
          <input v-model.number="form.amount" type="number" min="1" step="0.01" required />
        </label>
        <label>
          Currency
          <input v-model="form.currency" maxlength="3" required />
        </label>
        <label>
          Type
          <select v-model="form.type">
            <option value="deposit">deposit</option>
            <option value="withdraw">withdraw</option>
          </select>
        </label>
        <label>
          Idempotency key
          <input v-model="form.idempotencyKey" required placeholder="intent_..." />
        </label>
        <button type="button" class="link" @click="generateIdempotencyKey">Generate Key</button>
        <label>
          Customer external ID
          <input v-model="form.customerExternalId" placeholder="cust_123" />
        </label>
        <label>
          Customer email
          <input v-model="form.customerEmail" type="email" placeholder="buyer@example.com" />
        </label>
        <label>
          Customer name
          <input v-model="form.customerName" placeholder="Buyer Name" />
        </label>
        <button type="submit" :disabled="state.loading">
          {{ state.loading ? 'Creating...' : 'Create Payment Intent' }}
        </button>
      </form>
      <p class="state" :class="{ error: state.error }">{{ state.error || state.message }}</p>
      <pre v-if="createdPayment" class="secret">{{ JSON.stringify(createdPayment, null, 2) }}</pre>
    </section>
  </main>
</template>
