<script setup lang="ts">
import {
  buildTimelineViewState,
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

function shouldAutoOpenDrawer(): boolean {
  const rawValue = Array.isArray(route.query.openDrawer) ? route.query.openDrawer[0] : route.query.openDrawer;
  return rawValue === '1';
}

const selectedScenario = ref<TimelineScenarioKey>(parseScenarioFromRoute());
const autoOpenDrawer = shouldAutoOpenDrawer();
const selectedFixture = ref<PaymentAttemptFixture | null>(null);
const timelineRows = ref<TimelineEventRow[]>([]);
const malformedCount = ref(0);
const drawerOpen = ref(false);
const drawerCollapsed = ref(false);
const loading = ref(false);
const stateMessage = ref('Select a scenario and open the drawer.');
const recoveryHint = ref('Open the drawer to inspect deterministic event ordering and fallback behavior.');
const stateError = ref('');
const expandedEventIds = ref<Set<string>>(new Set());

const currentScenarioLabel = computed(() => resolveScenarioLabel(selectedScenario.value));

async function loadDrawerData() {
  loading.value = true;
  stateError.value = '';
  expandedEventIds.value = new Set();
  try {
    const fixture = await loadPaymentAttemptScenario(selectedScenario.value);
    selectedFixture.value = fixture;
    const normalized = normalizeTimelineEvents(fixture.events);
    timelineRows.value = normalized.rows;
    malformedCount.value = normalized.malformedCount;
    const nextState = buildTimelineViewState({
      rowsCount: timelineRows.value.length,
      malformedCount: malformedCount.value,
      paymentReference: fixture.paymentReference,
    });
    stateMessage.value = nextState.message;
    recoveryHint.value = nextState.recoveryHint;
  } catch (error: any) {
    const paymentReferenceForHint = selectedFixture.value?.paymentReference || `scenario:${selectedScenario.value}`;
    selectedFixture.value = null;
    timelineRows.value = [];
    malformedCount.value = 0;
    const errorMessage = error?.message || 'Unable to load timeline fixture.';
    stateError.value = errorMessage;
    const nextState = buildTimelineViewState({
      rowsCount: 0,
      malformedCount: 0,
      paymentReference: paymentReferenceForHint,
      loadErrorMessage: errorMessage,
    });
    stateMessage.value = nextState.message;
    recoveryHint.value = nextState.recoveryHint;
  } finally {
    loading.value = false;
  }
}

function openDrawer() {
  drawerOpen.value = true;
  drawerCollapsed.value = false;
  void loadDrawerData();
}

function closeDrawer() {
  drawerOpen.value = false;
  drawerCollapsed.value = false;
  expandedEventIds.value = new Set();
}

function toggleDrawerCollapse() {
  drawerCollapsed.value = !drawerCollapsed.value;
}

function isLongNote(note: string): boolean {
  return note.length > 96;
}

function isExpanded(eventId: string): boolean {
  return expandedEventIds.value.has(eventId);
}

function toggleEventExpanded(eventId: string) {
  const next = new Set(expandedEventIds.value);
  if (next.has(eventId)) {
    next.delete(eventId);
  } else {
    next.add(eventId);
  }
  expandedEventIds.value = next;
}

watch(selectedScenario, () => {
  if (drawerOpen.value) {
    void loadDrawerData();
  }
});

onMounted(() => {
  if (autoOpenDrawer) {
    openDrawer();
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
      <aside class="timeline-drawer" :class="{ collapsed: drawerCollapsed }">
        <header class="drawer-header">
          <div>
            <h3>{{ currentScenarioLabel }} Timeline</h3>
            <small>{{ selectedFixture?.paymentReference || 'payment fixture' }}</small>
          </div>
          <div class="inline-actions">
            <button type="button" class="link" @click="toggleDrawerCollapse">
              {{ drawerCollapsed ? 'Expand' : 'Collapse' }}
            </button>
            <button type="button" class="link" @click="closeDrawer">Close</button>
          </div>
        </header>

        <p v-if="loading" class="state">Loading deterministic timeline fixture...</p>

        <template v-else>
          <p class="state" :class="{ error: stateError }">{{ stateError || stateMessage }}</p>
          <p class="state">{{ recoveryHint }}</p>
          <p v-if="malformedCount > 0" class="state malformed-note">
            {{ malformedCount }} malformed event(s) were skipped to keep operator diagnostics safe.
          </p>

          <div v-if="timelineRows.length && !drawerCollapsed" class="table-wrap drawer-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Timestamp (UTC)</th>
                  <th>Status</th>
                  <th>Event</th>
                  <th>Actor</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(event, idx) in timelineRows" :key="event.id">
                  <td>
                    <strong>{{ event.orderLabel }}</strong>
                    <small>#{{ idx + 1 }}</small>
                  </td>
                  <td>{{ new Date(event.occurredAt).toISOString() }}</td>
                  <td><span :class="`attempt-status status-${event.status}`">{{ event.status }}</span></td>
                  <td>{{ event.stage }}</td>
                  <td>{{ event.actor }}</td>
                  <td>
                    <p :class="{ 'note-clamped': isLongNote(event.note) && !isExpanded(event.id) }">{{ event.note }}</p>
                    <button
                      v-if="isLongNote(event.note)"
                      type="button"
                      class="link"
                      @click="toggleEventExpanded(event.id)"
                    >
                      {{ isExpanded(event.id) ? 'Collapse note' : 'Expand note' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else-if="!timelineRows.length" class="state">No timeline rows to show for this scenario.</p>
          <p v-else class="state">Drawer collapsed. Expand to view timeline rows.</p>
        </template>
      </aside>
    </section>
  </main>
</template>
