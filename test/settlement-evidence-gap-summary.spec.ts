import { buildSettlementEvidenceGapSummary } from '../src/settlements/evidence-gap-summary';

describe('settlement evidence gap summary', () => {
  it('sorts evidence-gap rows deterministically by lanePriority/missingFieldPriority/issueIdentifier/artifactPath', () => {
    const summary = buildSettlementEvidenceGapSummary({
      rows: [
        {
          lane: 'release',
          lanePriority: 2,
          severity: 'high',
          issueIdentifier: 'ONE-401',
          branch: '',
          fullSha: '1234567890abcdef1234567890abcdef12345678',
          prLink: '',
          testCommand: '',
          artifactPath: '',
          blockerOwner: 'ops',
          blockerEta: '2026-03-20T10:00:00Z',
        },
        {
          lane: 'reconcile',
          lanePriority: 1,
          severity: 'critical',
          issueIdentifier: 'ONE-300',
          branch: '',
          fullSha: '',
          prLink: 'https://github.com/1siamBot/payment-gateway/pull/123',
          testCommand: 'npm test',
          artifactPath: 'artifacts/one-300/report.json',
          blockerOwner: '',
          blockerEta: '',
        },
      ],
    });

    expect(summary.rows.map((row) => ({
      lanePriority: row.lanePriority,
      missingFieldPriority: row.missingFieldPriority,
      issueIdentifier: row.issueIdentifier,
      artifactPath: row.artifactPath,
      code: row.remediationHintCode,
    }))).toEqual([
      {
        lanePriority: 1,
        missingFieldPriority: 10,
        issueIdentifier: 'ONE-300',
        artifactPath: 'artifacts/one-300/report.json',
        code: 'MISSING_BRANCH',
      },
      {
        lanePriority: 1,
        missingFieldPriority: 20,
        issueIdentifier: 'ONE-300',
        artifactPath: 'artifacts/one-300/report.json',
        code: 'MISSING_FULL_SHA',
      },
      {
        lanePriority: 2,
        missingFieldPriority: 10,
        issueIdentifier: 'ONE-401',
        artifactPath: '',
        code: 'MISSING_BRANCH',
      },
      {
        lanePriority: 2,
        missingFieldPriority: 30,
        issueIdentifier: 'ONE-401',
        artifactPath: '',
        code: 'MISSING_PR_LINK',
      },
      {
        lanePriority: 2,
        missingFieldPriority: 40,
        issueIdentifier: 'ONE-401',
        artifactPath: '',
        code: 'MISSING_TEST_COMMAND',
      },
      {
        lanePriority: 2,
        missingFieldPriority: 50,
        issueIdentifier: 'ONE-401',
        artifactPath: '',
        code: 'MISSING_ARTIFACT_PATH',
      },
    ]);
  });

  it('maps required remediation codes/messages and computes deterministic counters by lane/severity', () => {
    const summary = buildSettlementEvidenceGapSummary({
      rows: [
        {
          lane: 'release',
          lanePriority: 1,
          severity: 'critical',
          issueIdentifier: 'ONE-500',
          branch: 'backend/one-500',
          fullSha: '1234567890abcdef1234567890abcdef12345678',
          prLink: 'https://github.com/1siamBot/payment-gateway/pull/500',
          testCommand: 'npm test -- test/settlement-evidence-gap-summary.spec.ts',
          artifactPath: 'artifacts/one-500/test-log.txt',
          blockerOwner: '',
          blockerEta: '',
        },
        {
          lane: 'release',
          lanePriority: 1,
          severity: 'high',
          issueIdentifier: 'ONE-501',
          branch: '',
          fullSha: '',
          prLink: '',
          testCommand: '',
          artifactPath: '',
          blockerOwner: 'pm',
          blockerEta: '2026-03-22T08:00:00Z',
        },
      ],
    });

    expect(summary.remediationHintCodeMap.map((row) => row.code)).toEqual([
      'MISSING_BRANCH',
      'MISSING_FULL_SHA',
      'MISSING_PR_LINK',
      'MISSING_TEST_COMMAND',
      'MISSING_ARTIFACT_PATH',
      'MISSING_BLOCKER_OWNER',
      'MISSING_BLOCKER_ETA',
    ]);
    expect(summary.remediationHintCodeMap.every((row) => row.message.length > 0)).toBe(true);
    expect(summary.counters).toEqual({
      byLane: [
        {
          lane: 'release',
          severities: [
            {
              severity: 'critical',
              completeCount: 1,
              gapCount: 0,
              totalCount: 1,
            },
            {
              severity: 'high',
              completeCount: 0,
              gapCount: 1,
              totalCount: 1,
            },
          ],
        },
      ],
      totals: {
        completeCount: 1,
        gapCount: 1,
        totalCount: 2,
      },
    });
  });

  it('returns deterministic validation error shape when prLink is absent and blocker fields are missing', () => {
    try {
      buildSettlementEvidenceGapSummary({
        rows: [
          {
            lane: 'release',
            lanePriority: 1,
            severity: 'high',
            issueIdentifier: 'ONE-550',
            branch: 'backend/one-550',
            fullSha: '1234567890abcdef1234567890abcdef12345678',
            prLink: '',
            testCommand: 'npm test',
            artifactPath: 'artifacts/one-550/log.txt',
            blockerOwner: '',
            blockerEta: 'bad-date',
          },
        ],
      });
      fail('expected validation error');
    } catch (error) {
      expect(error).toMatchObject({
        status: 400,
        response: {
          code: 'SETTLEMENT_EVIDENCE_GAP_VALIDATION_FAILED',
          message: 'evidence gap summary validation failed',
          errors: [
            {
              field: 'rows[0].blockerEta',
              reason: 'invalid_value',
              message: 'must be an ISO-8601 datetime string when provided',
            },
            {
              field: 'rows[0].blockerEta',
              reason: 'required',
              message: 'blockerEta is required when prLink is absent',
            },
            {
              field: 'rows[0].blockerOwner',
              reason: 'required',
              message: 'blockerOwner is required when prLink is absent',
            },
          ],
        },
      });
    }
  });
});
