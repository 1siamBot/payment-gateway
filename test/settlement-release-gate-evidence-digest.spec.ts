import { buildSettlementReleaseGateEvidenceDigest } from '../src/settlements/release-gate-evidence-digest';

describe('settlement release-gate evidence digest', () => {
  it('sorts digest rows deterministically by the release-gate ordering key tuple', () => {
    const digest = buildSettlementReleaseGateEvidenceDigest({
      candidateId: 'ONE-337',
      policyVersion: '2026.03.19',
      laneEvidence: [
        {
          issueIdentifier: 'ONE-403',
          priorityWeight: 2,
          blockerWeight: 1,
          dependencyDepthWeight: 1,
          evidenceTypeWeight: 3,
          evidenceType: 'log',
          artifactPath: 'artifacts/one-403/log.txt',
          reasonCode: 'policy_violation',
        },
        {
          issueIdentifier: 'ONE-401',
          priorityWeight: 1,
          blockerWeight: 1,
          dependencyDepthWeight: 1,
          evidenceTypeWeight: 2,
          evidenceType: 'test',
          artifactPath: 'artifacts/one-401/test.md',
          reasonCode: 'dependency_blocked',
        },
        {
          issueIdentifier: 'ONE-402',
          priorityWeight: 1,
          blockerWeight: 0,
          dependencyDepthWeight: 1,
          evidenceTypeWeight: 1,
          evidenceType: 'artifact',
          artifactPath: 'artifacts/one-402/report.md',
          reasonCode: 'missing_evidence',
        },
      ],
      dependencySnapshots: [],
    });

    expect(digest.digestRows.map((row) => row.issueIdentifier)).toEqual([
      'ONE-402',
      'ONE-401',
      'ONE-403',
    ]);
    expect(digest.digestRows[0]?.orderingKey).toEqual([
      1,
      0,
      1,
      'ONE-402',
      1,
      'artifacts/one-402/report.md',
    ]);
  });

  it('normalizes reason codes into the canonical release-gate set', () => {
    const digest = buildSettlementReleaseGateEvidenceDigest({
      candidateId: 'ONE-337',
      policyVersion: '2026.03.19',
      laneEvidence: [
        {
          issueIdentifier: 'ONE-501',
          evidenceType: 'artifact',
          artifactPath: 'artifacts/one-501/report.md',
          reasonCode: 'Missing Evidence Packet',
        },
        {
          issueIdentifier: 'ONE-502',
          evidenceType: 'log',
          artifactPath: 'artifacts/one-502/log.txt',
          reasonCode: 'ORDERING_regression_detected',
        },
        {
          issueIdentifier: 'ONE-503',
          evidenceType: 'test',
          artifactPath: 'artifacts/one-503/test.md',
          reasonCode: 'manual-reference',
        },
      ],
      dependencySnapshots: [
        {
          issueIdentifier: 'ONE-504',
          reasonCode: 'dependency waiting on upstream',
        },
        {
          issueIdentifier: 'ONE-505',
          reasonCode: 'risk approval gate',
        },
      ],
    });

    expect(digest.digestRows.map((row) => row.reasonCode)).toEqual([
      'missing_evidence',
      'ordering_regression',
      'reference_noncanonical',
    ]);
    expect(digest.blockingDependencies.map((row) => row.reasonCode)).toEqual([
      'dependency_blocked',
      'policy_violation',
    ]);
    expect(digest.missingEvidence.map((row) => row.reasonCode)).toEqual(['missing_evidence']);
    expect(digest.canonicalReasonCodes).toEqual([
      'dependency_blocked',
      'missing_evidence',
      'ordering_regression',
      'policy_violation',
      'reference_noncanonical',
    ]);
  });

  it('produces byte-stable payload and digestFingerprint for identical logical input across ordering differences', () => {
    const payload = {
      candidateId: 'ONE-337',
      policyVersion: '2026.03.19',
      laneEvidence: [
        {
          issueIdentifier: 'ONE-601',
          priorityWeight: 2,
          blockerWeight: 1,
          dependencyDepthWeight: 1,
          evidenceType: 'log',
          artifactPath: 'artifacts/one-601/log.txt',
          reasonCode: 'policy-violation',
        },
        {
          issueIdentifier: 'ONE-600',
          priorityWeight: 1,
          blockerWeight: 0,
          dependencyDepthWeight: 0,
          evidenceType: 'artifact',
          artifactPath: 'artifacts/one-600/report.md',
          reasonCode: 'missing evidence',
        },
      ],
      dependencySnapshots: [
        {
          issueIdentifier: 'ONE-602',
          blockerWeight: 2,
          dependencyDepthWeight: 3,
          reasonCode: 'dependency blocked',
        },
      ],
    };

    const first = buildSettlementReleaseGateEvidenceDigest(payload);
    const second = buildSettlementReleaseGateEvidenceDigest({
      ...payload,
      laneEvidence: [...payload.laneEvidence].reverse(),
      dependencySnapshots: [...payload.dependencySnapshots].reverse(),
    });

    expect(first.digestFingerprint).toBe(second.digestFingerprint);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
