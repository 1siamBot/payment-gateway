import { createHash } from 'node:crypto';

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;

const CANONICAL_REASON_CODES = [
  'missing_evidence',
  'dependency_blocked',
  'policy_violation',
  'ordering_regression',
  'reference_noncanonical',
] as const;

type CanonicalReasonCode = (typeof CANONICAL_REASON_CODES)[number];
type RouteDecision = 'publish' | 'review' | 'hold' | 'reject';
type PublicationOutcome = 'ready_for_publication' | 'approval_required' | 'blocked';

type ValidationError = {
  field: string;
  reason: 'required' | 'invalid_value';
  message: string;
};

type RouteStep = {
  stepCode: string;
  owner: string;
  issueIdentifier: string;
  routeDecisionWeight: number;
  approvalCriticalityWeight: number;
  blockerWeight: number;
  dependencyDepthWeight: number;
  evidenceTypeWeight: number;
  evidenceType: string;
  evidencePath: string;
  reasonCode: CanonicalReasonCode;
};

type BlockingDependency = {
  issueIdentifier: string;
  dependencyDepthWeight: number;
  blockerWeight: number;
  reasonCode: CanonicalReasonCode;
};

type MissingEvidence = {
  evidenceTypeWeight: number;
  evidenceType: string;
  evidencePath: string;
  reasonCode: CanonicalReasonCode;
};

type RequiredApproval = {
  approvalKey: string;
  owner: string;
  criticality: string;
  approvalCriticalityWeight: number;
  reasonCode: CanonicalReasonCode;
};

export type SettlementRemediationPublicationRouteDecisionEnvelope = {
  contract: 'settlement-remediation-publication-route-decision-envelope.v1';
  schemaVersion: string;
  candidateId: string;
  routingPacketFingerprint: string;
  routeDecision: RouteDecision;
  policyVersion: string;
  publicationOutcome: PublicationOutcome;
  ownerDispatchPlan: Array<
    RouteStep & {
      orderingKey: [
        number,
        number,
        number,
        number,
        string,
        number,
        string,
      ];
    }
  >;
  blockingDependencies: BlockingDependency[];
  missingEvidence: MissingEvidence[];
  requiredApprovals: RequiredApproval[];
  nextOwner: string;
  canonicalReasonCodes: CanonicalReasonCode[];
  decisionEnvelopeFingerprint: string;
  metadata: {
    routeStepCount: number;
    blockedDependencyCount: number;
    missingEvidenceCount: number;
    requiredApprovalCount: number;
  };
};

export function buildSettlementRemediationPublicationRouteDecisionEnvelope(input: {
  candidateId: string;
  routingPacketFingerprint: string;
  routeDecision: string;
  routeSteps: unknown[];
  blockingDependencies: unknown[];
  missingEvidence: unknown[];
  requiredApprovals: unknown[];
  policyVersion: string;
  schemaVersion?: string;
}): SettlementRemediationPublicationRouteDecisionEnvelope {
  const errors: ValidationError[] = [];
  const candidateId = normalizeString(input.candidateId);
  const routingPacketFingerprint = normalizeString(input.routingPacketFingerprint);
  const routeDecision = normalizeRouteDecision(input.routeDecision) ?? 'review';
  const policyVersion = normalizeString(input.policyVersion);
  const schemaVersion = normalizeString(input.schemaVersion) ?? '1.0.0';

  if (!candidateId) {
    errors.push(requiredError('candidateId'));
  }
  if (!routingPacketFingerprint) {
    errors.push(requiredError('routingPacketFingerprint'));
  }
  if (!policyVersion) {
    errors.push(requiredError('policyVersion'));
  }

  const blockingDependencies = (Array.isArray(input.blockingDependencies) ? input.blockingDependencies : [])
    .map((row, index) => normalizeBlockingDependency(row, index))
    .sort(compareBlockingDependency);
  const missingEvidence = (Array.isArray(input.missingEvidence) ? input.missingEvidence : [])
    .map((row, index) => normalizeMissingEvidence(row, index))
    .sort(compareMissingEvidence);
  const requiredApprovals = (Array.isArray(input.requiredApprovals) ? input.requiredApprovals : [])
    .map((row, index) => normalizeRequiredApproval(row, index))
    .sort(compareRequiredApproval);

  const routeSteps = (Array.isArray(input.routeSteps) ? input.routeSteps : [])
    .map((row, index) =>
      normalizeRouteStep(row, index, {
        routeDecision,
        fallbackIssueIdentifier: blockingDependencies[0]?.issueIdentifier ?? `${normalizePrefix(candidateId)}-0`,
      }))
    .sort(compareRouteStep);

  if (routeSteps.length === 0) {
    errors.push({
      field: 'routeSteps',
      reason: 'required',
      message: 'routeSteps must contain at least one step',
    });
  }
  if (!Array.isArray(input.routeSteps)) {
    errors.push({
      field: 'routeSteps',
      reason: 'required',
      message: 'routeSteps must be an array',
    });
  }
  if (!Array.isArray(input.blockingDependencies)) {
    errors.push({
      field: 'blockingDependencies',
      reason: 'required',
      message: 'blockingDependencies must be an array',
    });
  }
  if (!Array.isArray(input.missingEvidence)) {
    errors.push({
      field: 'missingEvidence',
      reason: 'required',
      message: 'missingEvidence must be an array',
    });
  }
  if (!Array.isArray(input.requiredApprovals)) {
    errors.push({
      field: 'requiredApprovals',
      reason: 'required',
      message: 'requiredApprovals must be an array',
    });
  }

  if (errors.length > 0) {
    throw {
      status: 400,
      response: {
        code: 'SETTLEMENT_REMEDIATION_PUBLICATION_ROUTE_DECISION_ENVELOPE_VALIDATION_FAILED',
        message: 'remediation publication route-decision envelope validation failed',
        errors: [...errors].sort((left, right) => left.field.localeCompare(right.field)),
      },
    };
  }

  const publicationOutcome = resolvePublicationOutcome(routeDecision, blockingDependencies, missingEvidence, requiredApprovals);
  const nextOwner = resolveNextOwner(publicationOutcome, routeSteps, blockingDependencies, missingEvidence, requiredApprovals);
  const canonicalReasonCodes = dedupeStrings(
    [
      ...routeSteps.map((step) => step.reasonCode),
      ...blockingDependencies.map((row) => row.reasonCode),
      ...missingEvidence.map((row) => row.reasonCode),
      ...requiredApprovals.map((row) => row.reasonCode),
    ],
    true,
  ) as CanonicalReasonCode[];

  const ownerDispatchPlan = routeSteps.map((step) => ({
    ...step,
    orderingKey: [
      step.routeDecisionWeight,
      step.approvalCriticalityWeight,
      step.blockerWeight,
      step.dependencyDepthWeight,
      step.issueIdentifier,
      step.evidenceTypeWeight,
      step.evidencePath,
    ] as [number, number, number, number, string, number, string],
  }));

  const decisionEnvelopeFingerprint = createHash('sha256')
    .update(
      JSON.stringify({
        contract: 'settlement-remediation-publication-route-decision-envelope.v1',
        schemaVersion,
        candidateId,
        routingPacketFingerprint,
        routeDecision,
        policyVersion,
        publicationOutcome,
        ownerDispatchPlan,
        blockingDependencies,
        missingEvidence,
        requiredApprovals,
        nextOwner,
      }),
    )
    .digest('hex');

  return {
    contract: 'settlement-remediation-publication-route-decision-envelope.v1',
    schemaVersion,
    candidateId: candidateId!,
    routingPacketFingerprint: routingPacketFingerprint!,
    routeDecision,
    policyVersion: policyVersion!,
    publicationOutcome,
    ownerDispatchPlan,
    blockingDependencies,
    missingEvidence,
    requiredApprovals,
    nextOwner,
    canonicalReasonCodes,
    decisionEnvelopeFingerprint,
    metadata: {
      routeStepCount: ownerDispatchPlan.length,
      blockedDependencyCount: blockingDependencies.length,
      missingEvidenceCount: missingEvidence.length,
      requiredApprovalCount: requiredApprovals.length,
    },
  };
}

function normalizeRouteStep(
  value: unknown,
  index: number,
  defaults: {
    routeDecision: RouteDecision;
    fallbackIssueIdentifier: string;
  },
): RouteStep {
  const row = toRecord(value);
  const routeDecision = normalizeRouteDecision(row.routeDecision) ?? defaults.routeDecision;
  const issueIdentifier = normalizeIssueIdentifier(row.issueIdentifier) ?? defaults.fallbackIssueIdentifier;
  const evidenceType = normalizeString(row.evidenceType ?? row.artifactType) ?? 'generic';
  const evidencePath = normalizeString(row.evidencePath ?? row.artifactPath) ?? `evidence/${index + 1}`;

  return {
    stepCode: normalizeString(row.stepCode ?? row.stepId) ?? `step-${index + 1}`,
    owner: normalizeString(row.owner ?? row.ownerRole ?? row.nextOwner) ?? 'backend',
    issueIdentifier,
    routeDecisionWeight: normalizeNumber(row.routeDecisionWeight, routeDecisionWeight(routeDecision)),
    approvalCriticalityWeight: normalizeNumber(
      row.approvalCriticalityWeight,
      approvalCriticalityWeight(row.approvalCriticality ?? row.criticality),
    ),
    blockerWeight: normalizeNumber(row.blockerWeight, blockerWeight(row.blockingSeverity ?? row.blockerSeverity)),
    dependencyDepthWeight: normalizeNumber(row.dependencyDepthWeight, normalizeNumber(row.dependencyDepth, 0)),
    evidenceTypeWeight: normalizeNumber(row.evidenceTypeWeight, evidenceTypeWeight(evidenceType)),
    evidenceType,
    evidencePath,
    reasonCode: normalizeReasonCode(row.reasonCode ?? row.reason ?? row.blockingReason),
  };
}

function normalizeBlockingDependency(value: unknown, index: number): BlockingDependency {
  const row = toRecord(value);
  return {
    issueIdentifier: normalizeIssueIdentifier(row.issueIdentifier) ?? `ONE-${index + 1}`,
    dependencyDepthWeight: normalizeNumber(
      row.dependencyDepthWeight ?? row.dependencyDepth ?? row.depthWeight,
      normalizeNumber(row.dependencyDepth, 0),
    ),
    blockerWeight: normalizeNumber(row.blockerWeight, blockerWeight(row.blockingSeverity ?? row.severity)),
    reasonCode: normalizeReasonCode(row.reasonCode ?? row.reason ?? row.blockingReason ?? 'dependency_blocked'),
  };
}

function normalizeMissingEvidence(value: unknown, index: number): MissingEvidence {
  const row = toRecord(value);
  const evidenceType = normalizeString(row.evidenceType ?? row.type) ?? 'evidence';
  return {
    evidenceTypeWeight: normalizeNumber(row.evidenceTypeWeight, evidenceTypeWeight(evidenceType)),
    evidenceType,
    evidencePath: normalizeString(row.evidencePath ?? row.path) ?? `missing/${index + 1}`,
    reasonCode: normalizeReasonCode(row.reasonCode ?? row.reason ?? 'missing_evidence'),
  };
}

function normalizeRequiredApproval(value: unknown, index: number): RequiredApproval {
  const row = toRecord(value);
  const criticality = normalizeString(row.criticality ?? row.priority) ?? 'medium';
  return {
    approvalKey: normalizeString(row.approvalKey ?? row.key ?? row.approvalId) ?? `approval-${index + 1}`,
    owner: normalizeString(row.owner ?? row.ownerRole ?? row.approver) ?? 'approval-owner',
    criticality,
    approvalCriticalityWeight: normalizeNumber(
      row.approvalCriticalityWeight,
      approvalCriticalityWeight(criticality),
    ),
    reasonCode: normalizeReasonCode(row.reasonCode ?? row.reason ?? 'policy_violation'),
  };
}

function compareRouteStep(left: RouteStep, right: RouteStep): number {
  if (left.routeDecisionWeight !== right.routeDecisionWeight) {
    return left.routeDecisionWeight - right.routeDecisionWeight;
  }
  if (left.approvalCriticalityWeight !== right.approvalCriticalityWeight) {
    return left.approvalCriticalityWeight - right.approvalCriticalityWeight;
  }
  if (left.blockerWeight !== right.blockerWeight) {
    return left.blockerWeight - right.blockerWeight;
  }
  if (left.dependencyDepthWeight !== right.dependencyDepthWeight) {
    return left.dependencyDepthWeight - right.dependencyDepthWeight;
  }
  const issueOrder = left.issueIdentifier.localeCompare(right.issueIdentifier);
  if (issueOrder !== 0) {
    return issueOrder;
  }
  if (left.evidenceTypeWeight !== right.evidenceTypeWeight) {
    return left.evidenceTypeWeight - right.evidenceTypeWeight;
  }
  const evidencePathOrder = left.evidencePath.localeCompare(right.evidencePath);
  if (evidencePathOrder !== 0) {
    return evidencePathOrder;
  }
  return left.stepCode.localeCompare(right.stepCode);
}

function compareBlockingDependency(left: BlockingDependency, right: BlockingDependency): number {
  if (left.blockerWeight !== right.blockerWeight) {
    return left.blockerWeight - right.blockerWeight;
  }
  if (left.dependencyDepthWeight !== right.dependencyDepthWeight) {
    return left.dependencyDepthWeight - right.dependencyDepthWeight;
  }
  const issueOrder = left.issueIdentifier.localeCompare(right.issueIdentifier);
  if (issueOrder !== 0) {
    return issueOrder;
  }
  return left.reasonCode.localeCompare(right.reasonCode);
}

function compareMissingEvidence(left: MissingEvidence, right: MissingEvidence): number {
  if (left.evidenceTypeWeight !== right.evidenceTypeWeight) {
    return left.evidenceTypeWeight - right.evidenceTypeWeight;
  }
  const typeOrder = left.evidenceType.localeCompare(right.evidenceType);
  if (typeOrder !== 0) {
    return typeOrder;
  }
  const pathOrder = left.evidencePath.localeCompare(right.evidencePath);
  if (pathOrder !== 0) {
    return pathOrder;
  }
  return left.reasonCode.localeCompare(right.reasonCode);
}

function compareRequiredApproval(left: RequiredApproval, right: RequiredApproval): number {
  if (left.approvalCriticalityWeight !== right.approvalCriticalityWeight) {
    return left.approvalCriticalityWeight - right.approvalCriticalityWeight;
  }
  const keyOrder = left.approvalKey.localeCompare(right.approvalKey);
  if (keyOrder !== 0) {
    return keyOrder;
  }
  return left.owner.localeCompare(right.owner);
}

function resolvePublicationOutcome(
  routeDecision: RouteDecision,
  blockingDependencies: BlockingDependency[],
  missingEvidence: MissingEvidence[],
  requiredApprovals: RequiredApproval[],
): PublicationOutcome {
  if (routeDecision === 'reject' || routeDecision === 'hold') {
    return 'blocked';
  }
  if (missingEvidence.length > 0 || blockingDependencies.length > 0) {
    return 'blocked';
  }
  if (requiredApprovals.length > 0) {
    return 'approval_required';
  }
  return 'ready_for_publication';
}

function resolveNextOwner(
  publicationOutcome: PublicationOutcome,
  routeSteps: RouteStep[],
  blockingDependencies: BlockingDependency[],
  missingEvidence: MissingEvidence[],
  requiredApprovals: RequiredApproval[],
): string {
  if (publicationOutcome === 'blocked') {
    if (missingEvidence.length > 0) {
      return 'evidence-owner';
    }
    if (blockingDependencies.length > 0) {
      return 'dependency-owner';
    }
  }
  if (publicationOutcome === 'approval_required') {
    return requiredApprovals[0]?.owner ?? 'approval-owner';
  }
  return routeSteps[0]?.owner ?? 'publication-owner';
}

function normalizeRouteDecision(value: unknown): RouteDecision | null {
  const normalized = normalizeSlug(value);
  if (!normalized) {
    return null;
  }
  if (normalized === 'publish' || normalized === 'ready' || normalized === 'approved') {
    return 'publish';
  }
  if (normalized === 'review' || normalized === 'escalate') {
    return 'review';
  }
  if (normalized === 'hold' || normalized === 'blocked') {
    return 'hold';
  }
  if (normalized === 'reject' || normalized === 'denied') {
    return 'reject';
  }
  return 'review';
}

function routeDecisionWeight(value: RouteDecision | null): number {
  if (value === 'publish') {
    return 1;
  }
  if (value === 'review') {
    return 2;
  }
  if (value === 'hold') {
    return 3;
  }
  if (value === 'reject') {
    return 4;
  }
  return 5;
}

function approvalCriticalityWeight(value: unknown): number {
  const normalized = normalizeSlug(value);
  if (normalized === 'critical') {
    return 1;
  }
  if (normalized === 'high') {
    return 2;
  }
  if (normalized === 'medium') {
    return 3;
  }
  if (normalized === 'low') {
    return 4;
  }
  return 5;
}

function blockerWeight(value: unknown): number {
  const normalized = normalizeSlug(value);
  if (normalized === 'none' || normalized === 'clear') {
    return 0;
  }
  if (normalized === 'low') {
    return 1;
  }
  if (normalized === 'medium') {
    return 2;
  }
  if (normalized === 'high') {
    return 3;
  }
  if (normalized === 'critical') {
    return 4;
  }
  return 2;
}

function evidenceTypeWeight(value: unknown): number {
  const normalized = normalizeSlug(value);
  if (normalized === 'log') {
    return 1;
  }
  if (normalized === 'artifact') {
    return 2;
  }
  if (normalized === 'test') {
    return 3;
  }
  if (normalized === 'approval') {
    return 4;
  }
  return 5;
}

function normalizeReasonCode(value: unknown): CanonicalReasonCode {
  const normalized = normalizeSlug(value) ?? '';
  if (CANONICAL_REASON_CODES.includes(normalized as CanonicalReasonCode)) {
    return normalized as CanonicalReasonCode;
  }
  if (normalized.includes('missing') && normalized.includes('evidence')) {
    return 'missing_evidence';
  }
  if (normalized.includes('dependency') || normalized.includes('blocked')) {
    return 'dependency_blocked';
  }
  if (normalized.includes('policy') || normalized.includes('compliance') || normalized.includes('approval')) {
    return 'policy_violation';
  }
  if (normalized.includes('order') || normalized.includes('regression') || normalized.includes('determin')) {
    return 'ordering_regression';
  }
  return 'reference_noncanonical';
}

function normalizeIssueIdentifier(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized || !ISSUE_IDENTIFIER_PATTERN.test(normalized)) {
    return null;
  }
  const matches = normalized.match(ISSUE_IDENTIFIER_PATTERN);
  if (!matches) {
    return null;
  }
  return `${matches[1].toUpperCase()}-${matches[2]}`;
}

function normalizePrefix(value: string | null): string {
  const candidate = normalizeString(value);
  if (!candidate) {
    return 'ONE';
  }
  const token = candidate.split('-')[0] ?? 'ONE';
  return token.toUpperCase();
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSlug(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  return normalized
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

function normalizeNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function requiredError(field: string): ValidationError {
  return {
    field,
    reason: 'required',
    message: `${field} is required`,
  };
}

function dedupeStrings(values: string[], sort: boolean): string[] {
  const deduped = [...new Set(values)];
  if (!sort) {
    return deduped;
  }
  return deduped.sort((left, right) => left.localeCompare(right));
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}
