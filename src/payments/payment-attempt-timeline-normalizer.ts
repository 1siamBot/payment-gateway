import { TransactionStatus } from '@prisma/client';

export type PaymentAttemptTimelineStatus = 'completed' | 'pending' | 'failed' | 'info';

export type PaymentAttemptTimelineEvent = {
  id: string;
  occurredAt: string;
  stage: string;
  status: PaymentAttemptTimelineStatus;
  actor: string;
  note: string;
  source: 'attempt_event' | 'transaction_transition';
};

export const PAYMENT_ATTEMPT_TIMELINE_ERROR_CODES = [
  'TLN-001_INVALID_METADATA_JSON',
  'TLN-002_MISSING_STAGE',
  'TLN-003_INVALID_STATUS',
  'TLN-004_INVALID_OCCURRED_AT',
  'TLN-005_MISSING_TO_STATUS',
] as const;

export type PaymentAttemptTimelineErrorCode = typeof PAYMENT_ATTEMPT_TIMELINE_ERROR_CODES[number];

type ErrorCodeDefinition = {
  code: PaymentAttemptTimelineErrorCode;
  description: string;
  remediationHint: string;
};

const ERROR_CODE_DEFINITIONS: ErrorCodeDefinition[] = [
  {
    code: 'TLN-001_INVALID_METADATA_JSON',
    description: 'Audit row metadata is not valid JSON object payload.',
    remediationHint: 'Ensure audit metadata is serialized as object JSON before writing payment timeline events.',
  },
  {
    code: 'TLN-002_MISSING_STAGE',
    description: 'Attempt-event metadata is missing a non-empty stage field.',
    remediationHint: 'Populate metadata.stage with a stable operator-facing stage label.',
  },
  {
    code: 'TLN-003_INVALID_STATUS',
    description: 'Attempt-event metadata.status is not one of completed, pending, failed, info.',
    remediationHint: 'Normalize status to the supported enum before persisting the event.',
  },
  {
    code: 'TLN-004_INVALID_OCCURRED_AT',
    description: 'Timeline occurredAt timestamp is missing or not parseable as an ISO-8601 date.',
    remediationHint: 'Write metadata.occurredAt using a valid UTC timestamp string.',
  },
  {
    code: 'TLN-005_MISSING_TO_STATUS',
    description: 'Transaction transition event metadata is missing toStatus.',
    remediationHint: 'Persist transaction.transition with metadata.toStatus set to the resulting transaction status.',
  },
];

export type PaymentAttemptTimelineNormalization = {
  contract: 'payment-attempt-timeline.v2';
  malformedByCode: Record<PaymentAttemptTimelineErrorCode, number>;
  errorCodeMap: ErrorCodeDefinition[];
};

export type PaymentAttemptTimelineAuditLog = {
  id: string;
  eventType: string;
  createdAt: Date;
  actor: string;
  metadata: string;
};

type NormalizedRowWithEpoch = PaymentAttemptTimelineEvent & {
  occurredAtEpochMs: number;
};

type NormalizeRowResult =
  | { row: NormalizedRowWithEpoch }
  | { errorCode: PaymentAttemptTimelineErrorCode };

export type PaymentAttemptTimelineNormalizationResult = {
  events: PaymentAttemptTimelineEvent[];
  malformedCount: number;
  normalization: PaymentAttemptTimelineNormalization;
};

export function normalizePaymentAttemptTimelineAuditLogs(
  logs: PaymentAttemptTimelineAuditLog[],
): PaymentAttemptTimelineNormalizationResult {
  const rows: NormalizedRowWithEpoch[] = [];
  const malformedByCode = createEmptyErrorCodeCounts();

  for (const log of logs) {
    if (log.eventType === 'payment.attempt.event') {
      const normalized = normalizeAttemptEvent(log);
      if ('row' in normalized) {
        rows.push(normalized.row);
      } else {
        malformedByCode[normalized.errorCode] += 1;
      }
      continue;
    }

    if (log.eventType === 'transaction.transition') {
      const normalized = normalizeTransitionEvent(log);
      if ('row' in normalized) {
        rows.push(normalized.row);
      } else {
        malformedByCode[normalized.errorCode] += 1;
      }
    }
  }

  rows.sort((left, right) => {
    if (left.occurredAtEpochMs === right.occurredAtEpochMs) {
      return left.id.localeCompare(right.id);
    }
    return left.occurredAtEpochMs - right.occurredAtEpochMs;
  });

  const malformedCount = Object.values(malformedByCode).reduce((sum, count) => sum + count, 0);

  return {
    events: rows.map(({ occurredAtEpochMs: _ignored, ...row }) => row),
    malformedCount,
    normalization: {
      contract: 'payment-attempt-timeline.v2',
      malformedByCode,
      errorCodeMap: ERROR_CODE_DEFINITIONS,
    },
  };
}

function normalizeAttemptEvent(
  log: PaymentAttemptTimelineAuditLog,
): NormalizeRowResult {
  const metadataResult = parseAuditMetadataObject(log.metadata);
  if (!metadataResult.ok) {
    return { errorCode: 'TLN-001_INVALID_METADATA_JSON' };
  }

  const metadata = metadataResult.value;
  const stage = getNonEmptyString(metadata.stage);
  if (!stage) {
    return { errorCode: 'TLN-002_MISSING_STAGE' };
  }

  const status = normalizeTimelineStatus(metadata.status);
  if (!status) {
    return { errorCode: 'TLN-003_INVALID_STATUS' };
  }

  const occurredAt = normalizeDate(metadata.occurredAt);
  if (!occurredAt) {
    return { errorCode: 'TLN-004_INVALID_OCCURRED_AT' };
  }

  return {
    row: {
      id: log.id,
      occurredAt,
      stage,
      status,
      actor: getNonEmptyString(metadata.actor) ?? log.actor,
      note: getString(metadata.note) ?? '',
      source: 'attempt_event',
      occurredAtEpochMs: Date.parse(occurredAt),
    },
  };
}

function normalizeTransitionEvent(
  log: PaymentAttemptTimelineAuditLog,
): NormalizeRowResult {
  const metadataResult = parseAuditMetadataObject(log.metadata);
  if (!metadataResult.ok) {
    return { errorCode: 'TLN-001_INVALID_METADATA_JSON' };
  }

  const metadata = metadataResult.value;
  const toStatus = getNonEmptyString(metadata.toStatus);
  if (!toStatus) {
    return { errorCode: 'TLN-005_MISSING_TO_STATUS' };
  }

  const metadataOccurredAt = getString(metadata.occurredAt);
  const occurredAt = metadataOccurredAt ? normalizeDate(metadataOccurredAt) : log.createdAt.toISOString();
  if (!occurredAt) {
    return { errorCode: 'TLN-004_INVALID_OCCURRED_AT' };
  }

  return {
    row: {
      id: log.id,
      occurredAt,
      stage: `Status changed: ${getNonEmptyString(metadata.fromStatus) ?? 'NONE'} -> ${toStatus}`,
      status: mapTransactionStatusToTimelineStatus(toStatus),
      actor: log.actor,
      note: getString(metadata.note) ?? '',
      source: 'transaction_transition',
      occurredAtEpochMs: Date.parse(occurredAt),
    },
  };
}

function createEmptyErrorCodeCounts(): Record<PaymentAttemptTimelineErrorCode, number> {
  return {
    'TLN-001_INVALID_METADATA_JSON': 0,
    'TLN-002_MISSING_STAGE': 0,
    'TLN-003_INVALID_STATUS': 0,
    'TLN-004_INVALID_OCCURRED_AT': 0,
    'TLN-005_MISSING_TO_STATUS': 0,
  };
}

function parseAuditMetadataObject(metadata: string):
  | { ok: true; value: Record<string, unknown> }
  | { ok: false } {
  try {
    const parsed = JSON.parse(metadata) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false };
  }
}

function getString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function getNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeTimelineStatus(value: unknown): PaymentAttemptTimelineStatus | null {
  if (value === 'completed' || value === 'pending' || value === 'failed' || value === 'info') {
    return value;
  }
  return null;
}

function mapTransactionStatusToTimelineStatus(value: string): PaymentAttemptTimelineStatus {
  if (value === TransactionStatus.FAILED) {
    return 'failed';
  }
  if (value === TransactionStatus.PENDING || value === TransactionStatus.CREATED) {
    return 'pending';
  }
  return 'completed';
}
