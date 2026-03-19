import { buildSettlementExceptionRemediationRunbook } from '../src/settlements/remediation-runbook';

describe('settlement remediation runbook', () => {
  it('sorts actions deterministically by lanePriorityWeight, riskScore, issueIdentifier, and actionCode', () => {
    const runbook = buildSettlementExceptionRemediationRunbook({
      asOfIso: '2026-03-19T10:00:00Z',
      scorecard: [
        {
          issueIdentifier: 'ONE-301',
          remediationPriorityScore: 10,
          dependencyIssueLinks: ['ONE-241'],
          evidence: {
            ownerRole: 'backend',
            expectedArtifactPath: 'artifacts/one-301/backend.md',
            verificationCommand: 'npm test -- test/settlement-remediation-runbook.spec.ts',
          },
        },
        {
          issueIdentifier: 'ONE-300',
          remediationPriorityScore: 50,
          dependencyIssueLinks: ['ONE-241'],
          evidence: {
            ownerRole: 'backend',
            expectedArtifactPath: 'artifacts/one-300/backend.md',
            verificationCommand: 'npm test -- test/settlement-remediation-runbook.spec.ts',
          },
        },
      ],
    });

    expect(runbook.actions.slice(0, 4).map((action) => `${action.actionCode}:${action.issueIdentifier}:${action.riskScore}`)).toEqual([
      'backend-fix:ONE-300:50',
      'backend-fix:ONE-301:10',
      'frontend-followup:ONE-300:50',
      'frontend-followup:ONE-301:10',
    ]);
  });

  it('normalizes canonical dependency links and stays byte-stable for semantically identical input', () => {
    const payload = {
      asOfIso: '2026-03-19T10:00:00Z',
      scorecard: [
        {
          issueIdentifier: 'ONE-264',
          remediationPriorityScore: 20,
          dependencyIssueLinks: ['/issues/ONE-241#document-plan', 'ONE-262', '/ONE/issues/ONE-262'],
          evidence: {
            ownerRole: 'backend',
            expectedArtifactPath: 'artifacts/one-264/backend.md',
            verificationCommand: 'npm test -- test/settlement-remediation-runbook.spec.ts',
          },
        },
      ],
    };

    const first = buildSettlementExceptionRemediationRunbook(payload);
    const second = buildSettlementExceptionRemediationRunbook({
      ...payload,
      scorecard: [
        {
          ...payload.scorecard[0],
          dependencyIssueLinks: [...payload.scorecard[0].dependencyIssueLinks].reverse(),
        },
      ],
    });

    expect(first.actions[0].dependencyGraph.issueLinks).toEqual([
      '/ONE/issues/ONE-241#document-plan',
      '/ONE/issues/ONE-262',
    ]);
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('requires blockingReason when blocked action state is requested', () => {
    try {
      buildSettlementExceptionRemediationRunbook({
        scorecard: [
          {
            issueIdentifier: 'ONE-265',
            remediationPriorityScore: 40,
            blockedActionCodes: ['backend-fix'],
            dependencyIssueLinks: ['ONE-241'],
            actionEvidence: {
              'backend-fix': {
                ownerRole: 'backend',
                expectedArtifactPath: 'artifacts/one-265/backend.md',
                verificationCommand: 'npm test -- test/settlement-remediation-runbook.spec.ts',
              },
              'frontend-followup': {
                ownerRole: 'frontend',
                expectedArtifactPath: 'artifacts/one-265/frontend.md',
                verificationCommand: 'npm test -- test/frontend.wave1.spec.ts',
              },
              'qa-verify': {
                ownerRole: 'qa',
                expectedArtifactPath: 'artifacts/one-265/qa.md',
                verificationCommand: 'npm test -- test/frontend.wave1.spec.ts',
              },
              'ops-unblock': {
                ownerRole: 'ops',
                expectedArtifactPath: 'artifacts/one-265/ops.md',
                verificationCommand: 'npm test -- test/frontend.wave1.spec.ts',
              },
            },
          },
        ],
      });
      fail('Expected validation error');
    } catch (error) {
      expect(error).toMatchObject({
        response: {
          code: 'SETTLEMENT_REMEDIATION_RUNBOOK_VALIDATION_FAILED',
        },
      });
    }
  });
});
