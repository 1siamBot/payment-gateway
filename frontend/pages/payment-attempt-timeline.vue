<script setup lang="ts">
import {
  type PaymentAttemptFixture,
  type TimelineEventRow,
  type TimelineScenarioKey,
  loadPaymentAttemptScenario,
  normalizeTimelineEvents,
  resolveScenarioLabel,
} from '../utils/paymentAttemptTimeline';

const route = useRoute();

const scenarioChoices: TimelineScenarioKey[] = [
  'successful_capture',
  'retry_then_success',
  'terminal_failure',
  'empty',
  'malformed',
];

function parseScenarioFromRoute(): TimelineScenarioKey {
  const rawValue = Array.isArray(route.query.scenario) ? route.query.scenario[0] : route.query.scenario;
  if (
    rawValue === 'successful_capture'
    || rawValue === 'retry_then_success'
    || rawValue === 'terminal_failure'
    || rawValue === 'empty'
    || rawValue === 'malformed'
  ) {
    return rawValue;
  }
  return 'successful_capture';
}

const selectedScenario = ref<TimelineScenarioKey>(parseScenarioFromRoute());
const selectedFixture = ref<PaymentAttemptFixture | null>(null);
const timelineRows = ref<TimelineEventRow[]>([]);
const malformedCount = ref(0);
const drawerOpen = ref(false);
const loading = ref(false);
const stateMessage = ref('Select a scenario and open the drawer.');
const stateError = ref('');

const currentScenarioLabel = computed(() => resolveScenarioLabel(selectedScenario.value));

async function loadDrawerData() {
  loading.value = true;
  stateError.value = '';
  try {
    const fixture = await loadPaymentAttemptScenario(selectedScenario.value);
    selectedFixture.value = fixture;
    const normalized = normalizeTimelineEvents(fixture.events);
    timelineRows.value = normalized.rows;
    malformedCount.value = normalized.malformedCount;

    if (!timelineRows.value.length) {
      stateMessage.value = 'No attempt events are available for this payment yet.';
      return;
    }

    stateMessage.value = `Loaded ${timelineRows.value.length} event(s) for ${fixture.paymentReference}.`;
  } catch (error: any) {
    selectedFixture.value = null;
    timelineRows.value = [];
    malformedCount.value = 0;
    stateError.value = error?.message || 'Unable to load timeline fixture.';
  } finally {
    loading.value = false;
  }
}

function openDrawer() {
  drawerOpen.value = true;
  void loadDrawerData();
}

function closeDrawer() {
  drawerOpen.value = false;
}

watch(selectedScenario, () => {
  if (drawerOpen.value) {
    void loadDrawerData();
  }
});
</script>

<template>
  <main class="page attempt-page">
    <section class="hero">
      <h1>Payment Attempt Timeline Drawer</h1>
      <p>Deterministic fixture lab for operator diagnosis without backend dependencies.</p>
    </section>

    <section class="card">
      <h2>Scenario Control</h2>
      <form class="grid" @submit.prevent="openDrawer">
        <label>
          Scenario
          <select v-model="selectedScenario">
            <option v-for="key in scenarioChoices" :key="key" :value="key">{{ resolveScenarioLabel(key) }}</option>
          </select>
        </label>
        <label>
          Route
          <input readonly :value="`/payment-attempt-timeline?scenario=${selectedScenario}`" />
        </label>
        <button type="submit">{{ drawerOpen ? 'Reload Drawer' : 'Open Drawer' }}</button>
      </form>
      <p class="state" :class="{ error: stateError }">{{ stateError || stateMessage }}</p>
    </section>

    <section class="card">
      <h2>Payment Detail Context</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Reference</th>
              <th>Merchant</th>
              <th>Amount</th>
              <th>Final Status</th>
              <th>Timeline</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{{ currentScenarioLabel }}</td>
              <td>{{ selectedFixture?.paymentReference || '-' }}</td>
              <td>{{ selectedFixture?.merchantId || '-' }}</td>
              <td>{{ selectedFixture ? `${selectedFixture.amount} ${selectedFixture.currency}` : '-' }}</td>
              <td>{{ selectedFixture?.finalStatus || '-' }}</td>
              <td>
                <button type="button" class="link" @click="openDrawer">View Timeline Drawer</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="drawerOpen" class="drawer-shell" @click.self="closeDrawer">
      <aside class="timeline-drawer">
        <header class="drawer-header">
          <div>
            <h3>{{ currentScenarioLabel }} Timeline</h3>
            <small>{{ selectedFixture?.paymentReference || 'payment fixture' }}</small>
          </div>
          <button type="button" class="link" @click="closeDrawer">Close</button>
        </header>

        <p v-if="loading" class="state">Loading deterministic timeline fixture...</p>

        <template v-else>
          <p class="state" :class="{ error: stateError }">{{ stateError || stateMessage }}</p>
          <p v-if="malformedCount > 0" class="state malformed-note">
            {{ malformedCount }} malformed event(s) were skipped to keep operator diagnostics safe.
          </p>

          <div v-if="timelineRows.length" class="table-wrap drawer-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Timestamp (UTC)</th>
                  <th>Status</th>
                  <th>Event</th>
                  <th>Actor</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(event, idx) in timelineRows" :key="event.id">
                  <td>{{ idx + 1 }}</td>
                  <td>{{ new Date(event.occurredAt).toISOString() }}</td>
                  <td><span :class="`attempt-status status-${event.status}`">{{ event.status }}</span></td>
                  <td>{{ event.stage }}</td>
                  <td>{{ event.actor }}</td>
                  <td>{{ event.note }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="state">No timeline rows to show for this scenario.</p>
        </template>
      </aside>
    </section>
  </main>
</template>
