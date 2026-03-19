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

type CanonicalReasonCode = (typeof CANONICAL_REASON_CODES)[number];
type BlockingReasonCode = (typeof BLOCKING_REASON_CODES)[number];

type NormalizedLaneStatus = {
  issueIdentifier: string;
  lanePriorityWeight: number;
  readinessWeight: number;
  dependencyStatus: string | null;
  reasonCodes: CanonicalReasonCode[];
  referenceLinks: string[];
  scorecardFingerprint: string | null;
  manifestFingerprint: string | null;
};

type NormalizedEvidenceRef = {
  issueIdentifier: string;
  evidenceType: string;
  evidencePath: string | null;
  reasonCodes: CanonicalReasonCode[];
  referenceLinks: string[];
  scorecardFingerprint: string | null;
  manifestFingerprint: string | null;
};

type HandoffEntry = {
  lanePriorityWeight: number;
  readinessWeight: number;
  blockerWeight: number;
  issueIdentifier: string;
  evidenceType: string;
  evidencePath: string;
  reasonCodes: CanonicalReasonCode[];
};

export type SettlementReleaseCandidateHandoffPacket = {
  contract: 'settlement-release-candidate-handoff-packet.v1';
  schemaVersion: 'settlement-release-candidate-handoff-packet.v1';
  candidateId: string;
  scorecardFingerprint: string;
  manifestFingerprint: string;
  orderingKeySpec: [
    'lanePriorityWeight',
    'readinessWeight',
    'blockerWeight',
    'issueIdentifier',
    'evidenceType',
    'evidencePath',
  ];
  entries: Array<{
    lanePriorityWeight: number;
    readinessWeight: number;
    blockerWeight: number;
    issueIdentifier: string;
    evidenceType: string;
    evidencePath: string;
    reasonCodes: CanonicalReasonCode[];
  }>;
  missingEvidence: Array<{
    issueIdentifier: string;
    evidenceType: string;
    evidencePath: string;
    reasonCode: 'missing_evidence';
  }>;
  dependencyBlocks: Array<{
    issueIdentifier: string;
    dependencyStatus: string;
    reasonCode: 'dependency_blocked';
  }>;
  canonicalLinkViolations: string[];
  validatorReasonCodes: CanonicalReasonCode[];
  readyForQa: boolean;
  nextOwner: 'qa' | 'pm' | 'backend';
  packetFingerprint: string;
};

export function buildSettlementReleaseCandidateHandoffPacket(input: {
  candidateId: string;
  scorecardFingerprint: string;
  manifestFingerprint: string;
  laneStatuses: unknown[];
  evidenceRefs: unknown[];
}): SettlementReleaseCandidateHandoffPacket {
  const candidateId = normalizeString(input.candidateId) ?? 'candidate-unknown';
  const scorecardFingerprint = normalizeString(input.scorecardFingerprint) ?? '';
  const manifestFingerprint = normalizeString(input.manifestFingerprint) ?? '';

  const laneStatuses = (Array.isArray(input.laneStatuses) ? input.laneStatuses : [])
    .map((value, index) => normalizeLaneStatus(value, index))
    .sort(compareLaneStatus);

  const laneByIssue = new Map(laneStatuses.map((lane) => [lane.issueIdentifier, lane]));

  const entries = (Array.isArray(input.evidenceRefs) ? input.evidenceRefs : [])
    .map((value, index) => normalizeEvidenceRef(value, index))
    .map((evidence) => {
      const lane = laneByIssue.get(evidence.issueIdentifier) ?? null;
      const reasonSet = new Set<CanonicalReasonCode>([
        ...evidence.reasonCodes,
        ...(lane?.reasonCodes ?? []),
      ]);

      const combinedLinks = [
        ...(lane?.referenceLinks ?? []),
        ...evidence.referenceLinks,
      ];

      if (!evidence.evidencePath) {
        reasonSet.add('missing_evidence');
      }

      if (lane?.dependencyStatus && ['blocked', 'open', 'pending', 'unresolved'].includes(lane.dependencyStatus)) {
        reasonSet.add('dependency_blocked');
      }

      if (
        (scorecardFingerprint && lane?.scorecardFingerprint && lane.scorecardFingerprint !== scorecardFingerprint)
        || (scorecardFingerprint && evidence.scorecardFingerprint && evidence.scorecardFingerprint !== scorecardFingerprint)
        || (manifestFingerprint && lane?.manifestFingerprint && lane.manifestFingerprint !== manifestFingerprint)
        || (manifestFingerprint && evidence.manifestFingerprint && evidence.manifestFingerprint !== manifestFingerprint)
      ) {
        reasonSet.add('fingerprint_drift');
      }

      if (combinedLinks.some((link) => !isCanonicalIssueReference(link))) {
        reasonSet.add('reference_noncanonical');
      }

      const reasonCodes = CANONICAL_REASON_CODES.filter((code) => reasonSet.has(code));
      const blockerWeight = reasonCodes.some((code) => BLOCKING_REASON_CODES.includes(code as BlockingReasonCode))
        ? 0
        : (reasonCodes.length > 0 ? 1 : 2);

      return {
        lanePriorityWeight: lane?.lanePriorityWeight ?? 999,
        readinessWeight: lane?.readinessWeight ?? 0,
        blockerWeight,
        issueIdentifier: evidence.issueIdentifier,
        evidenceType: evidence.evidenceType,
        evidencePath: evidence.evidencePath ?? `missing/${evidence.issueIdentifier}/${evidence.evidenceType}`,
        reasonCodes,
      };
    })
    .sort(compareEntry)
    .map((entry) => ({
      lanePriorityWeight: entry.lanePriorityWeight,
      readinessWeight: entry.readinessWeight,
      blockerWeight: entry.blockerWeight,
      issueIdentifier: entry.issueIdentifier,
      evidenceType: entry.evidenceType,
      evidencePath: entry.evidencePath,
      reasonCodes: entry.reasonCodes,
    }));

  const missingEvidence = entries
    .filter((entry) => entry.reasonCodes.includes('missing_evidence'))
    .map((entry) => ({
      issueIdentifier: entry.issueIdentifier,
      evidenceType: entry.evidenceType,
      evidencePath: entry.evidencePath,
      reasonCode: 'missing_evidence' as const,
    }));

  const dependencyBlocks = laneStatuses
    .filter((lane) => lane.dependencyStatus && ['blocked', 'open', 'pending', 'unresolved'].includes(lane.dependencyStatus))
    .map((lane) => ({
      issueIdentifier: lane.issueIdentifier,
      dependencyStatus: lane.dependencyStatus ?? 'blocked',
      reasonCode: 'dependency_blocked' as const,
    }))
    .sort((left, right) => {
      const issue = left.issueIdentifier.localeCompare(right.issueIdentifier);
      if (issue !== 0) {
        return issue;
      }
      return left.dependencyStatus.localeCompare(right.dependencyStatus);
    });

  const canonicalLinkViolations = uniqueSorted(
    [
      ...laneStatuses.flatMap((lane) => lane.referenceLinks),
      ...(Array.isArray(input.evidenceRefs) ? input.evidenceRefs : [])
        .map((value, index) => normalizeEvidenceRef(value, index))
        .flatMap((evidence) => evidence.referenceLinks),
    ].filter((link) => !isCanonicalIssueReference(link)),
  );

  const validatorReasonCodes = uniqueCodes(
    entries.flatMap((entry) => entry.reasonCodes),
    CANONICAL_REASON_CODES,
  );

  const readyForQa = entries.length > 0 && !entries.some((entry) => (
    entry.reasonCodes.includes('missing_evidence')
    || entry.reasonCodes.includes('dependency_blocked')
    || entry.reasonCodes.includes('fingerprint_drift')
  ));

  const nextOwner: 'qa' | 'pm' | 'backend' = readyForQa
    ? 'qa'
    : (entries.some((entry) => entry.reasonCodes.includes('dependency_blocked')) ? 'pm' : 'backend');

  const packetFingerprint = sha256Hex(stableSerialize({
    schemaVersion: 'settlement-release-candidate-handoff-packet.v1',
    candidateId,
    scorecardFingerprint,
    manifestFingerprint,
    entries,
    missingEvidence,
    dependencyBlocks,
    canonicalLinkViolations,
    readyForQa,
    nextOwner,
  }));

  return {
    contract: 'settlement-release-candidate-handoff-packet.v1',
    schemaVersion: 'settlement-release-candidate-handoff-packet.v1',
    candidateId,
    scorecardFingerprint,
    manifestFingerprint,
    orderingKeySpec: [
      'lanePriorityWeight',
      'readinessWeight',
      'blockerWeight',
      'issueIdentifier',
      'evidenceType',
      'evidencePath',
    ],
    entries,
    missingEvidence,
    dependencyBlocks,
    canonicalLinkViolations,
    validatorReasonCodes,
    readyForQa,
    nextOwner,
    packetFingerprint,
  };
}

function normalizeLaneStatus(value: unknown, index: number): NormalizedLaneStatus {
  const row = toRecord(value);
  const readinessStatus = normalizeString(row.readinessStatus ?? row.status)?.toLowerCase() ?? null;

  return {
    issueIdentifier: normalizeIssueIdentifier(row.issueIdentifier) ?? `UNKNOWN-${index + 1}`,
    lanePriorityWeight: normalizeNumber(row.lanePriorityWeight ?? row.priorityWeight, 999),
    readinessWeight: normalizeReadinessWeight(row.readinessWeight, readinessStatus),
    dependencyStatus: normalizeString(row.dependencyStatus)?.toLowerCase() ?? null,
    reasonCodes: normalizeReasonCodes([
      ...toArray(row.reasonCodes),
      ...toArray(row.gateReasonCodes),
      row.unresolvedReason,
      row.message,
      readinessStatus,
    ]),
    referenceLinks: toArray(row.referenceLinks)
      .map((item) => normalizeString(item))
      .filter((item): item is string => item !== null),
    scorecardFingerprint: normalizeString(row.scorecardFingerprint),
    manifestFingerprint: normalizeString(row.manifestFingerprint),
  };
}

function normalizeEvidenceRef(value: unknown, index: number): NormalizedEvidenceRef {
  const row = toRecord(value);
  return {
    issueIdentifier: normalizeIssueIdentifier(row.issueIdentifier) ?? `UNKNOWN-${index + 1}`,
    evidenceType: normalizeString(row.evidenceType ?? row.type) ?? 'evidence',
    evidencePath: normalizeString(row.evidencePath ?? row.path),
    reasonCodes: normalizeReasonCodes([
      ...toArray(row.reasonCodes),
      row.unresolvedReason,
      row.message,
    ]),
    referenceLinks: toArray(row.referenceLinks)
      .map((item) => normalizeString(item))
      .filter((item): item is string => item !== null),
    scorecardFingerprint: normalizeString(row.scorecardFingerprint),
    manifestFingerprint: normalizeString(row.manifestFingerprint),
  };
}

function normalizeReadinessWeight(value: unknown, readinessStatus: string | null): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (!readinessStatus) {
    return 0;
  }

  if (['ready', 'qa_ready', 'resolved', 'complete', 'passed'].includes(readinessStatus)) {
    return 2;
  }
  if (['warning', 'pending', 'in_progress', 'at_risk'].includes(readinessStatus)) {
    return 1;
  }
  return 0;
}

function compareLaneStatus(left: NormalizedLaneStatus, right: NormalizedLaneStatus): number {
  if (left.lanePriorityWeight !== right.lanePriorityWeight) {
    return left.lanePriorityWeight - right.lanePriorityWeight;
  }
  const issue = left.issueIdentifier.localeCompare(right.issueIdentifier);
  if (issue !== 0) {
    return issue;
  }
  return left.readinessWeight - right.readinessWeight;
}

function compareEntry(left: HandoffEntry, right: HandoffEntry): number {
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

function uniqueCodes<T extends readonly string[]>(values: string[], canonicalOrder: T): T[number][] {
  const set = new Set(values);
  return canonicalOrder.filter((value) => set.has(value));
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
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
