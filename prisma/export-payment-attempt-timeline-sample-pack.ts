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
  contract: 'payment-attempt-timeline.v1',
  generatedAt: '2026-03-19T00:00:00.000Z',
  scenarios: PAYMENT_ATTEMPT_TIMELINE_FIXTURES.map((fixture) => {
    const normalizedEvents: TimelineEvent[] = [];
    let malformedCount = 0;

    for (const event of fixture.events) {
      const normalized = normalizeEvent(event);
      if (!normalized) {
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
      },
    };
  }),
};

const outputPath = resolve(process.cwd(), 'artifacts/one-214/payment-attempt-timeline-sample-pack.json');
mkdirSync(resolve(process.cwd(), 'artifacts/one-214'), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(payloadPack, null, 2)}\n`, 'utf8');

console.log(`Wrote sample payload pack to ${outputPath}`);
