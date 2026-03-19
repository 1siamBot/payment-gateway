import {
  normalizePaymentAttemptTimelineAuditLogs,
  PAYMENT_ATTEMPT_TIMELINE_ERROR_CODES,
} from '../src/payments/payment-attempt-timeline-normalizer';

describe('payment attempt timeline normalizer', () => {
  it('returns deterministic malformed code counts with stable map ordering', () => {
    const result = normalizePaymentAttemptTimelineAuditLogs([
      {
        id: 'audit-4',
        eventType: 'payment.attempt.event',
        actor: 'gateway',
        createdAt: new Date('2026-03-19T09:00:00.000Z'),
        metadata: '{"bad": ',
      },
      {
        id: 'audit-3',
        eventType: 'payment.attempt.event',
        actor: 'gateway',
        createdAt: new Date('2026-03-19T09:00:00.000Z'),
        metadata: JSON.stringify({
          stage: '',
          status: 'completed',
          occurredAt: '2026-03-19T09:00:01.000Z',
        }),
      },
      {
        id: 'audit-2',
        eventType: 'payment.attempt.event',
        actor: 'gateway',
        createdAt: new Date('2026-03-19T09:00:00.000Z'),
        metadata: JSON.stringify({
          stage: 'Created',
          status: 'unknown_status',
          occurredAt: '2026-03-19T09:00:02.000Z',
        }),
      },
      {
        id: 'audit-1',
        eventType: 'payment.attempt.event',
        actor: 'gateway',
        createdAt: new Date('2026-03-19T09:00:00.000Z'),
        metadata: JSON.stringify({
          stage: 'Created',
          status: 'completed',
          occurredAt: 'not-a-date',
        }),
      },
      {
        id: 'audit-5',
        eventType: 'transaction.transition',
        actor: 'gateway',
        createdAt: new Date('2026-03-19T09:00:10.000Z'),
        metadata: JSON.stringify({
          fromStatus: 'PENDING',
          note: 'missing toStatus',
          occurredAt: '2026-03-19T09:00:10.000Z',
        }),
      },
      {
        id: 'audit-6',
        eventType: 'payment.attempt.event',
        actor: 'gateway',
        createdAt: new Date('2026-03-19T09:00:11.000Z'),
        metadata: JSON.stringify({
          stage: 'Payment created',
          status: 'completed',
          actor: 'gateway',
          note: 'valid row',
          occurredAt: '2026-03-19T09:00:11.000Z',
        }),
      },
    ]);

    expect(result.events).toHaveLength(1);
    expect(result.malformedCount).toBe(5);
    expect(result.normalization.contract).toBe('payment-attempt-timeline.v2');
    expect(Object.keys(result.normalization.malformedByCode)).toEqual([...PAYMENT_ATTEMPT_TIMELINE_ERROR_CODES]);
    expect(result.normalization.malformedByCode).toEqual({
      'TLN-001_INVALID_METADATA_JSON': 1,
      'TLN-002_MISSING_STAGE': 1,
      'TLN-003_INVALID_STATUS': 1,
      'TLN-004_INVALID_OCCURRED_AT': 1,
      'TLN-005_MISSING_TO_STATUS': 1,
    });
  });

  it('normalizes and orders valid rows deterministically', () => {
    const result = normalizePaymentAttemptTimelineAuditLogs([
      {
        id: 'audit-z',
        eventType: 'payment.attempt.event',
        actor: 'gateway',
        createdAt: new Date('2026-03-19T09:02:00.000Z'),
        metadata: JSON.stringify({
          stage: 'Capture done',
          status: 'completed',
          actor: 'mock-a',
          note: 'row-2',
          occurredAt: '2026-03-19T09:03:00.000Z',
        }),
      },
      {
        id: 'audit-a',
        eventType: 'payment.attempt.event',
        actor: 'gateway',
        createdAt: new Date('2026-03-19T09:00:00.000Z'),
        metadata: JSON.stringify({
          stage: 'Payment created',
          status: 'completed',
          actor: 'gateway',
          note: 'row-1',
          occurredAt: '2026-03-19T09:01:00.000Z',
        }),
      },
      {
        id: 'audit-b',
        eventType: 'transaction.transition',
        actor: 'gateway',
        createdAt: new Date('2026-03-19T09:01:30.000Z'),
        metadata: JSON.stringify({
          fromStatus: 'PENDING',
          toStatus: 'PAID',
          note: 'transition',
          occurredAt: '2026-03-19T09:02:00.000Z',
        }),
      },
    ]);

    expect(result.events.map((row) => row.id)).toEqual(['audit-a', 'audit-b', 'audit-z']);
    expect(result.events[1]).toEqual({
      id: 'audit-b',
      occurredAt: '2026-03-19T09:02:00.000Z',
      stage: 'Status changed: PENDING -> PAID',
      status: 'completed',
      actor: 'gateway',
      note: 'transition',
      source: 'transaction_transition',
    });
    expect(result.malformedCount).toBe(0);
  });
});
