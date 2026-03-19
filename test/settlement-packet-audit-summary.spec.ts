import { buildSettlementPacketAuditSummary } from '../src/settlements/packet-audit-summary';

describe('settlement packet audit summary', () => {
  it('sorts evidence rows deterministically by lanePriority, updatedAt, id', () => {
    const summary = buildSettlementPacketAuditSummary({
      evidenceRows: [
        { id: 'row-b', lanePriority: 3, updatedAt: '2026-03-19T01:00:00Z' },
        { id: 'row-a', lanePriority: 1, updatedAt: '2026-03-19T00:00:00Z' },
        { id: 'row-c', lanePriority: 1, updatedAt: '2026-03-18T23:59:59Z' },
        { id: 'row-d', lanePriority: 1, updatedAt: '2026-03-19T00:00:00Z' },
      ],
      blockerMetadata: {
        blockerOwner: 'ops-oncall',
      },
    });

    expect(summary.evidenceRows.map((row) => row.id)).toEqual(['row-c', 'row-a', 'row-d', 'row-b']);
    expect(summary.blockerMetadata).toEqual({
      blockerOwner: 'ops-oncall',
      blockerEta: null,
      retryAt: null,
      dependencyIssueIds: [],
      publishState: 'publish_blocked',
    });
  });

  it('returns stable fingerprint for identical logical payloads', () => {
    const first = buildSettlementPacketAuditSummary({
      evidenceRows: [
        { id: 'row-z', lanePriority: 2, updatedAt: '2026-03-19T02:00:00Z' },
        { id: 'row-a', lanePriority: 1, updatedAt: '2026-03-19T01:00:00Z' },
      ],
      blockerMetadata: {
        blockerOwner: 'backend-engineer',
        dependencyIssueIds: ['ONE-241', 'ONE-248'],
        publishState: 'publish_ready',
      },
    });
    const second = buildSettlementPacketAuditSummary({
      evidenceRows: [
        { id: 'row-a', lanePriority: 1, updatedAt: '2026-03-19T01:00:00Z' },
        { id: 'row-z', lanePriority: 2, updatedAt: '2026-03-19T02:00:00Z' },
      ],
      blockerMetadata: {
        blockerOwner: 'backend-engineer',
        dependencyIssueIds: ['ONE-248', 'ONE-241', 'ONE-248'],
        publishState: 'publish_ready',
      },
    });

    expect(first.fingerprint).toBe(second.fingerprint);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('emits deterministic blocker metadata validation errors', () => {
    try {
      buildSettlementPacketAuditSummary({
        evidenceRows: [{ id: 'row-a', lanePriority: 1, updatedAt: '2026-03-19T01:00:00Z' }],
        blockerMetadata: {
          publishState: 'unknown',
          dependencyIssueIds: ['ONE-241', '', 'ONE-248'],
        },
      });
      fail('expected validation error');
    } catch (error) {
      expect(error).toMatchObject({
        response: {
          code: 'SETTLEMENT_PACKET_AUDIT_VALIDATION_FAILED',
          message: 'packet audit summary validation failed',
          errors: [
            {
              field: 'blockerMetadata.blockerOwner',
              reason: 'required',
              message: 'blockerOwner must be a non-empty string',
            },
            {
              field: 'blockerMetadata.dependencyIssueIds[1]',
              reason: 'invalid_value',
              message: 'dependency issue id must be a non-empty string',
            },
            {
              field: 'blockerMetadata.publishState',
              reason: 'invalid_value',
              message: 'publishState must be one of: publish_blocked, publish_ready, publish_in_progress',
            },
          ],
        },
        status: 400,
      });
    }
  });
});
