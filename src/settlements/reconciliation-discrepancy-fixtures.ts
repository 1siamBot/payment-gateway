export const RECONCILIATION_DISCREPANCY_PATHS = [
  'empty',
  'matched',
  'mismatched-amount',
  'missing-capture',
  'duplicate-event',
] as const;

export type ReconciliationDiscrepancyPath = (typeof RECONCILIATION_DISCREPANCY_PATHS)[number];

export type ReconciliationDiscrepancyState =
  | 'matched'
  | 'mismatched_amount'
  | 'missing_capture'
  | 'duplicate_event';

export type ReconciliationDiscrepancyFixture = {
  id: string;
  transactionReference: string;
  merchantId: string;
  paymentId: string;
  state: ReconciliationDiscrepancyState;
  path: Exclude<ReconciliationDiscrepancyPath, 'empty'>;
  currency: string;
  ledgerAmount: number;
  providerAmount: number;
  deltaAmount: number;
  captureReference: string | null;
  duplicateEventCount: number;
  providerEventCount: number;
  observedAt: string;
  notes: string[];
};

export const RECONCILIATION_DISCREPANCY_CONTRACT_VERSION = 'reconciliation-discrepancy.v1';
export const RECONCILIATION_DISCREPANCY_FIXTURE_TIMESTAMP = '2026-03-19T17:00:00.000Z';

export const RECONCILIATION_DISCREPANCY_FIXTURES: ReconciliationDiscrepancyFixture[] = [
  {
    id: 'recon_disc_matched_001',
    transactionReference: 'pay_recon_1001',
    merchantId: 'merchant_alpha',
    paymentId: 'pay_1001',
    state: 'matched',
    path: 'matched',
    currency: 'THB',
    ledgerAmount: 1499,
    providerAmount: 1499,
    deltaAmount: 0,
    captureReference: 'cap_1001',
    duplicateEventCount: 0,
    providerEventCount: 3,
    observedAt: '2026-03-19T12:30:00.000Z',
    notes: ['ledger and provider totals match', 'capture event present exactly once'],
  },
  {
    id: 'recon_disc_mismatched_amount_001',
    transactionReference: 'pay_recon_1002',
    merchantId: 'merchant_beta',
    paymentId: 'pay_1002',
    state: 'mismatched_amount',
    path: 'mismatched-amount',
    currency: 'THB',
    ledgerAmount: 2000,
    providerAmount: 1980,
    deltaAmount: 20,
    captureReference: 'cap_1002',
    duplicateEventCount: 0,
    providerEventCount: 2,
    observedAt: '2026-03-19T12:31:00.000Z',
    notes: ['amount mismatch exceeds tolerance', 'provider settlement file carries lower amount'],
  },
  {
    id: 'recon_disc_missing_capture_001',
    transactionReference: 'pay_recon_1003',
    merchantId: 'merchant_gamma',
    paymentId: 'pay_1003',
    state: 'missing_capture',
    path: 'missing-capture',
    currency: 'THB',
    ledgerAmount: 875,
    providerAmount: 875,
    deltaAmount: 0,
    captureReference: null,
    duplicateEventCount: 0,
    providerEventCount: 1,
    observedAt: '2026-03-19T12:32:00.000Z',
    notes: ['capture event not found in provider timeline', 'transaction is paid in ledger and waiting provider replay'],
  },
  {
    id: 'recon_disc_duplicate_event_001',
    transactionReference: 'pay_recon_1004',
    merchantId: 'merchant_delta',
    paymentId: 'pay_1004',
    state: 'duplicate_event',
    path: 'duplicate-event',
    currency: 'THB',
    ledgerAmount: 3200,
    providerAmount: 3200,
    deltaAmount: 0,
    captureReference: 'cap_1004',
    duplicateEventCount: 2,
    providerEventCount: 4,
    observedAt: '2026-03-19T12:33:00.000Z',
    notes: ['duplicate capture webhooks detected', 'idempotency guard prevented double settlement'],
  },
];
