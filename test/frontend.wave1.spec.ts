import {
  applyRefundStatus,
  applyExceptionActionOptimistic,
  buildExceptionActionIdempotencyKey,
  classifyExceptionActionFailure,
  canRefundStatus,
  filterSettlementMerchants,
  normalizeExceptionStatus,
  normalizeOptional,
  prependExceptionAudit,
  validateExceptionActionInput,
} from '../frontend/utils/wave1';

describe('frontend wave1 helpers', () => {
  it('allows refund only for PAID rows', () => {
    expect(canRefundStatus('PAID')).toBe(true);
    expect(canRefundStatus('PENDING')).toBe(false);
    expect(canRefundStatus('REFUNDED')).toBe(false);
  });

  it('updates row status to REFUNDED after refund action', () => {
    const rows = [
      { reference: 'ref-1', status: 'PAID' as const, amount: '120.00' },
      { reference: 'ref-2', status: 'PENDING' as const, amount: '90.00' },
    ];

    const updated = applyRefundStatus(rows, 'ref-1');
    expect(updated[0].status).toBe('REFUNDED');
    expect(updated[1].status).toBe('PENDING');
  });

  it('filters settlement rows by merchant when merchant id is provided', () => {
    const rows = [
      {
        merchantId: 'merchant-a',
        paidDepositAmount: 100,
        paidWithdrawAmount: 10,
        refundedAmount: 5,
        netSettledAmount: 85,
        transactionCount: 2,
      },
      {
        merchantId: 'merchant-b',
        paidDepositAmount: 80,
        paidWithdrawAmount: 0,
        refundedAmount: 0,
        netSettledAmount: 80,
        transactionCount: 1,
      },
    ];

    expect(filterSettlementMerchants(rows, 'merchant-a')).toHaveLength(1);
    expect(filterSettlementMerchants(rows, '').length).toBe(2);
  });

  it('validates settlement exception action reason input', () => {
    expect(validateExceptionActionInput('')).toBe('Reason is required.');
    expect(validateExceptionActionInput('ok')).toBe('Reason must be at least 4 characters.');
    expect(validateExceptionActionInput('matched provider reconciliation evidence')).toBeNull();
  });

  it('normalizes optional filter inputs', () => {
    expect(normalizeOptional('  merchant-1  ')).toBe('merchant-1');
    expect(normalizeOptional('   ')).toBeUndefined();
    expect(normalizeOptional(undefined)).toBeUndefined();
  });

  it('applies optimistic status update for resolve/ignore actions', () => {
    const rows = [
      { id: 'exc-1', merchantId: 'm-1', provider: 'mock-a', status: 'open' as const, updatedAt: '2026-03-18T09:00:00.000Z' },
      { id: 'exc-2', merchantId: 'm-2', provider: 'mock-b', status: 'investigating' as const, updatedAt: '2026-03-18T09:00:00.000Z' },
    ];

    const resolved = applyExceptionActionOptimistic(rows, 'exc-1', 'resolve', '2026-03-18T10:00:00.000Z');
    expect(resolved[0].status).toBe('resolved');
    expect(resolved[0].updatedAt).toBe('2026-03-18T10:00:00.000Z');

    const ignored = applyExceptionActionOptimistic(rows, 'exc-2', 'ignore', '2026-03-18T10:05:00.000Z');
    expect(ignored[1].status).toBe('ignored');
    expect(ignored[1].updatedAt).toBe('2026-03-18T10:05:00.000Z');
  });

  it('prepends latest exception audit event', () => {
    const entries = [
      {
        id: 'audit-1',
        action: 'resolve' as const,
        reason: 'already fixed',
        note: null,
        actor: 'ops-1',
        createdAt: '2026-03-18T09:00:00.000Z',
      },
    ];

    const updated = prependExceptionAudit(entries, {
      id: 'audit-2',
      action: 'ignore',
      reason: 'known provider lag',
      note: 'waiting upstream batch',
      actor: 'ops-2',
      createdAt: '2026-03-18T09:01:00.000Z',
    });

    expect(updated[0].id).toBe('audit-2');
    expect(updated).toHaveLength(2);
  });

  it('classifies stale version conflicts as retryable', () => {
    const failure = classifyExceptionActionFailure('Version conflict; refresh and retry with current version');
    expect(failure.kind).toBe('version_conflict');
    expect(failure.retryable).toBe(true);
    expect(failure.userMessage).toContain('updated by another operator');
  });

  it('classifies canonical stale_version conflicts using machine fields', () => {
    const failure = classifyExceptionActionFailure({
      statusCode: 409,
      message: {
        code: 'SETTLEMENT_EXCEPTION_ACTION_CONFLICT',
        reason: 'stale_version',
        retryable: true,
        message: 'Version conflict',
      },
    });
    expect(failure.kind).toBe('version_conflict');
    expect(failure.retryable).toBe(true);
  });

  it('classifies transient action failures as retryable', () => {
    const failure = classifyExceptionActionFailure('Gateway timeout while updating exception action');
    expect(failure.kind).toBe('transient');
    expect(failure.retryable).toBe(true);
    expect(failure.userMessage).toContain('temporary backend issue');
  });

  it('classifies canonical idempotency_in_progress as transient', () => {
    const failure = classifyExceptionActionFailure({
      statusCode: 409,
      message: {
        code: 'SETTLEMENT_EXCEPTION_ACTION_CONFLICT',
        reason: 'idempotency_in_progress',
        retryable: true,
        message: 'in progress',
      },
    });
    expect(failure.kind).toBe('transient');
    expect(failure.retryable).toBe(true);
  });

  it('normalizes uppercase backend exception statuses', () => {
    expect(normalizeExceptionStatus('OPEN')).toBe('open');
    expect(normalizeExceptionStatus('INVESTIGATING')).toBe('investigating');
    expect(normalizeExceptionStatus('RESOLVED')).toBe('resolved');
    expect(normalizeExceptionStatus('IGNORED')).toBe('ignored');
  });

  it('builds deterministic idempotency keys for same exception action payload', () => {
    const input = {
      exceptionId: 'exc-1',
      action: 'resolve' as const,
      reason: 'reconciled with provider report',
      note: 'case-123',
      expectedVersion: 3,
      expectedUpdatedAt: '2026-03-18T10:00:00.000Z',
    };
    const first = buildExceptionActionIdempotencyKey(input);
    const second = buildExceptionActionIdempotencyKey(input);
    expect(first).toBe(second);
    expect(first.startsWith('settlement-action-')).toBe(true);
  });
});
