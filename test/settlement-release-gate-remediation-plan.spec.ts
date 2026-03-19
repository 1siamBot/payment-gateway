import { buildSettlementReleaseGateRemediationPlan } from '../src/settlements/release-gate-remediation-plan';

describe('settlement release-gate remediation plan', () => {
  it('returns contract shape with remediation actions and checksums', () => {
    const plan = buildSettlementReleaseGateRemediationPlan({
      candidateId: 'ONE-340',
      policyVersion: '2026.03.19',
      policyProfile: 'balanced',
      laneEvidence: [
        {
          issueIdentifier: 'ONE-701',
          reasonCode: 'missing evidence',
          ownerLane: 'backend',
        },
      ],
      dependencySnapshots: [],
    });

    expect(plan.contract).toBe('settlement-release-gate-remediation-plan.v1');
    expect(plan.remediationActions).toHaveLength(1);
    expect(plan.remediationActions[0]).toMatchObject({
      actionId: 'one-340:one-701:missing_evidence',
      reasonCode: 'missing_evidence',
      ownerLane: 'backend',
      blockingIssueIds: [],
      etaBand: 'same_day',
    });
    expect(plan.normalizationChecksum).toMatch(/^[a-f0-9]{64}$/);
    expect(plan.remediationPlanChecksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('keeps deterministic ordering and checksum for semantically identical payloads', () => {
    const payload = {
      candidateId: 'ONE-340',
      policyVersion: '2026.03.19',
      policyProfile: 'strict' as const,
      laneEvidence: [
        {
          issueIdentifier: 'ONE-710',
          reasonCode: 'policy violation',
          ownerLane: 'qa',
        },
        {
          issueIdentifier: 'ONE-709',
          reasonCode: 'dependency blocked',
          ownerLane: 'ops',
        },
      ],
      dependencySnapshots: [
        { issueIdentifier: 'ONE-690', reasonCode: 'dependency blocked' },
      ],
    };

    const first = buildSettlementReleaseGateRemediationPlan(payload);
    const second = buildSettlementReleaseGateRemediationPlan({
      ...payload,
      laneEvidence: [...payload.laneEvidence].reverse(),
      dependencySnapshots: [...payload.dependencySnapshots].reverse(),
    });

    expect(first.remediationActions.map((row) => row.issueIdentifier)).toEqual(['ONE-709', 'ONE-710']);
    expect(first.normalizationChecksum).toBe(second.normalizationChecksum);
    expect(first.remediationPlanChecksum).toBe(second.remediationPlanChecksum);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('normalizes non-canonical reasons into canonical reason codes', () => {
    const plan = buildSettlementReleaseGateRemediationPlan({
      candidateId: 'ONE-340',
      policyVersion: '2026.03.19',
      laneEvidence: [
        { issueIdentifier: 'ONE-721', reasonCode: 'missing evidence packet' },
        { issueIdentifier: 'ONE-722', reasonCode: 'policy-gate' },
        { issueIdentifier: 'ONE-723', reasonCode: 'ordering mismatch' },
        { issueIdentifier: 'ONE-724', reasonCode: 'manual reference follow-up' },
      ],
      dependencySnapshots: [],
    });

    expect(plan.remediationActions.map((row) => row.reasonCode)).toEqual([
      'missing_evidence',
      'policy_violation',
      'ordering_regression',
      'reference_noncanonical',
    ]);
    expect(plan.canonicalReasonCodes).toEqual([
      'missing_evidence',
      'ordering_regression',
      'policy_violation',
      'reference_noncanonical',
    ]);
  });

  it('fills blocked dependency paths from dependency snapshots when blockers are not explicit', () => {
    const plan = buildSettlementReleaseGateRemediationPlan({
      candidateId: 'ONE-340',
      policyVersion: '2026.03.19',
      laneEvidence: [
        { issueIdentifier: 'ONE-731', reasonCode: 'dependency waiting upstream' },
      ],
      dependencySnapshots: [
        { issueIdentifier: 'ONE-600', reasonCode: 'dependency blocked' },
        { issueIdentifier: 'ONE-601', reasonCode: 'policy violation' },
      ],
    });

    expect(plan.remediationActions[0]).toMatchObject({
      issueIdentifier: 'ONE-731',
      reasonCode: 'dependency_blocked',
      blockingIssueIds: ['ONE-600', 'ONE-601'],
      etaBand: 'requires_coordination',
    });
  });
});
