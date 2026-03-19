import { createHash } from 'node:crypto';

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;
const POLICY_PROFILES = ['strict', 'balanced', 'expedite'] as const;
const CANONICAL_REASON_CODES = [
  'missing_evidence',
  'dependency_blocked',
  'policy_violation',
  'ordering_regression',
  'reference_noncanonical',
] as const;
const ETA_BANDS = ['same_day', 'next_window', 'requires_coordination'] as const;
const OWNER_LANES = ['backend', 'frontend', 'qa', 'ops'] as const;

type PolicyProfile = (typeof POLICY_PROFILES)[number];
type CanonicalReasonCode = (typeof CANONICAL_REASON_CODES)[number];
type EtaBand = (typeof ETA_BANDS)[number];
type OwnerLane = (typeof OWNER_LANES)[number];

type ValidationError = {
  field: string;
  reason: 'required' | 'invalid_value';
  message: string;
};

type RemediationAction = {
  actionId: string;
  issueIdentifier: string;
  reasonCode: CanonicalReasonCode;
  ownerLane: OwnerLane;
  blockingIssueIds: string[];
  recommendedCommand: string;
  etaBand: EtaBand;
  orderingKey: [number, number, string, string];
};

type RemediationActionEnvelope = Omit<RemediationAction, 'orderingKey'>;

type NormalizedDependency = {
  issueIdentifier: string;
  reasonCode: CanonicalReasonCode;
};

export type SettlementReleaseGateRemediationPlan = {
  contract: 'settlement-release-gate-remediation-plan.v1';
  schemaVersion: string;
  candidateId: string;
  policyVersion: string;
  policyProfile: PolicyProfile;
  remediationActions: RemediationActionEnvelope[];
  canonicalReasonCodes: CanonicalReasonCode[];
  metadata: {
    actionCount: number;
    blockedActionCount: number;
    profileWeight: number;
  };
  normalizationChecksum: string;
  remediationPlanChecksum: string;
};

export function buildSettlementReleaseGateRemediationPlan(input: {
  candidateId: string;
  laneEvidence: unknown[];
  dependencySnapshots: unknown[];
  policyVersion: string;
  policyProfile?: string;
  schemaVersion?: string;
}): SettlementReleaseGateRemediationPlan {
  const errors: ValidationError[] = [];
  const candidateId = normalizeString(input.candidateId);
  const policyVersion = normalizeString(input.policyVersion);
  const schemaVersion = normalizeString(input.schemaVersion) ?? '1.0.0';
  const policyProfile = normalizePolicyProfile(input.policyProfile);

  if (!candidateId) {
    errors.push(requiredError('candidateId'));
  }
  if (!policyVersion) {
    errors.push(requiredError('policyVersion'));
  }
  if (!Array.isArray(input.laneEvidence)) {
    errors.push(requiredArrayError('laneEvidence'));
  }
  if (!Array.isArray(input.dependencySnapshots)) {
    errors.push(requiredArrayError('dependencySnapshots'));
  }

  if (errors.length > 0) {
    throw {
      status: 400,
      response: {
        code: 'SETTLEMENT_RELEASE_GATE_REMEDIATION_PLAN_VALIDATION_FAILED',
        message: 'release-gate remediation plan validation failed',
        errors: errors.sort((left, right) => left.field.localeCompare(right.field)),
      },
    };
  }

  const candidatePrefix = normalizePrefix(candidateId!);
  const normalizedDependencies = (Array.isArray(input.dependencySnapshots) ? input.dependencySnapshots : [])
    .map((value, index) => normalizeDependency(value, index, candidatePrefix))
    .sort(compareDependency);

  const remediationActions = (Array.isArray(input.laneEvidence) ? input.laneEvidence : [])
    .map((value, index) =>
      normalizeAction(value, index, {
        candidateId: candidateId!,
        candidatePrefix,
        policyProfile,
        dependencies: normalizedDependencies,
      }))
    .sort(compareAction);

  const canonicalReasonCodes = dedupeStrings(remediationActions.map((row) => row.reasonCode), true) as CanonicalReasonCode[];

  const normalizedPayload = {
    contract: 'settlement-release-gate-remediation-plan.v1',
    schemaVersion,
    candidateId,
    policyVersion,
    policyProfile,
    remediationActions: remediationActions.map(stripOrderingKey),
    canonicalReasonCodes,
  };
  const normalizationChecksum = createHash('sha256').update(JSON.stringify(normalizedPayload)).digest('hex');

  const checksumPayload = {
    ...normalizedPayload,
    metadata: {
      actionCount: remediationActions.length,
      blockedActionCount: remediationActions.filter((row) => row.reasonCode === 'dependency_blocked').length,
      profileWeight: resolveProfileWeight(policyProfile),
    },
    normalizationChecksum,
  };
  const remediationPlanChecksum = createHash('sha256').update(JSON.stringify(checksumPayload)).digest('hex');

  return {
    contract: 'settlement-release-gate-remediation-plan.v1',
    schemaVersion,
    candidateId: candidateId!,
    policyVersion: policyVersion!,
    policyProfile,
    remediationActions: remediationActions.map(stripOrderingKey),
    canonicalReasonCodes,
    metadata: checksumPayload.metadata,
    normalizationChecksum,
    remediationPlanChecksum,
  };
}

function normalizeAction(
  value: unknown,
  index: number,
  defaults: {
    candidateId: string;
    candidatePrefix: string;
    policyProfile: PolicyProfile;
    dependencies: NormalizedDependency[];
  },
): RemediationAction {
  const row = toRecord(value);
  const issueIdentifier = normalizeIssueIdentifier(row.issueIdentifier) ?? `${defaults.candidatePrefix}-${index + 1}`;
  const reasonCode = normalizeCanonicalReasonCode(row.reasonCode ?? row.reason ?? row.status);
  const ownerLane = normalizeOwnerLane(row.ownerLane ?? row.owner ?? row.nextOwner ?? resolveOwnerLane(reasonCode));
  const blockingIssueIds = resolveBlockingIssueIds(row, defaults.dependencies, reasonCode, issueIdentifier);
  const recommendedCommand = resolveRecommendedCommand(ownerLane, reasonCode, issueIdentifier);
  const etaBand = resolveEtaBand(defaults.policyProfile, reasonCode);
  const actionId = `${defaults.candidateId.toLowerCase()}:${issueIdentifier.toLowerCase()}:${reasonCode}`;

  return {
    actionId,
    issueIdentifier,
    reasonCode,
    ownerLane,
    blockingIssueIds,
    recommendedCommand,
    etaBand,
    orderingKey: [
      resolvePriorityWeight(defaults.policyProfile, reasonCode),
      resolveOwnerWeight(ownerLane),
      issueIdentifier,
      actionId,
    ],
  };
}

function normalizeDependency(value: unknown, index: number, fallbackPrefix: string): NormalizedDependency {
  const row = toRecord(value);
  return {
    issueIdentifier: normalizeIssueIdentifier(row.issueIdentifier) ?? `${fallbackPrefix}-DEP-${index + 1}`,
    reasonCode: normalizeCanonicalReasonCode(row.reasonCode ?? row.reason ?? row.blockingReason),
  };
}

function stripOrderingKey(action: RemediationAction): RemediationActionEnvelope {
  return {
    actionId: action.actionId,
    issueIdentifier: action.issueIdentifier,
    reasonCode: action.reasonCode,
    ownerLane: action.ownerLane,
    blockingIssueIds: action.blockingIssueIds,
    recommendedCommand: action.recommendedCommand,
    etaBand: action.etaBand,
  };
}

function resolveBlockingIssueIds(
  row: Record<string, unknown>,
  dependencies: NormalizedDependency[],
  reasonCode: CanonicalReasonCode,
  issueIdentifier: string,
): string[] {
  const explicit = dedupeStrings([
    ...toStringArray(row.blockingIssueIds),
    ...toStringArray(row.dependencyIssueIds),
    ...toStringArray(row.blockers),
  ])
    .map((value) => normalizeIssueIdentifier(value))
    .filter((value): value is string => Boolean(value))
    .sort();

  if (explicit.length > 0) {
    return explicit;
  }

  if (reasonCode !== 'dependency_blocked') {
    return [];
  }

  const inferred = dependencies
    .filter((dependency) => dependency.issueIdentifier !== issueIdentifier)
    .map((dependency) => dependency.issueIdentifier);
  return dedupeStrings(inferred).sort();
}

function resolvePriorityWeight(profile: PolicyProfile, reasonCode: CanonicalReasonCode): number {
  const strict: Record<CanonicalReasonCode, number> = {
    dependency_blocked: 1,
    policy_violation: 2,
    missing_evidence: 3,
    ordering_regression: 4,
    reference_noncanonical: 5,
  };
  const balanced: Record<CanonicalReasonCode, number> = {
    dependency_blocked: 1,
    missing_evidence: 2,
    policy_violation: 3,
    ordering_regression: 4,
    reference_noncanonical: 5,
  };
  const expedite: Record<CanonicalReasonCode, number> = {
    missing_evidence: 1,
    ordering_regression: 2,
    dependency_blocked: 3,
    policy_violation: 4,
    reference_noncanonical: 5,
  };
  const table: Record<PolicyProfile, Record<CanonicalReasonCode, number>> = {
    strict,
    balanced,
    expedite,
  };
  return table[profile][reasonCode];
}

function resolveOwnerWeight(ownerLane: OwnerLane): number {
  const weights: Record<OwnerLane, number> = {
    backend: 1,
    frontend: 2,
    qa: 3,
    ops: 4,
  };
  return weights[ownerLane];
}

function resolveEtaBand(profile: PolicyProfile, reasonCode: CanonicalReasonCode): EtaBand {
  if (reasonCode === 'dependency_blocked') {
    return profile === 'expedite' ? 'next_window' : 'requires_coordination';
  }
  if (reasonCode === 'policy_violation') {
    return profile === 'strict' ? 'requires_coordination' : 'next_window';
  }
  if (reasonCode === 'missing_evidence') {
    return 'same_day';
  }
  return 'next_window';
}

function resolveRecommendedCommand(
  ownerLane: OwnerLane,
  reasonCode: CanonicalReasonCode,
  issueIdentifier: string,
): string {
  if (reasonCode === 'dependency_blocked') {
    return `paperclip dependencies unblock --issue ${issueIdentifier}`;
  }

  const commands: Record<OwnerLane, string> = {
    backend: `npm test -- test/settlement-release-gate-remediation-plan.spec.ts --issue ${issueIdentifier}`,
    frontend: `npm run test -- test/frontend.wave1.spec.ts --issue ${issueIdentifier}`,
    qa: `npm test -- test/settlement-release-gate-remediation-plan-endpoint.spec.ts --issue ${issueIdentifier}`,
    ops: `paperclip release-gate verify --issue ${issueIdentifier}`,
  };
  return commands[ownerLane];
}

function resolveOwnerLane(reasonCode: CanonicalReasonCode): OwnerLane {
  const map: Record<CanonicalReasonCode, OwnerLane> = {
    missing_evidence: 'backend',
    dependency_blocked: 'ops',
    policy_violation: 'qa',
    ordering_regression: 'backend',
    reference_noncanonical: 'frontend',
  };
  return map[reasonCode];
}

function normalizeIssueIdentifier(value: unknown): string | null {
  const raw = normalizeString(value);
  if (!raw) {
    return null;
  }
  const match = raw.match(ISSUE_IDENTIFIER_PATTERN);
  if (!match) {
    return null;
  }
  return `${match[1].toUpperCase()}-${Number.parseInt(match[2], 10)}`;
}

function normalizeCanonicalReasonCode(value: unknown): CanonicalReasonCode {
  const normalized = (normalizeString(value) ?? '')
    .toLowerCase()
    .replace(/[^a-z]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (normalized.includes('dependency') || normalized.includes('blocked')) {
    return 'dependency_blocked';
  }
  if (normalized.includes('policy')) {
    return 'policy_violation';
  }
  if (normalized.includes('ordering')) {
    return 'ordering_regression';
  }
  if (normalized.includes('missing') || normalized.includes('evidence')) {
    return 'missing_evidence';
  }
  return 'reference_noncanonical';
}

function normalizePolicyProfile(value: unknown): PolicyProfile {
  const profile = normalizeString(value)?.toLowerCase();
  if (profile === 'strict' || profile === 'balanced' || profile === 'expedite') {
    return profile;
  }
  return 'balanced';
}

function resolveProfileWeight(profile: PolicyProfile): number {
  const map: Record<PolicyProfile, number> = {
    strict: 1,
    balanced: 2,
    expedite: 3,
  };
  return map[profile];
}

function normalizeOwnerLane(value: unknown): OwnerLane {
  const raw = normalizeString(value)?.toLowerCase();
  if (raw === 'backend' || raw === 'frontend' || raw === 'qa' || raw === 'ops') {
    return raw;
  }
  return 'backend';
}

function compareAction(left: RemediationAction, right: RemediationAction): number {
  return compareTuple(left.orderingKey, right.orderingKey);
}

function compareDependency(left: NormalizedDependency, right: NormalizedDependency): number {
  return compareTuple([left.issueIdentifier, left.reasonCode], [right.issueIdentifier, right.reasonCode]);
}

function compareTuple(left: Array<string | number>, right: Array<string | number>): number {
  const size = Math.max(left.length, right.length);
  for (let index = 0; index < size; index += 1) {
    const lValue = left[index];
    const rValue = right[index];
    if (lValue === rValue) {
      continue;
    }
    if (lValue === undefined) {
      return -1;
    }
    if (rValue === undefined) {
      return 1;
    }
    if (typeof lValue === 'number' && typeof rValue === 'number') {
      return lValue - rValue;
    }
    return String(lValue).localeCompare(String(rValue));
  }
  return 0;
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => normalizeString(item)).filter((item): item is string => Boolean(item));
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizePrefix(candidateId: string): string {
  const match = candidateId.match(/^([a-z0-9]+)-\d+$/i);
  return match ? match[1].toUpperCase() : 'ONE';
}

function requiredError(field: string): ValidationError {
  return {
    field,
    reason: 'required',
    message: `${field} is required`,
  };
}

function requiredArrayError(field: string): ValidationError {
  return {
    field,
    reason: 'required',
    message: `${field} must be an array`,
  };
}

function dedupeStrings(values: string[], sortValues = false): string[] {
  const deduped = [...new Set(values)];
  return sortValues ? deduped.sort((left, right) => left.localeCompare(right)) : deduped;
}
