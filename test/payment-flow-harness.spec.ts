import {
  buildHarnessState,
  buildRecoveryMessage,
  normalizeStatusRows,
  parseHarnessScenario,
} from '../frontend/utils/paymentFlowHarness';

describe('payment flow harness fixtures', () => {
  it('defaults to success scenario when query value is unknown', () => {
    expect(parseHarnessScenario('not-a-scenario')).toBe('success');
    expect(parseHarnessScenario(undefined)).toBe('success');
  });

  it('switches to timeout retry scenario and exposes warning path messaging', () => {
    const state = buildHarnessState('timeout_retry');

    expect(state.scenario).toBe('timeout_retry');
    expect(state.option.label).toBe('Timeout + Retry');
    expect(state.journeys.map((entry) => entry.key)).toEqual([
      'merchant_setup',
      'intent_creation',
      'status_tracking',
    ]);
    expect(state.recoveryMessage).toContain('retry policy recovered successfully');
  });

  it('orders status rows deterministically by timestamp then stage', () => {
    const shuffledRows = [
      {
        id: 'b',
        occurredAt: '2026-03-18T09:11:20.000Z',
        stage: 'Capture retry',
        status: 'RETRYING' as const,
        provider: 'mock-b',
        note: 'retry',
      },
      {
        id: 'a',
        occurredAt: '2026-03-18T09:10:00.000Z',
        stage: 'Intent created',
        status: 'CREATED' as const,
        provider: 'gateway',
        note: 'created',
      },
      {
        id: 'c',
        occurredAt: '2026-03-18T09:11:36.000Z',
        stage: 'Capture confirmed',
        status: 'PAID' as const,
        provider: 'mock-b',
        note: 'paid',
      },
    ];

    const first = normalizeStatusRows(shuffledRows);
    const second = normalizeStatusRows([...shuffledRows].reverse());

    expect(first.rows.map((row) => row.id)).toEqual(['a', 'b', 'c']);
    expect(second.rows.map((row) => row.id)).toEqual(['a', 'b', 'c']);
    expect(first.rows).toEqual(second.rows);
  });

  it('counts malformed rows and keeps valid status rows in malformed scenario', () => {
    const state = buildHarnessState('malformed_payload');

    expect(state.status.malformedCount).toBe(2);
    expect(state.status.rows).toHaveLength(1);
    expect(state.status.rows[0].id).toBe('m1');
  });

  it('returns deterministic recovery messages per scenario class', () => {
    expect(buildRecoveryMessage('success', 0)).toContain('No recovery needed');
    expect(buildRecoveryMessage('validation_error', 0)).toContain('Fix required fields');
    expect(buildRecoveryMessage('malformed_payload', 2)).toContain('Malformed status rows ignored: 2');
  });
});
