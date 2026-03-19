<script setup lang="ts">
import { useGatewayApi } from '../composables/useGatewayApi';
import {
  buildChargebackQueueCards,
  buildChargebackViewState,
  filterChargebackRows,
  formatMoney,
  getSettlementChargebackFixture,
  sortChargebackRows,
  type ChargebackFilters,
  type ChargebackFixtureScenario,
  type ChargebackRiskLevel,
  type ChargebackStatus,
  type SettlementChargebackRow,
} from '../utils/settlementChargebackMonitor';

const api = useGatewayApi();

const mode = ref<'api' | 'fixture'>('api');
const fixtureScenario = ref<ChargebackFixtureScenario>('default');
const loading = ref(false);
const fallbackActive = ref(false);
const error = ref('');
const rows = ref<SettlementChargebackRow[]>([]);

const filters = reactive<ChargebackFilters>({
  risk: 'all',
  status: 'all',
  merchantId: '',
});

const riskChoices: Array<{ value: ChargebackRiskLevel | 'all'; label: string }> = [
  { value: 'all', label: 'All risk levels' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const statusChoices: Array<{ value: ChargebackStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'queued', label: 'Queued' },
  { value: 'under_review', label: 'Under review' },
  { value: 'evidence_required', label: 'Evidence required' },
  { value: 'resolved', label: 'Resolved' },
];

const filteredRows = computed(() => filterChargebackRows(rows.value, filters));
const queueCards = computed(() => buildChargebackQueueCards(filteredRows.value));
const viewState = computed(() => buildChargebackViewState({
  loading: loading.value,
  rowsCount: filteredRows.value.length,
  fallbackActive: fallbackActive.value,
  errorMessage: error.value || undefined,
}));

const knownMerchants = computed(() => {
  const merchantSet = new Set(rows.value.map((row) => row.merchantId));
  return [...merchantSet].sort((left, right) => left.localeCompare(right));
});

function riskBadgeClass(risk: ChargebackRiskLevel): string {
  return `risk-${risk}`;
}

function statusText(status: ChargebackStatus): string {
  if (status === 'under_review') {
    return 'Under review';
  }
  if (status === 'evidence_required') {
    return 'Evidence required';
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

async function loadRows() {
  loading.value = true;
  error.value = '';
  fallbackActive.value = false;

  try {
    if (mode.value === 'fixture') {
      rows.value = sortChargebackRows(getSettlementChargebackFixture(fixtureScenario.value));
      return;
    }

    const response = await api.request<SettlementChargebackRow[]>('/settlements/chargeback-monitor', {
      method: 'GET',
    });

    rows.value = sortChargebackRows(Array.isArray(response) ? response : []);
  } catch (loadError: any) {
    const message = typeof loadError?.message === 'string'
      ? loadError.message
      : 'Unable to load settlement chargeback monitor.';

    if (mode.value === 'api') {
      rows.value = sortChargebackRows(getSettlementChargebackFixture('default'));
      fallbackActive.value = true;
      error.value = '';
      return;
    }

    rows.value = [];
    error.value = message;
  } finally {
    loading.value = false;
  }
}

function retryLoad() {
  void loadRows();
}

onMounted(() => {
  void loadRows();
});
</script>

<template>
  <main class="page chargeback-page">
    <section class="hero">
      <h1>Settlement Chargeback Monitor</h1>
      <p>Queue-first triage panel with deterministic ordering, risk badges, and fixture fallback behavior.</p>
      <div class="inline-actions compact">
        <button class="link" type="button" @click="mode = 'api'" :disabled="mode === 'api'">Backend mode</button>
        <button class="link" type="button" @click="mode = 'fixture'" :disabled="mode === 'fixture'">Fixture mode</button>
        <button type="button" @click="retryLoad" :disabled="loading">{{ loading ? 'Loading...' : 'Retry' }}</button>
      </div>
    </section>

    <section class="card">
      <h2>Filters</h2>
      <form class="grid" @submit.prevent="retryLoad">
        <label>
          Risk
          <select v-model="filters.risk">
            <option v-for="option in riskChoices" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label>
          Status
          <select v-model="filters.status">
            <option v-for="option in statusChoices" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label>
          Merchant
          <input v-model="filters.merchantId" list="chargeback-merchant-list" placeholder="merchant_alpha" />
          <datalist id="chargeback-merchant-list">
            <option v-for="merchant in knownMerchants" :key="merchant" :value="merchant" />
          </datalist>
        </label>
        <label>
          Fixture scenario
          <select v-model="fixtureScenario" :disabled="mode !== 'fixture'">
            <option value="default">Default queue</option>
            <option value="empty">Empty queue</option>
            <option value="error">Error simulation</option>
          </select>
        </label>
      </form>
      <p class="state" :class="[`state-${viewState.tone}`]">{{ viewState.message }}</p>
      <p class="state">{{ viewState.hint }}</p>
    </section>

    <section class="kpi-row">
      <article v-for="card in queueCards" :key="card.key">
        <small>{{ card.label }}</small>
        <p>{{ card.count }}</p>
      </article>
    </section>

    <section class="card">
      <h2>Chargeback Queue</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Merchant</th>
              <th>Amount</th>
              <th>Risk</th>
              <th>SLA</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.id">
              <td>{{ row.reference }}</td>
              <td>{{ row.merchantId }}</td>
              <td>{{ formatMoney(row.amount, row.currency) }}</td>
              <td>
                <span class="risk-badge" :class="riskBadgeClass(row.risk)">{{ row.risk.toUpperCase() }}</span>
              </td>
              <td>{{ row.slaMinutes }}m</td>
              <td>{{ statusText(row.status) }}</td>
              <td>{{ new Date(row.createdAt).toLocaleString('en-US', { hour12: false }) }}</td>
            </tr>
            <tr v-if="!loading && filteredRows.length === 0">
              <td colspan="7" class="empty-row">No chargeback rows for the current filters.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>
