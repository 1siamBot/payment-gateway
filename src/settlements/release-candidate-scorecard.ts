import { createHash } from 'node:crypto';

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;
const CANONICAL_REASON_CODES = [
  'missing_evidence',
  'dependency_blocked',
  'fingerprint_drift',
  'ordering_regression',
  'reference_noncanonical',
] as const;

const BLOCKING_REASON_CODES = [
  'missing_evidence',
  'dependency_blocked',
  'fingerprint_drift',
] as const;

const WARNING_REASON_CODES = [
  'ordering_regression',
  'reference_noncanonical',
] as const;

type CanonicalReasonCode = (typeof CANONICAL_REASON_CODES)[number];
type BlockingReasonCode = (typeof BLOCKING_REASON_CODES)[number];
type WarningReasonCode = (typeof WARNING_REASON_CODES)[number];

type NormalizedLaneEvidence = {
  issueIdentifier: string;
  lanePriorityWeight: number;
  dependencyDepthWeight: number;
  evidenceType: string;
  evidencePath: string | null;
  laneManifestFingerprint: string | null;
  reasonCodes: CanonicalReasonCode[];
  referenceLinks: string[];
};

type NormalizedDependencyState = {
  issueIdentifier: string;
  dependencyDepthWeight: number;
  dependencyStatus: string | null;
  dependencyManifestFingerprint: string | null;
  reasonCodes: CanonicalReasonCode[];
  referenceLinks: string[];
};

export type SettlementReleaseCandidateScorecard = {
  contract: 'settlement-release-candidate-scorecard.v1';
  schemaVersion: 'settlement-release-candidate-scorecard.v1';
  candidateId: string;
  manifestFingerprint: string;
  orderingKeySpec: [
    'lanePriorityWeight',
    'blockerWeight',
    'dependencyDepthWeight',
    'issueIdentifier',
    'evidenceType',
    'evidencePath',
  ];
  entries: Array<{
    lanePriorityWeight: number;
    blockerWeight: number;
    dependencyDepthWeight: number;
    issueIdentifier: string;
    evidenceType: string;
    evidencePath: string;
    blockingReasons: BlockingReasonCode[];
    nonBlockingWarnings: WarningReasonCode[];
  }>;
  coveragePercent: number;
  blockingReasons: BlockingReasonCode[];
  nonBlockingWarnings: WarningReasonCode[];
  readyForQa: boolean;
  recommendedNextOwner: 'qa' | 'pm' | 'backend';
  scorecardFingerprint: string;
};

export function buildSettlementReleaseCandidateScorecard(input: {
  candidateId: string;
  manifestFingerprint: string;
  laneEvidence: unknown[];
  dependencyStates: unknown[];
}): SettlementReleaseCandidateScorecard {
  const candidateId = normalizeString(input.candidateId) ?? 'candidate-unknown';
  const manifestFingerprint = normalizeString(input.manifestFingerprint) ?? '';

  const dependencyStates = (Array.isArray(input.dependencyStates) ? input.dependencyStates : [])
    .map((value, index) => normalizeDependencyState(value, index))
    .sort(compareDependencyState);

  const dependencyByIssue = new Map(dependencyStates.map((state) => [state.issueIdentifier, state]));

  const entries = (Array.isArray(input.laneEvidence) ? input.laneEvidence : [])
    .map((value, index) => normalizeLaneEvidence(value, index))
    .map((lane) => {
      const dependency = dependencyByIssue.get(lane.issueIdentifier) ?? null;
      const reasonSet = new Set<CanonicalReasonCode>([
        ...lane.reasonCodes,
        ...(dependency?.reasonCodes ?? []),
      ]);

      if (!lane.evidencePath) {
        reasonSet.add('missing_evidence');
      }

      if (
        dependency?.dependencyStatus
        && ['blocked', 'open', 'pending', 'unresolved'].includes(dependency.dependencyStatus)
      ) {
        reasonSet.add('dependency_blocked');
      }

      if (
        manifestFingerprint
        && ((lane.laneManifestFingerprint && lane.laneManifestFingerprint !== manifestFingerprint)
          || (dependency?.dependencyManifestFingerprint
            && dependency.dependencyManifestFingerprint !== manifestFingerprint))
      ) {
        reasonSet.add('fingerprint_drift');
      }

      const referenceLinks = [
        ...lane.referenceLinks,
        ...(dependency?.referenceLinks ?? []),
      ];
      if (referenceLinks.some((link) => !isCanonicalIssueReference(link))) {
        reasonSet.add('reference_noncanonical');
      }

      const reasonCodes = CANONICAL_REASON_CODES.filter((code) => reasonSet.has(code));
      const blockingReasons = BLOCKING_REASON_CODES.filter((code) => reasonSet.has(code));
      const nonBlockingWarnings = WARNING_REASON_CODES.filter((code) => reasonSet.has(code));

      const blockerWeight = blockingReasons.length > 0 ? 0 : (nonBlockingWarnings.length > 0 ? 1 : 2);

      return {
        lanePriorityWeight: lane.lanePriorityWeight,
        blockerWeight,
        dependencyDepthWeight: dependency?.dependencyDepthWeight ?? lane.dependencyDepthWeight,
        issueIdentifier: lane.issueIdentifier,
        evidenceType: lane.evidenceType,
        evidencePath: lane.evidencePath ?? `missing/${lane.issueIdentifier}/${lane.evidenceType}`,
        reasonCodes,
        blockingReasons,
        nonBlockingWarnings,
      };
    })
    .sort(compareScorecardEntry)
    .map((entry) => ({
      lanePriorityWeight: entry.lanePriorityWeight,
      blockerWeight: entry.blockerWeight,
      dependencyDepthWeight: entry.dependencyDepthWeight,
      issueIdentifier: entry.issueIdentifier,
      evidenceType: entry.evidenceType,
      evidencePath: entry.evidencePath,
      blockingReasons: entry.blockingReasons,
      nonBlockingWarnings: entry.nonBlockingWarnings,
    }));

  const blockingReasons = uniqueCodes(
    entries.flatMap((entry) => entry.blockingReasons),
    BLOCKING_REASON_CODES,
  );
  const nonBlockingWarnings = uniqueCodes(
    entries.flatMap((entry) => entry.nonBlockingWarnings),
    WARNING_REASON_CODES,
  );

  const passCount = entries.filter((entry) => entry.blockingReasons.length === 0).length;
  const coveragePercent = entries.length === 0
    ? 100
    : Number(((passCount / entries.length) * 100).toFixed(6));

  const readyForQa = blockingReasons.length === 0;
  const recommendedNextOwner: 'qa' | 'pm' | 'backend' = readyForQa
    ? 'qa'
    : (blockingReasons.includes('dependency_blocked') ? 'pm' : 'backend');

  const scorecardFingerprint = sha256Hex(stableSerialize({
    schemaVersion: 'settlement-release-candidate-scorecard.v1',
    candidateId,
    manifestFingerprint,
    entries,
    coveragePercent,
    blockingReasons,
    nonBlockingWarnings,
    readyForQa,
    recommendedNextOwner,
  }));

  return {
    contract: 'settlement-release-candidate-scorecard.v1',
    schemaVersion: 'settlement-release-candidate-scorecard.v1',
    candidateId,
    manifestFingerprint,
    orderingKeySpec: [
      'lanePriorityWeight',
      'blockerWeight',
      'dependencyDepthWeight',
      'issueIdentifier',
      'evidenceType',
      'evidencePath',
    ],
    entries,
    coveragePercent,
    blockingReasons,
    nonBlockingWarnings,
    readyForQa,
    recommendedNextOwner,
    scorecardFingerprint,
  };
}

function normalizeLaneEvidence(value: unknown, index: number): NormalizedLaneEvidence {
  const row = toRecord(value);
  return {
    issueIdentifier: normalizeIssueIdentifier(row.issueIdentifier) ?? `UNKNOWN-${index + 1}`,
    lanePriorityWeight: normalizeNumber(row.lanePriorityWeight ?? row.priorityWeight, 999),
    dependencyDepthWeight: normalizeNumber(row.dependencyDepthWeight ?? row.dependencyDepth, 999),
    evidenceType: normalizeString(row.evidenceType ?? row.type) ?? 'evidence',
    evidencePath: normalizeString(row.evidencePath ?? row.path),
    laneManifestFingerprint: normalizeString(
      row.laneManifestFingerprint ?? row.manifestFingerprint ?? row.fingerprint,
    ),
    reasonCodes: normalizeReasonCodes([
      ...toArray(row.reasonCodes),
      row.unresolvedReason,
      row.message,
    ]),
    referenceLinks: toArray(row.referenceLinks)
      .map((item) => normalizeString(item))
      .filter((item): item is string => item !== null),
  };
}

function normalizeDependencyState(value: unknown, index: number): NormalizedDependencyState {
  const row = toRecord(value);
  const dependencyIssueLink = normalizeString(row.dependencyIssueLink ?? row.issueLink);

  return {
    issueIdentifier: normalizeIssueIdentifier(row.issueIdentifier) ?? `UNKNOWN-${index + 1}`,
    dependencyDepthWeight: normalizeNumber(row.dependencyDepthWeight ?? row.dependencyDepth, 999),
    dependencyStatus: normalizeString(row.dependencyStatus ?? row.status)?.toLowerCase() ?? null,
    dependencyManifestFingerprint: normalizeString(
      row.dependencyManifestFingerprint ?? row.manifestFingerprint ?? row.fingerprint,
    ),
    reasonCodes: normalizeReasonCodes([
      ...toArray(row.reasonCodes),
      row.unresolvedReason,
      row.message,
      row.dependencyStatus,
    ]),
    referenceLinks: [
      ...toArray(row.referenceLinks)
        .map((item) => normalizeString(item))
        .filter((item): item is string => item !== null),
      ...(dependencyIssueLink ? [dependencyIssueLink] : []),
    ],
  };
}

function compareDependencyState(left: NormalizedDependencyState, right: NormalizedDependencyState): number {
  if (left.dependencyDepthWeight !== right.dependencyDepthWeight) {
    return left.dependencyDepthWeight - right.dependencyDepthWeight;
  }
  return left.issueIdentifier.localeCompare(right.issueIdentifier);
}

function compareScorecardEntry(
  left: {
    lanePriorityWeight: number;
    blockerWeight: number;
    dependencyDepthWeight: number;
    issueIdentifier: string;
    evidenceType: string;
    evidencePath: string;
  },
  right: {
    lanePriorityWeight: number;
    blockerWeight: number;
    dependencyDepthWeight: number;
    issueIdentifier: string;
    evidenceType: string;
    evidencePath: string;
  },
): number {
  if (left.lanePriorityWeight !== right.lanePriorityWeight) {
    return left.lanePriorityWeight - right.lanePriorityWeight;
  }
  if (left.blockerWeight !== right.blockerWeight) {
    return left.blockerWeight - right.blockerWeight;
  }
  if (left.dependencyDepthWeight !== right.dependencyDepthWeight) {
    return left.dependencyDepthWeight - right.dependencyDepthWeight;
  }
  const issue = left.issueIdentifier.localeCompare(right.issueIdentifier);
  if (issue !== 0) {
    return issue;
  }
  const evidenceType = left.evidenceType.localeCompare(right.evidenceType);
  if (evidenceType !== 0) {
    return evidenceType;
  }
  return left.evidencePath.localeCompare(right.evidencePath);
}

function normalizeReasonCodes(values: unknown[]): CanonicalReasonCode[] {
  const reasonSet = new Set<CanonicalReasonCode>();
  values.forEach((value) => {
    const mapped = mapReasonCode(value);
    if (mapped) {
      reasonSet.add(mapped);
    }
  });
  return CANONICAL_REASON_CODES.filter((code) => reasonSet.has(code));
}

function mapReasonCode(value: unknown): CanonicalReasonCode | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const compact = normalized.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  if (
    compact === 'missing_evidence'
    || compact.includes('missing')
    || compact.includes('evidence_gap')
    || compact.includes('artifact_gap')
  ) {
    return 'missing_evidence';
  }

  if (
    compact === 'dependency_blocked'
    || compact.includes('dependency_blocked')
    || compact.includes('dependency_open')
    || compact.includes('dependency_unresolved')
    || compact.includes('dependency_pending')
    || compact.includes('blocked_dependency')
  ) {
    return 'dependency_blocked';
  }

  if (
    compact === 'fingerprint_drift'
    || compact.includes('fingerprint_drift')
    || compact.includes('fingerprint_mismatch')
    || compact.includes('checksum_mismatch')
    || compact.includes('digest_mismatch')
    || compact.includes('hash_mismatch')
  ) {
    return 'fingerprint_drift';
  }

  if (
    compact === 'ordering_regression'
    || compact.includes('ordering_regression')
    || compact.includes('ordering_drift')
    || compact.includes('order_regression')
  ) {
    return 'ordering_regression';
  }

  if (
    compact === 'reference_noncanonical'
    || compact.includes('reference_noncanonical')
    || compact.includes('reference_invalid')
    || compact.includes('noncanonical')
    || compact.includes('non_canonical')
  ) {
    return 'reference_noncanonical';
  }

  return null;
}

function uniqueCodes<T extends readonly string[]>(
  values: string[],
  canonicalOrder: T,
): T[number][] {
  const set = new Set(values);
  return canonicalOrder.filter((value) => set.has(value));
}

function isCanonicalIssueReference(value: string): boolean {
  return /^\/[A-Z0-9]+\/issues\/[A-Z]+-\d+(#(?:comment-\d+|document-[a-z0-9-]+))?$/i.test(value);
}

function normalizeIssueIdentifier(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized || !ISSUE_IDENTIFIER_PATTERN.test(normalized)) {
    return null;
  }

  const matched = normalized.match(ISSUE_IDENTIFIER_PATTERN);
  if (!matched) {
    return null;
  }

  return `${matched[1].toUpperCase()}-${matched[2]}`;
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
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
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
