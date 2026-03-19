import { createHash } from 'node:crypto';

export const SETTLEMENT_REMEDIATION_ACTION_CODES = [
  'backend-fix',
  'frontend-followup',
  'qa-verify',
  'ops-unblock',
] as const;

type RemediationActionCode = (typeof SETTLEMENT_REMEDIATION_ACTION_CODES)[number];
type RemediationActionState = 'ready' | 'blocked';

type ValidationError = {
  field: string;
  reason: 'required' | 'invalid_value';
  message: string;
};

type NormalizedLane = {
  issueIdentifier: string;
  issueLink: string;
  riskScore: number;
  reasonCodes: string[];
  dependencyIssueLinks: string[];
  blockedActionCodes: Set<RemediationActionCode>;
  actionEvidenceByCode: Record<
    RemediationActionCode,
    {
      ownerRole: string | null;
      expectedArtifactPath: string | null;
      verificationCommand: string | null;
      blockingReason: string | null;
    }
  >;
};

export type SettlementExceptionRemediationRunbook = {
  contract: 'settlement-exception-remediation-runbook.v1';
  generatedAt: string;
  actions: Array<{
    id: string;
    issueIdentifier: string;
    issueLink: string;
    actionCode: RemediationActionCode;
    lanePriorityWeight: number;
    riskScore: number;
    state: RemediationActionState;
    ownerRole: string;
    expectedArtifactPath: string;
    verificationCommand: string;
    blockingReason: string | null;
    reasonCodes: string[];
    dependencyGraph: {
      issueLinks: string[];
      dependsOnActionIds: string[];
    };
  }>;
  lanes: Record<RemediationActionCode, string[]>;
  fingerprint: string;
  metadata: {
    laneCount: number;
    actionCount: number;
    blockedActionCount: number;
  };
};

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;
const ACTION_ORDER: RemediationActionCode[] = [
  'backend-fix',
  'frontend-followup',
  'qa-verify',
  'ops-unblock',
];
const ACTION_WEIGHT: Record<RemediationActionCode, number> = {
  'backend-fix': 1,
  'frontend-followup': 2,
  'qa-verify': 3,
  'ops-unblock': 4,
};

export function buildSettlementExceptionRemediationRunbook(input: {
  scorecard: unknown[];
  asOfIso?: string;
}): SettlementExceptionRemediationRunbook {
  const errors: ValidationError[] = [];
  const generatedAt = toIsoOrDefault(input.asOfIso);

  const normalizedLanes = (Array.isArray(input.scorecard) ? input.scorecard : [])
    .map((lane, index) => normalizeLane(lane, index, errors))
    .sort((left, right) => left.issueIdentifier.localeCompare(right.issueIdentifier));

  const actions = normalizedLanes
    .flatMap((lane) => buildLaneActions(lane, errors))
    .sort(compareAction)
    .map((action) => ({
      ...action,
      dependencyGraph: {
        issueLinks: [...action.dependencyGraph.issueLinks].sort((left, right) => left.localeCompare(right)),
        dependsOnActionIds: [...action.dependencyGraph.dependsOnActionIds].sort((left, right) =>
          left.localeCompare(right),
        ),
      },
      reasonCodes: [...action.reasonCodes].sort((left, right) => left.localeCompare(right)),
    }));

  if (errors.length > 0) {
    throw {
      status: 400,
      response: {
        code: 'SETTLEMENT_REMEDIATION_RUNBOOK_VALIDATION_FAILED',
        message: 'remediation runbook validation failed',
        errors: [...errors].sort((left, right) => left.field.localeCompare(right.field)),
      },
    };
  }

  const lanes: Record<RemediationActionCode, string[]> = {
    'backend-fix': [],
    'frontend-followup': [],
    'qa-verify': [],
    'ops-unblock': [],
  };
  for (const action of actions) {
    lanes[action.actionCode].push(action.id);
  }

  const fingerprint = createHash('sha256')
    .update(
      JSON.stringify({
        contract: 'settlement-exception-remediation-runbook.v1',
        actions,
        lanes,
      }),
    )
    .digest('hex');

  return {
    contract: 'settlement-exception-remediation-runbook.v1',
    generatedAt,
    actions,
    lanes,
    fingerprint,
    metadata: {
      laneCount: normalizedLanes.length,
      actionCount: actions.length,
      blockedActionCount: actions.filter((action) => action.state === 'blocked').length,
    },
  };
}

function buildLaneActions(lane: NormalizedLane, errors: ValidationError[]) {
  const backendId = actionId(lane.issueIdentifier, 'backend-fix');
  const frontendId = actionId(lane.issueIdentifier, 'frontend-followup');

  return ACTION_ORDER.map((actionCode) => {
    const evidence = lane.actionEvidenceByCode[actionCode];
    const state: RemediationActionState = lane.blockedActionCodes.has(actionCode) ? 'blocked' : 'ready';
    validateEvidence(evidence, state, lane.issueIdentifier, actionCode, errors);

    const dependencyIssueLinks = lane.dependencyIssueLinks;
    const dependsOnActionIds =
      actionCode === 'frontend-followup'
        ? [backendId]
        : actionCode === 'qa-verify'
          ? [backendId, frontendId]
          : [];

    return {
      id: actionId(lane.issueIdentifier, actionCode),
      issueIdentifier: lane.issueIdentifier,
      issueLink: lane.issueLink,
      actionCode,
      lanePriorityWeight: ACTION_WEIGHT[actionCode],
      riskScore: lane.riskScore,
      state,
      ownerRole: evidence.ownerRole ?? '',
      expectedArtifactPath: evidence.expectedArtifactPath ?? '',
      verificationCommand: evidence.verificationCommand ?? '',
      blockingReason: state === 'blocked' ? evidence.blockingReason : null,
      reasonCodes: lane.reasonCodes,
      dependencyGraph: {
        issueLinks: dependencyIssueLinks,
        dependsOnActionIds,
      },
    };
  });
}

function normalizeLane(value: unknown, index: number, errors: ValidationError[]): NormalizedLane {
  const lane = toRecord(value);
  const issueIdentifier = normalizeIssueIdentifier(lane.issueIdentifier) ?? `UNKNOWN-${index}`;
  const issueLink = toCanonicalIssueLink(issueIdentifier);

  const reasonCodes = normalizeStringArray(lane.reasonCodes).sort((left, right) => left.localeCompare(right));
  const blockedFromReasons = reasonCodes.length > 0
    && reasonCodes.some((code) => code.startsWith('MISSING_') || code.startsWith('INVALID_'));
  const blockedActionCodes = normalizeActionCodes(lane.blockedActionCodes);
  if (blockedFromReasons && blockedActionCodes.size === 0) {
    blockedActionCodes.add('backend-fix');
  }

  const dependencyIssueLinks = normalizeDependencyIssueLinks(
    lane.dependencyIssueLinks ?? lane.dependencyIssueIds,
    index,
    errors,
  );

  return {
    issueIdentifier,
    issueLink,
    riskScore: normalizeNumber(lane.riskScore ?? lane.remediationPriorityScore),
    reasonCodes,
    dependencyIssueLinks,
    blockedActionCodes,
    actionEvidenceByCode: {
      'backend-fix': normalizeActionEvidence(lane, 'backend-fix'),
      'frontend-followup': normalizeActionEvidence(lane, 'frontend-followup'),
      'qa-verify': normalizeActionEvidence(lane, 'qa-verify'),
      'ops-unblock': normalizeActionEvidence(lane, 'ops-unblock'),
    },
  };
}

function normalizeActionEvidence(
  lane: Record<string, unknown>,
  actionCode: RemediationActionCode,
): {
  ownerRole: string | null;
  expectedArtifactPath: string | null;
  verificationCommand: string | null;
  blockingReason: string | null;
} {
  const byAction = toRecord(lane.actionEvidence);
  const scopedEvidence = toRecord(byAction[actionCode]);
  const sharedEvidence = toRecord(lane.evidence);

  return {
    ownerRole: normalizeString(scopedEvidence.ownerRole ?? sharedEvidence.ownerRole),
    expectedArtifactPath: normalizeString(scopedEvidence.expectedArtifactPath ?? sharedEvidence.expectedArtifactPath),
    verificationCommand: normalizeString(scopedEvidence.verificationCommand ?? sharedEvidence.verificationCommand),
    blockingReason: normalizeString(scopedEvidence.blockingReason ?? sharedEvidence.blockingReason),
  };
}

function validateEvidence(
  evidence: {
    ownerRole: string | null;
    expectedArtifactPath: string | null;
    verificationCommand: string | null;
    blockingReason: string | null;
  },
  state: RemediationActionState,
  issueIdentifier: string,
  actionCode: RemediationActionCode,
  errors: ValidationError[],
) {
  const baseField = `scorecard[${issueIdentifier}].actionEvidence.${actionCode}`;
  if (!evidence.ownerRole) {
    errors.push({
      field: `${baseField}.ownerRole`,
      reason: 'required',
      message: 'ownerRole is required',
    });
  }
  if (!evidence.expectedArtifactPath) {
    errors.push({
      field: `${baseField}.expectedArtifactPath`,
      reason: 'required',
      message: 'expectedArtifactPath is required',
    });
  }
  if (!evidence.verificationCommand) {
    errors.push({
      field: `${baseField}.verificationCommand`,
      reason: 'required',
      message: 'verificationCommand is required',
    });
  }
  if (state === 'blocked' && !evidence.blockingReason) {
    errors.push({
      field: `${baseField}.blockingReason`,
      reason: 'required',
      message: 'blockingReason is required when action state is blocked',
    });
  }
}

function normalizeDependencyIssueLinks(
  value: unknown,
  laneIndex: number,
  errors: ValidationError[],
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const links = value
    .map((entry, index) => {
      const normalized = toCanonicalIssueLink(normalizeString(entry) ?? '');
      if (!normalized) {
        errors.push({
          field: `scorecard[${laneIndex}].dependencyIssueLinks[${index}]`,
          reason: 'invalid_value',
          message: 'dependencyIssueLinks entries must be canonical issue links or issue identifiers',
        });
      }
      return normalized;
    })
    .filter((entry): entry is string => Boolean(entry));

  return [...new Set(links)].sort((left, right) => left.localeCompare(right));
}

function normalizeActionCodes(value: unknown): Set<RemediationActionCode> {
  if (!Array.isArray(value)) {
    return new Set<RemediationActionCode>();
  }

  const normalized = value
    .map((entry) => normalizeString(entry))
    .filter((entry): entry is string => Boolean(entry))
    .filter((entry): entry is RemediationActionCode => SETTLEMENT_REMEDIATION_ACTION_CODES.includes(entry as RemediationActionCode));

  return new Set<RemediationActionCode>(normalized);
}

function compareAction(
  left: {
    lanePriorityWeight: number;
    riskScore: number;
    issueIdentifier: string;
    actionCode: RemediationActionCode;
  },
  right: {
    lanePriorityWeight: number;
    riskScore: number;
    issueIdentifier: string;
    actionCode: RemediationActionCode;
  },
) {
  if (left.lanePriorityWeight !== right.lanePriorityWeight) {
    return left.lanePriorityWeight - right.lanePriorityWeight;
  }
  if (left.riskScore !== right.riskScore) {
    return right.riskScore - left.riskScore;
  }
  const issueCompare = left.issueIdentifier.localeCompare(right.issueIdentifier);
  if (issueCompare !== 0) {
    return issueCompare;
  }
  return left.actionCode.localeCompare(right.actionCode);
}

function actionId(issueIdentifier: string, actionCode: RemediationActionCode): string {
  return `${issueIdentifier}:${actionCode}`;
}

function toCanonicalIssueLink(value: string): string {
  const trimmed = normalizeString(value);
  if (!trimmed) {
    return '';
  }

  const identifier = normalizeIssueIdentifier(trimmed);
  if (identifier) {
    return `/ONE/issues/${identifier}`;
  }

  const match = trimmed.match(/(?:\/ONE\/issues\/|\/issues\/)([A-Z0-9]+-\d+)(#(?:comment-\d+|document-[a-z0-9-]+))?$/i);
  if (match) {
    return `/ONE/issues/${match[1].toUpperCase()}${match[2] ?? ''}`;
  }

  return '';
}

function normalizeIssueIdentifier(value: unknown): string | null {
  const candidate = normalizeString(value)?.toUpperCase() ?? null;
  if (!candidate) {
    return null;
  }
  return ISSUE_IDENTIFIER_PATTERN.test(candidate) ? candidate : null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.map((entry) => normalizeString(entry)).filter((entry): entry is string => Boolean(entry)))];
}

function normalizeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toIsoOrDefault(value: string | undefined): string {
  if (!value) {
    return '2026-03-19T00:00:00.000Z';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '2026-03-19T00:00:00.000Z' : date.toISOString();
}
