<script setup lang="ts">
import {
  buildPublicationBlockerReadinessDeltaInspector,
  buildPublicationBlockerTimelineCanonicalAutofixPreview,
  buildPublicationBlockerTimelineReplayPanel,
  movePublicationBlockerTimelineSnapshot,
  resolvePublicationBlockerTimelineReplayShortcut,
} from '../utils/wave1';

const fixtureSnapshots = [
  {
    snapshotId: 'snapshot-2026-03-18',
    snapshotTs: '2026-03-18T02:00:00.000Z',
    snapshotLabel: 'Snapshot 1 - Baseline blockers',
    blockers: [
      {
        id: 'snapshot-1-one-304',
        issueIdentifier: 'ONE-304',
        blockerWeight: 1,
        dependencyDepthWeight: 1,
        blockerTypeWeight: 1,
        blockerType: 'backend_contract',
        title: 'Backend remediation publication contract still open',
        actionWeight: 1,
        actionCode: 'await_backend_publish_packet',
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
        id: 'snapshot-1-one-310',
        issueIdentifier: 'ONE-310',
        blockerWeight: 2,
        dependencyDepthWeight: 2,
        blockerTypeWeight: 2,
        blockerType: 'frontend_replay',
        title: 'Replay panel slice still missing PR evidence',
        actionWeight: 2,
        actionCode: 'prepare_replay_delta_inspector',
        branch: '',
        fullSha: '',
        prLink: '',
        testCommand: '',
        artifactPath: '',
        requiredArtifacts: ['replayValidationLog'],
        upstreamDependencies: ['ONE-309'],
        canonicalLinks: ['/issues/ONE-310'],
        nextOwner: 'frontend engineer',
      },
    ],
  },
  {
    snapshotId: 'snapshot-2026-03-19',
    snapshotTs: '2026-03-19T02:00:00.000Z',
    snapshotLabel: 'Snapshot 2 - Replay update',
    blockers: [
      {
        id: 'snapshot-2-one-304',
        issueIdentifier: 'ONE-304',
        blockerWeight: 1,
        dependencyDepthWeight: 1,
        blockerTypeWeight: 1,
        blockerType: 'backend_contract',
        title: 'Backend remediation publication contract still open',
        actionWeight: 1,
        actionCode: 'await_backend_publish_packet',
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
        id: 'snapshot-2-one-310',
        issueIdentifier: 'ONE-310',
        blockerWeight: 2,
        dependencyDepthWeight: 1,
        blockerTypeWeight: 2,
        blockerType: 'frontend_replay',
        title: 'Replay panel slice now has deterministic fixture coverage',
        actionWeight: 1,
        actionCode: 'run_replay_validation',
        branch: 'feature/one-310-replay-panel',
        fullSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        prLink: 'https://github.com/1siamBot/payment-gateway/pull/310',
        testCommand: 'npm test -- test/frontend.wave1.spec.ts',
        artifactPath: 'artifacts/one-310/test-frontend-wave1.log',
        requiredArtifacts: [],
        upstreamDependencies: [],
        canonicalLinks: ['/ONE/issues/ONE-310', '/ONE/issues/ONE-309'],
        nextOwner: 'qa',
      },
    ],
  },
];

const activeSnapshotId = ref('');
const validationState = ref('Replay validation has not run yet.');
const inspectorOpen = ref(false);
const timelineRef = ref<HTMLElement | null>(null);
const inspectorRef = ref<HTMLElement | null>(null);
const markdownInput = ref([
  '- timeline source: /issues/ONE-310',
  '- dependency board: /ONE/issues/ONE-309#document-plan',
  '- readiness note: https://paperclip.dev/issues/ONE-308#comment-2',
].join('\n'));

const panel = computed(() => buildPublicationBlockerTimelineReplayPanel({
  snapshots: fixtureSnapshots,
  activeSnapshotId: activeSnapshotId.value,
}));
const replayRows = computed(() => panel.value.rows.filter((row) => row.snapshotId === panel.value.activeSnapshotId));
const deltaInspector = computed(() => buildPublicationBlockerReadinessDeltaInspector({
  panel: panel.value,
  activeSnapshotId: panel.value.activeSnapshotId,
}));
const autofixPreview = computed(() => buildPublicationBlockerTimelineCanonicalAutofixPreview({ markdown: markdownInput.value }));

watch(panel, (next) => {
  activeSnapshotId.value = next.activeSnapshotId;
}, { immediate: true });

function focusTimelinePanel() {
  timelineRef.value?.focus();
}

function openDeltaInspector() {
  inspectorOpen.value = true;
  inspectorRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function runReplayValidation() {
  validationState.value = `Replay validation complete: ${deltaInspector.value.readyForQACount} ready / ${deltaInspector.value.blockedCount} blocked in active snapshot.`;
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

function onGlobalKeydown(event: KeyboardEvent) {
  const shortcut = resolvePublicationBlockerTimelineReplayShortcut({
    key: event.key,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  });
  if (!shortcut) {
    return;
  }
  if (shortcut !== 'run_replay_validation' && shortcut !== 'open_delta_inspector' && isTextInputTarget(event.target)) {
    return;
  }
  event.preventDefault();
  if (shortcut === 'focus_timeline_panel') {
    focusTimelinePanel();
    return;
  }
  if (shortcut === 'next_snapshot' || shortcut === 'prev_snapshot') {
    activeSnapshotId.value = movePublicationBlockerTimelineSnapshot({
      snapshots: panel.value.snapshotOrder,
      activeSnapshotId: panel.value.activeSnapshotId,
      direction: shortcut,
    });
    return;
  }
  if (shortcut === 'open_delta_inspector') {
    openDeltaInspector();
    return;
  }
  runReplayValidation();
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
      <h1>Deterministic Blocker Timeline Replay Panel</h1>
      <p>Fixture-mode blocker timeline with deterministic replay ordering, readiness delta machine fields, and canonical-link diff notes.</p>
    </section>

    <section class="card">
      <h2>Timeline Replay</h2>
      <p class="state">
        Keyboard: <code>Alt+T</code> focus timeline, <code>Alt+Shift+N/P</code> next/previous snapshot,
        <code>Ctrl+Shift+R</code> replay validation, <code>Ctrl+Shift+D</code> open delta inspector.
      </p>
      <p class="state">{{ validationState }}</p>

      <div class="inline-actions" style="margin-bottom: 0.75rem;">
        <button
          v-for="snapshot in panel.snapshotOrder"
          :key="snapshot.snapshotId"
          type="button"
          :class="{ link: snapshot.snapshotId !== panel.activeSnapshotId }"
          @click="activeSnapshotId = snapshot.snapshotId"
        >
          {{ snapshot.snapshotLabel }} ({{ snapshot.readyForQACount }} ready / {{ snapshot.blockedCount }} blocked)
        </button>
      </div>

      <div
        ref="timelineRef"
        class="table-wrap remediation-queue-wrap"
        tabindex="0"
        role="region"
        aria-label="Publication blocker timeline replay panel"
      >
        <table>
          <thead>
            <tr>
              <th>Issue</th>
              <th>Action</th>
              <th>Ordering Key</th>
              <th>Ready for QA</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in replayRows" :key="row.id">
              <td>
                <strong>{{ row.issueIdentifier }}</strong>
                <small>{{ row.title }}</small>
              </td>
              <td>{{ row.actionCode }}</td>
              <td>{{ row.orderingKey.join(' / ') }}</td>
              <td>{{ row.machineFields.readyForQA ? 'yes' : 'no' }}</td>
            </tr>
            <tr v-if="!replayRows.length">
              <td colspan="4">No replay rows.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section ref="inspectorRef" class="card">
      <h2>Readiness Delta Inspector</h2>
      <div class="inline-actions">
        <button type="button" @click="openDeltaInspector">Open Delta Inspector</button>
        <button type="button" class="link" @click="runReplayValidation">Run Replay Validation</button>
      </div>

      <div v-if="inspectorOpen" class="triage-grid" style="margin-top: 0.75rem;">
        <article class="detail-panel">
          <h3>Delta Rows</h3>
          <p>
            Active snapshot: <strong>{{ deltaInspector.activeSnapshotId }}</strong>
            <span v-if="deltaInspector.previousSnapshotId">| Previous: <strong>{{ deltaInspector.previousSnapshotId }}</strong></span>
          </p>
          <ul class="timeline-list">
            <li v-for="row in deltaInspector.rows" :key="row.id">
              <strong>{{ row.issueIdentifier }}</strong> |
              deltaFingerprint={{ row.deltaFingerprint }} |
              previous={{ row.previousState }} |
              current={{ row.currentState }} |
              ownerTransition={{ row.ownerTransition }} |
              readyForQA={{ row.readyForQA }}
            </li>
            <li v-if="!deltaInspector.rows.length">No delta rows.</li>
          </ul>
        </article>

        <article class="detail-panel">
          <h3>Machine Fields</h3>
          <div v-for="row in deltaInspector.rows" :key="`${row.id}-fields`" style="margin-bottom: 0.75rem;">
            <p><strong>{{ row.issueIdentifier }}</strong></p>
            <p><strong>newMissingArtifacts[]:</strong> {{ row.newMissingArtifacts.join(', ') || 'none' }}</p>
            <p><strong>resolvedDependencies[]:</strong> {{ row.resolvedDependencies.join(', ') || 'none' }}</p>
            <p><strong>canonicalLinkViolations[]:</strong> {{ row.canonicalLinkViolations.join(', ') || 'none' }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="card">
      <h2>Canonical-Link Autofix Diff</h2>
      <label>
        Candidate Markdown
        <textarea v-model="markdownInput" rows="7" />
      </label>
      <p class="state">Changed links: {{ autofixPreview.changedCount }} | Invalid links: {{ autofixPreview.invalidCount }}</p>
      <div class="triage-grid">
        <article class="detail-panel">
          <h3>Patched Markdown</h3>
          <pre class="code-preview">{{ autofixPreview.patchedMarkdown }}</pre>
        </article>
        <article class="detail-panel">
          <h3>Copy-Ready Diff Notes</h3>
          <pre class="code-preview">{{ autofixPreview.copyReadyMarkdownDiff }}</pre>
        </article>
      </div>
    </section>
  </main>
</template>
