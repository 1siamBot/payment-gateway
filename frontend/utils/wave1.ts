export type RefundableStatus = 'CREATED' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export function canRefundStatus(status: RefundableStatus): boolean {
  return status === 'PAID';
}

export function applyRefundStatus<T extends { reference: string; status: RefundableStatus }>(
  rows: T[],
  reference: string,
): T[] {
  return rows.map((row) => {
    if (row.reference !== reference) {
      return row;
    }
    return {
      ...row,
      status: 'REFUNDED',
    };
  });
}

export type SettlementMerchantSummary = {
  merchantId: string;
  paidDepositAmount: number;
  paidWithdrawAmount: number;
  refundedAmount: number;
  netSettledAmount: number;
  transactionCount: number;
};

export function filterSettlementMerchants(
  merchants: SettlementMerchantSummary[],
  merchantId?: string,
): SettlementMerchantSummary[] {
  const normalized = merchantId?.trim();
  if (!normalized) {
    return merchants;
  }
  return merchants.filter((row) => row.merchantId === normalized);
}

export type ExceptionStatus = 'open' | 'investigating' | 'resolved' | 'ignored';
export type ExceptionAction = 'resolve' | 'ignore';
export type ExceptionActionErrorKind = 'version_conflict' | 'permission' | 'transient' | 'unknown';

export type SettlementExceptionRow = {
  id: string;
  merchantId: string;
  provider: string;
  status: ExceptionStatus;
  updatedAt: string;
};

export type SettlementExceptionAuditEntry = {
  id: string;
  action: ExceptionAction;
  reason: string;
  note: string | null;
  actor: string;
  createdAt: string;
};

export function normalizeOptional(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function validateExceptionActionInput(reason: string): string | null {
  const normalized = reason.trim();
  if (!normalized) {
    return 'Reason is required.';
  }
  if (normalized.length < 4) {
    return 'Reason must be at least 4 characters.';
  }
  return null;
}

export function applyExceptionActionOptimistic(
  rows: SettlementExceptionRow[],
  exceptionId: string,
  action: ExceptionAction,
  updatedAt: string,
): SettlementExceptionRow[] {
  const nextStatus: ExceptionStatus = action === 'resolve' ? 'resolved' : 'ignored';
  return rows.map((row) => {
    if (row.id !== exceptionId) {
      return row;
    }
    return {
      ...row,
      status: nextStatus,
      updatedAt,
    };
  });
}

export function prependExceptionAudit(
  entries: SettlementExceptionAuditEntry[],
  entry: SettlementExceptionAuditEntry,
): SettlementExceptionAuditEntry[] {
  return [entry, ...entries];
}

export type ExceptionActionFailure = {
  kind: ExceptionActionErrorKind;
  retryable: boolean;
  userMessage: string;
};

function coerceString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toMessageText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(', ');
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  if (value == null) {
    return '';
  }
  return String(value);
}

function parseCanonicalExceptionActionEnvelope(raw: unknown): {
  statusCode: number | null;
  code: string | null;
  reason: string | null;
  retryable: boolean | null;
  message: string;
} {
  if (!raw || typeof raw !== 'object') {
    return {
      statusCode: null,
      code: null,
      reason: null,
      retryable: null,
      message: toMessageText(raw),
    };
  }

  const payload = raw as Record<string, unknown>;
  const messageValue = payload.message;
  const messageObject = (typeof messageValue === 'object' && messageValue !== null)
    ? messageValue as Record<string, unknown>
    : null;

  return {
    statusCode: typeof payload.statusCode === 'number' ? payload.statusCode : null,
    code: coerceString(messageObject?.code ?? payload.code),
    reason: coerceString(messageObject?.reason ?? payload.reason),
    retryable: typeof (messageObject?.retryable ?? payload.retryable) === 'boolean'
      ? Boolean(messageObject?.retryable ?? payload.retryable)
      : null,
    message: toMessageText(messageObject?.message ?? messageValue ?? payload.error ?? ''),
  };
}

export function normalizeExceptionStatus(input: unknown): ExceptionStatus {
  if (input === 'open' || input === 'investigating' || input === 'resolved' || input === 'ignored') {
    return input;
  }
  if (input === 'OPEN') return 'open';
  if (input === 'INVESTIGATING') return 'investigating';
  if (input === 'RESOLVED') return 'resolved';
  if (input === 'IGNORED') return 'ignored';
  return 'open';
}

function hashFNV1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let idx = 0; idx < input.length; idx += 1) {
    hash ^= input.charCodeAt(idx);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function buildExceptionActionIdempotencyKey(input: {
  exceptionId: string;
  action: ExceptionAction;
  reason: string;
  note: string | null;
  expectedVersion: number;
  expectedUpdatedAt: string | null;
}): string {
  const fingerprint = JSON.stringify({
    exceptionId: input.exceptionId,
    action: input.action,
    reason: input.reason.trim(),
    note: input.note ?? null,
    expectedVersion: input.expectedVersion,
    expectedUpdatedAt: input.expectedUpdatedAt ?? null,
  });
  return `settlement-action-${hashFNV1a(fingerprint)}`;
}

export function classifyExceptionActionFailure(raw: unknown): ExceptionActionFailure {
  const parsed = parseCanonicalExceptionActionEnvelope(raw);
  const message = parsed.message.trim();
  const normalized = message.toLowerCase();

  if (
    parsed.code === 'SETTLEMENT_EXCEPTION_ACTION_CONFLICT'
    && (parsed.reason === 'stale_version' || parsed.reason === 'stale_updated_at')
  ) {
    return {
      kind: 'version_conflict',
      retryable: true,
      userMessage: 'This exception was updated by another operator. Refresh detail and retry with the latest version.',
    };
  }

  if (parsed.statusCode === 401 || parsed.statusCode === 403) {
    return {
      kind: 'permission',
      retryable: false,
      userMessage: 'Your role cannot perform this action. Use an admin/ops role.',
    };
  }

  if (
    parsed.code === 'SETTLEMENT_EXCEPTION_ACTION_CONFLICT'
    && (parsed.reason === 'idempotency_in_progress' || parsed.retryable === true)
  ) {
    return {
      kind: 'transient',
      retryable: true,
      userMessage: 'Action failed due to a temporary backend issue. Retry with the same reason.',
    };
  }

  if (normalized.includes('version conflict') || normalized.includes('stale version')) {
    return {
      kind: 'version_conflict',
      retryable: true,
      userMessage: 'This exception was updated by another operator. Refresh detail and retry with the latest version.',
    };
  }

  if (normalized.includes('forbidden') || normalized.includes('unauthorized') || normalized.includes('permission')) {
    return {
      kind: 'permission',
      retryable: false,
      userMessage: 'Your role cannot perform this action. Use an admin/ops role.',
    };
  }

  if (normalized.includes('timeout') || normalized.includes('temporar') || normalized.includes('unavailable')) {
    return {
      kind: 'transient',
      retryable: true,
      userMessage: 'Action failed due to a temporary backend issue. Retry with the same reason.',
    };
  }

  return {
    kind: 'unknown',
    retryable: false,
    userMessage: message || 'Action failed. Verify the input and try again.',
  };
}
