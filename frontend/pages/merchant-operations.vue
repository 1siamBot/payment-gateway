<script setup lang="ts">
import {
  buildDeterministicViewState,
  buildMerchantOperationsTabs,
  parseMerchantOperationsTab,
  resolveEffectiveDataSource,
  stateBadgeFromViewState,
  type MerchantOperationsDataMode,
} from '../utils/merchantOperationsPanel';

type InternalRole = 'admin' | 'ops' | 'support';
type DeliveryStatus = 'PENDING' | 'DELIVERED' | 'FAILED';
type ApiKeyStatus = 'ACTIVE' | 'REVOKED';

type Merchant = {
  id: string;
  name: string;
  webhookUrl?: string | null;
  createdAt?: string;
};

type MerchantConfig = {
  id: string;
  name: string;
  webhookUrl?: string | null;
  webhookSecretPreview?: string;
  createdAt?: string;
  updatedAt?: string;
};

type WebhookDelivery = {
  id: string;
  merchantId: string;
  eventType: string;
  status: DeliveryStatus;
  attemptCount: number;
  nextRetryAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
};

type LocalApiKey = {
  id: string;
  merchantId: string;
  name: string;
  preview: string;
  status: ApiKeyStatus;
  createdAt: string;
};

const { request } = useGatewayApi();
const route = useRoute();
const router = useRouter();

const auth = reactive({
  internalToken: '',
  actorRole: 'admin' as InternalRole,
});

const selectedMode = ref<MerchantOperationsDataMode>('api');
const activeTab = ref(parseMerchantOperationsTab(route.query.tab as string | undefined));
const latestApiStatusCode = ref<number | undefined>(undefined);

watch(
  () => route.query.tab,
  (tab) => {
    activeTab.value = parseMerchantOperationsTab(Array.isArray(tab) ? tab[0] : tab);
  },
);

const tabs = computed(() => buildMerchantOperationsTabs(activeTab.value));
const effectiveDataSource = computed(() => resolveEffectiveDataSource({
  mode: selectedMode.value,
  latestApiStatusCode: latestApiStatusCode.value,
}));

const merchantRows = ref<Merchant[]>([]);
const selectedMerchantId = ref('');
const selectedMerchantConfig = ref<MerchantConfig | null>(null);

const merchantListState = reactive({ loading: false, error: '' });
const merchantDetailState = reactive({ loading: false, error: '' });
const webhookState = reactive({ loading: false, error: '' });
const apiKeyState = reactive({ loading: false, error: '' });

const merchantConfigForm = reactive({
  name: '',
  webhookUrl: '',
  regenerateWebhookSecret: false,
});

const apiKeyForm = reactive({
  name: 'primary-key',
});

const localApiKeys = ref<LocalApiKey[]>([]);
const webhookRows = ref<WebhookDelivery[]>([]);

const fixtureMerchants: Merchant[] = [
  { id: 'mrc_fixture_001', name: 'Fixture Alpha', webhookUrl: 'https://fixtures.example/alpha/webhook', createdAt: '2026-03-19T08:00:00.000Z' },
  { id: 'mrc_fixture_002', name: 'Fixture Beta', webhookUrl: null, createdAt: '2026-03-19T09:00:00.000Z' },
];

const fixtureConfigs: Record<string, MerchantConfig> = {
  mrc_fixture_001: {
    id: 'mrc_fixture_001',
    name: 'Fixture Alpha',
    webhookUrl: 'https://fixtures.example/alpha/webhook',
    webhookSecretPreview: 'whsec_fix_..._alpha',
    createdAt: '2026-03-19T08:00:00.000Z',
    updatedAt: '2026-03-19T08:00:00.000Z',
  },
  mrc_fixture_002: {
    id: 'mrc_fixture_002',
    name: 'Fixture Beta',
    webhookUrl: null,
    webhookSecretPreview: 'whsec_fix_..._beta',
    createdAt: '2026-03-19T09:00:00.000Z',
    updatedAt: '2026-03-19T09:00:00.000Z',
  },
};

const fixtureDeliveries: WebhookDelivery[] = [
  {
    id: 'wh_fix_001',
    merchantId: 'mrc_fixture_001',
    eventType: 'payment.paid',
    status: 'DELIVERED',
    attemptCount: 1,
    nextRetryAt: null,
    deliveredAt: '2026-03-19T10:05:00.000Z',
    createdAt: '2026-03-19T10:04:55.000Z',
  },
  {
    id: 'wh_fix_002',
    merchantId: 'mrc_fixture_001',
    eventType: 'payment.failed',
    status: 'FAILED',
    attemptCount: 3,
    nextRetryAt: '2026-03-19T11:20:00.000Z',
    deliveredAt: null,
    createdAt: '2026-03-19T10:50:00.000Z',
  },
];

const listViewState = computed(() => buildDeterministicViewState({
  loading: merchantListState.loading,
  error: merchantListState.error,
  itemCount: merchantRows.value.length,
  loadingMessage: 'Loading merchant profile list...',
  emptyMessage: 'No merchants available for this mode.',
  readyMessage: `${merchantRows.value.length} merchant profile(s) loaded.`,
}));

const detailViewState = computed(() => buildDeterministicViewState({
  loading: merchantDetailState.loading,
  error: merchantDetailState.error,
  itemCount: selectedMerchantConfig.value ? 1 : 0,
  loadingMessage: 'Loading merchant profile detail...',
  emptyMessage: 'Select a merchant to inspect profile details.',
  readyMessage: `Profile ready for ${selectedMerchantConfig.value?.id}.`,
}));

const apiKeyViewState = computed(() => buildDeterministicViewState({
  loading: apiKeyState.loading,
  error: apiKeyState.error,
  itemCount: localApiKeys.value.length,
  loadingMessage: 'Processing API key operation...',
  emptyMessage: 'No API keys in current session yet.',
  readyMessage: `${localApiKeys.value.length} API key record(s) in session ledger.`,
}));

const webhookViewState = computed(() => buildDeterministicViewState({
  loading: webhookState.loading,
  error: webhookState.error,
  itemCount: webhookRows.value.length,
  loadingMessage: 'Loading webhook delivery endpoints...',
  emptyMessage: 'No webhook delivery rows available.',
  readyMessage: `${webhookRows.value.length} webhook delivery row(s) loaded.`,
}));

const listBadge = computed(() => stateBadgeFromViewState(listViewState.value));
const detailBadge = computed(() => stateBadgeFromViewState(detailViewState.value));
const apiKeyBadge = computed(() => stateBadgeFromViewState(apiKeyViewState.value));
const webhookBadge = computed(() => stateBadgeFromViewState(webhookViewState.value));

function authHeaders() {
  return {
    'x-internal-token': auth.internalToken.trim(),
    'x-actor-role': auth.actorRole,
  };
}

function setTab(tabKey: 'merchant_profile' | 'api_keys' | 'webhook_endpoints') {
  activeTab.value = tabKey;
  void router.replace({
    query: {
      ...route.query,
      tab: tabKey,
    },
  });
}

function setStatusCode(error: any) {
  latestApiStatusCode.value = typeof error?.statusCode === 'number' ? error.statusCode : undefined;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toneClass(tone: 'ok' | 'warn' | 'danger' | 'neutral') {
  if (tone === 'ok') return 'status-pill ok';
  if (tone === 'warn') return 'status-pill warn';
  if (tone === 'danger') return 'status-pill danger';
  return 'status-pill';
}

function webhookStatusClass(status: DeliveryStatus) {
  if (status === 'DELIVERED') return 'status-pill ok';
  if (status === 'FAILED') return 'status-pill danger';
  return 'status-pill warn';
}

function apiKeyStatusClass(status: ApiKeyStatus) {
  return status === 'ACTIVE' ? 'status-pill ok' : 'status-pill danger';
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadMerchantProfiles() {
  merchantListState.loading = true;
  merchantListState.error = '';

  try {
    if (selectedMode.value === 'fixture_loading') {
      await wait(500);
      merchantRows.value = [];
      return;
    }
    if (selectedMode.value === 'fixture_error') {
      throw new Error('Fixture mode: merchant profile list failed.');
    }
    if (effectiveDataSource.value === 'fixture') {
      merchantRows.value = selectedMode.value === 'fixture_empty' ? [] : fixtureMerchants;
      if (!selectedMerchantId.value && merchantRows.value.length) {
        selectedMerchantId.value = merchantRows.value[0].id;
      }
      return;
    }

    if (!auth.internalToken.trim()) {
      throw new Error('Internal token is required in API mode.');
    }

    const rows = await request<Merchant[]>('/merchants', { headers: authHeaders() });
    merchantRows.value = rows;
    if (!selectedMerchantId.value && rows.length) {
      selectedMerchantId.value = rows[0].id;
    }
    latestApiStatusCode.value = undefined;
  } catch (error: any) {
    merchantRows.value = [];
    merchantListState.error = error?.message || 'Unable to load merchants.';
    setStatusCode(error);
  } finally {
    merchantListState.loading = false;
  }
}

async function loadSelectedMerchantProfile() {
  merchantDetailState.loading = true;
  merchantDetailState.error = '';

  try {
    if (!selectedMerchantId.value) {
      selectedMerchantConfig.value = null;
      return;
    }

    if (selectedMode.value === 'fixture_loading') {
      await wait(450);
      selectedMerchantConfig.value = null;
      return;
    }
    if (selectedMode.value === 'fixture_error') {
      throw new Error('Fixture mode: merchant detail failed.');
    }
    if (effectiveDataSource.value === 'fixture') {
      selectedMerchantConfig.value = fixtureConfigs[selectedMerchantId.value] ?? null;
      return;
    }

    if (!auth.internalToken.trim()) {
      throw new Error('Internal token is required in API mode.');
    }

    const config = await request<MerchantConfig>(`/merchants/${selectedMerchantId.value}/config`, {
      headers: authHeaders(),
    });
    selectedMerchantConfig.value = config;
    merchantConfigForm.name = config.name || '';
    merchantConfigForm.webhookUrl = config.webhookUrl || '';
    merchantConfigForm.regenerateWebhookSecret = false;
    latestApiStatusCode.value = undefined;
  } catch (error: any) {
    selectedMerchantConfig.value = null;
    merchantDetailState.error = error?.message || 'Unable to load merchant profile detail.';
    setStatusCode(error);
  } finally {
    merchantDetailState.loading = false;
  }
}

async function saveMerchantConfig() {
  apiKeyState.error = '';
  merchantDetailState.loading = true;
  merchantDetailState.error = '';

  try {
    if (!selectedMerchantId.value) {
      throw new Error('Select a merchant before saving profile changes.');
    }

    if (effectiveDataSource.value === 'fixture') {
      const current = fixtureConfigs[selectedMerchantId.value];
      if (!current) throw new Error('Fixture merchant profile not found.');
      fixtureConfigs[selectedMerchantId.value] = {
        ...current,
        name: merchantConfigForm.name.trim() || current.name,
        webhookUrl: merchantConfigForm.webhookUrl.trim() || null,
        updatedAt: new Date().toISOString(),
      };
      selectedMerchantConfig.value = fixtureConfigs[selectedMerchantId.value];
      return;
    }

    const updated = await request<MerchantConfig>(`/merchants/${selectedMerchantId.value}/config`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: {
        name: merchantConfigForm.name.trim() || undefined,
        webhookUrl: merchantConfigForm.webhookUrl.trim() || null,
        regenerateWebhookSecret: merchantConfigForm.regenerateWebhookSecret,
      },
    });
    selectedMerchantConfig.value = updated;
    merchantConfigForm.regenerateWebhookSecret = false;
    latestApiStatusCode.value = undefined;
  } catch (error: any) {
    merchantDetailState.error = error?.message || 'Unable to save merchant profile config.';
    setStatusCode(error);
  } finally {
    merchantDetailState.loading = false;
  }
}

async function createApiKey() {
  apiKeyState.loading = true;
  apiKeyState.error = '';

  try {
    if (!selectedMerchantId.value) {
      throw new Error('Select a merchant before creating an API key.');
    }

    if (selectedMode.value === 'fixture_error') {
      throw new Error('Fixture mode: API key creation failed.');
    }

    if (effectiveDataSource.value === 'fixture') {
      localApiKeys.value = [{
        id: `fix_key_${Date.now()}`,
        merchantId: selectedMerchantId.value,
        name: apiKeyForm.name.trim() || 'fixture-key',
        preview: 'pk_fix_***_fixture',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      }, ...localApiKeys.value];
      return;
    }

    const response = await request<{ id: string; apiKey: string }>('/api-keys/create', {
      method: 'POST',
      headers: authHeaders(),
      body: {
        merchantId: selectedMerchantId.value,
        name: apiKeyForm.name.trim() || 'primary-key',
      },
    });

    const preview = `${response.apiKey.slice(0, 10)}...`;
    localApiKeys.value = [{
      id: response.id,
      merchantId: selectedMerchantId.value,
      name: apiKeyForm.name.trim() || 'primary-key',
      preview,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    }, ...localApiKeys.value];
    latestApiStatusCode.value = undefined;
  } catch (error: any) {
    apiKeyState.error = error?.message || 'Unable to create API key.';
    setStatusCode(error);
  } finally {
    apiKeyState.loading = false;
  }
}

async function rotateApiKey(keyId: string) {
  apiKeyState.loading = true;
  apiKeyState.error = '';
  try {
    if (effectiveDataSource.value !== 'fixture') {
      await request<{ id: string; apiKey: string }>('/api-keys/rotate', {
        method: 'POST',
        headers: authHeaders(),
        body: { keyId },
      });
      latestApiStatusCode.value = undefined;
    }

    localApiKeys.value = localApiKeys.value.map((row) => {
      if (row.id !== keyId) return row;
      return {
        ...row,
        id: `${row.id}-rot${Date.now()}`,
        name: `${row.name}-rotated`,
        preview: row.preview.replace('***', 'rot***'),
        createdAt: new Date().toISOString(),
      };
    });
  } catch (error: any) {
    apiKeyState.error = error?.message || `Unable to rotate API key ${keyId}.`;
    setStatusCode(error);
  } finally {
    apiKeyState.loading = false;
  }
}

async function revokeApiKey(keyId: string) {
  apiKeyState.loading = true;
  apiKeyState.error = '';
  try {
    if (effectiveDataSource.value !== 'fixture') {
      await request<{ id: string; revokedAt: string }>('/api-keys/revoke', {
        method: 'POST',
        headers: authHeaders(),
        body: { keyId },
      });
      latestApiStatusCode.value = undefined;
    }

    localApiKeys.value = localApiKeys.value.map((row) => (row.id === keyId ? { ...row, status: 'REVOKED' } : row));
  } catch (error: any) {
    apiKeyState.error = error?.message || `Unable to revoke API key ${keyId}.`;
    setStatusCode(error);
  } finally {
    apiKeyState.loading = false;
  }
}

async function loadWebhookDeliveries() {
  webhookState.loading = true;
  webhookState.error = '';

  try {
    if (!selectedMerchantId.value) {
      webhookRows.value = [];
      return;
    }

    if (selectedMode.value === 'fixture_loading') {
      await wait(500);
      webhookRows.value = [];
      return;
    }
    if (selectedMode.value === 'fixture_error') {
      throw new Error('Fixture mode: webhook endpoint list failed.');
    }

    if (effectiveDataSource.value === 'fixture') {
      webhookRows.value = selectedMode.value === 'fixture_empty'
        ? []
        : fixtureDeliveries.filter((row) => row.merchantId === selectedMerchantId.value);
      return;
    }

    const params = new URLSearchParams({ merchantId: selectedMerchantId.value, take: '20' });
    const rows = await request<WebhookDelivery[]>(`/webhooks/deliveries?${params.toString()}`, {
      headers: authHeaders(),
    });
    webhookRows.value = rows;
    latestApiStatusCode.value = undefined;
  } catch (error: any) {
    webhookRows.value = [];
    webhookState.error = error?.message || 'Unable to load webhook deliveries.';
    setStatusCode(error);
  } finally {
    webhookState.loading = false;
  }
}

async function retryWebhookDeliveryQueue() {
  webhookState.loading = true;
  webhookState.error = '';

  try {
    if (effectiveDataSource.value === 'fixture') {
      webhookRows.value = webhookRows.value.map((row) => {
        if (row.status !== 'FAILED') return row;
        return {
          ...row,
          status: 'PENDING',
          nextRetryAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        };
      });
      return;
    }

    await request<{ processed: number; delivered: number; failed: number }>('/webhooks/retry-pending', {
      method: 'POST',
      headers: authHeaders(),
      body: { limit: 20 },
    });
    await loadWebhookDeliveries();
    latestApiStatusCode.value = undefined;
  } catch (error: any) {
    webhookState.error = error?.message || 'Unable to retry webhook queue.';
    setStatusCode(error);
  } finally {
    webhookState.loading = false;
  }
}

watch(
  () => selectedMerchantId.value,
  (merchantId) => {
    if (!merchantId) return;
    void loadSelectedMerchantProfile();
    void loadWebhookDeliveries();
  },
);

watch(
  () => selectedMode.value,
  () => {
    latestApiStatusCode.value = undefined;
    void loadMerchantProfiles();
  },
);

onMounted(async () => {
  await loadMerchantProfiles();
  if (selectedMerchantId.value) {
    await loadSelectedMerchantProfile();
    await loadWebhookDeliveries();
  }
});
</script>

<template>
  <main class="page">
    <section class="hero">
      <h1>Merchant Operations Panel</h1>
      <p>Unified merchant profile, API key controls, and webhook endpoint operations with deterministic states.</p>
      <div class="inline-actions">
        <NuxtLink class="button-link" to="/">Open Legacy Control Tower</NuxtLink>
        <NuxtLink class="button-link" to="/payment-operations-dashboard">Open Payment Operations Dashboard</NuxtLink>
      </div>
    </section>

    <section class="card">
      <h2>Execution Context</h2>
      <form class="grid" @submit.prevent="loadMerchantProfiles">
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
            <option value="fixture_empty">fixture_empty</option>
            <option value="fixture_error">fixture_error</option>
            <option value="fixture_loading">fixture_loading</option>
          </select>
        </label>
        <button type="submit" :disabled="merchantListState.loading">
          {{ merchantListState.loading ? 'Loading...' : 'Load Merchant Operations' }}
        </button>
      </form>
      <p class="state">Data source: <strong>{{ effectiveDataSource }}</strong></p>
    </section>

    <section class="card">
      <h2>Operation Tabs</h2>
      <div class="tab-strip" role="tablist" aria-label="Merchant operations tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="tab.isActive ? 'tab-button active' : 'tab-button'"
          type="button"
          role="tab"
          :aria-selected="tab.isActive"
          @click="setTab(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>
    </section>

    <section v-if="activeTab === 'merchant_profile'" class="operations-layout">
      <article class="card">
        <div class="panel-title">
          <h2>Merchant Directory</h2>
          <span :class="toneClass(listBadge.tone)">{{ listBadge.text }}</span>
        </div>
        <p class="state" :class="{ error: listViewState.key === 'error' }">{{ listViewState.message }}</p>
        <div class="inline-actions compact" v-if="listViewState.showRetry">
          <button type="button" @click="loadMerchantProfiles">Retry Merchant List</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Merchant ID</th>
                <th>Name</th>
                <th>Webhook</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="listViewState.key !== 'ready'">
                <td colspan="4">{{ listViewState.message }}</td>
              </tr>
              <tr v-for="merchant in merchantRows" :key="merchant.id">
                <td><code>{{ merchant.id }}</code></td>
                <td>{{ merchant.name }}</td>
                <td>{{ merchant.webhookUrl || '-' }}</td>
                <td>
                  <button
                    class="link"
                    type="button"
                    :disabled="merchantDetailState.loading"
                    @click="selectedMerchantId = merchant.id"
                  >
                    {{ selectedMerchantId === merchant.id ? 'Selected' : 'Inspect' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="card">
        <div class="panel-title">
          <h2>Profile Detail</h2>
          <span :class="toneClass(detailBadge.tone)">{{ detailBadge.text }}</span>
        </div>
        <p class="state" :class="{ error: detailViewState.key === 'error' }">{{ detailViewState.message }}</p>
        <div class="inline-actions compact" v-if="detailViewState.showRetry">
          <button type="button" @click="loadSelectedMerchantProfile">Retry Profile Detail</button>
        </div>

        <form class="grid" @submit.prevent="saveMerchantConfig">
          <label>
            Name
            <input v-model="merchantConfigForm.name" placeholder="Merchant name" :disabled="!selectedMerchantId" />
          </label>
          <label>
            Webhook URL
            <input
              v-model="merchantConfigForm.webhookUrl"
              type="url"
              placeholder="https://merchant.example.com/webhook"
              :disabled="!selectedMerchantId"
            />
          </label>
          <label>
            Regenerate Secret
            <select v-model="merchantConfigForm.regenerateWebhookSecret" :disabled="!selectedMerchantId">
              <option :value="false">No</option>
              <option :value="true">Yes</option>
            </select>
          </label>
          <button type="submit" :disabled="merchantDetailState.loading || !selectedMerchantId">
            {{ merchantDetailState.loading ? 'Saving...' : 'Save Profile' }}
          </button>
        </form>

        <div v-if="selectedMerchantConfig" class="detail-panel">
          <p><strong>Merchant:</strong> <code>{{ selectedMerchantConfig.id }}</code></p>
          <p><strong>Webhook Secret Preview:</strong> {{ selectedMerchantConfig.webhookSecretPreview || '-' }}</p>
          <p><strong>Updated:</strong> {{ formatDateTime(selectedMerchantConfig.updatedAt) }}</p>
        </div>
      </article>
    </section>

    <section v-if="activeTab === 'api_keys'" class="card">
      <div class="panel-title">
        <h2>API Key Operations</h2>
        <span :class="toneClass(apiKeyBadge.tone)">{{ apiKeyBadge.text }}</span>
      </div>
      <form class="grid" @submit.prevent="createApiKey">
        <label>
          Selected merchant
          <input :value="selectedMerchantId || '-'" readonly />
        </label>
        <label>
          Key name
          <input v-model="apiKeyForm.name" required placeholder="primary-key" />
        </label>
        <button type="submit" :disabled="apiKeyState.loading || !selectedMerchantId">
          {{ apiKeyState.loading ? 'Processing...' : 'Create API Key' }}
        </button>
      </form>
      <p class="state" :class="{ error: apiKeyViewState.key === 'error' }">{{ apiKeyViewState.message }}</p>
      <div class="inline-actions compact" v-if="apiKeyViewState.showRetry">
        <button type="button" @click="createApiKey" :disabled="!selectedMerchantId">Retry Create API Key</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Key ID</th>
              <th>Name</th>
              <th>Status</th>
              <th>Preview</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="apiKeyViewState.key !== 'ready'">
              <td colspan="5">{{ apiKeyViewState.message }}</td>
            </tr>
            <tr v-for="keyRow in localApiKeys" :key="keyRow.id">
              <td><code>{{ keyRow.id }}</code></td>
              <td>{{ keyRow.name }}</td>
              <td><span :class="apiKeyStatusClass(keyRow.status)">{{ keyRow.status }}</span></td>
              <td><code>{{ keyRow.preview }}</code></td>
              <td>
                <div class="inline-actions compact">
                  <button type="button" class="link" :disabled="apiKeyState.loading" @click="rotateApiKey(keyRow.id)">Rotate</button>
                  <button
                    type="button"
                    class="danger"
                    :disabled="apiKeyState.loading || keyRow.status === 'REVOKED'"
                    @click="revokeApiKey(keyRow.id)"
                  >
                    Revoke
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="activeTab === 'webhook_endpoints'" class="card">
      <div class="panel-title">
        <h2>Webhook Endpoints</h2>
        <span :class="toneClass(webhookBadge.tone)">{{ webhookBadge.text }}</span>
      </div>

      <p class="state" :class="{ error: webhookViewState.key === 'error' }">{{ webhookViewState.message }}</p>
      <div class="inline-actions compact" v-if="webhookViewState.showRetry">
        <button type="button" @click="loadWebhookDeliveries">Retry Webhook Fetch</button>
      </div>

      <div class="inline-actions">
        <button type="button" :disabled="webhookState.loading" @click="loadWebhookDeliveries">
          {{ webhookState.loading ? 'Loading...' : 'Reload Deliveries' }}
        </button>
        <button type="button" :disabled="webhookState.loading" @click="retryWebhookDeliveryQueue">
          {{ webhookState.loading ? 'Processing...' : 'Retry Pending Queue' }}
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Delivery ID</th>
              <th>Event</th>
              <th>Status</th>
              <th>Attempts</th>
              <th>Next Retry</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="webhookViewState.key !== 'ready'">
              <td colspan="6">{{ webhookViewState.message }}</td>
            </tr>
            <tr v-for="delivery in webhookRows" :key="delivery.id">
              <td><code>{{ delivery.id }}</code></td>
              <td>{{ delivery.eventType }}</td>
              <td><span :class="webhookStatusClass(delivery.status)">{{ delivery.status }}</span></td>
              <td>{{ delivery.attemptCount }}</td>
              <td>{{ formatDateTime(delivery.nextRetryAt) }}</td>
              <td>{{ formatDateTime(delivery.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>
