import { SettlementExceptionStatus } from '@prisma/client';

export const SETTLEMENT_EXCEPTION_QA_SCENARIOS = [
  'resolve_success',
  'ignore_success',
  'stale_version_conflict',
  'action_failure_retry',
  'investigating_reference',
  'resolved_reference',
  'ignored_reference',
] as const;

export type ExceptionQaScenario = (typeof SETTLEMENT_EXCEPTION_QA_SCENARIOS)[number];

export type SettlementExceptionQaFixture = {
  id: string;
  scenario: ExceptionQaScenario;
  merchantId: string;
  providerName: string;
  ledgerTotal: number;
  providerTotal: number;
  deltaAmount: number;
  status: SettlementExceptionStatus;
  openedReason: string;
  openedNote: string;
  latestOperatorReason: string | null;
  latestOperatorNote: string | null;
  resolutionActor: string | null;
  resolutionAt: string | null;
  version: number;
};

export const SETTLEMENT_EXCEPTION_QA_MERCHANT_ID = 'merchant_demo';
export const SETTLEMENT_EXCEPTION_QA_PROVIDER_NAME = 'fixture-provider';
export const SETTLEMENT_EXCEPTION_QA_WINDOW_DATE = '2026-03-18';

export const SETTLEMENT_EXCEPTION_QA_FIXTURES: SettlementExceptionQaFixture[] = [
  {
    id: 'se_fx_resolve_success',
    scenario: 'resolve_success',
    merchantId: SETTLEMENT_EXCEPTION_QA_MERCHANT_ID,
    providerName: SETTLEMENT_EXCEPTION_QA_PROVIDER_NAME,
    ledgerTotal: 120,
    providerTotal: 100,
    deltaAmount: 20,
    status: SettlementExceptionStatus.OPEN,
    openedReason: 'ledger_provider_mismatch',
    openedNote: 'fixture:resolve_success',
    latestOperatorReason: null,
    latestOperatorNote: null,
    resolutionActor: null,
    resolutionAt: null,
    version: 1,
  },
  {
    id: 'se_fx_ignore_success',
    scenario: 'ignore_success',
    merchantId: SETTLEMENT_EXCEPTION_QA_MERCHANT_ID,
    providerName: SETTLEMENT_EXCEPTION_QA_PROVIDER_NAME,
    ledgerTotal: 90,
    providerTotal: 100,
    deltaAmount: -10,
    status: SettlementExceptionStatus.OPEN,
    openedReason: 'ledger_provider_mismatch',
    openedNote: 'fixture:ignore_success',
    latestOperatorReason: null,
    latestOperatorNote: null,
    resolutionActor: null,
    resolutionAt: null,
    version: 1,
  },
  {
    id: 'se_fx_stale_conflict',
    scenario: 'stale_version_conflict',
    merchantId: SETTLEMENT_EXCEPTION_QA_MERCHANT_ID,
    providerName: SETTLEMENT_EXCEPTION_QA_PROVIDER_NAME,
    ledgerTotal: 75,
    providerTotal: 60,
    deltaAmount: 15,
    status: SettlementExceptionStatus.OPEN,
    openedReason: 'ledger_provider_mismatch',
    openedNote: 'fixture:stale_version_conflict',
    latestOperatorReason: null,
    latestOperatorNote: null,
    resolutionActor: null,
    resolutionAt: null,
    version: 1,
  },
  {
    id: 'se_fx_action_retry',
    scenario: 'action_failure_retry',
    merchantId: SETTLEMENT_EXCEPTION_QA_MERCHANT_ID,
    providerName: SETTLEMENT_EXCEPTION_QA_PROVIDER_NAME,
    ledgerTotal: 210,
    providerTotal: 180,
    deltaAmount: 30,
    status: SettlementExceptionStatus.OPEN,
    openedReason: 'ledger_provider_mismatch',
    openedNote: 'fixture:action_failure_retry',
    latestOperatorReason: null,
    latestOperatorNote: null,
    resolutionActor: null,
    resolutionAt: null,
    version: 1,
  },
  {
    id: 'se_fx_investigating_reference',
    scenario: 'investigating_reference',
    merchantId: SETTLEMENT_EXCEPTION_QA_MERCHANT_ID,
    providerName: SETTLEMENT_EXCEPTION_QA_PROVIDER_NAME,
    ledgerTotal: 63,
    providerTotal: 70,
    deltaAmount: -7,
    status: SettlementExceptionStatus.INVESTIGATING,
    openedReason: 'ledger_provider_mismatch',
    openedNote: 'fixture:investigating_reference',
    latestOperatorReason: 'Investigating provider settlement lag',
    latestOperatorNote: 'Tracking provider incident INC-932',
    resolutionActor: null,
    resolutionAt: null,
    version: 2,
  },
  {
    id: 'se_fx_resolved_reference',
    scenario: 'resolved_reference',
    merchantId: SETTLEMENT_EXCEPTION_QA_MERCHANT_ID,
    providerName: SETTLEMENT_EXCEPTION_QA_PROVIDER_NAME,
    ledgerTotal: 140,
    providerTotal: 125,
    deltaAmount: 15,
    status: SettlementExceptionStatus.RESOLVED,
    openedReason: 'ledger_provider_mismatch',
    openedNote: 'fixture:resolved_reference',
    latestOperatorReason: 'Provider confirmed delayed callback replay',
    latestOperatorNote: 'Resolved after reconciliation rerun',
    resolutionActor: 'ops',
    resolutionAt: '2026-03-18T09:10:00.000Z',
    version: 2,
  },
  {
    id: 'se_fx_ignored_reference',
    scenario: 'ignored_reference',
    merchantId: SETTLEMENT_EXCEPTION_QA_MERCHANT_ID,
    providerName: SETTLEMENT_EXCEPTION_QA_PROVIDER_NAME,
    ledgerTotal: 52,
    providerTotal: 53,
    deltaAmount: -1,
    status: SettlementExceptionStatus.IGNORED,
    openedReason: 'ledger_provider_mismatch',
    openedNote: 'fixture:ignored_reference',
    latestOperatorReason: 'Amount difference under operational threshold',
    latestOperatorNote: 'Known provider rounding drift',
    resolutionActor: 'ops',
    resolutionAt: '2026-03-18T09:20:00.000Z',
    version: 2,
  },
];

export function settlementExceptionActionIdempotencyScope(exceptionId: string): string {
  return `settlement_exception_action:${exceptionId}`;
}

export function settlementExceptionActionRequestFingerprint(input: {
  exceptionId: string;
  action: 'resolve' | 'ignore';
  reason: string;
  note: string | null;
  expectedVersion: number;
  expectedUpdatedAt: string | null;
}): string {
  return JSON.stringify({
    exceptionId: input.exceptionId,
    action: input.action,
    reason: input.reason,
    note: input.note,
    expectedVersion: input.expectedVersion,
    expectedUpdatedAt: input.expectedUpdatedAt,
  });
}
