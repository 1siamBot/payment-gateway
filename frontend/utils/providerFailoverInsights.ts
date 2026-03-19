export type FailoverInsightsDataMode = 'api' | 'fixture_success' | 'fixture_loading' | 'fixture_empty' | 'fixture_error';

export type FailoverInsightsDataSource = 'api' | 'fixture';

export type FailoverIncidentStatus = 'detected' | 'investigating' | 'mitigated';

export type RetryOutcomeMarker = 'retry_succeeded' | 'retry_failed' | 'retry_pending' | 'none';

export type HealthHeatmapRow = {
  provider: string;
  region: string;
  availabilityScore: number;
  circuitState: string;
  failoverEvents: number;
};

export type FailoverIncidentRow = {
  id: string;
  occurredAt: string;
  provider: string;
  region: string;
  status: FailoverIncidentStatus;
  rootCause: string;
  retryOutcome: RetryOutcomeMarker;
  failoverCount: number;
  summary: string;
};

export type FailoverFilterState = {
  provider: string;
  region: string;
  status: 'all' | FailoverIncidentStatus;
};

export type FailoverSectionViewState = {
  key: 'loading' | 'error' | 'empty' | 'ready';
  message: string;
  showRetry: boolean;
};

const ROOT_CAUSE_LABELS: Record<string, string> = {
  failover_after_error: 'Failover after provider error',
  policy_selected: 'Policy selected provider switch',
  legacy_fallback: 'Legacy fallback path used',
  unknown: 'Unknown root cause',
};

export function resolveFailoverInsightsDataSource(input: {
  mode: FailoverInsightsDataMode;
  latestApiStatusCode?: number;
}): FailoverInsightsDataSource {
  if (input.mode !== 'api') {
    return 'fixture';
  }
  if (input.latestApiStatusCode === 404 || input.latestApiStatusCode === 501) {
    return 'fixture';
  }
  return 'api';
}

export function sortHealthHeatmapDeterministic(rows: HealthHeatmapRow[]): HealthHeatmapRow[] {
  return [...rows].sort((left, right) => {
    const providerDelta = left.provider.localeCompare(right.provider);
    if (providerDelta !== 0) {
      return providerDelta;
    }
    const regionDelta = left.region.localeCompare(right.region);
    if (regionDelta !== 0) {
      return regionDelta;
    }
    const scoreDelta = right.availabilityScore - left.availabilityScore;
    if (scoreDelta !== 0) {
      return scoreDelta;
    }
    return left.circuitState.localeCompare(right.circuitState);
  });
}

export function sortFailoverTimelineDeterministic(rows: FailoverIncidentRow[]): FailoverIncidentRow[] {
  return [...rows].sort((left, right) => {
    const timeDelta = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
    if (timeDelta !== 0) {
      return timeDelta;
    }
    return left.id.localeCompare(right.id);
  });
}

export function filterHeatmapRows(rows: HealthHeatmapRow[], filters: Pick<FailoverFilterState, 'provider' | 'region'>): HealthHeatmapRow[] {
  return rows.filter((row) => {
    const providerMatch = filters.provider === 'all' || row.provider === filters.provider;
    const regionMatch = filters.region === 'all' || row.region === filters.region;
    return providerMatch && regionMatch;
  });
}

export function filterFailoverTimeline(rows: FailoverIncidentRow[], filters: FailoverFilterState): FailoverIncidentRow[] {
  return rows.filter((row) => {
    const providerMatch = filters.provider === 'all' || row.provider === filters.provider;
    const regionMatch = filters.region === 'all' || row.region === filters.region;
    const statusMatch = filters.status === 'all' || row.status === filters.status;
    return providerMatch && regionMatch && statusMatch;
  });
}

export function buildFailoverSectionViewState(input: {
  loading: boolean;
  error: string;
  itemCount: number;
  loadingMessage: string;
  emptyMessage: string;
  readyMessage: string;
}): FailoverSectionViewState {
  if (input.loading) {
    return {
      key: 'loading',
      message: input.loadingMessage,
      showRetry: false,
    };
  }
  if (input.error) {
    return {
      key: 'error',
      message: input.error,
      showRetry: true,
    };
  }
  if (input.itemCount === 0) {
    return {
      key: 'empty',
      message: input.emptyMessage,
      showRetry: false,
    };
  }
  return {
    key: 'ready',
    message: input.readyMessage,
    showRetry: false,
  };
}

export function nextFailoverRetryAttempt(current: number): number {
  return current + 1;
}

export function describeRootCause(reasonCode: string): string {
  const key = reasonCode?.trim().toLowerCase() || 'unknown';
  return ROOT_CAUSE_LABELS[key] ?? reasonCode.replaceAll('_', ' ');
}

export function retryOutcomeLabel(marker: RetryOutcomeMarker): string {
  if (marker === 'retry_succeeded') return 'Retry Succeeded';
  if (marker === 'retry_failed') return 'Retry Failed';
  if (marker === 'retry_pending') return 'Retry Pending';
  return 'No Retry';
}
