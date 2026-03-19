<script setup lang="ts">
import { useGatewayApi } from '../composables/useGatewayApi';
import {
  buildReleaseGateEvidenceDigestFixture,
  buildReleaseGateOwnerHandoffSummary,
  normalizeReleaseGateEvidenceDigest,
  RELEASE_GATE_EVIDENCE_DIGEST_FIXTURE_INPUT,
  validateReleaseGateEvidenceDigestShape,
  type ReleaseGateEvidenceDigest,
  type ReleaseGateEvidenceDigestInput,
} from '../utils/releaseGateEvidenceDigest';

const api = useGatewayApi();

const mode = ref<'fixture' | 'api'>('fixture');
const loading = ref(false);
const error = ref('');
const status = ref('Fixture mode is ready.');
const digest = ref<ReleaseGateEvidenceDigest | null>(null);
const handoff = ref<{ pmMarkdown: string; qaMarkdown: string; canonicalIssueLinks: string[] } | null>(null);

const form = reactive<ReleaseGateEvidenceDigestInput>({
  candidateId: RELEASE_GATE_EVIDENCE_DIGEST_FIXTURE_INPUT.candidateId,
  policyVersion: RELEASE_GATE_EVIDENCE_DIGEST_FIXTURE_INPUT.policyVersion,
  schemaVersion: RELEASE_GATE_EVIDENCE_DIGEST_FIXTURE_INPUT.schemaVersion,
  laneEvidence: structuredClone(RELEASE_GATE_EVIDENCE_DIGEST_FIXTURE_INPUT.laneEvidence),
  dependencySnapshots: structuredClone(RELEASE_GATE_EVIDENCE_DIGEST_FIXTURE_INPUT.dependencySnapshots),
});

const relatedIssueIdentifiers = [
  'ONE-337',
  'ONE-334',
  'ONE-335',
  'ONE-336',
  'ONE-307',
  'ONE-308',
  'ONE-286',
  'ONE-292',
  'ONE-64',
];

const readinessClass = computed(() => {
  if (!digest.value) {
    return 'state-unknown';
  }
  if (digest.value.readinessState === 'ready') {
    return 'state-healthy';
  }
  if (digest.value.readinessState === 'blocked') {
    return 'state-critical';
  }
  return 'state-degraded';
});

function refreshHandoff(nextDigest: ReleaseGateEvidenceDigest) {
  handoff.value = buildReleaseGateOwnerHandoffSummary({
    digest: nextDigest,
    relatedIssueIdentifiers,
  });
}

function loadFixtureDigest() {
  const nextDigest = buildReleaseGateEvidenceDigestFixture(form);
  digest.value = nextDigest;
  refreshHandoff(nextDigest);
  error.value = '';
  status.value = `Fixture digest loaded for ${nextDigest.candidateId}.`;
}

async function loadApiDigest() {
  const response = await api.request<unknown>('/settlements/exceptions/release-gate-evidence-digest', {
    method: 'POST',
    body: {
      candidateId: form.candidateId,
      policyVersion: form.policyVersion,
      schemaVersion: form.schemaVersion,
      laneEvidence: form.laneEvidence,
      dependencySnapshots: form.dependencySnapshots,
    },
  });

  const shapeErrors = validateReleaseGateEvidenceDigestShape(response);
  if (shapeErrors.length > 0) {
    throw new Error(`Contract mismatch from ONE-337 endpoint: ${shapeErrors.join('; ')}`);
  }

  const nextDigest = normalizeReleaseGateEvidenceDigest(response);
  digest.value = nextDigest;
  refreshHandoff(nextDigest);
  error.value = '';
  status.value = `API digest loaded for ${nextDigest.candidateId}.`;
}

async function reloadDigest() {
  loading.value = true;
  error.value = '';
  try {
    if (mode.value === 'fixture') {
      loadFixtureDigest();
      return;
    }
    await loadApiDigest();
  } catch (loadError: any) {
    const message = typeof loadError?.message === 'string'
      ? loadError.message
      : 'Unable to build release-gate evidence digest.';
    error.value = message;
    status.value = 'Falling back to fixture adapter after API error.';
    loadFixtureDigest();
  } finally {
    loading.value = false;
  }
}

async function copyText(value: string) {
  if (!value) {
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    status.value = 'Copied handoff markdown to clipboard.';
  } catch {
    status.value = 'Clipboard copy failed. Copy manually from the panel.';
  }
}

onMounted(() => {
  loadFixtureDigest();
});
</script>

<template>
  <main class="page">
    <section class="hero">
      <h1>Release-Gate Evidence Digest Explorer</h1>
      <p>
        Deterministic explorer for ONE-337 contract output with fixture-first rendering and owner handoff markdown.
      </p>
      <div class="inline-actions compact">
        <button class="link" type="button" @click="mode = 'fixture'" :disabled="mode === 'fixture'">Fixture mode</button>
        <button class="link" type="button" @click="mode = 'api'" :disabled="mode === 'api'">ONE-337 API mode</button>
        <button type="button" @click="reloadDigest" :disabled="loading">
          {{ loading ? 'Loading...' : 'Reload digest' }}
        </button>
      </div>
    </section>

    <section class="card">
      <h2>Digest summary</h2>
      <p class="state" :class="readinessClass">
        {{ digest ? `Readiness: ${digest.readinessState} | Next owner: ${digest.nextOwner}` : 'No digest loaded.' }}
      </p>
      <p class="state">{{ status }}</p>
      <p v-if="error" class="state error">{{ error }}</p>
      <div v-if="digest" class="kpi-row">
        <article>
          <small>Candidate</small>
          <p>{{ digest.candidateId }}</p>
        </article>
        <article>
          <small>Digest rows</small>
          <p>{{ digest.metadata.rowCount }}</p>
        </article>
        <article>
          <small>Missing evidence</small>
          <p>{{ digest.metadata.missingEvidenceCount }}</p>
        </article>
        <article>
          <small>Blocking dependencies</small>
          <p>{{ digest.metadata.blockingDependencyCount }}</p>
        </article>
      </div>
    </section>

    <section class="card">
      <h2>Deterministic digest rows</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Issue</th>
              <th>Ordering key</th>
              <th>Reason</th>
              <th>Owner</th>
              <th>Artifact</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in digest?.digestRows ?? []" :key="`${row.issueIdentifier}-${row.artifactPath}`">
              <td>{{ row.issueIdentifier }}</td>
              <td>
                {{ row.priorityWeight }} / {{ row.blockerWeight }} / {{ row.dependencyDepthWeight }} /
                {{ row.evidenceTypeWeight }}
              </td>
              <td>{{ row.reasonCode }}</td>
              <td>{{ row.owner }}</td>
              <td><code>{{ row.artifactPath }}</code></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="grid">
      <article class="card">
        <h3>Missing evidence</h3>
        <ul>
          <li v-for="row in digest?.missingEvidence ?? []" :key="`missing-${row.issueIdentifier}-${row.artifactPath}`">
            <strong>{{ row.issueIdentifier }}</strong> :: {{ row.evidenceType }} :: {{ row.owner }}
          </li>
        </ul>
      </article>
      <article class="card">
        <h3>Blocking dependencies</h3>
        <ul>
          <li v-for="row in digest?.blockingDependencies ?? []" :key="`dep-${row.issueIdentifier}`">
            <strong>{{ row.issueIdentifier }}</strong> :: {{ row.reasonCode }} :: {{ row.owner }}
          </li>
        </ul>
      </article>
    </section>

    <section class="card" v-if="handoff">
      <h2>Owner handoff summary</h2>
      <p class="state">Canonical links only (`/ONE/...`) for PM and QA comment copy/paste.</p>
      <div class="grid">
        <label>
          PM handoff markdown
          <textarea rows="12" readonly :value="handoff.pmMarkdown" />
        </label>
        <label>
          QA handoff markdown
          <textarea rows="12" readonly :value="handoff.qaMarkdown" />
        </label>
      </div>
      <div class="inline-actions compact">
        <button type="button" class="link" @click="copyText(handoff.pmMarkdown)">Copy PM markdown</button>
        <button type="button" class="link" @click="copyText(handoff.qaMarkdown)">Copy QA markdown</button>
      </div>
    </section>
  </main>
</template>
