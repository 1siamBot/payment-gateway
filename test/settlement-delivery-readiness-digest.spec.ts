import { buildSettlementDeliveryReadinessDigest } from '../src/settlements/delivery-readiness-digest';

describe('settlement delivery readiness digest', () => {
  it('sorts rows deterministically by priorityWeight, stalledMinutes, issueIdentifier', () => {
    const digest = buildSettlementDeliveryReadinessDigest({
      lanes: [
        {
          issueIdentifier: 'ONE-300',
          priorityWeight: 2,
          stalledMinutes: 10,
          branch: 'feature/one-300',
          fullSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          prMode: 'pr_link',
          testCommand: 'npm test',
          artifactPath: 'artifacts/one-300/evidence.md',
          dependencyIssueIds: ['ONE-241'],
        },
        {
          issueIdentifier: 'ONE-100',
          priorityWeight: 1,
          stalledMinutes: 99,
          branch: 'feature/one-100',
          fullSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          prMode: 'pr_link',
          testCommand: 'npm test',
          artifactPath: 'artifacts/one-100/evidence.md',
          dependencyIssueIds: ['ONE-241'],
        },
        {
          issueIdentifier: 'ONE-200',
          priorityWeight: 1,
          stalledMinutes: 20,
          branch: 'feature/one-200',
          fullSha: 'cccccccccccccccccccccccccccccccccccccccc',
          prMode: 'pr_link',
          testCommand: 'npm test',
          artifactPath: 'artifacts/one-200/evidence.md',
          dependencyIssueIds: ['/issues/one-258'],
        },
      ],
    });

    expect(digest.rows.map((row) => row.issueIdentifier)).toEqual(['ONE-200', 'ONE-100', 'ONE-300']);
    expect(digest.rows[0]?.dependencyIssueLinks).toEqual(['/ONE/issues/ONE-258']);
    expect(digest.findings.map((finding) => finding.code)).toEqual([
      'NON_CANONICAL_DEPENDENCY_ISSUE_LINK',
    ]);
  });

  it('recommends switching lanes when current lane is no_pr_yet with unresolved blocker metadata', () => {
    const digest = buildSettlementDeliveryReadinessDigest({
      currentLaneIssueIdentifier: 'ONE-260',
      lanes: [
        {
          issueIdentifier: 'ONE-260',
          priorityWeight: 1,
          stalledMinutes: 5,
          branch: 'feature/one-260',
          fullSha: '1234567890abcdef1234567890abcdef12345678',
          prMode: 'no_pr_yet',
          testCommand: 'npm run test -- test/settlement-delivery-readiness-digest.spec.ts',
          artifactPath: 'artifacts/one-260/readiness.md',
          dependencyIssueIds: ['ONE-258', 'ONE-259'],
          blockerOwner: '',
          blockerEta: '',
        },
        {
          issueIdentifier: 'ONE-261',
          priorityWeight: 2,
          stalledMinutes: 10,
          branch: 'feature/one-261',
          fullSha: 'abcdefabcdefabcdefabcdefabcdefabcdefabcd',
          prMode: 'pr_link',
          testCommand: 'npm run test -- test/settlement-delivery-readiness-digest.spec.ts',
          artifactPath: 'artifacts/one-261/readiness.md',
          dependencyIssueIds: ['ONE-241'],
        },
      ],
    });

    expect(digest.recommendation).toEqual({
      mode: 'switch_lane',
      issueIdentifier: 'ONE-261',
      issueLink: '/ONE/issues/ONE-261',
      reason: 'current lane ONE-260 has prMode=no_pr_yet with unresolved blocker metadata',
    });
    expect(digest.findings.map((finding) => finding.code)).toEqual([
      'MISSING_BLOCKER_OWNER',
      'MISSING_BLOCKER_ETA',
    ]);
  });

  it('enforces conditional blocker fields for no_pr_yet and remains byte-stable across input order', () => {
    const lanes = [
      {
        issueIdentifier: 'ONE-263',
        priorityWeight: 3,
        stalledMinutes: 18,
        branch: 'feature/one-263',
        fullSha: 'dddddddddddddddddddddddddddddddddddddddd',
        prMode: 'pr_link',
        testCommand: 'npm test',
        artifactPath: 'artifacts/one-263/evidence.md',
        dependencyIssueIds: ['ONE-241'],
      },
      {
        issueIdentifier: 'ONE-262',
        priorityWeight: 2,
        stalledMinutes: 11,
        branch: 'feature/one-262',
        fullSha: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        prMode: 'no_pr_yet',
        testCommand: 'npm test',
        artifactPath: 'artifacts/one-262/evidence.md',
        dependencyIssueIds: ['ONE-259'],
        blockerOwner: '',
        blockerEta: '',
      },
    ];

    const first = buildSettlementDeliveryReadinessDigest({
      lanes,
      currentLaneIssueIdentifier: 'ONE-262',
    });
    const second = buildSettlementDeliveryReadinessDigest({
      lanes: [...lanes].reverse(),
      currentLaneIssueIdentifier: 'ONE-262',
    });

    expect(first.findings.filter((finding) => finding.issueIdentifier === 'ONE-262').map((finding) => finding.code)).toEqual([
      'MISSING_BLOCKER_OWNER',
      'MISSING_BLOCKER_ETA',
    ]);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
