<script setup lang="ts">
import {
  buildRemediationQueueCanonicalAutofixPreview,
  buildRemediationQueueHandoffPanel,
  buildRemediationQueueTriageWorkspace,
  moveRemediationQueueSelection,
  resolveRemediationQueueShortcut,
} from '../utils/wave1';

const fixtureRows = [
  {
    id: 'queue-300',
    issueIdentifier: 'ONE-300',
    remediationType: 'release-gate',
    severityWeight: 1,
    blockerWeight: 1,
    dependencyDepthWeight: 1,
    remediationTypeWeight: 2,
    title: 'QA release-gate verdict packet continuity',
    evidencePath: 'artifacts/one-300/test-settlement-qa-release-gate-verdict-packet-endpoint.log',
    branch: 'feature/one-300-remediation-queue',
    fullSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    prLink: 'https://github.com/1siamBot/payment-gateway/pull/300',
    testCommand: 'npm test -- test/frontend.wave1.spec.ts',
    artifactPath: 'artifacts/one-300/test-settlement-qa-release-gate-verdict-packet-endpoint.log',
    nextOwner: 'qa',
    blockingDependencies: [],
    canonicalLinks: [
      '/ONE/issues/ONE-300',
      '/ONE/issues/ONE-299#document-plan',
      '/ONE/issues/ONE-291',
    ],
  },
  {
    id: 'queue-301',
    issueIdentifier: 'ONE-301',
    remediationType: 'queue-contract',
    severityWeight: 1,
    blockerWeight: 2,
    dependencyDepthWeight: 2,
    remediationTypeWeight: 1,
    title: 'Release candidate remediation queue contract alignment',
    evidencePath: 'artifacts/one-301/test-settlement-release-candidate-remediation-queue-endpoint.log',
    branch: '',
    fullSha: '',
    prLink: '',
    testCommand: '',
    artifactPath: '',
    nextOwner: 'frontend engineer',
    blockingDependencies: ['ONE-292 credential restore', 'ONE-286 publication credential unblock'],
    canonicalLinks: [
      '/issues/ONE-301',
      '/ONE/issues/ONE-286',
      '/ONE/issues/ONE-292#comment-1',
    ],
  },
  {
    id: 'queue-299',
    issueIdentifier: 'ONE-299',
    remediationType: 'dependency-graph',
    severityWeight: 2,
    blockerWeight: 2,
    dependencyDepthWeight: 2,
    remediationTypeWeight: 3,
    title: 'Release-ready dependency graph snapshot verification',
    evidencePath: 'artifacts/one-299/jest-release-ready-dependency-graph-snapshot.log',
    branch: 'feature/one-299-deterministic-graph',
    fullSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    prLink: 'https://github.com/1siamBot/payment-gateway/pull/299',
    testCommand: 'npm test -- test/settlement-release-ready-dependency-graph-snapshot-endpoint.spec.ts',
    artifactPath: 'artifacts/one-299/jest-release-ready-dependency-graph-snapshot.log',
    nextOwner: 'pm',
    blockingDependencies: ['ONE-291 QA preflight'],
    canonicalLinks: [
      '/ONE/issues/ONE-299',
      '/ONE/issues/ONE-291#document-plan',
    ],
  },
];

const activeRowId = ref('');
const validationState = ref('Validation not run yet.');
const handoffPanelOpen = ref(false);
const queueRef = ref<HTMLElement | null>(null);
const handoffRef = ref<HTMLElement | null>(null);
const markdownInput = ref([
  '- queue source: /issues/ONE-301',
  '- verdict packet: /ONE/issues/ONE-300#document-plan',
  '- release note: https://paperclip.dev/issues/ONE-299#comment-10',
].join('\n'));

const workspace = computed(() => buildRemediationQueueTriageWorkspace({
  rows: fixtureRows,
  activeRowId: activeRowId.value,
}));

watch(workspace, (next) => {
  activeRowId.value = next.activeRowId;
}, { immediate: true });

const activeRow = computed(() => workspace.value.rows.find((row) => row.id === activeRowId.value) ?? null);
const handoffPanel = computed(() => buildRemediationQueueHandoffPanel({ rows: workspace.value.rows }));
const autofixPreview = computed(() => buildRemediationQueueCanonicalAutofixPreview({ markdown: markdownInput.value }));

function runValidationPass() {
  const readyCount = workspace.value.rows.filter((row) => row.machineFields.readyForExecution).length;
  const blockedCount = workspace.value.rows.length - readyCount;
  validationState.value = `Deterministic validation pass complete: ${readyCount} ready / ${blockedCount} blocked.`;
}

function focusQueue() {
  queueRef.value?.focus();
}

function openHandoffPanel() {
  handoffPanelOpen.value = true;
  handoffRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

function onGlobalKeydown(event: KeyboardEvent) {
  const shortcut = resolveRemediationQueueShortcut({
    key: event.key,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  });
  if (!shortcut) {
    return;
  }
  if (shortcut !== 'run_validation_pass' && isTextInputTarget(event.target)) {
    return;
  }
  event.preventDefault();
  if (shortcut === 'focus_queue') {
    focusQueue();
    return;
  }
  if (shortcut === 'next_item' || shortcut === 'prev_item') {
    activeRowId.value = moveRemediationQueueSelection({
      rows: workspace.value.rows,
      activeRowId: activeRowId.value,
      direction: shortcut,
    });
    return;
  }
  if (shortcut === 'open_handoff_panel') {
    openHandoffPanel();
    return;
  }
  runValidationPass();
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
});
</script>

<template>
  <main class="page">
    <section class="hero">
      <h1>Deterministic Remediation Queue Triage Workspace</h1>
      <p>Fixture-only operator workspace for queue ordering, machine-field handoff, and canonical-link validation.</p>
    </section>

    <section class="card">
      <h2>Queue Triage</h2>
      <p class="state">
        Keyboard: <code>Alt+Q</code> focus queue, <code>Alt+Shift+N/P</code> move items,
        <code>Ctrl+Shift+H</code> open handoff panel, <code>Ctrl+Shift+Enter</code> validate pass.
      </p>
      <p class="state">{{ validationState }}</p>

      <div
        ref="queueRef"
        class="table-wrap remediation-queue-wrap"
        tabindex="0"
        role="region"
        aria-label="Remediation queue"
      >
        <table>
          <thead>
            <tr>
              <th>Issue</th>
              <th>Type</th>
              <th>Ordering Key</th>
              <th>Ready</th>
              <th>Next Owner</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in workspace.rows"
              :key="row.id"
              :class="{ 'queue-row-active': row.id === activeRowId }"
              @click="activeRowId = row.id"
            >
              <td>
                <strong>{{ row.issueIdentifier }}</strong>
                <small>{{ row.title }}</small>
              </td>
              <td>{{ row.remediationType }}</td>
              <td>
                {{ row.orderingKey.join(' / ') }}
              </td>
              <td>{{ row.machineFields.readyForExecution ? 'yes' : 'no' }}</td>
              <td>{{ row.machineFields.nextOwner }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section ref="handoffRef" class="card">
      <h2>Operator Handoff Panel</h2>
      <div class="inline-actions">
        <button type="button" @click="openHandoffPanel">Open Handoff Details</button>
        <button type="button" class="link" @click="runValidationPass">Run Deterministic Validation Pass</button>
      </div>

      <div v-if="handoffPanelOpen" class="triage-grid" style="margin-top: 0.75rem;">
        <article class="detail-panel" v-if="activeRow">
          <h3>{{ activeRow.issueIdentifier }} Machine Fields</h3>
          <p><strong>readyForExecution:</strong> {{ activeRow.machineFields.readyForExecution }}</p>
          <p><strong>nextOwner:</strong> {{ activeRow.machineFields.nextOwner }}</p>
          <h4>missingEvidence[]</h4>
          <ul class="timeline-list">
            <li v-for="field in activeRow.machineFields.missingEvidence" :key="`${activeRow.id}-${field}`">{{ field }}</li>
            <li v-if="!activeRow.machineFields.missingEvidence.length">none</li>
          </ul>
          <h4>blockingDependencies[]</h4>
          <ul class="timeline-list">
            <li v-for="dep in activeRow.machineFields.blockingDependencies" :key="`${activeRow.id}-${dep}`">{{ dep }}</li>
            <li v-if="!activeRow.machineFields.blockingDependencies.length">none</li>
          </ul>
          <h4>canonicalLinkViolations[]</h4>
          <ul class="timeline-list">
            <li v-for="violation in activeRow.machineFields.canonicalLinkViolations" :key="`${activeRow.id}-${violation}`">{{ violation }}</li>
            <li v-if="!activeRow.machineFields.canonicalLinkViolations.length">none</li>
          </ul>
        </article>

        <article class="detail-panel">
          <h3>Copy-Ready Handoff Markdown</h3>
          <pre class="code-preview">{{ handoffPanel.markdown }}</pre>
        </article>
      </div>
    </section>

    <section class="card">
      <h2>Canonical-Link Autofix Preview</h2>
      <form class="grid" @submit.prevent>
        <label>
          Markdown input
          <textarea v-model="markdownInput" rows="6" />
        </label>
      </form>
      <p class="state">
        Changed: {{ autofixPreview.changedCount }} | Invalid: {{ autofixPreview.invalidCount }}
      </p>
      <div class="triage-grid">
        <article class="detail-panel">
          <h3>Autofix Rows</h3>
          <ul class="timeline-list">
            <li v-for="row in autofixPreview.rows" :key="row.id">
              <strong>{{ row.original }}</strong>
              <div>{{ row.normalized }}</div>
            </li>
          </ul>
        </article>
        <article class="detail-panel">
          <h3>Copy Output</h3>
          <pre class="code-preview">{{ autofixPreview.copyText }}</pre>
        </article>
      </div>
    </section>
  </main>
</template>
