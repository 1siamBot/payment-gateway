import { SettlementExceptionStatus } from '@prisma/client';

export const BULK_SETTLEMENT_PREVIEW_STATUS_BUCKETS = [
  SettlementExceptionStatus.OPEN,
  SettlementExceptionStatus.INVESTIGATING,
  SettlementExceptionStatus.RESOLVED,
  SettlementExceptionStatus.IGNORED,
] as const;

export const BULK_SETTLEMENT_PREVIEW_RISK_BUCKETS = ['low', 'medium', 'high', 'critical'] as const;

export type BulkSettlementPreviewStatusBucket = (typeof BULK_SETTLEMENT_PREVIEW_STATUS_BUCKETS)[number];
export type BulkSettlementPreviewRiskBucket = (typeof BULK_SETTLEMENT_PREVIEW_RISK_BUCKETS)[number];

export const BULK_SETTLEMENT_PREVIEW_WARNING_CODES = [
  'BSP-001_INVALID_ROW_SHAPE',
  'BSP-002_INVALID_EXCEPTION_ID',
  'BSP-003_DUPLICATE_EXCEPTION_ID',
  'BSP-004_INVALID_STATUS',
  'BSP-005_INVALID_DELTA_AMOUNT',
  'BSP-006_INVALID_RISK_BUCKET',
  'BSP-007_SELECTED_ID_NOT_FOUND',
] as const;

export type BulkSettlementPreviewWarningCode = (typeof BULK_SETTLEMENT_PREVIEW_WARNING_CODES)[number];

export const BULK_SETTLEMENT_ROLLBACK_REASON_CODES = [
  'MALFORMED_ROW',
  'STALE_VERSION_RISK',
  'MIXED_STATUS_SELECTION',
  'HIGH_DELTA_ANOMALY',
] as const;

export type BulkSettlementRollbackReasonCode = (typeof BULK_SETTLEMENT_ROLLBACK_REASON_CODES)[number];
export type BulkSettlementRollbackRecommendationClass =
  | 'safe_to_apply'
  | 'needs_review'
  | 'rollback_recommended';
export type BulkSettlementRollbackReasonSeverity = 'warning' | 'critical';

export const BULK_SETTLEMENT_PREVIEW_WARNING_HINTS: Record<BulkSettlementPreviewWarningCode, string> = {
  'BSP-001_INVALID_ROW_SHAPE': 'Provide each row as an object with id, status, deltaAmount, and optional riskBucket.',
  'BSP-002_INVALID_EXCEPTION_ID': 'Set row.id to a non-empty unique string.',
  'BSP-003_DUPLICATE_EXCEPTION_ID': 'De-duplicate rows so each exception id appears only once.',
  'BSP-004_INVALID_STATUS': 'Use one of OPEN, INVESTIGATING, RESOLVED, or IGNORED.',
  'BSP-005_INVALID_DELTA_AMOUNT': 'Set deltaAmount to a finite number value.',
  'BSP-006_INVALID_RISK_BUCKET': 'Use riskBucket as low, medium, high, or critical; omit to auto-classify.',
  'BSP-007_SELECTED_ID_NOT_FOUND': 'Ensure selectedExceptionIds only includes ids that exist in valid rows.',
};

export const BULK_SETTLEMENT_ROLLBACK_REASON_MAP: Record<
BulkSettlementRollbackReasonCode,
{
  severity: BulkSettlementRollbackReasonSeverity;
  description: string;
}
> = {
  MALFORMED_ROW: {
    severity: 'critical',
    description: 'Input contains malformed or invalid rows that may corrupt bulk-action outcomes.',
  },
  STALE_VERSION_RISK: {
    severity: 'warning',
    description: 'Selected rows are missing from validated input and may represent stale state.',
  },
  MIXED_STATUS_SELECTION: {
    severity: 'warning',
    description: 'Selected rows include multiple workflow statuses and may require operator review.',
  },
  HIGH_DELTA_ANOMALY: {
    severity: 'critical',
    description: 'Selection includes high/critical delta magnitudes that increase rollback risk.',
  },
};

export type BulkSettlementPreviewInput = {
  rows: unknown[];
  selectedExceptionIds: string[];
};

type BulkSettlementPreviewNormalizedRow = {
  exceptionId: string;
  status: BulkSettlementPreviewStatusBucket;
  riskBucket: BulkSettlementPreviewRiskBucket;
  deltaAmount: number;
};

export type BulkSettlementPreviewWarning = {
  code: BulkSettlementPreviewWarningCode;
  message: string;
  rowIndex: number | null;
  exceptionId: string | null;
  field: 'row' | 'id' | 'status' | 'deltaAmount' | 'riskBucket' | 'selection';
};

export type BulkSettlementPreviewSummary = {
  contract: 'settlement-bulk-preview-summary.v1';
  selection: {
    requestedCount: number;
    validCount: number;
    malformedCount: number;
    hasMismatch: boolean;
  };
  statusBuckets: Record<BulkSettlementPreviewStatusBucket, number>;
  riskBuckets: Record<BulkSettlementPreviewRiskBucket, number>;
  totals: {
    netDeltaAmount: number;
    absoluteDeltaAmount: number;
  };
};

export type BulkSettlementPreviewExportPayload = {
  contract: 'settlement-bulk-preview-export.v1';
  summary: BulkSettlementPreviewSummary;
  warningSummary: {
    hasWarnings: boolean;
    totalWarnings: number;
    byCode: Record<BulkSettlementPreviewWarningCode, number>;
  };
  warnings: BulkSettlementPreviewWarning[];
  csv: {
    columns: ['exceptionId', 'status', 'riskBucket', 'deltaAmount'];
    rows: string[][];
  };
  json: {
    selectedRows: BulkSettlementPreviewNormalizedRow[];
  };
};

export type BulkSettlementRollbackRecommendation = {
  contract: 'settlement-bulk-rollback-recommendation.v1';
  classification: BulkSettlementRollbackRecommendationClass;
  bucketCounts: Record<BulkSettlementRollbackRecommendationClass, number>;
  reasonCodes: BulkSettlementRollbackReasonCode[];
  reasonCodeMap: Array<{
    code: BulkSettlementRollbackReasonCode;
    severity: BulkSettlementRollbackReasonSeverity;
    description: string;
  }>;
};

export function buildBulkSettlementActionPreviewSummary(
  input: BulkSettlementPreviewInput,
): BulkSettlementPreviewSummary {
  const built = buildPreviewArtifacts(input);
  return built.summary;
}

export function buildBulkSettlementActionPreviewExport(
  input: BulkSettlementPreviewInput,
): BulkSettlementPreviewExportPayload {
  const built = buildPreviewArtifacts(input);

  const byCode = createZeroWarningCodeMap();
  for (const warning of built.warnings) {
    byCode[warning.code] += 1;
  }

  return {
    contract: 'settlement-bulk-preview-export.v1',
    summary: built.summary,
    warningSummary: {
      hasWarnings: built.warnings.length > 0,
      totalWarnings: built.warnings.length,
      byCode,
    },
    warnings: built.warnings,
    csv: {
      columns: ['exceptionId', 'status', 'riskBucket', 'deltaAmount'],
      rows: built.selectedRows.map((row) => [
        row.exceptionId,
        row.status,
        row.riskBucket,
        row.deltaAmount.toFixed(2),
      ]),
    },
    json: {
      selectedRows: built.selectedRows,
    },
  };
}

export function buildBulkSettlementRollbackRecommendation(
  input: BulkSettlementPreviewInput,
): BulkSettlementRollbackRecommendation {
  const built = buildPreviewArtifacts(input);
  const presentReasons = new Set<BulkSettlementRollbackReasonCode>();

  const hasMalformedRow = built.warnings.some(
    (warning) => warning.code !== 'BSP-007_SELECTED_ID_NOT_FOUND',
  );
  if (hasMalformedRow) {
    presentReasons.add('MALFORMED_ROW');
  }

  const hasStaleSelection = built.warnings.some(
    (warning) => warning.code === 'BSP-007_SELECTED_ID_NOT_FOUND',
  );
  if (hasStaleSelection) {
    presentReasons.add('STALE_VERSION_RISK');
  }

  const activeStatusCount = BULK_SETTLEMENT_PREVIEW_STATUS_BUCKETS
    .map((status) => built.summary.statusBuckets[status])
    .filter((count) => count > 0).length;
  if (activeStatusCount >= 2) {
    presentReasons.add('MIXED_STATUS_SELECTION');
  }

  const hasHighDeltaAnomaly = built.summary.riskBuckets.high > 0 || built.summary.riskBuckets.critical > 0;
  if (hasHighDeltaAnomaly) {
    presentReasons.add('HIGH_DELTA_ANOMALY');
  }

  const reasonCodes = BULK_SETTLEMENT_ROLLBACK_REASON_CODES.filter((code) => presentReasons.has(code));

  const hasCriticalReason = reasonCodes.some((code) => BULK_SETTLEMENT_ROLLBACK_REASON_MAP[code].severity === 'critical');
  const hasWarningReason = reasonCodes.some((code) => BULK_SETTLEMENT_ROLLBACK_REASON_MAP[code].severity === 'warning');

  const classification: BulkSettlementRollbackRecommendationClass = hasCriticalReason
    ? 'rollback_recommended'
    : hasWarningReason
      ? 'needs_review'
      : 'safe_to_apply';

  return {
    contract: 'settlement-bulk-rollback-recommendation.v1',
    classification,
    bucketCounts: {
      safe_to_apply: classification === 'safe_to_apply' ? 1 : 0,
      needs_review: classification === 'needs_review' ? 1 : 0,
      rollback_recommended: classification === 'rollback_recommended' ? 1 : 0,
    },
    reasonCodes,
    reasonCodeMap: BULK_SETTLEMENT_ROLLBACK_REASON_CODES.map((code) => ({
      code,
      severity: BULK_SETTLEMENT_ROLLBACK_REASON_MAP[code].severity,
      description: BULK_SETTLEMENT_ROLLBACK_REASON_MAP[code].description,
    })),
  };
}

function buildPreviewArtifacts(input: BulkSettlementPreviewInput): {
  summary: BulkSettlementPreviewSummary;
  selectedRows: BulkSettlementPreviewNormalizedRow[];
  warnings: BulkSettlementPreviewWarning[];
} {
  const selectedIds = normalizeSelectedIds(input.selectedExceptionIds);
  const selectedIdSet = new Set(selectedIds);
  const warnings: BulkSettlementPreviewWarning[] = [];

  const rowMap = new Map<string, BulkSettlementPreviewNormalizedRow>();

  input.rows.forEach((rawRow, rowIndex) => {
    if (!rawRow || typeof rawRow !== 'object' || Array.isArray(rawRow)) {
      warnings.push({
        code: 'BSP-001_INVALID_ROW_SHAPE',
        message: 'Row must be a non-null object.',
        rowIndex,
        exceptionId: null,
        field: 'row',
      });
      return;
    }

    const row = rawRow as Record<string, unknown>;

    const id = normalizeNonEmptyString(row.id);
    if (!id) {
      warnings.push({
        code: 'BSP-002_INVALID_EXCEPTION_ID',
        message: 'Row.id must be a non-empty string.',
        rowIndex,
        exceptionId: null,
        field: 'id',
      });
      return;
    }

    if (rowMap.has(id)) {
      warnings.push({
        code: 'BSP-003_DUPLICATE_EXCEPTION_ID',
        message: 'Duplicate row id detected. Later duplicates are ignored.',
        rowIndex,
        exceptionId: id,
        field: 'id',
      });
      return;
    }

    const status = normalizeStatus(row.status);
    if (!status) {
      warnings.push({
        code: 'BSP-004_INVALID_STATUS',
        message: 'Row.status must be one of OPEN, INVESTIGATING, RESOLVED, IGNORED.',
        rowIndex,
        exceptionId: id,
        field: 'status',
      });
      return;
    }

    const deltaAmount = normalizeFiniteNumber(row.deltaAmount);
    if (deltaAmount === null) {
      warnings.push({
        code: 'BSP-005_INVALID_DELTA_AMOUNT',
        message: 'Row.deltaAmount must be a finite number.',
        rowIndex,
        exceptionId: id,
        field: 'deltaAmount',
      });
      return;
    }

    const riskBucketInput = normalizeNonEmptyString(row.riskBucket);
    const riskBucket = riskBucketInput
      ? normalizeRiskBucket(riskBucketInput)
      : classifyRiskBucket(deltaAmount);

    if (!riskBucket) {
      warnings.push({
        code: 'BSP-006_INVALID_RISK_BUCKET',
        message: 'Row.riskBucket must be one of low, medium, high, critical.',
        rowIndex,
        exceptionId: id,
        field: 'riskBucket',
      });
      return;
    }

    rowMap.set(id, {
      exceptionId: id,
      status,
      riskBucket,
      deltaAmount,
    });
  });

  for (const selectedId of selectedIds) {
    if (!rowMap.has(selectedId)) {
      warnings.push({
        code: 'BSP-007_SELECTED_ID_NOT_FOUND',
        message: 'Selected id was not found in valid rows.',
        rowIndex: null,
        exceptionId: selectedId,
        field: 'selection',
      });
    }
  }

  const selectedRows = [...rowMap.values()]
    .filter((row) => selectedIdSet.has(row.exceptionId))
    .sort((left, right) => left.exceptionId.localeCompare(right.exceptionId));

  const statusBuckets = createZeroStatusBuckets();
  const riskBuckets = createZeroRiskBuckets();

  let netDeltaAmount = 0;
  let absoluteDeltaAmount = 0;
  for (const row of selectedRows) {
    statusBuckets[row.status] += 1;
    riskBuckets[row.riskBucket] += 1;
    netDeltaAmount += row.deltaAmount;
    absoluteDeltaAmount += Math.abs(row.deltaAmount);
  }

  const malformedCount = selectedIds.length - selectedRows.length;

  warnings.sort((left, right) => {
    if (left.code !== right.code) {
      return left.code.localeCompare(right.code);
    }

    const leftIndex = left.rowIndex ?? Number.POSITIVE_INFINITY;
    const rightIndex = right.rowIndex ?? Number.POSITIVE_INFINITY;
    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return (left.exceptionId ?? '').localeCompare(right.exceptionId ?? '');
  });

  return {
    summary: {
      contract: 'settlement-bulk-preview-summary.v1',
      selection: {
        requestedCount: selectedIds.length,
        validCount: selectedRows.length,
        malformedCount,
        hasMismatch: malformedCount > 0,
      },
      statusBuckets,
      riskBuckets,
      totals: {
        netDeltaAmount,
        absoluteDeltaAmount,
      },
    },
    selectedRows,
    warnings,
  };
}

function normalizeSelectedIds(values: string[]): string[] {
  const selected = new Set<string>();
  for (const value of values) {
    const normalized = normalizeNonEmptyString(value);
    if (!normalized) {
      continue;
    }
    selected.add(normalized);
  }
  return [...selected].sort((left, right) => left.localeCompare(right));
}

function createZeroStatusBuckets(): Record<BulkSettlementPreviewStatusBucket, number> {
  return {
    OPEN: 0,
    INVESTIGATING: 0,
    RESOLVED: 0,
    IGNORED: 0,
  };
}

function createZeroRiskBuckets(): Record<BulkSettlementPreviewRiskBucket, number> {
  return {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
}

function createZeroWarningCodeMap(): Record<BulkSettlementPreviewWarningCode, number> {
  return {
    'BSP-001_INVALID_ROW_SHAPE': 0,
    'BSP-002_INVALID_EXCEPTION_ID': 0,
    'BSP-003_DUPLICATE_EXCEPTION_ID': 0,
    'BSP-004_INVALID_STATUS': 0,
    'BSP-005_INVALID_DELTA_AMOUNT': 0,
    'BSP-006_INVALID_RISK_BUCKET': 0,
    'BSP-007_SELECTED_ID_NOT_FOUND': 0,
  };
}

function normalizeStatus(value: unknown): BulkSettlementPreviewStatusBucket | null {
  if (
    value === SettlementExceptionStatus.OPEN
    || value === SettlementExceptionStatus.INVESTIGATING
    || value === SettlementExceptionStatus.RESOLVED
    || value === SettlementExceptionStatus.IGNORED
  ) {
    return value;
  }

  return null;
}

function normalizeRiskBucket(value: string): BulkSettlementPreviewRiskBucket | null {
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'critical') {
    return value;
  }

  return null;
}

function classifyRiskBucket(deltaAmount: number): BulkSettlementPreviewRiskBucket {
  const absDelta = Math.abs(deltaAmount);

  if (absDelta >= 25) {
    return 'critical';
  }

  if (absDelta >= 15) {
    return 'high';
  }

  if (absDelta >= 5) {
    return 'medium';
  }

  return 'low';
}

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeFiniteNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return value;
}
