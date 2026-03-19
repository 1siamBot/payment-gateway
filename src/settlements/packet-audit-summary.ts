import { createHash } from 'node:crypto';

export const SETTLEMENT_PACKET_AUDIT_PUBLISH_STATES = [
  'publish_blocked',
  'publish_ready',
  'publish_in_progress',
] as const;

export type SettlementPacketAuditPublishState = (typeof SETTLEMENT_PACKET_AUDIT_PUBLISH_STATES)[number];

export type SettlementPacketAuditSummary = {
  contract: 'settlement-packet-audit-summary.v1';
  evidenceRows: Array<{
    id: string;
    lanePriority: number;
    updatedAt: string;
    summary: string;
    artifactUrl: string | null;
  }>;
  blockerMetadata: {
    blockerOwner: string;
    blockerEta: string | null;
    retryAt: string | null;
    dependencyIssueIds: string[];
    publishState: SettlementPacketAuditPublishState;
  };
  totals: {
    evidenceCount: number;
    dependencyCount: number;
  };
  fingerprint: string;
};

export type SettlementPacketAuditValidationError = {
  field: string;
  reason: 'required' | 'invalid_type' | 'invalid_value';
  message: string;
};

type NormalizedEvidenceRow = {
  id: string;
  lanePriority: number;
  updatedAt: string;
  summary: string;
  artifactUrl: string | null;
};

export function buildSettlementPacketAuditSummary(input: {
  evidenceRows: unknown[];
  blockerMetadata?: unknown;
}): SettlementPacketAuditSummary {
  const errors: SettlementPacketAuditValidationError[] = [];
  const evidenceRows = normalizeEvidenceRows(input.evidenceRows, errors);
  const blockerMetadata = normalizeBlockerMetadata(input.blockerMetadata, errors);

  if (errors.length > 0) {
    throw createPacketAuditValidationError(errors);
  }

  const fingerprintPayload = {
    contract: 'settlement-packet-audit-summary.v1',
    evidenceRows,
    blockerMetadata,
  };
  const fingerprint = createHash('sha256')
    .update(JSON.stringify(fingerprintPayload))
    .digest('hex');

  return {
    contract: 'settlement-packet-audit-summary.v1',
    evidenceRows,
    blockerMetadata,
    totals: {
      evidenceCount: evidenceRows.length,
      dependencyCount: blockerMetadata.dependencyIssueIds.length,
    },
    fingerprint,
  };
}

function normalizeEvidenceRows(
  input: unknown[],
  errors: SettlementPacketAuditValidationError[],
): NormalizedEvidenceRow[] {
  const rows: NormalizedEvidenceRow[] = [];

  input.forEach((rawRow, index) => {
    if (!rawRow || typeof rawRow !== 'object' || Array.isArray(rawRow)) {
      errors.push({
        field: `evidenceRows[${index}]`,
        reason: 'invalid_type',
        message: 'evidence row must be an object',
      });
      return;
    }

    const row = rawRow as Record<string, unknown>;
    const id = normalizeNonEmptyString(row.id);
    if (!id) {
      errors.push({
        field: `evidenceRows[${index}].id`,
        reason: 'required',
        message: 'id must be a non-empty string',
      });
      return;
    }

    const lanePriority = normalizeFiniteInteger(row.lanePriority);
    if (lanePriority === null) {
      errors.push({
        field: `evidenceRows[${index}].lanePriority`,
        reason: 'invalid_type',
        message: 'lanePriority must be an integer',
      });
      return;
    }

    const updatedAt = normalizeIsoDateTime(row.updatedAt);
    if (!updatedAt) {
      errors.push({
        field: `evidenceRows[${index}].updatedAt`,
        reason: 'invalid_value',
        message: 'updatedAt must be an ISO-8601 datetime string',
      });
      return;
    }

    rows.push({
      id,
      lanePriority,
      updatedAt,
      summary: normalizeNonEmptyString(row.summary) ?? '',
      artifactUrl: normalizeOptionalString(row.artifactUrl),
    });
  });

  return rows.sort((left, right) => {
    if (left.lanePriority !== right.lanePriority) {
      return left.lanePriority - right.lanePriority;
    }
    if (left.updatedAt !== right.updatedAt) {
      return left.updatedAt.localeCompare(right.updatedAt);
    }
    return left.id.localeCompare(right.id);
  });
}

function normalizeBlockerMetadata(
  input: unknown,
  errors: SettlementPacketAuditValidationError[],
): {
  blockerOwner: string;
  blockerEta: string | null;
  retryAt: string | null;
  dependencyIssueIds: string[];
  publishState: SettlementPacketAuditPublishState;
} {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    errors.push({
      field: 'blockerMetadata',
      reason: 'required',
      message: 'blockerMetadata must be an object',
    });
    return {
      blockerOwner: '',
      blockerEta: null,
      retryAt: null,
      dependencyIssueIds: [],
      publishState: 'publish_blocked',
    };
  }

  const raw = input as Record<string, unknown>;
  const blockerOwner = normalizeNonEmptyString(raw.blockerOwner);
  if (!blockerOwner) {
    errors.push({
      field: 'blockerMetadata.blockerOwner',
      reason: 'required',
      message: 'blockerOwner must be a non-empty string',
    });
  }

  const blockerEta = normalizeNullableIsoDateTime(raw.blockerEta, 'blockerMetadata.blockerEta', errors);
  const retryAt = normalizeNullableIsoDateTime(raw.retryAt, 'blockerMetadata.retryAt', errors);
  const dependencyIssueIds = normalizeDependencyIssueIds(raw.dependencyIssueIds, errors);
  const publishState = normalizePublishState(raw.publishState, errors);

  return {
    blockerOwner: blockerOwner ?? '',
    blockerEta,
    retryAt,
    dependencyIssueIds,
    publishState,
  };
}

function normalizeDependencyIssueIds(
  input: unknown,
  errors: SettlementPacketAuditValidationError[],
): string[] {
  if (input === undefined || input === null) {
    return [];
  }
  if (!Array.isArray(input)) {
    errors.push({
      field: 'blockerMetadata.dependencyIssueIds',
      reason: 'invalid_type',
      message: 'dependencyIssueIds must be an array of non-empty strings',
    });
    return [];
  }

  const ids: string[] = [];
  input.forEach((value, index) => {
    const normalized = normalizeNonEmptyString(value);
    if (!normalized) {
      errors.push({
        field: `blockerMetadata.dependencyIssueIds[${index}]`,
        reason: 'invalid_value',
        message: 'dependency issue id must be a non-empty string',
      });
      return;
    }
    ids.push(normalized);
  });

  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

function normalizePublishState(
  input: unknown,
  errors: SettlementPacketAuditValidationError[],
): SettlementPacketAuditPublishState {
  if (input === undefined || input === null) {
    return 'publish_blocked';
  }
  const normalized = normalizeNonEmptyString(input);
  if (!normalized || !isPublishState(normalized)) {
    errors.push({
      field: 'blockerMetadata.publishState',
      reason: 'invalid_value',
      message: `publishState must be one of: ${SETTLEMENT_PACKET_AUDIT_PUBLISH_STATES.join(', ')}`,
    });
    return 'publish_blocked';
  }
  return normalized;
}

function normalizeNullableIsoDateTime(
  input: unknown,
  field: string,
  errors: SettlementPacketAuditValidationError[],
): string | null {
  if (input === undefined || input === null || input === '') {
    return null;
  }

  const normalized = normalizeIsoDateTime(input);
  if (!normalized) {
    errors.push({
      field,
      reason: 'invalid_value',
      message: 'must be an ISO-8601 datetime string when provided',
    });
    return null;
  }
  return normalized;
}

function createPacketAuditValidationError(errors: SettlementPacketAuditValidationError[]): Error {
  const sorted = [...errors].sort((left, right) => {
    if (left.field !== right.field) {
      return left.field.localeCompare(right.field);
    }
    if (left.reason !== right.reason) {
      return left.reason.localeCompare(right.reason);
    }
    return left.message.localeCompare(right.message);
  });

  const error = new Error('packet audit summary validation failed');
  (error as Error & { response: unknown; status: number }).response = {
    code: 'SETTLEMENT_PACKET_AUDIT_VALIDATION_FAILED',
    message: 'packet audit summary validation failed',
    errors: sorted,
  };
  (error as Error & { response: unknown; status: number }).status = 400;
  return error;
}

function normalizeNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeOptionalString(value: unknown): string | null {
  const normalized = normalizeNonEmptyString(value);
  return normalized ?? null;
}

function normalizeFiniteInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    return null;
  }
  return value;
}

function normalizeIsoDateTime(value: unknown): string | null {
  const candidate = normalizeNonEmptyString(value);
  if (!candidate) {
    return null;
  }
  const timestamp = Date.parse(candidate);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return new Date(timestamp).toISOString();
}

function isPublishState(value: string): value is SettlementPacketAuditPublishState {
  return (SETTLEMENT_PACKET_AUDIT_PUBLISH_STATES as readonly string[]).includes(value);
}
