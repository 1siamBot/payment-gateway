<script setup lang="ts">
import {
  buildRemediationPlanDiffInspector,
  buildRemediationPlanEvidenceExportComposer,
  buildRemediationPlanDiffCanonicalAutofixPreview,
  moveRemediationPlanDiffSelection,
  resolveRemediationPlanDiffShortcut,
} from '../utils/wave1';

const fixtureRows = [
  {
    id: 'diff-340',
    issueIdentifier: 'ONE-340',
    sectionKey: 'contract_alignment',
    sectionWeight: 1,
    rowOrder: 1,
    title: 'Remediation contract tuple aligned with deterministic export order',
    planFingerprintBefore: 'one340-contract-before-0001',
    planFingerprintAfter: 'one340-contract-after-0002',
    changedActions: [
      'align contract section tuple ordering',
      'publish deterministic snapshot checksum',
    ],
    newBlocks: [],
    resolvedBlocks: ['ONE-286 credential unblock'],
    evidenceDelta: [],
    nextOwner: 'frontend engineer',
    canonicalLinks: ['/ONE/issues/ONE-340', '/ONE/issues/ONE-339#document-plan'],
  },
  {
    id: 'diff-339',
    issueIdentifier: 'ONE-339',
    sectionKey: 'qa_handoff',
    sectionWeight: 2,
    rowOrder: 1,
    title: 'QA parity handoff updated with remediation diff evidence coverage',
    planFingerprintBefore: 'one339-qa-before-0010',
    planFingerprintAfter: 'one339-qa-after-0011',
    changedActions: ['append QA export verification checklist'],
    newBlocks: ['ONE-341 dependency packet still blocked'],
    resolvedBlocks: [],
    evidenceDelta: ['missing_frontend_build_log'],
    nextOwner: 'qa',
    canonicalLinks: ['/issues/ONE-339', '/ONE/issues/ONE-292'],
  },
  {
    id: 'diff-338',
    issueIdentifier: 'ONE-338',
    sectionKey: 'link_validation',
    sectionWeight: 3,
    rowOrder: 1,
    title: 'Canonical link normalization pass over remediation evidence markdown',
    planFingerprintBefore: 'one338-links-before-0004',
    planFingerprintAfter: 'one338-links-after-0005',
    changedActions: [
      'normalize unprefixed /issues links to /ONE paths',
      'patch comment/document anchors to canonical format',
    ],
    newBlocks: [],
    resolvedBlocks: ['ONE-337 reason-code mapping mismatch'],
    evidenceDelta: [],
    nextOwner: 'pm',
    canonicalLinks: ['/ONE/issues/ONE-338', '/ONE/issues/ONE-337#comment-12'],
  },
];

const activeDiffRowId = ref('');
const validationState = ref('Validation not run yet.');
const composerOpen = ref(false);
const inspectorRef = ref<HTMLElement | null>(null);
const composerRef = ref<HTMLElement | null>(null);
const markdownInput = ref([
  '- source issue: /issues/ONE-340',
  '- plan document: /ONE/issues/ONE-339#document-plan',
  '- evidence thread: https://paperclip.dev/issues/ONE-338#comment-9',
].join('\n'));

const inspector = computed(() => buildRemediationPlanDiffInspector({
  rows: fixtureRows,
  activeDiffRowId: activeDiffRowId.value,
}));
const exportComposer = computed(() => buildRemediationPlanEvidenceExportComposer({
  rows: inspector.value.rows,
}));
const autofixPreview = computed(() => buildRemediationPlanDiffCanonicalAutofixPreview({
  markdown: markdownInput.value,
}));
const activeDiffRow = computed(() => inspector.value.rows.find((row) => row.id === activeDiffRowId.value) ?? null);

watch(inspector, (next) => {
  activeDiffRowId.value = next.activeDiffRowId;
}, { immediate: true });

function focusInspector() {
  inspectorRef.value?.focus();
}

function openExportComposer() {
  composerOpen.value = true;
  composerRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function runDeterministicValidationPass() {
  const stableSnapshot = JSON.stringify(exportComposer.value.items);
  validationState.value = [
    `Deterministic validation pass complete: ${inspector.value.readyForQaCount} ready / ${inspector.value.blockedCount} blocked.`,
    `Export snapshot bytes: ${stableSnapshot.length}.`,
  ].join(' ');
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

function onGlobalKeydown(event: KeyboardEvent) {
  const shortcut = resolveRemediationPlanDiffShortcut({
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
  if (shortcut === 'focus_diff_inspector') {
    focusInspector();
    return;
  }
  if (shortcut === 'next_diff_row' || shortcut === 'prev_diff_row') {
    activeDiffRowId.value = moveRemediationPlanDiffSelection({
      rows: inspector.value.rows,
      activeDiffRowId: activeDiffRowId.value,
      direction: shortcut,
    });
    return;
  }
  if (shortcut === 'open_export_composer') {
    openExportComposer();
    return;
  }
  runDeterministicValidationPass();
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
      <h1>Deterministic Remediation-Plan Diff Inspector</h1>
      <p>Fixture-mode remediation-plan diffs with machine-field summaries and copy-ready PM/QA evidence exports.</p>
    </section>

    <section class="card">
      <h2>Diff Inspector</h2>
      <p class="state">
        Keyboard: <code>Alt+D</code> focus inspector, <code>Alt+Shift+N/P</code> next/previous diff row,
        <code>Ctrl+Shift+E</code> open export composer, <code>Ctrl+Shift+Enter</code> run deterministic validation pass.
      </p>
      <p class="state">{{ validationState }}</p>

      <div
        ref="inspectorRef"
        class="table-wrap remediation-queue-wrap"
        tabindex="0"
        role="region"
        aria-label="Remediation-plan diff inspector"
      >
        <table>
          <thead>
            <tr>
              <th>Issue</th>
              <th>Section</th>
              <th>planFingerprintBefore</th>
              <th>planFingerprintAfter</th>
              <th>readyForQA</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in inspector.rows"
              :key="row.id"
              :class="{ 'queue-row-active': row.id === activeDiffRowId }"
              @click="activeDiffRowId = row.id"
            >
              <td>
                <strong>{{ row.issueIdentifier }}</strong>
                <small>{{ row.title }}</small>
              </td>
              <td>{{ row.sectionKey }}</td>
              <td>{{ row.machineFields.planFingerprintBefore }}</td>
              <td>{{ row.machineFields.planFingerprintAfter }}</td>
              <td>{{ row.machineFields.readyForQA ? 'yes' : 'no' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section ref="composerRef" class="card">
      <h2>Evidence Export Composer</h2>
      <div class="inline-actions">
        <button type="button" @click="openExportComposer">Open Export Composer</button>
        <button type="button" class="link" @click="runDeterministicValidationPass">Run Deterministic Validation Pass</button>
      </div>

      <div v-if="composerOpen" class="triage-grid" style="margin-top: 0.75rem;">
        <article class="detail-panel" v-if="activeDiffRow">
          <h3>{{ activeDiffRow.issueIdentifier }} Machine Fields</h3>
          <p><strong>planFingerprintBefore:</strong> {{ activeDiffRow.machineFields.planFingerprintBefore }}</p>
          <p><strong>planFingerprintAfter:</strong> {{ activeDiffRow.machineFields.planFingerprintAfter }}</p>
          <p><strong>nextOwner:</strong> {{ activeDiffRow.machineFields.nextOwner }}</p>
          <p><strong>readyForQA:</strong> {{ activeDiffRow.machineFields.readyForQA }}</p>

          <h4>changedActions[]</h4>
          <ul class="timeline-list">
            <li v-for="item in activeDiffRow.machineFields.changedActions" :key="`${activeDiffRow.id}-changed-${item}`">{{ item }}</li>
            <li v-if="!activeDiffRow.machineFields.changedActions.length">none</li>
          </ul>

          <h4>newBlocks[]</h4>
          <ul class="timeline-list">
            <li v-for="item in activeDiffRow.machineFields.newBlocks" :key="`${activeDiffRow.id}-new-${item}`">{{ item }}</li>
            <li v-if="!activeDiffRow.machineFields.newBlocks.length">none</li>
          </ul>

          <h4>resolvedBlocks[]</h4>
          <ul class="timeline-list">
            <li v-for="item in activeDiffRow.machineFields.resolvedBlocks" :key="`${activeDiffRow.id}-resolved-${item}`">{{ item }}</li>
            <li v-if="!activeDiffRow.machineFields.resolvedBlocks.length">none</li>
          </ul>

          <h4>evidenceDelta[]</h4>
          <ul class="timeline-list">
            <li v-for="item in activeDiffRow.machineFields.evidenceDelta" :key="`${activeDiffRow.id}-delta-${item}`">{{ item }}</li>
            <li v-if="!activeDiffRow.machineFields.evidenceDelta.length">none</li>
          </ul>
        </article>

        <article class="detail-panel">
          <h3>Copy-Ready Export Markdown</h3>
          <pre class="code-preview">{{ exportComposer.markdown }}</pre>
        </article>
      </div>
    </section>

    <section class="card">
      <h2>Canonical-Link Autofix Preview</h2>
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
              <td colspan="3">No links found.</td>
            </tr>
            <tr v-for="row in autofixPreview.rows" :key="row.id">
              <td><code>{{ row.original }}</code></td>
              <td><code>{{ row.normalized }}</code></td>
              <td>{{ row.changed ? 'yes' : 'no' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <label style="margin-top: 0.75rem; display: block;">
        Patched Markdown
        <textarea :value="autofixPreview.copyText" rows="6" readonly />
      </label>
    </section>
  </main>
</template>
