import {
  buildListViewState,
  buildPaymentTimeline,
  filterPayments,
  sortPaymentsDeterministic,
  type PaymentDetail,
  type PaymentListItem,
} from '../frontend/utils/paymentOperationsDashboard';

describe('payment operations dashboard utilities', () => {
  const sampleRows: PaymentListItem[] = [
    {
      reference: 'pay_b',
      merchantId: 'mrc_demo_001',
      status: 'PAID',
      type: 'DEPOSIT',
      amount: '100.00',
      currency: 'THB',
      providerName: 'mock-a',
      createdAt: '2026-03-18T10:00:00.000Z',
    },
    {
      reference: 'pay_a',
      merchantId: 'mrc_demo_001',
      status: 'FAILED',
      type: 'DEPOSIT',
      amount: '200.00',
      currency: 'THB',
      providerName: 'mock-b',
      createdAt: '2026-03-18T10:00:00.000Z',
    },
    {
      reference: 'pay_c',
      merchantId: 'mrc_demo_002',
      status: 'PENDING',
      type: 'WITHDRAW',
      amount: '300.00',
      currency: 'THB',
      providerName: 'mock-a',
      createdAt: '2026-03-19T10:00:00.000Z',
    },
  ];

  it('filters rows by status/merchant/reference/date deterministically', () => {
    const filtered = filterPayments(sampleRows, {
      status: 'FAILED',
      merchant: 'mrc_demo_001',
      reference: 'pay_a',
      dateFrom: '2026-03-18',
      dateTo: '2026-03-18',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].reference).toBe('pay_a');
  });

  it('sorts rows by createdAt desc with reference tie-breaker', () => {
    const sorted = sortPaymentsDeterministic(sampleRows);

    expect(sorted.map((row) => row.reference)).toEqual(['pay_c', 'pay_a', 'pay_b']);
  });

  it('orders timeline as created -> authorized -> captured/failed/refunded from transitions', () => {
    const detail: PaymentDetail = {
      reference: 'pay_demo',
      merchantId: 'mrc_demo_001',
      status: 'REFUNDED',
      createdAt: '2026-03-18T08:00:00.000Z',
      updatedAt: '2026-03-18T09:00:00.000Z',
      audits: [
        {
          id: '2',
          eventType: 'transaction.transition',
          createdAt: '2026-03-18T08:10:00.000Z',
          metadata: JSON.stringify({ toStatus: 'PENDING' }),
        },
        {
          id: '4',
          eventType: 'transaction.transition',
          createdAt: '2026-03-18T08:55:00.000Z',
          metadata: JSON.stringify({ toStatus: 'REFUNDED' }),
        },
        {
          id: '3',
          eventType: 'transaction.transition',
          createdAt: '2026-03-18T08:20:00.000Z',
          metadata: JSON.stringify({ toStatus: 'PAID' }),
        },
      ],
    };

    const timeline = buildPaymentTimeline(detail);

    expect(timeline.map((item) => item.stage)).toEqual(['created', 'authorized', 'captured', 'refunded']);
  });

  it('returns deterministic loading/error/empty states with retry only on error', () => {
    const loading = buildListViewState({ loading: true, error: '', rows: [] });
    const error = buildListViewState({ loading: false, error: 'boom', rows: [] });
    const empty = buildListViewState({ loading: false, error: '', rows: [] });

    expect(loading).toMatchObject({ key: 'loading', showRetry: false });
    expect(error).toMatchObject({ key: 'error', showRetry: true });
    expect(empty).toMatchObject({ key: 'empty', showRetry: false });
  });
});
