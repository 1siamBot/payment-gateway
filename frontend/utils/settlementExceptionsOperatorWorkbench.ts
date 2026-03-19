import type { SettlementExceptionInboxRow, SettlementExceptionStatus } from './settlementExceptionsInbox';

export type OperatorWorkbenchMode =
  | 'api'
  | 'fixture_success'
  | 'fixture_loading'
  | 'fixture_empty'
  | 'fixture_validation_error'
  | 'fixture_stale_conflict'
  | 'fixture_duplicate_event';

export type OperatorWorkbenchDataSource = 'api' | 'fixture';

export type ExceptionCommandAction = 'acknowledge' | 'assign' | 'resolve';

export type CommandOutcomeRail =
  | 'idle'
  | 'loading'
  | 'success'
  | 'backend_validation_error'
  | 'invalid_prior_state'
  | 'stale_transition_update'
  | 'duplicate_event'
  | 'unknown_error';

export type OperatorWorkbenchViewState = {
  key: 'loading' | 'error' | 'empty' | 'ready';
  message: string;
  showRetry: boolean;
};

export type SettlementExceptionCommandRequest = {
  exceptionId: string;
  reason: string;
  expectedVersion: number;
  expectedUpdatedAt?: string;
  note?: string;
  owner?: string;
  idempotencyKey?: string;
};

export type SettlementExceptionCommandResponse = {
  id: string;
  status: SettlementExceptionStatus;
  version: number;
  updatedAt: string;
  latestOperatorReason?: string | null;
  latestOperatorNote?: string | null;
};

type RequestFn = <T>(path: string, options?: {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}) => Promise<T>;

const CONFLICT_REASON_TO_RAIL: Record<string, CommandOutcomeRail> = {
  invalid_prior_state: 'invalid_prior_state',
  invalid_transition: 'invalid_prior_state',
  terminal_status: 'invalid_prior_state',
  stale_transition_update: 'stale_transition_update',
  stale_version: 'stale_transition_update',
  stale_updated_at: 'stale_transition_update',
  duplicate_event: 'duplicate_event',
  idempotency_key_reused: 'duplicate_event',
  idempotency_in_progress: 'duplicate_event',
};

export function resolveOperatorWorkbenchDataSource(input: {
  mode: OperatorWorkbenchMode;
  latestApiStatusCode?: number;
}): OperatorWorkbenchDataSource {
  if (input.mode !== 'api') {
    return 'fixture';
  }
  if (input.latestApiStatusCode === 404 || input.latestApiStatusCode === 501) {
    return 'fixture';
  }
  return 'api';
}

export function buildOperatorWorkbenchViewState(input: {
  loading: boolean;
  error: string;
  rows: SettlementExceptionInboxRow[];
  loadingMessage: string;
  emptyMessage: string;
  readyMessage: string;
}): OperatorWorkbenchViewState {
  if (input.loading) {
    return { key: 'loading', message: input.loadingMessage, showRetry: false };
  }
  if (input.error) {
    return { key: 'error', message: input.error, showRetry: true };
  }
  if (input.rows.length === 0) {
    return { key: 'empty', message: input.emptyMessage, showRetry: false };
  }
  return { key: 'ready', message: input.readyMessage, showRetry: false };
}

export function createSettlementExceptionCommandClient(
  request: RequestFn,
  authHeaders: () => Record<string, string>,
) {
  async function postCommand(
    endpoint: string,
    input: SettlementExceptionCommandRequest,
  ): Promise<SettlementExceptionCommandResponse> {
    const body = {
      reason: input.reason.trim(),
      note: input.note?.trim() || undefined,
      owner: input.owner?.trim() || undefined,
      expectedVersion: input.expectedVersion,
      expectedUpdatedAt: input.expectedUpdatedAt,
      idempotencyKey: input.idempotencyKey,
    };

    return request<SettlementExceptionCommandResponse>(endpoint, {
      method: 'POST',
      headers: authHeaders(),
      body,
    });
  }

  return {
    acknowledge(input: SettlementExceptionCommandRequest) {
      return postCommand(`/settlements/exceptions/${input.exceptionId}/acknowledge`, input);
    },
    assign(input: SettlementExceptionCommandRequest) {
      return postCommand(`/settlements/exceptions/${input.exceptionId}/assign-owner`, input);
    },
    resolve(input: SettlementExceptionCommandRequest) {
      return postCommand(`/settlements/exceptions/${input.exceptionId}/mark-resolved`, input);
    },
  };
}

export function buildCommandIdempotencyKey(input: {
  exceptionId: string;
  action: ExceptionCommandAction;
  reason: string;
  owner?: string;
  expectedVersion: number;
}): string {
  const owner = input.owner?.trim() || 'none';
  return `se-command-${input.action}-${input.exceptionId}-${input.expectedVersion}-${normalizeKeyToken(input.reason)}-${normalizeKeyToken(owner)}`;
}

export function shouldBlockDuplicateCommand(
  inflightKeys: ReadonlySet<string>,
  idempotencyKey: string,
): boolean {
  return inflightKeys.has(idempotencyKey);
}

export function resolveCommandOutcomeRail(error: unknown): CommandOutcomeRail {
  const payload = extractPayload(error);
  const reason = normalizeReasonCode(payload?.reason);
  if (reason && CONFLICT_REASON_TO_RAIL[reason]) {
    return CONFLICT_REASON_TO_RAIL[reason];
  }

  const statusCode = payload?.statusCode;
  if (statusCode === 400 || statusCode === 422) {
    return 'backend_validation_error';
  }

  const message = String(payload?.message || (error as { message?: string })?.message || '').toLowerCase();
  if (message.includes('duplicate')) return 'duplicate_event';
  if (message.includes('stale') || message.includes('version conflict')) return 'stale_transition_update';
  if (message.includes('invalid')) return 'invalid_prior_state';
  if (message) return 'backend_validation_error';

  return 'unknown_error';
}

export function resolveCommandRailMessage(rail: CommandOutcomeRail, action: ExceptionCommandAction): string {
  if (rail === 'success') return `Command ${action} completed successfully.`;
  if (rail === 'backend_validation_error') return 'Validation failed. Check reason/owner fields and retry.';
  if (rail === 'invalid_prior_state') return 'Command rejected: current exception state does not allow this action.';
  if (rail === 'stale_transition_update') return 'Stale transition detected. Refresh list and retry with current version.';
  if (rail === 'duplicate_event') return 'Duplicate command blocked. The same action payload is already in flight or processed.';
  if (rail === 'loading') return `Submitting ${action} command...`;
  if (rail === 'unknown_error') return 'Command failed unexpectedly. Retry after refreshing the latest exception state.';
  return 'Choose an action to execute deterministic command rails.';
}

export function applyCommandSuccessTransition(
  row: SettlementExceptionInboxRow,
  action: ExceptionCommandAction,
  atIso: string,
): SettlementExceptionInboxRow {
  if (action === 'acknowledge' || action === 'assign') {
    return {
      ...row,
      status: 'INVESTIGATING',
      version: row.version + 1,
      updatedAt: atIso,
    };
  }

  return {
    ...row,
    status: 'RESOLVED',
    version: row.version + 1,
    updatedAt: atIso,
  };
}

function normalizeKeyToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'na';
}

function normalizeReasonCode(value: unknown): string | null {
  const raw = String(value || '').trim().toLowerCase();
  return raw || null;
}

function extractPayload(error: unknown): {
  reason?: string;
  statusCode?: number;
  message?: string;
} | null {
  if (!error || typeof error !== 'object') return null;
  const payload = (error as { payload?: unknown }).payload;
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  return {
    reason: typeof record.reason === 'string' ? record.reason : undefined,
    statusCode: typeof record.statusCode === 'number' ? record.statusCode : undefined,
    message: typeof record.message === 'string' ? record.message : undefined,
  };
}
