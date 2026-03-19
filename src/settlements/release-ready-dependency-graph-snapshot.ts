import { createHash } from 'node:crypto';

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;
const SCHEMA_VERSION = 'settlement-release-ready-dependency-graph-snapshot.v1' as const;

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

type NormalizedLaneRef = {
  issueIdentifier: string;
  lanePriorityWeight: number;
  dependencyDepthWeight: number;
  blockerWeight: number;
  reasonCodes: CanonicalReasonCode[];
  referenceLinks: string[];
};

type NormalizedDependencyRef = {
  issueIdentifier: string;
  dependsOnIssueIdentifier: string;
  dependencyDepthWeight: number;
  blockerWeight: number;
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

export type ReleaseReadyDependencyGraphNode = {
  lanePriorityWeight: number;
  dependencyDepthWeight: number;
  blockerWeight: number;
  issueIdentifier: string;
  evidenceTypeWeight: number;
  evidencePath: string;
  reasonCodes: CanonicalReasonCode[];
};

export type ReleaseReadyDependencyGraphEdge = {
  lanePriorityWeight: number;
  dependencyDepthWeight: number;
  blockerWeight: number;
  issueIdentifier: string;
  evidenceTypeWeight: number;
  evidencePath: string;
  fromIssueIdentifier: string;
  toIssueIdentifier: string;
  reasonCodes: CanonicalReasonCode[];
};

export type SettlementReleaseReadyDependencyGraphSnapshot = {
  contract: typeof SCHEMA_VERSION;
  schemaVersion: typeof SCHEMA_VERSION;
  candidateId: string;
  orderingKeySpec: [
    'lanePriorityWeight',
    'dependencyDepthWeight',
    'blockerWeight',
    'issueIdentifier',
    'evidenceTypeWeight',
    'evidencePath',
  ];
  nodes: ReleaseReadyDependencyGraphNode[];
  edges: ReleaseReadyDependencyGraphEdge[];
  graphFingerprint: string;
  isReadyForQa: boolean;
  missingEvidence: Array<{
    issueIdentifier: string;
    evidenceType: string;
    evidencePath: string;
    reasonCode: 'missing_evidence';
  }>;
  blockedDependencies: Array<{
    issueIdentifier: string;
    dependencyIssueIdentifier: string;
    dependencyStatus: string;
    reasonCode: 'dependency_blocked';
  }>;
  nonCanonicalLinks: Array<{
    issueIdentifier: string;
    link: string;
  }>;
  nextOwner: 'qa' | 'pm' | 'backend';
};

export function buildSettlementReleaseReadyDependencyGraphSnapshot(input: {
  candidateId: string;
  laneRefs: unknown[];
  dependencyRefs: unknown[];
  evidenceRefs: unknown[];
}): SettlementReleaseReadyDependencyGraphSnapshot {
  const candidateId = normalizeString(input.candidateId) ?? 'candidate-unknown';

  const laneRefs = (Array.isArray(input.laneRefs) ? input.laneRefs : [])
    .map((value, index) => normalizeLaneRef(value, index))
    .sort(compareLaneRef);

  const dependencyRefs = (Array.isArray(input.dependencyRefs) ? input.dependencyRefs : [])
    .map((value, index) => normalizeDependencyRef(value, index))
    .sort(compareDependencyRef);

  const evidenceRefs = (Array.isArray(input.evidenceRefs) ? input.evidenceRefs : [])
    .map((value, index) => normalizeEvidenceRef(value, index))
    .sort(compareEvidenceRef);

  const issueSet = new Set<string>();
  laneRefs.forEach((lane) => issueSet.add(lane.issueIdentifier));
  dependencyRefs.forEach((dependency) => {
    issueSet.add(dependency.issueIdentifier);
    issueSet.add(dependency.dependsOnIssueIdentifier);
  });
  evidenceRefs.forEach((evidence) => issueSet.add(evidence.issueIdentifier));

  const laneByIssue = groupByIssue(laneRefs);
  const dependencyByIssue = groupByIssue(dependencyRefs);
  const evidenceByIssue = groupByIssue(evidenceRefs);

  const blockedDependencies: SettlementReleaseReadyDependencyGraphSnapshot['blockedDependencies'] = [];

  dependencyRefs.forEach((dependency) => {
    if (!isDependencyBlocked(dependency.dependencyStatus)) {
      return;
    }
    blockedDependencies.push({
      issueIdentifier: dependency.issueIdentifier,
      dependencyIssueIdentifier: dependency.dependsOnIssueIdentifier,
      dependencyStatus: dependency.dependencyStatus ?? 'blocked',
      reasonCode: 'dependency_blocked',
    });
  });

  blockedDependencies.sort((left, right) => (
    compareStrings(left.issueIdentifier, right.issueIdentifier)
    || compareStrings(left.dependencyIssueIdentifier, right.dependencyIssueIdentifier)
    || compareStrings(left.dependencyStatus, right.dependencyStatus)
  ));

  const nodes = [...issueSet]
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
        lanePriorityWeight: minValueOrDefault(lanes.map((lane) => lane.lanePriorityWeight), 999),
        dependencyDepthWeight: minValueOrDefault(
          [
            ...lanes.map((lane) => lane.dependencyDepthWeight),
            ...dependencies.map((dependency) => dependency.dependencyDepthWeight),
          ],
          999,
        ),
        blockerWeight: computeBlockerWeight(reasonCodes),
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
    .sort(compareGraphRow);

  const edges = dependencyRefs
    .map((dependency) => {
      const sourceNode = nodes.find((node) => node.issueIdentifier === dependency.issueIdentifier) ?? null;
      const reasonSet = new Set<CanonicalReasonCode>(dependency.reasonCodes);
      if (isDependencyBlocked(dependency.dependencyStatus)) {
        reasonSet.add('dependency_blocked');
      }
      const reasonCodes = CANONICAL_REASON_CODES.filter((code) => reasonSet.has(code));

      return {
        lanePriorityWeight: sourceNode?.lanePriorityWeight ?? 999,
        dependencyDepthWeight: dependency.dependencyDepthWeight,
        blockerWeight: computeBlockerWeight(reasonCodes),
        issueIdentifier: dependency.issueIdentifier,
        evidenceTypeWeight: sourceNode?.evidenceTypeWeight ?? 999,
        evidencePath: sourceNode?.evidencePath ?? `missing/${dependency.issueIdentifier}/evidence`,
        fromIssueIdentifier: dependency.issueIdentifier,
        toIssueIdentifier: dependency.dependsOnIssueIdentifier,
        reasonCodes,
      };
    })
    .sort((left, right) => (
      compareGraphRow(left, right)
      || compareStrings(left.fromIssueIdentifier, right.fromIssueIdentifier)
      || compareStrings(left.toIssueIdentifier, right.toIssueIdentifier)
    ));

  const missingEvidence = nodes
    .filter((node) => node.reasonCodes.includes('missing_evidence'))
    .map((node) => ({
      issueIdentifier: node.issueIdentifier,
      evidenceType: 'evidence',
      evidencePath: node.evidencePath,
      reasonCode: 'missing_evidence' as const,
    }));

  const nonCanonicalLinks = uniqueLinkRows(nodes.flatMap((node) => {
    const laneLinks = laneByIssue.get(node.issueIdentifier)?.flatMap((lane) => lane.referenceLinks) ?? [];
    const dependencyLinks = dependencyByIssue.get(node.issueIdentifier)
      ?.flatMap((dependency) => dependency.referenceLinks) ?? [];
    const evidenceLinks = evidenceByIssue.get(node.issueIdentifier)
      ?.flatMap((evidence) => evidence.referenceLinks) ?? [];

    return [...laneLinks, ...dependencyLinks, ...evidenceLinks]
      .filter((link) => !isCanonicalIssueReference(link))
      .map((link) => ({
        issueIdentifier: node.issueIdentifier,
        link,
      }));
  }));

  const isReadyForQa = nodes.length > 0
    && missingEvidence.length === 0
    && blockedDependencies.length === 0
    && !nodes.some((node) => node.reasonCodes.includes('fingerprint_drift'));

  const nextOwner: 'qa' | 'pm' | 'backend' = isReadyForQa
    ? 'qa'
    : (blockedDependencies.length > 0 ? 'pm' : 'backend');

  const graphFingerprint = sha256Hex(stableSerialize({
    schemaVersion: SCHEMA_VERSION,
    candidateId,
    nodes,
    edges,
    missingEvidence,
    blockedDependencies,
    nonCanonicalLinks,
    isReadyForQa,
    nextOwner,
  }));

  return {
    contract: SCHEMA_VERSION,
    schemaVersion: SCHEMA_VERSION,
    candidateId,
    orderingKeySpec: [
      'lanePriorityWeight',
      'dependencyDepthWeight',
      'blockerWeight',
      'issueIdentifier',
      'evidenceTypeWeight',
      'evidencePath',
    ],
    nodes,
    edges,
    graphFingerprint,
    isReadyForQa,
    missingEvidence,
    blockedDependencies,
    nonCanonicalLinks,
    nextOwner,
  };
}

function normalizeLaneRef(value: unknown, index: number): NormalizedLaneRef {
  const row = toRecord(value);

  return {
    issueIdentifier: normalizeIssueIdentifier(row.issueIdentifier) ?? `UNKNOWN-${index + 1}`,
    lanePriorityWeight: normalizeNumber(row.lanePriorityWeight ?? row.priorityWeight, 999),
    dependencyDepthWeight: normalizeNumber(row.dependencyDepthWeight ?? row.depthWeight, 999),
    blockerWeight: normalizeNumber(row.blockerWeight, 2),
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

  return {
    issueIdentifier: normalizeIssueIdentifier(row.issueIdentifier) ?? `UNKNOWN-${index + 1}`,
    dependsOnIssueIdentifier: normalizeIssueIdentifier(
      row.dependsOnIssueIdentifier ?? row.dependencyIssueIdentifier ?? row.dependencyIssue,
    ) ?? `UNKNOWN-DEP-${index + 1}`,
    dependencyDepthWeight: normalizeNumber(row.dependencyDepthWeight ?? row.depthWeight, 999),
    blockerWeight: normalizeNumber(row.blockerWeight, 2),
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

  if (normalized === 'fingerprint_drift' || normalized.includes('fingerprint_drift')) {
    return 'fingerprint_drift';
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
    && (normalized.includes('blocked') || normalized.includes('open') || normalized.includes('pending')) ) {
    return 'dependency_blocked';
  }

  if ((normalized.includes('fingerprint') || normalized.includes('checksum') || normalized.includes('hash'))
    && (normalized.includes('drift') || normalized.includes('mismatch') || normalized.includes('regression'))) {
    return 'fingerprint_drift';
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

function compareLaneRef(left: NormalizedLaneRef, right: NormalizedLaneRef): number {
  return compareGraphRow(
    {
      lanePriorityWeight: left.lanePriorityWeight,
      dependencyDepthWeight: left.dependencyDepthWeight,
      blockerWeight: left.blockerWeight,
      issueIdentifier: left.issueIdentifier,
      evidenceTypeWeight: 999,
      evidencePath: 'lane',
    },
    {
      lanePriorityWeight: right.lanePriorityWeight,
      dependencyDepthWeight: right.dependencyDepthWeight,
      blockerWeight: right.blockerWeight,
      issueIdentifier: right.issueIdentifier,
      evidenceTypeWeight: 999,
      evidencePath: 'lane',
    },
  );
}

function compareDependencyRef(left: NormalizedDependencyRef, right: NormalizedDependencyRef): number {
  return compareGraphRow(
    {
      lanePriorityWeight: 999,
      dependencyDepthWeight: left.dependencyDepthWeight,
      blockerWeight: left.blockerWeight,
      issueIdentifier: left.issueIdentifier,
      evidenceTypeWeight: 999,
      evidencePath: left.dependsOnIssueIdentifier,
    },
    {
      lanePriorityWeight: 999,
      dependencyDepthWeight: right.dependencyDepthWeight,
      blockerWeight: right.blockerWeight,
      issueIdentifier: right.issueIdentifier,
      evidenceTypeWeight: 999,
      evidencePath: right.dependsOnIssueIdentifier,
    },
  );
}

function compareEvidenceRef(left: NormalizedEvidenceRef, right: NormalizedEvidenceRef): number {
  return compareGraphRow(
    {
      lanePriorityWeight: 999,
      dependencyDepthWeight: 999,
      blockerWeight: 2,
      issueIdentifier: left.issueIdentifier,
      evidenceTypeWeight: left.evidenceTypeWeight,
      evidencePath: left.evidencePath ?? `missing/${left.issueIdentifier}/${left.evidenceType}`,
    },
    {
      lanePriorityWeight: 999,
      dependencyDepthWeight: 999,
      blockerWeight: 2,
      issueIdentifier: right.issueIdentifier,
      evidenceTypeWeight: right.evidenceTypeWeight,
      evidencePath: right.evidencePath ?? `missing/${right.issueIdentifier}/${right.evidenceType}`,
    },
  );
}

function compareGraphRow(
  left: {
    lanePriorityWeight: number;
    dependencyDepthWeight: number;
    blockerWeight: number;
    issueIdentifier: string;
    evidenceTypeWeight: number;
    evidencePath: string;
  },
  right: {
    lanePriorityWeight: number;
    dependencyDepthWeight: number;
    blockerWeight: number;
    issueIdentifier: string;
    evidenceTypeWeight: number;
    evidencePath: string;
  },
): number {
  return (
    left.lanePriorityWeight - right.lanePriorityWeight
    || left.dependencyDepthWeight - right.dependencyDepthWeight
    || left.blockerWeight - right.blockerWeight
    || compareStrings(left.issueIdentifier, right.issueIdentifier)
    || left.evidenceTypeWeight - right.evidenceTypeWeight
    || compareStrings(left.evidencePath, right.evidencePath)
  );
}

function computeBlockerWeight(reasonCodes: CanonicalReasonCode[]): number {
  if (reasonCodes.some((code) => BLOCKING_REASON_CODES.includes(code as BlockingReasonCode))) {
    return 0;
  }
  if (reasonCodes.length > 0) {
    return 1;
  }
  return 2;
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

function uniqueLinkRows(rows: Array<{ issueIdentifier: string; link: string }>): Array<{
  issueIdentifier: string;
  link: string;
}> {
  const seen = new Set<string>();
  const result: Array<{ issueIdentifier: string; link: string }> = [];

  rows
    .sort((left, right) => compareStrings(left.issueIdentifier, right.issueIdentifier) || compareStrings(left.link, right.link))
    .forEach((row) => {
      const key = `${row.issueIdentifier}::${row.link}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      result.push(row);
    });

  return result;
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
