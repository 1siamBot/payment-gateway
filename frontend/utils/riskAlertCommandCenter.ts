export type RiskAlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export type RiskAlertStatus = 'new' | 'acknowledged' | 'snoozed' | 'suppressed';

export type RiskAlertCommandCenterMode =
  | 'api'
  | 'fixture_success'
  | 'fixture_loading'
  | 'fixture_empty'
  | 'fixture_error';

export type RiskAlertDataSource = 'api' | 'fixture';

export type RiskAlertRow = {
  id: string;
  title: string;
  summary: string;
  merchantId: string;
  provider: string;
  severity: RiskAlertSeverity;
  detectedAt: string;
  status: RiskAlertStatus;
  signalValue: number;
  snoozeUntil: string | null;
};

export type RiskAlertFilters = {
  severity: 'all' | RiskAlertSeverity;
  status: 'all' | RiskAlertStatus;
  provider: 'all' | string;
  search: string;
};

export type RiskAlertSuppressionAudit = {
  at: string;
  action: 'acknowledge' | 'snooze' | 'suppress';
  note: string;
  snoozeUntil: string | null;
};

export type RiskAlertSuppressionEntry = {
  status: RiskAlertStatus;
  note: string;
  updatedAt: string;
  snoozeUntil: string | null;
  audits: RiskAlertSuppressionAudit[];
};

export type RiskAlertSuppressionState = Record<string, RiskAlertSuppressionEntry>;

export type RiskAlertSuppressionAction =
  | { type: 'acknowledge'; alertId: string; note: string; at: string }
  | { type: 'snooze'; alertId: string; note: string; at: string; snoozeUntil: string }
  | { type: 'suppress'; alertId: string; note: string; at: string };

export type RiskAlertViewState = {
  key: 'loading' | 'error' | 'empty' | 'ready';
  message: string;
  showRetry: boolean;
};

const SEVERITY_WEIGHT: Record<RiskAlertSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function resolveRiskAlertDataSource(input: {
  mode: RiskAlertCommandCenterMode;
  latestApiStatusCode?: number;
}): RiskAlertDataSource {
  if (input.mode !== 'api') {
    return 'fixture';
  }
  if (input.latestApiStatusCode === 404 || input.latestApiStatusCode === 501) {
    return 'fixture';
  }
  return 'api';
}

export function sortRiskAlertsDeterministic(rows: RiskAlertRow[]): RiskAlertRow[] {
  return [...rows].sort((left, right) => {
    const bySeverity = SEVERITY_WEIGHT[right.severity] - SEVERITY_WEIGHT[left.severity];
    if (bySeverity !== 0) return bySeverity;

    const byDetectedAt = new Date(right.detectedAt).getTime() - new Date(left.detectedAt).getTime();
    if (byDetectedAt !== 0) return byDetectedAt;

    const byProvider = left.provider.localeCompare(right.provider);
    if (byProvider !== 0) return byProvider;

    return left.id.localeCompare(right.id);
  });
}

export function filterRiskAlerts(rows: RiskAlertRow[], filters: RiskAlertFilters): RiskAlertRow[] {
  const needle = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.severity !== 'all' && row.severity !== filters.severity) {
      return false;
    }
    if (filters.status !== 'all' && row.status !== filters.status) {
      return false;
    }
    if (filters.provider !== 'all' && row.provider !== filters.provider) {
      return false;
    }
    if (!needle) {
      return true;
    }
    const haystack = [row.id, row.title, row.summary, row.merchantId, row.provider].join(' ').toLowerCase();
    return haystack.includes(needle);
  });
}

export function applyRiskAlertSuppressionTransition(
  state: RiskAlertSuppressionState,
  action: RiskAlertSuppressionAction,
): RiskAlertSuppressionState {
  const existing = state[action.alertId] ?? defaultSuppressionEntry();
  const note = action.note.trim();

  if (action.type === 'acknowledge') {
    return {
      ...state,
      [action.alertId]: {
        status: 'acknowledged',
        note,
        updatedAt: action.at,
        snoozeUntil: null,
        audits: [
          ...existing.audits,
          {
            at: action.at,
            action: 'acknowledge',
            note,
            snoozeUntil: null,
          },
        ],
      },
    };
  }

  if (action.type === 'snooze') {
    return {
      ...state,
      [action.alertId]: {
        status: 'snoozed',
        note,
        updatedAt: action.at,
        snoozeUntil: action.snoozeUntil,
        audits: [
          ...existing.audits,
          {
            at: action.at,
            action: 'snooze',
            note,
            snoozeUntil: action.snoozeUntil,
          },
        ],
      },
    };
  }

  return {
    ...state,
    [action.alertId]: {
      status: 'suppressed',
      note,
      updatedAt: action.at,
      snoozeUntil: null,
      audits: [
        ...existing.audits,
        {
          at: action.at,
          action: 'suppress',
          note,
          snoozeUntil: null,
        },
      ],
    },
  };
}

export function applySuppressionStateToAlerts(
  alerts: RiskAlertRow[],
  suppressionState: RiskAlertSuppressionState,
): RiskAlertRow[] {
  return alerts.map((alert) => {
    const entry = suppressionState[alert.id];
    if (!entry) {
      return alert;
    }
    return {
      ...alert,
      status: entry.status,
      snoozeUntil: entry.snoozeUntil,
    };
  });
}

export function buildRiskAlertViewState(input: {
  loading: boolean;
  error: string;
  itemCount: number;
  loadingMessage: string;
  emptyMessage: string;
  readyMessage: string;
}): RiskAlertViewState {
  if (input.loading) {
    return { key: 'loading', message: input.loadingMessage, showRetry: false };
  }
  if (input.error) {
    return { key: 'error', message: input.error, showRetry: true };
  }
  if (input.itemCount === 0) {
    return { key: 'empty', message: input.emptyMessage, showRetry: false };
  }
  return { key: 'ready', message: input.readyMessage, showRetry: false };
}

export function nextRiskAlertRetryCount(current: number): number {
  return current + 1;
}

function defaultSuppressionEntry(): RiskAlertSuppressionEntry {
  return {
    status: 'new',
    note: '',
    updatedAt: '',
    snoozeUntil: null,
    audits: [],
  };
}
