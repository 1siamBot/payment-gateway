import { createHash } from 'node:crypto';

export const SETTLEMENT_PUBLICATION_WINDOW_SCORE_BANDS = ['ready_now', 'ready_soon', 'hold'] as const;

export type SettlementPublicationWindowScoreBand =
  (typeof SETTLEMENT_PUBLICATION_WINDOW_SCORE_BANDS)[number];

type ValidationError = {
  field: string;
  reason: 'required' | 'invalid_value';
  message: string;
};

type PublicationWindowEntry = {
  laneId: string;
  issueIdentifier: string;
  bundleCode: string;
  windowPriorityWeight: number;
  blockerRisk: number;
  etaDriftMinutes: number;
  releaseBundleScore: {
    completenessScore: number;
    blockerDriftPenalty: number;
    dependencyRiskPenalty: number;
    finalScore: number;
    scoreBand: SettlementPublicationWindowScoreBand;
  };
  dependencyGates: PublicationWindowDependencyGate[];
};

export type PublicationWindowDependencyGate = {
  issueIdentifier: string;
  status: 'resolved' | 'unresolved';
  unresolvedReason: string | null;
  issueLink: string;
  documentLink: string;
  commentLink: string | null;
};

export type SettlementPublicationWindowPlan = {
  contract: 'settlement-publication-window-plan.v1';
  generatedAt: string;
  windows: PublicationWindowEntry[];
  fingerprint: string;
  metadata: {
    windowCount: number;
    byScoreBand: Record<SettlementPublicationWindowScoreBand, number>;
    unresolvedDependencyCount: number;
  };
};

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;
const DOCUMENT_KEY_PATTERN = /^[a-z0-9-]+$/i;

export function buildSettlementPublicationWindowPlan(input: {
  manifest: Record<string, unknown>;
  asOfIso?: string;
}): SettlementPublicationWindowPlan {
  const errors: ValidationError[] = [];

  if (!input.manifest || typeof input.manifest !== 'object' || Array.isArray(input.manifest)) {
    errors.push({
      field: 'manifest',
      reason: 'required',
      message: 'manifest must be an object',
    });
  }

  const manifest = toRecord(input.manifest);
  const rawEntries = Array.isArray(manifest.entries) ? manifest.entries : [];
  if (!Array.isArray(manifest.entries)) {
    errors.push({
      field: 'manifest.entries',
      reason: 'required',
      message: 'manifest.entries must be an array',
    });
  }

  const generatedAt = normalizeIsoOrNull(input.asOfIso) ?? new Date().toISOString();

  const windows = rawEntries
    .map((entry, index) => normalizeEntry(entry, index, errors))
    .sort(comparePublicationWindows);

  if (errors.length > 0) {
    throw {
      status: 400,
      response: {
        code: 'SETTLEMENT_PUBLICATION_WINDOW_PLAN_VALIDATION_FAILED',
        message: 'publication window plan validation failed',
        errors: [...errors].sort((left, right) => left.field.localeCompare(right.field)),
      },
    };
  }

  const fingerprint = createHash('sha256')
    .update(
      JSON.stringify({
        contract: 'settlement-publication-window-plan.v1',
        windows,
      }),
    )
    .digest('hex');

  const byScoreBand = createScoreBandCounts();
  let unresolvedDependencyCount = 0;
  windows.forEach((window) => {
    byScoreBand[window.releaseBundleScore.scoreBand] += 1;
    unresolvedDependencyCount += window.dependencyGates.filter((gate) => gate.status === 'unresolved').length;
  });

  return {
    contract: 'settlement-publication-window-plan.v1',
    generatedAt,
    windows,
    fingerprint,
    metadata: {
      windowCount: windows.length,
      byScoreBand,
      unresolvedDependencyCount,
    },
  };
}

function normalizeEntry(entryValue: unknown, index: number, errors: ValidationError[]): PublicationWindowEntry {
  const entry = toRecord(entryValue);
  const issueIdentifier = normalizeIssueIdentifier(entry.issueIdentifier) ?? `UNKNOWN-${index + 1}`;
  const bundleCode = normalizeString(entry.bundleCode ?? entry.artifactCode) ?? `bundle-${index + 1}`;
  const laneId = normalizeString(entry.laneId ?? entry.laneCode) ?? `${issueIdentifier}:${bundleCode}`;

  const windowPriorityWeight = normalizeNumber(entry.windowPriorityWeight ?? entry.lanePriorityWeight, 999);
  const blockerRisk = normalizeNumber(entry.blockerRisk, 0);
  const etaDriftMinutes = normalizeNumber(entry.etaDriftMinutes ?? entry.deltaMinutes, 0);

  const completenessScore = resolveCompletenessScore(entry);
  const blockerDriftPenalty = resolveBlockerDriftPenalty(etaDriftMinutes);
  const dependencyGates = resolveDependencyGates(entry, issueIdentifier, bundleCode, errors);
  const dependencyRiskPenalty = resolveDependencyRiskPenalty(dependencyGates);
  const finalScore = clampScore(completenessScore - blockerDriftPenalty - dependencyRiskPenalty);

  return {
    laneId,
    issueIdentifier,
    bundleCode,
    windowPriorityWeight,
    blockerRisk,
    etaDriftMinutes,
    releaseBundleScore: {
      completenessScore,
      blockerDriftPenalty,
      dependencyRiskPenalty,
      finalScore,
      scoreBand: resolveScoreBand(finalScore),
    },
    dependencyGates,
  };
}

function resolveCompletenessScore(entry: Record<string, unknown>): number {
  const scopedEvidence = toRecord(entry.evidence);
  const completeness = toRecord(scopedEvidence.completeness);
  const completenessValues = Object.values(completeness).filter((value): value is boolean => typeof value === 'boolean');
  const normalizedMissing = Array.isArray(scopedEvidence.missingRequiredFields)
    ? scopedEvidence.missingRequiredFields.filter((item): item is string => typeof item === 'string')
    : [];
  const explicitCompleteFlag = typeof scopedEvidence.isComplete === 'boolean' ? scopedEvidence.isComplete : null;

  if (completenessValues.length > 0) {
    const trueCount = completenessValues.filter(Boolean).length;
    return Math.round((trueCount / completenessValues.length) * 100);
  }

  if (normalizedMissing.length > 0) {
    return clampScore(100 - normalizedMissing.length * 20);
  }

  if (explicitCompleteFlag === true) {
    return 100;
  }

  return 70;
}

function resolveBlockerDriftPenalty(etaDriftMinutes: number): number {
  if (etaDriftMinutes <= 0) {
    return 0;
  }
  return Math.min(40, Math.round(etaDriftMinutes / 15));
}

function resolveDependencyRiskPenalty(gates: PublicationWindowDependencyGate[]): number {
  if (gates.length === 0) {
    return 0;
  }
  const unresolved = gates.filter((gate) => gate.status === 'unresolved').length;
  return Math.min(45, unresolved * 15);
}

function resolveScoreBand(finalScore: number): SettlementPublicationWindowScoreBand {
  if (finalScore >= 85) {
    return 'ready_now';
  }
  if (finalScore >= 60) {
    return 'ready_soon';
  }
  return 'hold';
}

function resolveDependencyGates(
  entry: Record<string, unknown>,
  issueIdentifier: string,
  bundleCode: string,
  errors: ValidationError[],
): PublicationWindowDependencyGate[] {
  const rawGates = Array.isArray(entry.dependencyGates)
    ? entry.dependencyGates
    : Array.isArray(entry.dependencies)
      ? entry.dependencies
      : [];

  return rawGates.map((gateValue, gateIndex) => {
    const gate = toRecord(gateValue);
    const dependencyIssue = normalizeIssueIdentifier(gate.issueIdentifier);
    const status = normalizeGateStatus(gate.status);
    const unresolvedReason = normalizeString(gate.unresolvedReason ?? gate.reason);
    const documentKey = normalizeString(gate.documentKey) ?? 'plan';
    const commentId = normalizeCommentId(gate.commentId);

    const pathBase = `manifest.entries[${issueIdentifier}:${bundleCode}].dependencyGates[${gateIndex}]`;

    if (!dependencyIssue) {
      errors.push({
        field: `${pathBase}.issueIdentifier`,
        reason: 'required',
        message: 'dependency issueIdentifier must be a canonical issue identifier (e.g. ONE-269)',
      });
    }

    if (!DOCUMENT_KEY_PATTERN.test(documentKey)) {
      errors.push({
        field: `${pathBase}.documentKey`,
        reason: 'invalid_value',
        message: 'documentKey may only contain letters, digits, and dashes',
      });
    }

    if (status === 'unresolved' && !unresolvedReason) {
      errors.push({
        field: `${pathBase}.unresolvedReason`,
        reason: 'required',
        message: 'unresolved dependencies must include unresolvedReason',
      });
    }

    const canonicalIssueIdentifier = dependencyIssue ?? 'UNKNOWN-0';
    const prefix = canonicalIssueIdentifier.split('-')[0] ?? 'ONE';
    const issueLink = `/${prefix}/issues/${canonicalIssueIdentifier}`;

    return {
      issueIdentifier: canonicalIssueIdentifier,
      status,
      unresolvedReason: status === 'unresolved' ? unresolvedReason : null,
      issueLink,
      documentLink: `${issueLink}#document-${documentKey}`,
      commentLink: commentId === null ? null : `${issueLink}#comment-${commentId}`,
    };
  });
}

function comparePublicationWindows(left: PublicationWindowEntry, right: PublicationWindowEntry): number {
  if (left.windowPriorityWeight !== right.windowPriorityWeight) {
    return left.windowPriorityWeight - right.windowPriorityWeight;
  }
  if (left.blockerRisk !== right.blockerRisk) {
    return left.blockerRisk - right.blockerRisk;
  }
  if (left.etaDriftMinutes !== right.etaDriftMinutes) {
    return left.etaDriftMinutes - right.etaDriftMinutes;
  }
  const issueComparison = left.issueIdentifier.localeCompare(right.issueIdentifier);
  if (issueComparison !== 0) {
    return issueComparison;
  }
  return left.bundleCode.localeCompare(right.bundleCode);
}

function normalizeIssueIdentifier(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized || !ISSUE_IDENTIFIER_PATTERN.test(normalized)) {
    return null;
  }
  const matches = normalized.match(ISSUE_IDENTIFIER_PATTERN);
  if (!matches) {
    return null;
  }
  return `${matches[1].toUpperCase()}-${matches[2]}`;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNumber(value: unknown, fallback = 0): number {
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

function normalizeIsoOrNull(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  const epoch = Date.parse(normalized);
  if (Number.isNaN(epoch)) {
    return null;
  }
  return new Date(epoch).toISOString();
}

function normalizeCommentId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function normalizeGateStatus(value: unknown): 'resolved' | 'unresolved' {
  return value === 'resolved' ? 'resolved' : 'unresolved';
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function createScoreBandCounts(): Record<SettlementPublicationWindowScoreBand, number> {
  return {
    ready_now: 0,
    ready_soon: 0,
    hold: 0,
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}
