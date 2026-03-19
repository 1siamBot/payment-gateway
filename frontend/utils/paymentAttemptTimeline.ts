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
  evidenceEvents: EvidenceTimelineEvent[];
};

export type TimelineEventRow = RawAttemptEvent & {
  occurredAtEpochMs: number;
  orderLabel: string;
};

export type TimelineFilterKey = 'all' | 'retry' | 'failed' | 'refund-eligible';

export type TimelineViewState = {
  message: string;
  recoveryHint: string;
};

export type EvidenceEventType = 'annotated' | 'created' | 'ready_for_handoff' | 'replayed';

export type EvidenceTimelineEvent = {
  id: string;
  eventTime: string;
  eventType: EvidenceEventType;
  actor: string;
  detail: string;
};

export type EvidenceTimelineRow = EvidenceTimelineEvent & {
  eventTimeEpochMs: number;
  railOrderLabel: string;
};

export type EvidenceRailShortcut = 'next_event' | 'prev_event' | 'focus_handoff_bundle' | 'validate_handoff_bundle';

export type OperatorHandoffMode = 'pr' | 'no_pr';

export type OperatorHandoffBundleDraft = {
  branch: string;
  fullSha: string;
  mode: OperatorHandoffMode;
  prLink: string;
  blockerOwner: string;
  eta: string;
  artifactPathsText: string;
};

export type OperatorHandoffBundleValidation = {
  isComplete: boolean;
  missingFields: string[];
  artifactPaths: string[];
  summary: string;
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
    evidenceEvents: [
      { id: 'e-001', eventTime: '2026-03-18T08:00:01.000Z', eventType: 'created', actor: 'gateway', detail: 'Incident evidence packet initialized.' },
      { id: 'e-002', eventTime: '2026-03-18T08:01:14.000Z', eventType: 'annotated', actor: 'ops', detail: 'Operator attached issuer approval evidence.' },
      { id: 'e-003', eventTime: '2026-03-18T08:04:40.000Z', eventType: 'ready_for_handoff', actor: 'ops', detail: 'Evidence packet marked ready for PM handoff.' },
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
    evidenceEvents: [
      { id: 'e-101', eventTime: '2026-03-18T09:10:01.000Z', eventType: 'created', actor: 'gateway', detail: 'Retry incident evidence opened.' },
      { id: 'e-102', eventTime: '2026-03-18T09:10:48.000Z', eventType: 'annotated', actor: 'ops', detail: 'Capture timeout evidence attached.' },
      { id: 'e-103', eventTime: '2026-03-18T09:11:45.000Z', eventType: 'replayed', actor: 'ops', detail: 'Retry replay evidence captured and verified.' },
      { id: 'e-104', eventTime: '2026-03-18T09:14:10.000Z', eventType: 'ready_for_handoff', actor: 'ops', detail: 'Evidence bundle verified and ready.' },
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
    evidenceEvents: [
      { id: 'e-201', eventTime: '2026-03-18T10:20:02.000Z', eventType: 'created', actor: 'gateway', detail: 'Failure investigation evidence packet started.' },
      { id: 'e-202', eventTime: '2026-03-18T10:20:50.000Z', eventType: 'annotated', actor: 'ops', detail: 'Provider non-retryable response attached.' },
      { id: 'e-203', eventTime: '2026-03-18T10:21:08.000Z', eventType: 'replayed', actor: 'ops', detail: 'Replay confirms non-retryable failure path.' },
      { id: 'e-204', eventTime: '2026-03-18T10:24:15.000Z', eventType: 'ready_for_handoff', actor: 'ops', detail: 'Escalation handoff packet complete.' },
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
    evidenceEvents: [],
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
    evidenceEvents: [
      { id: 'e-301', eventTime: '2026-03-18T11:00:02.000Z', eventType: 'created', actor: 'gateway', detail: 'Partial evidence packet created with malformed timeline rows.' },
      { id: 'e-302', eventTime: 'invalid-date-value', eventType: 'annotated', actor: 'ops', detail: 'Malformed evidence timestamp should be skipped.' },
      { id: 'e-303', eventTime: '2026-03-18T11:01:20.000Z', eventType: 'ready_for_handoff', actor: 'ops', detail: 'Partial handoff only for valid rows.' },
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
    evidenceEvents: fixture.evidenceEvents.map((event) => ({ ...event })),
  };
}

export function normalizeEvidenceTimelineEvents(rawEvents: EvidenceTimelineEvent[]): {
  rows: EvidenceTimelineRow[];
  malformedCount: number;
} {
  const validRows: EvidenceTimelineRow[] = [];
  let malformedCount = 0;

  rawEvents.forEach((event) => {
    const eventTimeEpochMs = Date.parse(event.eventTime);
    if (!Number.isFinite(eventTimeEpochMs)) {
      malformedCount += 1;
      return;
    }
    validRows.push({
      ...event,
      eventTimeEpochMs,
      railOrderLabel: '',
    });
  });

  validRows.sort((a, b) => {
    if (a.eventTimeEpochMs !== b.eventTimeEpochMs) {
      return a.eventTimeEpochMs - b.eventTimeEpochMs;
    }
    const typeDelta = a.eventType.localeCompare(b.eventType);
    if (typeDelta !== 0) {
      return typeDelta;
    }
    return a.id.localeCompare(b.id);
  });

  validRows.forEach((row, index) => {
    row.railOrderLabel = `RAIL-${String(index + 1).padStart(3, '0')}`;
  });

  return { rows: validRows, malformedCount };
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
      orderLabel: '',
    });
  });

  validRows.sort((a, b) => {
    if (a.occurredAtEpochMs === b.occurredAtEpochMs) {
      return a.id.localeCompare(b.id);
    }
    return a.occurredAtEpochMs - b.occurredAtEpochMs;
  });

  validRows.forEach((row, index) => {
    row.orderLabel = `EVT-${String(index + 1).padStart(3, '0')}`;
  });

  return { rows: validRows, malformedCount };
}

export function isRetryEvent(row: TimelineEventRow): boolean {
  return row.stage.toLowerCase().includes('retry');
}

export function isRefundEligibleEvent(row: TimelineEventRow, rows: TimelineEventRow[]): boolean {
  if (row.status !== 'failed') {
    return false;
  }
  const laterRows = rows.filter((candidate) => candidate.occurredAtEpochMs > row.occurredAtEpochMs);
  const hasRecoveryAfterFailure = laterRows.some((candidate) => {
    const stage = candidate.stage.toLowerCase();
    return (
      stage.includes('capture retry sent')
      || stage.includes('capture confirmed')
      || stage.includes('settlement completed')
    );
  });
  return !hasRecoveryAfterFailure;
}

export function filterTimelineEvents(rows: TimelineEventRow[], filterKey: TimelineFilterKey): TimelineEventRow[] {
  if (filterKey === 'all') {
    return rows;
  }
  if (filterKey === 'retry') {
    return rows.filter((row) => isRetryEvent(row));
  }
  if (filterKey === 'failed') {
    return rows.filter((row) => row.status === 'failed');
  }
  return rows.filter((row) => isRefundEligibleEvent(row, rows));
}

export function buildTimelineViewState(input: {
  rowsCount: number;
  malformedCount: number;
  paymentReference: string;
  loadErrorMessage?: string;
}): TimelineViewState {
  if (input.loadErrorMessage) {
    return {
      message: 'Timeline fixture failed to load.',
      recoveryHint: `Retry load. If this keeps happening, switch scenario and reopen drawer for ${input.paymentReference}.`,
    };
  }

  if (input.rowsCount === 0) {
    if (input.malformedCount > 0) {
      return {
        message: 'Timeline data contains malformed events only.',
        recoveryHint: 'Switch to Successful Capture or Retry Then Success to validate drawer rendering.',
      };
    }
    return {
      message: 'No attempt events are available for this payment yet.',
      recoveryHint: 'Switch to Successful Capture or Retry Then Success, then reopen drawer.',
    };
  }

  return {
    message: `Loaded ${input.rowsCount} event(s) for ${input.paymentReference}.`,
    recoveryHint: 'Use scenario switcher to compare alternate deterministic timelines.',
  };
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

export function getDefaultOperatorHandoffBundleDraft(): OperatorHandoffBundleDraft {
  return {
    branch: '',
    fullSha: '',
    mode: 'pr',
    prLink: '',
    blockerOwner: '',
    eta: '',
    artifactPathsText: '',
  };
}

function normalizeArtifactPaths(input: string): string[] {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => Boolean(line));
}

export function validateOperatorHandoffBundleDraft(
  draft: OperatorHandoffBundleDraft,
): OperatorHandoffBundleValidation {
  const missingFields: string[] = [];
  const artifactPaths = normalizeArtifactPaths(draft.artifactPathsText);
  if (!draft.branch.trim()) {
    missingFields.push('branch');
  }
  if (!draft.fullSha.trim()) {
    missingFields.push('fullSha');
  }
  if (draft.mode === 'pr' && !draft.prLink.trim()) {
    missingFields.push('prLink');
  }
  if (!draft.blockerOwner.trim()) {
    missingFields.push('blockerOwner');
  }
  if (!draft.eta.trim()) {
    missingFields.push('eta');
  }
  if (!artifactPaths.length) {
    missingFields.push('artifactPaths');
  }

  const isComplete = missingFields.length === 0;
  const summary = isComplete
    ? `Bundle complete for ${draft.branch.trim()} at ${draft.fullSha.trim()}.`
    : `Bundle missing: ${missingFields.join(', ')}.`;

  return {
    isComplete,
    missingFields,
    artifactPaths,
    summary,
  };
}

export function moveEvidenceTimelineSelection(input: {
  rows: EvidenceTimelineRow[];
  activeEventId: string | null;
  direction: 'next' | 'prev';
}): string | null {
  if (!input.rows.length) {
    return null;
  }

  const currentIndex = input.activeEventId
    ? input.rows.findIndex((row) => row.id === input.activeEventId)
    : -1;

  if (currentIndex < 0) {
    return input.direction === 'next' ? input.rows[0].id : input.rows[input.rows.length - 1].id;
  }

  const delta = input.direction === 'next' ? 1 : -1;
  const nextIndex = (currentIndex + delta + input.rows.length) % input.rows.length;
  return input.rows[nextIndex].id;
}

export function resolveEvidenceRailShortcut(input: {
  key: string;
  ctrlKey?: boolean;
}): EvidenceRailShortcut | null {
  if (input.ctrlKey && input.key === 'Enter') {
    return 'validate_handoff_bundle';
  }
  const normalized = input.key.toLowerCase();
  if (normalized === 'n') {
    return 'next_event';
  }
  if (normalized === 'p') {
    return 'prev_event';
  }
  if (normalized === 'h') {
    return 'focus_handoff_bundle';
  }
  return null;
}

export function clearHandoffBundleDraftSafe(input: {
  confirmFullReset: boolean;
  selectedFilter: TimelineFilterKey;
  activeEvidenceEventId: string | null;
}): {
  draft: OperatorHandoffBundleDraft;
  selectedFilter: TimelineFilterKey;
  activeEvidenceEventId: string | null;
  didFullReset: boolean;
} {
  if (input.confirmFullReset) {
    return {
      draft: getDefaultOperatorHandoffBundleDraft(),
      selectedFilter: 'all',
      activeEvidenceEventId: null,
      didFullReset: true,
    };
  }
  return {
    draft: getDefaultOperatorHandoffBundleDraft(),
    selectedFilter: input.selectedFilter,
    activeEvidenceEventId: input.activeEvidenceEventId,
    didFullReset: false,
  };
}
