import {
  SETTLEMENT_PUBLICATION_READINESS_GAP_CODES,
  buildSettlementPublicationReadinessTrend,
} from '../src/settlements/publication-readiness-trend';

describe('settlement publication readiness trend', () => {
  it('sorts rows deterministically by windowStart, lanePriority, issueId and keeps stable gap ordering', () => {
    const trend = buildSettlementPublicationReadinessTrend({
      rows: [
        {
          issueId: 'ONE-300',
          windowStart: '2026-03-19T00:10:00Z',
          lanePriority: 2,
          branch: 'feat/x',
          fullSha: '1234567890abcdef1234567890abcdef12345678',
          prUrl: 'https://github.com/1siamBot/payment-gateway/pull/300',
          testSummary: '5 passed',
          artifactUrl: 'artifacts/one-300/evidence.md',
        },
        {
          issueId: 'ONE-100',
          windowStart: '2026-03-19T00:05:00Z',
          lanePriority: 1,
          branch: ' ',
          fullSha: ' ',
          testSummary: '',
        },
        {
          issueId: 'ONE-200',
          windowStart: '2026-03-19T00:05:00Z',
          lanePriority: 1,
          branch: 'feat/y',
          fullSha: 'abcdefabcdefabcdefabcdefabcdefabcdefabcd',
          blockerPacketUrl: '/ONE/issues/ONE-251#document-plan',
          testSummary: 'all good',
          artifactUrl: 'artifacts/one-200/report.md',
        },
      ],
    });

    expect(trend.rows.map((row) => row.issueId)).toEqual(['ONE-100', 'ONE-200', 'ONE-300']);
    expect(trend.rows[0]?.gapCodes).toEqual([
      'MISSING_BRANCH',
      'MISSING_FULL_SHA',
      'MISSING_PR_OR_BLOCKER_PACKET',
      'MISSING_TEST_SUMMARY',
      'MISSING_ARTIFACT_LINK',
    ]);
    expect(trend.counters.byGapCode).toEqual({
      MISSING_BRANCH: 1,
      MISSING_FULL_SHA: 1,
      MISSING_PR_OR_BLOCKER_PACKET: 1,
      MISSING_TEST_SUMMARY: 1,
      MISSING_ARTIFACT_LINK: 1,
    });
    expect(Object.keys(trend.counters.byGapCode)).toEqual([...SETTLEMENT_PUBLICATION_READINESS_GAP_CODES]);
    expect(trend.counters.byReadinessState).toEqual({
      ready: 2,
      blocked_publish: 1,
      missing_evidence: 0,
    });
  });

  it('remains byte-stable for identical logical rows in different input order', () => {
    const first = buildSettlementPublicationReadinessTrend({
      rows: [
        {
          issueId: 'ONE-11',
          windowStart: '2026-03-19T01:00:00Z',
          lanePriority: 2,
          branch: 'feat/one',
          fullSha: '1111111111111111111111111111111111111111',
          blockerPacketUrl: '/ONE/issues/ONE-251',
          artifactUrl: 'artifacts/one-11/evidence.md',
        },
        {
          issueId: 'ONE-10',
          windowStart: '2026-03-19T01:00:00Z',
          lanePriority: 1,
          branch: 'feat/two',
          fullSha: '2222222222222222222222222222222222222222',
          prUrl: 'https://github.com/1siamBot/payment-gateway/pull/10',
          testSummary: 'ok',
          artifactUrl: 'artifacts/one-10/evidence.md',
        },
      ],
    });

    const second = buildSettlementPublicationReadinessTrend({
      rows: [
        {
          issueId: 'ONE-10',
          windowStart: '2026-03-19T01:00:00Z',
          lanePriority: 1,
          branch: 'feat/two',
          fullSha: '2222222222222222222222222222222222222222',
          prUrl: 'https://github.com/1siamBot/payment-gateway/pull/10',
          testSummary: 'ok',
          artifactUrl: 'artifacts/one-10/evidence.md',
        },
        {
          issueId: 'ONE-11',
          windowStart: '2026-03-19T01:00:00Z',
          lanePriority: 2,
          branch: 'feat/one',
          fullSha: '1111111111111111111111111111111111111111',
          blockerPacketUrl: '/ONE/issues/ONE-251',
          artifactUrl: 'artifacts/one-11/evidence.md',
        },
      ],
    });

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('returns zeroed counters for empty rows', () => {
    const trend = buildSettlementPublicationReadinessTrend({ rows: [] });

    expect(trend).toEqual({
      contract: 'settlement-publication-readiness-trend.v1',
      rows: [],
      counters: {
        byGapCode: {
          MISSING_BRANCH: 0,
          MISSING_FULL_SHA: 0,
          MISSING_PR_OR_BLOCKER_PACKET: 0,
          MISSING_TEST_SUMMARY: 0,
          MISSING_ARTIFACT_LINK: 0,
        },
        byReadinessState: {
          ready: 0,
          blocked_publish: 0,
          missing_evidence: 0,
        },
      },
      metadata: {
        inputCount: 0,
        acceptedCount: 0,
        skippedCount: 0,
      },
    });
  });
});
