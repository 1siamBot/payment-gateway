import {
  applyCommandSuccessTransition,
  buildOperatorWorkbenchViewState,
  resolveCommandOutcomeRail,
  shouldBlockDuplicateCommand,
  type CommandOutcomeRail,
} from '../frontend/utils/settlementExceptionsOperatorWorkbench';
import type { SettlementExceptionInboxRow } from '../frontend/utils/settlementExceptionsInbox';

describe('settlement exceptions operator workbench utilities', () => {
  const baseRow: SettlementExceptionInboxRow = {
    id: 'se_workbench_001',
    reference: 'se_workbench_001',
    merchantId: 'merchant_demo_alpha',
    providerName: 'mock-a',
    status: 'OPEN',
    severity: 'critical',
    openedReason: 'ledger_provider_mismatch',
    deltaAmount: 1400,
    windowDate: '2026-03-19',
    createdAt: '2026-03-19T06:30:00.000Z',
    updatedAt: '2026-03-19T06:30:00.000Z',
    version: 4,
  };

  it('applies happy-path success transition deterministically for resolve command', () => {
    const updated = applyCommandSuccessTransition(baseRow, 'resolve', '2026-03-19T08:00:00.000Z');

    expect(updated.status).toBe('RESOLVED');
    expect(updated.version).toBe(baseRow.version + 1);
    expect(updated.updatedAt).toBe('2026-03-19T08:00:00.000Z');
  });

  it('maps stale conflict reason to stale_transition_update rail', () => {
    const rail = resolveCommandOutcomeRail({
      payload: {
        reason: 'stale_version',
        statusCode: 409,
      },
    });

    expect(rail).toBe<CommandOutcomeRail>('stale_transition_update');
  });

  it('blocks duplicate command submission when same idempotency key is in flight', () => {
    const inflight = new Set(['se-command-resolve-se_workbench_001-4-triage_started-none']);

    expect(shouldBlockDuplicateCommand(inflight, 'se-command-resolve-se_workbench_001-4-triage_started-none')).toBe(true);
    expect(shouldBlockDuplicateCommand(inflight, 'se-command-resolve-se_workbench_001-5-triage_started-none')).toBe(false);
  });

  it('renders empty dataset rail when no rows exist', () => {
    const state = buildOperatorWorkbenchViewState({
      loading: false,
      error: '',
      rows: [],
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });

    expect(state).toEqual({ key: 'empty', message: 'empty', showRetry: false });
  });
});
