import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import {
  PAYMENT_ATTEMPT_TIMELINE_FIXTURES,
  type PaymentAttemptTimelineSeedEvent,
} from '../src/payments/payment-attempt-timeline-fixtures';

type TimelineStatus = 'completed' | 'pending' | 'failed' | 'info';

type TimelineEvent = {
  id: string;
  occurredAt: string;
  stage: string;
  status: TimelineStatus;
  actor: string;
  note: string;
  source: 'attempt_event';
};

const ERROR_CODE_MAP = [
  {
    code: 'TLN-001_INVALID_METADATA_JSON',
    description: 'Audit row metadata is not valid JSON object payload.',
    remediationHint: 'Ensure audit metadata is serialized as object JSON before writing payment timeline events.',
  },
  {
    code: 'TLN-002_MISSING_STAGE',
    description: 'Attempt-event metadata is missing a non-empty stage field.',
    remediationHint: 'Populate metadata.stage with a stable operator-facing stage label.',
  },
  {
    code: 'TLN-003_INVALID_STATUS',
    description: 'Attempt-event metadata.status is not one of completed, pending, failed, info.',
    remediationHint: 'Normalize status to the supported enum before persisting the event.',
  },
  {
    code: 'TLN-004_INVALID_OCCURRED_AT',
    description: 'Timeline occurredAt timestamp is missing or not parseable as an ISO-8601 date.',
    remediationHint: 'Write metadata.occurredAt using a valid UTC timestamp string.',
  },
  {
    code: 'TLN-005_MISSING_TO_STATUS',
    description: 'Transaction transition event metadata is missing toStatus.',
    remediationHint: 'Persist transaction.transition with metadata.toStatus set to the resulting transaction status.',
  },
] as const;

type TimelineErrorCode = typeof ERROR_CODE_MAP[number]['code'];

function createEmptyMalformedByCode(): Record<TimelineErrorCode, number> {
  return {
    'TLN-001_INVALID_METADATA_JSON': 0,
    'TLN-002_MISSING_STAGE': 0,
    'TLN-003_INVALID_STATUS': 0,
    'TLN-004_INVALID_OCCURRED_AT': 0,
    'TLN-005_MISSING_TO_STATUS': 0,
  };
}

function normalizeEvent(event: PaymentAttemptTimelineSeedEvent): TimelineEvent | null {
  if (!event.stage) {
    return null;
  }
  if (event.status !== 'completed' && event.status !== 'pending' && event.status !== 'failed' && event.status !== 'info') {
    return null;
  }

  const occurredAtEpochMs = Date.parse(event.occurredAt);
  if (!Number.isFinite(occurredAtEpochMs)) {
    return null;
  }

  return {
    id: event.id,
    occurredAt: new Date(occurredAtEpochMs).toISOString(),
    stage: event.stage,
    status: event.status,
    actor: event.actor,
    note: event.note,
    source: 'attempt_event',
  };
}

const payloadPack = {
  contract: 'payment-attempt-timeline.v2',
  generatedAt: '2026-03-19T00:00:00.000Z',
  scenarios: PAYMENT_ATTEMPT_TIMELINE_FIXTURES.map((fixture) => {
    const normalizedEvents: TimelineEvent[] = [];
    const malformedByCode = createEmptyMalformedByCode();
    let malformedCount = 0;

    for (const event of fixture.events) {
      const normalized = normalizeEvent(event);
      if (!normalized) {
        malformedByCode['TLN-004_INVALID_OCCURRED_AT'] += 1;
        malformedCount += 1;
        continue;
      }
      normalizedEvents.push(normalized);
    }

    normalizedEvents.sort((left, right) => {
      const timeDelta = Date.parse(left.occurredAt) - Date.parse(right.occurredAt);
      if (timeDelta !== 0) {
        return timeDelta;
      }
      return left.id.localeCompare(right.id);
    });

    return {
      scenario: fixture.scenario,
      scenarioLabel: fixture.scenarioLabel,
      request: {
        method: 'GET',
        path: `/payments/${fixture.paymentReference}/attempt-timeline`,
        merchantId: fixture.merchantId,
      },
      response: {
        paymentReference: fixture.paymentReference,
        transactionId: `tx_sample_${fixture.scenario}`,
        merchantId: fixture.merchantId,
        finalStatus: fixture.finalStatus,
        events: normalizedEvents,
        summary: {
          eventCount: normalizedEvents.length,
          malformedCount,
          emptyTimeline: normalizedEvents.length === 0,
        },
        normalization: {
          contract: 'payment-attempt-timeline.v2',
          malformedByCode,
          errorCodeMap: ERROR_CODE_MAP,
        },
      },
    };
  }),
};

const outputPath = resolve(process.cwd(), 'artifacts/one-214/payment-attempt-timeline-sample-pack.json');
mkdirSync(resolve(process.cwd(), 'artifacts/one-214'), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(payloadPack, null, 2)}\n`, 'utf8');

console.log(`Wrote sample payload pack to ${outputPath}`);
