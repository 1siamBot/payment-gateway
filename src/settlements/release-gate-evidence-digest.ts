import { createHash } from 'node:crypto';

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;

const CANONICAL_REASON_CODES = [
  'missing_evidence',
  'dependency_blocked',
  'policy_violation',
  'ordering_regression',
  'reference_noncanonical',
] as const;

type CanonicalReasonCode = (typeof CANONICAL_REASON_CODES)[number];
type ReadinessState = 'ready' | 'attention_required' | 'blocked';

type ValidationError = {
  field: string;
  reason: 'required' | 'invalid_value';
  message: string;
};

type DigestRow = {
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

type MissingEvidenceRow = {
  issueIdentifier: string;
  evidenceType: string;
  artifactPath: string;
  reasonCode: CanonicalReasonCode;
  owner: string;
};

type BlockingDependencyRow = {
  issueIdentifier: string;
  blockerWeight: number;
  dependencyDepthWeight: number;
  reasonCode: CanonicalReasonCode;
  owner: string;
};

export type SettlementReleaseGateEvidenceDigest = {
  contract: 'settlement-release-gate-evidence-digest.v1';
  schemaVersion: string;
  candidateId: string;
  policyVersion: string;
  readinessState: ReadinessState;
  digestRows: DigestRow[];
  missingEvidence: MissingEvidenceRow[];
  blockingDependencies: BlockingDependencyRow[];
  nextOwner: string;
  canonicalReasonCodes: CanonicalReasonCode[];
  metadata: {
    rowCount: number;
    missingEvidenceCount: number;
    blockingDependencyCount: number;
  };
  digestFingerprint: string;
};

export function buildSettlementReleaseGateEvidenceDigest(input: {
  candidateId: string;
  laneEvidence: unknown[];
  dependencySnapshots: unknown[];
  policyVersion: string;
  schemaVersion?: string;
}): SettlementReleaseGateEvidenceDigest {
  const errors: ValidationError[] = [];

  const candidateId = normalizeString(input.candidateId);
  const policyVersion = normalizeString(input.policyVersion);
  const schemaVersion = normalizeString(input.schemaVersion) ?? '1.0.0';

  if (!candidateId) {
    errors.push(requiredError('candidateId'));
  }
  if (!policyVersion) {
    errors.push(requiredError('policyVersion'));
  }
  if (!Array.isArray(input.laneEvidence)) {
    errors.push(requiredArrayError('laneEvidence'));
  }
  if (!Array.isArray(input.dependencySnapshots)) {
    errors.push(requiredArrayError('dependencySnapshots'));
  }

  if (errors.length > 0) {
    throw {
      status: 400,
      response: {
        code: 'SETTLEMENT_RELEASE_GATE_EVIDENCE_DIGEST_VALIDATION_FAILED',
        message: 'release-gate evidence digest validation failed',
        errors: errors.sort((left, right) => left.field.localeCompare(right.field)),
      },
    };
  }

  const candidatePrefix = normalizePrefix(candidateId!);
  const normalizedRows = (Array.isArray(input.laneEvidence) ? input.laneEvidence : [])
    .map((value, index) => normalizeDigestRow(value, index, candidatePrefix))
    .sort(compareDigestRow);

  const blockingDependencies = (Array.isArray(input.dependencySnapshots) ? input.dependencySnapshots : [])
    .map((value, index) => normalizeBlockingDependency(value, index, candidatePrefix))
    .sort(compareBlockingDependency);

  const missingEvidence = normalizedRows
    .filter((row) => row.reasonCode === 'missing_evidence')
    .map((row) => ({
      issueIdentifier: row.issueIdentifier,
      evidenceType: row.evidenceType,
      artifactPath: row.artifactPath,
      reasonCode: row.reasonCode,
      owner: row.owner,
    }));

  const readinessState = resolveReadinessState(normalizedRows, blockingDependencies, missingEvidence);
  const nextOwner = resolveNextOwner(readinessState, blockingDependencies, missingEvidence, normalizedRows);

  const canonicalReasonCodes = dedupeStrings(
    [
      ...normalizedRows.map((row) => row.reasonCode),
      ...blockingDependencies.map((row) => row.reasonCode),
      ...missingEvidence.map((row) => row.reasonCode),
    ],
    true,
  ) as CanonicalReasonCode[];

  const fingerprintPayload = {
    contract: 'settlement-release-gate-evidence-digest.v1',
    schemaVersion,
    candidateId,
    policyVersion,
    readinessState,
    digestRows: normalizedRows,
    missingEvidence,
    blockingDependencies,
    nextOwner,
  };

  const digestFingerprint = createHash('sha256').update(JSON.stringify(fingerprintPayload)).digest('hex');

  return {
    contract: 'settlement-release-gate-evidence-digest.v1',
    schemaVersion,
    candidateId: candidateId!,
    policyVersion: policyVersion!,
    readinessState,
    digestRows: normalizedRows,
    missingEvidence,
    blockingDependencies,
    nextOwner,
    canonicalReasonCodes,
    metadata: {
      rowCount: normalizedRows.length,
      missingEvidenceCount: missingEvidence.length,
      blockingDependencyCount: blockingDependencies.length,
    },
    digestFingerprint,
  };
}

function normalizeDigestRow(value: unknown, index: number, fallbackPrefix: string): DigestRow {
  const row = toRecord(value);
  const issueIdentifier = normalizeIssueIdentifier(row.issueIdentifier) ?? `${fallbackPrefix}-${index + 1}`;
  const evidenceType = normalizeString(row.evidenceType) ?? 'artifact';
  const artifactPath = normalizeString(row.artifactPath) ?? `artifacts/${issueIdentifier.toLowerCase()}/missing`; 
  const priorityWeight = normalizeInteger(row.priorityWeight) ?? Number.MAX_SAFE_INTEGER;
  const blockerWeight = normalizeInteger(row.blockerWeight) ?? 0;
  const dependencyDepthWeight = normalizeInteger(row.dependencyDepthWeight) ?? 0;
  const evidenceTypeWeight = normalizeInteger(row.evidenceTypeWeight)
    ?? resolveEvidenceTypeWeight(evidenceType);

  const reasonCode = normalizeCanonicalReasonCode(
    row.reasonCode ?? row.reason ?? row.status ?? (artifactPath.endsWith('/missing') ? 'missing_evidence' : null),
  );

  const owner = normalizeString(row.owner)
    ?? normalizeString(row.nextOwner)
    ?? resolveOwnerByReason(reasonCode);

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

function normalizeBlockingDependency(value: unknown, index: number, fallbackPrefix: string): BlockingDependencyRow {
  const row = toRecord(value);
  const issueIdentifier = normalizeIssueIdentifier(row.issueIdentifier) ?? `${fallbackPrefix}-DEP-${index + 1}`;
  const blockerWeight = normalizeInteger(row.blockerWeight) ?? 1;
  const dependencyDepthWeight = normalizeInteger(row.dependencyDepthWeight)
    ?? normalizeInteger(row.dependencyDepth)
    ?? 0;
  const reasonCode = normalizeCanonicalReasonCode(row.reasonCode ?? row.reason ?? row.blockingReason ?? 'dependency_blocked');
  const owner = normalizeString(row.owner)
    ?? normalizeString(row.blockerOwner)
    ?? resolveOwnerByReason(reasonCode);

  return {
    issueIdentifier,
    blockerWeight,
    dependencyDepthWeight,
    reasonCode,
    owner,
  };
}

function resolveReadinessState(
  digestRows: DigestRow[],
  blockingDependencies: BlockingDependencyRow[],
  missingEvidence: MissingEvidenceRow[],
): ReadinessState {
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
  readinessState: ReadinessState,
  blockingDependencies: BlockingDependencyRow[],
  missingEvidence: MissingEvidenceRow[],
  digestRows: DigestRow[],
): string {
  if (readinessState === 'blocked') {
    return blockingDependencies[0]?.owner ?? 'dependency_owner';
  }

  if (missingEvidence.length > 0) {
    return missingEvidence[0]?.owner ?? 'artifact_owner';
  }

  return digestRows[0]?.owner ?? 'release_manager';
}

function resolveEvidenceTypeWeight(evidenceType: string): number {
  const normalized = evidenceType.trim().toLowerCase();
  if (normalized.includes('artifact')) {
    return 1;
  }
  if (normalized.includes('test')) {
    return 2;
  }
  if (normalized.includes('log')) {
    return 3;
  }
  return 9;
}

function resolveOwnerByReason(reasonCode: CanonicalReasonCode): string {
  switch (reasonCode) {
    case 'dependency_blocked':
      return 'dependency_owner';
    case 'missing_evidence':
      return 'artifact_owner';
    case 'policy_violation':
      return 'risk_owner';
    case 'ordering_regression':
      return 'qa_owner';
    case 'reference_noncanonical':
    default:
      return 'release_manager';
  }
}

function normalizeCanonicalReasonCode(value: unknown): CanonicalReasonCode {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    return 'reference_noncanonical';
  }

  if ((CANONICAL_REASON_CODES as readonly string[]).includes(normalized)) {
    return normalized as CanonicalReasonCode;
  }

  const compact = normalized.replace(/[^a-z0-9]+/g, '');
  if (compact.includes('missingevidence') || compact.includes('artifactmissing') || compact.includes('evidencemissing')) {
    return 'missing_evidence';
  }
  if (compact.includes('dependency') || compact.includes('upstream') || compact.includes('blocked')) {
    return 'dependency_blocked';
  }
  if (compact.includes('policy') || compact.includes('compliance') || compact.includes('approval') || compact.includes('risk')) {
    return 'policy_violation';
  }
  if (compact.includes('ordering') || compact.includes('regression') || compact.includes('sequence') || compact.includes('sort')) {
    return 'ordering_regression';
  }

  return 'reference_noncanonical';
}

function compareDigestRow(left: DigestRow, right: DigestRow): number {
  return compareNumber(left.priorityWeight, right.priorityWeight)
    || compareNumber(left.blockerWeight, right.blockerWeight)
    || compareNumber(left.dependencyDepthWeight, right.dependencyDepthWeight)
    || left.issueIdentifier.localeCompare(right.issueIdentifier)
    || compareNumber(left.evidenceTypeWeight, right.evidenceTypeWeight)
    || left.artifactPath.localeCompare(right.artifactPath)
    || left.owner.localeCompare(right.owner);
}

function compareBlockingDependency(left: BlockingDependencyRow, right: BlockingDependencyRow): number {
  return compareNumber(left.blockerWeight, right.blockerWeight)
    || compareNumber(left.dependencyDepthWeight, right.dependencyDepthWeight)
    || left.issueIdentifier.localeCompare(right.issueIdentifier)
    || left.reasonCode.localeCompare(right.reasonCode)
    || left.owner.localeCompare(right.owner);
}

function compareNumber(left: number, right: number): number {
  return left - right;
}

function requiredError(field: string): ValidationError {
  return {
    field,
    reason: 'required',
    message: `${field} is required`,
  };
}

function requiredArrayError(field: string): ValidationError {
  return {
    field,
    reason: 'required',
    message: `${field} must be an array`,
  };
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.round(parsed);
    }
  }
  return null;
}

function normalizeIssueIdentifier(value: unknown): string | null {
  const normalized = normalizeString(value)?.toUpperCase();
  if (!normalized) {
    return null;
  }
  const match = ISSUE_IDENTIFIER_PATTERN.exec(normalized);
  if (!match) {
    return null;
  }
  return `${match[1]!.toUpperCase()}-${match[2]}`;
}

function normalizePrefix(value: string): string {
  const match = ISSUE_IDENTIFIER_PATTERN.exec(value.trim().toUpperCase());
  if (match) {
    return match[1]!.toUpperCase();
  }

  const compact = value.trim().replace(/[^a-z0-9]+/gi, '').toUpperCase();
  if (compact.length >= 3) {
    return compact.slice(0, 3);
  }
  if (compact.length > 0) {
    return compact;
  }
  return 'ISSUE';
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function dedupeStrings(values: string[], sorted = false): string[] {
  const unique = Array.from(new Set(values.filter((value) => value.length > 0)));
  return sorted ? unique.sort((left, right) => left.localeCompare(right)) : unique;
}
