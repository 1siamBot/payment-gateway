export const SETTLEMENT_EVIDENCE_GAP_REMEDIATION_CODES = [
  'MISSING_BRANCH',
  'MISSING_FULL_SHA',
  'MISSING_PR_LINK',
  'MISSING_TEST_COMMAND',
  'MISSING_ARTIFACT_PATH',
  'MISSING_BLOCKER_OWNER',
  'MISSING_BLOCKER_ETA',
] as const;

export type SettlementEvidenceGapRemediationCode =
  (typeof SETTLEMENT_EVIDENCE_GAP_REMEDIATION_CODES)[number];

export type SettlementEvidenceGapValidationError = {
  field: string;
  reason: 'required' | 'invalid_type' | 'invalid_value';
  message: string;
};

export type SettlementEvidenceGapSummary = {
  contract: 'settlement-evidence-gap-summary.v1';
  rows: Array<{
    lane: string;
    lanePriority: number;
    severity: string;
    missingFieldPriority: number;
    issueIdentifier: string;
    artifactPath: string;
    remediationHintCode: SettlementEvidenceGapRemediationCode;
    remediationHintMessage: string;
  }>;
  counters: {
    byLane: Array<{
      lane: string;
      severities: Array<{
        severity: string;
        completeCount: number;
        gapCount: number;
        totalCount: number;
      }>;
    }>;
    totals: {
      completeCount: number;
      gapCount: number;
      totalCount: number;
    };
  };
  metadata: {
    inputCount: number;
    acceptedCount: number;
    skippedCount: number;
    emittedGapRows: number;
  };
  remediationHintCodeMap: Array<{
    code: SettlementEvidenceGapRemediationCode;
    missingFieldPriority: number;
    message: string;
  }>;
};

type NormalizedEvidenceRow = {
  lane: string;
  lanePriority: number;
  severity: string;
  issueIdentifier: string;
  artifactPath: string;
  branch: string | null;
  fullSha: string | null;
  prLink: string | null;
  testCommand: string | null;
  blockerOwner: string | null;
  blockerEta: string | null;
};

const REMEDIATION_HINTS: Record<
  SettlementEvidenceGapRemediationCode,
  { missingFieldPriority: number; message: string }
> = {
  MISSING_BRANCH: {
    missingFieldPriority: 10,
    message: 'Populate branch with the source control branch name.',
  },
  MISSING_FULL_SHA: {
    missingFieldPriority: 20,
    message: 'Provide fullSha with the full 40-character commit SHA.',
  },
  MISSING_PR_LINK: {
    missingFieldPriority: 30,
    message: 'Provide prLink to the GitHub pull request for this delivery.',
  },
  MISSING_TEST_COMMAND: {
    missingFieldPriority: 40,
    message: 'Document the exact test command used to verify this change.',
  },
  MISSING_ARTIFACT_PATH: {
    missingFieldPriority: 50,
    message: 'Provide artifactPath pointing to the verification artifact or log file.',
  },
  MISSING_BLOCKER_OWNER: {
    missingFieldPriority: 60,
    message: 'When prLink is absent, provide blockerOwner responsible for the unblock action.',
  },
  MISSING_BLOCKER_ETA: {
    missingFieldPriority: 70,
    message: 'When prLink is absent, provide blockerEta as an ISO-8601 timestamp.',
  },
};

export function buildSettlementEvidenceGapSummary(input: {
  rows: unknown[];
}): SettlementEvidenceGapSummary {
  const validationErrors: SettlementEvidenceGapValidationError[] = [];
  const normalizedRows = normalizeEvidenceRows(input.rows, validationErrors);
  if (validationErrors.length > 0) {
    throw createEvidenceGapValidationError(validationErrors);
  }

  const gapRows: SettlementEvidenceGapSummary['rows'] = [];
  const laneCounters = new Map<string, Map<string, { completeCount: number; gapCount: number }>>();

  normalizedRows.forEach((row) => {
    const codes = classifyGapCodes(row);
    const laneBucket = laneCounters.get(row.lane) ?? new Map<string, { completeCount: number; gapCount: number }>();
    const severityBucket = laneBucket.get(row.severity) ?? { completeCount: 0, gapCount: 0 };
    if (codes.length > 0) {
      severityBucket.gapCount += 1;
    } else {
      severityBucket.completeCount += 1;
    }
    laneBucket.set(row.severity, severityBucket);
    laneCounters.set(row.lane, laneBucket);

    codes.forEach((code) => {
      gapRows.push({
        lane: row.lane,
        lanePriority: row.lanePriority,
        severity: row.severity,
        missingFieldPriority: REMEDIATION_HINTS[code].missingFieldPriority,
        issueIdentifier: row.issueIdentifier,
        artifactPath: row.artifactPath,
        remediationHintCode: code,
        remediationHintMessage: REMEDIATION_HINTS[code].message,
      });
    });
  });

  gapRows.sort((left, right) => {
    if (left.lanePriority !== right.lanePriority) {
      return left.lanePriority - right.lanePriority;
    }
    if (left.missingFieldPriority !== right.missingFieldPriority) {
      return left.missingFieldPriority - right.missingFieldPriority;
    }
    if (left.issueIdentifier !== right.issueIdentifier) {
      return left.issueIdentifier.localeCompare(right.issueIdentifier);
    }
    return left.artifactPath.localeCompare(right.artifactPath);
  });

  let totalCompleteCount = 0;
  let totalGapCount = 0;
  const byLane = [...laneCounters.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([lane, severityMap]) => {
      const severities = [...severityMap.entries()]
        .sort((left, right) => compareSeverity(left[0], right[0]))
        .map(([severity, counts]) => {
          totalCompleteCount += counts.completeCount;
          totalGapCount += counts.gapCount;
          return {
            severity,
            completeCount: counts.completeCount,
            gapCount: counts.gapCount,
            totalCount: counts.completeCount + counts.gapCount,
          };
        });

      return {
        lane,
        severities,
      };
    });

  return {
    contract: 'settlement-evidence-gap-summary.v1',
    rows: gapRows,
    counters: {
      byLane,
      totals: {
        completeCount: totalCompleteCount,
        gapCount: totalGapCount,
        totalCount: totalCompleteCount + totalGapCount,
      },
    },
    metadata: {
      inputCount: input.rows.length,
      acceptedCount: normalizedRows.length,
      skippedCount: input.rows.length - normalizedRows.length,
      emittedGapRows: gapRows.length,
    },
    remediationHintCodeMap: SETTLEMENT_EVIDENCE_GAP_REMEDIATION_CODES.map((code) => ({
      code,
      missingFieldPriority: REMEDIATION_HINTS[code].missingFieldPriority,
      message: REMEDIATION_HINTS[code].message,
    })),
  };
}

function normalizeEvidenceRows(
  rows: unknown[],
  errors: SettlementEvidenceGapValidationError[],
): NormalizedEvidenceRow[] {
  return rows
    .map((row, index) => normalizeEvidenceRow(row, index, errors))
    .filter((row): row is NormalizedEvidenceRow => row !== null);
}

function normalizeEvidenceRow(
  value: unknown,
  index: number,
  errors: SettlementEvidenceGapValidationError[],
): NormalizedEvidenceRow | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const lane = normalizeNonEmptyString(row.lane);
  const lanePriority = normalizeInteger(row.lanePriority);
  const severity = normalizeNonEmptyString(row.severity);
  const issueIdentifier = normalizeNonEmptyString(row.issueIdentifier);

  if (!lane || lanePriority === null || !severity || !issueIdentifier) {
    return null;
  }

  const prLink = normalizeOptionalString(row.prLink);
  const blockerOwner = normalizeOptionalString(row.blockerOwner);
  const blockerEta = normalizeOptionalIsoDateTime(
    row.blockerEta,
    `rows[${index}].blockerEta`,
    errors,
  );

  if (!prLink) {
    if (!blockerOwner) {
      errors.push({
        field: `rows[${index}].blockerOwner`,
        reason: 'required',
        message: 'blockerOwner is required when prLink is absent',
      });
    }
    if (!blockerEta) {
      errors.push({
        field: `rows[${index}].blockerEta`,
        reason: 'required',
        message: 'blockerEta is required when prLink is absent',
      });
    }
  }

  return {
    lane,
    lanePriority,
    severity,
    issueIdentifier,
    artifactPath: normalizeOptionalString(row.artifactPath) ?? '',
    branch: normalizeOptionalString(row.branch),
    fullSha: normalizeOptionalString(row.fullSha),
    prLink,
    testCommand: normalizeOptionalString(row.testCommand),
    blockerOwner,
    blockerEta,
  };
}

function classifyGapCodes(row: NormalizedEvidenceRow): SettlementEvidenceGapRemediationCode[] {
  const codes: SettlementEvidenceGapRemediationCode[] = [];

  if (!row.branch) {
    codes.push('MISSING_BRANCH');
  }
  if (!row.fullSha) {
    codes.push('MISSING_FULL_SHA');
  }
  if (!row.prLink) {
    codes.push('MISSING_PR_LINK');
  }
  if (!row.testCommand) {
    codes.push('MISSING_TEST_COMMAND');
  }
  if (!row.artifactPath) {
    codes.push('MISSING_ARTIFACT_PATH');
  }
  if (!row.prLink && !row.blockerOwner) {
    codes.push('MISSING_BLOCKER_OWNER');
  }
  if (!row.prLink && !row.blockerEta) {
    codes.push('MISSING_BLOCKER_ETA');
  }

  return codes;
}

function compareSeverity(left: string, right: string): number {
  const leftRank = severityRank(left);
  const rightRank = severityRank(right);
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }
  return left.localeCompare(right);
}

function severityRank(severity: string): number {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 1;
    case 'high':
      return 2;
    case 'medium':
      return 3;
    case 'low':
      return 4;
    default:
      return 5;
  }
}

function normalizeNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeOptionalString(value: unknown): string | null {
  return normalizeNonEmptyString(value);
}

function normalizeInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    return null;
  }
  return value;
}

function normalizeOptionalIsoDateTime(
  value: unknown,
  field: string,
  errors: SettlementEvidenceGapValidationError[],
): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const normalized = normalizeNonEmptyString(value);
  if (!normalized) {
    return null;
  }
  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) {
    errors.push({
      field,
      reason: 'invalid_value',
      message: 'must be an ISO-8601 datetime string when provided',
    });
    return null;
  }
  return new Date(timestamp).toISOString();
}

function createEvidenceGapValidationError(errors: SettlementEvidenceGapValidationError[]): {
  status: 400;
  response: {
    code: 'SETTLEMENT_EVIDENCE_GAP_VALIDATION_FAILED';
    message: 'evidence gap summary validation failed';
    errors: SettlementEvidenceGapValidationError[];
  };
} {
  const stableErrors = [...errors].sort((left, right) => {
    if (left.field !== right.field) {
      return left.field.localeCompare(right.field);
    }
    if (left.reason !== right.reason) {
      return left.reason.localeCompare(right.reason);
    }
    return left.message.localeCompare(right.message);
  });

  return {
    status: 400,
    response: {
      code: 'SETTLEMENT_EVIDENCE_GAP_VALIDATION_FAILED',
      message: 'evidence gap summary validation failed',
      errors: stableErrors,
    },
  };
}
