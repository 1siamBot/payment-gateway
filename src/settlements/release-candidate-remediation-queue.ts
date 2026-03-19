import { createHash } from 'node:crypto';

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;
const SCHEMA_VERSION = 'settlement-release-candidate-remediation-queue.v1' as const;

const CANONICAL_REASON_CODES = [
  'missing_evidence',
  'dependency_blocked',
  'policy_violation',
  'ordering_regression',
  'reference_noncanonical',
] as const;

const BLOCKING_REASON_CODES = [
  'missing_evidence',
  'dependency_blocked',
  'policy_violation',
] as const;

type CanonicalReasonCode = (typeof CANONICAL_REASON_CODES)[number];
type BlockingReasonCode = (typeof BLOCKING_REASON_CODES)[number];

type NormalizedVerdictRow = {
  issueIdentifier: string;
  severityWeight: number;
  dependencyDepthWeight: number;
  reasonCodes: CanonicalReasonCode[];
  referenceLinks: string[];
};

type NormalizedDependencyRef = {
  issueIdentifier: string;
  dependsOnIssueIdentifier: string;
  dependencyDepthWeight: number;
  dependencyStatus: string | null;
  reasonCodes: CanonicalReasonCode[];
  referenceLinks: string[];
};

type NormalizedEvidenceRef = {
  issueIdentifier: string;
  remediationType: string;
  remediationTypeWeight: number;
  evidencePath: string | null;
  reasonCodes: CanonicalReasonCode[];
  referenceLinks: string[];
};

export type ReleaseCandidateRemediationQueueItem = {
  severityWeight: number;
  blockerWeight: number;
  dependencyDepthWeight: number;
  issueIdentifier: string;
  remediationTypeWeight: number;
  evidencePath: string;
  remediationType:
    | 'dependency_unblock'
    | 'evidence_backfill'
    | 'policy_remediation'
    | 'ordering_repair'
    | 'reference_canonicalization'
    | 'verification';
  reasonCodes: CanonicalReasonCode[];
};

export type SettlementReleaseCandidateRemediationQueue = {
  contract: typeof SCHEMA_VERSION;
  schemaVersion: typeof SCHEMA_VERSION;
  candidateId: string;
  policyVersion: string;
  orderingKeySpec: [
    'severityWeight',
    'blockerWeight',
    'dependencyDepthWeight',
    'issueIdentifier',
    'remediationTypeWeight',
    'evidencePath',
  ];
  queueItems: ReleaseCandidateRemediationQueueItem[];
  blockingDependencies: Array<{
    issueIdentifier: string;
    dependencyIssueIdentifier: string;
    dependencyStatus: string;
    reasonCode: 'dependency_blocked';
  }>;
  missingEvidence: Array<{
    issueIdentifier: string;
    remediationType: string;
    evidencePath: string;
    reasonCode: 'missing_evidence';
  }>;
  readyForExecution: boolean;
  nextOwner: 'backend' | 'pm' | 'qa';
  queueFingerprint: string;
};

export function buildSettlementReleaseCandidateRemediationQueue(input: {
  candidateId: string;
  verdictPacket: unknown;
  dependencyGraph: unknown;
  evidenceRefs: unknown[];
  policyVersion: string;
}): SettlementReleaseCandidateRemediationQueue {
  const candidateId = normalizeString(input.candidateId) ?? 'candidate-unknown';
  const policyVersion = normalizeString(input.policyVersion) ?? 'policy-unknown';

  const verdictRows = normalizeVerdictPacket(input.verdictPacket)
    .map((value, index) => normalizeVerdictRow(value, index))
    .sort(compareVerdictRow);

  const dependencyRefs = normalizeDependencyGraph(input.dependencyGraph)
    .map((value, index) => normalizeDependencyRef(value, index))
    .sort(compareDependencyRef);

  const evidenceRefs = (Array.isArray(input.evidenceRefs) ? input.evidenceRefs : [])
    .map((value, index) => normalizeEvidenceRef(value, index))
    .sort(compareEvidenceRef);

  const issueSet = new Set<string>();
  verdictRows.forEach((row) => issueSet.add(row.issueIdentifier));
  dependencyRefs.forEach((row) => {
    issueSet.add(row.issueIdentifier);
    issueSet.add(row.dependsOnIssueIdentifier);
  });
  evidenceRefs.forEach((row) => issueSet.add(row.issueIdentifier));

  const verdictByIssue = groupByIssue(verdictRows);
  const dependencyByIssue = groupByIssue(dependencyRefs);
  const evidenceByIssue = groupByIssue(evidenceRefs);

  const blockingDependencies = dependencyRefs
    .filter((dependency) => isDependencyBlocked(dependency.dependencyStatus))
    .map((dependency) => ({
      issueIdentifier: dependency.issueIdentifier,
      dependencyIssueIdentifier: dependency.dependsOnIssueIdentifier,
      dependencyStatus: dependency.dependencyStatus ?? 'blocked',
      reasonCode: 'dependency_blocked' as const,
    }))
    .sort((left, right) => (
      compareStrings(left.issueIdentifier, right.issueIdentifier)
      || compareStrings(left.dependencyIssueIdentifier, right.dependencyIssueIdentifier)
      || compareStrings(left.dependencyStatus, right.dependencyStatus)
    ));

  const queueItems = [...issueSet]
    .map((issueIdentifier) => {
      const verdictList = verdictByIssue.get(issueIdentifier) ?? [];
      const dependencyList = dependencyByIssue.get(issueIdentifier) ?? [];
      const evidenceList = evidenceByIssue.get(issueIdentifier) ?? [];

      const reasonSet = new Set<CanonicalReasonCode>([
        ...verdictList.flatMap((row) => row.reasonCodes),
        ...dependencyList.flatMap((row) => row.reasonCodes),
        ...evidenceList.flatMap((row) => row.reasonCodes),
      ]);

      if (evidenceList.length === 0 || evidenceList.some((row) => !row.evidencePath)) {
        reasonSet.add('missing_evidence');
      }

      if (dependencyList.some((row) => isDependencyBlocked(row.dependencyStatus))) {
        reasonSet.add('dependency_blocked');
      }

      const allLinks = [
        ...verdictList.flatMap((row) => row.referenceLinks),
        ...dependencyList.flatMap((row) => row.referenceLinks),
        ...evidenceList.flatMap((row) => row.referenceLinks),
      ];
      if (allLinks.some((link) => !isCanonicalIssueReference(link))) {
        reasonSet.add('reference_noncanonical');
      }

      const reasonCodes = CANONICAL_REASON_CODES.filter((code) => reasonSet.has(code));
      const severityWeight = computeSeverityWeight(reasonCodes);
      const blockerWeight = computeBlockerWeight(reasonCodes);
      const remediationType = pickRemediationType(reasonCodes);
      const remediationTypeWeight = remediationTypeToWeight(remediationType);

      return {
        severityWeight: minValueOrDefault(
          verdictList.map((row) => row.severityWeight),
          severityWeight,
        ),
        blockerWeight,
        dependencyDepthWeight: minValueOrDefault(
          [
            ...verdictList.map((row) => row.dependencyDepthWeight),
            ...dependencyList.map((row) => row.dependencyDepthWeight),
          ],
          999,
        ),
        issueIdentifier,
        remediationTypeWeight: minValueOrDefault(
          evidenceList.map((row) => row.remediationTypeWeight),
          remediationTypeWeight,
        ),
        evidencePath: minStringOrDefault(
          evidenceList
            .map((row) => row.evidencePath)
            .filter((path): path is string => path !== null),
          `missing/${issueIdentifier}/evidence`,
        ),
        remediationType,
        reasonCodes,
      };
    })
    .sort(compareQueueItem);

  const missingEvidence = queueItems
    .filter((item) => item.reasonCodes.includes('missing_evidence'))
    .map((item) => ({
      issueIdentifier: item.issueIdentifier,
      remediationType: item.remediationType,
      evidencePath: item.evidencePath,
      reasonCode: 'missing_evidence' as const,
    }));

  const readyForExecution = queueItems.length > 0
    && !queueItems.some((item) => item.reasonCodes.some((code) => BLOCKING_REASON_CODES.includes(code as BlockingReasonCode)));

  const nextOwner: 'backend' | 'pm' | 'qa' = readyForExecution
    ? 'qa'
    : (blockingDependencies.length > 0 ? 'pm' : 'backend');

  const queueFingerprint = sha256Hex(stableSerialize({
    schemaVersion: SCHEMA_VERSION,
    candidateId,
    policyVersion,
    queueItems,
    blockingDependencies,
    missingEvidence,
    readyForExecution,
    nextOwner,
  }));

  return {
    contract: SCHEMA_VERSION,
    schemaVersion: SCHEMA_VERSION,
    candidateId,
    policyVersion,
    orderingKeySpec: [
      'severityWeight',
      'blockerWeight',
      'dependencyDepthWeight',
      'issueIdentifier',
      'remediationTypeWeight',
      'evidencePath',
    ],
    queueItems,
    blockingDependencies,
    missingEvidence,
    readyForExecution,
    nextOwner,
    queueFingerprint,
  };
}

function normalizeVerdictPacket(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  const row = toRecord(value);
  const candidates = [
    row.verdictRows,
    row.rows,
    row.queueItems,
    row.entries,
    row.items,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }
  return [];
}

function normalizeDependencyGraph(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  const row = toRecord(value);
  const candidates = [row.edges, row.links, row.dependencies, row.rows];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }
  return [];
}

function normalizeVerdictRow(value: unknown, index: number): NormalizedVerdictRow {
  const row = toRecord(value);
  return {
    issueIdentifier: normalizeIssueIdentifier(row.issueIdentifier) ?? `UNKNOWN-${index + 1}`,
    severityWeight: normalizeNumber(
      row.severityWeight ?? row.gatePriorityWeight ?? row.lanePriorityWeight ?? row.priorityWeight,
      999,
    ),
    dependencyDepthWeight: normalizeNumber(row.dependencyDepthWeight ?? row.depthWeight, 999),
    reasonCodes: normalizeReasonCodes([
      ...toArray(row.reasonCodes),
      ...toArray(row.blockingReasons),
      row.unresolvedReason,
      row.status,
      row.message,
    ]),
    referenceLinks: toArray(row.referenceLinks)
      .map((entry) => normalizeString(entry))
      .filter((entry): entry is string => entry !== null),
  };
}

function normalizeDependencyRef(value: unknown, index: number): NormalizedDependencyRef {
  const row = toRecord(value);
  const dependencyIssueLink = normalizeString(
    row.dependencyIssueLink ?? row.issueLink ?? row.dependsOnIssueLink,
  );

  return {
    issueIdentifier: normalizeIssueIdentifier(row.issueIdentifier) ?? `UNKNOWN-${index + 1}`,
    dependsOnIssueIdentifier: normalizeIssueIdentifier(
      row.dependsOnIssueIdentifier ?? row.dependencyIssueIdentifier ?? row.dependencyIssue,
    ) ?? `UNKNOWN-DEP-${index + 1}`,
    dependencyDepthWeight: normalizeNumber(row.dependencyDepthWeight ?? row.depthWeight, 999),
    dependencyStatus: normalizeString(row.dependencyStatus ?? row.status)?.toLowerCase() ?? null,
    reasonCodes: normalizeReasonCodes([
      ...toArray(row.reasonCodes),
      row.unresolvedReason,
      row.message,
      row.dependencyStatus,
      row.status,
    ]),
    referenceLinks: [
      ...toArray(row.referenceLinks)
        .map((entry) => normalizeString(entry))
        .filter((entry): entry is string => entry !== null),
      ...(dependencyIssueLink ? [dependencyIssueLink] : []),
    ],
  };
}

function normalizeEvidenceRef(value: unknown, index: number): NormalizedEvidenceRef {
  const row = toRecord(value);

  return {
    issueIdentifier: normalizeIssueIdentifier(row.issueIdentifier) ?? `UNKNOWN-${index + 1}`,
    remediationType: normalizeString(row.remediationType ?? row.evidenceType ?? row.type) ?? 'evidence_backfill',
    remediationTypeWeight: normalizeNumber(
      row.remediationTypeWeight ?? row.evidenceTypeWeight ?? row.typeWeight,
      999,
    ),
    evidencePath: normalizeString(row.evidencePath ?? row.path),
    reasonCodes: normalizeReasonCodes([
      ...toArray(row.reasonCodes),
      row.unresolvedReason,
      row.message,
      row.status,
    ]),
    referenceLinks: toArray(row.referenceLinks)
      .map((entry) => normalizeString(entry))
      .filter((entry): entry is string => entry !== null),
  };
}

function normalizeReasonCodes(values: unknown[]): CanonicalReasonCode[] {
  const result = new Set<CanonicalReasonCode>();

  values.forEach((value) => {
    const code = normalizeReasonCode(value);
    if (code) {
      result.add(code);
    }
  });

  return CANONICAL_REASON_CODES.filter((code) => result.has(code));
}

function normalizeReasonCode(value: unknown): CanonicalReasonCode | null {
  const raw = normalizeString(value);
  if (!raw) {
    return null;
  }

  const normalized = raw.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  if (normalized === 'missing_evidence' || normalized.includes('missing_evidence')) {
    return 'missing_evidence';
  }

  if (normalized === 'dependency_blocked' || normalized.includes('dependency_block')) {
    return 'dependency_blocked';
  }

  if (normalized === 'policy_violation' || normalized.includes('policy_violation')) {
    return 'policy_violation';
  }

  if (normalized === 'ordering_regression' || normalized.includes('ordering_regression')) {
    return 'ordering_regression';
  }

  if (normalized === 'reference_noncanonical' || normalized.includes('reference_noncanonical')) {
    return 'reference_noncanonical';
  }

  if ((normalized.includes('missing') || normalized.includes('absent'))
    && (normalized.includes('evidence') || normalized.includes('artifact'))) {
    return 'missing_evidence';
  }

  if ((normalized.includes('dependency') || normalized.includes('upstream'))
    && (normalized.includes('blocked') || normalized.includes('open') || normalized.includes('pending'))) {
    return 'dependency_blocked';
  }

  if ((normalized.includes('policy') || normalized.includes('contract') || normalized.includes('rule'))
    && (normalized.includes('violation') || normalized.includes('failed') || normalized.includes('fail'))) {
    return 'policy_violation';
  }

  if ((normalized.includes('ordering') || normalized.includes('sort') || normalized.includes('order'))
    && (normalized.includes('drift') || normalized.includes('mismatch') || normalized.includes('regression'))) {
    return 'ordering_regression';
  }

  if ((normalized.includes('reference') || normalized.includes('link') || normalized.includes('url'))
    && (normalized.includes('noncanonical') || normalized.includes('invalid') || normalized.includes('relative'))) {
    return 'reference_noncanonical';
  }

  return null;
}

function compareVerdictRow(left: NormalizedVerdictRow, right: NormalizedVerdictRow): number {
  return (
    left.severityWeight - right.severityWeight
    || left.dependencyDepthWeight - right.dependencyDepthWeight
    || compareStrings(left.issueIdentifier, right.issueIdentifier)
  );
}

function compareDependencyRef(left: NormalizedDependencyRef, right: NormalizedDependencyRef): number {
  return (
    left.dependencyDepthWeight - right.dependencyDepthWeight
    || compareStrings(left.issueIdentifier, right.issueIdentifier)
    || compareStrings(left.dependsOnIssueIdentifier, right.dependsOnIssueIdentifier)
  );
}

function compareEvidenceRef(left: NormalizedEvidenceRef, right: NormalizedEvidenceRef): number {
  return (
    left.remediationTypeWeight - right.remediationTypeWeight
    || compareStrings(left.issueIdentifier, right.issueIdentifier)
    || compareStrings(
      left.evidencePath ?? `missing/${left.issueIdentifier}/${left.remediationType}`,
      right.evidencePath ?? `missing/${right.issueIdentifier}/${right.remediationType}`,
    )
  );
}

function compareQueueItem(left: ReleaseCandidateRemediationQueueItem, right: ReleaseCandidateRemediationQueueItem): number {
  return (
    left.severityWeight - right.severityWeight
    || left.blockerWeight - right.blockerWeight
    || left.dependencyDepthWeight - right.dependencyDepthWeight
    || compareStrings(left.issueIdentifier, right.issueIdentifier)
    || left.remediationTypeWeight - right.remediationTypeWeight
    || compareStrings(left.evidencePath, right.evidencePath)
  );
}

function computeSeverityWeight(reasonCodes: CanonicalReasonCode[]): number {
  if (reasonCodes.some((code) => BLOCKING_REASON_CODES.includes(code as BlockingReasonCode))) {
    return 0;
  }
  if (reasonCodes.length > 0) {
    return 1;
  }
  return 2;
}

function computeBlockerWeight(reasonCodes: CanonicalReasonCode[]): number {
  if (reasonCodes.includes('dependency_blocked')) {
    return 0;
  }
  if (reasonCodes.includes('missing_evidence') || reasonCodes.includes('policy_violation')) {
    return 1;
  }
  if (reasonCodes.length > 0) {
    return 2;
  }
  return 3;
}

function pickRemediationType(reasonCodes: CanonicalReasonCode[]): ReleaseCandidateRemediationQueueItem['remediationType'] {
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

function remediationTypeToWeight(remediationType: ReleaseCandidateRemediationQueueItem['remediationType']): number {
  switch (remediationType) {
    case 'dependency_unblock':
      return 1;
    case 'evidence_backfill':
      return 2;
    case 'policy_remediation':
      return 3;
    case 'ordering_repair':
      return 4;
    case 'reference_canonicalization':
      return 5;
    default:
      return 9;
  }
}

function isDependencyBlocked(status: string | null): boolean {
  if (!status) {
    return false;
  }
  return ['blocked', 'open', 'pending', 'unresolved'].includes(status);
}

function isCanonicalIssueReference(reference: string): boolean {
  return /^\/[A-Za-z0-9_-]+\/issues\/[A-Za-z0-9_-]+-\d+(?:#comment-[A-Za-z0-9_-]+)?$/.test(reference);
}

function normalizeIssueIdentifier(value: unknown): string | null {
  const normalized = normalizeString(value)?.toUpperCase() ?? null;
  if (!normalized) {
    return null;
  }

  const match = ISSUE_IDENTIFIER_PATTERN.exec(normalized);
  if (!match) {
    return null;
  }

  return `${match[1].toUpperCase()}-${match[2]}`;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : (value === undefined || value === null ? [] : [value]);
}

function compareStrings(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function minValueOrDefault(values: number[], fallback: number): number {
  if (values.length === 0) {
    return fallback;
  }
  return values.reduce((min, value) => (value < min ? value : min), values[0]);
}

function minStringOrDefault(values: string[], fallback: string): string {
  if (values.length === 0) {
    return fallback;
  }
  return [...values].sort(compareStrings)[0] ?? fallback;
}

function groupByIssue<T extends { issueIdentifier: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    const existing = map.get(item.issueIdentifier) ?? [];
    existing.push(item);
    map.set(item.issueIdentifier, existing);
  });
  return map;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, current]) => current !== undefined)
      .sort(([left], [right]) => compareStrings(left, right));

    return `{${entries.map(([key, current]) => `${JSON.stringify(key)}:${stableSerialize(current)}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
