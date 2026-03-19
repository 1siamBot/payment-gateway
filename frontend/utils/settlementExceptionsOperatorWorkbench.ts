import type { SettlementExceptionInboxRow, SettlementExceptionStatus } from './settlementExceptionsInbox';

export type OperatorWorkbenchMode =
  | 'api'
  | 'fixture_success'
  | 'fixture_loading'
  | 'fixture_empty'
  | 'fixture_validation_error'
  | 'fixture_stale_conflict'
  | 'fixture_duplicate_event'
  | 'fixture_timeline_invalid_cursor'
  | 'fixture_timeline_stale_cursor'
  | 'fixture_timeline_error';

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
  query?: Record<string, string | number | boolean | undefined>;
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

const SETTLEMENT_EXCEPTION_ACTIVITY_CONTRACT = 'settlement-exception-activity-timeline.v1';

const ACTIVITY_REASON_CODE_LABELS: Record<string, string> = {
  investigation_started: 'Investigation started',
  resolved_after_manual_review: 'Resolved after manual review',
  ledger_provider_mismatch: 'Ledger/provider mismatch detected',
  callback_gap: 'Provider callback gap observed',
};

export type SettlementExceptionActivityActorType = 'system' | 'operator' | 'merchant';

export type SettlementExceptionActivityEvent = {
  id: string;
  eventType: string;
  actorType: SettlementExceptionActivityActorType;
  reasonCode: string;
  fromStatus: SettlementExceptionStatus | null;
  toStatus: SettlementExceptionStatus;
  occurredAt: string;
};

export type SettlementExceptionActivityResponse = {
  contract: 'settlement-exception-activity-timeline.v1';
  exceptionId: string;
  mode: 'live' | 'fixture';
  data: SettlementExceptionActivityEvent[];
  pageInfo: {
    limit: number;
    hasNext: boolean;
    nextCursor: string | null;
  };
};

export type ActivityTimelineErrorRail = 'none' | 'invalid_cursor' | 'stale_cursor' | 'fetch_failed';

export type ActivityTimelineViewState = {
  key: 'loading' | 'error' | 'empty' | 'ready';
  message: string;
  showRetry: boolean;
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

export function sortActivityTimelineDeterministic(
  events: SettlementExceptionActivityEvent[],
): SettlementExceptionActivityEvent[] {
  return [...events].sort((left, right) => {
    const byOccurredAt = new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
    if (byOccurredAt !== 0) return byOccurredAt;
    return right.id.localeCompare(left.id);
  });
}

export function resolveActivityReasonCodeLabel(reasonCode: string): string {
  const normalized = reasonCode.trim().toLowerCase();
  if (!normalized) return 'Unspecified reason';
  if (ACTIVITY_REASON_CODE_LABELS[normalized]) {
    return ACTIVITY_REASON_CODE_LABELS[normalized];
  }
  return normalized.replace(/[_-]+/g, ' ').replace(/\b\w/g, (token) => token.toUpperCase());
}

export function resolveActivityTimelineErrorRail(error: unknown): ActivityTimelineErrorRail {
  const payload = extractPayload(error);
  const reasonCode = String((payload as Record<string, unknown> | null)?.reasonCode || '').trim().toUpperCase();
  if (reasonCode === 'INVALID_CURSOR') return 'invalid_cursor';
  if (reasonCode === 'STALE_CURSOR') return 'stale_cursor';
  return 'fetch_failed';
}

export function resolveActivityTimelineRailMessage(rail: ActivityTimelineErrorRail): string {
  if (rail === 'invalid_cursor') return 'Timeline cursor is invalid. Reset to first page and retry.';
  if (rail === 'stale_cursor') return 'Timeline cursor is stale. Reset to first page to continue.';
  if (rail === 'fetch_failed') return 'Unable to load activity timeline. Retry the request.';
  return '';
}

export function buildActivityTimelineViewState(input: {
  loading: boolean;
  rail: ActivityTimelineErrorRail;
  eventCount: number;
  loadingMessage: string;
  emptyMessage: string;
  readyMessage: string;
}): ActivityTimelineViewState {
  if (input.loading) {
    return { key: 'loading', message: input.loadingMessage, showRetry: false };
  }
  if (input.rail !== 'none') {
    return {
      key: 'error',
      message: resolveActivityTimelineRailMessage(input.rail),
      showRetry: true,
    };
  }
  if (input.eventCount === 0) {
    return { key: 'empty', message: input.emptyMessage, showRetry: false };
  }
  return { key: 'ready', message: input.readyMessage, showRetry: false };
}

export function buildFixtureActivityTimelinePage(input: {
  events: SettlementExceptionActivityEvent[];
  cursor: string | null;
  limit: number;
}): {
  data: SettlementExceptionActivityEvent[];
  nextCursor: string | null;
  hasNext: boolean;
  rail: ActivityTimelineErrorRail;
} {
  const sorted = sortActivityTimelineDeterministic(input.events);
  const start = parseFixtureActivityCursor(input.cursor);
  if (start === null) {
    return { data: [], nextCursor: null, hasNext: false, rail: 'invalid_cursor' };
  }
  if (start > sorted.length) {
    return { data: [], nextCursor: null, hasNext: false, rail: 'stale_cursor' };
  }

  const page = sorted.slice(start, start + input.limit);
  const hasNext = start + input.limit < sorted.length;
  const nextCursor = hasNext ? `fx:${start + input.limit}` : null;

  return {
    data: page,
    nextCursor,
    hasNext,
    rail: 'none',
  };
}

export function createSettlementExceptionActivityTimelineClient(
  request: RequestFn,
  authHeaders: () => Record<string, string>,
) {
  return {
    list(input: {
      exceptionId: string;
      limit: number;
      cursor?: string;
      mode?: 'live' | 'fixture';
      scenario?: 'normal' | 'empty' | 'stale_cursor';
    }) {
      return request<SettlementExceptionActivityResponse>(`/settlement-exceptions/${input.exceptionId}/activity`, {
        headers: authHeaders(),
        query: {
          limit: input.limit,
          cursor: input.cursor,
          mode: input.mode,
          scenario: input.scenario,
        },
      });
    },
  };
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
  reasonCode?: string;
  statusCode?: number;
  message?: string;
} | null {
  if (!error || typeof error !== 'object') return null;
  const payload = (error as { payload?: unknown }).payload;
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  return {
    reason: typeof record.reason === 'string' ? record.reason : undefined,
    reasonCode: typeof record.reasonCode === 'string' ? record.reasonCode : undefined,
    statusCode: typeof record.statusCode === 'number' ? record.statusCode : undefined,
    message: typeof record.message === 'string' ? record.message : undefined,
  };
}

function parseFixtureActivityCursor(cursor: string | null): number | null {
  if (!cursor) return 0;
  const normalized = cursor.trim();
  if (!normalized) return 0;
  if (!normalized.startsWith('fx:')) return null;
  const rawIndex = Number(normalized.slice(3));
  if (!Number.isInteger(rawIndex) || rawIndex < 0) return null;
  return rawIndex;
}
