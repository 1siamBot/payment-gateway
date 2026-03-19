import { createHash } from 'node:crypto';

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;
const SCHEMA_VERSION = 'settlement-adjudication-routing-manifest.v1' as const;

const CANONICAL_REASON_CODES = [
  'missing_evidence',
  'dependency_blocked',
  'fingerprint_drift',
  'ordering_regression',
  'reference_noncanonical',
] as const;

type CanonicalReasonCode = (typeof CANONICAL_REASON_CODES)[number];
type LaneOwner = 'qa' | 'pm' | 'backend';
type LaneStatus = 'qa_ready' | 'needs_review' | 'blocked';

type NormalizedLane = {
  issueIdentifier: string;
  readyForQaWeight: number;
  blockerSeverityWeight: number;
  dependencyDepthWeight: number;
  evidenceType: string;
  evidencePath: string | null;
  reasonCodes: CanonicalReasonCode[];
  referenceLinks: string[];
};

type NormalizedMissingEvidence = {
  issueIdentifier: string;
  evidenceType: string;
  evidencePath: string | null;
  reasonCode: CanonicalReasonCode | null;
};

type RoutingLane = {
  readyForQaWeight: number;
  blockerSeverityWeight: number;
  dependencyDepthWeight: number;
  issueIdentifier: string;
  evidenceType: string;
  evidencePath: string;
  reasonCodes: CanonicalReasonCode[];
  laneStatus: LaneStatus;
  owner: LaneOwner;
};

export type SettlementAdjudicationRoutingManifest = {
  contract: typeof SCHEMA_VERSION;
  schemaVersion: typeof SCHEMA_VERSION;
  snapshotFingerprint: string;
  candidateId: string;
  orderingKeySpec: [
    'readyForQaWeight',
    'blockerSeverityWeight',
    'dependencyDepthWeight',
    'issueIdentifier',
    'evidenceType',
    'evidencePath',
  ];
  dispatchLanes: RoutingLane[];
  qaReadyLanes: RoutingLane[];
  blockedLanes: RoutingLane[];
  ownerRouting: {
    qa: string[];
    pm: string[];
    backend: string[];
  };
  escalationTargets: Array<{
    owner: 'pm' | 'backend';
    issueIdentifiers: string[];
    reasonCodes: CanonicalReasonCode[];
  }>;
  confidenceScore: number;
  validatorReasonCodes: CanonicalReasonCode[];
  manifestFingerprint: string;
};

export function buildSettlementAdjudicationRoutingManifest(input: {
  snapshotFingerprint: string;
  candidateId: string;
  laneEvidence: unknown[];
  blockingReasons: unknown[];
  missingEvidence: unknown[];
}): SettlementAdjudicationRoutingManifest {
  const snapshotFingerprint = normalizeString(input.snapshotFingerprint) ?? '';
  const candidateId = normalizeString(input.candidateId) ?? 'candidate-unknown';
  const blockingReasonCodes = normalizeReasonCodes(input.blockingReasons);

  const missingEvidence = (Array.isArray(input.missingEvidence) ? input.missingEvidence : [])
    .map((value, index) => normalizeMissingEvidence(value, index))
    .sort(compareMissingEvidence);

  const missingByKey = new Set<string>();
  missingEvidence.forEach((entry) => {
    missingByKey.add(toMissingKey(entry.issueIdentifier, entry.evidenceType, entry.evidencePath));
    if (entry.evidencePath === null) {
      missingByKey.add(toMissingKey(entry.issueIdentifier, entry.evidenceType, null));
    }
  });

  const lanes = (Array.isArray(input.laneEvidence) ? input.laneEvidence : [])
    .map((value, index) => normalizeLane(value, index))
    .map((lane) => {
      const reasonSet = new Set<CanonicalReasonCode>([
        ...blockingReasonCodes,
        ...lane.reasonCodes,
      ]);

      const missingKey = toMissingKey(lane.issueIdentifier, lane.evidenceType, lane.evidencePath);
      const missingWildcardKey = toMissingKey(lane.issueIdentifier, lane.evidenceType, null);
      if (!lane.evidencePath || missingByKey.has(missingKey) || missingByKey.has(missingWildcardKey)) {
        reasonSet.add('missing_evidence');
      }

      if (lane.referenceLinks.some((link) => !isCanonicalIssueReference(link))) {
        reasonSet.add('reference_noncanonical');
      }

      const reasonCodes = CANONICAL_REASON_CODES.filter((code) => reasonSet.has(code));
      const isBlocked = reasonCodes.some((code) => (
        code === 'missing_evidence' || code === 'dependency_blocked' || code === 'fingerprint_drift'
      ));
      const owner: LaneOwner = isBlocked
        ? (reasonCodes.includes('dependency_blocked') ? 'pm' : 'backend')
        : (reasonCodes.length > 0 ? 'backend' : 'qa');
      const laneStatus: LaneStatus = isBlocked
        ? 'blocked'
        : (owner === 'qa' ? 'qa_ready' : 'needs_review');

      return {
        readyForQaWeight: lane.readyForQaWeight,
        blockerSeverityWeight: resolveBlockerSeverityWeight(lane.blockerSeverityWeight, reasonCodes),
        dependencyDepthWeight: lane.dependencyDepthWeight,
        issueIdentifier: lane.issueIdentifier,
        evidenceType: lane.evidenceType,
        evidencePath: lane.evidencePath ?? `missing/${lane.issueIdentifier}/${lane.evidenceType}`,
        reasonCodes,
        laneStatus,
        owner,
      };
    })
    .sort(compareRoutingLane);

  const qaReadyLanes = lanes.filter((lane) => lane.laneStatus === 'qa_ready');
  const blockedLanes = lanes.filter((lane) => lane.laneStatus === 'blocked');

  const ownerRouting = {
    qa: collectIssueIdentifiers(lanes.filter((lane) => lane.owner === 'qa')),
    pm: collectIssueIdentifiers(lanes.filter((lane) => lane.owner === 'pm')),
    backend: collectIssueIdentifiers(lanes.filter((lane) => lane.owner === 'backend')),
  };

  const escalationTargets = buildEscalationTargets(lanes);
  const confidenceScore = computeConfidenceScore(lanes);

  const validatorReasonSet = new Set<CanonicalReasonCode>(blockingReasonCodes);
  lanes.forEach((lane) => {
    lane.reasonCodes.forEach((code) => validatorReasonSet.add(code));
  });

  const manifestFingerprint = sha256Hex(stableSerialize({
    schemaVersion: SCHEMA_VERSION,
    snapshotFingerprint,
    candidateId,
    dispatchLanes: lanes,
    ownerRouting,
    escalationTargets,
    confidenceScore,
  }));

  return {
    contract: SCHEMA_VERSION,
    schemaVersion: SCHEMA_VERSION,
    snapshotFingerprint,
    candidateId,
    orderingKeySpec: [
      'readyForQaWeight',
      'blockerSeverityWeight',
      'dependencyDepthWeight',
      'issueIdentifier',
      'evidenceType',
      'evidencePath',
    ],
    dispatchLanes: lanes,
    qaReadyLanes,
    blockedLanes,
    ownerRouting,
    escalationTargets,
    confidenceScore,
    validatorReasonCodes: CANONICAL_REASON_CODES.filter((code) => validatorReasonSet.has(code)),
    manifestFingerprint,
  };
}

function normalizeLane(value: unknown, index: number): NormalizedLane {
  const row = toRecord(value);
  const readinessStatus = normalizeString(row.readinessStatus ?? row.status)?.toLowerCase() ?? null;

  return {
    issueIdentifier: normalizeIssueIdentifier(row.issueIdentifier) ?? `UNKNOWN-${index + 1}`,
    readyForQaWeight: normalizeReadyForQaWeight(row.readyForQaWeight, readinessStatus),
    blockerSeverityWeight: normalizeNumber(row.blockerSeverityWeight ?? row.blockerWeight, 2),
    dependencyDepthWeight: normalizeNumber(row.dependencyDepthWeight ?? row.dependencyDepth, 999),
    evidenceType: normalizeString(row.evidenceType ?? row.type) ?? 'evidence',
    evidencePath: normalizeString(row.evidencePath ?? row.path),
    reasonCodes: normalizeReasonCodes([
      ...toArray(row.reasonCodes),
      ...toArray(row.blockingReasons),
      ...toArray(row.validatorReasonCodes),
      row.message,
      row.blocker,
      readinessStatus,
    ]),
    referenceLinks: [
      ...toArray(row.referenceLinks),
      row.issueLink,
      row.dependencyIssueLink,
    ]
      .map((entry) => normalizeString(entry))
      .filter((entry): entry is string => entry !== null),
  };
}

function normalizeMissingEvidence(value: unknown, index: number): NormalizedMissingEvidence {
  const row = toRecord(value);
  const issueIdentifier = normalizeIssueIdentifier(row.issueIdentifier) ?? `UNKNOWN-${index + 1}`;
  const evidenceType = normalizeString(row.evidenceType ?? row.type) ?? 'evidence';
  const evidencePath = normalizeString(row.evidencePath ?? row.path);
  const reasonCode = normalizeReasonCode(row.reasonCode ?? row.reason ?? row.code);

  return {
    issueIdentifier,
    evidenceType,
    evidencePath,
    reasonCode,
  };
}

function normalizeReadyForQaWeight(value: unknown, status: string | null): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (status === 'ready_for_qa' || status === 'ready' || status === 'resolved') {
    return 2;
  }

  if (status === 'needs_review' || status === 'review') {
    return 1;
  }

  if (status === 'blocked' || status === 'open' || status === 'pending') {
    return 0;
  }

  return 1;
}

function resolveBlockerSeverityWeight(value: number, reasonCodes: CanonicalReasonCode[]): number {
  if (reasonCodes.some((code) => (
    code === 'missing_evidence' || code === 'dependency_blocked' || code === 'fingerprint_drift'
  ))) {
    return 0;
  }

  if (reasonCodes.length > 0) {
    return Math.min(value, 1);
  }

  return Math.max(value, 2);
}

function normalizeReasonCodes(values: unknown[]): CanonicalReasonCode[] {
  const reasonSet = new Set<CanonicalReasonCode>();
  values.forEach((value) => {
    const normalized = normalizeReasonCode(value);
    if (normalized) {
      reasonSet.add(normalized);
    }
  });
  return CANONICAL_REASON_CODES.filter((code) => reasonSet.has(code));
}

function normalizeReasonCode(value: unknown): CanonicalReasonCode | null {
  const raw = normalizeString(value)?.toLowerCase();
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  if (normalized === 'missing_evidence' || normalized === 'missing_artifact' || normalized === 'evidence_gap') {
    return 'missing_evidence';
  }

  if (
    normalized === 'dependency_blocked'
    || normalized === 'dependency_violation'
    || normalized === 'dependency_open'
    || normalized === 'dependency_pending'
    || normalized === 'dependency_unresolved'
  ) {
    return 'dependency_blocked';
  }

  if (
    normalized === 'fingerprint_drift'
    || normalized === 'fingerprint_mismatch'
    || normalized === 'checksum_mismatch'
    || normalized === 'hash_mismatch'
  ) {
    return 'fingerprint_drift';
  }

  if (normalized === 'ordering_regression' || normalized === 'ordering_drift') {
    return 'ordering_regression';
  }

  if (
    normalized === 'reference_noncanonical'
    || normalized === 'reference_non_canonical'
    || normalized === 'unprefixed_reference'
  ) {
    return 'reference_noncanonical';
  }

  if (normalized.includes('missing') && normalized.includes('evidence')) {
    return 'missing_evidence';
  }

  if (normalized.includes('dependency') && (normalized.includes('blocked') || normalized.includes('open') || normalized.includes('violation') || normalized.includes('pending') || normalized.includes('unresolved'))) {
    return 'dependency_blocked';
  }

  if ((normalized.includes('fingerprint') || normalized.includes('checksum') || normalized.includes('hash')) && (normalized.includes('drift') || normalized.includes('mismatch') || normalized.includes('regression'))) {
    return 'fingerprint_drift';
  }

  if (normalized.includes('ordering') || normalized.includes('sort')) {
    return 'ordering_regression';
  }

  if (normalized.includes('noncanonical') || normalized.includes('non_canonical') || normalized.includes('reference')) {
    return 'reference_noncanonical';
  }

  return null;
}

function buildEscalationTargets(lanes: RoutingLane[]): Array<{
  owner: 'pm' | 'backend';
  issueIdentifiers: string[];
  reasonCodes: CanonicalReasonCode[];
}> {
  const byOwner = new Map<'pm' | 'backend', { issues: Set<string>; reasons: Set<CanonicalReasonCode> }>();

  lanes
    .filter((lane) => lane.owner === 'pm' || lane.owner === 'backend')
    .forEach((lane) => {
      const owner = lane.owner as 'pm' | 'backend';
      const current = byOwner.get(owner) ?? { issues: new Set<string>(), reasons: new Set<CanonicalReasonCode>() };
      current.issues.add(lane.issueIdentifier);
      lane.reasonCodes.forEach((code) => current.reasons.add(code));
      byOwner.set(owner, current);
    });

  return [...byOwner.entries()]
    .map(([owner, values]) => ({
      owner,
      issueIdentifiers: [...values.issues].sort(compareIssueIdentifier),
      reasonCodes: CANONICAL_REASON_CODES.filter((code) => values.reasons.has(code)),
    }))
    .sort((left, right) => left.owner.localeCompare(right.owner));
}

function computeConfidenceScore(lanes: RoutingLane[]): number {
  if (lanes.length === 0) {
    return 0;
  }

  const blockedCount = lanes.filter((lane) => lane.laneStatus === 'blocked').length;
  const reviewCount = lanes.filter((lane) => lane.laneStatus === 'needs_review').length;

  const score = 1 - (blockedCount / lanes.length) - ((reviewCount / lanes.length) * 0.35);
  return Number(Math.max(0, score).toFixed(6));
}

function collectIssueIdentifiers(lanes: RoutingLane[]): string[] {
  const set = new Set<string>();
  lanes.forEach((lane) => set.add(lane.issueIdentifier));
  return [...set].sort(compareIssueIdentifier);
}

function compareRoutingLane(left: RoutingLane, right: RoutingLane): number {
  const readyWeight = left.readyForQaWeight - right.readyForQaWeight;
  if (readyWeight !== 0) {
    return readyWeight;
  }

  const blockerWeight = left.blockerSeverityWeight - right.blockerSeverityWeight;
  if (blockerWeight !== 0) {
    return blockerWeight;
  }

  const dependencyWeight = left.dependencyDepthWeight - right.dependencyDepthWeight;
  if (dependencyWeight !== 0) {
    return dependencyWeight;
  }

  const issue = compareIssueIdentifier(left.issueIdentifier, right.issueIdentifier);
  if (issue !== 0) {
    return issue;
  }

  const evidenceType = left.evidenceType.localeCompare(right.evidenceType);
  if (evidenceType !== 0) {
    return evidenceType;
  }

  const evidencePath = left.evidencePath.localeCompare(right.evidencePath);
  if (evidencePath !== 0) {
    return evidencePath;
  }

  const reasons = stableSerialize(left.reasonCodes).localeCompare(stableSerialize(right.reasonCodes));
  if (reasons !== 0) {
    return reasons;
  }

  return left.owner.localeCompare(right.owner);
}

function compareMissingEvidence(left: NormalizedMissingEvidence, right: NormalizedMissingEvidence): number {
  const issue = compareIssueIdentifier(left.issueIdentifier, right.issueIdentifier);
  if (issue !== 0) {
    return issue;
  }

  const evidenceType = left.evidenceType.localeCompare(right.evidenceType);
  if (evidenceType !== 0) {
    return evidenceType;
  }

  return (left.evidencePath ?? '').localeCompare(right.evidencePath ?? '');
}

function compareIssueIdentifier(left: string, right: string): number {
  const leftMatch = ISSUE_IDENTIFIER_PATTERN.exec(left);
  const rightMatch = ISSUE_IDENTIFIER_PATTERN.exec(right);

  if (leftMatch && rightMatch) {
    const prefixCompare = leftMatch[1].localeCompare(rightMatch[1]);
    if (prefixCompare !== 0) {
      return prefixCompare;
    }

    return Number(leftMatch[2]) - Number(rightMatch[2]);
  }

  return left.localeCompare(right);
}

function isCanonicalIssueReference(reference: string): boolean {
  return /^\/[A-Z0-9]+\/issues\/[A-Z0-9-]+(?:#(?:comment|document)-[A-Za-z0-9-]+)?$/i.test(reference);
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

  return `${match[1].toUpperCase()}-${Number(match[2])}`;
}

function toMissingKey(issueIdentifier: string, evidenceType: string, evidencePath: string | null): string {
  return `${issueIdentifier}::${evidenceType.toLowerCase()}::${(evidencePath ?? '*').toLowerCase()}`;
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

  if (typeof value === 'string' && value.trim().length > 0) {
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
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
