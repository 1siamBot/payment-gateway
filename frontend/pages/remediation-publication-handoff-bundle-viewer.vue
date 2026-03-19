<script setup lang="ts">
import {
  buildPublicationHandoffBundleViewer,
  buildPublicationHandoffCanonicalAutofixPreview,
  buildPublicationHandoffExportValidator,
  movePublicationHandoffBundleSelection,
  resolvePublicationHandoffBundleShortcut,
} from '../utils/wave1';

const fixtureRows = [
  {
    id: 'handoff-304',
    issueIdentifier: 'ONE-304',
    sectionWeight: 1,
    blockerWeight: 1,
    dependencyDepthWeight: 1,
    evidenceTypeWeight: 1,
    sectionTitle: 'Backend continuity packet for remediation publication handoff',
    evidenceType: 'backend_continuity_packet',
    evidencePath: 'artifacts/one-304/remediation-publication-handoff-bundle.md',
    nextOwner: 'qa',
    ownerCoverage: 1,
    requiredArtifacts: [],
    blockingDependencies: [],
    branch: 'feature/one-308-handoff-bundle-viewer',
    fullSha: 'cccccccccccccccccccccccccccccccccccccccc',
    prLink: 'https://github.com/1siamBot/payment-gateway/pull/308',
    testCommand: 'npm test -- test/frontend.wave1.spec.ts',
    artifactPath: 'artifacts/one-308/test-frontend-wave1.log',
    canonicalLinks: ['/ONE/issues/ONE-304', '/ONE/issues/ONE-301', '/ONE/issues/ONE-305#document-plan'],
  },
  {
    id: 'handoff-306',
    issueIdentifier: 'ONE-306',
    sectionWeight: 1,
    blockerWeight: 2,
    dependencyDepthWeight: 2,
    evidenceTypeWeight: 2,
    sectionTitle: 'Frontend queue preflight packet before QA publish lane',
    evidenceType: 'frontend_preflight_packet',
    evidencePath: 'artifacts/one-306/remediation-publication-handoff-bundle.md',
    nextOwner: 'frontend engineer',
    ownerCoverage: 0.5,
    requiredArtifacts: ['dependencyMapSnapshot'],
    blockingDependencies: ['ONE-307 release-gate publication on hold'],
    branch: '',
    fullSha: '',
    prLink: '',
    testCommand: '',
    artifactPath: '',
    canonicalLinks: ['/issues/ONE-306', '/ONE/issues/ONE-307', '/ONE/issues/ONE-305#comment-2'],
  },
  {
    id: 'handoff-305',
    issueIdentifier: 'ONE-305',
    sectionWeight: 2,
    blockerWeight: 1,
    dependencyDepthWeight: 1,
    evidenceTypeWeight: 1,
    sectionTitle: 'QA downstream preflight readiness packet',
    evidenceType: 'qa_preflight_packet',
    evidencePath: 'artifacts/one-305/remediation-publication-handoff-bundle.md',
    nextOwner: 'qa',
    ownerCoverage: 1,
    requiredArtifacts: [],
    blockingDependencies: [],
    branch: 'feature/one-305-qa-lane',
    fullSha: 'dddddddddddddddddddddddddddddddddddddddd',
    prLink: 'https://github.com/1siamBot/payment-gateway/pull/305',
    testCommand: 'npm test -- test/settlement-remediation-publication-handoff-bundle-endpoint.spec.ts',
    artifactPath: 'artifacts/one-305/test-settlement-remediation-publication-handoff-bundle-endpoint.log',
    canonicalLinks: ['/ONE/issues/ONE-305', '/ONE/issues/ONE-304'],
  },
];

const activeSectionId = ref('');
const exportPreviewOpen = ref(false);
const validationState = ref('Export validation has not run yet.');
const viewerRef = ref<HTMLElement | null>(null);
const exportRef = ref<HTMLElement | null>(null);
const markdownInput = ref([
  '- handoff source: /issues/ONE-306',
  '- backend continuity: /ONE/issues/ONE-304#document-plan',
  '- qa preflight: https://paperclip.dev/issues/ONE-305#comment-2',
].join('\n'));

const viewer = computed(() => buildPublicationHandoffBundleViewer({
  rows: fixtureRows,
  activeSectionId: activeSectionId.value,
}));
const activeSection = computed(() => viewer.value.rows.find((row) => row.id === activeSectionId.value) ?? null);
const exportValidator = computed(() => buildPublicationHandoffExportValidator({
  rows: viewer.value.rows,
}));
const autofixPreview = computed(() => buildPublicationHandoffCanonicalAutofixPreview({
  markdown: markdownInput.value,
}));

watch(viewer, (next) => {
  activeSectionId.value = next.activeSectionId;
}, { immediate: true });

function runExportValidationPass() {
  validationState.value = `Deterministic export validation complete: ${viewer.value.readyForQACount} ready / ${viewer.value.blockedCount} blocked.`;
}

function focusHandoffViewer() {
  viewerRef.value?.focus();
}

function openExportPreview() {
  exportPreviewOpen.value = true;
  exportRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

function onGlobalKeydown(event: KeyboardEvent) {
  const shortcut = resolvePublicationHandoffBundleShortcut({
    key: event.key,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  });
  if (!shortcut) {
    return;
  }
  if (shortcut !== 'run_export_validation' && isTextInputTarget(event.target)) {
    return;
  }
  event.preventDefault();
  if (shortcut === 'focus_handoff_viewer') {
    focusHandoffViewer();
    return;
  }
  if (shortcut === 'next_section' || shortcut === 'prev_section') {
    activeSectionId.value = movePublicationHandoffBundleSelection({
      rows: viewer.value.rows,
      activeSectionId: activeSectionId.value,
      direction: shortcut,
    });
    return;
  }
  if (shortcut === 'open_export_preview') {
    openExportPreview();
    return;
  }
  runExportValidationPass();
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
      <h1>Deterministic Remediation Publication Handoff Bundle Viewer</h1>
      <p>Fixture-mode section viewer with export validator machine fields, canonical-link autofix preview, and QA handoff checks.</p>
    </section>

    <section class="card">
      <h2>Handoff Bundle Viewer</h2>
      <p class="state">
        Keyboard: <code>Alt+H</code> focus viewer, <code>Alt+Shift+N/P</code> move sections,
        <code>Ctrl+Shift+V</code> run export validation, <code>Ctrl+Shift+E</code> open export preview.
      </p>
      <p class="state">{{ validationState }}</p>

      <div
        ref="viewerRef"
        class="table-wrap remediation-queue-wrap"
        tabindex="0"
        role="region"
        aria-label="Remediation publication handoff bundle viewer"
      >
        <table>
          <thead>
            <tr>
              <th>Issue</th>
              <th>Section</th>
              <th>Ordering Key</th>
              <th>Ready for QA</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in viewer.rows"
              :key="row.id"
              :class="{ 'queue-row-active': row.id === activeSectionId }"
              @click="activeSectionId = row.id"
            >
              <td>
                <strong>{{ row.issueIdentifier }}</strong>
                <small>{{ row.evidencePath }}</small>
              </td>
              <td>{{ row.sectionTitle }}</td>
              <td>{{ row.orderingKey.join(' / ') }}</td>
              <td>{{ row.machineFields.readyForQA ? 'yes' : 'no' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section ref="exportRef" class="card">
      <h2>Export Validator</h2>
      <div class="inline-actions">
        <button type="button" @click="openExportPreview">Open Export Preview</button>
        <button type="button" class="link" @click="runExportValidationPass">Run Export Validation</button>
      </div>

      <div v-if="exportPreviewOpen" class="triage-grid" style="margin-top: 0.75rem;">
        <article class="detail-panel" v-if="activeSection">
          <h3>{{ activeSection.issueIdentifier }} Machine Fields</h3>
          <p><strong>bundleFingerprint:</strong> {{ activeSection.machineFields.bundleFingerprint }}</p>
          <p><strong>ownerCoverage:</strong> {{ activeSection.machineFields.ownerCoverage.toFixed(2) }}</p>
          <p><strong>readyForQA:</strong> {{ activeSection.machineFields.readyForQA }}</p>
          <h4>missingArtifacts[]</h4>
          <ul class="timeline-list">
            <li v-for="item in activeSection.machineFields.missingArtifacts" :key="`${activeSection.id}-${item}`">{{ item }}</li>
            <li v-if="!activeSection.machineFields.missingArtifacts.length">none</li>
          </ul>
          <h4>nonCanonicalLinks[]</h4>
          <ul class="timeline-list">
            <li v-for="item in activeSection.machineFields.nonCanonicalLinks" :key="`${activeSection.id}-${item}`">{{ item }}</li>
            <li v-if="!activeSection.machineFields.nonCanonicalLinks.length">none</li>
          </ul>
        </article>
        <article class="detail-panel">
          <h3>Copy-Ready Validator Markdown</h3>
          <pre class="code-preview">{{ exportValidator.markdown }}</pre>
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
