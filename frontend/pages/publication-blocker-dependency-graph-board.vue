<script setup lang="ts">
import {
  buildPublicationBlockerCanonicalAutofixPreview,
  buildPublicationBlockerDependencyGraphBoard,
  buildPublicationBlockerEvidenceDigest,
  movePublicationBlockerDependencySelection,
  resolvePublicationBlockerDependencyShortcut,
} from '../utils/wave1';

const fixtureRows = [
  {
    id: 'blocker-304',
    issueIdentifier: 'ONE-304',
    blockerWeight: 1,
    dependencyDepthWeight: 1,
    blockerTypeWeight: 1,
    blockerType: 'backend_contract',
    title: 'Backend remediation contract packet continuity',
    evidencePath: 'artifacts/one-304/remediation-execution-blueprint-packet.md',
    branch: 'feature/one-304-remediation',
    fullSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    prLink: 'https://github.com/1siamBot/payment-gateway/pull/304',
    testCommand: 'npm test -- test/settlement-remediation-execution-blueprint-packet-endpoint.spec.ts',
    artifactPath: 'artifacts/one-304/remediation-execution-blueprint-packet.log',
    requiredArtifacts: [],
    upstreamDependencies: [],
    canonicalLinks: ['/ONE/issues/ONE-304', '/ONE/issues/ONE-301'],
    nextOwner: 'qa',
  },
  {
    id: 'blocker-306',
    issueIdentifier: 'ONE-306',
    blockerWeight: 1,
    dependencyDepthWeight: 2,
    blockerTypeWeight: 2,
    blockerType: 'frontend_handoff',
    title: 'Frontend remediation queue lane dependency hold',
    evidencePath: 'artifacts/one-306/remediation-queue-workspace.md',
    branch: '',
    fullSha: '',
    prLink: '',
    testCommand: '',
    artifactPath: '',
    requiredArtifacts: ['dependencyMapSnapshot'],
    upstreamDependencies: ['ONE-307', 'ONE-304'],
    canonicalLinks: ['/issues/ONE-306', '/ONE/issues/ONE-307'],
    nextOwner: 'frontend engineer',
  },
  {
    id: 'blocker-309',
    issueIdentifier: 'ONE-309',
    blockerWeight: 2,
    dependencyDepthWeight: 2,
    blockerTypeWeight: 1,
    blockerType: 'dependency_graph',
    title: 'Deterministic publication blocker dependency graph board',
    evidencePath: 'artifacts/one-309/publication-blocker-graph.md',
    branch: 'feature/one-309-dependency-graph-board',
    fullSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    prLink: 'https://github.com/1siamBot/payment-gateway/pull/309',
    testCommand: 'npm test -- test/frontend.wave1.spec.ts',
    artifactPath: 'artifacts/one-309/test-frontend-wave1.log',
    requiredArtifacts: [],
    upstreamDependencies: ['ONE-306', 'ONE-305'],
    canonicalLinks: ['/ONE/issues/ONE-309', '/ONE/issues/ONE-306#document-plan'],
    nextOwner: 'pm',
  },
];

const activeNodeId = ref('');
const digestOpen = ref(false);
const validationState = ref('Canonical-link validation has not run yet.');
const boardRef = ref<HTMLElement | null>(null);
const digestRef = ref<HTMLElement | null>(null);
const markdownInput = ref([
  '- board source: /issues/ONE-309',
  '- frontend lane: /ONE/issues/ONE-306#document-plan',
  '- dependency comment: https://paperclip.dev/issues/ONE-307#comment-3',
].join('\n'));

const board = computed(() => buildPublicationBlockerDependencyGraphBoard({
  rows: fixtureRows,
  activeNodeId: activeNodeId.value,
}));
const activeNode = computed(() => board.value.nodes.find((node) => node.id === activeNodeId.value) ?? null);
const digest = computed(() => buildPublicationBlockerEvidenceDigest({ nodes: board.value.nodes }));
const autofixPreview = computed(() => buildPublicationBlockerCanonicalAutofixPreview({ markdown: markdownInput.value }));

watch(board, (next) => {
  activeNodeId.value = next.activeNodeId;
}, { immediate: true });

function focusBoard() {
  boardRef.value?.focus();
}

function openDigest() {
  digestOpen.value = true;
  digestRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function runCanonicalValidation() {
  validationState.value = `Canonical-link validation complete: ${autofixPreview.value.changedCount} rewrites, ${autofixPreview.value.invalidCount} invalid.`;
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

function onGlobalKeydown(event: KeyboardEvent) {
  const shortcut = resolvePublicationBlockerDependencyShortcut({
    key: event.key,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  });
  if (!shortcut) {
    return;
  }
  if (shortcut !== 'run_canonical_link_validation' && isTextInputTarget(event.target)) {
    return;
  }
  event.preventDefault();
  if (shortcut === 'focus_dependency_board') {
    focusBoard();
    return;
  }
  if (shortcut === 'next_blocker' || shortcut === 'prev_blocker') {
    activeNodeId.value = movePublicationBlockerDependencySelection({
      nodes: board.value.nodes,
      activeNodeId: activeNodeId.value,
      direction: shortcut,
    });
    return;
  }
  if (shortcut === 'open_evidence_digest') {
    openDigest();
    return;
  }
  runCanonicalValidation();
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
      <h1>Deterministic Publication Blocker Dependency Graph Board</h1>
      <p>Fixture-mode dependency graph with stable machine fields, evidence digest output, and canonical-link autofix validation.</p>
    </section>

    <section class="card">
      <h2>Dependency Graph Board</h2>
      <p class="state">
        Keyboard: <code>Alt+D</code> focus board, <code>Alt+Shift+N/P</code> move blockers,
        <code>Ctrl+Shift+G</code> open evidence digest, <code>Ctrl+Shift+L</code> run canonical-link validation.
      </p>
      <p class="state">{{ validationState }}</p>
      <div
        ref="boardRef"
        class="table-wrap remediation-queue-wrap"
        tabindex="0"
        role="region"
        aria-label="Publication blocker dependency graph board"
      >
        <table>
          <thead>
            <tr>
              <th>Issue</th>
              <th>Type</th>
              <th>Ordering Key</th>
              <th>Ready for QA</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="node in board.nodes"
              :key="node.id"
              :class="{ 'queue-row-active': node.id === activeNodeId }"
              @click="activeNodeId = node.id"
            >
              <td>
                <strong>{{ node.issueIdentifier }}</strong>
                <small>{{ node.title }}</small>
              </td>
              <td>{{ node.blockerType }}</td>
              <td>{{ node.orderingKey.join(' / ') }}</td>
              <td>{{ node.machineFields.readyForQA ? 'yes' : 'no' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3 style="margin-top: 0.75rem;">Graph Edges</h3>
      <ul class="timeline-list">
        <li v-for="edge in board.edges" :key="edge.id">
          {{ edge.fromIssueIdentifier }} → {{ edge.toIssueIdentifier }}
        </li>
        <li v-if="!board.edges.length">No dependency edges.</li>
      </ul>
    </section>

    <section ref="digestRef" class="card">
      <h2>Evidence Digest</h2>
      <div class="inline-actions">
        <button type="button" @click="openDigest">Open Evidence Digest</button>
        <button type="button" class="link" @click="runCanonicalValidation">Run Canonical-Link Validation</button>
      </div>
      <div v-if="digestOpen" class="triage-grid" style="margin-top: 0.75rem;">
        <article class="detail-panel" v-if="activeNode">
          <h3>{{ activeNode.issueIdentifier }} Machine Fields</h3>
          <p><strong>blockerFingerprint:</strong> {{ activeNode.machineFields.blockerFingerprint }}</p>
          <p><strong>nextOwner:</strong> {{ activeNode.machineFields.nextOwner }}</p>
          <p><strong>readyForQA:</strong> {{ activeNode.machineFields.readyForQA }}</p>
          <h4>upstreamDependencies[]</h4>
          <ul class="timeline-list">
            <li v-for="item in activeNode.machineFields.upstreamDependencies" :key="`${activeNode.id}-dep-${item}`">{{ item }}</li>
            <li v-if="!activeNode.machineFields.upstreamDependencies.length">none</li>
          </ul>
          <h4>requiredArtifacts[]</h4>
          <ul class="timeline-list">
            <li v-for="item in activeNode.machineFields.requiredArtifacts" :key="`${activeNode.id}-artifact-${item}`">{{ item }}</li>
            <li v-if="!activeNode.machineFields.requiredArtifacts.length">none</li>
          </ul>
          <h4>canonicalLinkViolations[]</h4>
          <ul class="timeline-list">
            <li
              v-for="item in activeNode.machineFields.canonicalLinkViolations"
              :key="`${activeNode.id}-canonical-${item}`"
            >
              {{ item }}
            </li>
            <li v-if="!activeNode.machineFields.canonicalLinkViolations.length">none</li>
          </ul>
        </article>
        <article class="detail-panel">
          <h3>Copy-Ready Evidence Digest</h3>
          <pre class="code-preview">{{ digest.markdown }}</pre>
        </article>
      </div>
    </section>

    <section class="card">
      <h2>Canonical-Link Autofix Preview</h2>
      <label>
        Candidate Markdown
        <textarea v-model="markdownInput" rows="6" />
      </label>
      <p class="state">Changed links: {{ autofixPreview.changedCount }} | Invalid links: {{ autofixPreview.invalidCount }}</p>
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
