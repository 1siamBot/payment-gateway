import { createHash } from 'node:crypto';

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;
const SCHEMA_VERSION = 'settlement-remediation-execution-blueprint-packet.v1' as const;

const CANONICAL_REASON_CODES = [
  'missing_evidence',
  'dependency_blocked',
  'policy_violation',
  'ordering_regression',
  'reference_noncanonical',
] as const;

type CanonicalReasonCode = (typeof CANONICAL_REASON_CODES)[number];

type NormalizedQueueItem = {
  severityWeight: number;
  dependencyDepthWeight: number;
  blockerWeight: number;
  issueIdentifier: string;
  remediationTypeWeight: number;
  evidencePath: string;
  remediationType: string;
  reasonCodes: CanonicalReasonCode[];
  dependencyIssueIdentifiers: string[];
  rollbackPlanRefs: string[];
};

type NormalizedDependencyEdge = {
  issueIdentifier: string;
  dependsOnIssueIdentifier: string;
  dependencyStatus: string;
};

export type SettlementRemediationExecutionBlueprintPacket = {
  contract: typeof SCHEMA_VERSION;
  schemaVersion: typeof SCHEMA_VERSION;
  candidateId: string;
  queueFingerprint: string;
  policyVersion: string;
  orderingKeySpec: [
    'severityWeight',
    'dependencyDepthWeight',
    'blockerWeight',
    'issueIdentifier',
    'remediationTypeWeight',
    'evidencePath',
  ];
  executionReadiness: 'ready' | 'blocked';
  executionSteps: Array<{
    stepId: string;
    severityWeight: number;
    dependencyDepthWeight: number;
    blockerWeight: number;
    issueIdentifier: string;
    remediationTypeWeight: number;
    evidencePath: string;
    remediationType: string;
    reasonCodes: CanonicalReasonCode[];
    dependsOnIssueIdentifiers: string[];
    rollbackPlanRef: string | null;
    executionState: 'ready' | 'blocked';
  }>;
  blockingDependencies: Array<{
    issueIdentifier: string;
    dependencyIssueIdentifier: string;
    dependencyStatus: string;
    reasonCode: 'dependency_blocked';
  }>;
  missingEvidence: Array<{
    issueIdentifier: string;
    evidencePath: string;
    reasonCode: 'missing_evidence';
  }>;
  rollbackPlanRefs: string[];
  nextOwner: 'backend' | 'pm' | 'qa';
  blueprintFingerprint: string;
};

export function buildSettlementRemediationExecutionBlueprintPacket(input: {
  candidateId: string;
  queueFingerprint: string;
  queueItems: unknown[];
  dependencyGraph: unknown;
  operatorConstraints: unknown;
  policyVersion: string;
}): SettlementRemediationExecutionBlueprintPacket {
  const candidateId = normalizeString(input.candidateId) ?? 'candidate-unknown';
  const queueFingerprint = normalizeString(input.queueFingerprint) ?? 'queue-fingerprint-unknown';
  const policyVersion = normalizeString(input.policyVersion) ?? 'policy-unknown';

  const dependencyEdges = normalizeDependencyGraph(input.dependencyGraph)
    .map((value, index) => normalizeDependencyEdge(value, index))
    .sort(compareDependencyEdge);

  const dependenciesByIssue = groupDependencyByIssue(dependencyEdges);

  const operatorConstraints = toRecord(input.operatorConstraints);
  const defaultRollbackRefs = normalizeStringArray(
    operatorConstraints.rollbackPlanRefs ?? operatorConstraints.fallbackRollbackPlanRefs,
  );

  const executionSteps = (Array.isArray(input.queueItems) ? input.queueItems : [])
    .map((value, index) => normalizeQueueItem(value, index, defaultRollbackRefs, dependenciesByIssue))
    .sort(compareQueueItem)
    .map((item, index) => ({
      stepId: `step-${String(index + 1).padStart(3, '0')}`,
      severityWeight: item.severityWeight,
      dependencyDepthWeight: item.dependencyDepthWeight,
      blockerWeight: item.blockerWeight,
      issueIdentifier: item.issueIdentifier,
      remediationTypeWeight: item.remediationTypeWeight,
      evidencePath: item.evidencePath,
      remediationType: item.remediationType,
      reasonCodes: item.reasonCodes,
      dependsOnIssueIdentifiers: item.dependencyIssueIdentifiers,
      rollbackPlanRef: item.rollbackPlanRefs[0] ?? null,
      executionState: item.reasonCodes.some(isBlockingReasonCode) ? 'blocked' as const : 'ready' as const,
    }));

  const blockingDependencies = executionSteps
    .flatMap((step) => {
      const edges = dependenciesByIssue.get(step.issueIdentifier) ?? [];
      return edges
        .filter((edge) => isDependencyBlocked(edge.dependencyStatus))
        .map((edge) => ({
          issueIdentifier: step.issueIdentifier,
          dependencyIssueIdentifier: edge.dependsOnIssueIdentifier,
          dependencyStatus: edge.dependencyStatus,
          reasonCode: 'dependency_blocked' as const,
        }));
    })
    .sort((left, right) => (
      compareStrings(left.issueIdentifier, right.issueIdentifier)
      || compareStrings(left.dependencyIssueIdentifier, right.dependencyIssueIdentifier)
      || compareStrings(left.dependencyStatus, right.dependencyStatus)
    ));

  const missingEvidence = executionSteps
    .filter((step) => step.reasonCodes.includes('missing_evidence'))
    .map((step) => ({
      issueIdentifier: step.issueIdentifier,
      evidencePath: step.evidencePath,
      reasonCode: 'missing_evidence' as const,
    }))
    .sort((left, right) => (
      compareStrings(left.issueIdentifier, right.issueIdentifier)
      || compareStrings(left.evidencePath, right.evidencePath)
    ));

  const rollbackPlanRefs = uniqueStrings(
    executionSteps
      .flatMap((step) => (step.rollbackPlanRef ? [step.rollbackPlanRef] : []))
      .concat(defaultRollbackRefs),
  );

  const executionReadiness: 'ready' | 'blocked' = executionSteps.length > 0
    && blockingDependencies.length === 0
    && missingEvidence.length === 0
    && !executionSteps.some((step) => step.reasonCodes.includes('policy_violation'))
    ? 'ready'
    : 'blocked';

  const nextOwner: 'backend' | 'pm' | 'qa' = executionReadiness === 'ready'
    ? 'qa'
    : (blockingDependencies.length > 0 ? 'pm' : 'backend');

  const blueprintFingerprint = sha256Hex(stableSerialize({
    schemaVersion: SCHEMA_VERSION,
    candidateId,
    queueFingerprint,
    policyVersion,
    executionReadiness,
    executionSteps,
    blockingDependencies,
    missingEvidence,
    rollbackPlanRefs,
    nextOwner,
  }));

  return {
    contract: SCHEMA_VERSION,
    schemaVersion: SCHEMA_VERSION,
    candidateId,
    queueFingerprint,
    policyVersion,
    orderingKeySpec: [
      'severityWeight',
      'dependencyDepthWeight',
      'blockerWeight',
      'issueIdentifier',
      'remediationTypeWeight',
      'evidencePath',
    ],
    executionReadiness,
    executionSteps,
    blockingDependencies,
    missingEvidence,
    rollbackPlanRefs,
    nextOwner,
    blueprintFingerprint,
  };
}

function normalizeDependencyGraph(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  const record = toRecord(value);
  if (Array.isArray(record.edges)) {
    return record.edges;
  }
  if (Array.isArray(record.dependencies)) {
    return record.dependencies;
  }

  return [];
}

function normalizeDependencyEdge(value: unknown, index: number): NormalizedDependencyEdge {
  const record = toRecord(value);
  const issueIdentifier = normalizeIssueIdentifier(record.issueIdentifier) ?? `UNKNOWN-${String(index + 1).padStart(3, '0')}`;
  const dependsOnIssueIdentifier = normalizeIssueIdentifier(
    record.dependsOnIssueIdentifier
    ?? record.dependsOn
    ?? record.dependencyIssueIdentifier,
  ) ?? `UNKNOWN-${String(index + 1).padStart(3, '0')}`;

  return {
    issueIdentifier,
    dependsOnIssueIdentifier,
    dependencyStatus: normalizeString(record.dependencyStatus ?? record.status) ?? 'blocked',
  };
}

function normalizeQueueItem(
  value: unknown,
  index: number,
  defaultRollbackRefs: string[],
  dependenciesByIssue: Map<string, NormalizedDependencyEdge[]>,
): NormalizedQueueItem {
  const record = toRecord(value);
  const issueIdentifier = normalizeIssueIdentifier(record.issueIdentifier) ?? `UNKNOWN-${String(index + 1).padStart(3, '0')}`;

  const reasonSet = new Set<CanonicalReasonCode>();
  normalizeReasonCodeList(record.reasonCodes).forEach((reasonCode) => reasonSet.add(reasonCode));

  const evidencePathCandidate = normalizeString(record.evidencePath);
  const evidencePath = evidencePathCandidate ?? `missing/${issueIdentifier}/evidence`;
  if (!evidencePathCandidate) {
    reasonSet.add('missing_evidence');
  }

  const dependencyIssueIdentifiers = uniqueStrings([
    ...normalizeIssueIdentifierArray(
      record.dependencyIssueIdentifiers
      ?? record.dependencyIssueLinks
      ?? record.dependsOnIssueIdentifiers,
    ),
    ...((dependenciesByIssue.get(issueIdentifier) ?? []).map((edge) => edge.dependsOnIssueIdentifier)),
  ]);

  if (
    (dependenciesByIssue.get(issueIdentifier) ?? []).some((edge) => isDependencyBlocked(edge.dependencyStatus))
    || normalizeReasonCodeList(record.dependencyReasonCodes).includes('dependency_blocked')
  ) {
    reasonSet.add('dependency_blocked');
  }

  const allRefs = normalizeStringArray(record.referenceLinks ?? record.issueLinks);
  if (allRefs.some((reference) => !isCanonicalIssueReference(reference))) {
    reasonSet.add('reference_noncanonical');
  }

  const reasonCodes = CANONICAL_REASON_CODES.filter((code) => reasonSet.has(code));

  const rollbackPlanRefs = uniqueStrings([
    ...normalizeStringArray(record.rollbackPlanRefs ?? record.rollbackRefs),
    ...defaultRollbackRefs,
  ]);

  return {
    severityWeight: normalizeWeight(record.severityWeight, 999),
    dependencyDepthWeight: normalizeWeight(record.dependencyDepthWeight, 999),
    blockerWeight: normalizeWeight(record.blockerWeight, reasonCodes.some(isBlockingReasonCode) ? 3 : 1),
    issueIdentifier,
    remediationTypeWeight: normalizeWeight(record.remediationTypeWeight, 999),
    evidencePath,
    remediationType: normalizeString(record.remediationType) ?? inferRemediationType(reasonCodes),
    reasonCodes,
    dependencyIssueIdentifiers,
    rollbackPlanRefs,
  };
}

function inferRemediationType(reasonCodes: CanonicalReasonCode[]): string {
  if (reasonCodes.includes('dependency_blocked')) {
    return 'dependency_unblock';
  }
  if (reasonCodes.includes('missing_evidence')) {
    return 'evidence_backfill';
  }
  if (reasonCodes.includes('policy_violation')) {
    return 'policy_remediation';
  }
  if (reasonCodes.includes('ordering_regression')) {
    return 'ordering_repair';
  }
  if (reasonCodes.includes('reference_noncanonical')) {
    return 'reference_canonicalization';
  }

  return 'verification';
}

function normalizeWeight(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.trunc(parsed));
}

function normalizeReasonCodeList(value: unknown): CanonicalReasonCode[] {
  const values = Array.isArray(value)
    ? value
    : (typeof value === 'string' ? [value] : []);

  const result = new Set<CanonicalReasonCode>();
  values.forEach((entry) => {
    const code = normalizeReasonCode(entry);
    if (code) {
      result.add(code);
    }
  });

  return CANONICAL_REASON_CODES.filter((code) => result.has(code));
}

function normalizeReasonCode(value: unknown): CanonicalReasonCode | null {
  const input = normalizeString(value)?.toLowerCase();
  if (!input) {
    return null;
  }

  if (input.includes('missing') || input.includes('evidence')) {
    return 'missing_evidence';
  }
  if (input.includes('depend') || input.includes('block')) {
    return 'dependency_blocked';
  }
  if (input.includes('policy')) {
    return 'policy_violation';
  }
  if (input.includes('ordering') || input.includes('order')) {
    return 'ordering_regression';
  }
  if (input.includes('canonical') || input.includes('reference') || input.includes('link')) {
    return 'reference_noncanonical';
  }

  return null;
}

function isBlockingReasonCode(value: CanonicalReasonCode): boolean {
  return value === 'missing_evidence' || value === 'dependency_blocked' || value === 'policy_violation';
}

function isDependencyBlocked(value: string | null): boolean {
  if (!value) {
    return true;
  }
  const normalized = value.trim().toLowerCase();
  return normalized !== 'resolved' && normalized !== 'ready' && normalized !== 'complete';
}

function compareQueueItem(left: NormalizedQueueItem, right: NormalizedQueueItem): number {
  return left.severityWeight - right.severityWeight
    || left.dependencyDepthWeight - right.dependencyDepthWeight
    || left.blockerWeight - right.blockerWeight
    || compareStrings(left.issueIdentifier, right.issueIdentifier)
    || left.remediationTypeWeight - right.remediationTypeWeight
    || compareStrings(left.evidencePath, right.evidencePath);
}

function compareDependencyEdge(left: NormalizedDependencyEdge, right: NormalizedDependencyEdge): number {
  return compareStrings(left.issueIdentifier, right.issueIdentifier)
    || compareStrings(left.dependsOnIssueIdentifier, right.dependsOnIssueIdentifier)
    || compareStrings(left.dependencyStatus, right.dependencyStatus);
}

function groupDependencyByIssue(edges: NormalizedDependencyEdge[]): Map<string, NormalizedDependencyEdge[]> {
  const grouped = new Map<string, NormalizedDependencyEdge[]>();
  edges.forEach((edge) => {
    const existing = grouped.get(edge.issueIdentifier) ?? [];
    existing.push(edge);
    grouped.set(edge.issueIdentifier, existing);
  });
  return grouped;
}

function normalizeIssueIdentifier(value: unknown): string | null {
  const input = normalizeString(value)?.replace(/^\//, '');
  if (!input) {
    return null;
  }

  const inlineMatch = input.match(/([A-Za-z0-9]+-\d+)/);
  if (!inlineMatch) {
    return null;
  }

  const normalized = inlineMatch[1].toUpperCase();
  return ISSUE_IDENTIFIER_PATTERN.test(normalized) ? normalized : null;
}

function normalizeIssueIdentifierArray(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value
    : (typeof value === 'string' ? [value] : []);

  return uniqueStrings(
    values
      .map((entry) => normalizeIssueIdentifier(entry))
      .filter((entry): entry is string => entry !== null),
  );
}

function normalizeStringArray(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value
    : (typeof value === 'string' ? [value] : []);

  return uniqueStrings(
    values
      .map((entry) => normalizeString(entry))
      .filter((entry): entry is string => entry !== null),
  );
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isCanonicalIssueReference(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }

  if (/^\/[A-Za-z0-9]+\/issues\/[A-Za-z0-9]+-\d+(#.+)?$/.test(trimmed)) {
    return true;
  }

  return ISSUE_IDENTIFIER_PATTERN.test(trimmed.toUpperCase());
}

function uniqueStrings(values: string[]): string[] {
  const normalized = [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
  normalized.sort((left, right) => left.localeCompare(right));
  return normalized;
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right);
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort((left, right) => left.localeCompare(right));
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(',')}}`;
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
