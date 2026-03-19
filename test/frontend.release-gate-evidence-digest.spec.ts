import {
  buildReleaseGateEvidenceDigestFixture,
  buildReleaseGateOwnerHandoffSummary,
  RELEASE_GATE_EVIDENCE_DIGEST_FIXTURE_INPUT,
} from '../frontend/utils/releaseGateEvidenceDigest';

describe('release-gate evidence digest frontend helpers', () => {
  it('sorts digest rows by the backend ordering tuple semantics', () => {
    const digest = buildReleaseGateEvidenceDigestFixture({
      ...RELEASE_GATE_EVIDENCE_DIGEST_FIXTURE_INPUT,
      laneEvidence: [
        {
          issueIdentifier: 'ONE-500',
          priorityWeight: 2,
          blockerWeight: 0,
          dependencyDepthWeight: 0,
          evidenceTypeWeight: 1,
          evidenceType: 'artifact',
          artifactPath: 'artifacts/one-500/a.md',
          reasonCode: 'missing_evidence',
          owner: 'frontend',
        },
        {
          issueIdentifier: 'ONE-499',
          priorityWeight: 1,
          blockerWeight: 1,
          dependencyDepthWeight: 0,
          evidenceTypeWeight: 1,
          evidenceType: 'artifact',
          artifactPath: 'artifacts/one-499/a.md',
          reasonCode: 'missing_evidence',
          owner: 'frontend',
        },
        {
          issueIdentifier: 'ONE-498',
          priorityWeight: 1,
          blockerWeight: 0,
          dependencyDepthWeight: 0,
          evidenceTypeWeight: 1,
          evidenceType: 'artifact',
          artifactPath: 'artifacts/one-498/a.md',
          reasonCode: 'missing_evidence',
          owner: 'frontend',
        },
      ],
      dependencySnapshots: [],
    });

    expect(digest.digestRows.map((row) => row.issueIdentifier)).toEqual(['ONE-498', 'ONE-499', 'ONE-500']);
    expect(digest.digestRows[0]?.orderingKey).toEqual([1, 0, 0, 'ONE-498', 1, 'artifacts/one-498/a.md']);
  });

  it('maps missing-evidence rows from digest reason codes deterministically', () => {
    const digest = buildReleaseGateEvidenceDigestFixture({
      ...RELEASE_GATE_EVIDENCE_DIGEST_FIXTURE_INPUT,
      laneEvidence: [
        {
          issueIdentifier: 'ONE-601',
          priorityWeight: 1,
          blockerWeight: 0,
          dependencyDepthWeight: 0,
          evidenceType: 'artifact',
          artifactPath: 'artifacts/one-601/report.md',
          reasonCode: 'missing evidence',
          owner: 'frontend',
        },
        {
          issueIdentifier: 'ONE-602',
          priorityWeight: 2,
          blockerWeight: 0,
          dependencyDepthWeight: 0,
          evidenceType: 'test',
          artifactPath: 'artifacts/one-602/report.md',
          reasonCode: 'policy_violation',
          owner: 'pm',
        },
      ],
      dependencySnapshots: [],
    });

    expect(digest.missingEvidence).toHaveLength(1);
    expect(digest.missingEvidence[0]).toMatchObject({
      issueIdentifier: 'ONE-601',
      reasonCode: 'missing_evidence',
      owner: 'frontend',
    });
    expect(digest.metadata.missingEvidenceCount).toBe(1);
  });

  it('builds byte-stable PM/QA handoff markdown with canonical /ONE links', () => {
    const digest = buildReleaseGateEvidenceDigestFixture(RELEASE_GATE_EVIDENCE_DIGEST_FIXTURE_INPUT);

    const first = buildReleaseGateOwnerHandoffSummary({
      digest,
      relatedIssueIdentifiers: ['ONE-337', 'ONE-334', 'ONE-335', 'ONE-336', 'ONE-307', 'ONE-308', 'ONE-286', 'ONE-292', 'ONE-64'],
    });
    const second = buildReleaseGateOwnerHandoffSummary({
      digest,
      relatedIssueIdentifiers: ['ONE-64', 'ONE-292', 'ONE-286', 'ONE-308', 'ONE-307', 'ONE-336', 'ONE-335', 'ONE-334', 'ONE-337'],
    });

    expect(first.pmMarkdown).toBe(second.pmMarkdown);
    expect(first.qaMarkdown).toBe(second.qaMarkdown);
    expect(first.canonicalIssueLinks.every((link) => link.startsWith('/ONE/issues/ONE-'))).toBe(true);
  });
});
