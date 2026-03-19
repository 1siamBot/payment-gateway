import { buildSettlementEvidenceLineage } from '../src/settlements/evidence-lineage';

describe('settlement evidence lineage', () => {
  it('sorts rows deterministically by lineageDepth/sourceTypePriority/sourceIssueId/artifactPath and builds counters', () => {
    const result = buildSettlementEvidenceLineage({
      rows: [
        {
          lineageDepth: 1,
          sourceType: 'commit',
          sourceIssueId: 'ONE-300',
          artifactPath: 'artifacts/300-b.md',
          laneState: 'in_progress',
          observedAt: '2026-03-19T02:00:00Z',
        },
        {
          lineageDepth: 0,
          sourceType: 'issue',
          sourceIssueId: 'ONE-299',
          artifactPath: 'artifacts/299-a.md',
          laneState: 'todo',
          observedAt: '2026-03-19T01:00:00Z',
        },
        {
          lineageDepth: 1,
          sourceType: 'commit',
          sourceIssueId: 'ONE-300',
          artifactPath: 'artifacts/300-a.md',
          laneState: 'blocked',
          observedAt: '2026-03-19T01:30:00Z',
        },
        {
          lineageDepth: 1,
          sourceType: 'artifact',
          sourceIssueId: 'ONE-301',
          laneState: 'blocked',
          observedAt: '2026-03-19T02:30:00Z',
        },
      ],
    });

    expect(result.rows.map((row) => row.rowCursor)).toEqual([
      '0|10|ONE-299|artifacts/299-a.md',
      '1|30|ONE-300|artifacts/300-a.md',
      '1|30|ONE-300|artifacts/300-b.md',
      '1|40|ONE-301|',
    ]);
    expect(result.summary).toEqual({
      bySourceType: {
        artifact: 1,
        commit: 2,
        issue: 1,
      },
      byLaneState: {
        blocked: 2,
        in_progress: 1,
        todo: 1,
      },
      orphanArtifactCount: 1,
    });
  });

  it('returns deterministic validation reason codes for cursor failures', () => {
    try {
      buildSettlementEvidenceLineage({
        rows: [
          {
            lineageDepth: 0,
            sourceType: 'issue',
            sourceIssueId: 'ONE-100',
            artifactPath: 'artifacts/100.md',
            observedAt: '2026-03-19T01:00:00Z',
          },
        ],
        cursor: {
          cursorVersion: 'v9',
          windowStart: '2026-03-19T05:00:00Z',
          windowEnd: '2026-03-19T01:00:00Z',
          lineageHash: 'not-a-match',
          resumeAfter: '0|10|ONE-404|missing.md',
        },
      });
      fail('expected validation error');
    } catch (error) {
      expect(error).toMatchObject({
        response: {
          code: 'SETTLEMENT_EVIDENCE_LINEAGE_VALIDATION_FAILED',
          message: 'evidence lineage validation failed',
          errors: [
            {
              field: 'cursor.cursorVersion',
              reasonCode: 'UNSUPPORTED_CURSOR_VERSION',
              message: 'cursorVersion must be v1',
            },
            {
              field: 'cursor.lineageHash',
              reasonCode: 'LINEAGE_HASH_MISMATCH',
              message: 'provided lineageHash does not match normalized lineage rows',
            },
            {
              field: 'cursor.resumeAfter',
              reasonCode: 'MISSING_RESUME_ANCHOR',
              message: 'resumeAfter anchor does not exist in normalized lineage rows',
            },
            {
              field: 'cursor.window',
              reasonCode: 'INVALID_CURSOR_WINDOW',
              message: 'windowStart must be less than or equal to windowEnd',
            },
          ],
        },
        status: 400,
      });
    }
  });

  it('produces byte-stable replay output for identical fixture semantics', () => {
    const payload = {
      rows: [
        {
          lineageDepth: 1,
          sourceType: 'commit',
          sourceIssueId: 'ONE-220',
          artifactPath: 'artifacts/220-b.md',
          laneState: 'in_review',
          observedAt: '2026-03-19T02:00:00Z',
        },
        {
          lineageDepth: 0,
          sourceType: 'issue',
          sourceIssueId: 'ONE-220',
          artifactPath: 'artifacts/220-a.md',
          laneState: 'done',
          observedAt: '2026-03-19T01:00:00Z',
        },
      ],
    };

    const firstPass = buildSettlementEvidenceLineage(payload);
    const secondPass = buildSettlementEvidenceLineage({
      rows: [...payload.rows].reverse(),
      cursor: {
        lineageHash: firstPass.cursor.lineageHash,
      },
    });

    expect(secondPass.cursor.lineageHash).toBe(firstPass.cursor.lineageHash);
    expect(JSON.stringify(secondPass)).toBe(JSON.stringify(firstPass));
  });
});
