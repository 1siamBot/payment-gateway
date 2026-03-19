<script setup lang="ts">
type InternalRole = 'admin' | 'ops' | 'support';

type Merchant = {
  id: string;
  name: string;
  webhookUrl?: string | null;
  createdAt?: string;
};

const { request } = useGatewayApi();

const auth = reactive({
  internalToken: '',
  actorRole: 'admin' as InternalRole,
});

const merchantForm = reactive({
  name: '',
  webhookUrl: '',
});

const state = reactive({
  loading: false,
  message: 'Load merchants to start.',
  error: '',
});

const merchants = ref<Merchant[]>([]);

function authHeaders() {
  return {
    'x-internal-token': auth.internalToken.trim(),
    'x-actor-role': auth.actorRole,
  };
}

async function loadMerchants() {
  state.loading = true;
  state.error = '';
  try {
    merchants.value = await request<Merchant[]>('/merchants', { headers: authHeaders() });
    state.message = merchants.value.length
      ? `Loaded ${merchants.value.length} merchant(s).`
      : 'No merchants yet.';
  } catch (error: any) {
    state.error = error.message || 'Unable to load merchants.';
  } finally {
    state.loading = false;
  }
}

async function createMerchant() {
  state.loading = true;
  state.error = '';
  try {
    const created = await request<Merchant>('/merchants', {
      method: 'POST',
      headers: authHeaders(),
      body: {
        name: merchantForm.name.trim(),
        webhookUrl: merchantForm.webhookUrl.trim() || undefined,
      },
    });

    merchantForm.name = '';
    merchantForm.webhookUrl = '';
    state.message = `Merchant ${created.name} created.`;
    await loadMerchants();
  } catch (error: any) {
    state.error = error.message || 'Unable to create merchant.';
  } finally {
    state.loading = false;
  }
}
</script>

<template>
  <main class="page">
    <section class="hero">
      <h1>Flow 1: Merchant Setup</h1>
      <p>Provision and verify merchant records before payment traffic goes live.</p>
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
        <button type="button" :disabled="state.loading" @click="loadMerchants">
          {{ state.loading ? 'Loading...' : 'Load Merchants' }}
        </button>
      </div>
    </section>

    <section class="card">
      <h2>Create Merchant</h2>
      <form class="grid" @submit.prevent="createMerchant">
        <label>
          Merchant name
          <input v-model="merchantForm.name" required placeholder="Acme TH" />
        </label>
        <label>
          Webhook URL
          <input
            v-model="merchantForm.webhookUrl"
            type="url"
            placeholder="https://merchant.example.com/callback"
          />
        </label>
        <button type="submit" :disabled="state.loading">
          {{ state.loading ? 'Saving...' : 'Create Merchant' }}
        </button>
      </form>
      <p class="state" :class="{ error: state.error }">{{ state.error || state.message }}</p>
    </section>

    <section class="card">
      <h2>Merchant Directory</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Merchant ID</th>
              <th>Name</th>
              <th>Webhook</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!merchants.length">
              <td colspan="4">No merchants loaded.</td>
            </tr>
            <tr v-for="merchant in merchants" :key="merchant.id">
              <td>{{ merchant.id }}</td>
              <td>{{ merchant.name }}</td>
              <td>{{ merchant.webhookUrl || '-' }}</td>
              <td>{{ merchant.createdAt ? new Date(merchant.createdAt).toLocaleString() : '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>
