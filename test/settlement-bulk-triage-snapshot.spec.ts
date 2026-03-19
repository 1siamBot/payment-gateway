import { SettlementExceptionStatus } from '@prisma/client';
import {
  BULK_SETTLEMENT_ROLLBACK_REASON_CODES,
  buildBulkSettlementTriageSnapshot,
} from '../src/settlements/bulk-settlement-preview';

describe('bulk settlement triage snapshot', () => {
  it('returns deterministic zero-filled buckets for empty selection', () => {
    const snapshot = buildBulkSettlementTriageSnapshot({
      rows: [
        { id: 'se-1', status: SettlementExceptionStatus.OPEN, deltaAmount: 10 },
      ],
      selectedExceptionIds: [],
    });

    expect(snapshot).toMatchObject({
      contract: 'settlement-bulk-triage-snapshot.v1',
      selectedCount: 0,
      byReason: {
        MALFORMED_ROW: 0,
        STALE_VERSION_RISK: 0,
        MIXED_STATUS_SELECTION: 0,
        HIGH_DELTA_ANOMALY: 0,
      },
      bySeverity: {
        warning: 0,
        critical: 0,
      },
      topAnomalies: [],
      metadata: {
        reasonSeverityMap: expect.any(Array),
      },
    });
    expect(snapshot.metadata.reasonSeverityMap.map((row) => row.code)).toEqual([
      ...BULK_SETTLEMENT_ROLLBACK_REASON_CODES,
    ]);
  });

  it('maps mixed anomalies into deterministic reason and severity rollups', () => {
    const snapshot = buildBulkSettlementTriageSnapshot({
      rows: [
        { id: 'se-open', status: SettlementExceptionStatus.OPEN, deltaAmount: 2 },
        { id: 'se-investigating', status: SettlementExceptionStatus.INVESTIGATING, deltaAmount: 8 },
        { id: 'se-critical', status: SettlementExceptionStatus.OPEN, deltaAmount: 30 },
        { id: 'se-open', status: SettlementExceptionStatus.OPEN, deltaAmount: 99 },
      ],
      selectedExceptionIds: ['se-open', 'se-investigating', 'se-critical', 'se-missing'],
    });

    expect(snapshot.selectedCount).toBe(3);
    expect(snapshot.byReason).toEqual({
      MALFORMED_ROW: 1,
      STALE_VERSION_RISK: 1,
      MIXED_STATUS_SELECTION: 1,
      HIGH_DELTA_ANOMALY: 1,
    });
    expect(snapshot.bySeverity).toEqual({
      warning: 2,
      critical: 2,
    });
    expect(snapshot.topAnomalies).toEqual([
      {
        reasonCode: 'MALFORMED_ROW',
        severity: 'critical',
        count: 1,
        description: expect.any(String),
      },
      {
        reasonCode: 'STALE_VERSION_RISK',
        severity: 'warning',
        count: 1,
        description: expect.any(String),
      },
      {
        reasonCode: 'MIXED_STATUS_SELECTION',
        severity: 'warning',
        count: 1,
        description: expect.any(String),
      },
    ]);
  });

  it('remains byte-stable for identical fixture inputs', () => {
    const payload = {
      rows: [
        { id: 'se-z', status: SettlementExceptionStatus.OPEN, deltaAmount: 11 },
        { id: 'se-a', status: SettlementExceptionStatus.RESOLVED, deltaAmount: -1 },
        { id: 'se-m', status: SettlementExceptionStatus.INVESTIGATING, deltaAmount: 6 },
        { id: 'se-a', status: SettlementExceptionStatus.OPEN, deltaAmount: 6 },
      ],
      selectedExceptionIds: ['se-z', 'se-m', 'se-a', 'se-a'],
    };

    const first = buildBulkSettlementTriageSnapshot(payload);
    const second = buildBulkSettlementTriageSnapshot(payload);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
