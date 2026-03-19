import { createHash } from 'node:crypto';
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
export const BULK_SETTLEMENT_TRIAGE_SNAPSHOT_SEVERITY_BUCKETS = ['warning', 'critical'] as const;
export type BulkSettlementTriageSnapshotSeverityBucket =
  (typeof BULK_SETTLEMENT_TRIAGE_SNAPSHOT_SEVERITY_BUCKETS)[number];

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

export const BULK_SETTLEMENT_SIMULATION_OUTCOME_BUCKETS = [
  'success_projection',
  'conflict_projection',
  'rollback_recommended',
] as const;

export type BulkSettlementSimulationOutcomeBucket =
  (typeof BULK_SETTLEMENT_SIMULATION_OUTCOME_BUCKETS)[number];

export type BulkSettlementRollbackPlan = {
  contract: 'settlement-bulk-rollback-plan.v1';
  recommended: boolean;
  reasonCodes: BulkSettlementRollbackReasonCode[];
  reasonCodeMap: Array<{
    code: BulkSettlementRollbackReasonCode;
    severity: BulkSettlementRollbackReasonSeverity;
    description: string;
    stepHint: string;
  }>;
  stepHints: string[];
};

export type BulkSettlementActionSimulation = {
  contract: 'settlement-bulk-action-simulation.v1';
  selectedCount: number;
  outcomeBuckets: Record<BulkSettlementSimulationOutcomeBucket, string[]>;
  outcomeCounts: Record<BulkSettlementSimulationOutcomeBucket, number>;
  results: Array<{
    exceptionId: string;
    outcome: BulkSettlementSimulationOutcomeBucket;
    reasonCodes: BulkSettlementRollbackReasonCode[];
    stepHints: string[];
  }>;
  rollbackPlan: BulkSettlementRollbackPlan;
  metadata: {
    requestedCount: number;
    validCount: number;
    malformedCount: number;
    warningCount: number;
    warningByCode: Record<BulkSettlementPreviewWarningCode, number>;
  };
};

export type BulkSettlementTriageSnapshot = {
  contract: 'settlement-bulk-triage-snapshot.v1';
  selectedCount: number;
  byReason: Record<BulkSettlementRollbackReasonCode, number>;
  bySeverity: Record<BulkSettlementTriageSnapshotSeverityBucket, number>;
  topAnomalies: Array<{
    reasonCode: BulkSettlementRollbackReasonCode;
    severity: BulkSettlementRollbackReasonSeverity;
    count: number;
    description: string;
  }>;
  generatedAt: string;
  metadata: {
    reasonSeverityMap: Array<{
      code: BulkSettlementRollbackReasonCode;
      severity: BulkSettlementRollbackReasonSeverity;
      description: string;
    }>;
  };
};

export const SETTLEMENT_EXPLAINABILITY_SEVERITY_WINDOWS = ['warning', 'critical'] as const;
export type SettlementExplainabilitySeverityWindow =
  (typeof SETTLEMENT_EXPLAINABILITY_SEVERITY_WINDOWS)[number];

export const SETTLEMENT_EXPLAINABILITY_PROFILE_VALIDATION_REASON_CODES = [
  'BEP-001_INVALID_PRESET_SLOTS',
  'BEP-002_INVALID_PRESET_KEY',
  'BEP-003_DUPLICATE_PRESET_KEY',
  'BEP-004_INVALID_REASON_BUCKET',
  'BEP-005_INVALID_SEVERITY_WINDOW',
  'BEP-006_INVALID_DEFAULT_SELECTION',
  'BEP-007_PARTIAL_PRESET_SELECTION',
] as const;

export type SettlementExplainabilityProfileValidationReasonCode =
  (typeof SETTLEMENT_EXPLAINABILITY_PROFILE_VALIDATION_REASON_CODES)[number];

export type SettlementExplainabilityPresetSlot = {
  key: string;
  label: string;
  reasonBuckets: Record<BulkSettlementRollbackReasonCode, boolean>;
  severityWindows: Record<SettlementExplainabilitySeverityWindow, boolean>;
  isDefault: boolean;
};

export type SettlementExplainabilityPresetProfile = {
  contract: 'settlement-explainability-preset-profile.v1';
  presetSlots: SettlementExplainabilityPresetSlot[];
  reasonBuckets: Array<{
    code: BulkSettlementRollbackReasonCode;
    severity: BulkSettlementRollbackReasonSeverity;
    description: string;
  }>;
  severityWindows: Array<{
    code: SettlementExplainabilitySeverityWindow;
    label: string;
    description: string;
  }>;
  defaultSelection: {
    presetSlotKey: string;
    reasonBuckets: Record<BulkSettlementRollbackReasonCode, boolean>;
    severityWindows: Record<SettlementExplainabilitySeverityWindow, boolean>;
  };
  metadata: {
    validationReasonCodes: SettlementExplainabilityProfileValidationReasonCode[];
  };
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

export function buildBulkSettlementActionSimulation(
  input: BulkSettlementPreviewInput,
): BulkSettlementActionSimulation {
  const built = buildPreviewArtifacts(input);
  const recommendation = buildBulkSettlementRollbackRecommendation(input);
  const selectedRowsById = new Map(built.selectedRows.map((row) => [row.exceptionId, row]));
  const staleIds = new Set(
    built.warnings
      .filter((warning) => warning.code === 'BSP-007_SELECTED_ID_NOT_FOUND')
      .map((warning) => warning.exceptionId)
      .filter((value): value is string => Boolean(value)),
  );
  const hasMalformedRow = built.warnings.some((warning) => warning.code !== 'BSP-007_SELECTED_ID_NOT_FOUND');

  const results = normalizeSelectedIds(input.selectedExceptionIds).map((exceptionId) => {
    const row = selectedRowsById.get(exceptionId);
    const reasonCodes = new Set<BulkSettlementRollbackReasonCode>();

    if (!row || staleIds.has(exceptionId)) {
      reasonCodes.add('STALE_VERSION_RISK');
    } else {
      if (row.riskBucket === 'high' || row.riskBucket === 'critical') {
        reasonCodes.add('HIGH_DELTA_ANOMALY');
      }
      if (hasMalformedRow) {
        reasonCodes.add('MALFORMED_ROW');
      }
      if (row.status !== SettlementExceptionStatus.OPEN) {
        reasonCodes.add('MIXED_STATUS_SELECTION');
      }
    }

    const orderedReasonCodes = BULK_SETTLEMENT_ROLLBACK_REASON_CODES.filter((code) => reasonCodes.has(code));
    const outcome = classifySimulationOutcome(orderedReasonCodes);
    const stepHints = orderedReasonCodes.map((code) => BULK_SETTLEMENT_ROLLBACK_STEP_HINTS[code]);

    return {
      exceptionId,
      outcome,
      reasonCodes: orderedReasonCodes,
      stepHints,
    };
  });

  const outcomeBuckets = createZeroSimulationOutcomeBuckets();
  for (const result of results) {
    outcomeBuckets[result.outcome].push(result.exceptionId);
  }

  const warningByCode = createZeroWarningCodeMap();
  for (const warning of built.warnings) {
    warningByCode[warning.code] += 1;
  }

  const rollbackPlanStepHints = recommendation.reasonCodes.map((code) => BULK_SETTLEMENT_ROLLBACK_STEP_HINTS[code]);

  return {
    contract: 'settlement-bulk-action-simulation.v1',
    selectedCount: built.summary.selection.validCount,
    outcomeBuckets,
    outcomeCounts: {
      success_projection: outcomeBuckets.success_projection.length,
      conflict_projection: outcomeBuckets.conflict_projection.length,
      rollback_recommended: outcomeBuckets.rollback_recommended.length,
    },
    results,
    rollbackPlan: {
      contract: 'settlement-bulk-rollback-plan.v1',
      recommended: recommendation.classification === 'rollback_recommended',
      reasonCodes: recommendation.reasonCodes,
      reasonCodeMap: recommendation.reasonCodeMap.map((reason) => ({
        ...reason,
        stepHint: BULK_SETTLEMENT_ROLLBACK_STEP_HINTS[reason.code],
      })),
      stepHints: rollbackPlanStepHints,
    },
    metadata: {
      requestedCount: built.summary.selection.requestedCount,
      validCount: built.summary.selection.validCount,
      malformedCount: built.summary.selection.malformedCount,
      warningCount: built.warnings.length,
      warningByCode,
    },
  };
}

export function buildBulkSettlementTriageSnapshot(
  input: BulkSettlementPreviewInput,
): BulkSettlementTriageSnapshot {
  const built = buildPreviewArtifacts(input);
  const byReason = createZeroRollbackReasonMap();
  const nonStaleWarningCount = built.warnings.filter(
    (warning) => warning.code !== 'BSP-007_SELECTED_ID_NOT_FOUND',
  ).length;
  const staleSelectionCount = built.warnings.filter(
    (warning) => warning.code === 'BSP-007_SELECTED_ID_NOT_FOUND',
  ).length;
  const activeStatusCount = BULK_SETTLEMENT_PREVIEW_STATUS_BUCKETS
    .map((status) => built.summary.statusBuckets[status])
    .filter((count) => count > 0).length;
  const mixedStatusCount = activeStatusCount >= 2 ? activeStatusCount - 1 : 0;
  const highDeltaAnomalyCount = built.summary.riskBuckets.high + built.summary.riskBuckets.critical;

  byReason.MALFORMED_ROW = nonStaleWarningCount;
  byReason.STALE_VERSION_RISK = staleSelectionCount;
  byReason.MIXED_STATUS_SELECTION = mixedStatusCount;
  byReason.HIGH_DELTA_ANOMALY = highDeltaAnomalyCount;

  const bySeverity = createZeroSnapshotSeverityBuckets();
  for (const reasonCode of BULK_SETTLEMENT_ROLLBACK_REASON_CODES) {
    const severity = BULK_SETTLEMENT_ROLLBACK_REASON_MAP[reasonCode].severity;
    bySeverity[severity] += byReason[reasonCode];
  }

  const topAnomalies = BULK_SETTLEMENT_ROLLBACK_REASON_CODES
    .filter((reasonCode) => byReason[reasonCode] > 0)
    .map((reasonCode) => ({
      reasonCode,
      severity: BULK_SETTLEMENT_ROLLBACK_REASON_MAP[reasonCode].severity,
      count: byReason[reasonCode],
      description: BULK_SETTLEMENT_ROLLBACK_REASON_MAP[reasonCode].description,
    }))
    .sort((left, right) => {
      if (left.count !== right.count) {
        return right.count - left.count;
      }
      return BULK_SETTLEMENT_ROLLBACK_REASON_CODES.indexOf(left.reasonCode)
        - BULK_SETTLEMENT_ROLLBACK_REASON_CODES.indexOf(right.reasonCode);
    })
    .slice(0, 3);

  return {
    contract: 'settlement-bulk-triage-snapshot.v1',
    selectedCount: built.summary.selection.validCount,
    byReason,
    bySeverity,
    topAnomalies,
    generatedAt: buildDeterministicGeneratedAt(built),
    metadata: {
      reasonSeverityMap: BULK_SETTLEMENT_ROLLBACK_REASON_CODES.map((code) => ({
        code,
        severity: BULK_SETTLEMENT_ROLLBACK_REASON_MAP[code].severity,
        description: BULK_SETTLEMENT_ROLLBACK_REASON_MAP[code].description,
      })),
    },
  };
}

export function buildSettlementExplainabilityPresetProfile(input: {
  presetSlots?: unknown;
  defaultSelection?: unknown;
}): SettlementExplainabilityPresetProfile {
  const validationReasonCodes = new Set<SettlementExplainabilityProfileValidationReasonCode>();
  const defaultPresetSlots = createDefaultExplainabilityPresetSlots();
  const normalizedPresetSlots = new Map(defaultPresetSlots.map((slot) => [slot.key, slot]));

  if (input.presetSlots !== undefined) {
    if (!Array.isArray(input.presetSlots)) {
      validationReasonCodes.add('BEP-001_INVALID_PRESET_SLOTS');
    } else {
      input.presetSlots.forEach((rawSlot, slotIndex) => {
        if (!rawSlot || typeof rawSlot !== 'object' || Array.isArray(rawSlot)) {
          validationReasonCodes.add('BEP-002_INVALID_PRESET_KEY');
          return;
        }

        const slot = rawSlot as Record<string, unknown>;
        const keyInput = normalizeNonEmptyString(slot.key);
        const labelInput = normalizeNonEmptyString(slot.label);
        const key = keyInput?.toLowerCase().replace(/[^a-z0-9_-]/g, '_') ?? null;

        if (!key) {
          validationReasonCodes.add('BEP-002_INVALID_PRESET_KEY');
          return;
        }

        if (normalizedPresetSlots.has(key) && !isBuiltInExplainabilityPreset(key)) {
          validationReasonCodes.add('BEP-003_DUPLICATE_PRESET_KEY');
          return;
        }

        const normalizedReasonBuckets = createZeroPresetReasonMap();
        const normalizedSeverityWindows = createZeroPresetSeverityMap();
        let hasPresetShapeIssue = false;

        if (!Array.isArray(slot.reasonCodes)) {
          hasPresetShapeIssue = true;
        } else {
          for (const rawReasonCode of slot.reasonCodes) {
            if (!isRollbackReasonCode(rawReasonCode)) {
              validationReasonCodes.add('BEP-004_INVALID_REASON_BUCKET');
              continue;
            }
            normalizedReasonBuckets[rawReasonCode] = true;
          }
        }

        if (!Array.isArray(slot.severityWindows)) {
          hasPresetShapeIssue = true;
        } else {
          for (const rawSeverityWindow of slot.severityWindows) {
            if (!isExplainabilitySeverityWindow(rawSeverityWindow)) {
              validationReasonCodes.add('BEP-005_INVALID_SEVERITY_WINDOW');
              continue;
            }
            normalizedSeverityWindows[rawSeverityWindow] = true;
          }
        }

        if (hasPresetShapeIssue) {
          validationReasonCodes.add('BEP-007_PARTIAL_PRESET_SELECTION');
        }

        normalizedPresetSlots.set(key, {
          key,
          label: labelInput ?? `Preset ${slotIndex + 1}`,
          reasonBuckets: normalizedReasonBuckets,
          severityWindows: normalizedSeverityWindows,
          isDefault: false,
        });
      });
    }
  }

  const presetSlots = [...normalizedPresetSlots.values()].sort((left, right) => {
    const leftRank = rankExplainabilityPreset(left.key);
    const rightRank = rankExplainabilityPreset(right.key);
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return left.key.localeCompare(right.key);
  });

  const defaultSelection = normalizeDefaultSelection(
    input.defaultSelection,
    presetSlots,
    validationReasonCodes,
  );

  presetSlots.forEach((slot) => {
    slot.isDefault = slot.key === defaultSelection.presetSlotKey;
  });

  return {
    contract: 'settlement-explainability-preset-profile.v1',
    presetSlots,
    reasonBuckets: BULK_SETTLEMENT_ROLLBACK_REASON_CODES.map((code) => ({
      code,
      severity: BULK_SETTLEMENT_ROLLBACK_REASON_MAP[code].severity,
      description: BULK_SETTLEMENT_ROLLBACK_REASON_MAP[code].description,
    })),
    severityWindows: SETTLEMENT_EXPLAINABILITY_SEVERITY_WINDOWS.map((code) => ({
      code,
      label: code === 'warning' ? 'Warning anomalies' : 'Critical anomalies',
      description: code === 'warning'
        ? 'Include anomaly reasons classified as warning.'
        : 'Include anomaly reasons classified as critical.',
    })),
    defaultSelection,
    metadata: {
      validationReasonCodes: SETTLEMENT_EXPLAINABILITY_PROFILE_VALIDATION_REASON_CODES.filter((code) => (
        validationReasonCodes.has(code)
      )),
    },
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

function createZeroRollbackReasonMap(): Record<BulkSettlementRollbackReasonCode, number> {
  return {
    MALFORMED_ROW: 0,
    STALE_VERSION_RISK: 0,
    MIXED_STATUS_SELECTION: 0,
    HIGH_DELTA_ANOMALY: 0,
  };
}

function createZeroSimulationOutcomeBuckets(): Record<BulkSettlementSimulationOutcomeBucket, string[]> {
  return {
    success_projection: [],
    conflict_projection: [],
    rollback_recommended: [],
  };
}

function createZeroSnapshotSeverityBuckets(): Record<BulkSettlementTriageSnapshotSeverityBucket, number> {
  return {
    warning: 0,
    critical: 0,
  };
}

function createZeroPresetReasonMap(): Record<BulkSettlementRollbackReasonCode, boolean> {
  return {
    MALFORMED_ROW: false,
    STALE_VERSION_RISK: false,
    MIXED_STATUS_SELECTION: false,
    HIGH_DELTA_ANOMALY: false,
  };
}

function createZeroPresetSeverityMap(): Record<SettlementExplainabilitySeverityWindow, boolean> {
  return {
    warning: false,
    critical: false,
  };
}

function createPresetReasonMap(
  reasonCodes: BulkSettlementRollbackReasonCode[],
): Record<BulkSettlementRollbackReasonCode, boolean> {
  const map = createZeroPresetReasonMap();
  reasonCodes.forEach((code) => {
    map[code] = true;
  });
  return map;
}

function createPresetSeverityMap(
  severityWindows: SettlementExplainabilitySeverityWindow[],
): Record<SettlementExplainabilitySeverityWindow, boolean> {
  const map = createZeroPresetSeverityMap();
  severityWindows.forEach((code) => {
    map[code] = true;
  });
  return map;
}

function createDefaultExplainabilityPresetSlots(): SettlementExplainabilityPresetSlot[] {
  return [
    {
      key: 'all_anomalies',
      label: 'All anomalies',
      reasonBuckets: createPresetReasonMap([...BULK_SETTLEMENT_ROLLBACK_REASON_CODES]),
      severityWindows: createPresetSeverityMap([...SETTLEMENT_EXPLAINABILITY_SEVERITY_WINDOWS]),
      isDefault: true,
    },
    {
      key: 'critical_guardrails',
      label: 'Critical guardrails',
      reasonBuckets: createPresetReasonMap(['MALFORMED_ROW', 'HIGH_DELTA_ANOMALY']),
      severityWindows: createPresetSeverityMap(['critical']),
      isDefault: false,
    },
    {
      key: 'stale_and_mixed',
      label: 'Stale and mixed selection',
      reasonBuckets: createPresetReasonMap(['STALE_VERSION_RISK', 'MIXED_STATUS_SELECTION']),
      severityWindows: createPresetSeverityMap(['warning']),
      isDefault: false,
    },
  ];
}

function normalizeDefaultSelection(
  rawDefaultSelection: unknown,
  presetSlots: SettlementExplainabilityPresetSlot[],
  validationReasonCodes: Set<SettlementExplainabilityProfileValidationReasonCode>,
): SettlementExplainabilityPresetProfile['defaultSelection'] {
  const fallback = presetSlots.find((slot) => slot.key === 'all_anomalies') ?? presetSlots[0];
  if (!fallback) {
    return {
      presetSlotKey: 'all_anomalies',
      reasonBuckets: createZeroPresetReasonMap(),
      severityWindows: createZeroPresetSeverityMap(),
    };
  }

  if (!rawDefaultSelection) {
    return {
      presetSlotKey: fallback.key,
      reasonBuckets: { ...fallback.reasonBuckets },
      severityWindows: { ...fallback.severityWindows },
    };
  }

  if (typeof rawDefaultSelection !== 'object' || Array.isArray(rawDefaultSelection)) {
    validationReasonCodes.add('BEP-006_INVALID_DEFAULT_SELECTION');
    return {
      presetSlotKey: fallback.key,
      reasonBuckets: { ...fallback.reasonBuckets },
      severityWindows: { ...fallback.severityWindows },
    };
  }

  const selection = rawDefaultSelection as Record<string, unknown>;
  const presetSlotKey = normalizeNonEmptyString(selection.presetSlotKey)?.toLowerCase() ?? null;
  const presetSlot = presetSlotKey
    ? presetSlots.find((slot) => slot.key === presetSlotKey) ?? null
    : null;

  if (presetSlotKey && !presetSlot) {
    validationReasonCodes.add('BEP-006_INVALID_DEFAULT_SELECTION');
  }

  const reasonBuckets = createZeroPresetReasonMap();
  const severityWindows = createZeroPresetSeverityMap();
  let parsedReasonCodes = false;
  let parsedSeverityWindows = false;

  if (selection.reasonCodes !== undefined) {
    if (!Array.isArray(selection.reasonCodes)) {
      validationReasonCodes.add('BEP-006_INVALID_DEFAULT_SELECTION');
    } else {
      parsedReasonCodes = true;
      selection.reasonCodes.forEach((value) => {
        if (!isRollbackReasonCode(value)) {
          validationReasonCodes.add('BEP-004_INVALID_REASON_BUCKET');
          return;
        }
        reasonBuckets[value] = true;
      });
    }
  }

  if (selection.severityWindows !== undefined) {
    if (!Array.isArray(selection.severityWindows)) {
      validationReasonCodes.add('BEP-006_INVALID_DEFAULT_SELECTION');
    } else {
      parsedSeverityWindows = true;
      selection.severityWindows.forEach((value) => {
        if (!isExplainabilitySeverityWindow(value)) {
          validationReasonCodes.add('BEP-005_INVALID_SEVERITY_WINDOW');
          return;
        }
        severityWindows[value] = true;
      });
    }
  }

  if ((parsedReasonCodes && !parsedSeverityWindows) || (!parsedReasonCodes && parsedSeverityWindows)) {
    validationReasonCodes.add('BEP-007_PARTIAL_PRESET_SELECTION');
  }

  if (parsedReasonCodes || parsedSeverityWindows) {
    return {
      presetSlotKey: presetSlot?.key ?? fallback.key,
      reasonBuckets,
      severityWindows,
    };
  }

  if (presetSlot) {
    return {
      presetSlotKey: presetSlot.key,
      reasonBuckets: { ...presetSlot.reasonBuckets },
      severityWindows: { ...presetSlot.severityWindows },
    };
  }

  return {
    presetSlotKey: fallback.key,
    reasonBuckets: { ...fallback.reasonBuckets },
    severityWindows: { ...fallback.severityWindows },
  };
}

function rankExplainabilityPreset(key: string): number {
  if (key === 'all_anomalies') {
    return 0;
  }
  if (key === 'critical_guardrails') {
    return 1;
  }
  if (key === 'stale_and_mixed') {
    return 2;
  }
  return 100;
}

function isBuiltInExplainabilityPreset(key: string): boolean {
  return key === 'all_anomalies' || key === 'critical_guardrails' || key === 'stale_and_mixed';
}

function isRollbackReasonCode(value: unknown): value is BulkSettlementRollbackReasonCode {
  return typeof value === 'string'
    && BULK_SETTLEMENT_ROLLBACK_REASON_CODES.includes(value as BulkSettlementRollbackReasonCode);
}

function isExplainabilitySeverityWindow(value: unknown): value is SettlementExplainabilitySeverityWindow {
  return typeof value === 'string'
    && SETTLEMENT_EXPLAINABILITY_SEVERITY_WINDOWS.includes(value as SettlementExplainabilitySeverityWindow);
}

const BULK_SETTLEMENT_ROLLBACK_STEP_HINTS: Record<BulkSettlementRollbackReasonCode, string> = {
  MALFORMED_ROW: 'Clean malformed input rows and rerun the simulation before execution.',
  STALE_VERSION_RISK: 'Refresh selection data and remove stale or missing exception ids.',
  MIXED_STATUS_SELECTION: 'Split selections by status and execute each bucket independently.',
  HIGH_DELTA_ANOMALY: 'Stage high-delta rows into a guarded batch with explicit rollback owner.',
};

function classifySimulationOutcome(
  reasonCodes: BulkSettlementRollbackReasonCode[],
): BulkSettlementSimulationOutcomeBucket {
  if (!reasonCodes.length) {
    return 'success_projection';
  }
  if (reasonCodes.includes('STALE_VERSION_RISK')) {
    return 'conflict_projection';
  }
  return 'rollback_recommended';
}

function buildDeterministicGeneratedAt(input: {
  selectedRows: BulkSettlementPreviewNormalizedRow[];
  warnings: BulkSettlementPreviewWarning[];
}): string {
  const digest = createHash('sha256')
    .update(
      JSON.stringify({
        selectedRows: input.selectedRows,
        warnings: input.warnings,
      }),
    )
    .digest('hex');
  const offsetMs = Number.parseInt(digest.slice(0, 12), 16) % (365 * 24 * 60 * 60 * 1000);
  return new Date(Date.UTC(2026, 0, 1) + offsetMs).toISOString();
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
