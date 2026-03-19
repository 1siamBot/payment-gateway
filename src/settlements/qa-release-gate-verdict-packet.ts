import { createHash } from 'node:crypto';

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;
const SCHEMA_VERSION = 'settlement-qa-release-gate-verdict-packet.v1' as const;

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

type NormalizedLaneStatus = {
  issueIdentifier: string;
  gatePriorityWeight: number;
  blockerWeight: number;
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
  evidenceType: string;
  evidenceTypeWeight: number;
  evidencePath: string | null;
  reasonCodes: CanonicalReasonCode[];
  referenceLinks: string[];
};

export type QaReleaseGateVerdictRow = {
  gatePriorityWeight: number;
  blockerWeight: number;
  dependencyDepthWeight: number;
  issueIdentifier: string;
  evidenceTypeWeight: number;
  evidencePath: string;
  reasonCodes: CanonicalReasonCode[];
};

export type SettlementQaReleaseGateVerdictPacket = {
  contract: typeof SCHEMA_VERSION;
  schemaVersion: typeof SCHEMA_VERSION;
  candidateId: string;
  policyVersion: string;
  orderingKeySpec: [
    'gatePriorityWeight',
    'blockerWeight',
    'dependencyDepthWeight',
    'issueIdentifier',
    'evidenceTypeWeight',
    'evidencePath',
  ];
  verdictRows: QaReleaseGateVerdictRow[];
  verdictFingerprint: string;
  releaseGateState: 'ready_for_qa' | 'needs_review' | 'blocked';
  requiredRemediations: Array<{
    issueIdentifier: string;
    reasonCode: BlockingReasonCode;
    action: string;
    owner: 'backend' | 'pm' | 'qa';
  }>;
  blockingDependencies: Array<{
    issueIdentifier: string;
    dependencyIssueIdentifier: string;
    dependencyStatus: string;
    reasonCode: 'dependency_blocked';
  }>;
  missingEvidence: Array<{
    issueIdentifier: string;
    evidenceType: string;
    evidencePath: string;
    reasonCode: 'missing_evidence';
  }>;
  nextOwner: 'backend' | 'pm' | 'qa';
};

export function buildSettlementQaReleaseGateVerdictPacket(input: {
  candidateId: string;
  laneStatuses: unknown[];
  dependencyGraph: unknown;
  evidenceManifestRefs: unknown[];
  policyVersion: string;
}): SettlementQaReleaseGateVerdictPacket {
  const candidateId = normalizeString(input.candidateId) ?? 'candidate-unknown';
  const policyVersion = normalizeString(input.policyVersion) ?? 'policy-unknown';

  const laneStatuses = (Array.isArray(input.laneStatuses) ? input.laneStatuses : [])
    .map((value, index) => normalizeLaneStatus(value, index))
    .sort(compareLaneStatus);

  const dependencyRefs = normalizeDependencyGraph(input.dependencyGraph)
    .map((value, index) => normalizeDependencyRef(value, index))
    .sort(compareDependencyRef);

  const evidenceRefs = (Array.isArray(input.evidenceManifestRefs) ? input.evidenceManifestRefs : [])
    .map((value, index) => normalizeEvidenceRef(value, index))
    .sort(compareEvidenceRef);

  const issueSet = new Set<string>();
  laneStatuses.forEach((lane) => issueSet.add(lane.issueIdentifier));
  dependencyRefs.forEach((dependency) => {
    issueSet.add(dependency.issueIdentifier);
    issueSet.add(dependency.dependsOnIssueIdentifier);
  });
  evidenceRefs.forEach((evidence) => issueSet.add(evidence.issueIdentifier));

  const laneByIssue = groupByIssue(laneStatuses);
  const dependencyByIssue = groupByIssue(dependencyRefs);
  const evidenceByIssue = groupByIssue(evidenceRefs);

  const blockingDependencies: SettlementQaReleaseGateVerdictPacket['blockingDependencies'] = [];

  dependencyRefs.forEach((dependency) => {
    if (!isDependencyBlocked(dependency.dependencyStatus)) {
      return;
    }
    blockingDependencies.push({
      issueIdentifier: dependency.issueIdentifier,
      dependencyIssueIdentifier: dependency.dependsOnIssueIdentifier,
      dependencyStatus: dependency.dependencyStatus ?? 'blocked',
      reasonCode: 'dependency_blocked',
    });
  });

  blockingDependencies.sort((left, right) => (
    compareStrings(left.issueIdentifier, right.issueIdentifier)
    || compareStrings(left.dependencyIssueIdentifier, right.dependencyIssueIdentifier)
    || compareStrings(left.dependencyStatus, right.dependencyStatus)
  ));

  const verdictRows = [...issueSet]
    .map((issueIdentifier) => {
      const lanes = laneByIssue.get(issueIdentifier) ?? [];
      const dependencies = dependencyByIssue.get(issueIdentifier) ?? [];
      const evidenceList = evidenceByIssue.get(issueIdentifier) ?? [];

      const reasonSet = new Set<CanonicalReasonCode>([
        ...lanes.flatMap((lane) => lane.reasonCodes),
        ...dependencies.flatMap((dependency) => dependency.reasonCodes),
        ...evidenceList.flatMap((evidence) => evidence.reasonCodes),
      ]);

      if (evidenceList.length === 0 || evidenceList.some((evidence) => !evidence.evidencePath)) {
        reasonSet.add('missing_evidence');
      }

      if (dependencies.some((dependency) => isDependencyBlocked(dependency.dependencyStatus))) {
        reasonSet.add('dependency_blocked');
      }

      const allLinks = [
        ...lanes.flatMap((lane) => lane.referenceLinks),
        ...dependencies.flatMap((dependency) => dependency.referenceLinks),
        ...evidenceList.flatMap((evidence) => evidence.referenceLinks),
      ];
      if (allLinks.some((link) => !isCanonicalIssueReference(link))) {
        reasonSet.add('reference_noncanonical');
      }

      const reasonCodes = CANONICAL_REASON_CODES.filter((code) => reasonSet.has(code));

      return {
        gatePriorityWeight: minValueOrDefault(lanes.map((lane) => lane.gatePriorityWeight), 999),
        blockerWeight: computeBlockerWeight(
          reasonCodes,
          minValueOrDefault(lanes.map((lane) => lane.blockerWeight), 2),
        ),
        dependencyDepthWeight: minValueOrDefault(
          [
            ...lanes.map((lane) => lane.dependencyDepthWeight),
            ...dependencies.map((dependency) => dependency.dependencyDepthWeight),
          ],
          999,
        ),
        issueIdentifier,
        evidenceTypeWeight: minValueOrDefault(evidenceList.map((evidence) => evidence.evidenceTypeWeight), 999),
        evidencePath: minStringOrDefault(
          evidenceList
            .map((evidence) => evidence.evidencePath)
            .filter((path): path is string => path !== null),
          `missing/${issueIdentifier}/evidence`,
        ),
        reasonCodes,
      };
    })
    .sort(compareVerdictRow);

  const missingEvidence = verdictRows
    .filter((entry) => entry.reasonCodes.includes('missing_evidence'))
    .map((entry) => ({
      issueIdentifier: entry.issueIdentifier,
      evidenceType: 'evidence',
      evidencePath: entry.evidencePath,
      reasonCode: 'missing_evidence' as const,
    }));

  const requiredRemediations = uniqueRemediations(verdictRows.flatMap((entry) => entry.reasonCodes
    .filter((reason): reason is BlockingReasonCode => BLOCKING_REASON_CODES.includes(reason as BlockingReasonCode))
    .map((reasonCode) => ({
      issueIdentifier: entry.issueIdentifier,
      reasonCode,
      action: remediationAction(reasonCode),
      owner: remediationOwner(reasonCode),
    }))));

  const releaseGateState: 'ready_for_qa' | 'needs_review' | 'blocked' = requiredRemediations.length === 0
    ? 'ready_for_qa'
    : 'blocked';

  const nextOwner: 'backend' | 'pm' | 'qa' = releaseGateState === 'ready_for_qa'
    ? 'qa'
    : (requiredRemediations.some((row) => row.reasonCode === 'dependency_blocked') ? 'pm' : 'backend');

  const verdictFingerprint = sha256Hex(stableSerialize({
    schemaVersion: SCHEMA_VERSION,
    candidateId,
    policyVersion,
    verdictRows,
    releaseGateState,
    requiredRemediations,
    blockingDependencies,
    missingEvidence,
    nextOwner,
  }));

  return {
    contract: SCHEMA_VERSION,
    schemaVersion: SCHEMA_VERSION,
    candidateId,
    policyVersion,
    orderingKeySpec: [
      'gatePriorityWeight',
      'blockerWeight',
      'dependencyDepthWeight',
      'issueIdentifier',
      'evidenceTypeWeight',
      'evidencePath',
    ],
    verdictRows,
    verdictFingerprint,
    releaseGateState,
    requiredRemediations,
    blockingDependencies,
    missingEvidence,
    nextOwner,
  };
}

function normalizeLaneStatus(value: unknown, index: number): NormalizedLaneStatus {
  const row = toRecord(value);

  return {
    issueIdentifier: normalizeIssueIdentifier(row.issueIdentifier) ?? `UNKNOWN-${index + 1}`,
    gatePriorityWeight: normalizeNumber(row.gatePriorityWeight ?? row.priorityWeight, 999),
    blockerWeight: normalizeNumber(row.blockerWeight, 2),
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

function normalizeDependencyRef(value: unknown, index: number): NormalizedDependencyRef {
  const row = toRecord(value);

  return {
    issueIdentifier: normalizeIssueIdentifier(row.issueIdentifier ?? row.fromIssueIdentifier) ?? `UNKNOWN-${index + 1}`,
    dependsOnIssueIdentifier: normalizeIssueIdentifier(
      row.dependsOnIssueIdentifier ?? row.toIssueIdentifier ?? row.dependencyIssueIdentifier ?? row.dependencyIssue,
    ) ?? `UNKNOWN-DEP-${index + 1}`,
    dependencyDepthWeight: normalizeNumber(row.dependencyDepthWeight ?? row.depthWeight, 999),
    dependencyStatus: normalizeString(row.dependencyStatus ?? row.status)?.toLowerCase() ?? null,
    reasonCodes: normalizeReasonCodes([
      ...toArray(row.reasonCodes),
      ...toArray(row.blockingReasons),
      row.unresolvedReason,
      row.message,
      row.dependencyStatus,
      row.status,
    ]),
    referenceLinks: [
      ...toArray(row.referenceLinks)
        .map((entry) => normalizeString(entry))
        .filter((entry): entry is string => entry !== null),
      ...toArray(row.issueLinks)
        .map((entry) => normalizeString(entry))
        .filter((entry): entry is string => entry !== null),
    ],
  };
}

function normalizeEvidenceRef(value: unknown, index: number): NormalizedEvidenceRef {
  const row = toRecord(value);

  return {
    issueIdentifier: normalizeIssueIdentifier(row.issueIdentifier) ?? `UNKNOWN-${index + 1}`,
    evidenceType: normalizeString(row.evidenceType ?? row.type) ?? 'evidence',
    evidenceTypeWeight: normalizeNumber(row.evidenceTypeWeight ?? row.typeWeight, 999),
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

  if ((normalized.includes('policy') || normalized.includes('rule') || normalized.includes('compliance'))
    && (normalized.includes('violation') || normalized.includes('failed') || normalized.includes('breach'))) {
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

function compareLaneStatus(left: NormalizedLaneStatus, right: NormalizedLaneStatus): number {
  return (
    left.gatePriorityWeight - right.gatePriorityWeight
    || left.blockerWeight - right.blockerWeight
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
    left.evidenceTypeWeight - right.evidenceTypeWeight
    || compareStrings(left.issueIdentifier, right.issueIdentifier)
    || compareStrings(
      left.evidencePath ?? `missing/${left.issueIdentifier}/${left.evidenceType}`,
      right.evidencePath ?? `missing/${right.issueIdentifier}/${right.evidenceType}`,
    )
  );
}

function compareVerdictRow(left: QaReleaseGateVerdictRow, right: QaReleaseGateVerdictRow): number {
  return (
    left.gatePriorityWeight - right.gatePriorityWeight
    || left.blockerWeight - right.blockerWeight
    || left.dependencyDepthWeight - right.dependencyDepthWeight
    || compareStrings(left.issueIdentifier, right.issueIdentifier)
    || left.evidenceTypeWeight - right.evidenceTypeWeight
    || compareStrings(left.evidencePath, right.evidencePath)
  );
}

function computeBlockerWeight(reasonCodes: CanonicalReasonCode[], fallbackWeight: number): number {
  if (reasonCodes.some((code) => BLOCKING_REASON_CODES.includes(code as BlockingReasonCode))) {
    return 0;
  }
  if (reasonCodes.length > 0) {
    return Math.min(1, fallbackWeight);
  }
  return fallbackWeight;
}

function remediationAction(reasonCode: BlockingReasonCode): string {
  if (reasonCode === 'missing_evidence') {
    return 'Publish or attach the required evidence manifest for this lane.';
  }
  if (reasonCode === 'dependency_blocked') {
    return 'Resolve the blocked dependency issue before promoting this candidate.';
  }
  return 'Update policy inputs or fix violating checks, then rerun verdict packet generation.';
}

function remediationOwner(reasonCode: BlockingReasonCode): 'backend' | 'pm' | 'qa' {
  if (reasonCode === 'dependency_blocked') {
    return 'pm';
  }
  return 'backend';
}

function uniqueRemediations(rows: Array<{
  issueIdentifier: string;
  reasonCode: BlockingReasonCode;
  action: string;
  owner: 'backend' | 'pm' | 'qa';
}>): Array<{
  issueIdentifier: string;
  reasonCode: BlockingReasonCode;
  action: string;
  owner: 'backend' | 'pm' | 'qa';
}> {
  const seen = new Set<string>();
  const result: Array<{
    issueIdentifier: string;
    reasonCode: BlockingReasonCode;
    action: string;
    owner: 'backend' | 'pm' | 'qa';
  }> = [];

  rows
    .sort((left, right) => (
      compareStrings(left.issueIdentifier, right.issueIdentifier)
      || compareStrings(left.reasonCode, right.reasonCode)
    ))
    .forEach((row) => {
      const key = `${row.issueIdentifier}:${row.reasonCode}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      result.push(row);
    });

  return result;
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
