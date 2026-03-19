export const RECONCILIATION_MISMATCH_DETAIL_CONTRACT_VERSION = 'reconciliation-mismatch-detail.v1';
export const RECONCILIATION_MISMATCH_DETAIL_FIXTURE_TIMESTAMP = '2026-03-20T00:00:00.000Z';

export const RECONCILIATION_MISMATCH_CATEGORIES = [
  'amount',
  'currency',
  'missing_event',
  'duplicate_event',
  'stale_status',
] as const;

export type ReconciliationMismatchCategory = (typeof RECONCILIATION_MISMATCH_CATEGORIES)[number];

export type ReconciliationMismatchDetailFixture = {
  id: string;
  category: ReconciliationMismatchCategory;
  transactionReference: string;
  merchantId: string;
  expectedPayload: Record<string, unknown>;
  actualPayload: Record<string, unknown>;
  diffs: Array<{
    path: string;
    expected: string | number | boolean | null;
    actual: string | number | boolean | null;
  }>;
};

export const RECONCILIATION_MISMATCH_DETAIL_FIXTURES: Array<ReconciliationMismatchDetailFixture | Record<string, unknown>> = [
  {
    id: 'recon_mismatch_amount_001',
    category: 'amount',
    transactionReference: 'pay_recon_1002',
    merchantId: 'merchant_beta',
    expectedPayload: {
      ledgerEventId: 'evt_ledger_1002',
      amount: { value: '2000.00', currency: 'THB' },
    },
    actualPayload: {
      providerEventId: 'evt_provider_1002',
      amount: { value: '1980.00', currency: 'THB' },
    },
    diffs: [
      {
        path: '/amount/value',
        expected: '2000.00',
        actual: '1980.00',
      },
    ],
  },
  {
    id: 'recon_mismatch_currency_001',
    category: 'currency',
    transactionReference: 'pay_recon_1005',
    merchantId: 'merchant_epsilon',
    expectedPayload: {
      ledgerEventId: 'evt_ledger_1005',
      amount: { value: '1200.00', currency: 'THB' },
    },
    actualPayload: {
      providerEventId: 'evt_provider_1005',
      amount: { value: '1200.00', currency: 'USD' },
    },
    diffs: [
      {
        path: 'amount.currency',
        expected: 'THB',
        actual: 'USD',
      },
    ],
  },
  {
    id: 'recon_mismatch_missing_event_001',
    category: 'missing_event',
    transactionReference: 'pay_recon_1003',
    merchantId: 'merchant_gamma',
    expectedPayload: {
      expectedEventType: 'capture.succeeded',
      expectedEventId: 'evt_capture_1003',
    },
    actualPayload: {
      observedEvents: ['authorization.succeeded'],
    },
    diffs: [
      {
        path: '/events/capture.succeeded',
        expected: 'present',
        actual: null,
      },
    ],
  },
  {
    id: 'recon_mismatch_duplicate_event_001',
    category: 'duplicate_event',
    transactionReference: 'pay_recon_1004',
    merchantId: 'merchant_delta',
    expectedPayload: {
      expectedOccurrences: 1,
      eventType: 'capture.succeeded',
    },
    actualPayload: {
      observedOccurrences: 3,
      eventIds: ['evt_cap_1', 'evt_cap_2', 'evt_cap_3'],
    },
    diffs: [
      {
        path: '/events/capture.succeeded/count',
        expected: 1,
        actual: 3,
      },
    ],
  },
  {
    id: 'recon_mismatch_stale_status_001',
    category: 'stale_status',
    transactionReference: 'pay_recon_1006',
    merchantId: 'merchant_zeta',
    expectedPayload: {
      ledgerStatus: 'paid',
      expectedUpdatedAt: '2026-03-19T12:35:00.000Z',
    },
    actualPayload: {
      providerStatus: 'authorized',
      providerUpdatedAt: '2026-03-19T11:30:00.000Z',
    },
    diffs: [
      {
        path: 'status.current',
        expected: 'paid',
        actual: 'authorized',
      },
      {
        path: 'status.updatedAt',
        expected: '2026-03-19T12:35:00.000Z',
        actual: '2026-03-19T11:30:00.000Z',
      },
    ],
  },
  {
    id: 'recon_mismatch_malformed_001',
    category: 'amount',
    transactionReference: 'pay_recon_malformed',
    merchantId: 'merchant_fixture',
    expectedPayload: 'broken-shape',
    actualPayload: null,
    diffs: 'invalid',
  },
];
