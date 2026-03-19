import { createHash } from 'node:crypto';

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;
const SCHEMA_VERSION = 'settlement-release-evidence-adjudication-snapshot.v1' as const;

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

type CanonicalReasonCode = (typeof CANONICAL_REASON_CODES)[number];
type BlockingReasonCode = (typeof BLOCKING_REASON_CODES)[number];

type NormalizedLaneEvidence = {
  issueIdentifier: string;
  lanePriorityWeight: number;
  readinessWeight: number;
  evidenceType: string;
  evidencePath: string | null;
  reasonCodes: CanonicalReasonCode[];
  referenceLinks: string[];
  scorecardFingerprint: string | null;
  handoffPacketFingerprint: string | null;
};

type NormalizedDependencyBlock = {
  issueIdentifier: string;
  blockerWeight: number;
  dependencyStatus: string | null;
  reasonCodes: CanonicalReasonCode[];
  referenceLinks: string[];
  scorecardFingerprint: string | null;
  handoffPacketFingerprint: string | null;
};

type AdjudicationEntry = {
  lanePriorityWeight: number;
  readinessWeight: number;
  blockerWeight: number;
  issueIdentifier: string;
  evidenceType: string;
  evidencePath: string;
  reasonCodes: CanonicalReasonCode[];
};

export type SettlementReleaseEvidenceAdjudicationSnapshot = {
  contract: typeof SCHEMA_VERSION;
  schemaVersion: typeof SCHEMA_VERSION;
  candidateId: string;
  scorecardFingerprint: string;
  handoffPacketFingerprint: string;
  orderingKeySpec: [
    'lanePriorityWeight',
    'readinessWeight',
    'blockerWeight',
    'issueIdentifier',
    'evidenceType',
    'evidencePath',
  ];
  entries: AdjudicationEntry[];
  adjudicationState: 'ready_for_qa' | 'needs_review' | 'blocked';
  ownerRouting: 'qa' | 'pm' | 'backend';
  blockingReasons: BlockingReasonCode[];
  missingEvidence: Array<{
    issueIdentifier: string;
    evidenceType: string;
    evidencePath: string;
    reasonCode: 'missing_evidence';
  }>;
  confidenceScore: number;
  readyForQa: boolean;
  snapshotFingerprint: string;
};

export function buildSettlementReleaseEvidenceAdjudicationSnapshot(input: {
  candidateId: string;
  scorecardFingerprint: string;
  handoffPacketFingerprint: string;
  laneEvidence: unknown[];
  dependencyBlocks: unknown[];
}): SettlementReleaseEvidenceAdjudicationSnapshot {
  const candidateId = normalizeString(input.candidateId) ?? 'candidate-unknown';
  const scorecardFingerprint = normalizeString(input.scorecardFingerprint) ?? '';
  const handoffPacketFingerprint = normalizeString(input.handoffPacketFingerprint) ?? '';

  const dependencyBlocks = (Array.isArray(input.dependencyBlocks) ? input.dependencyBlocks : [])
    .map((value, index) => normalizeDependencyBlock(value, index))
    .sort(compareDependencyBlock);

  const dependencyByIssue = new Map<string, NormalizedDependencyBlock>();
  dependencyBlocks.forEach((dependency) => {
    const existing = dependencyByIssue.get(dependency.issueIdentifier);
    if (!existing || compareDependencyBlock(dependency, existing) < 0) {
      dependencyByIssue.set(dependency.issueIdentifier, dependency);
    }
  });

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

      if (dependency && isDependencyBlocked(dependency.dependencyStatus)) {
        reasonSet.add('dependency_blocked');
      }

      if (
        (scorecardFingerprint && lane.scorecardFingerprint && lane.scorecardFingerprint !== scorecardFingerprint)
        || (scorecardFingerprint && dependency?.scorecardFingerprint
          && dependency.scorecardFingerprint !== scorecardFingerprint)
        || (handoffPacketFingerprint && lane.handoffPacketFingerprint
          && lane.handoffPacketFingerprint !== handoffPacketFingerprint)
        || (handoffPacketFingerprint && dependency?.handoffPacketFingerprint
          && dependency.handoffPacketFingerprint !== handoffPacketFingerprint)
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
      const blockerWeight = reasonCodes.some((code) => BLOCKING_REASON_CODES.includes(code as BlockingReasonCode))
        ? 0
        : (reasonCodes.length > 0 ? 1 : 2);

      return {
        lanePriorityWeight: lane.lanePriorityWeight,
        readinessWeight: lane.readinessWeight,
        blockerWeight,
        issueIdentifier: lane.issueIdentifier,
        evidenceType: lane.evidenceType,
        evidencePath: lane.evidencePath ?? `missing/${lane.issueIdentifier}/${lane.evidenceType}`,
        reasonCodes,
      };
    })
    .sort(compareEntry);

  const blockingReasons = uniqueCodes(
    entries.flatMap((entry) => entry.reasonCodes),
    BLOCKING_REASON_CODES,
  );

  const missingEvidence = entries
    .filter((entry) => entry.reasonCodes.includes('missing_evidence'))
    .map((entry) => ({
      issueIdentifier: entry.issueIdentifier,
      evidenceType: entry.evidenceType,
      evidencePath: entry.evidencePath,
      reasonCode: 'missing_evidence' as const,
    }));

  const readyForQa = entries.length > 0 && blockingReasons.length === 0;
  const adjudicationState: 'ready_for_qa' | 'needs_review' | 'blocked' = readyForQa
    ? 'ready_for_qa'
    : (blockingReasons.length > 0 || entries.length === 0 ? 'blocked' : 'needs_review');

  const ownerRouting: 'qa' | 'pm' | 'backend' = readyForQa
    ? 'qa'
    : (blockingReasons.includes('dependency_blocked') ? 'pm' : 'backend');

  const confidenceScore = computeConfidenceScore(entries);

  const snapshotFingerprint = sha256Hex(stableSerialize({
    schemaVersion: SCHEMA_VERSION,
    candidateId,
    scorecardFingerprint,
    handoffPacketFingerprint,
    entries,
    adjudicationState,
    ownerRouting,
    blockingReasons,
    missingEvidence,
    confidenceScore,
    readyForQa,
  }));

  return {
    contract: SCHEMA_VERSION,
    schemaVersion: SCHEMA_VERSION,
    candidateId,
    scorecardFingerprint,
    handoffPacketFingerprint,
    orderingKeySpec: [
      'lanePriorityWeight',
      'readinessWeight',
      'blockerWeight',
      'issueIdentifier',
      'evidenceType',
      'evidencePath',
    ],
    entries,
    adjudicationState,
    ownerRouting,
    blockingReasons,
    missingEvidence,
    confidenceScore,
    readyForQa,
    snapshotFingerprint,
  };
}

function normalizeLaneEvidence(value: unknown, index: number): NormalizedLaneEvidence {
  const row = toRecord(value);
  const readinessStatus = normalizeString(row.readinessStatus ?? row.status)?.toLowerCase() ?? null;

  return {
    issueIdentifier: normalizeIssueIdentifier(row.issueIdentifier) ?? `UNKNOWN-${index + 1}`,
    lanePriorityWeight: normalizeNumber(row.lanePriorityWeight ?? row.priorityWeight, 999),
    readinessWeight: normalizeReadinessWeight(row.readinessWeight, readinessStatus),
    evidenceType: normalizeString(row.evidenceType ?? row.type) ?? 'evidence',
    evidencePath: normalizeString(row.evidencePath ?? row.path),
    reasonCodes: normalizeReasonCodes([
      ...toArray(row.reasonCodes),
      ...toArray(row.gateReasonCodes),
      row.unresolvedReason,
      row.message,
      readinessStatus,
    ]),
    referenceLinks: toArray(row.referenceLinks)
      .map((entry) => normalizeString(entry))
      .filter((entry): entry is string => entry !== null),
    scorecardFingerprint: normalizeString(row.scorecardFingerprint),
    handoffPacketFingerprint: normalizeString(row.handoffPacketFingerprint),
  };
}

function normalizeDependencyBlock(value: unknown, index: number): NormalizedDependencyBlock {
  const row = toRecord(value);
  const dependencyStatus = normalizeString(row.dependencyStatus ?? row.status)?.toLowerCase() ?? null;
  const blockerWeight = normalizeBlockerWeight(row.blockerWeight, dependencyStatus);
  const dependencyIssueLink = normalizeString(row.dependencyIssueLink ?? row.issueLink);

  return {
    issueIdentifier: normalizeIssueIdentifier(row.issueIdentifier) ?? `UNKNOWN-${index + 1}`,
    blockerWeight,
    dependencyStatus,
    reasonCodes: normalizeReasonCodes([
      ...toArray(row.reasonCodes),
      row.blockReason,
      row.unresolvedReason,
      row.message,
      dependencyStatus,
    ]),
    referenceLinks: [
      ...toArray(row.referenceLinks)
        .map((entry) => normalizeString(entry))
        .filter((entry): entry is string => entry !== null),
      ...(dependencyIssueLink ? [dependencyIssueLink] : []),
    ],
    scorecardFingerprint: normalizeString(row.scorecardFingerprint),
    handoffPacketFingerprint: normalizeString(row.handoffPacketFingerprint),
  };
}

function normalizeReadinessWeight(value: unknown, status: string | null): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (!status) {
    return 0;
  }
  if (['ready', 'qa_ready', 'resolved', 'complete', 'passed'].includes(status)) {
    return 2;
  }
  if (['warning', 'pending', 'in_progress', 'at_risk'].includes(status)) {
    return 1;
  }
  return 0;
}

function normalizeBlockerWeight(value: unknown, dependencyStatus: string | null): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (isDependencyBlocked(dependencyStatus)) {
    return 0;
  }
  if (!dependencyStatus || ['resolved', 'closed', 'complete', 'done', 'passed'].includes(dependencyStatus)) {
    return 2;
  }
  return 1;
}

function compareDependencyBlock(left: NormalizedDependencyBlock, right: NormalizedDependencyBlock): number {
  if (left.blockerWeight !== right.blockerWeight) {
    return left.blockerWeight - right.blockerWeight;
  }
  const issue = left.issueIdentifier.localeCompare(right.issueIdentifier);
  if (issue !== 0) {
    return issue;
  }
  return (left.dependencyStatus ?? '').localeCompare(right.dependencyStatus ?? '');
}

function compareEntry(left: AdjudicationEntry, right: AdjudicationEntry): number {
  if (left.lanePriorityWeight !== right.lanePriorityWeight) {
    return left.lanePriorityWeight - right.lanePriorityWeight;
  }
  if (left.readinessWeight !== right.readinessWeight) {
    return left.readinessWeight - right.readinessWeight;
  }
  if (left.blockerWeight !== right.blockerWeight) {
    return left.blockerWeight - right.blockerWeight;
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
    || compact.includes('artifact_gap')
    || compact.includes('evidence_gap')
  ) {
    return 'missing_evidence';
  }

  if (
    compact === 'dependency_blocked'
    || compact.includes('dependency_open')
    || compact.includes('dependency_pending')
    || compact.includes('dependency_unresolved')
    || compact.includes('blocked_dependency')
    || compact.includes('blocked')
  ) {
    return 'dependency_blocked';
  }

  if (
    compact === 'fingerprint_drift'
    || compact.includes('fingerprint_mismatch')
    || compact.includes('digest_mismatch')
    || compact.includes('checksum_mismatch')
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
    || compact.includes('noncanonical')
    || compact.includes('non_canonical')
  ) {
    return 'reference_noncanonical';
  }

  return null;
}

function computeConfidenceScore(entries: AdjudicationEntry[]): number {
  if (entries.length === 0) {
    return 0;
  }

  const reasonSet = new Set(entries.flatMap((entry) => entry.reasonCodes));
  let penalty = 0;
  if (reasonSet.has('missing_evidence')) {
    penalty += 0.4;
  }
  if (reasonSet.has('dependency_blocked')) {
    penalty += 0.3;
  }
  if (reasonSet.has('fingerprint_drift')) {
    penalty += 0.25;
  }
  if (reasonSet.has('ordering_regression')) {
    penalty += 0.05;
  }
  if (reasonSet.has('reference_noncanonical')) {
    penalty += 0.05;
  }

  const score = Math.max(0, 1 - penalty);
  return Number(score.toFixed(6));
}

function isDependencyBlocked(value: string | null): boolean {
  if (!value) {
    return false;
  }
  return ['blocked', 'open', 'pending', 'unresolved'].includes(value);
}

function uniqueCodes<T extends readonly string[]>(values: string[], canonicalOrder: T): T[number][] {
  const set = new Set(values);
  return canonicalOrder.filter((code) => set.has(code));
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
