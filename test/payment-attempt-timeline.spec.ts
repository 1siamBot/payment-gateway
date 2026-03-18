import {
  getPaymentAttemptFixture,
  normalizeTimelineEvents,
} from '../frontend/utils/paymentAttemptTimeline';

describe('payment attempt timeline fixtures', () => {
  it('orders events in ascending timestamp order for success scenario', () => {
    const fixture = getPaymentAttemptFixture('successful_capture');
    const shuffled = [fixture.events[3], fixture.events[0], fixture.events[8], fixture.events[4], fixture.events[1]];
    const { rows, malformedCount } = normalizeTimelineEvents(shuffled);

    expect(malformedCount).toBe(0);
    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.id)).toEqual(['ev-001', 'ev-002', 'ev-004', 'ev-005', 'ev-009']);
  });

  it('returns empty rows for empty fixture scenario', () => {
    const fixture = getPaymentAttemptFixture('empty');
    const { rows, malformedCount } = normalizeTimelineEvents(fixture.events);

    expect(rows).toHaveLength(0);
    expect(malformedCount).toBe(0);
  });

  it('flags malformed rows and keeps valid timeline rows', () => {
    const fixture = getPaymentAttemptFixture('malformed');
    const { rows, malformedCount } = normalizeTimelineEvents(fixture.events);

    expect(malformedCount).toBe(2);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.id)).toEqual(['ev-301', 'ev-304']);
  });
});
