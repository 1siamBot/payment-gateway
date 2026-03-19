<script setup lang="ts">
import {
  buildRemediationExecutionChecklistComposer,
  buildRemediationPlanCanonicalAutofixPreview,
  buildRemediationPlanExplorer,
  moveRemediationPlanSelection,
  resolveRemediationPlanShortcut,
} from '../utils/wave1';

const fixtureRows = [
  {
    id: 'plan-340-contract',
    issueIdentifier: 'ONE-340',
    sectionKey: 'contract_alignment',
    sectionWeight: 1,
    itemOrder: 1,
    title: 'Align remediation plan compiler output ordering and section labels',
    planFingerprint: 'one340-contract-0001',
    requiredActions: [
      'confirm compiler section ordering tuple',
      'attach deterministic fixture checksum evidence',
    ],
    blockedDependencies: [],
    evidenceGaps: [],
    owner: 'frontend engineer',
  },
  {
    id: 'plan-339-qa',
    issueIdentifier: 'ONE-339',
    sectionKey: 'qa_handoff',
    sectionWeight: 2,
    itemOrder: 1,
    title: 'Prepare deterministic QA handoff matrix parity package',
    planFingerprint: 'one339-qa-0001',
    requiredActions: [
      'publish qa handoff markdown packet',
    ],
    blockedDependencies: ['ONE-286 credential unblock'],
    evidenceGaps: ['qa_signoff'],
    owner: 'qa',
  },
  {
    id: 'plan-338-links',
    issueIdentifier: 'ONE-338',
    sectionKey: 'link_validation',
    sectionWeight: 3,
    itemOrder: 1,
    title: 'Normalize issue/comment/document links to canonical /ONE paths',
    planFingerprint: 'one338-link-0001',
    requiredActions: [
      'run canonical link autofix preview',
      'copy corrected markdown into checklist packet',
    ],
    blockedDependencies: [],
    evidenceGaps: [],
    owner: 'pm',
  },
];

const activePlanItemId = ref('');
const validationState = ref('Validation not run yet.');
const checklistOpen = ref(false);
const explorerRef = ref<HTMLElement | null>(null);
const checklistRef = ref<HTMLElement | null>(null);
const markdownInput = ref([
  '- parent: /issues/ONE-340',
  '- context: /ONE/issues/ONE-339#document-plan',
  '- thread: https://paperclip.dev/issues/ONE-338#comment-9',
].join('\n'));

const explorer = computed(() => buildRemediationPlanExplorer({
  rows: fixtureRows,
  activePlanItemId: activePlanItemId.value,
}));
const checklistComposer = computed(() => buildRemediationExecutionChecklistComposer({ rows: explorer.value.rows }));
const autofixPreview = computed(() => buildRemediationPlanCanonicalAutofixPreview({ markdown: markdownInput.value }));
const activePlanItem = computed(() => explorer.value.rows.find((row) => row.id === activePlanItemId.value) ?? null);

watch(explorer, (next) => {
  activePlanItemId.value = next.activePlanItemId;
}, { immediate: true });

function focusExplorer() {
  explorerRef.value?.focus();
}

function openChecklistComposer() {
  checklistOpen.value = true;
  checklistRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function runDeterministicValidationPass() {
  const stableSnapshot = JSON.stringify(checklistComposer.value.items);
  validationState.value = [
    `Deterministic validation pass complete: ${explorer.value.readyForQaCount} ready / ${explorer.value.blockedCount} blocked.`,
    `Checklist snapshot bytes: ${stableSnapshot.length}.`,
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
  const shortcut = resolveRemediationPlanShortcut({
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
  if (shortcut === 'focus_plan_explorer') {
    focusExplorer();
    return;
  }
  if (shortcut === 'next_plan_item' || shortcut === 'prev_plan_item') {
    activePlanItemId.value = moveRemediationPlanSelection({
      rows: explorer.value.rows,
      activePlanItemId: activePlanItemId.value,
      direction: shortcut,
    });
    return;
  }
  if (shortcut === 'open_checklist_composer') {
    openChecklistComposer();
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
      <h1>Deterministic Remediation Plan Explorer</h1>
      <p>Fixture-only remediation plan explorer with execution checklist composer for PM/QA handoff.</p>
    </section>

    <section class="card">
      <h2>Plan Explorer</h2>
      <p class="state">
        Keyboard: <code>Alt+R</code> focus explorer, <code>Alt+Shift+N/P</code> next/previous plan item,
        <code>Ctrl+Shift+K</code> open checklist composer, <code>Ctrl+Shift+Enter</code> run deterministic validation pass.
      </p>
      <p class="state">{{ validationState }}</p>

      <div
        ref="explorerRef"
        class="table-wrap remediation-queue-wrap"
        tabindex="0"
        role="region"
        aria-label="Remediation plan explorer"
      >
        <table>
          <thead>
            <tr>
              <th>Issue</th>
              <th>Section</th>
              <th>Order Key</th>
              <th>Owner</th>
              <th>readyForQA</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in explorer.rows"
              :key="row.id"
              :class="{ 'queue-row-active': row.id === activePlanItemId }"
              @click="activePlanItemId = row.id"
            >
              <td>
                <strong>{{ row.issueIdentifier }}</strong>
                <small>{{ row.title }}</small>
              </td>
              <td>{{ row.sectionKey }}</td>
              <td>{{ row.orderingKey.join(' / ') }}</td>
              <td>{{ row.machineFields.owner }}</td>
              <td>{{ row.machineFields.readyForQA ? 'yes' : 'no' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section ref="checklistRef" class="card">
      <h2>Execution Checklist Composer</h2>
      <div class="inline-actions">
        <button type="button" @click="openChecklistComposer">Open Checklist Composer</button>
        <button type="button" class="link" @click="runDeterministicValidationPass">Run Deterministic Validation Pass</button>
      </div>

      <div v-if="checklistOpen" class="triage-grid" style="margin-top: 0.75rem;">
        <article class="detail-panel" v-if="activePlanItem">
          <h3>{{ activePlanItem.issueIdentifier }} Machine Fields</h3>
          <p><strong>planFingerprint:</strong> {{ activePlanItem.machineFields.planFingerprint }}</p>
          <p><strong>owner:</strong> {{ activePlanItem.machineFields.owner }}</p>
          <p><strong>readyForQA:</strong> {{ activePlanItem.machineFields.readyForQA }}</p>
          <h4>requiredActions[]</h4>
          <ul class="timeline-list">
            <li v-for="item in activePlanItem.machineFields.requiredActions" :key="`${activePlanItem.id}-action-${item}`">{{ item }}</li>
            <li v-if="!activePlanItem.machineFields.requiredActions.length">none</li>
          </ul>
          <h4>blockedDependencies[]</h4>
          <ul class="timeline-list">
            <li v-for="item in activePlanItem.machineFields.blockedDependencies" :key="`${activePlanItem.id}-blocked-${item}`">{{ item }}</li>
            <li v-if="!activePlanItem.machineFields.blockedDependencies.length">none</li>
          </ul>
          <h4>evidenceGaps[]</h4>
          <ul class="timeline-list">
            <li v-for="item in activePlanItem.machineFields.evidenceGaps" :key="`${activePlanItem.id}-gap-${item}`">{{ item }}</li>
            <li v-if="!activePlanItem.machineFields.evidenceGaps.length">none</li>
          </ul>
        </article>

        <article class="detail-panel">
          <h3>Copy-Ready Checklist Markdown</h3>
          <pre class="code-preview">{{ checklistComposer.markdown }}</pre>
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
