export type PayoutDataMode = 'api' | 'fixture_success' | 'fixture_loading' | 'fixture_empty' | 'fixture_error';

export type PayoutDataSource = 'api' | 'fixture';

export type PayoutQueueState = 'queued' | 'processing' | 'failed' | 'retried';

export type PayoutQueueRow = {
  reference: string;
  merchantId: string;
  status: string;
  amount: string;
  currency: string;
  createdAt: string;
  queueState?: PayoutQueueState;
  retryCount?: number;
};

export type QueueHealthCard = {
  key: PayoutQueueState;
  label: string;
  value: number;
  tone: 'neutral' | 'warn' | 'danger' | 'ok';
};

export type RetryAuditTimelineEvent = {
  id: string;
  payoutReference: string;
  occurredAt: string;
  status: string;
  stage: string;
  actor: string;
  note: string;
};

export type PayoutSectionViewState = {
  key: 'loading' | 'error' | 'empty' | 'ready';
  message: string;
  showRetry: boolean;
};

const QUEUE_HEALTH_ORDER: PayoutQueueState[] = ['queued', 'processing', 'failed', 'retried'];

const QUEUE_HEALTH_LABEL: Record<PayoutQueueState, string> = {
  queued: 'Queued',
  processing: 'Processing',
  failed: 'Failed',
  retried: 'Retried',
};

const QUEUE_HEALTH_TONE: Record<PayoutQueueState, QueueHealthCard['tone']> = {
  queued: 'neutral',
  processing: 'warn',
  failed: 'danger',
  retried: 'ok',
};

export function resolvePayoutMonitoringDataSource(input: {
  mode: PayoutDataMode;
  latestApiStatusCode?: number;
}): PayoutDataSource {
  if (input.mode !== 'api') {
    return 'fixture';
  }
  if (input.latestApiStatusCode === 404 || input.latestApiStatusCode === 501) {
    return 'fixture';
  }
  return 'api';
}

export function sortPayoutRowsDeterministic(rows: PayoutQueueRow[]): PayoutQueueRow[] {
  return [...rows].sort((left, right) => {
    const createdDelta = Date.parse(right.createdAt) - Date.parse(left.createdAt);
    if (createdDelta !== 0) {
      return createdDelta;
    }
    return left.reference.localeCompare(right.reference);
  });
}

export function buildQueueHealthCards(rows: PayoutQueueRow[]): QueueHealthCard[] {
  const byKey: Record<PayoutQueueState, number> = {
    queued: 0,
    processing: 0,
    failed: 0,
    retried: 0,
  };

  for (const row of rows) {
    const state = normalizeQueueState(row);
    byKey[state] += 1;
  }

  return QUEUE_HEALTH_ORDER.map((key) => ({
    key,
    label: QUEUE_HEALTH_LABEL[key],
    value: byKey[key],
    tone: QUEUE_HEALTH_TONE[key],
  }));
}

export function buildRetryAuditTimeline(events: RetryAuditTimelineEvent[]): RetryAuditTimelineEvent[] {
  return [...events].sort((left, right) => {
    const occurredDelta = Date.parse(left.occurredAt) - Date.parse(right.occurredAt);
    if (occurredDelta !== 0) {
      return occurredDelta;
    }
    return left.id.localeCompare(right.id);
  });
}

export function buildPayoutSectionViewState(input: {
  loading: boolean;
  error: string;
  itemCount: number;
  loadingMessage: string;
  emptyMessage: string;
  readyMessage: string;
}): PayoutSectionViewState {
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

export function nextPayoutRetryAttempt(current: number): number {
  return current + 1;
}

function normalizeQueueState(row: PayoutQueueRow): PayoutQueueState {
  if (row.queueState) {
    return row.queueState;
  }

  const status = row.status.toUpperCase();
  if (status === 'FAILED') {
    return 'failed';
  }
  if ((row.retryCount ?? 0) > 0 || status === 'RETRIED') {
    return 'retried';
  }
  if (status === 'PENDING' || status === 'PROCESSING') {
    return 'processing';
  }
  return 'queued';
}
