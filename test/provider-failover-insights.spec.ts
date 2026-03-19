import {
  buildFailoverSectionViewState,
  filterFailoverTimeline,
  filterHeatmapRows,
  nextFailoverRetryAttempt,
  resolveFailoverInsightsDataSource,
  sortFailoverTimelineDeterministic,
  sortHealthHeatmapDeterministic,
  type FailoverIncidentRow,
  type HealthHeatmapRow,
} from '../frontend/utils/providerFailoverInsights';

describe('provider failover insights utilities', () => {
  it('sorts heatmap rows deterministically by provider, region, then score', () => {
    const rows: HealthHeatmapRow[] = [
      {
        provider: 'mock-b',
        region: 'ap-southeast-1',
        availabilityScore: 81,
        circuitState: 'open',
        failoverEvents: 2,
      },
      {
        provider: 'mock-a',
        region: 'eu-west-1',
        availabilityScore: 88,
        circuitState: 'half_open',
        failoverEvents: 1,
      },
      {
        provider: 'mock-a',
        region: 'ap-southeast-1',
        availabilityScore: 91,
        circuitState: 'closed',
        failoverEvents: 0,
      },
      {
        provider: 'mock-a',
        region: 'ap-southeast-1',
        availabilityScore: 84,
        circuitState: 'open',
        failoverEvents: 3,
      },
    ];

    const sorted = sortHealthHeatmapDeterministic(rows);

    expect(sorted.map((row) => `${row.provider}:${row.region}:${row.availabilityScore}`)).toEqual([
      'mock-a:ap-southeast-1:91',
      'mock-a:ap-southeast-1:84',
      'mock-a:eu-west-1:88',
      'mock-b:ap-southeast-1:81',
    ]);
  });

  it('sorts failover timeline deterministically by occurredAt desc with id tie-break', () => {
    const rows: FailoverIncidentRow[] = [
      {
        id: 'evt-2',
        occurredAt: '2026-03-19T10:00:00.000Z',
        provider: 'mock-a',
        region: 'global',
        status: 'investigating',
        rootCause: 'root cause',
        retryOutcome: 'retry_pending',
        failoverCount: 2,
        summary: 'second',
      },
      {
        id: 'evt-1',
        occurredAt: '2026-03-19T10:00:00.000Z',
        provider: 'mock-b',
        region: 'global',
        status: 'mitigated',
        rootCause: 'root cause',
        retryOutcome: 'retry_succeeded',
        failoverCount: 1,
        summary: 'first',
      },
      {
        id: 'evt-0',
        occurredAt: '2026-03-19T09:00:00.000Z',
        provider: 'mock-c',
        region: 'global',
        status: 'detected',
        rootCause: 'root cause',
        retryOutcome: 'none',
        failoverCount: 0,
        summary: 'third',
      },
    ];

    const sorted = sortFailoverTimelineDeterministic(rows);
    expect(sorted.map((row) => row.id)).toEqual(['evt-1', 'evt-2', 'evt-0']);
  });

  it('applies provider/region/status filters deterministically to heatmap and timeline', () => {
    const heatmapRows: HealthHeatmapRow[] = [
      {
        provider: 'mock-a',
        region: 'ap-southeast-1',
        availabilityScore: 95,
        circuitState: 'closed',
        failoverEvents: 1,
      },
      {
        provider: 'mock-a',
        region: 'eu-west-1',
        availabilityScore: 90,
        circuitState: 'closed',
        failoverEvents: 0,
      },
      {
        provider: 'mock-b',
        region: 'ap-southeast-1',
        availabilityScore: 80,
        circuitState: 'open',
        failoverEvents: 3,
      },
    ];

    const timelineRows: FailoverIncidentRow[] = [
      {
        id: 'evt-a',
        occurredAt: '2026-03-19T10:00:00.000Z',
        provider: 'mock-a',
        region: 'ap-southeast-1',
        status: 'mitigated',
        rootCause: 'root cause',
        retryOutcome: 'retry_succeeded',
        failoverCount: 1,
        summary: 'a',
      },
      {
        id: 'evt-b',
        occurredAt: '2026-03-19T09:00:00.000Z',
        provider: 'mock-a',
        region: 'eu-west-1',
        status: 'investigating',
        rootCause: 'root cause',
        retryOutcome: 'retry_pending',
        failoverCount: 2,
        summary: 'b',
      },
      {
        id: 'evt-c',
        occurredAt: '2026-03-19T08:00:00.000Z',
        provider: 'mock-b',
        region: 'ap-southeast-1',
        status: 'detected',
        rootCause: 'root cause',
        retryOutcome: 'none',
        failoverCount: 0,
        summary: 'c',
      },
    ];

    const filteredHeatmap = filterHeatmapRows(heatmapRows, {
      provider: 'mock-a',
      region: 'ap-southeast-1',
    });

    const filteredTimeline = filterFailoverTimeline(timelineRows, {
      provider: 'mock-a',
      region: 'eu-west-1',
      status: 'investigating',
    });

    expect(filteredHeatmap).toHaveLength(1);
    expect(filteredHeatmap[0]).toEqual(expect.objectContaining({ provider: 'mock-a', region: 'ap-southeast-1' }));
    expect(filteredTimeline).toHaveLength(1);
    expect(filteredTimeline[0]).toEqual(expect.objectContaining({ id: 'evt-b' }));
  });

  it('builds deterministic loading/error/empty states and fallback source behavior', () => {
    const loading = buildFailoverSectionViewState({
      loading: true,
      error: '',
      itemCount: 0,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });
    const error = buildFailoverSectionViewState({
      loading: false,
      error: 'boom',
      itemCount: 0,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });
    const empty = buildFailoverSectionViewState({
      loading: false,
      error: '',
      itemCount: 0,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });

    expect(loading).toEqual({ key: 'loading', message: 'loading', showRetry: false });
    expect(error).toEqual({ key: 'error', message: 'boom', showRetry: true });
    expect(empty).toEqual({ key: 'empty', message: 'empty', showRetry: false });

    expect(resolveFailoverInsightsDataSource({ mode: 'api', latestApiStatusCode: 404 })).toBe('fixture');
    expect(resolveFailoverInsightsDataSource({ mode: 'api', latestApiStatusCode: 501 })).toBe('fixture');
    expect(resolveFailoverInsightsDataSource({ mode: 'fixture_success' })).toBe('fixture');
    expect(resolveFailoverInsightsDataSource({ mode: 'api', latestApiStatusCode: 500 })).toBe('api');
  });

  it('increments retry counters deterministically', () => {
    expect(nextFailoverRetryAttempt(0)).toBe(1);
    expect(nextFailoverRetryAttempt(6)).toBe(7);
  });
});
