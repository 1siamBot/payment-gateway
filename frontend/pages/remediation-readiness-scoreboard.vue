<script setup lang="ts">
import {
  buildRemediationDispatchBriefGenerator,
  buildRemediationReadinessScoreboard,
  moveRemediationReadinessScoreboardSelection,
  resolveRemediationReadinessShortcut,
} from '../utils/wave1';

const fixtureRows = [
  {
    id: 'readiness-343',
    issueIdentifier: 'ONE-343',
    planSet: 'release-gate-parity',
    title: 'Release-gate parity remediation follow-through',
    planFingerprint: 'one343-rgp-0001',
    readinessScore: 93,
    blockingCount: 0,
    evidenceCoverage: 96,
    nextOwner: 'qa',
    dispatchPriority: 'high',
    canonicalLinks: [
      '/ONE/issues/ONE-343',
      '/ONE/issues/ONE-341#document-plan',
      '/ONE/issues/ONE-340#comment-7',
    ],
  },
  {
    id: 'readiness-341',
    issueIdentifier: 'ONE-341',
    planSet: 'remediation-plan-explorer',
    title: 'Remediation plan explorer execution checklist parity',
    planFingerprint: 'one341-rpe-0002',
    readinessScore: 81,
    blockingCount: 1,
    evidenceCoverage: 84,
    nextOwner: 'frontend engineer',
    dispatchPriority: 'critical',
    canonicalLinks: [
      '/issues/ONE-341',
      '/ONE/issues/ONE-340',
      '/ONE/issues/ONE-339#document-plan',
    ],
  },
  {
    id: 'readiness-339',
    issueIdentifier: 'ONE-339',
    planSet: 'canonical-link-hardening',
    title: 'Canonical-link hardening and fallback dispatch copy',
    planFingerprint: 'one339-clh-0001',
    readinessScore: 74,
    blockingCount: 2,
    evidenceCoverage: 62,
    nextOwner: 'pm',
    dispatchPriority: 'medium',
    canonicalLinks: [
      '/ONE/issues/ONE-339',
      '/ONE/issues/ONE-338#comment-11',
      'https://paperclip.dev/issues/ONE-337#document-plan',
    ],
  },
];

const activeRowId = ref('');
const validationState = ref('Validation not run yet.');
const briefOpen = ref(false);
const scoreboardRef = ref<HTMLElement | null>(null);
const briefRef = ref<HTMLElement | null>(null);
const relatedLinksText = ref([
  '/issues/ONE-343',
  '/issues/ONE-341#document-plan',
  '/ONE/issues/ONE-340#comment-7',
  'https://paperclip.dev/issues/ONE-339',
].join('\n'));

const scoreboard = computed(() => buildRemediationReadinessScoreboard({
  rows: fixtureRows,
  activeRowId: activeRowId.value,
}));

watch(scoreboard, (next) => {
  activeRowId.value = next.activeRowId;
}, { immediate: true });

const activeRow = computed(() => scoreboard.value.rows.find((row) => row.id === activeRowId.value) ?? null);
const dispatchBrief = computed(() => buildRemediationDispatchBriefGenerator({
  rows: scoreboard.value.rows,
  relatedLinksText: relatedLinksText.value,
}));

function runValidationPass() {
  validationState.value = `Deterministic validation pass complete: ${scoreboard.value.readyForQaCount} ready / ${scoreboard.value.blockedCount} blocked.`;
}

function focusScoreboard() {
  scoreboardRef.value?.focus();
}

function openDispatchBrief() {
  briefOpen.value = true;
  briefRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

function onGlobalKeydown(event: KeyboardEvent) {
  const shortcut = resolveRemediationReadinessShortcut({
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
  if (shortcut === 'focus_scoreboard') {
    focusScoreboard();
    return;
  }
  if (shortcut === 'next_row' || shortcut === 'prev_row') {
    activeRowId.value = moveRemediationReadinessScoreboardSelection({
      rows: scoreboard.value.rows,
      activeRowId: activeRowId.value,
      direction: shortcut,
    });
    return;
  }
  if (shortcut === 'open_dispatch_brief_generator') {
    openDispatchBrief();
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
      <h1>Deterministic Remediation Readiness Scoreboard</h1>
      <p>Fixture-mode scoreboard for multi-plan readiness ordering, machine fields, and dispatch brief generation.</p>
    </section>

    <section class="card">
      <h2>Readiness Scoreboard</h2>
      <p class="state">
        Keyboard: <code>Alt+S</code> focus scoreboard, <code>Alt+Shift+N/P</code> move rows,
        <code>Ctrl+Shift+B</code> open dispatch brief, <code>Ctrl+Shift+Enter</code> run validation.
      </p>
      <p class="state">{{ validationState }}</p>

      <div
        ref="scoreboardRef"
        class="table-wrap remediation-queue-wrap"
        tabindex="0"
        role="region"
        aria-label="Remediation readiness scoreboard"
      >
        <table>
          <thead>
            <tr>
              <th>Issue</th>
              <th>Plan Set</th>
              <th>Ordering Key</th>
              <th>Dispatch Priority</th>
              <th>readyForQA</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in scoreboard.rows"
              :key="row.id"
              :class="{ 'queue-row-active': row.id === activeRowId }"
              @click="activeRowId = row.id"
            >
              <td>
                <strong>{{ row.issueIdentifier }}</strong>
                <small>{{ row.title }}</small>
              </td>
              <td>{{ row.planSet }}</td>
              <td>{{ row.orderingKey.join(' / ') }}</td>
              <td>{{ row.machineFields.dispatchPriority }}</td>
              <td>{{ row.machineFields.readyForQA ? 'yes' : 'no' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section ref="briefRef" class="card">
      <h2>Dispatch Brief Generator</h2>
      <div class="inline-actions">
        <button type="button" @click="openDispatchBrief">Open Dispatch Brief</button>
        <button type="button" class="link" @click="runValidationPass">Run Deterministic Validation Pass</button>
      </div>

      <div v-if="briefOpen" class="triage-grid" style="margin-top: 0.75rem;">
        <article class="detail-panel" v-if="activeRow">
          <h3>{{ activeRow.issueIdentifier }} Machine Fields</h3>
          <p><strong>planFingerprint:</strong> {{ activeRow.machineFields.planFingerprint }}</p>
          <p><strong>readinessScore:</strong> {{ activeRow.machineFields.readinessScore }}</p>
          <p><strong>blockingCount:</strong> {{ activeRow.machineFields.blockingCount }}</p>
          <p><strong>evidenceCoverage:</strong> {{ activeRow.machineFields.evidenceCoverage }}</p>
          <p><strong>nextOwner:</strong> {{ activeRow.machineFields.nextOwner }}</p>
          <p><strong>dispatchPriority:</strong> {{ activeRow.machineFields.dispatchPriority }}</p>
          <p><strong>readyForQA:</strong> {{ activeRow.machineFields.readyForQA }}</p>
          <h4>canonicalLinkViolations[]</h4>
          <ul class="timeline-list">
            <li v-for="link in activeRow.canonicalLinkViolations" :key="`${activeRow.id}-${link}`">{{ link }}</li>
            <li v-if="!activeRow.canonicalLinkViolations.length">none</li>
          </ul>
        </article>

        <article class="detail-panel">
          <h3>Copy-Ready Dispatch Brief Markdown</h3>
          <pre class="code-preview">{{ dispatchBrief.markdown }}</pre>
        </article>
      </div>
    </section>

    <section class="card">
      <h2>Canonical-Link Autofix Preview</h2>
      <label>
        Related links markdown
        <textarea v-model="relatedLinksText" rows="6" />
      </label>
      <p class="state">
        Changed: {{ dispatchBrief.canonicalAutofixPreview.changedCount }} |
        Invalid: {{ dispatchBrief.canonicalAutofixPreview.invalidCount }}
      </p>
      <div class="triage-grid">
        <article class="detail-panel">
          <h3>Autofix Rows</h3>
          <ul class="timeline-list">
            <li v-for="row in dispatchBrief.canonicalAutofixPreview.rows" :key="row.id">
              <strong>{{ row.original }}</strong>
              <div>{{ row.normalized }}</div>
            </li>
          </ul>
        </article>
        <article class="detail-panel">
          <h3>Copy Output</h3>
          <pre class="code-preview">{{ dispatchBrief.canonicalAutofixPreview.copyText }}</pre>
        </article>
      </div>
    </section>
  </main>
</template>
