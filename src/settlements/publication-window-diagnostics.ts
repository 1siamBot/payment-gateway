import { createHash } from 'node:crypto';
import {
  SETTLEMENT_PUBLICATION_WINDOW_SCORE_BANDS,
  type SettlementPublicationWindowScoreBand,
} from './publication-window-plan';

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;

const DELTA_REASON_ORDER = [
  'lane_removed',
  'score_band_downgrade',
  'score_decrease',
  'window_rank_down',
  'lane_added',
  'score_band_upgrade',
  'score_increase',
  'window_rank_up',
  'no_change',
] as const;
type DeltaReasonCode = (typeof DELTA_REASON_ORDER)[number];

const GATE_REASON_ORDER = [
  'missing_evidence',
  'eta_drift',
  'dependency_open',
  'link_noncanonical',
  'artifact_gap',
] as const;
export type DependencyGateReasonCode = (typeof GATE_REASON_ORDER)[number];

type LaneSnapshot = {
  issueIdentifier: string;
  bundleCode: string;
  laneId: string;
  finalScore: number;
  scoreBand: SettlementPublicationWindowScoreBand;
  windowRank: number;
  dependencyGates: GateSnapshot[];
};

type GateSnapshot = {
  dependencyIssueIdentifier: string;
  status: 'resolved' | 'unresolved';
  unresolvedReason: string | null;
  issueLink: string;
  documentLink: string;
  commentLink: string | null;
  issueLinkNoncanonical: boolean;
  documentLinkNoncanonical: boolean;
  commentLinkNoncanonical: boolean;
};

type LaneDelta = {
  issueIdentifier: string;
  bundleCode: string;
  laneId: string;
  fieldPath: string;
  deltaSeverityWeight: number;
  scoreBandShiftWeight: number;
  scoreDelta: number;
  scoreBandFrom: SettlementPublicationWindowScoreBand | null;
  scoreBandTo: SettlementPublicationWindowScoreBand | null;
  windowRankFrom: number | null;
  windowRankTo: number | null;
  deltaReasonCodes: DeltaReasonCode[];
};

type DependencyGateDiagnostic = {
  issueIdentifier: string;
  bundleCode: string;
  fieldPath: string;
  dependencyIssueIdentifier: string;
  statusFrom: 'resolved' | 'unresolved' | null;
  statusTo: 'resolved' | 'unresolved' | null;
  issueLink: string;
  documentLink: string;
  commentLink: string | null;
  gateReasonCodes: DependencyGateReasonCode[];
};

export type SettlementPublicationWindowDiagnostics = {
  contract: 'settlement-publication-window-diagnostics.v1';
  generatedAt: string;
  laneDiagnostics: LaneDelta[];
  dependencyGateDiagnostics: DependencyGateDiagnostic[];
  fingerprint: string;
  metadata: {
    laneCount: number;
    deltaCount: number;
    dependencyGateCount: number;
    byGateReasonCode: Record<DependencyGateReasonCode, number>;
  };
};

export function buildSettlementPublicationWindowDiagnostics(input: {
  baselinePlan: Record<string, unknown>;
  candidatePlan: Record<string, unknown>;
  asOfIso?: string;
}): SettlementPublicationWindowDiagnostics {
  const generatedAt = toIsoOrNow(input.asOfIso);
  const baselineLanes = normalizePlan(input.baselinePlan);
  const candidateLanes = normalizePlan(input.candidatePlan);

  const laneMap = new Set<string>([...baselineLanes.keys(), ...candidateLanes.keys()]);
  const laneDiagnostics = [...laneMap]
    .map((laneKey) => buildLaneDelta(laneKey, baselineLanes.get(laneKey) ?? null, candidateLanes.get(laneKey) ?? null))
    .sort(compareLaneDelta);

  const dependencyGateDiagnostics = [...laneMap]
    .flatMap((laneKey) =>
      buildDependencyGateDiagnostics(
        baselineLanes.get(laneKey) ?? null,
        candidateLanes.get(laneKey) ?? null,
      ),
    )
    .sort(compareDependencyGateDiagnostic);

  const byGateReasonCode = createGateReasonCodeCounts();
  dependencyGateDiagnostics.forEach((diagnostic) => {
    diagnostic.gateReasonCodes.forEach((code) => {
      byGateReasonCode[code] += 1;
    });
  });

  const fingerprint = createHash('sha256')
    .update(
      JSON.stringify({
        contract: 'settlement-publication-window-diagnostics.v1',
        laneDiagnostics,
        dependencyGateDiagnostics,
      }),
    )
    .digest('hex');

  return {
    contract: 'settlement-publication-window-diagnostics.v1',
    generatedAt,
    laneDiagnostics,
    dependencyGateDiagnostics,
    fingerprint,
    metadata: {
      laneCount: laneMap.size,
      deltaCount: laneDiagnostics.length,
      dependencyGateCount: dependencyGateDiagnostics.length,
      byGateReasonCode,
    },
  };
}

function buildLaneDelta(laneKey: string, baseline: LaneSnapshot | null, candidate: LaneSnapshot | null): LaneDelta {
  const [fallbackIssueIdentifier, fallbackBundleCode] = laneKey.split('::');

  const issueIdentifier = candidate?.issueIdentifier ?? baseline?.issueIdentifier ?? fallbackIssueIdentifier ?? 'UNKNOWN-0';
  const bundleCode = candidate?.bundleCode ?? baseline?.bundleCode ?? fallbackBundleCode ?? 'bundle-unknown';
  const laneId = candidate?.laneId ?? baseline?.laneId ?? `${issueIdentifier}:${bundleCode}`;

  const scoreFrom = baseline?.finalScore ?? 0;
  const scoreTo = candidate?.finalScore ?? 0;
  const scoreDelta = scoreTo - scoreFrom;
  const scoreBandFrom = baseline?.scoreBand ?? null;
  const scoreBandTo = candidate?.scoreBand ?? null;
  const windowRankFrom = baseline?.windowRank ?? null;
  const windowRankTo = candidate?.windowRank ?? null;

  const deltaReasonCodes = resolveLaneDeltaReasonCodes({
    baselineExists: baseline !== null,
    candidateExists: candidate !== null,
    scoreDelta,
    scoreBandFrom,
    scoreBandTo,
    windowRankFrom,
    windowRankTo,
  });

  return {
    issueIdentifier,
    bundleCode,
    laneId,
    fieldPath: resolveLaneFieldPath(deltaReasonCodes),
    deltaSeverityWeight: resolveDeltaSeverityWeight(deltaReasonCodes),
    scoreBandShiftWeight: resolveScoreBandShiftWeight(scoreBandFrom, scoreBandTo),
    scoreDelta,
    scoreBandFrom,
    scoreBandTo,
    windowRankFrom,
    windowRankTo,
    deltaReasonCodes,
  };
}

function resolveLaneDeltaReasonCodes(input: {
  baselineExists: boolean;
  candidateExists: boolean;
  scoreDelta: number;
  scoreBandFrom: SettlementPublicationWindowScoreBand | null;
  scoreBandTo: SettlementPublicationWindowScoreBand | null;
  windowRankFrom: number | null;
  windowRankTo: number | null;
}): DeltaReasonCode[] {
  const reasons = new Set<DeltaReasonCode>();

  if (!input.baselineExists && input.candidateExists) {
    reasons.add('lane_added');
  }
  if (input.baselineExists && !input.candidateExists) {
    reasons.add('lane_removed');
  }

  if (input.scoreDelta > 0) {
    reasons.add('score_increase');
  } else if (input.scoreDelta < 0) {
    reasons.add('score_decrease');
  }

  const fromBandWeight = resolveScoreBandWeight(input.scoreBandFrom);
  const toBandWeight = resolveScoreBandWeight(input.scoreBandTo);
  if (toBandWeight < fromBandWeight) {
    reasons.add('score_band_upgrade');
  } else if (toBandWeight > fromBandWeight) {
    reasons.add('score_band_downgrade');
  }

  if (input.windowRankFrom !== null && input.windowRankTo !== null) {
    if (input.windowRankTo < input.windowRankFrom) {
      reasons.add('window_rank_up');
    } else if (input.windowRankTo > input.windowRankFrom) {
      reasons.add('window_rank_down');
    }
  }

  if (reasons.size === 0) {
    reasons.add('no_change');
  }

  return DELTA_REASON_ORDER.filter((code) => reasons.has(code));
}

function resolveLaneFieldPath(reasonCodes: DeltaReasonCode[]): string {
  if (reasonCodes.includes('lane_added') || reasonCodes.includes('lane_removed')) {
    return 'lane';
  }
  if (reasonCodes.includes('score_band_upgrade') || reasonCodes.includes('score_band_downgrade')) {
    return 'releaseBundleScore.scoreBand';
  }
  if (reasonCodes.includes('window_rank_up') || reasonCodes.includes('window_rank_down')) {
    return 'windowRank';
  }
  return 'releaseBundleScore.finalScore';
}

function resolveDeltaSeverityWeight(reasonCodes: DeltaReasonCode[]): number {
  if (reasonCodes.includes('lane_removed') || reasonCodes.includes('score_band_downgrade')) {
    return 1;
  }
  if (reasonCodes.includes('score_decrease') || reasonCodes.includes('window_rank_down')) {
    return 2;
  }
  if (reasonCodes.includes('no_change')) {
    return 3;
  }
  return 4;
}

function resolveScoreBandShiftWeight(
  fromBand: SettlementPublicationWindowScoreBand | null,
  toBand: SettlementPublicationWindowScoreBand | null,
): number {
  return Math.abs(resolveScoreBandWeight(toBand) - resolveScoreBandWeight(fromBand));
}

function resolveScoreBandWeight(scoreBand: SettlementPublicationWindowScoreBand | null): number {
  if (!scoreBand) {
    return -1;
  }
  return SETTLEMENT_PUBLICATION_WINDOW_SCORE_BANDS.indexOf(scoreBand);
}

function buildDependencyGateDiagnostics(
  baseline: LaneSnapshot | null,
  candidate: LaneSnapshot | null,
): DependencyGateDiagnostic[] {
  const issueIdentifier = candidate?.issueIdentifier ?? baseline?.issueIdentifier ?? 'UNKNOWN-0';
  const bundleCode = candidate?.bundleCode ?? baseline?.bundleCode ?? 'bundle-unknown';
  const baselineByDependency = toGateMap(baseline?.dependencyGates ?? []);
  const candidateByDependency = toGateMap(candidate?.dependencyGates ?? []);
  const gateKeys = new Set<string>([...baselineByDependency.keys(), ...candidateByDependency.keys()]);

  return [...gateKeys].map((dependencyIssueIdentifier) => {
    const fromGate = baselineByDependency.get(dependencyIssueIdentifier) ?? null;
    const toGate = candidateByDependency.get(dependencyIssueIdentifier) ?? null;
    const selectedGate = toGate ?? fromGate;
    const gateReasonCodes = normalizeGateReasonCodes(fromGate, toGate);

    return {
      issueIdentifier,
      bundleCode,
      fieldPath: 'dependencyGates',
      dependencyIssueIdentifier,
      statusFrom: fromGate?.status ?? null,
      statusTo: toGate?.status ?? null,
      issueLink: selectedGate?.issueLink ?? '',
      documentLink: selectedGate?.documentLink ?? '',
      commentLink: selectedGate?.commentLink ?? null,
      gateReasonCodes,
    };
  });
}

function normalizeGateReasonCodes(
  fromGate: GateSnapshot | null,
  toGate: GateSnapshot | null,
): DependencyGateReasonCode[] {
  const reasons = new Set<DependencyGateReasonCode>();
  const mergedReasonText = [fromGate?.unresolvedReason, toGate?.unresolvedReason]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase();

  if (mergedReasonText.includes('missing') && mergedReasonText.includes('evidence')) {
    reasons.add('missing_evidence');
  }
  if (mergedReasonText.includes('eta') || mergedReasonText.includes('drift')) {
    reasons.add('eta_drift');
  }
  if (mergedReasonText.includes('artifact') && (mergedReasonText.includes('gap') || mergedReasonText.includes('missing'))) {
    reasons.add('artifact_gap');
  }
  if ((fromGate?.status ?? null) === 'unresolved' || (toGate?.status ?? null) === 'unresolved') {
    reasons.add('dependency_open');
  }
  if (
    (fromGate?.issueLinkNoncanonical ?? false)
    || (fromGate?.documentLinkNoncanonical ?? false)
    || (fromGate?.commentLinkNoncanonical ?? false)
    || (toGate?.issueLinkNoncanonical ?? false)
    || (toGate?.documentLinkNoncanonical ?? false)
    || (toGate?.commentLinkNoncanonical ?? false)
  ) {
    reasons.add('link_noncanonical');
  }

  return GATE_REASON_ORDER.filter((code) => reasons.has(code));
}

function normalizePlan(value: Record<string, unknown>): Map<string, LaneSnapshot> {
  const plan = toRecord(value);
  const rawWindows = Array.isArray(plan.windows)
    ? plan.windows
    : Array.isArray(plan.entries)
      ? plan.entries
      : [];

  const normalized = rawWindows
    .map((item, index) => normalizeLane(item, index))
    .sort((left, right) => {
      const issueComparison = left.issueIdentifier.localeCompare(right.issueIdentifier);
      if (issueComparison !== 0) {
        return issueComparison;
      }
      return left.bundleCode.localeCompare(right.bundleCode);
    });

  return new Map(normalized.map((lane) => [laneKey(lane.issueIdentifier, lane.bundleCode), lane]));
}

function normalizeLane(value: unknown, index: number): LaneSnapshot {
  const lane = toRecord(value);
  const issueIdentifier = normalizeIssueIdentifier(lane.issueIdentifier) ?? `UNKNOWN-${index + 1}`;
  const bundleCode = normalizeString(lane.bundleCode ?? lane.artifactCode) ?? `bundle-${index + 1}`;
  const laneId = normalizeString(lane.laneId ?? lane.laneCode) ?? `${issueIdentifier}:${bundleCode}`;

  const releaseBundleScore = toRecord(lane.releaseBundleScore);
  const finalScore = clampScore(normalizeNumber(releaseBundleScore.finalScore ?? lane.finalScore, 0));
  const scoreBand = normalizeScoreBand(releaseBundleScore.scoreBand ?? lane.scoreBand, finalScore);
  const windowRank = normalizeWindowRank(lane, index);
  const dependencyGates = normalizeDependencyGates(lane.dependencyGates ?? lane.dependencies, issueIdentifier);

  return {
    issueIdentifier,
    bundleCode,
    laneId,
    finalScore,
    scoreBand,
    windowRank,
    dependencyGates,
  };
}

function normalizeDependencyGates(value: unknown, fallbackIssueIdentifier: string): GateSnapshot[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry, index) => normalizeDependencyGate(entry, fallbackIssueIdentifier, index))
    .sort((left, right) => left.dependencyIssueIdentifier.localeCompare(right.dependencyIssueIdentifier));
}

function normalizeDependencyGate(value: unknown, fallbackIssueIdentifier: string, index: number): GateSnapshot {
  const gate = toRecord(value);
  const dependencyIssueIdentifier = normalizeIssueIdentifier(gate.issueIdentifier) ?? `${fallbackIssueIdentifier}-${index + 1}`;
  const status = gate.status === 'resolved' ? 'resolved' : 'unresolved';
  const unresolvedReason = normalizeString(gate.unresolvedReason ?? gate.reason);
  const prefix = dependencyIssueIdentifier.split('-')[0] ?? 'ONE';
  const canonicalIssueLink = `/${prefix}/issues/${dependencyIssueIdentifier}`;
  const documentKey = normalizeDocumentKey(gate.documentKey, gate.documentLink);
  const canonicalDocumentLink = `${canonicalIssueLink}#document-${documentKey}`;
  const commentId = normalizeCommentId(gate.commentId, gate.commentLink);
  const canonicalCommentLink = commentId === null ? null : `${canonicalIssueLink}#comment-${commentId}`;

  const rawIssueLink = normalizeString(gate.issueLink);
  const rawDocumentLink = normalizeString(gate.documentLink);
  const rawCommentLink = normalizeString(gate.commentLink);

  return {
    dependencyIssueIdentifier,
    status,
    unresolvedReason: status === 'unresolved' ? unresolvedReason : null,
    issueLink: canonicalIssueLink,
    documentLink: canonicalDocumentLink,
    commentLink: canonicalCommentLink,
    issueLinkNoncanonical: rawIssueLink !== null && rawIssueLink !== canonicalIssueLink,
    documentLinkNoncanonical: rawDocumentLink !== null && rawDocumentLink !== canonicalDocumentLink,
    commentLinkNoncanonical: rawCommentLink !== null && rawCommentLink !== canonicalCommentLink,
  };
}

function normalizeDocumentKey(documentKeyValue: unknown, documentLinkValue: unknown): string {
  const direct = normalizeString(documentKeyValue);
  if (direct) {
    return direct;
  }
  const documentLink = normalizeString(documentLinkValue);
  if (!documentLink) {
    return 'plan';
  }
  const match = documentLink.match(/#document-([a-z0-9-]+)/i);
  return match ? match[1] : 'plan';
}

function normalizeCommentId(commentIdValue: unknown, commentLinkValue: unknown): number | null {
  if (typeof commentIdValue === 'number' && Number.isInteger(commentIdValue) && commentIdValue > 0) {
    return commentIdValue;
  }
  if (typeof commentIdValue === 'string') {
    const parsed = Number(commentIdValue);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  const commentLink = normalizeString(commentLinkValue);
  if (!commentLink) {
    return null;
  }
  const match = commentLink.match(/#comment-(\d+)/i);
  return match ? Number(match[1]) : null;
}

function normalizeScoreBand(value: unknown, finalScore: number): SettlementPublicationWindowScoreBand {
  if (value === 'ready_now' || value === 'ready_soon' || value === 'hold') {
    return value;
  }
  if (finalScore >= 85) {
    return 'ready_now';
  }
  if (finalScore >= 60) {
    return 'ready_soon';
  }
  return 'hold';
}

function normalizeWindowRank(lane: Record<string, unknown>, fallbackIndex: number): number {
  const directRank = normalizeNumber(
    lane.windowRank ?? lane.windowPriorityRank ?? lane.rank,
    fallbackIndex + 1,
  );
  return Math.max(1, Math.round(directRank));
}

function compareLaneDelta(left: LaneDelta, right: LaneDelta): number {
  if (left.deltaSeverityWeight !== right.deltaSeverityWeight) {
    return left.deltaSeverityWeight - right.deltaSeverityWeight;
  }
  if (left.scoreBandShiftWeight !== right.scoreBandShiftWeight) {
    return right.scoreBandShiftWeight - left.scoreBandShiftWeight;
  }
  const issueComparison = left.issueIdentifier.localeCompare(right.issueIdentifier);
  if (issueComparison !== 0) {
    return issueComparison;
  }
  const bundleComparison = left.bundleCode.localeCompare(right.bundleCode);
  if (bundleComparison !== 0) {
    return bundleComparison;
  }
  return left.fieldPath.localeCompare(right.fieldPath);
}

function compareDependencyGateDiagnostic(left: DependencyGateDiagnostic, right: DependencyGateDiagnostic): number {
  const issueComparison = left.issueIdentifier.localeCompare(right.issueIdentifier);
  if (issueComparison !== 0) {
    return issueComparison;
  }
  const bundleComparison = left.bundleCode.localeCompare(right.bundleCode);
  if (bundleComparison !== 0) {
    return bundleComparison;
  }
  const dependencyComparison = left.dependencyIssueIdentifier.localeCompare(right.dependencyIssueIdentifier);
  if (dependencyComparison !== 0) {
    return dependencyComparison;
  }
  return left.fieldPath.localeCompare(right.fieldPath);
}

function laneKey(issueIdentifier: string, bundleCode: string): string {
  return `${issueIdentifier}::${bundleCode}`;
}

function toGateMap(gates: GateSnapshot[]): Map<string, GateSnapshot> {
  return new Map(gates.map((gate) => [gate.dependencyIssueIdentifier, gate]));
}

function normalizeIssueIdentifier(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized || !ISSUE_IDENTIFIER_PATTERN.test(normalized)) {
    return null;
  }
  const match = normalized.match(ISSUE_IDENTIFIER_PATTERN);
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

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toIsoOrNow(value: unknown): string {
  const normalized = normalizeString(value);
  if (!normalized) {
    return new Date().toISOString();
  }
  const epoch = Date.parse(normalized);
  if (Number.isNaN(epoch)) {
    return new Date().toISOString();
  }
  return new Date(epoch).toISOString();
}

function createGateReasonCodeCounts(): Record<DependencyGateReasonCode, number> {
  return {
    missing_evidence: 0,
    eta_drift: 0,
    dependency_open: 0,
    link_noncanonical: 0,
    artifact_gap: 0,
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}
