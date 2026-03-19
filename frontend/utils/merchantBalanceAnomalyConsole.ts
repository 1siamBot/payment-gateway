export type AnomalyMode = 'api' | 'fixture_success' | 'fixture_loading' | 'fixture_empty' | 'fixture_error';

export type AnomalyDataSource = 'api' | 'fixture';

export type AnomalySeverity = 'critical' | 'high' | 'medium' | 'low';

export type ReconciliationAction = 'acknowledge' | 'open_investigation' | 'mark_resolved';

export type AnomalyAlertRow = {
  id: string;
  merchantId: string;
  severity: AnomalySeverity;
  detectedAt: string;
  reason: string;
  deltaAmount: number;
  currency: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
};

export type ActionEntry = {
  status: 'queued' | 'acknowledged' | 'investigating' | 'resolved';
  note: string;
  updatedAt: string;
};

export type ActionQueueState = Record<string, ActionEntry>;

export type PanelViewState = {
  key: 'loading' | 'error' | 'empty' | 'ready';
  message: string;
  showRetry: boolean;
};

const SEVERITY_WEIGHT: Record<AnomalySeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function resolveAnomalyDataSource(input: {
  mode: AnomalyMode;
  latestApiStatusCode?: number;
}): AnomalyDataSource {
  if (input.mode !== 'api') {
    return 'fixture';
  }
  if (input.latestApiStatusCode === 404 || input.latestApiStatusCode === 501) {
    return 'fixture';
  }
  return 'api';
}

export function deriveSeverity(deltaAmount: number): AnomalySeverity {
  const magnitude = Math.abs(deltaAmount);
  if (magnitude >= 2000) return 'critical';
  if (magnitude >= 700) return 'high';
  if (magnitude >= 250) return 'medium';
  return 'low';
}

export function sortAnomalyAlertsDeterministic(rows: AnomalyAlertRow[]): AnomalyAlertRow[] {
  return [...rows].sort((left, right) => {
    const bySeverity = SEVERITY_WEIGHT[right.severity] - SEVERITY_WEIGHT[left.severity];
    if (bySeverity !== 0) {
      return bySeverity;
    }

    const byMerchant = left.merchantId.localeCompare(right.merchantId);
    if (byMerchant !== 0) {
      return byMerchant;
    }

    const byDetectedAt = new Date(right.detectedAt).getTime() - new Date(left.detectedAt).getTime();
    if (byDetectedAt !== 0) {
      return byDetectedAt;
    }

    return left.id.localeCompare(right.id);
  });
}

export function buildPanelViewState(input: {
  loading: boolean;
  error: string;
  itemCount: number;
  loadingMessage: string;
  emptyMessage: string;
  readyMessage: string;
}): PanelViewState {
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

export function validateReasonNote(action: ReconciliationAction, note: string): { valid: true } | { valid: false; message: string } {
  const trimmed = note.trim();
  if (trimmed.length > 280) {
    return { valid: false, message: 'Reason note must be 280 characters or fewer.' };
  }

  if (action === 'mark_resolved' && trimmed.length < 8) {
    return { valid: false, message: 'Reason note must be at least 8 characters to resolve.' };
  }

  if (action === 'open_investigation' && trimmed.length < 4) {
    return { valid: false, message: 'Reason note must be at least 4 characters to open investigation.' };
  }

  return { valid: true };
}

export function applyActionTransition(
  queue: ActionQueueState,
  input: { anomalyId: string; action: ReconciliationAction; note: string; at: string },
): ActionQueueState {
  const existing = queue[input.anomalyId] ?? {
    status: 'queued' as const,
    note: '',
    updatedAt: input.at,
  };

  const nextStatus = input.action === 'acknowledge'
    ? 'acknowledged'
    : input.action === 'open_investigation'
      ? 'investigating'
      : 'resolved';

  return {
    ...queue,
    [input.anomalyId]: {
      ...existing,
      status: nextStatus,
      note: input.note.trim(),
      updatedAt: input.at,
    },
  };
}

export function nextAnomalyRetryAttempt(current: number): number {
  return current + 1;
}
