import { createHash } from 'node:crypto';

type DeltaClass = 'ahead' | 'on_track' | 'at_risk' | 'critical';
type PrMode = 'with_pr' | 'no_pr_yet' | 'unknown';

type ValidationError = {
  field: string;
  reason: 'required' | 'invalid_value';
  message: string;
};

type RemediationManifestEntry = {
  id: string;
  issueIdentifier: string;
  artifactCode: string;
  lanePriorityWeight: number;
  blockerRisk: number;
  baselineEta: string | null;
  latestEta: string | null;
  deltaMinutes: number;
  deltaClass: DeltaClass;
  evidence: {
    branch: string | null;
    fullSha: string | null;
    prMode: PrMode;
    testCommand: string | null;
    artifactPath: string | null;
    blockerOwner: string | null;
    blockerEta: string | null;
    completeness: {
      branch: boolean;
      fullSha: boolean;
      prMode: boolean;
      testCommand: boolean;
      artifactPath: boolean;
      blockerOwner: boolean;
      blockerEta: boolean;
    };
    missingRequiredFields: string[];
    isComplete: boolean;
  };
};

export type SettlementExceptionRemediationManifest = {
  contract: 'settlement-exception-remediation-manifest.v1';
  generatedAt: string;
  entries: RemediationManifestEntry[];
  fingerprint: string;
  metadata: {
    entryCount: number;
    completeCount: number;
    incompleteCount: number;
    noPrYetCount: number;
  };
};

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;

export function buildSettlementExceptionRemediationManifest(input: {
  runbook: unknown[];
  asOfIso?: string;
}): SettlementExceptionRemediationManifest {
  const errors: ValidationError[] = [];

  if (!Array.isArray(input.runbook)) {
    errors.push({
      field: 'runbook',
      reason: 'required',
      message: 'runbook must be an array',
    });
  }

  const generatedAt = toIsoOrDefault(input.asOfIso);
  const entries = (Array.isArray(input.runbook) ? input.runbook : [])
    .map((row, index) => buildEntry(row, index, errors))
    .sort(compareEntries)
    .map((entry) => ({
      ...entry,
      evidence: {
        ...entry.evidence,
        missingRequiredFields: [...entry.evidence.missingRequiredFields].sort((left, right) =>
          left.localeCompare(right),
        ),
      },
    }));

  if (errors.length > 0) {
    throw {
      status: 400,
      response: {
        code: 'SETTLEMENT_REMEDIATION_MANIFEST_VALIDATION_FAILED',
        message: 'remediation manifest validation failed',
        errors: [...errors].sort((left, right) => left.field.localeCompare(right.field)),
      },
    };
  }

  const fingerprint = createHash('sha256')
    .update(
      JSON.stringify({
        contract: 'settlement-exception-remediation-manifest.v1',
        entries,
      }),
    )
    .digest('hex');

  const completeCount = entries.filter((entry) => entry.evidence.isComplete).length;

  return {
    contract: 'settlement-exception-remediation-manifest.v1',
    generatedAt,
    entries,
    fingerprint,
    metadata: {
      entryCount: entries.length,
      completeCount,
      incompleteCount: entries.length - completeCount,
      noPrYetCount: entries.filter((entry) => entry.evidence.prMode === 'no_pr_yet').length,
    },
  };
}

function buildEntry(rowValue: unknown, index: number, errors: ValidationError[]): RemediationManifestEntry {
  const row = toRecord(rowValue);
  const issueIdentifier = normalizeIssueIdentifier(row.issueIdentifier) ?? `UNKNOWN-${index + 1}`;
  const artifactCode = normalizeString(row.artifactCode ?? row.actionCode) ?? `artifact-${index + 1}`;
  const lanePriorityWeight = normalizeNumber(row.lanePriorityWeight, 999);
  const blockerRisk = normalizeNumber(row.blockerRisk ?? row.riskScore ?? row.remediationPriorityScore, 0);

  const baselineEta = normalizeIsoOrNull(row.baselineEta);
  const latestEta = normalizeIsoOrNull(row.latestEta ?? row.blockerEta);
  const deltaMinutes = computeDeltaMinutes(baselineEta, latestEta);

  const evidence = normalizeEvidence(row, issueIdentifier, artifactCode, errors);
  return {
    id: `${issueIdentifier}:${artifactCode}`,
    issueIdentifier,
    artifactCode,
    lanePriorityWeight,
    blockerRisk,
    baselineEta,
    latestEta,
    deltaMinutes,
    deltaClass: classifyDelta(deltaMinutes),
    evidence,
  };
}

function normalizeEvidence(
  row: Record<string, unknown>,
  issueIdentifier: string,
  artifactCode: string,
  errors: ValidationError[],
) {
  const scoped = toRecord(row.evidence);
  const branch = normalizeString(scoped.branch ?? row.branch);
  const fullSha = normalizeString(scoped.fullSha ?? row.fullSha);
  const prMode = normalizePrMode(scoped.prMode ?? row.prMode);
  const testCommand = normalizeString(scoped.testCommand ?? row.testCommand ?? row.verificationCommand);
  const artifactPath = normalizeString(scoped.artifactPath ?? row.artifactPath ?? row.expectedArtifactPath);
  const blockerOwner = normalizeString(scoped.blockerOwner ?? row.blockerOwner);
  const blockerEta = normalizeIsoOrNull(scoped.blockerEta ?? row.blockerEta);

  const completeness = {
    branch: Boolean(branch),
    fullSha: Boolean(fullSha),
    prMode: prMode !== 'unknown',
    testCommand: Boolean(testCommand),
    artifactPath: Boolean(artifactPath),
    blockerOwner: Boolean(blockerOwner),
    blockerEta: Boolean(blockerEta),
  };

  const missingRequiredFields: string[] = [];
  if (!completeness.branch) {
    missingRequiredFields.push('branch');
    errors.push(missingFieldError(issueIdentifier, artifactCode, 'branch'));
  }
  if (!completeness.fullSha) {
    missingRequiredFields.push('fullSha');
    errors.push(missingFieldError(issueIdentifier, artifactCode, 'fullSha'));
  }
  if (!completeness.prMode) {
    missingRequiredFields.push('prMode');
    errors.push(missingFieldError(issueIdentifier, artifactCode, 'prMode'));
  }
  if (!completeness.testCommand) {
    missingRequiredFields.push('testCommand');
    errors.push(missingFieldError(issueIdentifier, artifactCode, 'testCommand'));
  }
  if (!completeness.artifactPath) {
    missingRequiredFields.push('artifactPath');
    errors.push(missingFieldError(issueIdentifier, artifactCode, 'artifactPath'));
  }

  if (prMode === 'no_pr_yet') {
    if (!completeness.blockerOwner) {
      missingRequiredFields.push('blockerOwner');
      errors.push(missingFieldError(issueIdentifier, artifactCode, 'blockerOwner'));
    }
    if (!completeness.blockerEta) {
      missingRequiredFields.push('blockerEta');
      errors.push(missingFieldError(issueIdentifier, artifactCode, 'blockerEta'));
    }
  }

  return {
    branch,
    fullSha,
    prMode,
    testCommand,
    artifactPath,
    blockerOwner,
    blockerEta,
    completeness,
    missingRequiredFields,
    isComplete: missingRequiredFields.length === 0,
  };
}

function missingFieldError(issueIdentifier: string, artifactCode: string, field: string): ValidationError {
  return {
    field: `runbook[${issueIdentifier}:${artifactCode}].evidence.${field}`,
    reason: 'required',
    message: `${field} is required`,
  };
}

function compareEntries(left: RemediationManifestEntry, right: RemediationManifestEntry): number {
  if (left.lanePriorityWeight !== right.lanePriorityWeight) {
    return left.lanePriorityWeight - right.lanePriorityWeight;
  }
  if (left.blockerRisk !== right.blockerRisk) {
    return left.blockerRisk - right.blockerRisk;
  }
  if (left.deltaMinutes !== right.deltaMinutes) {
    return left.deltaMinutes - right.deltaMinutes;
  }
  const issue = left.issueIdentifier.localeCompare(right.issueIdentifier);
  if (issue !== 0) {
    return issue;
  }
  return left.artifactCode.localeCompare(right.artifactCode);
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

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function normalizeIsoOrNull(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  const millis = Date.parse(normalized);
  if (!Number.isFinite(millis)) {
    return null;
  }
  return new Date(millis).toISOString();
}

function normalizePrMode(value: unknown): PrMode {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    return 'unknown';
  }
  if (['no_pr_yet', 'no-pr-yet', 'no_pr', 'missing_pr'].includes(normalized)) {
    return 'no_pr_yet';
  }
  if (['with_pr', 'has_pr', 'pr_open', 'pr_merged'].includes(normalized)) {
    return 'with_pr';
  }
  return 'unknown';
}

function classifyDelta(deltaMinutes: number): DeltaClass {
  if (deltaMinutes < 0) {
    return 'ahead';
  }
  if (deltaMinutes === 0) {
    return 'on_track';
  }
  if (deltaMinutes <= 120) {
    return 'at_risk';
  }
  return 'critical';
}

function computeDeltaMinutes(baselineEta: string | null, latestEta: string | null): number {
  if (!baselineEta || !latestEta) {
    return 0;
  }
  const baseline = Date.parse(baselineEta);
  const latest = Date.parse(latestEta);
  if (!Number.isFinite(baseline) || !Number.isFinite(latest)) {
    return 0;
  }
  return Math.round((latest - baseline) / 60000);
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toIsoOrDefault(value: unknown): string {
  const normalized = normalizeIsoOrNull(value);
  return normalized ?? new Date().toISOString();
}
