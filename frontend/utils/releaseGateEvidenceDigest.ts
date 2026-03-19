const ISSUE_IDENTIFIER_PATTERN = /^ONE-\d+$/i;

type CanonicalReasonCode =
  | 'missing_evidence'
  | 'dependency_blocked'
  | 'policy_violation'
  | 'ordering_regression'
  | 'reference_noncanonical';

export type ReleaseGateReadinessState = 'ready' | 'attention_required' | 'blocked';

export type ReleaseGateDigestRow = {
  issueIdentifier: string;
  priorityWeight: number;
  blockerWeight: number;
  dependencyDepthWeight: number;
  evidenceTypeWeight: number;
  evidenceType: string;
  artifactPath: string;
  reasonCode: CanonicalReasonCode;
  owner: string;
  orderingKey: [number, number, number, string, number, string];
};

export type ReleaseGateMissingEvidenceRow = {
  issueIdentifier: string;
  evidenceType: string;
  artifactPath: string;
  reasonCode: CanonicalReasonCode;
  owner: string;
};

export type ReleaseGateBlockingDependencyRow = {
  issueIdentifier: string;
  blockerWeight: number;
  dependencyDepthWeight: number;
  reasonCode: CanonicalReasonCode;
  owner: string;
};

export type ReleaseGateEvidenceDigest = {
  contract: 'settlement-release-gate-evidence-digest.v1';
  schemaVersion: string;
  candidateId: string;
  policyVersion: string;
  readinessState: ReleaseGateReadinessState;
  digestRows: ReleaseGateDigestRow[];
  missingEvidence: ReleaseGateMissingEvidenceRow[];
  blockingDependencies: ReleaseGateBlockingDependencyRow[];
  nextOwner: string;
  canonicalReasonCodes: CanonicalReasonCode[];
  metadata: {
    rowCount: number;
    missingEvidenceCount: number;
    blockingDependencyCount: number;
  };
  digestFingerprint: string;
};

export type ReleaseGateEvidenceDigestInput = {
  candidateId: string;
  policyVersion: string;
  laneEvidence: unknown[];
  dependencySnapshots: unknown[];
  schemaVersion?: string;
};

export type ReleaseGateOwnerHandoffSummary = {
  pmMarkdown: string;
  qaMarkdown: string;
  canonicalIssueLinks: string[];
};

export const RELEASE_GATE_EVIDENCE_DIGEST_FIXTURE_INPUT: ReleaseGateEvidenceDigestInput = {
  candidateId: 'ONE-337',
  policyVersion: '2026.03.19',
  schemaVersion: '1.0.0',
  laneEvidence: [
    {
      issueIdentifier: 'ONE-334',
      priorityWeight: 1,
      blockerWeight: 0,
      dependencyDepthWeight: 0,
      evidenceTypeWeight: 1,
      evidenceType: 'artifact',
      artifactPath: 'artifacts/one-334/release-gate-evidence-fixture.json',
      reasonCode: 'missing_evidence',
      owner: 'frontend',
    },
    {
      issueIdentifier: 'ONE-335',
      priorityWeight: 1,
      blockerWeight: 1,
      dependencyDepthWeight: 1,
      evidenceTypeWeight: 2,
      evidenceType: 'test',
      artifactPath: 'artifacts/one-335/release-gate-contract-fixture.json',
      reasonCode: 'dependency_blocked',
      owner: 'backend',
    },
    {
      issueIdentifier: 'ONE-336',
      priorityWeight: 2,
      blockerWeight: 0,
      dependencyDepthWeight: 1,
      evidenceTypeWeight: 3,
      evidenceType: 'log',
      artifactPath: 'artifacts/one-336/qa-deterministic-replay-audit-pack.md',
      reasonCode: 'ordering_regression',
      owner: 'qa',
    },
  ],
  dependencySnapshots: [
    {
      issueIdentifier: 'ONE-307',
      blockerWeight: 1,
      dependencyDepthWeight: 1,
      reasonCode: 'dependency_blocked',
      owner: 'frontend',
    },
    {
      issueIdentifier: 'ONE-308',
      blockerWeight: 2,
      dependencyDepthWeight: 2,
      reasonCode: 'policy_violation',
      owner: 'frontend',
    },
  ],
};

export function buildReleaseGateEvidenceDigestFixture(
  input: ReleaseGateEvidenceDigestInput,
): ReleaseGateEvidenceDigest {
  const candidateId = normalizeIssueIdentifier(input.candidateId) ?? 'ONE-337';
  const policyVersion = normalizeString(input.policyVersion) ?? 'unknown';
  const schemaVersion = normalizeString(input.schemaVersion) ?? '1.0.0';

  const digestRows = (Array.isArray(input.laneEvidence) ? input.laneEvidence : [])
    .map((row, index) => normalizeDigestRow(row, index, candidateId))
    .sort(compareDigestRows);

  const missingEvidence = digestRows
    .filter((row) => row.reasonCode === 'missing_evidence')
    .map((row) => ({
      issueIdentifier: row.issueIdentifier,
      evidenceType: row.evidenceType,
      artifactPath: row.artifactPath,
      reasonCode: row.reasonCode,
      owner: row.owner,
    }));

  const blockingDependencies = (Array.isArray(input.dependencySnapshots) ? input.dependencySnapshots : [])
    .map((row, index) => normalizeBlockingDependency(row, index, candidateId))
    .sort(compareBlockingDependencies);

  const readinessState = resolveReadinessState(digestRows, missingEvidence, blockingDependencies);
  const nextOwner = resolveNextOwner(readinessState, digestRows, missingEvidence, blockingDependencies);
  const canonicalReasonCodes = dedupeStrings(
    [
      ...digestRows.map((row) => row.reasonCode),
      ...missingEvidence.map((row) => row.reasonCode),
      ...blockingDependencies.map((row) => row.reasonCode),
    ],
  ) as CanonicalReasonCode[];

  const digestFingerprint = hashString(JSON.stringify({
    contract: 'settlement-release-gate-evidence-digest.v1',
    schemaVersion,
    candidateId,
    policyVersion,
    readinessState,
    digestRows,
    missingEvidence,
    blockingDependencies,
    nextOwner,
  }));

  return {
    contract: 'settlement-release-gate-evidence-digest.v1',
    schemaVersion,
    candidateId,
    policyVersion,
    readinessState,
    digestRows,
    missingEvidence,
    blockingDependencies,
    nextOwner,
    canonicalReasonCodes,
    metadata: {
      rowCount: digestRows.length,
      missingEvidenceCount: missingEvidence.length,
      blockingDependencyCount: blockingDependencies.length,
    },
    digestFingerprint,
  };
}

export function normalizeReleaseGateEvidenceDigest(payload: unknown): ReleaseGateEvidenceDigest {
  const source = payload && typeof payload === 'object'
    ? payload as Record<string, unknown>
    : {};

  const digest = buildReleaseGateEvidenceDigestFixture({
    candidateId: normalizeIssueIdentifier(source.candidateId) ?? 'ONE-337',
    policyVersion: normalizeString(source.policyVersion) ?? 'unknown',
    schemaVersion: normalizeString(source.schemaVersion) ?? '1.0.0',
    laneEvidence: Array.isArray(source.digestRows) ? source.digestRows : [],
    dependencySnapshots: Array.isArray(source.blockingDependencies) ? source.blockingDependencies : [],
  });

  if (Array.isArray(source.missingEvidence)) {
    const mappedMissingEvidence = source.missingEvidence
      .map((value) => normalizeMissingEvidence(value, digest.candidateId))
      .sort((left, right) => left.issueIdentifier.localeCompare(right.issueIdentifier));

    digest.missingEvidence = mappedMissingEvidence.length > 0
      ? mappedMissingEvidence
      : digest.missingEvidence;

    digest.metadata.missingEvidenceCount = digest.missingEvidence.length;
  }

  digest.readinessState = resolveReadinessState(
    digest.digestRows,
    digest.missingEvidence,
    digest.blockingDependencies,
  );
  digest.nextOwner = resolveNextOwner(
    digest.readinessState,
    digest.digestRows,
    digest.missingEvidence,
    digest.blockingDependencies,
  );

  return digest;
}

export function buildReleaseGateOwnerHandoffSummary(input: {
  digest: ReleaseGateEvidenceDigest;
  relatedIssueIdentifiers?: string[];
}): ReleaseGateOwnerHandoffSummary {
  const issueIdentifiers = dedupeStrings(
    [
      input.digest.candidateId,
      ...input.digest.digestRows.map((row) => row.issueIdentifier),
      ...input.digest.missingEvidence.map((row) => row.issueIdentifier),
      ...input.digest.blockingDependencies.map((row) => row.issueIdentifier),
      ...(input.relatedIssueIdentifiers ?? []),
    ]
      .map((value) => normalizeIssueIdentifier(value))
      .filter((value): value is string => Boolean(value)),
  );

  const canonicalIssueLinks = issueIdentifiers
    .map((identifier) => canonicalIssueLink(identifier))
    .sort((left, right) => left.localeCompare(right));

  const pmMarkdown = [
    `## Release-Gate Digest (${input.digest.candidateId})`,
    '',
    `- Readiness state: ${input.digest.readinessState}`,
    `- Next owner: ${input.digest.nextOwner}`,
    `- Missing evidence: ${input.digest.missingEvidence.length}`,
    `- Blocking dependencies: ${input.digest.blockingDependencies.length}`,
    '',
    '### Canonical links',
    ...canonicalIssueLinks.map((link) => `- ${link}`),
  ].join('\n');

  const qaMarkdown = [
    `## QA Handoff (${input.digest.candidateId})`,
    '',
    `- Digest fingerprint: ${input.digest.digestFingerprint}`,
    `- Deterministic row count: ${input.digest.digestRows.length}`,
    '',
    '### Validate in order',
    ...input.digest.digestRows.map((row) => (
      `- ${row.issueIdentifier} :: ${row.reasonCode} :: ${row.artifactPath}`
    )),
    '',
    '### Canonical issue links',
    ...canonicalIssueLinks.map((link) => `- ${link}`),
  ].join('\n');

  return {
    pmMarkdown,
    qaMarkdown,
    canonicalIssueLinks,
  };
}

export function validateReleaseGateEvidenceDigestShape(payload: unknown): string[] {
  const value = payload && typeof payload === 'object'
    ? payload as Record<string, unknown>
    : {};
  const errors: string[] = [];

  if (value.contract !== 'settlement-release-gate-evidence-digest.v1') {
    errors.push('contract must be settlement-release-gate-evidence-digest.v1');
  }
  if (!normalizeIssueIdentifier(value.candidateId)) {
    errors.push('candidateId is missing or invalid');
  }
  if (!['ready', 'attention_required', 'blocked'].includes(String(value.readinessState ?? ''))) {
    errors.push('readinessState must be ready, attention_required, or blocked');
  }
  if (!Array.isArray(value.digestRows)) {
    errors.push('digestRows must be an array');
  }
  if (!Array.isArray(value.missingEvidence)) {
    errors.push('missingEvidence must be an array');
  }
  if (!Array.isArray(value.blockingDependencies)) {
    errors.push('blockingDependencies must be an array');
  }
  if (typeof value.nextOwner !== 'string' || !value.nextOwner.trim()) {
    errors.push('nextOwner is required');
  }

  return errors;
}

function normalizeDigestRow(value: unknown, index: number, candidateId: string): ReleaseGateDigestRow {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const issueIdentifier = normalizeIssueIdentifier(row.issueIdentifier) ?? `${candidateId}-${index + 1}`;
  const priorityWeight = normalizeInteger(row.priorityWeight) ?? Number.MAX_SAFE_INTEGER;
  const blockerWeight = normalizeInteger(row.blockerWeight) ?? 0;
  const dependencyDepthWeight = normalizeInteger(row.dependencyDepthWeight) ?? 0;
  const evidenceType = normalizeString(row.evidenceType) ?? 'artifact';
  const evidenceTypeWeight = normalizeInteger(row.evidenceTypeWeight) ?? resolveEvidenceTypeWeight(evidenceType);
  const artifactPath = normalizeString(row.artifactPath)
    ?? `artifacts/${issueIdentifier.toLowerCase()}/missing-evidence.txt`;
  const reasonCode = normalizeReasonCode(row.reasonCode ?? row.reason ?? row.status);
  const owner = normalizeString(row.owner)
    ?? normalizeString(row.nextOwner)
    ?? resolveOwnerByReasonCode(reasonCode);

  return {
    issueIdentifier,
    priorityWeight,
    blockerWeight,
    dependencyDepthWeight,
    evidenceTypeWeight,
    evidenceType,
    artifactPath,
    reasonCode,
    owner,
    orderingKey: [
      priorityWeight,
      blockerWeight,
      dependencyDepthWeight,
      issueIdentifier,
      evidenceTypeWeight,
      artifactPath,
    ],
  };
}

function normalizeBlockingDependency(
  value: unknown,
  index: number,
  candidateId: string,
): ReleaseGateBlockingDependencyRow {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    issueIdentifier: normalizeIssueIdentifier(row.issueIdentifier) ?? `${candidateId}-DEP-${index + 1}`,
    blockerWeight: normalizeInteger(row.blockerWeight) ?? 1,
    dependencyDepthWeight: normalizeInteger(row.dependencyDepthWeight) ?? 0,
    reasonCode: normalizeReasonCode(row.reasonCode ?? row.reason ?? 'dependency_blocked'),
    owner: normalizeString(row.owner) ?? resolveOwnerByReasonCode(normalizeReasonCode(row.reasonCode ?? row.reason ?? 'dependency_blocked')),
  };
}

function normalizeMissingEvidence(value: unknown, candidateId: string): ReleaseGateMissingEvidenceRow {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const issueIdentifier = normalizeIssueIdentifier(row.issueIdentifier) ?? `${candidateId}-MISS-1`;
  const evidenceType = normalizeString(row.evidenceType) ?? 'artifact';
  return {
    issueIdentifier,
    evidenceType,
    artifactPath: normalizeString(row.artifactPath)
      ?? `artifacts/${issueIdentifier.toLowerCase()}/missing-evidence.txt`,
    reasonCode: normalizeReasonCode(row.reasonCode ?? 'missing_evidence'),
    owner: normalizeString(row.owner) ?? 'frontend',
  };
}

function compareDigestRows(left: ReleaseGateDigestRow, right: ReleaseGateDigestRow): number {
  return left.priorityWeight - right.priorityWeight
    || left.blockerWeight - right.blockerWeight
    || left.dependencyDepthWeight - right.dependencyDepthWeight
    || left.issueIdentifier.localeCompare(right.issueIdentifier)
    || left.evidenceTypeWeight - right.evidenceTypeWeight
    || left.artifactPath.localeCompare(right.artifactPath);
}

function compareBlockingDependencies(
  left: ReleaseGateBlockingDependencyRow,
  right: ReleaseGateBlockingDependencyRow,
): number {
  return left.blockerWeight - right.blockerWeight
    || left.dependencyDepthWeight - right.dependencyDepthWeight
    || left.issueIdentifier.localeCompare(right.issueIdentifier);
}

function resolveReadinessState(
  digestRows: ReleaseGateDigestRow[],
  missingEvidence: ReleaseGateMissingEvidenceRow[],
  blockingDependencies: ReleaseGateBlockingDependencyRow[],
): ReleaseGateReadinessState {
  if (blockingDependencies.length > 0) {
    return 'blocked';
  }
  if (missingEvidence.length > 0) {
    return 'attention_required';
  }
  if (digestRows.some((row) => row.reasonCode !== 'reference_noncanonical')) {
    return 'attention_required';
  }
  return 'ready';
}

function resolveNextOwner(
  readinessState: ReleaseGateReadinessState,
  digestRows: ReleaseGateDigestRow[],
  missingEvidence: ReleaseGateMissingEvidenceRow[],
  blockingDependencies: ReleaseGateBlockingDependencyRow[],
): string {
  if (readinessState === 'blocked') {
    return blockingDependencies[0]?.owner ?? 'dependency_owner';
  }
  if (missingEvidence.length > 0) {
    return missingEvidence[0]?.owner ?? 'frontend';
  }
  return digestRows[0]?.owner ?? 'frontend';
}

function normalizeIssueIdentifier(value: unknown): string | null {
  const normalized = normalizeString(value)?.toUpperCase() ?? null;
  if (!normalized) {
    return null;
  }
  return ISSUE_IDENTIFIER_PATTERN.test(normalized) ? normalized : null;
}

function normalizeReasonCode(input: unknown): CanonicalReasonCode {
  const normalized = normalizeString(input)?.toLowerCase().replace(/[\s-]+/g, '_') ?? '';
  if (normalized.includes('missing')) {
    return 'missing_evidence';
  }
  if (normalized.includes('dependency') || normalized.includes('blocked')) {
    return 'dependency_blocked';
  }
  if (normalized.includes('policy')) {
    return 'policy_violation';
  }
  if (normalized.includes('ordering')) {
    return 'ordering_regression';
  }
  if (normalized === 'reference_noncanonical') {
    return 'reference_noncanonical';
  }
  return 'reference_noncanonical';
}

function resolveOwnerByReasonCode(reasonCode: CanonicalReasonCode): string {
  if (reasonCode === 'dependency_blocked') {
    return 'dependency_owner';
  }
  if (reasonCode === 'policy_violation') {
    return 'pm';
  }
  if (reasonCode === 'ordering_regression') {
    return 'qa';
  }
  return 'frontend';
}

function resolveEvidenceTypeWeight(evidenceType: string): number {
  const normalized = evidenceType.trim().toLowerCase();
  if (normalized === 'artifact') {
    return 1;
  }
  if (normalized === 'test') {
    return 2;
  }
  if (normalized === 'log') {
    return 3;
  }
  return 4;
}

function canonicalIssueLink(issueIdentifier: string): string {
  return `/ONE/issues/${issueIdentifier}`;
}

function normalizeInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function hashString(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const unsigned = hash >>> 0;
  const repeated = unsigned.toString(16).padStart(8, '0');
  return `${repeated}${repeated}${repeated}${repeated}${repeated}${repeated}${repeated}${repeated}`;
}
