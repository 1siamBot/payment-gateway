import {
  applyCommandSuccessTransition,
  buildActivityTimelineViewState,
  buildFixtureActivityTimelinePage,
  buildOperatorWorkbenchViewState,
  createSettlementExceptionActivityTimelineClient,
  resolveCommandOutcomeRail,
  resolveActivityTimelineErrorRail,
  resolveActivityReasonCodeLabel,
  sortActivityTimelineDeterministic,
  shouldBlockDuplicateCommand,
  type SettlementExceptionActivityEvent,
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

  it('sorts timeline rows deterministically by occurredAt desc then id desc', () => {
    const rows: SettlementExceptionActivityEvent[] = [
      {
        id: 'evt_001',
        eventType: 'exception_opened',
        actorType: 'system',
        reasonCode: 'ledger_provider_mismatch',
        fromStatus: null,
        toStatus: 'OPEN',
        occurredAt: '2026-03-19T09:00:00.000Z',
      },
      {
        id: 'evt_003',
        eventType: 'exception_mark_resolved',
        actorType: 'operator',
        reasonCode: 'resolved_after_manual_review',
        fromStatus: 'INVESTIGATING',
        toStatus: 'RESOLVED',
        occurredAt: '2026-03-19T09:20:00.000Z',
      },
      {
        id: 'evt_002',
        eventType: 'exception_acknowledged',
        actorType: 'operator',
        reasonCode: 'investigation_started',
        fromStatus: 'OPEN',
        toStatus: 'INVESTIGATING',
        occurredAt: '2026-03-19T09:20:00.000Z',
      },
    ];

    const sorted = sortActivityTimelineDeterministic(rows);
    expect(sorted.map((row) => row.id)).toEqual(['evt_003', 'evt_002', 'evt_001']);
  });

  it('builds fixture timeline first and second pages with cursor navigation', () => {
    const rows: SettlementExceptionActivityEvent[] = [
      {
        id: 'evt_003',
        eventType: 'exception_mark_resolved',
        actorType: 'operator',
        reasonCode: 'resolved_after_manual_review',
        fromStatus: 'INVESTIGATING',
        toStatus: 'RESOLVED',
        occurredAt: '2026-03-19T09:20:00.000Z',
      },
      {
        id: 'evt_002',
        eventType: 'exception_acknowledged',
        actorType: 'operator',
        reasonCode: 'investigation_started',
        fromStatus: 'OPEN',
        toStatus: 'INVESTIGATING',
        occurredAt: '2026-03-19T09:10:00.000Z',
      },
      {
        id: 'evt_001',
        eventType: 'exception_opened',
        actorType: 'system',
        reasonCode: 'ledger_provider_mismatch',
        fromStatus: null,
        toStatus: 'OPEN',
        occurredAt: '2026-03-19T09:00:00.000Z',
      },
    ];

    const first = buildFixtureActivityTimelinePage({
      events: rows,
      cursor: null,
      limit: 2,
    });
    expect(first.rail).toBe('none');
    expect(first.data).toHaveLength(2);
    expect(first.nextCursor).toBe('fx:2');
    expect(first.hasNext).toBe(true);

    const second = buildFixtureActivityTimelinePage({
      events: rows,
      cursor: first.nextCursor,
      limit: 2,
    });
    expect(second.rail).toBe('none');
    expect(second.data).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
    expect(second.hasNext).toBe(false);
  });

  it('maps invalid and stale cursor timeline rails deterministically', () => {
    expect(resolveActivityTimelineErrorRail({
      payload: { reasonCode: 'INVALID_CURSOR', statusCode: 400 },
    })).toBe('invalid_cursor');
    expect(resolveActivityTimelineErrorRail({
      payload: { reasonCode: 'STALE_CURSOR', statusCode: 409 },
    })).toBe('stale_cursor');
  });

  it('builds stale cursor timeline error view with retry', () => {
    const state = buildActivityTimelineViewState({
      loading: false,
      rail: 'stale_cursor',
      eventCount: 0,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });

    expect(state).toEqual({
      key: 'error',
      message: 'Timeline cursor is stale. Reset to first page to continue.',
      showRetry: true,
    });
  });

  it('formats reason code labels and keeps explicit mappings', () => {
    expect(resolveActivityReasonCodeLabel('investigation_started')).toBe('Investigation started');
    expect(resolveActivityReasonCodeLabel('provider_report_reconciled')).toBe('Provider Report Reconciled');
  });

  it('creates timeline client request with cursor pagination query', async () => {
    const requestCalls: Array<{ path: string; options?: unknown }> = [];
    const request = async <T>(path: string, options?: unknown) => {
      requestCalls.push({ path, options });
      return {
        contract: 'settlement-exception-activity-timeline.v1',
        exceptionId: 'se_workbench_001',
        mode: 'live',
        data: [],
        pageInfo: { limit: 2, hasNext: false, nextCursor: null },
      } as T;
    };

    const client = createSettlementExceptionActivityTimelineClient(request, () => ({
      'x-internal-token': 'token',
      'x-actor-role': 'ops',
    }));

    await client.list({
      exceptionId: 'se_workbench_001',
      limit: 2,
      cursor: 'fx:2',
      mode: 'live',
    });

    expect(requestCalls).toHaveLength(1);
    expect(requestCalls[0]).toEqual({
      path: '/settlement-exceptions/se_workbench_001/activity',
      options: {
        headers: {
          'x-internal-token': 'token',
          'x-actor-role': 'ops',
        },
        query: {
          limit: 2,
          cursor: 'fx:2',
          mode: 'live',
          scenario: undefined,
        },
      },
    });
  });
});
