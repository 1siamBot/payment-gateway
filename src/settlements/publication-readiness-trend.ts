export const SETTLEMENT_PUBLICATION_READINESS_GAP_CODES = [
  'MISSING_BRANCH',
  'MISSING_FULL_SHA',
  'MISSING_PR_OR_BLOCKER_PACKET',
  'MISSING_TEST_SUMMARY',
  'MISSING_ARTIFACT_LINK',
] as const;

export const SETTLEMENT_PUBLICATION_READINESS_STATES = [
  'ready',
  'blocked_publish',
  'missing_evidence',
] as const;

export type SettlementPublicationReadinessGapCode =
  (typeof SETTLEMENT_PUBLICATION_READINESS_GAP_CODES)[number];
export type SettlementPublicationReadinessState =
  (typeof SETTLEMENT_PUBLICATION_READINESS_STATES)[number];

export type SettlementPublicationReadinessTrend = {
  contract: 'settlement-publication-readiness-trend.v1';
  rows: Array<{
    issueId: string;
    windowStart: string;
    lanePriority: number;
    readinessState: SettlementPublicationReadinessState;
    gapCodes: SettlementPublicationReadinessGapCode[];
  }>;
  counters: {
    byGapCode: Record<SettlementPublicationReadinessGapCode, number>;
    byReadinessState: Record<SettlementPublicationReadinessState, number>;
  };
  metadata: {
    inputCount: number;
    acceptedCount: number;
    skippedCount: number;
  };
};

type NormalizedInputRow = {
  issueId: string;
  windowStart: string;
  lanePriority: number;
  branch: string | null;
  fullSha: string | null;
  prUrl: string | null;
  blockerPacketUrl: string | null;
  testSummary: string | null;
  artifactUrl: string | null;
};

export function buildSettlementPublicationReadinessTrend(input: {
  rows: unknown[];
}): SettlementPublicationReadinessTrend {
  const normalizedRows = input.rows
    .map((row) => normalizeRow(row))
    .filter((row): row is NormalizedInputRow => row !== null)
    .sort((left, right) => {
      if (left.windowStart !== right.windowStart) {
        return left.windowStart.localeCompare(right.windowStart);
      }
      if (left.lanePriority !== right.lanePriority) {
        return left.lanePriority - right.lanePriority;
      }
      return left.issueId.localeCompare(right.issueId);
    });

  const byGapCode = createGapCodeCounts();
  const byReadinessState = createReadinessStateCounts();

  const rows = normalizedRows.map((row) => {
    const gapCodes = classifyGapCodes(row);
    const readinessState = resolveReadinessState(gapCodes);

    gapCodes.forEach((code) => {
      byGapCode[code] += 1;
    });
    byReadinessState[readinessState] += 1;

    return {
      issueId: row.issueId,
      windowStart: row.windowStart,
      lanePriority: row.lanePriority,
      readinessState,
      gapCodes,
    };
  });

  return {
    contract: 'settlement-publication-readiness-trend.v1',
    rows,
    counters: {
      byGapCode,
      byReadinessState,
    },
    metadata: {
      inputCount: input.rows.length,
      acceptedCount: rows.length,
      skippedCount: input.rows.length - rows.length,
    },
  };
}

function normalizeRow(value: unknown): NormalizedInputRow | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const issueId = normalizeNonEmptyString(row.issueId);
  const lanePriority = normalizeInteger(row.lanePriority);
  const windowStart = normalizeIsoDateTime(row.windowStart);

  if (!issueId || lanePriority === null || !windowStart) {
    return null;
  }

  return {
    issueId,
    windowStart,
    lanePriority,
    branch: normalizeOptionalString(row.branch),
    fullSha: normalizeOptionalString(row.fullSha),
    prUrl: normalizeOptionalString(row.prUrl),
    blockerPacketUrl: normalizeOptionalString(row.blockerPacketUrl),
    testSummary: normalizeOptionalString(row.testSummary),
    artifactUrl: normalizeOptionalString(row.artifactUrl),
  };
}

function classifyGapCodes(row: NormalizedInputRow): SettlementPublicationReadinessGapCode[] {
  const gapCodes: SettlementPublicationReadinessGapCode[] = [];

  if (!row.branch) {
    gapCodes.push('MISSING_BRANCH');
  }
  if (!row.fullSha) {
    gapCodes.push('MISSING_FULL_SHA');
  }
  if (!row.prUrl && !row.blockerPacketUrl) {
    gapCodes.push('MISSING_PR_OR_BLOCKER_PACKET');
  }
  if (!row.testSummary) {
    gapCodes.push('MISSING_TEST_SUMMARY');
  }
  if (!row.artifactUrl) {
    gapCodes.push('MISSING_ARTIFACT_LINK');
  }

  return gapCodes;
}

function resolveReadinessState(
  gapCodes: SettlementPublicationReadinessGapCode[],
): SettlementPublicationReadinessState {
  if (gapCodes.length === 0) {
    return 'ready';
  }
  if (gapCodes.includes('MISSING_PR_OR_BLOCKER_PACKET')) {
    return 'blocked_publish';
  }
  return 'missing_evidence';
}

function createGapCodeCounts(): Record<SettlementPublicationReadinessGapCode, number> {
  return {
    MISSING_BRANCH: 0,
    MISSING_FULL_SHA: 0,
    MISSING_PR_OR_BLOCKER_PACKET: 0,
    MISSING_TEST_SUMMARY: 0,
    MISSING_ARTIFACT_LINK: 0,
  };
}

function createReadinessStateCounts(): Record<SettlementPublicationReadinessState, number> {
  return {
    ready: 0,
    blocked_publish: 0,
    missing_evidence: 0,
  };
}

function normalizeNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeOptionalString(value: unknown): string | null {
  return normalizeNonEmptyString(value);
}

function normalizeInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function normalizeIsoDateTime(value: unknown): string | null {
  const candidate = normalizeNonEmptyString(value);
  if (!candidate) {
    return null;
  }

  const timestamp = Date.parse(candidate);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}
