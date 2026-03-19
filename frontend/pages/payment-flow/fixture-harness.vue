<script setup lang="ts">
import {
  SCENARIO_OPTIONS,
  buildHarnessState,
  parseHarnessScenario,
  statusClassForCheck,
  statusClassForJourney,
  type HarnessScenario,
} from '../../utils/paymentFlowHarness';

const route = useRoute();
const router = useRouter();

const selectedScenario = ref<HarnessScenario>(parseHarnessScenario(route.query.scenario as string | undefined));

watch(
  () => route.query.scenario,
  (next) => {
    selectedScenario.value = parseHarnessScenario(next as string | undefined);
  },
  { immediate: true },
);

const harness = computed(() => buildHarnessState(selectedScenario.value));

function applyScenarioToggle() {
  void router.replace({
    query: {
      ...route.query,
      scenario: selectedScenario.value,
    },
  });
}
</script>

<template>
  <main class="page">
    <section class="hero">
      <h1>Offline Payment Flow Fixture Harness</h1>
      <p>Deterministic, no-network harness for merchant setup, intent creation, and status tracking journeys.</p>
      <div class="inline-actions">
        <NuxtLink class="button-link" to="/payment-flow">Back to Flow Hub</NuxtLink>
      </div>
    </section>

    <section class="card">
      <h2>Scenario Toggle</h2>
      <div class="fixture-bar">
        <label>
          Fixture scenario
          <select v-model="selectedScenario">
            <option v-for="option in SCENARIO_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <button type="button" @click="applyScenarioToggle">Apply Scenario Route Toggle</button>
      </div>
      <p class="state">
        <strong>{{ harness.option.label }}:</strong>
        {{ harness.option.summary }}
      </p>
      <div class="kpi-row">
        <article v-for="journey in harness.journeys" :key="journey.key">
          <h3>{{ journey.title }}</h3>
          <p :class="statusClassForJourney(journey.state)">{{ journey.message }}</p>
        </article>
      </div>
    </section>

    <section class="card">
      <h2>Flow 1: Merchant Setup Fixture</h2>
      <p class="state">Merchant ID: {{ harness.merchant.id }}</p>
      <div class="grid">
        <label>
          Merchant name
          <input :value="harness.merchant.name" readonly />
        </label>
        <label>
          Webhook URL
          <input :value="harness.merchant.webhookUrl" readonly />
        </label>
        <label>
          API key preview
          <input :value="harness.merchant.apiKeyPreview" readonly />
        </label>
      </div>
      <ul class="timeline-list">
        <li v-for="check in harness.merchant.checkItems" :key="check.label">
          <span class="attempt-status" :class="statusClassForCheck(check.status)">{{ check.status }}</span>
          {{ check.label }} - {{ check.detail }}
        </li>
      </ul>
    </section>

    <section class="card">
      <h2>Flow 2: Payment Intent Fixture</h2>
      <div class="kpi-row">
        <article>
          <h3>Reference</h3>
          <p>{{ harness.intent.reference }}</p>
        </article>
        <article>
          <h3>Idempotency Key</h3>
          <p>{{ harness.intent.idempotencyKey || 'missing' }}</p>
        </article>
      </div>
      <pre class="secret">{{ JSON.stringify(harness.intent.payload, null, 2) }}</pre>
      <pre class="secret">{{ JSON.stringify(harness.intent.responsePreview, null, 2) }}</pre>
      <ul class="timeline-list">
        <li v-if="harness.intent.diagnostics.length === 0">No diagnostics in this scenario.</li>
        <li v-for="diagnostic in harness.intent.diagnostics" :key="diagnostic.code">
          <strong>{{ diagnostic.code }}</strong>: {{ diagnostic.message }}
        </li>
      </ul>
    </section>

    <section class="card">
      <h2>Flow 3: Payment Status Fixture</h2>
      <p class="state">Reference: {{ harness.status.reference }}</p>
      <p v-if="harness.status.malformedCount" class="malformed-note">
        Ignored malformed rows: {{ harness.status.malformedCount }}
      </p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Occurred At</th>
              <th>Stage</th>
              <th>Status</th>
              <th>Provider</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="harness.status.rows.length === 0">
              <td colspan="5">No status events for this fixture.</td>
            </tr>
            <tr v-for="row in harness.status.rows" :key="row.id">
              <td>{{ new Date(row.occurredAt).toLocaleString() }}</td>
              <td>{{ row.stage }}</td>
              <td><span class="attempt-status status-info">{{ row.status }}</span></td>
              <td>{{ row.provider }}</td>
              <td>{{ row.note }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="query-recovery">
      <p><strong>Recovery Messaging</strong></p>
      <p>{{ harness.recoveryMessage }}</p>
    </section>
  </main>
</template>
