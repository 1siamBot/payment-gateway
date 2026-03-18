export type TimelineScenarioKey =
  | 'successful_capture'
  | 'retry_then_success'
  | 'terminal_failure'
  | 'empty'
  | 'malformed';

export type RawAttemptEvent = {
  id: string;
  occurredAt: string;
  stage: string;
  status: 'completed' | 'pending' | 'failed' | 'info';
  actor: string;
  note: string;
};

export type PaymentAttemptFixture = {
  scenario: TimelineScenarioKey;
  scenarioLabel: string;
  paymentReference: string;
  merchantId: string;
  amount: string;
  currency: string;
  finalStatus: string;
  events: RawAttemptEvent[];
};

export type TimelineEventRow = RawAttemptEvent & {
  occurredAtEpochMs: number;
};

const FIXTURES: Record<TimelineScenarioKey, PaymentAttemptFixture> = {
  successful_capture: {
    scenario: 'successful_capture',
    scenarioLabel: 'Successful Capture',
    paymentReference: 'pay_scn_success_001',
    merchantId: 'merchant_alpha',
    amount: '149.50',
    currency: 'USD',
    finalStatus: 'CAPTURED',
    events: [
      { id: 'ev-001', occurredAt: '2026-03-18T08:00:00.000Z', stage: 'Payment created', status: 'completed', actor: 'gateway', note: 'Initial authorization request accepted.' },
      { id: 'ev-002', occurredAt: '2026-03-18T08:00:07.000Z', stage: 'Risk pre-check', status: 'completed', actor: 'risk-engine', note: 'Low-risk outcome.' },
      { id: 'ev-003', occurredAt: '2026-03-18T08:00:15.000Z', stage: 'Authorization sent', status: 'completed', actor: 'mock-a', note: 'Provider acknowledged authorization call.' },
      { id: 'ev-004', occurredAt: '2026-03-18T08:00:19.000Z', stage: 'Authorization approved', status: 'completed', actor: 'mock-a', note: 'Issuer approved transaction.' },
      { id: 'ev-005', occurredAt: '2026-03-18T08:01:02.000Z', stage: 'Capture requested', status: 'completed', actor: 'gateway', note: 'Capture request queued by workflow.' },
      { id: 'ev-006', occurredAt: '2026-03-18T08:01:05.000Z', stage: 'Capture in progress', status: 'pending', actor: 'mock-a', note: 'Provider processing capture.' },
      { id: 'ev-007', occurredAt: '2026-03-18T08:01:12.000Z', stage: 'Capture confirmed', status: 'completed', actor: 'mock-a', note: 'Capture completed successfully.' },
      { id: 'ev-008', occurredAt: '2026-03-18T08:01:26.000Z', stage: 'Settlement queued', status: 'info', actor: 'ledger', note: 'Batch settlement scheduled.' },
      { id: 'ev-009', occurredAt: '2026-03-18T08:04:26.000Z', stage: 'Settlement completed', status: 'completed', actor: 'ledger', note: 'Funds settled to merchant account.' },
    ],
  },
  retry_then_success: {
    scenario: 'retry_then_success',
    scenarioLabel: 'Retry Then Success',
    paymentReference: 'pay_scn_retry_001',
    merchantId: 'merchant_bravo',
    amount: '230.00',
    currency: 'USD',
    finalStatus: 'CAPTURED_AFTER_RETRY',
    events: [
      { id: 'ev-101', occurredAt: '2026-03-18T09:10:00.000Z', stage: 'Payment created', status: 'completed', actor: 'gateway', note: 'Initial attempt opened.' },
      { id: 'ev-102', occurredAt: '2026-03-18T09:10:04.000Z', stage: 'Authorization sent', status: 'completed', actor: 'mock-b', note: 'Provider accepted auth call.' },
      { id: 'ev-103', occurredAt: '2026-03-18T09:10:09.000Z', stage: 'Authorization approved', status: 'completed', actor: 'mock-b', note: 'Card approved.' },
      { id: 'ev-104', occurredAt: '2026-03-18T09:10:40.000Z', stage: 'Capture requested', status: 'completed', actor: 'gateway', note: 'Capture request dispatched.' },
      { id: 'ev-105', occurredAt: '2026-03-18T09:10:46.000Z', stage: 'Capture failed', status: 'failed', actor: 'mock-b', note: 'Provider timeout during capture.' },
      { id: 'ev-106', occurredAt: '2026-03-18T09:11:01.000Z', stage: 'Retry scheduled', status: 'info', actor: 'gateway', note: 'Automatic retry after transient error.' },
      { id: 'ev-107', occurredAt: '2026-03-18T09:11:34.000Z', stage: 'Capture retry sent', status: 'completed', actor: 'gateway', note: 'Second capture request dispatched.' },
      { id: 'ev-108', occurredAt: '2026-03-18T09:11:39.000Z', stage: 'Capture confirmed', status: 'completed', actor: 'mock-b', note: 'Retry completed successfully.' },
      { id: 'ev-109', occurredAt: '2026-03-18T09:14:00.000Z', stage: 'Settlement completed', status: 'completed', actor: 'ledger', note: 'Settled after retry path.' },
    ],
  },
  terminal_failure: {
    scenario: 'terminal_failure',
    scenarioLabel: 'Terminal Failure',
    paymentReference: 'pay_scn_failed_001',
    merchantId: 'merchant_charlie',
    amount: '88.25',
    currency: 'USD',
    finalStatus: 'FAILED',
    events: [
      { id: 'ev-201', occurredAt: '2026-03-18T10:20:00.000Z', stage: 'Payment created', status: 'completed', actor: 'gateway', note: 'Attempt opened.' },
      { id: 'ev-202', occurredAt: '2026-03-18T10:20:05.000Z', stage: 'Risk pre-check', status: 'completed', actor: 'risk-engine', note: 'Risk accepted.' },
      { id: 'ev-203', occurredAt: '2026-03-18T10:20:11.000Z', stage: 'Authorization sent', status: 'completed', actor: 'mock-a', note: 'Provider acknowledged auth call.' },
      { id: 'ev-204', occurredAt: '2026-03-18T10:20:16.000Z', stage: 'Authorization approved', status: 'completed', actor: 'mock-a', note: 'Issuer approved auth.' },
      { id: 'ev-205', occurredAt: '2026-03-18T10:20:43.000Z', stage: 'Capture requested', status: 'completed', actor: 'gateway', note: 'Capture queued.' },
      { id: 'ev-206', occurredAt: '2026-03-18T10:20:48.000Z', stage: 'Capture failed', status: 'failed', actor: 'mock-a', note: 'Provider returned non-retryable capture error.' },
      { id: 'ev-207', occurredAt: '2026-03-18T10:21:01.000Z', stage: 'Operator escalation opened', status: 'info', actor: 'ops', note: 'Ticket created for operator follow-up.' },
      { id: 'ev-208', occurredAt: '2026-03-18T10:24:01.000Z', stage: 'Payment marked failed', status: 'failed', actor: 'gateway', note: 'Terminal state persisted without retry.' },
    ],
  },
  empty: {
    scenario: 'empty',
    scenarioLabel: 'Empty Timeline',
    paymentReference: 'pay_scn_empty_001',
    merchantId: 'merchant_delta',
    amount: '0.00',
    currency: 'USD',
    finalStatus: 'NO_EVENTS',
    events: [],
  },
  malformed: {
    scenario: 'malformed',
    scenarioLabel: 'Malformed Events',
    paymentReference: 'pay_scn_malformed_001',
    merchantId: 'merchant_echo',
    amount: '64.00',
    currency: 'USD',
    finalStatus: 'PARTIAL_DATA',
    events: [
      { id: 'ev-301', occurredAt: '2026-03-18T11:00:00.000Z', stage: 'Payment created', status: 'completed', actor: 'gateway', note: 'Valid row should render.' },
      { id: 'ev-302', occurredAt: '', stage: 'Authorization sent', status: 'completed', actor: 'mock-a', note: 'Malformed: missing timestamp.' },
      { id: 'ev-303', occurredAt: 'invalid-date-value', stage: 'Capture requested', status: 'pending', actor: 'gateway', note: 'Malformed: invalid timestamp.' },
      { id: 'ev-304', occurredAt: '2026-03-18T11:01:15.000Z', stage: 'Payment marked failed', status: 'failed', actor: 'gateway', note: 'Valid terminal row should render.' },
    ],
  },
};

export function resolveScenarioLabel(scenario: TimelineScenarioKey): string {
  return FIXTURES[scenario].scenarioLabel;
}

export function getPaymentAttemptFixture(scenario: TimelineScenarioKey): PaymentAttemptFixture {
  const fixture = FIXTURES[scenario];
  return {
    ...fixture,
    events: fixture.events.map((event) => ({ ...event })),
  };
}

export function normalizeTimelineEvents(rawEvents: RawAttemptEvent[]): {
  rows: TimelineEventRow[];
  malformedCount: number;
} {
  const validRows: TimelineEventRow[] = [];
  let malformedCount = 0;

  rawEvents.forEach((event) => {
    const occurredAtEpochMs = Date.parse(event.occurredAt);
    if (!Number.isFinite(occurredAtEpochMs)) {
      malformedCount += 1;
      return;
    }
    validRows.push({
      ...event,
      occurredAtEpochMs,
    });
  });

  validRows.sort((a, b) => {
    if (a.occurredAtEpochMs === b.occurredAtEpochMs) {
      return a.id.localeCompare(b.id);
    }
    return a.occurredAtEpochMs - b.occurredAtEpochMs;
  });

  return { rows: validRows, malformedCount };
}

export async function loadPaymentAttemptScenario(
  scenario: TimelineScenarioKey,
  options?: { delayMs?: number },
): Promise<PaymentAttemptFixture> {
  const delayMs = Math.max(0, options?.delayMs ?? 240);
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return getPaymentAttemptFixture(scenario);
}
