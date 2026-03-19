<script setup lang="ts">
import {
  buildReleaseGateCanonicalAutofixPreview,
  buildReleaseGateRemediationActionMatrix,
  buildReleaseGateVerdictExplorer,
  moveReleaseGateVerdictSelection,
  resolveReleaseGateVerdictShortcut,
} from '../utils/wave1';

const fixtureRows = [
  {
    id: 'verdict-300',
    issueIdentifier: 'ONE-300',
    remediationType: 'qa_release_gate_packet',
    gatePriorityWeight: 1,
    blockerWeight: 1,
    dependencyDepthWeight: 1,
    remediationTypeWeight: 1,
    title: 'QA release-gate verdict packet continuity',
    evidencePath: 'artifacts/one-300/test-settlement-qa-release-gate-verdict-packet-endpoint.log',
    releaseGateState: 'pass',
    requiredRemediations: [],
    blockingDependencies: [],
    missingEvidence: [],
    nextOwner: 'qa',
    branch: 'feature/one-300-verdict-explorer',
    fullSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    prLink: 'https://github.com/1siamBot/payment-gateway/pull/300',
    testCommand: 'npm test -- test/frontend.wave1.spec.ts',
    artifactPath: 'artifacts/one-300/test-settlement-qa-release-gate-verdict-packet-endpoint.log',
    canonicalLinks: ['/ONE/issues/ONE-300', '/ONE/issues/ONE-291'],
  },
  {
    id: 'verdict-301',
    issueIdentifier: 'ONE-301',
    remediationType: 'remediation_queue_contract',
    gatePriorityWeight: 1,
    blockerWeight: 2,
    dependencyDepthWeight: 2,
    remediationTypeWeight: 2,
    title: 'Release candidate remediation queue contract alignment',
    evidencePath: 'artifacts/one-301/test-settlement-release-candidate-remediation-queue-endpoint.log',
    releaseGateState: 'block',
    requiredRemediations: ['backfill queue machine-field parity'],
    blockingDependencies: ['ONE-292 credential restore', 'ONE-286 publication credential unblock'],
    missingEvidence: [],
    nextOwner: 'frontend engineer',
    branch: '',
    fullSha: '',
    prLink: '',
    testCommand: '',
    artifactPath: '',
    canonicalLinks: ['/issues/ONE-301', '/ONE/issues/ONE-286'],
  },
  {
    id: 'verdict-299',
    issueIdentifier: 'ONE-299',
    remediationType: 'dependency_graph_snapshot',
    gatePriorityWeight: 2,
    blockerWeight: 1,
    dependencyDepthWeight: 1,
    remediationTypeWeight: 3,
    title: 'Release-ready dependency graph snapshot verification',
    evidencePath: 'artifacts/one-299/jest-release-ready-dependency-graph-snapshot.log',
    releaseGateState: 'warn',
    requiredRemediations: ['confirm dependency graph checksum stability'],
    blockingDependencies: ['ONE-291 QA preflight'],
    missingEvidence: ['operatorSignoff'],
    nextOwner: 'pm',
    branch: 'feature/one-299-deterministic-graph',
    fullSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    prLink: 'https://github.com/1siamBot/payment-gateway/pull/299',
    testCommand: 'npm test -- test/settlement-release-ready-dependency-graph-snapshot-endpoint.spec.ts',
    artifactPath: 'artifacts/one-299/jest-release-ready-dependency-graph-snapshot.log',
    canonicalLinks: ['/ONE/issues/ONE-299', '/ONE/issues/ONE-291#document-plan'],
  },
];

const activeVerdictId = ref('');
const matrixOpen = ref(false);
const validationState = ref('Validation not run yet.');
const verdictRef = ref<HTMLElement | null>(null);
const matrixRef = ref<HTMLElement | null>(null);
const markdownInput = ref([
  '- release gate source: /issues/ONE-301',
  '- verdict packet: /ONE/issues/ONE-300#document-plan',
  '- dependent issue: https://paperclip.dev/issues/ONE-299#comment-10',
].join('\n'));

const explorer = computed(() => buildReleaseGateVerdictExplorer({
  rows: fixtureRows,
  activeVerdictId: activeVerdictId.value,
}));
const activeVerdict = computed(() => explorer.value.rows.find((row) => row.id === activeVerdictId.value) ?? null);
const matrix = computed(() => buildReleaseGateRemediationActionMatrix({ rows: explorer.value.rows }));
const autofixPreview = computed(() => buildReleaseGateCanonicalAutofixPreview({ markdown: markdownInput.value }));

watch(explorer, (next) => {
  activeVerdictId.value = next.activeVerdictId;
}, { immediate: true });

function runValidationPass() {
  validationState.value = `Deterministic validation pass complete: ${explorer.value.readyCount} ready / ${explorer.value.blockedCount} blocked.`;
}

function focusVerdictExplorer() {
  verdictRef.value?.focus();
}

function openRemediationMatrix() {
  matrixOpen.value = true;
  matrixRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

function onGlobalKeydown(event: KeyboardEvent) {
  const shortcut = resolveReleaseGateVerdictShortcut({
    key: event.key,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  });
  if (!shortcut) {
    return;
  }
  if (shortcut !== 'run_deterministic_validation_pass' && isTextInputTarget(event.target)) {
    return;
  }
  event.preventDefault();
  if (shortcut === 'focus_verdict_explorer') {
    focusVerdictExplorer();
    return;
  }
  if (shortcut === 'next_verdict' || shortcut === 'prev_verdict') {
    activeVerdictId.value = moveReleaseGateVerdictSelection({
      rows: explorer.value.rows,
      activeVerdictId: activeVerdictId.value,
      direction: shortcut,
    });
    return;
  }
  if (shortcut === 'open_remediation_matrix') {
    openRemediationMatrix();
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
      <h1>Deterministic Release-Gate Verdict Explorer</h1>
      <p>Fixture-mode verdict packets with deterministic ordering, machine-field matrix output, and canonical-link autofix preview.</p>
    </section>

    <section class="card">
      <h2>Verdict Explorer</h2>
      <p class="state">
        Keyboard: <code>Alt+G</code> focus explorer, <code>Alt+Shift+N/P</code> move verdicts,
        <code>Ctrl+Shift+M</code> open matrix, <code>Ctrl+Shift+Enter</code> validation pass.
      </p>
      <p class="state">{{ validationState }}</p>

      <div
        ref="verdictRef"
        class="table-wrap remediation-queue-wrap"
        tabindex="0"
        role="region"
        aria-label="Release-gate verdict explorer"
      >
        <table>
          <thead>
            <tr>
              <th>Issue</th>
              <th>State</th>
              <th>Type</th>
              <th>Ordering Key</th>
              <th>Ready</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in explorer.rows"
              :key="row.id"
              :class="{ 'queue-row-active': row.id === activeVerdictId }"
              @click="activeVerdictId = row.id"
            >
              <td>
                <strong>{{ row.issueIdentifier }}</strong>
                <small>{{ row.title }}</small>
              </td>
              <td>{{ row.machineFields.releaseGateState }}</td>
              <td>{{ row.remediationType }}</td>
              <td>{{ row.orderingKey.join(' / ') }}</td>
              <td>{{ row.machineFields.readyForExecution ? 'yes' : 'no' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section ref="matrixRef" class="card">
      <h2>Remediation Action Matrix</h2>
      <div class="inline-actions">
        <button type="button" @click="openRemediationMatrix">Open Matrix Details</button>
        <button type="button" class="link" @click="runValidationPass">Run Deterministic Validation Pass</button>
      </div>

      <div v-if="matrixOpen" class="triage-grid" style="margin-top: 0.75rem;">
        <article class="detail-panel" v-if="activeVerdict">
          <h3>{{ activeVerdict.issueIdentifier }} Machine Fields</h3>
          <p><strong>releaseGateState:</strong> {{ activeVerdict.machineFields.releaseGateState }}</p>
          <p><strong>readyForExecution:</strong> {{ activeVerdict.machineFields.readyForExecution }}</p>
          <p><strong>nextOwner:</strong> {{ activeVerdict.machineFields.nextOwner }}</p>
          <h4>requiredRemediations[]</h4>
          <ul class="timeline-list">
            <li v-for="item in activeVerdict.machineFields.requiredRemediations" :key="`${activeVerdict.id}-${item}`">{{ item }}</li>
            <li v-if="!activeVerdict.machineFields.requiredRemediations.length">none</li>
          </ul>
          <h4>blockingDependencies[]</h4>
          <ul class="timeline-list">
            <li v-for="item in activeVerdict.machineFields.blockingDependencies" :key="`${activeVerdict.id}-${item}`">{{ item }}</li>
            <li v-if="!activeVerdict.machineFields.blockingDependencies.length">none</li>
          </ul>
          <h4>missingEvidence[]</h4>
          <ul class="timeline-list">
            <li v-for="item in activeVerdict.machineFields.missingEvidence" :key="`${activeVerdict.id}-${item}`">{{ item }}</li>
            <li v-if="!activeVerdict.machineFields.missingEvidence.length">none</li>
          </ul>
          <h4>canonicalLinkViolations[]</h4>
          <ul class="timeline-list">
            <li v-for="item in activeVerdict.canonicalLinkViolations" :key="`${activeVerdict.id}-${item}`">{{ item }}</li>
            <li v-if="!activeVerdict.canonicalLinkViolations.length">none</li>
          </ul>
        </article>

        <article class="detail-panel">
          <h3>Copy-Ready Matrix Markdown</h3>
          <pre class="code-preview">{{ matrix.markdown }}</pre>
        </article>
      </div>
    </section>

    <section class="card">
      <h2>Canonical-Link Validator / Autofix</h2>
      <label>
        Candidate Markdown
        <textarea v-model="markdownInput" rows="6" />
      </label>
      <p class="state">
        Changed links: {{ autofixPreview.changedCount }} | Invalid links: {{ autofixPreview.invalidCount }}
      </p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Original</th>
              <th>Normalized</th>
              <th>Changed</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!autofixPreview.rows.length">
              <td colspan="3">No link candidates found.</td>
            </tr>
            <tr v-for="row in autofixPreview.rows" :key="row.id">
              <td><code>{{ row.original }}</code></td>
              <td><code>{{ row.normalized }}</code></td>
              <td>{{ row.changed ? 'yes' : 'no' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3>Copy-Ready Markdown</h3>
      <pre class="code-preview">{{ autofixPreview.copyText }}</pre>
    </section>
  </main>
</template>
