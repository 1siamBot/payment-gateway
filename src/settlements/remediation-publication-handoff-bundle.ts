import { createHash } from 'node:crypto';

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;
const SCHEMA_VERSION = 'settlement-remediation-publication-handoff-bundle.v1' as const;

const CANONICAL_REASON_CODES = [
  'missing_evidence',
  'dependency_blocked',
  'policy_violation',
  'ordering_regression',
  'reference_noncanonical',
] as const;

const CANONICAL_REASON_SET = new Set<string>(CANONICAL_REASON_CODES);

type CanonicalReasonCode = (typeof CANONICAL_REASON_CODES)[number];

type NormalizedHandoffStep = {
  readyForPublicationWeight: number;
  blockerWeight: number;
  dependencyDepthWeight: number;
  issueIdentifier: string;
  evidenceTypeWeight: number;
  evidenceType: string;
  evidencePath: string;
  reasonCodes: CanonicalReasonCode[];
  action:
  | 'publish_candidate'
  | 'backfill_evidence'
  | 'resolve_dependency'
  | 'policy_remediation'
  | 'fix_ordering'
  | 'canonicalize_reference';
  owner: 'backend' | 'pm' | 'qa';
};

type NormalizedBlockingDependency = {
  issueIdentifier: string;
  dependencyIssueIdentifier: string;
  dependencyStatus: string;
  reasonCode: 'dependency_blocked';
};

type NormalizedMissingEvidence = {
  issueIdentifier: string;
  evidenceType: string;
  evidencePath: string;
  reasonCode: 'missing_evidence';
};

export type SettlementRemediationPublicationHandoffBundle = {
  contract: typeof SCHEMA_VERSION;
  schemaVersion: typeof SCHEMA_VERSION;
  candidateId: string;
  envelopeFingerprint: string;
  policyVersion: string;
  readyForPublication: boolean;
  orderingKeySpec: [
    'readyForPublicationWeight',
    'blockerWeight',
    'dependencyDepthWeight',
    'issueIdentifier',
    'evidenceTypeWeight',
    'evidencePath',
  ];
  handoffState: 'ready_for_publication' | 'blocked';
  handoffSteps: Array<{
    stepId: string;
    readyForPublicationWeight: number;
    blockerWeight: number;
    dependencyDepthWeight: number;
    issueIdentifier: string;
    evidenceTypeWeight: number;
    evidenceType: string;
    evidencePath: string;
    reasonCodes: CanonicalReasonCode[];
    action:
    | 'publish_candidate'
    | 'backfill_evidence'
    | 'resolve_dependency'
    | 'policy_remediation'
    | 'fix_ordering'
    | 'canonicalize_reference';
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
  requiredApprovals: Array<{
    approvalKey: string;
    owner: 'backend' | 'pm' | 'qa' | 'security' | 'legal';
    status: 'pending' | 'approved' | 'waived';
  }>;
  nextOwner: 'backend' | 'pm' | 'qa';
  bundleFingerprint: string;
};

export function buildSettlementRemediationPublicationHandoffBundle(input: {
  candidateId: string;
  envelopeFingerprint: string;
  readyForPublication: boolean;
  publicationActions: unknown[];
  blockingDependencies: unknown[];
  missingEvidence: unknown[];
  requiredApprovals: unknown[];
  policyVersion: string;
}): SettlementRemediationPublicationHandoffBundle {
  const candidateId = normalizeString(input.candidateId) ?? 'candidate-unknown';
  const envelopeFingerprint = normalizeString(input.envelopeFingerprint) ?? 'envelope-fingerprint-unknown';
  const policyVersion = normalizeString(input.policyVersion) ?? 'policy-unknown';
  const readyForPublication = Boolean(input.readyForPublication);
  const readyForPublicationWeight = readyForPublication ? 0 : 1;

  const normalizedBlockingDependencies = (Array.isArray(input.blockingDependencies) ? input.blockingDependencies : [])
    .map((value, index) => normalizeBlockingDependency(value, index))
    .sort(compareBlockingDependencies);

  const normalizedMissingEvidenceFromInput = (Array.isArray(input.missingEvidence) ? input.missingEvidence : [])
    .map((value, index) => normalizeMissingEvidence(value, index))
    .sort(compareMissingEvidence);

  const blockedIssueSet = new Set(normalizedBlockingDependencies.map((row) => row.issueIdentifier));

  const handoffSteps = (Array.isArray(input.publicationActions) ? input.publicationActions : [])
    .map((value, index) => normalizeHandoffStep(value, index, readyForPublicationWeight, blockedIssueSet))
    .sort(compareHandoffSteps);

  const normalizedMissingEvidenceFromSteps = handoffSteps
    .filter((row) => row.reasonCodes.includes('missing_evidence'))
    .map((row) => ({
      issueIdentifier: row.issueIdentifier,
      evidenceType: row.evidenceType,
      evidencePath: row.evidencePath,
      reasonCode: 'missing_evidence' as const,
    }));

  const missingEvidence = uniqueBy(
    normalizedMissingEvidenceFromInput.concat(normalizedMissingEvidenceFromSteps),
    (row) => `${row.issueIdentifier}::${row.evidenceType}::${row.evidencePath}`,
  ).sort(compareMissingEvidence);

  const requiredApprovals = normalizeRequiredApprovals(input.requiredApprovals)
    .sort((left, right) => compareStrings(left.approvalKey, right.approvalKey));

  const hasStepReasons = handoffSteps.some((row) => row.reasonCodes.length > 0);
  const isReadyBundle = readyForPublication
    && normalizedBlockingDependencies.length === 0
    && missingEvidence.length === 0
    && !hasStepReasons;

  const handoffState: 'ready_for_publication' | 'blocked' = isReadyBundle ? 'ready_for_publication' : 'blocked';
  const firstPendingApproval = requiredApprovals.find((row) => row.status === 'pending');
  const nextOwner: 'backend' | 'pm' | 'qa' = isReadyBundle
    ? mapApprovalOwner(firstPendingApproval?.owner)
    : (handoffSteps[0]?.owner ?? (normalizedBlockingDependencies.length > 0 ? 'pm' : 'backend'));

  const enrichedSteps = handoffSteps.map((row, index) => ({
    stepId: `step-${String(index + 1).padStart(3, '0')}`,
    readyForPublicationWeight: row.readyForPublicationWeight,
    blockerWeight: row.blockerWeight,
    dependencyDepthWeight: row.dependencyDepthWeight,
    issueIdentifier: row.issueIdentifier,
    evidenceTypeWeight: row.evidenceTypeWeight,
    evidenceType: row.evidenceType,
    evidencePath: row.evidencePath,
    reasonCodes: row.reasonCodes,
    action: row.action,
    owner: row.owner,
  }));

  const bundleFingerprint = sha256Hex(stableSerialize({
    schemaVersion: SCHEMA_VERSION,
    candidateId,
    envelopeFingerprint,
    policyVersion,
    readyForPublication,
    handoffState,
    handoffSteps: enrichedSteps,
    blockingDependencies: normalizedBlockingDependencies,
    missingEvidence,
    requiredApprovals,
    nextOwner,
  }));

  return {
    contract: SCHEMA_VERSION,
    schemaVersion: SCHEMA_VERSION,
    candidateId,
    envelopeFingerprint,
    policyVersion,
    readyForPublication,
    orderingKeySpec: [
      'readyForPublicationWeight',
      'blockerWeight',
      'dependencyDepthWeight',
      'issueIdentifier',
      'evidenceTypeWeight',
      'evidencePath',
    ],
    handoffState,
    handoffSteps: enrichedSteps,
    blockingDependencies: normalizedBlockingDependencies,
    missingEvidence,
    requiredApprovals,
    nextOwner,
    bundleFingerprint,
  };
}

function normalizeHandoffStep(
  value: unknown,
  index: number,
  readyForPublicationWeight: number,
  blockedIssueSet: Set<string>,
): NormalizedHandoffStep {
  const record = toRecord(value);
  const issueIdentifier = normalizeIssueIdentifier(record.issueIdentifier) ?? `UNKNOWN-${String(index + 1).padStart(3, '0')}`;
  const evidenceType = normalizeString(record.evidenceType ?? record.remediationType ?? record.type) ?? 'evidence';
  const evidenceTypeWeight = normalizeWeight(record.evidenceTypeWeight, evidenceTypeToWeight(evidenceType));

  const reasonSet = new Set<CanonicalReasonCode>();
  normalizeReasonCodes(record.reasonCodes).forEach((code) => reasonSet.add(code));

  const evidencePathRaw = normalizeString(record.evidencePath);
  const evidencePath = evidencePathRaw ?? `missing/${issueIdentifier}/evidence`;
  if (!evidencePathRaw) {
    reasonSet.add('missing_evidence');
  }

  if (blockedIssueSet.has(issueIdentifier)) {
    reasonSet.add('dependency_blocked');
  }

  normalizeStringArray(record.referenceLinks).forEach((link) => {
    if (!isCanonicalIssueLink(link)) {
      reasonSet.add('reference_noncanonical');
    }
  });

  if (normalizeWeight(record.blockerWeight, 0) > 0) {
    reasonSet.add('dependency_blocked');
  }

  const reasonCodes = CANONICAL_REASON_CODES.filter((code) => reasonSet.has(code));
  return {
    readyForPublicationWeight,
    blockerWeight: normalizeWeight(
      record.blockerWeight,
      reasonCodes.includes('dependency_blocked') ? 1 : 0,
    ),
    dependencyDepthWeight: normalizeWeight(record.dependencyDepthWeight, 999),
    issueIdentifier,
    evidenceTypeWeight,
    evidenceType,
    evidencePath,
    reasonCodes,
    action: normalizeAction(record.action, reasonCodes),
    owner: normalizeOwner(record.owner, reasonCodes),
  };
}

function normalizeAction(
  value: unknown,
  reasonCodes: CanonicalReasonCode[],
):
  | 'publish_candidate'
  | 'backfill_evidence'
  | 'resolve_dependency'
  | 'policy_remediation'
  | 'fix_ordering'
  | 'canonicalize_reference' {
  const normalized = normalizeString(value);
  if (
    normalized === 'publish_candidate'
    || normalized === 'backfill_evidence'
    || normalized === 'resolve_dependency'
    || normalized === 'policy_remediation'
    || normalized === 'fix_ordering'
    || normalized === 'canonicalize_reference'
  ) {
    return normalized;
  }

  if (reasonCodes.includes('missing_evidence')) {
    return 'backfill_evidence';
  }
  if (reasonCodes.includes('dependency_blocked')) {
    return 'resolve_dependency';
  }
  if (reasonCodes.includes('policy_violation')) {
    return 'policy_remediation';
  }
  if (reasonCodes.includes('ordering_regression')) {
    return 'fix_ordering';
  }
  if (reasonCodes.includes('reference_noncanonical')) {
    return 'canonicalize_reference';
  }
  return 'publish_candidate';
}

function normalizeOwner(value: unknown, reasonCodes: CanonicalReasonCode[]): 'backend' | 'pm' | 'qa' {
  const normalized = normalizeString(value);
  if (normalized === 'backend' || normalized === 'pm' || normalized === 'qa') {
    return normalized;
  }
  if (reasonCodes.includes('dependency_blocked')) {
    return 'pm';
  }
  if (
    reasonCodes.includes('policy_violation')
    || reasonCodes.includes('ordering_regression')
    || reasonCodes.includes('reference_noncanonical')
  ) {
    return 'backend';
  }
  if (reasonCodes.includes('missing_evidence')) {
    return 'qa';
  }
  return 'pm';
}

function normalizeBlockingDependency(value: unknown, index: number): NormalizedBlockingDependency {
  const record = toRecord(value);
  const issueIdentifier = normalizeIssueIdentifier(record.issueIdentifier) ?? `UNKNOWN-${String(index + 1).padStart(3, '0')}`;
  const dependencyIssueIdentifier = normalizeIssueIdentifier(
    record.dependencyIssueIdentifier ?? record.dependsOnIssueIdentifier,
  ) ?? `UNKNOWN-${String(index + 1).padStart(3, '0')}`;

  return {
    issueIdentifier,
    dependencyIssueIdentifier,
    dependencyStatus: normalizeString(record.dependencyStatus ?? record.status) ?? 'blocked',
    reasonCode: 'dependency_blocked',
  };
}

function normalizeMissingEvidence(value: unknown, index: number): NormalizedMissingEvidence {
  const record = toRecord(value);
  const issueIdentifier = normalizeIssueIdentifier(record.issueIdentifier) ?? `UNKNOWN-${String(index + 1).padStart(3, '0')}`;
  const evidenceType = normalizeString(record.evidenceType ?? record.artifactType ?? record.type) ?? 'evidence';
  const evidencePath = normalizeString(record.evidencePath) ?? `missing/${issueIdentifier}/evidence`;

  return {
    issueIdentifier,
    evidenceType,
    evidencePath,
    reasonCode: 'missing_evidence',
  };
}

function normalizeRequiredApprovals(input: unknown): Array<{
  approvalKey: string;
  owner: 'backend' | 'pm' | 'qa' | 'security' | 'legal';
  status: 'pending' | 'approved' | 'waived';
}> {
  const candidates = Array.isArray(input)
    ? input
    : (Array.isArray(toRecord(input).requiredApprovals) ? toRecord(input).requiredApprovals as unknown[] : []);

  return uniqueBy(
    candidates.map((value, index) => {
      const entry = toRecord(value);
      const approvalKey = normalizeString(entry.approvalKey ?? entry.key ?? entry.name)
        ?? `approval-${String(index + 1).padStart(3, '0')}`;
      const owner = normalizeApprovalOwner(entry.owner);
      const status = normalizeApprovalStatus(entry.status);
      return {
        approvalKey,
        owner,
        status,
      };
    }),
    (row) => row.approvalKey,
  );
}

function normalizeApprovalOwner(value: unknown): 'backend' | 'pm' | 'qa' | 'security' | 'legal' {
  const normalized = normalizeString(value);
  if (
    normalized === 'backend'
    || normalized === 'pm'
    || normalized === 'qa'
    || normalized === 'security'
    || normalized === 'legal'
  ) {
    return normalized;
  }
  return 'pm';
}

function normalizeApprovalStatus(value: unknown): 'pending' | 'approved' | 'waived' {
  const normalized = normalizeString(value);
  if (normalized === 'approved' || normalized === 'waived') {
    return normalized;
  }
  return 'pending';
}

function mapApprovalOwner(owner: 'backend' | 'pm' | 'qa' | 'security' | 'legal' | undefined): 'backend' | 'pm' | 'qa' {
  if (owner === 'backend' || owner === 'qa') {
    return owner;
  }
  return 'pm';
}

function normalizeReasonCodes(value: unknown): CanonicalReasonCode[] {
  const values = normalizeStringArray(value);
  const normalized = new Set<CanonicalReasonCode>();

  values.forEach((reason) => {
    const reasonLower = reason.toLowerCase().replace(/\s+/g, '_');
    if (CANONICAL_REASON_SET.has(reasonLower)) {
      normalized.add(reasonLower as CanonicalReasonCode);
      return;
    }

    if (reasonLower.includes('missing') || reasonLower.includes('artifact') || reasonLower.includes('evidence')) {
      normalized.add('missing_evidence');
    }
    if (reasonLower.includes('dependency') || reasonLower.includes('blocked') || reasonLower.includes('blocker')) {
      normalized.add('dependency_blocked');
    }
    if (reasonLower.includes('policy') || reasonLower.includes('compliance')) {
      normalized.add('policy_violation');
    }
    if (reasonLower.includes('ordering') || reasonLower.includes('order') || reasonLower.includes('drift')) {
      normalized.add('ordering_regression');
    }
    if (reasonLower.includes('reference') || reasonLower.includes('ref') || reasonLower.includes('link')) {
      normalized.add('reference_noncanonical');
    }
  });

  return CANONICAL_REASON_CODES.filter((code) => normalized.has(code));
}

function isCanonicalIssueLink(value: string): boolean {
  return /^\/[A-Z0-9]+\/issues\/[A-Z0-9]+-\d+/i.test(value);
}

function evidenceTypeToWeight(value: string): number {
  switch (value) {
    case 'manifest':
      return 1;
    case 'contract':
      return 2;
    case 'digest':
      return 3;
    case 'log':
      return 4;
    default:
      return 9;
  }
}

function normalizeIssueIdentifier(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const match = normalized.match(ISSUE_IDENTIFIER_PATTERN);
  if (!match) {
    return normalized.toUpperCase();
  }

  return `${match[1].toUpperCase()}-${Number.parseInt(match[2], 10)}`;
}

function compareHandoffSteps(left: NormalizedHandoffStep, right: NormalizedHandoffStep): number {
  return left.readyForPublicationWeight - right.readyForPublicationWeight
    || left.blockerWeight - right.blockerWeight
    || left.dependencyDepthWeight - right.dependencyDepthWeight
    || compareStrings(left.issueIdentifier, right.issueIdentifier)
    || left.evidenceTypeWeight - right.evidenceTypeWeight
    || compareStrings(left.evidencePath, right.evidencePath);
}

function compareBlockingDependencies(left: NormalizedBlockingDependency, right: NormalizedBlockingDependency): number {
  return compareStrings(left.issueIdentifier, right.issueIdentifier)
    || compareStrings(left.dependencyIssueIdentifier, right.dependencyIssueIdentifier)
    || compareStrings(left.dependencyStatus, right.dependencyStatus);
}

function compareMissingEvidence(left: NormalizedMissingEvidence, right: NormalizedMissingEvidence): number {
  return compareStrings(left.issueIdentifier, right.issueIdentifier)
    || compareStrings(left.evidenceType, right.evidenceType)
    || compareStrings(left.evidencePath, right.evidencePath);
}

function normalizeWeight(value: unknown, defaultValue: number): number {
  const numeric = normalizeNumber(value);
  if (numeric === null || !Number.isFinite(numeric)) {
    return defaultValue;
  }
  return Math.max(0, Math.floor(numeric));
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeString(entry))
    .filter((entry): entry is string => entry !== null);
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized;
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right, 'en', { sensitivity: 'base' });
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function uniqueBy<T>(values: T[], key: (value: T) => string): T[] {
  const seen = new Set<string>();
  const output: T[] = [];

  values.forEach((value) => {
    const identity = key(value);
    if (!seen.has(identity)) {
      seen.add(identity);
      output.push(value);
    }
  });

  return output;
}

function stableSerialize(value: unknown): string {
  return JSON.stringify(sortObjectRecursively(value));
}

function sortObjectRecursively(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectRecursively);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right, 'en'))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortObjectRecursively((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
