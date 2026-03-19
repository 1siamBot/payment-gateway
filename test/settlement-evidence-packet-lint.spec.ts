import { lintSettlementEvidencePackets } from '../src/settlements/evidence-packet-lint';

describe('settlement evidence packet lint', () => {
  it('sorts findings deterministically by severityPriority, fieldPriority, issueIdentifier, and path', () => {
    const result = lintSettlementEvidencePackets({
      packets: [
        {
          issueIdentifier: 'ONE-300',
          path: 'artifacts/one-300/checklist.md',
          branch: '',
          fullSha: '',
          prMode: 'pr_link',
          testCommand: '',
          artifactPath: '',
          dependencyIssueLinks: [],
        },
        {
          issueIdentifier: 'ONE-200',
          path: 'artifacts/one-200/checklist.md',
          branch: '',
          fullSha: '',
          prMode: 'pr_link',
          testCommand: '',
          artifactPath: '',
          dependencyIssueLinks: [],
        },
      ],
    });

    expect(result.findings.map((finding) => finding.code)).toEqual([
      'MISSING_BRANCH',
      'MISSING_BRANCH',
      'MISSING_FULL_SHA',
      'MISSING_FULL_SHA',
      'MISSING_TEST_COMMAND',
      'MISSING_TEST_COMMAND',
      'MISSING_ARTIFACT_PATH',
      'MISSING_ARTIFACT_PATH',
      'MISSING_DEPENDENCY_ISSUE_LINKS',
      'MISSING_DEPENDENCY_ISSUE_LINKS',
    ]);
    expect(result.findings.map((finding) => finding.issueIdentifier)).toEqual([
      'ONE-200',
      'ONE-300',
      'ONE-200',
      'ONE-300',
      'ONE-200',
      'ONE-300',
      'ONE-200',
      'ONE-300',
      'ONE-200',
      'ONE-300',
    ]);
  });

  it('normalizes dependency links to canonical company-prefixed paths and emits non-canonical warnings', () => {
    const result = lintSettlementEvidencePackets({
      packets: [
        {
          issueIdentifier: 'ONE-258',
          path: 'artifacts/one-258/evidence.md',
          branch: 'feature/one-258',
          fullSha: '1234567890abcdef1234567890abcdef12345678',
          prMode: 'pr_link',
          testCommand: 'npm test -- settlement-evidence-packet-lint.spec.ts',
          artifactPath: 'artifacts/one-258/evidence.md',
          dependencyIssueLinks: [
            '/issues/one-257',
            'ONE-256',
            '/ONE/issues/ONE-241',
            'https://example.test/ONE/issues/ONE-240',
          ],
        },
      ],
    });

    expect(result.normalizedPackets[0].dependencyIssueLinks).toEqual([
      '/ONE/issues/ONE-240',
      '/ONE/issues/ONE-241',
      '/ONE/issues/ONE-256',
      '/ONE/issues/ONE-257',
    ]);
    expect(result.findings.filter((finding) => finding.code === 'NON_CANONICAL_DEPENDENCY_ISSUE_LINK').length).toBe(3);
    expect(result.findings.some((finding) => finding.normalized === '/ONE/issues/ONE-257')).toBe(true);
  });

  it('emits deterministic blocker findings when prMode=no_pr_yet and blocker fields are missing', () => {
    const result = lintSettlementEvidencePackets({
      packets: [
        {
          issueIdentifier: 'ONE-258',
          path: 'artifacts/one-258/evidence.md',
          branch: 'feature/one-258',
          fullSha: '1234567890abcdef1234567890abcdef12345678',
          prMode: 'no_pr_yet',
          testCommand: 'npm test',
          artifactPath: 'artifacts/one-258/evidence.md',
          dependencyIssueLinks: ['/ONE/issues/ONE-257'],
          blockerOwner: '',
          blockerEta: '',
        },
      ],
    });

    expect(result.findings).toEqual([
      {
        code: 'MISSING_BLOCKER_OWNER',
        severity: 'error',
        severityPriority: 1,
        field: 'blockerOwner',
        fieldPriority: 70,
        issueIdentifier: 'ONE-258',
        path: 'artifacts/one-258/evidence.md',
        fieldPath: 'packets[0].blockerOwner',
        message: 'blockerOwner is required when prMode=no_pr_yet',
        input: '',
        normalized: null,
      },
      {
        code: 'MISSING_BLOCKER_ETA',
        severity: 'error',
        severityPriority: 1,
        field: 'blockerEta',
        fieldPriority: 80,
        issueIdentifier: 'ONE-258',
        path: 'artifacts/one-258/evidence.md',
        fieldPath: 'packets[0].blockerEta',
        message: 'blockerEta is required when prMode=no_pr_yet',
        input: '',
        normalized: null,
      },
    ]);
  });
});
