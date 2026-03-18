import { SettlementExceptionStatus } from '@prisma/client';
import {
  buildBulkSettlementActionPreviewExport,
  buildBulkSettlementActionPreviewSummary,
  BULK_SETTLEMENT_PREVIEW_STATUS_BUCKETS,
  BULK_SETTLEMENT_PREVIEW_RISK_BUCKETS,
  BULK_SETTLEMENT_PREVIEW_WARNING_CODES,
} from '../src/settlements/bulk-settlement-preview';

describe('bulk settlement action preview', () => {
  it('builds stable summary counts for status/risk buckets', () => {
    const summary = buildBulkSettlementActionPreviewSummary({
      rows: [
        { id: 'se-2', status: SettlementExceptionStatus.INVESTIGATING, deltaAmount: 12 },
        { id: 'se-1', status: SettlementExceptionStatus.OPEN, deltaAmount: 30 },
        { id: 'se-3', status: SettlementExceptionStatus.RESOLVED, deltaAmount: -2 },
        { id: 'se-4', status: SettlementExceptionStatus.IGNORED, deltaAmount: -18 },
      ],
      selectedExceptionIds: ['se-1', 'se-2', 'se-3', 'se-4'],
    });

    expect(Object.keys(summary.statusBuckets)).toEqual([...BULK_SETTLEMENT_PREVIEW_STATUS_BUCKETS]);
    expect(Object.keys(summary.riskBuckets)).toEqual([...BULK_SETTLEMENT_PREVIEW_RISK_BUCKETS]);
    expect(summary).toEqual({
      contract: 'settlement-bulk-preview-summary.v1',
      selection: {
        requestedCount: 4,
        validCount: 4,
        malformedCount: 0,
        hasMismatch: false,
      },
      statusBuckets: {
        OPEN: 1,
        INVESTIGATING: 1,
        RESOLVED: 1,
        IGNORED: 1,
      },
      riskBuckets: {
        low: 1,
        medium: 1,
        high: 1,
        critical: 1,
      },
      totals: {
        netDeltaAmount: 22,
        absoluteDeltaAmount: 62,
      },
    });
  });

  it('returns explicit zero-count buckets for empty selection', () => {
    const summary = buildBulkSettlementActionPreviewSummary({
      rows: [
        { id: 'se-1', status: SettlementExceptionStatus.OPEN, deltaAmount: 10 },
      ],
      selectedExceptionIds: [],
    });

    expect(summary.selection.requestedCount).toBe(0);
    expect(summary.selection.validCount).toBe(0);
    expect(summary.selection.malformedCount).toBe(0);
    expect(summary.selection.hasMismatch).toBe(false);
    expect(summary.statusBuckets).toEqual({
      OPEN: 0,
      INVESTIGATING: 0,
      RESOLVED: 0,
      IGNORED: 0,
    });
    expect(summary.riskBuckets).toEqual({
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    });
  });

  it('emits malformed warning metadata and keeps required keys', () => {
    const payload = buildBulkSettlementActionPreviewExport({
      rows: [
        null,
        { id: '', status: SettlementExceptionStatus.OPEN, deltaAmount: 5 },
        { id: 'se-bad-status', status: 'INVALID', deltaAmount: 5 },
        { id: 'se-bad-delta', status: SettlementExceptionStatus.OPEN, deltaAmount: Number.NaN },
        {
          id: 'se-bad-risk',
          status: SettlementExceptionStatus.OPEN,
          deltaAmount: 10,
          riskBucket: 'not-a-bucket',
        },
        { id: 'se-good', status: SettlementExceptionStatus.OPEN, deltaAmount: 8 },
        { id: 'se-good', status: SettlementExceptionStatus.OPEN, deltaAmount: 8 },
      ],
      selectedExceptionIds: ['se-good', 'se-missing'],
    });

    expect(payload.summary.selection).toEqual({
      requestedCount: 2,
      validCount: 1,
      malformedCount: 1,
      hasMismatch: true,
    });

    expect(Object.keys(payload.warningSummary.byCode)).toEqual([...BULK_SETTLEMENT_PREVIEW_WARNING_CODES]);
    expect(payload.warningSummary.hasWarnings).toBe(true);
    expect(payload.warningSummary.totalWarnings).toBe(7);
    expect(payload.warningSummary.byCode).toEqual({
      'BSP-001_INVALID_ROW_SHAPE': 1,
      'BSP-002_INVALID_EXCEPTION_ID': 1,
      'BSP-003_DUPLICATE_EXCEPTION_ID': 1,
      'BSP-004_INVALID_STATUS': 1,
      'BSP-005_INVALID_DELTA_AMOUNT': 1,
      'BSP-006_INVALID_RISK_BUCKET': 1,
      'BSP-007_SELECTED_ID_NOT_FOUND': 1,
    });

    expect(payload.summary).toHaveProperty('statusBuckets');
    expect(payload.summary).toHaveProperty('riskBuckets');
    expect(payload.csv.columns).toEqual(['exceptionId', 'status', 'riskBucket', 'deltaAmount']);
  });

  it('keeps export ordering deterministic for selected rows and warnings', () => {
    const first = buildBulkSettlementActionPreviewExport({
      rows: [
        { id: 'se-z', status: SettlementExceptionStatus.OPEN, deltaAmount: 11 },
        { id: 'se-a', status: SettlementExceptionStatus.RESOLVED, deltaAmount: -1 },
        { id: 'se-m', status: SettlementExceptionStatus.INVESTIGATING, deltaAmount: 6 },
        { id: 'se-a', status: SettlementExceptionStatus.OPEN, deltaAmount: 6 },
      ],
      selectedExceptionIds: ['se-m', 'se-a', 'se-z'],
    });

    const second = buildBulkSettlementActionPreviewExport({
      rows: [
        { id: 'se-z', status: SettlementExceptionStatus.OPEN, deltaAmount: 11 },
        { id: 'se-a', status: SettlementExceptionStatus.RESOLVED, deltaAmount: -1 },
        { id: 'se-m', status: SettlementExceptionStatus.INVESTIGATING, deltaAmount: 6 },
        { id: 'se-a', status: SettlementExceptionStatus.OPEN, deltaAmount: 6 },
      ],
      selectedExceptionIds: ['se-z', 'se-m', 'se-a', 'se-a'],
    });

    expect(first.json.selectedRows.map((row) => row.exceptionId)).toEqual(['se-a', 'se-m', 'se-z']);
    expect(first.csv.rows.map((row) => row[0])).toEqual(['se-a', 'se-m', 'se-z']);
    expect(first.warnings).toEqual(second.warnings);
    expect(first.summary).toEqual(second.summary);
  });
});
