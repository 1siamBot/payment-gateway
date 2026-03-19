import { createHash } from 'node:crypto';

export const SETTLEMENT_EVIDENCE_ANOMALY_CATEGORIES = [
  'missing',
  'stale',
  'malformed',
  'dependency-gap',
  'blocker-drift',
] as const;

export const SETTLEMENT_EVIDENCE_ANOMALY_PR_MODES = ['pr_link', 'no_pr_yet'] as const;

type EvidenceAnomalyCategory = (typeof SETTLEMENT_EVIDENCE_ANOMALY_CATEGORIES)[number];
type EvidenceAnomalyPrMode = (typeof SETTLEMENT_EVIDENCE_ANOMALY_PR_MODES)[number];
type EvidenceAnomalySeverity = 'critical' | 'high' | 'medium' | 'low';

type NormalizedLane = {
  issueIdentifier: string;
  issueLink: string;
  branch: string | null;
  fullSha: string | null;
  prMode: EvidenceAnomalyPrMode | null;
  testCommand: string | null;
  artifactPath: string | null;
  dependencyIssueLinks: string[];
  blockerOwner: string | null;
  blockerEta: string | null;
  stalenessMinutes: number;
};

export type SettlementEvidenceAnomaly = {
  category: EvidenceAnomalyCategory;
  code: string;
  severity: EvidenceAnomalySeverity;
  severityWeight: number;
  stalenessMinutes: number;
  issueIdentifier: string;
  issueLink: string;
  field: string;
  fieldPath: string;
  message: string;
  input: string | null;
  normalized: string | null;
};

export type SettlementEvidenceAnomalyScorecard = {
  contract: 'settlement-evidence-anomaly-scorecard.v1';
  anomalies: SettlementEvidenceAnomaly[];
  scorecard: Array<{
    issueIdentifier: string;
    issueLink: string;
    stalenessMinutes: number;
    prMode: EvidenceAnomalyPrMode | null;
    blockerOwner: string | null;
    blockerEta: string | null;
    dependencyIssueLinks: string[];
    remediationPriorityScore: number;
    reasonCodes: string[];
    anomalyCount: number;
  }>;
  metadata: {
    laneCount: number;
    anomalyCount: number;
    byCategory: Record<EvidenceAnomalyCategory, number>;
  };
  fingerprint: string;
};

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;
const FULL_SHA_PATTERN = /^[a-f0-9]{40}$/;
const SEVERITY_WEIGHT: Record<EvidenceAnomalySeverity, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

export function buildSettlementEvidenceAnomalyScorecard(input: {
  lanes: unknown[];
  asOfIso?: string;
  staleAfterMinutes?: number;
}): SettlementEvidenceAnomalyScorecard {
  const asOf = parseIsoDateTime(input.asOfIso) ?? new Date('2026-03-19T00:00:00.000Z');
  const staleAfterMinutes = normalizePositiveInteger(input.staleAfterMinutes) ?? 240;
  const anomalies: SettlementEvidenceAnomaly[] = [];

  const normalizedLanes = input.lanes
    .map((lane, index) => normalizeLane(lane, index, asOf, staleAfterMinutes, anomalies))
    .sort(compareNormalizedLane);

  const stableAnomalies = [...anomalies].sort(compareAnomaly);
  const scorecard = buildScorecard(normalizedLanes, stableAnomalies);

  const fingerprintPayload = {
    contract: 'settlement-evidence-anomaly-scorecard.v1',
    anomalies: stableAnomalies,
    scorecard,
  };
  const fingerprint = createHash('sha256').update(JSON.stringify(fingerprintPayload)).digest('hex');

  return {
    contract: 'settlement-evidence-anomaly-scorecard.v1',
    anomalies: stableAnomalies,
    scorecard,
    metadata: {
      laneCount: normalizedLanes.length,
      anomalyCount: stableAnomalies.length,
      byCategory: {
        missing: stableAnomalies.filter((anomaly) => anomaly.category === 'missing').length,
        stale: stableAnomalies.filter((anomaly) => anomaly.category === 'stale').length,
        malformed: stableAnomalies.filter((anomaly) => anomaly.category === 'malformed').length,
        'dependency-gap': stableAnomalies.filter((anomaly) => anomaly.category === 'dependency-gap').length,
        'blocker-drift': stableAnomalies.filter((anomaly) => anomaly.category === 'blocker-drift').length,
      },
    },
    fingerprint,
  };
}

function normalizeLane(
  value: unknown,
  index: number,
  asOf: Date,
  staleAfterMinutes: number,
  anomalies: SettlementEvidenceAnomaly[],
): NormalizedLane {
  const lane = toRecord(value);
  const issueIdentifier = normalizeIssueIdentifier(lane.issueIdentifier) ?? `UNKNOWN-${index}`;
  const issueLink = toCanonicalIssueLink(issueIdentifier);
  const scope = { issueIdentifier, issueLink };

  const branch = normalizeString(lane.branch);
  if (!branch) {
    pushAnomaly(anomalies, scope, {
      category: 'missing',
      code: 'MISSING_BRANCH',
      severity: 'critical',
      field: 'branch',
      fieldPath: stableFieldPath(issueIdentifier, 'branch'),
      message: 'branch is required',
      input: toInputValue(lane.branch),
      normalized: null,
      stalenessMinutes: 0,
    });
  }

  const fullSha = normalizeString(lane.fullSha);
  if (!fullSha) {
    pushAnomaly(anomalies, scope, {
      category: 'missing',
      code: 'MISSING_FULL_SHA',
      severity: 'critical',
      field: 'fullSha',
      fieldPath: stableFieldPath(issueIdentifier, 'fullSha'),
      message: 'fullSha is required',
      input: toInputValue(lane.fullSha),
      normalized: null,
      stalenessMinutes: 0,
    });
  } else if (!FULL_SHA_PATTERN.test(fullSha)) {
    pushAnomaly(anomalies, scope, {
      category: 'malformed',
      code: 'INVALID_FULL_SHA',
      severity: 'medium',
      field: 'fullSha',
      fieldPath: stableFieldPath(issueIdentifier, 'fullSha'),
      message: 'fullSha must be a 40-character lowercase hexadecimal commit SHA',
      input: fullSha,
      normalized: null,
      stalenessMinutes: 0,
    });
  }

  const rawPrMode = normalizeString(lane.prMode);
  let prMode: EvidenceAnomalyPrMode | null = null;
  if (!rawPrMode) {
    pushAnomaly(anomalies, scope, {
      category: 'missing',
      code: 'MISSING_PR_MODE',
      severity: 'critical',
      field: 'prMode',
      fieldPath: stableFieldPath(issueIdentifier, 'prMode'),
      message: 'prMode is required',
      input: toInputValue(lane.prMode),
      normalized: null,
      stalenessMinutes: 0,
    });
  } else if (isPrMode(rawPrMode)) {
    prMode = rawPrMode;
  } else {
    pushAnomaly(anomalies, scope, {
      category: 'malformed',
      code: 'INVALID_PR_MODE',
      severity: 'medium',
      field: 'prMode',
      fieldPath: stableFieldPath(issueIdentifier, 'prMode'),
      message: `prMode must be one of: ${SETTLEMENT_EVIDENCE_ANOMALY_PR_MODES.join(', ')}`,
      input: rawPrMode,
      normalized: null,
      stalenessMinutes: 0,
    });
  }

  const testCommand = normalizeString(lane.testCommand);
  if (!testCommand) {
    pushAnomaly(anomalies, scope, {
      category: 'missing',
      code: 'MISSING_TEST_COMMAND',
      severity: 'critical',
      field: 'testCommand',
      fieldPath: stableFieldPath(issueIdentifier, 'testCommand'),
      message: 'testCommand is required',
      input: toInputValue(lane.testCommand),
      normalized: null,
      stalenessMinutes: 0,
    });
  }

  const artifactPath = normalizeString(lane.artifactPath);
  if (!artifactPath) {
    pushAnomaly(anomalies, scope, {
      category: 'missing',
      code: 'MISSING_ARTIFACT_PATH',
      severity: 'critical',
      field: 'artifactPath',
      fieldPath: stableFieldPath(issueIdentifier, 'artifactPath'),
      message: 'artifactPath is required',
      input: toInputValue(lane.artifactPath),
      normalized: null,
      stalenessMinutes: 0,
    });
  }

  const dependencyIssueLinks = normalizeDependencyIssueLinks(
    lane.dependencyIssueLinks ?? lane.dependencyIssueIds,
    issueIdentifier,
    issueLink,
    anomalies,
  );
  if (!dependencyIssueLinks.length) {
    pushAnomaly(anomalies, scope, {
      category: 'dependency-gap',
      code: 'MISSING_DEPENDENCY_ISSUE_LINKS',
      severity: 'high',
      field: 'dependencyIssueLinks',
      fieldPath: stableFieldPath(issueIdentifier, 'dependencyIssueLinks'),
      message: 'dependencyIssueLinks must include at least one issue link',
      input: toInputValue(lane.dependencyIssueLinks ?? lane.dependencyIssueIds),
      normalized: null,
      stalenessMinutes: 0,
    });
  }

  const blockerOwner = normalizeString(lane.blockerOwner);
  const blockerEta = normalizeString(lane.blockerEta);
  if (prMode === 'no_pr_yet') {
    if (!blockerOwner) {
      pushAnomaly(anomalies, scope, {
        category: 'blocker-drift',
        code: 'MISSING_BLOCKER_OWNER',
        severity: 'high',
        field: 'blockerOwner',
        fieldPath: stableFieldPath(issueIdentifier, 'blockerOwner'),
        message: 'blockerOwner is required when prMode=no_pr_yet',
        input: toInputValue(lane.blockerOwner),
        normalized: null,
        stalenessMinutes: 0,
      });
    }
    if (!blockerEta) {
      pushAnomaly(anomalies, scope, {
        category: 'blocker-drift',
        code: 'MISSING_BLOCKER_ETA',
        severity: 'high',
        field: 'blockerEta',
        fieldPath: stableFieldPath(issueIdentifier, 'blockerEta'),
        message: 'blockerEta is required when prMode=no_pr_yet',
        input: toInputValue(lane.blockerEta),
        normalized: null,
        stalenessMinutes: 0,
      });
    } else {
      const blockerEtaDate = parseIsoDateTime(blockerEta);
      if (!blockerEtaDate) {
        pushAnomaly(anomalies, scope, {
          category: 'malformed',
          code: 'INVALID_BLOCKER_ETA',
          severity: 'medium',
          field: 'blockerEta',
          fieldPath: stableFieldPath(issueIdentifier, 'blockerEta'),
          message: 'blockerEta must be an ISO-8601 datetime',
          input: blockerEta,
          normalized: null,
          stalenessMinutes: 0,
        });
      } else if (blockerEtaDate.getTime() < asOf.getTime()) {
        pushAnomaly(anomalies, scope, {
          category: 'blocker-drift',
          code: 'BLOCKER_ETA_IN_PAST',
          severity: 'high',
          field: 'blockerEta',
          fieldPath: stableFieldPath(issueIdentifier, 'blockerEta'),
          message: 'blockerEta is in the past for a no_pr_yet lane',
          input: blockerEta,
          normalized: blockerEtaDate.toISOString(),
          stalenessMinutes: 0,
        });
      }
    }
  }

  const stalenessMinutes = resolveStalenessMinutes(lane, asOf);
  if (stalenessMinutes >= staleAfterMinutes) {
    pushAnomaly(anomalies, scope, {
      category: 'stale',
      code: 'STALE_EVIDENCE',
      severity: 'medium',
      field: 'stalenessMinutes',
      fieldPath: stableFieldPath(issueIdentifier, 'stalenessMinutes'),
      message: `evidence is stale (${stalenessMinutes}m >= ${staleAfterMinutes}m threshold)`,
      input: String(stalenessMinutes),
      normalized: String(staleAfterMinutes),
      stalenessMinutes,
    });
  }

  return {
    issueIdentifier,
    issueLink,
    branch,
    fullSha,
    prMode,
    testCommand,
    artifactPath,
    dependencyIssueLinks,
    blockerOwner,
    blockerEta: parseIsoDateTime(blockerEta)?.toISOString() ?? null,
    stalenessMinutes,
  };
}

function normalizeDependencyIssueLinks(
  value: unknown,
  issueIdentifier: string,
  issueLink: string,
  anomalies: SettlementEvidenceAnomaly[],
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = new Set<string>();
  value.forEach((item) => {
    const raw = normalizeString(item);
    if (!raw) {
      pushAnomaly(anomalies, { issueIdentifier, issueLink }, {
        category: 'dependency-gap',
        code: 'INVALID_DEPENDENCY_ISSUE_LINK',
        severity: 'high',
        field: 'dependencyIssueLinks',
        fieldPath: stableFieldPath(issueIdentifier, 'dependencyIssueLinks', '<empty>'),
        message: 'dependency issue link must be a non-empty string',
        input: toInputValue(item),
        normalized: null,
        stalenessMinutes: 0,
      });
      return;
    }

    const canonical = canonicalizeInternalLink(raw);
    if (!canonical) {
      pushAnomaly(anomalies, { issueIdentifier, issueLink }, {
        category: 'dependency-gap',
        code: 'INVALID_DEPENDENCY_ISSUE_LINK',
        severity: 'high',
        field: 'dependencyIssueLinks',
        fieldPath: stableFieldPath(issueIdentifier, 'dependencyIssueLinks', raw),
        message: 'dependency issue link must reference /<PREFIX>/issues/<ID> format',
        input: raw,
        normalized: null,
        stalenessMinutes: 0,
      });
      return;
    }

    normalized.add(canonical);
    if (raw !== canonical) {
      pushAnomaly(anomalies, { issueIdentifier, issueLink }, {
        category: 'malformed',
        code: 'NON_CANONICAL_INTERNAL_LINK',
        severity: 'low',
        field: 'dependencyIssueLinks',
        fieldPath: stableFieldPath(issueIdentifier, 'dependencyIssueLinks', canonical),
        message: `internal link normalized to canonical format: ${canonical}`,
        input: raw,
        normalized: canonical,
        stalenessMinutes: 0,
      });
    }
  });

  return [...normalized].sort((left, right) => left.localeCompare(right));
}

function buildScorecard(
  normalizedLanes: NormalizedLane[],
  anomalies: SettlementEvidenceAnomaly[],
): SettlementEvidenceAnomalyScorecard['scorecard'] {
  return normalizedLanes
    .map((lane) => {
      const laneAnomalies = anomalies.filter((anomaly) => anomaly.issueIdentifier === lane.issueIdentifier);
      const reasonCodes = [...new Set(laneAnomalies.map((anomaly) => anomaly.code))].sort((left, right) => left.localeCompare(right));
      const anomalyScore = laneAnomalies.reduce((sum, anomaly) => sum + severityPoints(anomaly.severity), 0);
      const stalenessScore = Math.min(30, Math.floor(lane.stalenessMinutes / 30));
      return {
        issueIdentifier: lane.issueIdentifier,
        issueLink: lane.issueLink,
        stalenessMinutes: lane.stalenessMinutes,
        prMode: lane.prMode,
        blockerOwner: lane.blockerOwner,
        blockerEta: lane.blockerEta,
        dependencyIssueLinks: lane.dependencyIssueLinks,
        remediationPriorityScore: anomalyScore + stalenessScore,
        reasonCodes,
        anomalyCount: laneAnomalies.length,
      };
    })
    .sort((left, right) => {
      if (left.remediationPriorityScore !== right.remediationPriorityScore) {
        return right.remediationPriorityScore - left.remediationPriorityScore;
      }
      if (left.stalenessMinutes !== right.stalenessMinutes) {
        return right.stalenessMinutes - left.stalenessMinutes;
      }
      return left.issueIdentifier.localeCompare(right.issueIdentifier);
    });
}

function compareAnomaly(left: SettlementEvidenceAnomaly, right: SettlementEvidenceAnomaly): number {
  if (left.severityWeight !== right.severityWeight) {
    return left.severityWeight - right.severityWeight;
  }
  if (left.stalenessMinutes !== right.stalenessMinutes) {
    return left.stalenessMinutes - right.stalenessMinutes;
  }
  if (left.issueIdentifier !== right.issueIdentifier) {
    return left.issueIdentifier.localeCompare(right.issueIdentifier);
  }
  if (left.fieldPath !== right.fieldPath) {
    return left.fieldPath.localeCompare(right.fieldPath);
  }
  return left.code.localeCompare(right.code);
}

function compareNormalizedLane(left: NormalizedLane, right: NormalizedLane): number {
  if (left.issueIdentifier !== right.issueIdentifier) {
    return left.issueIdentifier.localeCompare(right.issueIdentifier);
  }
  return left.issueLink.localeCompare(right.issueLink);
}

function pushAnomaly(
  anomalies: SettlementEvidenceAnomaly[],
  scope: { issueIdentifier: string; issueLink: string },
  anomaly: {
    category: EvidenceAnomalyCategory;
    code: string;
    severity: EvidenceAnomalySeverity;
    field: string;
    fieldPath: string;
    message: string;
    input: string | null;
    normalized: string | null;
    stalenessMinutes: number;
  },
) {
  anomalies.push({
    category: anomaly.category,
    code: anomaly.code,
    severity: anomaly.severity,
    severityWeight: SEVERITY_WEIGHT[anomaly.severity],
    stalenessMinutes: anomaly.stalenessMinutes,
    issueIdentifier: scope.issueIdentifier,
    issueLink: scope.issueLink,
    field: anomaly.field,
    fieldPath: anomaly.fieldPath,
    message: anomaly.message,
    input: anomaly.input,
    normalized: anomaly.normalized,
  });
}

function severityPoints(severity: EvidenceAnomalySeverity): number {
  if (severity === 'critical') {
    return 40;
  }
  if (severity === 'high') {
    return 25;
  }
  if (severity === 'medium') {
    return 15;
  }
  return 5;
}

function stableFieldPath(issueIdentifier: string, field: string, detail?: string): string {
  if (detail) {
    return `lanes:${issueIdentifier}.${field}:${detail}`;
  }
  return `lanes:${issueIdentifier}.${field}`;
}

function canonicalizeInternalLink(input: string): string | null {
  const pathnameAndHash = extractPathnameAndHash(input);
  if (!pathnameAndHash) {
    return null;
  }

  const canonicalMatch = pathnameAndHash.match(
    /^\/([A-Za-z0-9]+)\/issues\/([A-Za-z0-9]+-\d+)(#(?:comment-\d+|document-[A-Za-z0-9-]+))?$/,
  );
  if (canonicalMatch) {
    const identifier = canonicalMatch[2].toUpperCase();
    const prefix = identifier.split('-')[0];
    const hash = canonicalMatch[3] ?? '';
    return `/${prefix}/issues/${identifier}${hash}`;
  }

  const unprefixedMatch = pathnameAndHash.match(
    /^\/issues\/([A-Za-z0-9]+-\d+)(#(?:comment-\d+|document-[A-Za-z0-9-]+))?$/,
  );
  if (unprefixedMatch) {
    const identifier = unprefixedMatch[1].toUpperCase();
    const prefix = identifier.split('-')[0];
    const hash = unprefixedMatch[2] ?? '';
    return `/${prefix}/issues/${identifier}${hash}`;
  }

  const rawIdentifier = normalizeIssueIdentifier(pathnameAndHash);
  if (rawIdentifier) {
    const prefix = rawIdentifier.split('-')[0];
    return `/${prefix}/issues/${rawIdentifier}`;
  }

  return null;
}

function extractPathnameAndHash(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith('/')) {
    return normalized;
  }
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    try {
      const parsed = new URL(normalized);
      return `${parsed.pathname}${parsed.hash ?? ''}`;
    } catch {
      return null;
    }
  }
  return normalized;
}

function resolveStalenessMinutes(lane: Record<string, unknown>, asOf: Date): number {
  const stalenessMinutes = normalizePositiveInteger(lane.stalenessMinutes);
  if (stalenessMinutes !== null) {
    return stalenessMinutes;
  }

  const updatedAt = parseIsoDateTime(lane.updatedAt);
  if (!updatedAt) {
    return 0;
  }

  const deltaMs = Math.max(0, asOf.getTime() - updatedAt.getTime());
  return Math.floor(deltaMs / 60000);
}

function parseIsoDateTime(value: unknown): Date | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return new Date(timestamp);
}

function normalizeIssueIdentifier(value: unknown): string | null {
  const normalized = normalizeString(value)?.toUpperCase() ?? null;
  if (!normalized || !ISSUE_IDENTIFIER_PATTERN.test(normalized)) {
    return null;
  }
  return normalized;
}

function toCanonicalIssueLink(issueIdentifier: string): string {
  const prefix = issueIdentifier.split('-')[0] ?? 'ONE';
  return `/${prefix}/issues/${issueIdentifier}`;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePositiveInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  const rounded = Math.floor(value);
  if (rounded < 0) {
    return null;
  }
  return rounded;
}

function toInputValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isPrMode(value: string): value is EvidenceAnomalyPrMode {
  return (SETTLEMENT_EVIDENCE_ANOMALY_PR_MODES as readonly string[]).includes(value);
}
