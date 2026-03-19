export type ReconciliationDataMode = 'api' | 'fixture_success' | 'fixture_loading' | 'fixture_empty' | 'fixture_error';

export type ReconciliationDataSource = 'api' | 'fixture';

export type MismatchSortKey = 'transactionReference' | 'merchantId' | 'amount' | 'reason' | 'status';

export type SortDirection = 'asc' | 'desc';

export type MismatchSort = {
  key: MismatchSortKey;
  direction: SortDirection;
};

export type MismatchRow = {
  transactionReference: string;
  merchantId: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
};

export type ReconciliationKpiInput = {
  totalVolume: number;
  successCount: number;
  failCount: number;
  pendingAnomalies: number;
};

export type ReconciliationKpiCard = {
  key: 'total_volume' | 'success_count' | 'fail_count' | 'pending_anomalies';
  label: string;
  value: number;
  tone: 'neutral' | 'ok' | 'danger' | 'warn';
};

export type SectionViewState = {
  key: 'loading' | 'error' | 'empty' | 'ready';
  message: string;
  showRetry: boolean;
};

const KPI_ORDER: ReconciliationKpiCard['key'][] = [
  'total_volume',
  'success_count',
  'fail_count',
  'pending_anomalies',
];

const MISMATCH_REASON_LABELS: Record<string, string> = {
  paid_without_success_callback: 'Paid without success callback',
  failed_with_success_callback: 'Failed with success callback',
  stuck_non_terminal: 'Stuck non-terminal',
};

export function resolveReconciliationDataSource(input: {
  mode: ReconciliationDataMode;
  latestApiStatusCode?: number;
}): ReconciliationDataSource {
  if (input.mode !== 'api') {
    return 'fixture';
  }
  if (input.latestApiStatusCode === 404 || input.latestApiStatusCode === 501) {
    return 'fixture';
  }
  return 'api';
}

export function buildReconciliationKpis(input: ReconciliationKpiInput): ReconciliationKpiCard[] {
  const byKey: Record<ReconciliationKpiCard['key'], ReconciliationKpiCard> = {
    total_volume: {
      key: 'total_volume',
      label: 'Total Volume (tx)',
      value: input.totalVolume,
      tone: 'neutral',
    },
    success_count: {
      key: 'success_count',
      label: 'Success Count',
      value: input.successCount,
      tone: 'ok',
    },
    fail_count: {
      key: 'fail_count',
      label: 'Fail Count',
      value: input.failCount,
      tone: 'danger',
    },
    pending_anomalies: {
      key: 'pending_anomalies',
      label: 'Pending Anomalies',
      value: input.pendingAnomalies,
      tone: 'warn',
    },
  };

  return KPI_ORDER.map((key) => byKey[key]);
}

export function sortMismatchRowsDeterministic(rows: MismatchRow[], sort: MismatchSort): MismatchRow[] {
  const sorted = [...rows].sort((left, right) => {
    const valueDelta = compareBySortKey(left, right, sort.key);
    if (valueDelta !== 0) {
      return sort.direction === 'asc' ? valueDelta : -valueDelta;
    }
    return left.transactionReference.localeCompare(right.transactionReference);
  });
  return sorted;
}

export function buildSectionViewState(input: {
  loading: boolean;
  error: string;
  itemCount: number;
  loadingMessage: string;
  emptyMessage: string;
  readyMessage: string;
}): SectionViewState {
  if (input.loading) {
    return {
      key: 'loading',
      message: input.loadingMessage,
      showRetry: false,
    };
  }
  if (input.error) {
    return {
      key: 'error',
      message: input.error,
      showRetry: true,
    };
  }
  if (input.itemCount === 0) {
    return {
      key: 'empty',
      message: input.emptyMessage,
      showRetry: false,
    };
  }
  return {
    key: 'ready',
    message: input.readyMessage,
    showRetry: false,
  };
}

export function nextRetryAttempt(current: number): number {
  return current + 1;
}

export function describeMismatchReason(reason: string): string {
  return MISMATCH_REASON_LABELS[reason] ?? reason.replaceAll('_', ' ');
}

function compareBySortKey(left: MismatchRow, right: MismatchRow, key: MismatchSortKey): number {
  if (key === 'amount') {
    return left.amount - right.amount;
  }

  const leftValue = key === 'status'
    ? left.status
    : key === 'reason'
      ? left.reason
      : key === 'merchantId'
        ? left.merchantId
        : left.transactionReference;

  const rightValue = key === 'status'
    ? right.status
    : key === 'reason'
      ? right.reason
      : key === 'merchantId'
        ? right.merchantId
        : right.transactionReference;

  return leftValue.localeCompare(rightValue);
}
