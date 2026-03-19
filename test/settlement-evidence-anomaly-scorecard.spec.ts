import { buildSettlementEvidenceAnomalyScorecard } from '../src/settlements/evidence-anomaly-scorecard';

describe('settlement evidence anomaly scorecard', () => {
  it('sorts anomalies deterministically by severityWeight, stalenessMinutes, issueIdentifier, and fieldPath', () => {
    const scorecard = buildSettlementEvidenceAnomalyScorecard({
      asOfIso: '2026-03-19T10:00:00Z',
      staleAfterMinutes: 180,
      lanes: [
        {
          issueIdentifier: 'ONE-400',
          branch: '',
          fullSha: 'not-a-sha',
          prMode: 'pr_link',
          testCommand: '',
          artifactPath: '',
          dependencyIssueLinks: [],
          stalenessMinutes: 600,
        },
        {
          issueIdentifier: 'ONE-401',
          branch: 'feature/one-401',
          fullSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          prMode: 'pr_link',
          testCommand: 'npm test',
          artifactPath: 'artifacts/one-401/evidence.md',
          dependencyIssueLinks: ['ONE-241'],
          stalenessMinutes: 200,
        },
      ],
    });

    expect(scorecard.anomalies.map((anomaly) => [anomaly.severityWeight, anomaly.issueIdentifier, anomaly.code])).toEqual([
      [1, 'ONE-400', 'MISSING_ARTIFACT_PATH'],
      [1, 'ONE-400', 'MISSING_BRANCH'],
      [1, 'ONE-400', 'MISSING_TEST_COMMAND'],
      [2, 'ONE-400', 'MISSING_DEPENDENCY_ISSUE_LINKS'],
      [3, 'ONE-400', 'INVALID_FULL_SHA'],
      [3, 'ONE-401', 'STALE_EVIDENCE'],
      [3, 'ONE-400', 'STALE_EVIDENCE'],
      [4, 'ONE-401', 'NON_CANONICAL_INTERNAL_LINK'],
    ]);
  });

  it('stays byte-stable for identical semantic input regardless of lane order and dependency ordering', () => {
    const lanes = [
      {
        issueIdentifier: 'ONE-262',
        branch: 'feature/one-262',
        fullSha: '1234567890abcdef1234567890abcdef12345678',
        prMode: 'no_pr_yet',
        testCommand: 'npm test -- test/settlement-evidence-anomaly-scorecard.spec.ts',
        artifactPath: 'artifacts/one-262/evidence.md',
        dependencyIssueLinks: ['/issues/ONE-260#comment-1', '/ONE/issues/ONE-241'],
        blockerOwner: 'GitHub Admin / DevOps',
        blockerEta: '2026-03-21T10:00:00Z',
        stalenessMinutes: 30,
      },
      {
        issueIdentifier: 'ONE-263',
        branch: 'feature/one-263',
        fullSha: 'abcdefabcdefabcdefabcdefabcdefabcdefabcd',
        prMode: 'pr_link',
        testCommand: 'npm test -- test/settlement-evidence-anomaly-scorecard.spec.ts',
        artifactPath: 'artifacts/one-263/evidence.md',
        dependencyIssueLinks: ['/ONE/issues/ONE-241', 'ONE-260'],
        stalenessMinutes: 360,
      },
    ];

    const first = buildSettlementEvidenceAnomalyScorecard({
      lanes,
      asOfIso: '2026-03-19T10:00:00Z',
      staleAfterMinutes: 120,
    });
    const second = buildSettlementEvidenceAnomalyScorecard({
      lanes: [
        {
          ...lanes[1],
          dependencyIssueLinks: [...lanes[1].dependencyIssueLinks].reverse(),
        },
        {
          ...lanes[0],
          dependencyIssueLinks: [...lanes[0].dependencyIssueLinks].reverse(),
        },
      ],
      asOfIso: '2026-03-19T10:00:00Z',
      staleAfterMinutes: 120,
    });

    expect(first.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('enforces blockerOwner and blockerEta when prMode=no_pr_yet and reports canonical link lint findings', () => {
    const scorecard = buildSettlementEvidenceAnomalyScorecard({
      lanes: [
        {
          issueIdentifier: 'ONE-260',
          branch: 'feature/one-260',
          fullSha: 'abcdefabcdefabcdefabcdefabcdefabcdefabcd',
          prMode: 'no_pr_yet',
          testCommand: 'npm test',
          artifactPath: 'artifacts/one-260/evidence.md',
          dependencyIssueLinks: ['/issues/ONE-241#document-plan', '/ONE/issues/ONE-262#comment-12'],
          blockerOwner: '',
          blockerEta: '',
          stalenessMinutes: 10,
        },
      ],
      asOfIso: '2026-03-19T10:00:00Z',
    });

    expect(scorecard.anomalies.filter((anomaly) => anomaly.issueIdentifier === 'ONE-260').map((anomaly) => anomaly.code)).toEqual([
      'MISSING_BLOCKER_ETA',
      'MISSING_BLOCKER_OWNER',
      'NON_CANONICAL_INTERNAL_LINK',
    ]);
    expect(scorecard.scorecard[0]?.dependencyIssueLinks).toEqual([
      '/ONE/issues/ONE-241#document-plan',
      '/ONE/issues/ONE-262#comment-12',
    ]);
  });
});
