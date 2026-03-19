import { createHash } from 'node:crypto';

export const SETTLEMENT_PUBLICATION_DIAGNOSTICS_TREND_RISK_REASON_CODES = [
  'spike_in_breaking_changes',
  'new_drift_code',
  'checksum_instability',
  'severity_escalation',
  'missing_snapshot_window',
] as const;

export const SETTLEMENT_PUBLICATION_DIAGNOSTICS_TREND_GATES = ['pass', 'warn', 'block'] as const;

type TrendRiskReasonCode = (typeof SETTLEMENT_PUBLICATION_DIAGNOSTICS_TREND_RISK_REASON_CODES)[number];
type TrendGate = (typeof SETTLEMENT_PUBLICATION_DIAGNOSTICS_TREND_GATES)[number];
type DriftSeverity = 'none' | 'low' | 'medium' | 'high';

type NormalizedSnapshotSummary = {
  sourceIssueIdentifier: string;
  snapshotSha256: string;
  generatedAt: string;
  driftSeverity: DriftSeverity;
  driftCodes: string[];
  breakingChangeCount: number;
  riskReasonCodes: TrendRiskReasonCode[];
};

export type SettlementPublicationDiagnosticsTrendDigest = {
  contract: 'settlement-publication-diagnostics-trend-digest.v1';
  trendDigest: {
    windowSize: number;
    windowFingerprint: string;
    stableSnapshotCount: number;
    driftSpikeCount: number;
    maxSeverity: DriftSeverity;
    regressionRiskScore: number;
    recommendedGate: TrendGate;
    rows: Array<{
      sourceIssueIdentifier: string;
      snapshotSha256: string;
      generatedAt: string;
      driftSeverity: DriftSeverity;
      driftCodes: string[];
      breakingChangeCount: number;
      riskReasonCodes: TrendRiskReasonCode[];
    }>;
  };
  regressionGateSummary: {
    windowSize: number;
    windowFingerprint: string;
    stableSnapshotCount: number;
    driftSpikeCount: number;
    maxSeverity: DriftSeverity;
    regressionRiskScore: number;
    recommendedGate: TrendGate;
    riskReasonCodes: TrendRiskReasonCode[];
  };
};

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

const SEVERITY_WEIGHT: Record<DriftSeverity, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};

export function buildSettlementPublicationDiagnosticsTrendDigest(input: {
  snapshotSummaries: unknown[];
}): SettlementPublicationDiagnosticsTrendDigest {
  const normalizedRows = input.snapshotSummaries
    .map((value, index) => normalizeSummary(value, index))
    .sort(compareSnapshotSummary);

  const rows = normalizedRows.map((row) => ({
    sourceIssueIdentifier: row.sourceIssueIdentifier,
    snapshotSha256: row.snapshotSha256,
    generatedAt: row.generatedAt,
    driftSeverity: row.driftSeverity,
    driftCodes: row.driftCodes,
    breakingChangeCount: row.breakingChangeCount,
    riskReasonCodes: row.riskReasonCodes,
  }));

  const stableSnapshotCount = normalizedRows.filter((row) => (
    row.breakingChangeCount === 0
    && row.driftCodes.length === 0
    && row.riskReasonCodes.length === 0
  )).length;

  const driftSpikeCount = normalizedRows.filter((row) => (
    row.breakingChangeCount > 0 || row.riskReasonCodes.includes('spike_in_breaking_changes')
  )).length;

  const maxSeverity = resolveMaxSeverity(normalizedRows);
  const regressionRiskScore = resolveRegressionRiskScore(
    normalizedRows,
    stableSnapshotCount,
    driftSpikeCount,
    maxSeverity,
  );
  const recommendedGate = resolveRecommendedGate(regressionRiskScore);
  const riskReasonCodes = collectWindowRiskReasonCodes(normalizedRows);

  const windowFingerprint = createHash('sha256').update(JSON.stringify({
    contract: 'settlement-publication-diagnostics-trend-digest.v1',
    rows,
    summary: {
      windowSize: rows.length,
      stableSnapshotCount,
      driftSpikeCount,
      maxSeverity,
      regressionRiskScore,
      recommendedGate,
      riskReasonCodes,
    },
  })).digest('hex');

  const digestSummary = {
    windowSize: rows.length,
    windowFingerprint,
    stableSnapshotCount,
    driftSpikeCount,
    maxSeverity,
    regressionRiskScore,
    recommendedGate,
  };

  return {
    contract: 'settlement-publication-diagnostics-trend-digest.v1',
    trendDigest: {
      ...digestSummary,
      rows,
    },
    regressionGateSummary: {
      ...digestSummary,
      riskReasonCodes,
    },
  };
}

function normalizeSummary(value: unknown, index: number): NormalizedSnapshotSummary {
  const row = toRecord(value);

  const sourceIssueIdentifier = normalizeIssueIdentifier(row.sourceIssueIdentifier)
    ?? normalizeIssueIdentifier(row.issueIdentifier)
    ?? `UNKNOWN-${index + 1}`;
  const snapshotSha256 = normalizeSha256(
    row.snapshotSha256 ?? row.snapshotChecksum ?? row.checksumSha256,
  ) ?? `missing-sha-${index + 1}`;
  const generatedAt = normalizeIsoDateTime(
    row.generatedAt ?? row.generatedAtIso ?? row.asOfIso,
  ) ?? '1970-01-01T00:00:00.000Z';
  const driftSeverity = normalizeDriftSeverity(
    row.driftSeverity ?? row.severity,
  ) ?? 'none';
  const driftCodes = normalizeCodeList(
    row.driftCodes ?? row.deltaCodes,
  );
  const breakingChangeCount = normalizeInteger(
    row.breakingChangeCount ?? row.breakingChanges,
  ) ?? 0;

  const riskReasonCodes = new Set<TrendRiskReasonCode>();
  const priorReasonCodes = [
    ...toArray(row.riskReasonCodes),
    ...toArray(row.reasonCodes),
    ...toArray(row.gateReasonCodes),
  ];
  priorReasonCodes.forEach((code) => {
    const mapped = normalizeRiskReasonCode(code);
    if (mapped) {
      riskReasonCodes.add(mapped);
    }
  });

  if (breakingChangeCount >= 2 || driftCodes.includes('breaking_change_spike')) {
    riskReasonCodes.add('spike_in_breaking_changes');
  }
  if (driftCodes.some((code) => code.startsWith('new_'))) {
    riskReasonCodes.add('new_drift_code');
  }
  if (!SHA256_PATTERN.test(snapshotSha256)) {
    riskReasonCodes.add('checksum_instability');
  }
  if (driftSeverity === 'high') {
    riskReasonCodes.add('severity_escalation');
  }
  if (sourceIssueIdentifier.startsWith('UNKNOWN-') || snapshotSha256.startsWith('missing-sha-')) {
    riskReasonCodes.add('missing_snapshot_window');
  }

  return {
    sourceIssueIdentifier,
    snapshotSha256,
    generatedAt,
    driftSeverity,
    driftCodes,
    breakingChangeCount,
    riskReasonCodes: SETTLEMENT_PUBLICATION_DIAGNOSTICS_TREND_RISK_REASON_CODES
      .filter((code) => riskReasonCodes.has(code)),
  };
}

function normalizeRiskReasonCode(value: unknown): TrendRiskReasonCode | null {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === 'spike_in_breaking_changes' || normalized === 'breaking_change_spike') {
    return 'spike_in_breaking_changes';
  }
  if (normalized === 'new_drift_code' || normalized === 'new_drift') {
    return 'new_drift_code';
  }
  if (normalized === 'checksum_instability' || normalized === 'checksum_mismatch' || normalized === 'hash_mismatch') {
    return 'checksum_instability';
  }
  if (normalized === 'severity_escalation' || normalized === 'severity_increase') {
    return 'severity_escalation';
  }
  if (normalized === 'missing_snapshot_window' || normalized === 'missing_window') {
    return 'missing_snapshot_window';
  }
  return null;
}

function collectWindowRiskReasonCodes(rows: NormalizedSnapshotSummary[]): TrendRiskReasonCode[] {
  const collected = new Set<TrendRiskReasonCode>();
  const seenDriftCodes = new Set<string>();
  const snapshotByIssue = new Map<string, string>();
  const maxSeenSeverityByIssue = new Map<string, number>();

  rows.forEach((row) => {
    row.riskReasonCodes.forEach((code) => collected.add(code));

    const previousSnapshotSha = snapshotByIssue.get(row.sourceIssueIdentifier);
    if (previousSnapshotSha && previousSnapshotSha !== row.snapshotSha256) {
      collected.add('checksum_instability');
    }
    snapshotByIssue.set(row.sourceIssueIdentifier, row.snapshotSha256);

    const previousSeverityWeight = maxSeenSeverityByIssue.get(row.sourceIssueIdentifier) ?? 0;
    const severityWeight = SEVERITY_WEIGHT[row.driftSeverity];
    if (severityWeight > previousSeverityWeight && previousSeverityWeight > 0) {
      collected.add('severity_escalation');
    }
    maxSeenSeverityByIssue.set(
      row.sourceIssueIdentifier,
      Math.max(previousSeverityWeight, severityWeight),
    );

    row.driftCodes.forEach((code) => {
      if (seenDriftCodes.size > 0 && !seenDriftCodes.has(code)) {
        collected.add('new_drift_code');
      }
      seenDriftCodes.add(code);
    });
  });

  return SETTLEMENT_PUBLICATION_DIAGNOSTICS_TREND_RISK_REASON_CODES
    .filter((code) => collected.has(code));
}

function resolveMaxSeverity(rows: NormalizedSnapshotSummary[]): DriftSeverity {
  if (!rows.length) {
    return 'none';
  }
  const maxWeight = Math.max(...rows.map((row) => SEVERITY_WEIGHT[row.driftSeverity]));
  if (maxWeight >= SEVERITY_WEIGHT.high) {
    return 'high';
  }
  if (maxWeight >= SEVERITY_WEIGHT.medium) {
    return 'medium';
  }
  if (maxWeight >= SEVERITY_WEIGHT.low) {
    return 'low';
  }
  return 'none';
}

function resolveRegressionRiskScore(
  rows: NormalizedSnapshotSummary[],
  stableSnapshotCount: number,
  driftSpikeCount: number,
  maxSeverity: DriftSeverity,
): number {
  if (!rows.length) {
    return 0;
  }
  const reasonCodeCount = collectWindowRiskReasonCodes(rows).length;
  const unstablePenalty = Math.max(rows.length - stableSnapshotCount, 0);
  const rawScore = (driftSpikeCount * 18)
    + (SEVERITY_WEIGHT[maxSeverity] * 14)
    + (reasonCodeCount * 10)
    + (unstablePenalty * 6);
  return Math.max(0, Math.min(100, rawScore));
}

function resolveRecommendedGate(regressionRiskScore: number): TrendGate {
  if (regressionRiskScore >= 70) {
    return 'block';
  }
  if (regressionRiskScore >= 35) {
    return 'warn';
  }
  return 'pass';
}

function compareSnapshotSummary(left: NormalizedSnapshotSummary, right: NormalizedSnapshotSummary): number {
  const issue = left.sourceIssueIdentifier.localeCompare(right.sourceIssueIdentifier);
  if (issue !== 0) {
    return issue;
  }
  const checksum = left.snapshotSha256.localeCompare(right.snapshotSha256);
  if (checksum !== 0) {
    return checksum;
  }
  return left.generatedAt.localeCompare(right.generatedAt);
}

function normalizeIssueIdentifier(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  const matches = normalized.match(ISSUE_IDENTIFIER_PATTERN);
  if (!matches) {
    return null;
  }
  return `${matches[1].toUpperCase()}-${matches[2]}`;
}

function normalizeSha256(value: unknown): string | null {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized || !SHA256_PATTERN.test(normalized)) {
    return null;
  }
  return normalized;
}

function normalizeDriftSeverity(value: unknown): DriftSeverity | null {
  const normalized = normalizeString(value)?.toLowerCase();
  if (
    normalized === 'none'
    || normalized === 'low'
    || normalized === 'medium'
    || normalized === 'high'
  ) {
    return normalized;
  }
  return null;
}

function normalizeCodeList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const unique = new Set<string>();
  value.forEach((entry) => {
    const code = normalizeString(entry)?.toLowerCase();
    if (code) {
      unique.add(code);
    }
  });
  return [...unique].sort((left, right) => left.localeCompare(right));
}

function normalizeInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }
  return null;
}

function normalizeIsoDateTime(value: unknown): string | null {
  const raw = normalizeString(value);
  if (!raw) {
    return null;
  }
  const timestamp = Date.parse(raw);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return new Date(timestamp).toISOString();
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
