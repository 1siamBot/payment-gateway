import {
  buildSettlementRemediationPublicationRouteDecisionEnvelope,
} from '../src/settlements/remediation-publication-route-decision-envelope';

describe('settlement remediation publication route-decision envelope', () => {
  it('sorts owner dispatch plan deterministically by route-decision envelope ordering tuple', () => {
    const envelope = buildSettlementRemediationPublicationRouteDecisionEnvelope({
      candidateId: 'ONE-318',
      routingPacketFingerprint: 'packet-fp-1',
      routeDecision: 'review',
      policyVersion: '2026.03.19',
      routeSteps: [
        {
          stepCode: 'b',
          owner: 'qa',
          issueIdentifier: 'ONE-320',
          routeDecisionWeight: 2,
          approvalCriticalityWeight: 3,
          blockerWeight: 2,
          dependencyDepthWeight: 2,
          evidenceTypeWeight: 3,
          evidenceType: 'test',
          evidencePath: 'artifacts/one-320/qa.md',
          reasonCode: 'PolicyViolation',
        },
        {
          stepCode: 'a',
          owner: 'backend',
          issueIdentifier: 'ONE-319',
          routeDecisionWeight: 2,
          approvalCriticalityWeight: 1,
          blockerWeight: 1,
          dependencyDepthWeight: 1,
          evidenceTypeWeight: 2,
          evidenceType: 'artifact',
          evidencePath: 'artifacts/one-319/backend.md',
          reasonCode: 'DependencyBlocked',
        },
      ],
      blockingDependencies: [],
      missingEvidence: [],
      requiredApprovals: [],
    });

    expect(envelope.ownerDispatchPlan.map((step) => `${step.stepCode}:${step.issueIdentifier}`)).toEqual([
      'a:ONE-319',
      'b:ONE-320',
    ]);
    expect(envelope.ownerDispatchPlan[0]?.orderingKey).toEqual([
      2,
      1,
      1,
      1,
      'ONE-319',
      2,
      'artifacts/one-319/backend.md',
    ]);
  });

  it('normalizes all reason variants into canonical reason code set', () => {
    const envelope = buildSettlementRemediationPublicationRouteDecisionEnvelope({
      candidateId: 'ONE-318',
      routingPacketFingerprint: 'packet-fp-2',
      routeDecision: 'hold',
      policyVersion: '2026.03.19',
      routeSteps: [
        {
          stepCode: 'route-1',
          owner: 'backend',
          issueIdentifier: 'ONE-321',
          evidenceType: 'artifact',
          evidencePath: 'artifacts/one-321/backend.md',
          reasonCode: 'ORDERING_regression_detected',
        },
      ],
      blockingDependencies: [
        {
          issueIdentifier: 'ONE-322',
          blockingReason: 'dependency waiting on upstream',
        },
      ],
      missingEvidence: [
        {
          evidenceType: 'log',
          evidencePath: 'artifacts/one-321/log.txt',
          reason: 'Missing Evidence Packet',
        },
      ],
      requiredApprovals: [
        {
          approvalKey: 'risk-signoff',
          owner: 'risk',
          criticality: 'high',
          reason: 'policy compliance gate',
        },
        {
          approvalKey: 'manual-check',
          owner: 'ops',
          criticality: 'low',
          reason: 'unmapped signal',
        },
      ],
    });

    expect(envelope.ownerDispatchPlan[0]?.reasonCode).toBe('ordering_regression');
    expect(envelope.blockingDependencies[0]?.reasonCode).toBe('dependency_blocked');
    expect(envelope.missingEvidence[0]?.reasonCode).toBe('missing_evidence');
    expect(envelope.requiredApprovals[0]?.reasonCode).toBe('policy_violation');
    expect(envelope.requiredApprovals[1]?.reasonCode).toBe('reference_noncanonical');
    expect(envelope.canonicalReasonCodes).toEqual([
      'dependency_blocked',
      'missing_evidence',
      'ordering_regression',
      'policy_violation',
      'reference_noncanonical',
    ]);
  });

  it('produces byte-stable envelope and fingerprint for identical logical input across ordering differences', () => {
    const payload = {
      candidateId: 'ONE-318',
      routingPacketFingerprint: 'packet-fp-3',
      routeDecision: 'review',
      policyVersion: '2026.03.19',
      routeSteps: [
        {
          stepCode: 'r2',
          owner: 'qa',
          issueIdentifier: 'ONE-333',
          approvalCriticalityWeight: 2,
          blockerWeight: 1,
          dependencyDepthWeight: 0,
          evidenceType: 'test',
          evidencePath: 'artifacts/one-333/qa.md',
          reasonCode: 'policy-violation',
        },
        {
          stepCode: 'r1',
          owner: 'backend',
          issueIdentifier: 'ONE-332',
          approvalCriticalityWeight: 1,
          blockerWeight: 1,
          dependencyDepthWeight: 0,
          evidenceType: 'artifact',
          evidencePath: 'artifacts/one-332/backend.md',
          reasonCode: 'dependency-blocked',
        },
      ],
      blockingDependencies: [
        { issueIdentifier: 'ONE-450', dependencyDepth: 2, blockerWeight: 3, reasonCode: 'Dependency Blocked' },
        { issueIdentifier: 'ONE-449', dependencyDepth: 1, blockerWeight: 2, reasonCode: 'Dependency Blocked' },
      ],
      missingEvidence: [
        { evidenceType: 'artifact', evidencePath: 'artifacts/one-318/report.md', reasonCode: 'missing evidence' },
        { evidenceType: 'log', evidencePath: 'artifacts/one-318/trace.log', reasonCode: 'missing evidence' },
      ],
      requiredApprovals: [
        { approvalKey: 'ops', owner: 'ops', criticality: 'low', reasonCode: 'policy_violation' },
        { approvalKey: 'risk', owner: 'risk', criticality: 'critical', reasonCode: 'policy_violation' },
      ],
    };

    const first = buildSettlementRemediationPublicationRouteDecisionEnvelope(payload);
    const second = buildSettlementRemediationPublicationRouteDecisionEnvelope({
      ...payload,
      routeSteps: [...payload.routeSteps].reverse(),
      blockingDependencies: [...payload.blockingDependencies].reverse(),
      missingEvidence: [...payload.missingEvidence].reverse(),
      requiredApprovals: [...payload.requiredApprovals].reverse(),
    });

    expect(first.decisionEnvelopeFingerprint).toBe(second.decisionEnvelopeFingerprint);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
