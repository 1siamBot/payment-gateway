import { createHash } from 'node:crypto';

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;
const CANONICAL_REASON_CODES = [
  'missing_artifact',
  'dependency_violation',
  'fingerprint_mismatch',
  'ordering_regression',
  'reference_noncanonical',
] as const;

type CanonicalReasonCode = (typeof CANONICAL_REASON_CODES)[number];

type NormalizedLane = {
  laneId: string;
  issueIdentifier: string;
  lanePriorityWeight: number;
  dependencyDepthWeight: number;
  dependencyIssueIdentifier: string | null;
  dependencyIssueLink: string | null;
  dependencyStatus: string | null;
  reasonCodes: CanonicalReasonCode[];
};

type NormalizedArtifact = {
  laneId: string | null;
  issueIdentifier: string;
  artifactType: string;
  artifactPath: string | null;
  bundleDigest: string | null;
  contractDigest: string | null;
  reasonCodes: CanonicalReasonCode[];
  referenceLinks: string[];
};

type PublicationEvidenceManifestEntry = {
  lanePriorityWeight: number;
  dependencyDepthWeight: number;
  issueIdentifier: string;
  artifactType: string;
  artifactPath: string;
  laneId: string | null;
  reasonCodes: CanonicalReasonCode[];
};

type MissingEvidenceEntry = PublicationEvidenceManifestEntry & {
  reasonCodes: CanonicalReasonCode[];
};

type DependencyViolationEntry = {
  lanePriorityWeight: number;
  dependencyDepthWeight: number;
  issueIdentifier: string;
  dependencyIssueIdentifier: string | null;
  dependencyIssueLink: string | null;
  reasonCodes: CanonicalReasonCode[];
};

export type SettlementPublicationEvidenceManifest = {
  contract: 'settlement-publication-evidence-manifest.v1';
  schemaVersion: 'settlement-publication-evidence-manifest.v1';
  generatedAtIso: string;
  bundleDigest: string;
  contractDigest: string;
  orderingKeySpec: [
    'lanePriorityWeight',
    'dependencyDepthWeight',
    'issueIdentifier',
    'artifactType',
    'artifactPath',
  ];
  entries: PublicationEvidenceManifestEntry[];
  missingEvidence: MissingEvidenceEntry[];
  dependencyViolations: DependencyViolationEntry[];
  validatorReasonCodes: CanonicalReasonCode[];
  requiredEvidenceCoverage: number;
  isReleaseGateReady: boolean;
  manifestFingerprint: string;
};

export function buildSettlementPublicationEvidenceManifest(input: {
  bundleDigest: string;
  contractDigest: string;
  laneRefs: unknown[];
  artifactRefs: unknown[];
  asOfIso?: string;
}): SettlementPublicationEvidenceManifest {
  const bundleDigest = normalizeString(input.bundleDigest) ?? '';
  const contractDigest = normalizeString(input.contractDigest) ?? '';
  const lanes = (Array.isArray(input.laneRefs) ? input.laneRefs : [])
    .map((value, index) => normalizeLane(value, index))
    .sort(compareLane);
  const artifacts = (Array.isArray(input.artifactRefs) ? input.artifactRefs : [])
    .map((value, index) => normalizeArtifact(value, index))
    .sort(compareArtifact);

  const laneById = new Map(lanes.map((lane) => [lane.laneId, lane]));
  const laneByIssue = new Map(lanes.map((lane) => [lane.issueIdentifier, lane]));

  const entries = artifacts
    .map((artifact, index) => {
      const lane = resolveLane(artifact, laneById, laneByIssue);
      const lanePriorityWeight = lane?.lanePriorityWeight ?? 999;
      const dependencyDepthWeight = lane?.dependencyDepthWeight ?? 999;
      const issueIdentifier = artifact.issueIdentifier || lane?.issueIdentifier || `UNKNOWN-${index + 1}`;
      const artifactPath = artifact.artifactPath ?? `missing/${issueIdentifier}/${artifact.artifactType}`;

      const reasonSet = new Set<CanonicalReasonCode>([
        ...artifact.reasonCodes,
        ...(lane?.reasonCodes ?? []),
      ]);

      if (!artifact.artifactPath) {
        reasonSet.add('missing_artifact');
      }
      if (bundleDigest && artifact.bundleDigest && artifact.bundleDigest !== bundleDigest) {
        reasonSet.add('fingerprint_mismatch');
      }
      if (contractDigest && artifact.contractDigest && artifact.contractDigest !== contractDigest) {
        reasonSet.add('fingerprint_mismatch');
      }
      if (artifact.referenceLinks.some((link) => !isCanonicalReference(link))) {
        reasonSet.add('reference_noncanonical');
      }

      return {
        lanePriorityWeight,
        dependencyDepthWeight,
        issueIdentifier,
        artifactType: artifact.artifactType,
        artifactPath,
        laneId: artifact.laneId,
        reasonCodes: CANONICAL_REASON_CODES.filter((code) => reasonSet.has(code)),
      };
    })
    .sort(compareManifestEntry);

  const missingEvidence: MissingEvidenceEntry[] = entries.reduce<MissingEvidenceEntry[]>((accumulator, entry) => {
    const reasons = entry.reasonCodes.filter((code) => code !== 'dependency_violation');
    if (reasons.length > 0) {
      accumulator.push({
        ...entry,
        reasonCodes: reasons,
      });
    }
    return accumulator;
  }, []);

  const dependencyViolations = lanes
    .map((lane) => {
      const reasonSet = new Set<CanonicalReasonCode>(lane.reasonCodes);
      if (lane.dependencyStatus && ['blocked', 'open', 'unresolved', 'pending'].includes(lane.dependencyStatus)) {
        reasonSet.add('dependency_violation');
      }
      if (lane.dependencyIssueLink && !isCanonicalReference(lane.dependencyIssueLink)) {
        reasonSet.add('reference_noncanonical');
      }

      const reasonCodes = CANONICAL_REASON_CODES.filter((code) => reasonSet.has(code));
      if (!reasonCodes.includes('dependency_violation')) {
        return null;
      }

      return {
        lanePriorityWeight: lane.lanePriorityWeight,
        dependencyDepthWeight: lane.dependencyDepthWeight,
        issueIdentifier: lane.issueIdentifier,
        dependencyIssueIdentifier: lane.dependencyIssueIdentifier,
        dependencyIssueLink: lane.dependencyIssueLink,
        reasonCodes,
      };
    })
    .filter((entry): entry is DependencyViolationEntry => entry !== null)
    .sort(compareDependencyViolation);

  const requiredChecks = entries.length;
  const passingChecks = requiredChecks - missingEvidence.length;
  const requiredEvidenceCoverage = requiredChecks === 0 ? 1 : Number((passingChecks / requiredChecks).toFixed(6));

  const validatorReasonSet = new Set<CanonicalReasonCode>();
  entries.forEach((entry) => {
    entry.reasonCodes.forEach((code) => validatorReasonSet.add(code));
  });
  dependencyViolations.forEach((entry) => {
    entry.reasonCodes.forEach((code) => validatorReasonSet.add(code));
  });

  const generatedAtIso = toIsoOrDefault(input.asOfIso);
  const manifestFingerprint = sha256Hex(stableSerialize({
    schemaVersion: 'settlement-publication-evidence-manifest.v1',
    bundleDigest,
    contractDigest,
    entries,
    missingEvidence,
    dependencyViolations,
    requiredEvidenceCoverage,
  }));

  return {
    contract: 'settlement-publication-evidence-manifest.v1',
    schemaVersion: 'settlement-publication-evidence-manifest.v1',
    generatedAtIso,
    bundleDigest,
    contractDigest,
    orderingKeySpec: [
      'lanePriorityWeight',
      'dependencyDepthWeight',
      'issueIdentifier',
      'artifactType',
      'artifactPath',
    ],
    entries,
    missingEvidence,
    dependencyViolations,
    validatorReasonCodes: CANONICAL_REASON_CODES.filter((code) => validatorReasonSet.has(code)),
    requiredEvidenceCoverage,
    isReleaseGateReady: missingEvidence.length === 0 && dependencyViolations.length === 0,
    manifestFingerprint,
  };
}

function normalizeLane(value: unknown, index: number): NormalizedLane {
  const row = toRecord(value);
  const laneId = normalizeString(row.laneId ?? row.id) ?? `lane-${index + 1}`;
  const issueIdentifier = normalizeIssueIdentifier(row.issueIdentifier) ?? `UNKNOWN-${index + 1}`;
  const dependencyStatus = normalizeString(row.dependencyStatus ?? row.status)?.toLowerCase() ?? null;

  return {
    laneId,
    issueIdentifier,
    lanePriorityWeight: normalizeNumber(row.lanePriorityWeight ?? row.priorityWeight, 999),
    dependencyDepthWeight: normalizeNumber(row.dependencyDepthWeight ?? row.dependencyDepth, 999),
    dependencyIssueIdentifier: normalizeIssueIdentifier(row.dependencyIssueIdentifier ?? row.dependencyIssueId),
    dependencyIssueLink: normalizeString(row.dependencyIssueLink ?? row.issueLink),
    dependencyStatus,
    reasonCodes: normalizeReasonCodes([
      ...toArray(row.reasonCodes),
      ...toArray(row.gateReasonCodes),
      row.unresolvedReason,
      row.message,
    ]),
  };
}

function normalizeArtifact(value: unknown, index: number): NormalizedArtifact {
  const row = toRecord(value);
  return {
    laneId: normalizeString(row.laneId),
    issueIdentifier: normalizeIssueIdentifier(row.issueIdentifier) ?? `UNKNOWN-${index + 1}`,
    artifactType: normalizeString(row.artifactType ?? row.type) ?? 'artifact-unknown',
    artifactPath: normalizeString(row.artifactPath ?? row.path),
    bundleDigest: normalizeString(row.bundleDigest),
    contractDigest: normalizeString(row.contractDigest),
    reasonCodes: normalizeReasonCodes([
      ...toArray(row.reasonCodes),
      ...toArray(row.validatorReasonCodes),
      row.message,
    ]),
    referenceLinks: toArray(row.referenceLinks)
      .map((value) => normalizeString(value))
      .filter((value): value is string => value !== null),
  };
}

function resolveLane(
  artifact: NormalizedArtifact,
  laneById: Map<string, NormalizedLane>,
  laneByIssue: Map<string, NormalizedLane>,
): NormalizedLane | null {
  if (artifact.laneId) {
    const lane = laneById.get(artifact.laneId);
    if (lane) {
      return lane;
    }
  }
  return laneByIssue.get(artifact.issueIdentifier) ?? null;
}

function compareLane(left: NormalizedLane, right: NormalizedLane): number {
  if (left.lanePriorityWeight !== right.lanePriorityWeight) {
    return left.lanePriorityWeight - right.lanePriorityWeight;
  }
  if (left.dependencyDepthWeight !== right.dependencyDepthWeight) {
    return left.dependencyDepthWeight - right.dependencyDepthWeight;
  }
  const issue = left.issueIdentifier.localeCompare(right.issueIdentifier);
  if (issue !== 0) {
    return issue;
  }
  return left.laneId.localeCompare(right.laneId);
}

function compareArtifact(left: NormalizedArtifact, right: NormalizedArtifact): number {
  const issue = left.issueIdentifier.localeCompare(right.issueIdentifier);
  if (issue !== 0) {
    return issue;
  }
  const type = left.artifactType.localeCompare(right.artifactType);
  if (type !== 0) {
    return type;
  }
  return (left.artifactPath ?? '').localeCompare(right.artifactPath ?? '');
}

function compareManifestEntry(left: PublicationEvidenceManifestEntry, right: PublicationEvidenceManifestEntry): number {
  if (left.lanePriorityWeight !== right.lanePriorityWeight) {
    return left.lanePriorityWeight - right.lanePriorityWeight;
  }
  if (left.dependencyDepthWeight !== right.dependencyDepthWeight) {
    return left.dependencyDepthWeight - right.dependencyDepthWeight;
  }
  const issue = left.issueIdentifier.localeCompare(right.issueIdentifier);
  if (issue !== 0) {
    return issue;
  }
  const artifactType = left.artifactType.localeCompare(right.artifactType);
  if (artifactType !== 0) {
    return artifactType;
  }
  return left.artifactPath.localeCompare(right.artifactPath);
}

function compareDependencyViolation(left: DependencyViolationEntry, right: DependencyViolationEntry): number {
  if (left.lanePriorityWeight !== right.lanePriorityWeight) {
    return left.lanePriorityWeight - right.lanePriorityWeight;
  }
  if (left.dependencyDepthWeight !== right.dependencyDepthWeight) {
    return left.dependencyDepthWeight - right.dependencyDepthWeight;
  }
  const issue = left.issueIdentifier.localeCompare(right.issueIdentifier);
  if (issue !== 0) {
    return issue;
  }
  const dependencyIssue = (left.dependencyIssueIdentifier ?? '').localeCompare(right.dependencyIssueIdentifier ?? '');
  if (dependencyIssue !== 0) {
    return dependencyIssue;
  }
  return (left.dependencyIssueLink ?? '').localeCompare(right.dependencyIssueLink ?? '');
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
  if (compact === 'missing_artifact' || compact.includes('missing') || compact.includes('artifact_gap')) {
    return 'missing_artifact';
  }
  if (
    compact === 'dependency_violation'
    || compact.includes('dependency_open')
    || compact.includes('dependency_blocked')
    || (compact.includes('dependency') && compact.includes('violation'))
  ) {
    return 'dependency_violation';
  }
  if (
    compact === 'fingerprint_mismatch'
    || compact.includes('checksum_mismatch')
    || compact.includes('digest_mismatch')
    || compact.includes('hash_mismatch')
    || compact.includes('fingerprint')
  ) {
    return 'fingerprint_mismatch';
  }
  if (compact === 'ordering_regression' || compact.includes('ordering') || compact.includes('order_regression')) {
    return 'ordering_regression';
  }
  if (
    compact === 'reference_noncanonical'
    || compact.includes('noncanonical')
    || compact.includes('non_canonical')
    || compact.includes('reference_invalid')
  ) {
    return 'reference_noncanonical';
  }
  return null;
}

function isCanonicalReference(value: string): boolean {
  return /^\/ONE\/issues\/[A-Z]+-\d+(#(?:comment-\d+|document-[a-z0-9-]+))?$/i.test(value);
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

function toIsoOrDefault(value: unknown): string {
  const normalized = normalizeString(value);
  if (!normalized) {
    return new Date().toISOString();
  }
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
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
