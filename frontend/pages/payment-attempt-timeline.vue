<script setup lang="ts">
import {
  buildTimelineViewState,
  clearHandoffBundleDraftSafe,
  filterTimelineEvents,
  getDefaultOperatorHandoffBundleDraft,
  isRefundEligibleEvent,
  moveEvidenceTimelineSelection,
  normalizeEvidenceTimelineEvents,
  resolveEvidenceRailShortcut,
  type PaymentAttemptFixture,
  type EvidenceTimelineRow,
  type OperatorHandoffBundleDraft,
  type TimelineFilterKey,
  type TimelineEventRow,
  type TimelineScenarioKey,
  validateOperatorHandoffBundleDraft,
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
const filterChoices: Array<{ key: TimelineFilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'retry', label: 'Retry' },
  { key: 'failed', label: 'Failed' },
  { key: 'refund-eligible', label: 'Refund Eligible' },
];
const selectedFilter = ref<TimelineFilterKey>('all');
const autoOpenDrawer = shouldAutoOpenDrawer();
const selectedFixture = ref<PaymentAttemptFixture | null>(null);
const timelineRows = ref<TimelineEventRow[]>([]);
const malformedCount = ref(0);
const evidenceRows = ref<EvidenceTimelineRow[]>([]);
const evidenceMalformedCount = ref(0);
const activeEvidenceEventId = ref<string | null>(null);
const drawerOpen = ref(false);
const drawerCollapsed = ref(false);
const loading = ref(false);
const stateMessage = ref('Select a scenario and open the drawer.');
const recoveryHint = ref('Open the drawer to inspect deterministic event ordering and fallback behavior.');
const stateError = ref('');
const expandedEventIds = ref<Set<string>>(new Set());
const handoffDraft = ref<OperatorHandoffBundleDraft>(getDefaultOperatorHandoffBundleDraft());
const handoffValidationState = ref('Handoff bundle not validated yet.');
const handoffValidationError = ref('');
const handoffPanelRef = ref<HTMLElement | null>(null);
const handoffBranchInputRef = ref<HTMLInputElement | null>(null);

const currentScenarioLabel = computed(() => resolveScenarioLabel(selectedScenario.value));
const filteredTimelineRows = computed(() => filterTimelineEvents(timelineRows.value, selectedFilter.value));
const activeEvidenceEvent = computed(() => evidenceRows.value.find((row) => row.id === activeEvidenceEventId.value) || null);
const handoffValidation = computed(() => validateOperatorHandoffBundleDraft(handoffDraft.value));

async function loadDrawerData() {
  loading.value = true;
  stateError.value = '';
  expandedEventIds.value = new Set();
  selectedFilter.value = 'all';
  try {
    const fixture = await loadPaymentAttemptScenario(selectedScenario.value);
    selectedFixture.value = fixture;
    const normalized = normalizeTimelineEvents(fixture.events);
    const normalizedEvidence = normalizeEvidenceTimelineEvents(fixture.evidenceEvents);
    timelineRows.value = normalized.rows;
    malformedCount.value = normalized.malformedCount;
    evidenceRows.value = normalizedEvidence.rows;
    evidenceMalformedCount.value = normalizedEvidence.malformedCount;
    activeEvidenceEventId.value = normalizedEvidence.rows[0]?.id ?? null;
    handoffDraft.value = getDefaultOperatorHandoffBundleDraft();
    handoffValidationState.value = 'Handoff bundle not validated yet.';
    handoffValidationError.value = '';
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
    evidenceRows.value = [];
    evidenceMalformedCount.value = 0;
    activeEvidenceEventId.value = null;
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

function getFilterEmptyStateText(): string {
  if (selectedFilter.value === 'all') {
    return 'No timeline rows to show for this scenario.';
  }
  if (selectedFilter.value === 'refund-eligible') {
    return 'No refund-eligible rows match this scenario.';
  }
  return `No ${selectedFilter.value} rows match this scenario.`;
}

function validateHandoffBundle() {
  const validation = handoffValidation.value;
  if (validation.isComplete) {
    handoffValidationError.value = '';
    handoffValidationState.value = `${validation.summary} Artifact paths: ${validation.artifactPaths.join(', ')}`;
    return;
  }
  handoffValidationError.value = validation.summary;
  handoffValidationState.value = 'Handoff bundle incomplete.';
}

function clearHandoffDraft(performFullReset: boolean) {
  const next = clearHandoffBundleDraftSafe({
    confirmFullReset: performFullReset,
    selectedFilter: selectedFilter.value,
    activeEvidenceEventId: activeEvidenceEventId.value,
  });
  handoffDraft.value = next.draft;
  selectedFilter.value = next.selectedFilter;
  activeEvidenceEventId.value = next.activeEvidenceEventId;
  handoffValidationError.value = '';
  handoffValidationState.value = next.didFullReset
    ? 'Full reset complete: handoff draft, active rail event, and filter were cleared.'
    : 'Handoff draft cleared. Active rail selection and timeline filter were preserved.';
}

function focusHandoffBundle() {
  handoffPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  handoffBranchInputRef.value?.focus();
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
}

function onGlobalKeydown(event: KeyboardEvent) {
  if (!drawerOpen.value || drawerCollapsed.value) {
    return;
  }
  const shortcut = resolveEvidenceRailShortcut({
    key: event.key,
    ctrlKey: event.ctrlKey,
  });
  if (!shortcut) {
    return;
  }
  if (shortcut !== 'validate_handoff_bundle' && isTextInputTarget(event.target)) {
    return;
  }
  event.preventDefault();
  if (shortcut === 'next_event' || shortcut === 'prev_event') {
    activeEvidenceEventId.value = moveEvidenceTimelineSelection({
      rows: evidenceRows.value,
      activeEventId: activeEvidenceEventId.value,
      direction: shortcut === 'next_event' ? 'next' : 'prev',
    });
    return;
  }
  if (shortcut === 'focus_handoff_bundle') {
    focusHandoffBundle();
    return;
  }
  validateHandoffBundle();
}

watch(selectedScenario, () => {
  if (drawerOpen.value) {
    void loadDrawerData();
  }
});

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown);
  if (autoOpenDrawer) {
    openDrawer();
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
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
          <p v-if="evidenceMalformedCount > 0" class="state malformed-note">
            {{ evidenceMalformedCount }} malformed evidence event(s) were skipped from the rail.
          </p>

          <div v-if="!drawerCollapsed" class="rail-handoff-grid">
            <section class="rail-panel">
              <h4>Evidence Timeline Rail</h4>
              <p class="state shortcut-hint">Keyboard: <code>N</code> next, <code>P</code> previous, <code>H</code> focus bundle.</p>
              <div v-if="evidenceRows.length" class="evidence-rail-list-wrap">
                <ul class="evidence-rail-list">
                  <li v-for="event in evidenceRows" :key="event.id">
                    <button
                      type="button"
                      class="link rail-item"
                      :class="{ active: event.id === activeEvidenceEventId }"
                      @click="activeEvidenceEventId = event.id"
                    >
                      <strong>{{ event.railOrderLabel }}</strong>
                      <small>{{ new Date(event.eventTime).toISOString() }}</small>
                      <span>{{ event.eventType }}</span>
                      <span>{{ event.detail }}</span>
                    </button>
                  </li>
                </ul>
              </div>
              <p v-else class="state">No evidence rail events for this scenario.</p>
              <p v-if="activeEvidenceEvent" class="state">
                Active rail event: <strong>{{ activeEvidenceEvent.eventType }}</strong> by {{ activeEvidenceEvent.actor }}.
              </p>
            </section>

            <section ref="handoffPanelRef" class="handoff-panel">
              <h4>Operator Handoff Bundle</h4>
              <p class="state shortcut-hint">Keyboard: <code>Ctrl+Enter</code> validate completeness.</p>
              <div class="grid">
                <label>
                  Branch
                  <input ref="handoffBranchInputRef" v-model="handoffDraft.branch" placeholder="feature/one-247-evidence-rail" />
                </label>
                <label>
                  Full SHA
                  <input v-model="handoffDraft.fullSha" placeholder="40-char commit SHA" />
                </label>
                <label>
                  Publish Mode
                  <select v-model="handoffDraft.mode">
                    <option value="pr">PR</option>
                    <option value="no_pr">No PR Yet</option>
                  </select>
                </label>
                <label>
                  PR Link (required in PR mode)
                  <input v-model="handoffDraft.prLink" placeholder="https://github.com/org/repo/pull/123" />
                </label>
                <label>
                  Blocker Owner
                  <input v-model="handoffDraft.blockerOwner" placeholder="GitHub Admin / DevOps" />
                </label>
                <label>
                  ETA
                  <input v-model="handoffDraft.eta" placeholder="2026-03-20 18:00 UTC" />
                </label>
                <label class="handoff-artifacts">
                  Artifact Paths (one per line)
                  <textarea v-model="handoffDraft.artifactPathsText" rows="4" placeholder="artifacts/frontend/one-247/test-summary.txt"></textarea>
                </label>
              </div>
              <div class="inline-actions compact">
                <button type="button" class="link" @click="validateHandoffBundle">Validate Bundle</button>
                <button type="button" class="link" @click="clearHandoffDraft(false)">Clear Draft Only</button>
                <button
                  type="button"
                  class="danger"
                  @click="clearHandoffDraft(window.confirm('Full reset clears draft, active rail selection, and timeline filter. Continue?'))"
                >
                  Full Reset
                </button>
              </div>
              <p class="state" :class="{ error: handoffValidationError }">
                {{ handoffValidationError || handoffValidationState }}
              </p>
            </section>
          </div>

          <div v-if="timelineRows.length && !drawerCollapsed" class="filter-chips" role="tablist" aria-label="Timeline filters">
            <button
              v-for="choice in filterChoices"
              :key="choice.key"
              type="button"
              class="preset-chip"
              :class="{ active: selectedFilter === choice.key }"
              @click="selectedFilter = choice.key"
            >
              {{ choice.label }}
            </button>
          </div>

          <div v-if="filteredTimelineRows.length && !drawerCollapsed" class="table-wrap drawer-table-wrap">
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
                <tr v-for="(event, idx) in filteredTimelineRows" :key="event.id">
                  <td>
                    <strong>{{ event.orderLabel }}</strong>
                    <small>#{{ idx + 1 }}</small>
                  </td>
                  <td>{{ new Date(event.occurredAt).toISOString() }}</td>
                  <td>
                    <span :class="`attempt-status status-${event.status}`">{{ event.status }}</span>
                    <span v-if="isRefundEligibleEvent(event, timelineRows)" class="attempt-status refund-eligible">
                      Refund eligible
                    </span>
                  </td>
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
          <p v-else-if="!drawerCollapsed" class="state">{{ getFilterEmptyStateText() }}</p>
          <p v-else class="state">Drawer collapsed. Expand to view timeline rows.</p>
        </template>
      </aside>
    </section>
  </main>
</template>
