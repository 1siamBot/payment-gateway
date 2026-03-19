export type SettlementExceptionStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'IGNORED';

export type SettlementExceptionSeverity = 'critical' | 'high' | 'medium' | 'low';

export type SettlementExceptionsInboxMode = 'api' | 'fixture_success' | 'fixture_loading' | 'fixture_empty' | 'fixture_error';

export type SettlementExceptionsDataSource = 'api' | 'fixture';

export type SettlementExceptionInboxRow = {
  id: string;
  reference: string;
  merchantId: string;
  providerName: string;
  status: SettlementExceptionStatus;
  severity: SettlementExceptionSeverity;
  openedReason: string;
  deltaAmount: number;
  windowDate: string;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type SettlementExceptionInboxFilters = {
  status: 'ALL' | SettlementExceptionStatus;
  merchantId: string;
  dateFrom: string;
  dateTo: string;
};

export type SettlementExceptionQueueEntry = {
  acknowledged: boolean;
  owner: string;
  resolutionReason: string;
  resolvedAt: string | null;
};

export type SettlementExceptionQueueState = Record<string, SettlementExceptionQueueEntry>;

export type SettlementExceptionQueueAction =
  | { type: 'acknowledge'; exceptionId: string }
  | { type: 'assign_owner'; exceptionId: string; owner: string }
  | { type: 'mark_resolved'; exceptionId: string; reason: string; resolvedAt: string };

export type SettlementExceptionViewState = {
  key: 'loading' | 'error' | 'empty' | 'ready';
  message: string;
  showRetry: boolean;
};

const SEVERITY_WEIGHT: Record<SettlementExceptionSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function resolveSettlementExceptionsDataSource(input: {
  mode: SettlementExceptionsInboxMode;
  latestApiStatusCode?: number;
}): SettlementExceptionsDataSource {
  if (input.mode !== 'api') {
    return 'fixture';
  }
  if (input.latestApiStatusCode === 404 || input.latestApiStatusCode === 501) {
    return 'fixture';
  }
  return 'api';
}

export function deriveSettlementExceptionSeverity(deltaAmount: number): SettlementExceptionSeverity {
  const magnitude = Math.abs(deltaAmount);
  if (magnitude >= 1000) return 'critical';
  if (magnitude >= 300) return 'high';
  if (magnitude >= 100) return 'medium';
  return 'low';
}

export function sortExceptionsDeterministic(rows: SettlementExceptionInboxRow[]): SettlementExceptionInboxRow[] {
  return [...rows].sort((left, right) => {
    const bySeverity = SEVERITY_WEIGHT[right.severity] - SEVERITY_WEIGHT[left.severity];
    if (bySeverity !== 0) return bySeverity;

    const byCreatedAt = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    if (byCreatedAt !== 0) return byCreatedAt;

    return left.reference.localeCompare(right.reference);
  });
}

export function filterExceptions(
  rows: SettlementExceptionInboxRow[],
  filters: SettlementExceptionInboxFilters,
): SettlementExceptionInboxRow[] {
  const merchantNeedle = filters.merchantId.trim().toLowerCase();
  const start = normalizeDateStart(filters.dateFrom);
  const end = normalizeDateEnd(filters.dateTo);

  return rows.filter((row) => {
    if (filters.status !== 'ALL' && row.status !== filters.status) {
      return false;
    }
    if (merchantNeedle && !row.merchantId.toLowerCase().includes(merchantNeedle)) {
      return false;
    }

    const rowDate = new Date(row.windowDate);
    if (start && rowDate.getTime() < start.getTime()) {
      return false;
    }
    if (end && rowDate.getTime() > end.getTime()) {
      return false;
    }
    return true;
  });
}

export function buildSettlementExceptionsViewState(input: {
  loading: boolean;
  error: string;
  rows: SettlementExceptionInboxRow[];
  loadingMessage: string;
  emptyMessage: string;
  readyMessage: string;
}): SettlementExceptionViewState {
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

export function applyActionQueueTransition(
  queueState: SettlementExceptionQueueState,
  action: SettlementExceptionQueueAction,
): SettlementExceptionQueueState {
  const existing = queueState[action.exceptionId] ?? defaultQueueEntry();

  if (action.type === 'acknowledge') {
    return {
      ...queueState,
      [action.exceptionId]: {
        ...existing,
        acknowledged: true,
      },
    };
  }

  if (action.type === 'assign_owner') {
    return {
      ...queueState,
      [action.exceptionId]: {
        ...existing,
        owner: action.owner.trim(),
      },
    };
  }

  return {
    ...queueState,
    [action.exceptionId]: {
      ...existing,
      acknowledged: true,
      resolutionReason: action.reason.trim(),
      resolvedAt: action.resolvedAt,
    },
  };
}

export function nextRetryCount(current: number): number {
  return current + 1;
}

function defaultQueueEntry(): SettlementExceptionQueueEntry {
  return {
    acknowledged: false,
    owner: '',
    resolutionReason: '',
    resolvedAt: null,
  };
}

function normalizeDateStart(value: string): Date | null {
  if (!value.trim()) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeDateEnd(value: string): Date | null {
  if (!value.trim()) return null;
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}
