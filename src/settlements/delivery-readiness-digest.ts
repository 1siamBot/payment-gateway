import { createHash } from 'node:crypto';

export const SETTLEMENT_DELIVERY_READINESS_PR_MODES = ['pr_link', 'no_pr_yet'] as const;

export const SETTLEMENT_DELIVERY_READINESS_FINDING_CODES = [
  'MISSING_BRANCH',
  'MISSING_FULL_SHA',
  'INVALID_FULL_SHA',
  'MISSING_PR_MODE',
  'INVALID_PR_MODE',
  'MISSING_TEST_COMMAND',
  'MISSING_ARTIFACT_PATH',
  'MISSING_DEPENDENCY_ISSUE_IDS',
  'INVALID_DEPENDENCY_ISSUE_ID',
  'NON_CANONICAL_DEPENDENCY_ISSUE_LINK',
  'MISSING_BLOCKER_OWNER',
  'MISSING_BLOCKER_ETA',
] as const;

type DeliveryReadinessPrMode = (typeof SETTLEMENT_DELIVERY_READINESS_PR_MODES)[number];
type DeliveryReadinessFindingCode = (typeof SETTLEMENT_DELIVERY_READINESS_FINDING_CODES)[number];
type DeliveryReadinessFindingSeverity = 'error' | 'warning';

type NormalizedLane = {
  issueIdentifier: string;
  issueLink: string;
  priorityWeight: number;
  stalledMinutes: number;
  branch: string | null;
  fullSha: string | null;
  prMode: DeliveryReadinessPrMode | null;
  testCommand: string | null;
  artifactPath: string | null;
  dependencyIssueLinks: string[];
  blockerOwner: string | null;
  blockerEta: string | null;
};

export type SettlementDeliveryReadinessDigestFinding = {
  code: DeliveryReadinessFindingCode;
  severity: DeliveryReadinessFindingSeverity;
  severityPriority: number;
  field: string;
  fieldPriority: number;
  issueIdentifier: string;
  fieldPath: string;
  message: string;
  input: string | null;
  normalized: string | null;
};

export type SettlementDeliveryReadinessDigest = {
  contract: 'settlement-delivery-readiness-digest.v1';
  rows: Array<{
    issueIdentifier: string;
    issueLink: string;
    priorityWeight: number;
    stalledMinutes: number;
    branch: string | null;
    fullSha: string | null;
    prMode: DeliveryReadinessPrMode | null;
    testCommand: string | null;
    artifactPath: string | null;
    dependencyIssueLinks: string[];
    blockerOwner: string | null;
    blockerEta: string | null;
    findingCount: number;
  }>;
  findings: SettlementDeliveryReadinessDigestFinding[];
  recommendation: {
    mode: 'keep_current_lane' | 'switch_lane' | 'no_viable_lane';
    issueIdentifier: string | null;
    issueLink: string | null;
    reason: string;
  };
  metadata: {
    laneCount: number;
    findingCount: number;
    errorCount: number;
    warningCount: number;
  };
  fingerprint: string;
};

const FULL_SHA_PATTERN = /^[a-f0-9]{40}$/;
const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;

const SEVERITY_PRIORITY: Record<DeliveryReadinessFindingSeverity, number> = {
  error: 1,
  warning: 2,
};

const FIELD_PRIORITY: Record<string, number> = {
  branch: 10,
  fullSha: 20,
  prMode: 30,
  testCommand: 40,
  artifactPath: 50,
  dependencyIssueIds: 60,
  blockerOwner: 70,
  blockerEta: 80,
};

export function buildSettlementDeliveryReadinessDigest(input: {
  lanes: unknown[];
  currentLaneIssueIdentifier?: string;
}): SettlementDeliveryReadinessDigest {
  const findings: SettlementDeliveryReadinessDigestFinding[] = [];
  const normalizedRows = input.lanes
    .map((lane, index) => normalizeLane(lane, index, findings))
    .sort(compareLane);

  const stableFindings = [...findings].sort(compareFinding);
  const findingsByIssue = groupFindingsByIssue(stableFindings);

  const rows = normalizedRows.map((row) => ({
    ...row,
    findingCount: findingsByIssue.get(row.issueIdentifier)?.length ?? 0,
  }));

  const recommendation = resolveRecommendation(rows, findingsByIssue, input.currentLaneIssueIdentifier ?? null);

  const fingerprintPayload = {
    contract: 'settlement-delivery-readiness-digest.v1',
    rows,
    findings: stableFindings,
    recommendation,
  };
  const fingerprint = createHash('sha256').update(JSON.stringify(fingerprintPayload)).digest('hex');

  return {
    contract: 'settlement-delivery-readiness-digest.v1',
    rows,
    findings: stableFindings,
    recommendation,
    metadata: {
      laneCount: rows.length,
      findingCount: stableFindings.length,
      errorCount: stableFindings.filter((finding) => finding.severity === 'error').length,
      warningCount: stableFindings.filter((finding) => finding.severity === 'warning').length,
    },
    fingerprint,
  };
}

function normalizeLane(
  value: unknown,
  laneIndex: number,
  findings: SettlementDeliveryReadinessDigestFinding[],
): NormalizedLane {
  const lane = toRecord(value);
  const issueIdentifier = normalizeIssueIdentifier(lane.issueIdentifier) ?? `UNKNOWN-${laneIndex}`;
  const issueLink = toCanonicalIssueLink(issueIdentifier);
  const findingScope = { issueIdentifier, laneIndex };

  const priorityWeight = normalizeInteger(lane.priorityWeight) ?? Number.MAX_SAFE_INTEGER;
  const stalledMinutes = normalizeInteger(lane.stalledMinutes) ?? Number.MAX_SAFE_INTEGER;

  const branch = normalizeString(lane.branch);
  if (!branch) {
    pushFinding(findings, findingScope, {
      code: 'MISSING_BRANCH',
      severity: 'error',
      field: 'branch',
      fieldPath: stableFieldPath(issueIdentifier, 'branch'),
      message: 'branch is required',
      input: toInputValue(lane.branch),
      normalized: null,
    });
  }

  const fullSha = normalizeString(lane.fullSha);
  if (!fullSha) {
    pushFinding(findings, findingScope, {
      code: 'MISSING_FULL_SHA',
      severity: 'error',
      field: 'fullSha',
      fieldPath: stableFieldPath(issueIdentifier, 'fullSha'),
      message: 'fullSha is required',
      input: toInputValue(lane.fullSha),
      normalized: null,
    });
  } else if (!FULL_SHA_PATTERN.test(fullSha)) {
    pushFinding(findings, findingScope, {
      code: 'INVALID_FULL_SHA',
      severity: 'error',
      field: 'fullSha',
      fieldPath: stableFieldPath(issueIdentifier, 'fullSha'),
      message: 'fullSha must be a 40-character lowercase hexadecimal commit SHA',
      input: fullSha,
      normalized: null,
    });
  }

  const rawPrMode = normalizeString(lane.prMode);
  let prMode: DeliveryReadinessPrMode | null = null;
  if (!rawPrMode) {
    pushFinding(findings, findingScope, {
      code: 'MISSING_PR_MODE',
      severity: 'error',
      field: 'prMode',
      fieldPath: stableFieldPath(issueIdentifier, 'prMode'),
      message: 'prMode is required',
      input: toInputValue(lane.prMode),
      normalized: null,
    });
  } else if (isPrMode(rawPrMode)) {
    prMode = rawPrMode;
  } else {
    pushFinding(findings, findingScope, {
      code: 'INVALID_PR_MODE',
      severity: 'error',
      field: 'prMode',
      fieldPath: stableFieldPath(issueIdentifier, 'prMode'),
      message: `prMode must be one of: ${SETTLEMENT_DELIVERY_READINESS_PR_MODES.join(', ')}`,
      input: rawPrMode,
      normalized: null,
    });
  }

  const testCommand = normalizeString(lane.testCommand);
  if (!testCommand) {
    pushFinding(findings, findingScope, {
      code: 'MISSING_TEST_COMMAND',
      severity: 'error',
      field: 'testCommand',
      fieldPath: stableFieldPath(issueIdentifier, 'testCommand'),
      message: 'testCommand is required',
      input: toInputValue(lane.testCommand),
      normalized: null,
    });
  }

  const artifactPath = normalizeString(lane.artifactPath);
  if (!artifactPath) {
    pushFinding(findings, findingScope, {
      code: 'MISSING_ARTIFACT_PATH',
      severity: 'error',
      field: 'artifactPath',
      fieldPath: stableFieldPath(issueIdentifier, 'artifactPath'),
      message: 'artifactPath is required',
      input: toInputValue(lane.artifactPath),
      normalized: null,
    });
  }

  const dependencyIssueLinks = normalizeDependencyIssueIds(
    lane.dependencyIssueIds,
    laneIndex,
    issueIdentifier,
    findings,
  );
  if (!dependencyIssueLinks.length) {
    pushFinding(findings, findingScope, {
      code: 'MISSING_DEPENDENCY_ISSUE_IDS',
      severity: 'error',
      field: 'dependencyIssueIds',
      fieldPath: stableFieldPath(issueIdentifier, 'dependencyIssueIds'),
      message: 'dependencyIssueIds must include at least one issue identifier',
      input: toInputValue(lane.dependencyIssueIds),
      normalized: null,
    });
  }

  const blockerOwner = normalizeString(lane.blockerOwner);
  const blockerEta = normalizeIsoDateTime(lane.blockerEta);
  if (prMode === 'no_pr_yet') {
    if (!blockerOwner) {
      pushFinding(findings, findingScope, {
        code: 'MISSING_BLOCKER_OWNER',
        severity: 'error',
        field: 'blockerOwner',
        fieldPath: stableFieldPath(issueIdentifier, 'blockerOwner'),
        message: 'blockerOwner is required when prMode=no_pr_yet',
        input: toInputValue(lane.blockerOwner),
        normalized: null,
      });
    }
    if (!blockerEta) {
      pushFinding(findings, findingScope, {
        code: 'MISSING_BLOCKER_ETA',
        severity: 'error',
        field: 'blockerEta',
        fieldPath: stableFieldPath(issueIdentifier, 'blockerEta'),
        message: 'blockerEta is required when prMode=no_pr_yet',
        input: toInputValue(lane.blockerEta),
        normalized: null,
      });
    }
  }

  return {
    issueIdentifier,
    issueLink,
    priorityWeight,
    stalledMinutes,
    branch,
    fullSha,
    prMode,
    testCommand,
    artifactPath,
    dependencyIssueLinks,
    blockerOwner,
    blockerEta,
  };
}

function normalizeDependencyIssueIds(
  input: unknown,
  laneIndex: number,
  issueIdentifier: string,
  findings: SettlementDeliveryReadinessDigestFinding[],
): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized = new Set<string>();
  input.forEach((value) => {
    const raw = normalizeString(value);
    if (!raw) {
      pushFinding(findings, { issueIdentifier, laneIndex }, {
        code: 'INVALID_DEPENDENCY_ISSUE_ID',
        severity: 'error',
        field: 'dependencyIssueIds',
        fieldPath: stableFieldPath(issueIdentifier, 'dependencyIssueIds', '<empty>'),
        message: 'dependency issue identifier must be a non-empty string',
        input: toInputValue(value),
        normalized: null,
      });
      return;
    }

    const canonical = canonicalizeIssueReference(raw);
    if (!canonical) {
      pushFinding(findings, { issueIdentifier, laneIndex }, {
        code: 'INVALID_DEPENDENCY_ISSUE_ID',
        severity: 'error',
        field: 'dependencyIssueIds',
        fieldPath: stableFieldPath(issueIdentifier, 'dependencyIssueIds', raw),
        message: 'dependency issue identifier must reference an issue identifier (for example ONE-258)',
        input: raw,
        normalized: null,
      });
      return;
    }

    normalized.add(canonical);
    if (raw !== canonical && /[/:]/.test(raw)) {
      pushFinding(findings, { issueIdentifier, laneIndex }, {
        code: 'NON_CANONICAL_DEPENDENCY_ISSUE_LINK',
        severity: 'warning',
        field: 'dependencyIssueIds',
        fieldPath: stableFieldPath(issueIdentifier, 'dependencyIssueIds', canonical),
        message: `dependency issue link normalized to canonical format: ${canonical}`,
        input: raw,
        normalized: canonical,
      });
    }
  });

  return [...normalized].sort((left, right) => left.localeCompare(right));
}

function resolveRecommendation(
  rows: Array<{
    issueIdentifier: string;
    issueLink: string;
    prMode: DeliveryReadinessPrMode | null;
  }>,
  findingsByIssue: Map<string, SettlementDeliveryReadinessDigestFinding[]>,
  currentLaneIssueIdentifier: string | null,
): SettlementDeliveryReadinessDigest['recommendation'] {
  const firstLane = rows[0];
  if (!firstLane) {
    return {
      mode: 'no_viable_lane',
      issueIdentifier: null,
      issueLink: null,
      reason: 'no lanes available',
    };
  }

  const currentLane = currentLaneIssueIdentifier
    ? rows.find((row) => row.issueIdentifier === currentLaneIssueIdentifier) ?? firstLane
    : firstLane;
  const currentFindings = findingsByIssue.get(currentLane.issueIdentifier) ?? [];
  const currentHasUnresolvedBlocker = currentLane.prMode === 'no_pr_yet'
    && currentFindings.some((finding) => finding.code === 'MISSING_BLOCKER_OWNER' || finding.code === 'MISSING_BLOCKER_ETA');

  if (!currentHasUnresolvedBlocker) {
    return {
      mode: 'keep_current_lane',
      issueIdentifier: currentLane.issueIdentifier,
      issueLink: currentLane.issueLink,
      reason: 'current lane is actionable',
    };
  }

  const fallback = rows.find((row) => {
    if (row.issueIdentifier === currentLane.issueIdentifier) {
      return false;
    }
    const laneFindings = findingsByIssue.get(row.issueIdentifier) ?? [];
    return !laneFindings.some((finding) => finding.severity === 'error');
  });

  if (!fallback) {
    return {
      mode: 'no_viable_lane',
      issueIdentifier: null,
      issueLink: null,
      reason: `current lane ${currentLane.issueIdentifier} is blocked and no alternate lane passed required evidence checks`,
    };
  }

  return {
    mode: 'switch_lane',
    issueIdentifier: fallback.issueIdentifier,
    issueLink: fallback.issueLink,
    reason: `current lane ${currentLane.issueIdentifier} has prMode=no_pr_yet with unresolved blocker metadata`,
  };
}

function groupFindingsByIssue(
  findings: SettlementDeliveryReadinessDigestFinding[],
): Map<string, SettlementDeliveryReadinessDigestFinding[]> {
  const grouped = new Map<string, SettlementDeliveryReadinessDigestFinding[]>();
  findings.forEach((finding) => {
    const bucket = grouped.get(finding.issueIdentifier) ?? [];
    bucket.push(finding);
    grouped.set(finding.issueIdentifier, bucket);
  });
  return grouped;
}

function compareLane(left: NormalizedLane, right: NormalizedLane): number {
  if (left.priorityWeight !== right.priorityWeight) {
    return left.priorityWeight - right.priorityWeight;
  }
  if (left.stalledMinutes !== right.stalledMinutes) {
    return left.stalledMinutes - right.stalledMinutes;
  }
  return left.issueIdentifier.localeCompare(right.issueIdentifier);
}

function compareFinding(
  left: SettlementDeliveryReadinessDigestFinding,
  right: SettlementDeliveryReadinessDigestFinding,
): number {
  if (left.severityPriority !== right.severityPriority) {
    return left.severityPriority - right.severityPriority;
  }
  if (left.fieldPriority !== right.fieldPriority) {
    return left.fieldPriority - right.fieldPriority;
  }
  if (left.issueIdentifier !== right.issueIdentifier) {
    return left.issueIdentifier.localeCompare(right.issueIdentifier);
  }
  return left.fieldPath.localeCompare(right.fieldPath);
}

function pushFinding(
  findings: SettlementDeliveryReadinessDigestFinding[],
  scope: { issueIdentifier: string; laneIndex: number },
  finding: Omit<SettlementDeliveryReadinessDigestFinding, 'issueIdentifier' | 'severityPriority' | 'fieldPriority'>,
): void {
  findings.push({
    ...finding,
    issueIdentifier: scope.issueIdentifier,
    severityPriority: SEVERITY_PRIORITY[finding.severity],
    fieldPriority: FIELD_PRIORITY[finding.field] ?? 999,
  });
}

function normalizeIssueIdentifier(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  const matched = normalized.match(ISSUE_IDENTIFIER_PATTERN);
  if (!matched) {
    return null;
  }
  return `${matched[1].toUpperCase()}-${matched[2]}`;
}

function canonicalizeIssueReference(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const directIdentifier = normalizeIssueIdentifier(trimmed);
  if (directIdentifier) {
    return toCanonicalIssueLink(directIdentifier);
  }

  let pathname = trimmed;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      pathname = new URL(trimmed).pathname;
    }
  } catch {
    return null;
  }

  const canonical = pathname.match(/^\/([A-Za-z0-9]+)\/issues\/([A-Za-z0-9]+-\d+)$/);
  if (canonical) {
    const identifier = normalizeIssueIdentifier(canonical[2]);
    return identifier ? toCanonicalIssueLink(identifier) : null;
  }

  const loose = pathname.match(/^\/issues\/([A-Za-z0-9]+-\d+)$/);
  if (loose) {
    const identifier = normalizeIssueIdentifier(loose[1]);
    return identifier ? toCanonicalIssueLink(identifier) : null;
  }

  return null;
}

function toCanonicalIssueLink(issueIdentifier: string): string {
  const [companyPrefix] = issueIdentifier.split('-');
  return `/${companyPrefix}/issues/${issueIdentifier}`;
}

function isPrMode(value: string): value is DeliveryReadinessPrMode {
  return SETTLEMENT_DELIVERY_READINESS_PR_MODES.includes(value as DeliveryReadinessPrMode);
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
  return trimmed.length ? trimmed : null;
}

function normalizeInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function normalizeIsoDateTime(value: unknown): string | null {
  const candidate = normalizeString(value);
  if (!candidate) {
    return null;
  }
  const timestamp = Date.parse(candidate);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return new Date(timestamp).toISOString();
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

function stableFieldPath(issueIdentifier: string, field: string, suffix?: string): string {
  if (!suffix) {
    return `lanes:${issueIdentifier}.${field}`;
  }
  return `lanes:${issueIdentifier}.${field}:${suffix}`;
}
