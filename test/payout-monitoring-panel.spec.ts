import {
  buildQueueHealthCards,
  buildRetryAuditTimeline,
  buildPayoutSectionViewState,
  nextPayoutRetryAttempt,
  resolvePayoutMonitoringDataSource,
  sortPayoutRowsDeterministic,
  type PayoutQueueRow,
  type RetryAuditTimelineEvent,
} from '../frontend/utils/payoutMonitoringPanel';

describe('payout monitoring panel utilities', () => {
  it('builds queue health cards in deterministic queued/processing/failed/retried order', () => {
    const rows: PayoutQueueRow[] = [
      {
        reference: 'pay_out_2',
        merchantId: 'mrc_b',
        status: 'PENDING',
        amount: '100',
        currency: 'THB',
        createdAt: '2026-03-19T08:00:00.000Z',
      },
      {
        reference: 'pay_out_1',
        merchantId: 'mrc_a',
        status: 'CREATED',
        amount: '100',
        currency: 'THB',
        createdAt: '2026-03-19T07:00:00.000Z',
      },
      {
        reference: 'pay_out_3',
        merchantId: 'mrc_c',
        status: 'FAILED',
        amount: '100',
        currency: 'THB',
        createdAt: '2026-03-19T06:00:00.000Z',
      },
      {
        reference: 'pay_out_4',
        merchantId: 'mrc_d',
        status: 'PENDING',
        amount: '100',
        currency: 'THB',
        createdAt: '2026-03-19T05:00:00.000Z',
        retryCount: 2,
      },
    ];

    const cards = buildQueueHealthCards(rows);

    expect(cards.map((card) => card.key)).toEqual(['queued', 'processing', 'failed', 'retried']);
    expect(cards.map((card) => card.value)).toEqual([1, 1, 1, 1]);
  });

  it('sorts payout rows and retry audit timeline events deterministically', () => {
    const rows: PayoutQueueRow[] = [
      {
        reference: 'pay_out_200',
        merchantId: 'mrc_b',
        status: 'PENDING',
        amount: '100',
        currency: 'THB',
        createdAt: '2026-03-19T09:00:00.000Z',
      },
      {
        reference: 'pay_out_100',
        merchantId: 'mrc_a',
        status: 'PENDING',
        amount: '100',
        currency: 'THB',
        createdAt: '2026-03-19T09:00:00.000Z',
      },
      {
        reference: 'pay_out_300',
        merchantId: 'mrc_c',
        status: 'FAILED',
        amount: '100',
        currency: 'THB',
        createdAt: '2026-03-19T10:00:00.000Z',
      },
    ];

    const timeline: RetryAuditTimelineEvent[] = [
      {
        id: 'evt-2',
        payoutReference: 'pay_out_100',
        occurredAt: '2026-03-19T10:00:00.000Z',
        status: 'info',
        stage: 'Retry scheduled',
        actor: 'gateway',
        note: '',
      },
      {
        id: 'evt-1',
        payoutReference: 'pay_out_100',
        occurredAt: '2026-03-19T09:00:00.000Z',
        status: 'failed',
        stage: 'Processing failed',
        actor: 'provider',
        note: '',
      },
      {
        id: 'evt-0',
        payoutReference: 'pay_out_100',
        occurredAt: '2026-03-19T10:00:00.000Z',
        status: 'completed',
        stage: 'Retry sent',
        actor: 'gateway',
        note: '',
      },
    ];

    const sortedRows = sortPayoutRowsDeterministic(rows);
    const sortedTimeline = buildRetryAuditTimeline(timeline);

    expect(sortedRows.map((row) => row.reference)).toEqual(['pay_out_300', 'pay_out_100', 'pay_out_200']);
    expect(sortedTimeline.map((event) => event.id)).toEqual(['evt-1', 'evt-0', 'evt-2']);
  });

  it('returns deterministic loading/error/empty states and fallback mode behavior', () => {
    const loading = buildPayoutSectionViewState({
      loading: true,
      error: '',
      itemCount: 0,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });
    const error = buildPayoutSectionViewState({
      loading: false,
      error: 'boom',
      itemCount: 0,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });
    const empty = buildPayoutSectionViewState({
      loading: false,
      error: '',
      itemCount: 0,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });

    expect(loading).toEqual({ key: 'loading', message: 'loading', showRetry: false });
    expect(error).toEqual({ key: 'error', message: 'boom', showRetry: true });
    expect(empty).toEqual({ key: 'empty', message: 'empty', showRetry: false });

    expect(resolvePayoutMonitoringDataSource({ mode: 'api', latestApiStatusCode: 404 })).toBe('fixture');
    expect(resolvePayoutMonitoringDataSource({ mode: 'api', latestApiStatusCode: 501 })).toBe('fixture');
    expect(resolvePayoutMonitoringDataSource({ mode: 'fixture_success' })).toBe('fixture');
    expect(resolvePayoutMonitoringDataSource({ mode: 'api', latestApiStatusCode: 500 })).toBe('api');
  });

  it('increments retry attempts for queue and timeline retry flows', () => {
    expect(nextPayoutRetryAttempt(0)).toBe(1);
    expect(nextPayoutRetryAttempt(4)).toBe(5);
  });
});
