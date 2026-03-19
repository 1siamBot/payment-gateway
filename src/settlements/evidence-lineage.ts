import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

export const SETTLEMENT_EVIDENCE_LINEAGE_CONTRACT = 'settlement-evidence-lineage.v1' as const;
export const SETTLEMENT_EVIDENCE_LINEAGE_CURSOR_VERSION = 'v1' as const;

const SOURCE_TYPE_PRIORITY: Record<string, number> = {
  issue: 10,
  pull_request: 20,
  commit: 30,
  artifact: 40,
  note: 50,
};

export type SettlementEvidenceLineageValidationReasonCode =
  | 'INVALID_CURSOR_WINDOW'
  | 'MISSING_RESUME_ANCHOR'
  | 'LINEAGE_HASH_MISMATCH'
  | 'UNSUPPORTED_CURSOR_VERSION'
  | 'REQUIRED_FIELD'
  | 'INVALID_TYPE'
  | 'INVALID_VALUE';

export type SettlementEvidenceLineageValidationError = {
  field: string;
  reasonCode: SettlementEvidenceLineageValidationReasonCode;
  message: string;
};

export type SettlementEvidenceLineageContract = {
  contract: typeof SETTLEMENT_EVIDENCE_LINEAGE_CONTRACT;
  rows: Array<{
    lineageDepth: number;
    sourceType: string;
    sourceTypePriority: number;
    sourceIssueId: string;
    artifactPath: string | null;
    laneState: string;
    observedAt: string | null;
    rowCursor: string;
  }>;
  summary: {
    bySourceType: Record<string, number>;
    byLaneState: Record<string, number>;
    orphanArtifactCount: number;
  };
  cursor: {
    cursorVersion: typeof SETTLEMENT_EVIDENCE_LINEAGE_CURSOR_VERSION;
    cursorIssuedAt: string;
    resumeAfter: string | null;
    lineageHash: string;
    windowStart: string;
    windowEnd: string;
  };
};

type NormalizedRow = SettlementEvidenceLineageContract['rows'][number];

export function buildSettlementEvidenceLineage(input: {
  rows: unknown[];
  cursor?: unknown;
}): SettlementEvidenceLineageContract {
  const errors: SettlementEvidenceLineageValidationError[] = [];
  const rows = normalizeRows(input.rows, errors);
  const lineageHash = createLineageHash(rows);
  const cursor = normalizeCursor(input.cursor, rows, lineageHash, errors);

  if (errors.length > 0) {
    throw createValidationError(errors);
  }

  const replayRows = replayRowsFromAnchor(rows, cursor.resumeAfter);

  return {
    contract: SETTLEMENT_EVIDENCE_LINEAGE_CONTRACT,
    rows: replayRows,
    summary: {
      bySourceType: buildCounter(rows.map((row) => row.sourceType)),
      byLaneState: buildCounter(rows.map((row) => row.laneState)),
      orphanArtifactCount: rows.filter((row) => row.artifactPath === null).length,
    },
    cursor,
  };
}

function normalizeRows(
  input: unknown[],
  errors: SettlementEvidenceLineageValidationError[],
): NormalizedRow[] {
  const rows: NormalizedRow[] = [];

  input.forEach((rawRow, index) => {
    if (!rawRow || typeof rawRow !== 'object' || Array.isArray(rawRow)) {
      errors.push({
        field: `rows[${index}]`,
        reasonCode: 'INVALID_TYPE',
        message: 'row must be an object',
      });
      return;
    }

    const row = rawRow as Record<string, unknown>;
    const lineageDepth = normalizeFiniteInteger(row.lineageDepth);
    if (lineageDepth === null || lineageDepth < 0) {
      errors.push({
        field: `rows[${index}].lineageDepth`,
        reasonCode: 'INVALID_VALUE',
        message: 'lineageDepth must be a non-negative integer',
      });
      return;
    }

    const sourceType = normalizeNonEmptyString(row.sourceType);
    if (!sourceType) {
      errors.push({
        field: `rows[${index}].sourceType`,
        reasonCode: 'REQUIRED_FIELD',
        message: 'sourceType must be a non-empty string',
      });
      return;
    }

    const sourceIssueId = normalizeNonEmptyString(row.sourceIssueId);
    if (!sourceIssueId) {
      errors.push({
        field: `rows[${index}].sourceIssueId`,
        reasonCode: 'REQUIRED_FIELD',
        message: 'sourceIssueId must be a non-empty string',
      });
      return;
    }

    const artifactPath = normalizeOptionalString(row.artifactPath);
    const laneState = normalizeNonEmptyString(row.laneState) ?? 'unknown';
    const observedAt = normalizeOptionalIsoDateTime(row.observedAt, `rows[${index}].observedAt`, errors);
    const sourceTypePriority = SOURCE_TYPE_PRIORITY[sourceType] ?? 999;

    rows.push({
      lineageDepth,
      sourceType,
      sourceTypePriority,
      sourceIssueId,
      artifactPath,
      laneState,
      observedAt,
      rowCursor: createRowCursor({
        lineageDepth,
        sourceTypePriority,
        sourceIssueId,
        artifactPath,
      }),
    });
  });

  return rows.sort((left, right) => {
    if (left.lineageDepth !== right.lineageDepth) {
      return left.lineageDepth - right.lineageDepth;
    }
    if (left.sourceTypePriority !== right.sourceTypePriority) {
      return left.sourceTypePriority - right.sourceTypePriority;
    }
    if (left.sourceIssueId !== right.sourceIssueId) {
      return left.sourceIssueId.localeCompare(right.sourceIssueId);
    }
    if ((left.artifactPath ?? '') !== (right.artifactPath ?? '')) {
      return (left.artifactPath ?? '').localeCompare(right.artifactPath ?? '');
    }
    if (left.sourceType !== right.sourceType) {
      return left.sourceType.localeCompare(right.sourceType);
    }
    if (left.laneState !== right.laneState) {
      return left.laneState.localeCompare(right.laneState);
    }
    return (left.observedAt ?? '').localeCompare(right.observedAt ?? '');
  });
}

function normalizeCursor(
  input: unknown,
  rows: NormalizedRow[],
  lineageHash: string,
  errors: SettlementEvidenceLineageValidationError[],
): SettlementEvidenceLineageContract['cursor'] {
  const raw = (!input || typeof input !== 'object' || Array.isArray(input))
    ? {}
    : (input as Record<string, unknown>);

  const cursorVersion = normalizeNonEmptyString(raw.cursorVersion) ?? SETTLEMENT_EVIDENCE_LINEAGE_CURSOR_VERSION;
  if (cursorVersion !== SETTLEMENT_EVIDENCE_LINEAGE_CURSOR_VERSION) {
    errors.push({
      field: 'cursor.cursorVersion',
      reasonCode: 'UNSUPPORTED_CURSOR_VERSION',
      message: `cursorVersion must be ${SETTLEMENT_EVIDENCE_LINEAGE_CURSOR_VERSION}`,
    });
  }

  const observedInstants = rows
    .map((row) => row.observedAt)
    .filter((value): value is string => Boolean(value));
  const derivedWindowStart = observedInstants.length > 0 ? observedInstants[0] : '1970-01-01T00:00:00.000Z';
  const derivedWindowEnd = observedInstants.length > 0 ? observedInstants[observedInstants.length - 1] : '1970-01-01T00:00:00.000Z';

  const windowStart = normalizeOptionalIsoDateTime(raw.windowStart, 'cursor.windowStart', errors) ?? derivedWindowStart;
  const windowEnd = normalizeOptionalIsoDateTime(raw.windowEnd, 'cursor.windowEnd', errors) ?? derivedWindowEnd;

  if (windowStart.localeCompare(windowEnd) > 0) {
    errors.push({
      field: 'cursor.window',
      reasonCode: 'INVALID_CURSOR_WINDOW',
      message: 'windowStart must be less than or equal to windowEnd',
    });
  }

  const cursorIssuedAt = normalizeOptionalIsoDateTime(raw.cursorIssuedAt, 'cursor.cursorIssuedAt', errors) ?? windowEnd;

  const providedLineageHash = normalizeNonEmptyString(raw.lineageHash);
  if (providedLineageHash && providedLineageHash !== lineageHash) {
    errors.push({
      field: 'cursor.lineageHash',
      reasonCode: 'LINEAGE_HASH_MISMATCH',
      message: 'provided lineageHash does not match normalized lineage rows',
    });
  }

  const resumeAfter = normalizeOptionalString(raw.resumeAfter);
  if (resumeAfter && !rows.some((row) => row.rowCursor === resumeAfter)) {
    errors.push({
      field: 'cursor.resumeAfter',
      reasonCode: 'MISSING_RESUME_ANCHOR',
      message: 'resumeAfter anchor does not exist in normalized lineage rows',
    });
  }

  return {
    cursorVersion: SETTLEMENT_EVIDENCE_LINEAGE_CURSOR_VERSION,
    cursorIssuedAt,
    resumeAfter,
    lineageHash,
    windowStart,
    windowEnd,
  };
}

function replayRowsFromAnchor(rows: NormalizedRow[], resumeAfter: string | null): NormalizedRow[] {
  if (!resumeAfter) {
    return rows;
  }
  const anchorIndex = rows.findIndex((row) => row.rowCursor === resumeAfter);
  if (anchorIndex === -1) {
    return rows;
  }
  return rows.slice(anchorIndex + 1);
}

function buildCounter(values: string[]): Record<string, number> {
  const counters = new Map<string, number>();
  values.forEach((value) => {
    counters.set(value, (counters.get(value) ?? 0) + 1);
  });

  return [...counters.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .reduce<Record<string, number>>((acc, [key, count]) => {
      acc[key] = count;
      return acc;
    }, {});
}

function createLineageHash(rows: NormalizedRow[]): string {
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}

function createRowCursor(input: {
  lineageDepth: number;
  sourceTypePriority: number;
  sourceIssueId: string;
  artifactPath: string | null;
}): string {
  return `${input.lineageDepth}|${input.sourceTypePriority}|${input.sourceIssueId}|${input.artifactPath ?? ''}`;
}

function normalizeFiniteInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    return null;
  }
  return value;
}

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalString(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return normalizeNonEmptyString(value);
}

function normalizeIsoDateTime(value: unknown): string | null {
  const normalized = normalizeNonEmptyString(value);
  if (!normalized) {
    return null;
  }

  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function normalizeOptionalIsoDateTime(
  value: unknown,
  field: string,
  errors: SettlementEvidenceLineageValidationError[],
): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = normalizeIsoDateTime(value);
  if (!normalized) {
    errors.push({
      field,
      reasonCode: 'INVALID_CURSOR_WINDOW',
      message: 'must be an ISO-8601 datetime string when provided',
    });
    return null;
  }

  return normalized;
}

function createValidationError(errors: SettlementEvidenceLineageValidationError[]): BadRequestException {
  const ordered = [...errors].sort((left, right) => {
    if (left.field !== right.field) {
      return left.field.localeCompare(right.field);
    }
    if (left.reasonCode !== right.reasonCode) {
      return left.reasonCode.localeCompare(right.reasonCode);
    }
    return left.message.localeCompare(right.message);
  });

  return new BadRequestException({
    code: 'SETTLEMENT_EVIDENCE_LINEAGE_VALIDATION_FAILED',
    message: 'evidence lineage validation failed',
    errors: ordered,
  });
}
