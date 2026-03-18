import { SettlementExceptionStatus } from '@prisma/client';
import {
  SETTLEMENT_EXCEPTION_QA_FIXTURES,
  settlementExceptionActionIdempotencyScope,
  settlementExceptionActionRequestFingerprint,
} from '../src/settlements/exception-qa-fixtures';

describe('settlement exception QA fixtures', () => {
  it('includes deterministic fixtures for all required statuses', () => {
    const statuses = new Set(SETTLEMENT_EXCEPTION_QA_FIXTURES.map((fixture) => fixture.status));

    expect(statuses).toEqual(new Set([
      SettlementExceptionStatus.OPEN,
      SettlementExceptionStatus.INVESTIGATING,
      SettlementExceptionStatus.RESOLVED,
      SettlementExceptionStatus.IGNORED,
    ]));
  });

  it('includes required replay scenarios', () => {
    const scenarios = new Set(SETTLEMENT_EXCEPTION_QA_FIXTURES.map((fixture) => fixture.scenario));

    expect(scenarios.has('resolve_success')).toBe(true);
    expect(scenarios.has('ignore_success')).toBe(true);
    expect(scenarios.has('stale_version_conflict')).toBe(true);
    expect(scenarios.has('action_failure_retry')).toBe(true);
  });

  it('keeps fixture ids stable for deterministic QA references', () => {
    expect(SETTLEMENT_EXCEPTION_QA_FIXTURES.map((fixture) => fixture.id)).toEqual([
      'se_fx_resolve_success',
      'se_fx_ignore_success',
      'se_fx_stale_conflict',
      'se_fx_action_retry',
      'se_fx_investigating_reference',
      'se_fx_resolved_reference',
      'se_fx_ignored_reference',
    ]);
  });

  it('builds idempotency scope and fingerprint consistently', () => {
    expect(settlementExceptionActionIdempotencyScope('se_fx_action_retry')).toBe(
      'settlement_exception_action:se_fx_action_retry',
    );

    expect(
      settlementExceptionActionRequestFingerprint({
        exceptionId: 'se_fx_action_retry',
        action: 'resolve',
        reason: 'retry',
        note: null,
        expectedVersion: 1,
        expectedUpdatedAt: '2026-03-18T00:00:00.000Z',
      }),
    ).toBe(
      JSON.stringify({
        exceptionId: 'se_fx_action_retry',
        action: 'resolve',
        reason: 'retry',
        note: null,
        expectedVersion: 1,
        expectedUpdatedAt: '2026-03-18T00:00:00.000Z',
      }),
    );
  });
});
