export type ChargebackRiskLevel = 'critical' | 'high' | 'medium' | 'low';
export type ChargebackStatus = 'queued' | 'under_review' | 'evidence_required' | 'resolved';

export type SettlementChargebackRow = {
  id: string;
  reference: string;
  merchantId: string;
  amount: number;
  currency: string;
  risk: ChargebackRiskLevel;
  slaMinutes: number;
  status: ChargebackStatus;
  createdAt: string;
};

export type ChargebackFixtureScenario = 'default' | 'empty' | 'error';

export type ChargebackFilters = {
  risk: ChargebackRiskLevel | 'all';
  status: ChargebackStatus | 'all';
  merchantId: string;
};

export type ChargebackViewState = {
  tone: 'loading' | 'ready' | 'empty' | 'degraded' | 'error';
  message: string;
  hint: string;
};

export type ChargebackQueueCard = {
  key: 'critical' | 'high' | 'medium' | 'low' | 'urgent_sla';
  label: string;
  count: number;
};

const RISK_WEIGHT: Record<ChargebackRiskLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const FIXTURE_ROWS: SettlementChargebackRow[] = [
  {
    id: 'cb_1005',
    reference: 'stl_cb_1005',
    merchantId: 'merchant_delta',
    amount: 512.2,
    currency: 'USD',
    risk: 'high',
    slaMinutes: 50,
    status: 'queued',
    createdAt: '2026-03-19T13:40:00.000Z',
  },
  {
    id: 'cb_1002',
    reference: 'stl_cb_1002',
    merchantId: 'merchant_alpha',
    amount: 1200,
    currency: 'USD',
    risk: 'critical',
    slaMinutes: 24,
    status: 'under_review',
    createdAt: '2026-03-19T13:20:00.000Z',
  },
  {
    id: 'cb_1004',
    reference: 'stl_cb_1004',
    merchantId: 'merchant_bravo',
    amount: 83.5,
    currency: 'USD',
    risk: 'medium',
    slaMinutes: 180,
    status: 'evidence_required',
    createdAt: '2026-03-19T13:30:00.000Z',
  },
  {
    id: 'cb_1001',
    reference: 'stl_cb_1001',
    merchantId: 'merchant_alpha',
    amount: 421.1,
    currency: 'USD',
    risk: 'critical',
    slaMinutes: 75,
    status: 'queued',
    createdAt: '2026-03-19T12:50:00.000Z',
  },
  {
    id: 'cb_1003',
    reference: 'stl_cb_1003',
    merchantId: 'merchant_charlie',
    amount: 299.99,
    currency: 'USD',
    risk: 'high',
    slaMinutes: 360,
    status: 'resolved',
    createdAt: '2026-03-19T11:10:00.000Z',
  },
];

export function sortChargebackRows(rows: SettlementChargebackRow[]): SettlementChargebackRow[] {
  return [...rows].sort((left, right) => {
    const riskDelta = RISK_WEIGHT[right.risk] - RISK_WEIGHT[left.risk];
    if (riskDelta !== 0) {
      return riskDelta;
    }

    const leftCreated = Date.parse(left.createdAt);
    const rightCreated = Date.parse(right.createdAt);
    if (leftCreated !== rightCreated) {
      return rightCreated - leftCreated;
    }

    return left.reference.localeCompare(right.reference);
  });
}

export function filterChargebackRows(
  rows: SettlementChargebackRow[],
  filters: ChargebackFilters,
): SettlementChargebackRow[] {
  const merchantNeedle = filters.merchantId.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.risk !== 'all' && row.risk !== filters.risk) {
      return false;
    }
    if (filters.status !== 'all' && row.status !== filters.status) {
      return false;
    }
    if (merchantNeedle && !row.merchantId.toLowerCase().includes(merchantNeedle)) {
      return false;
    }
    return true;
  });
}

export function buildChargebackQueueCards(rows: SettlementChargebackRow[]): ChargebackQueueCard[] {
  const counts: Record<ChargebackRiskLevel, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  let urgentSla = 0;

  rows.forEach((row) => {
    counts[row.risk] += 1;
    if (row.slaMinutes <= 60 && row.status !== 'resolved') {
      urgentSla += 1;
    }
  });

  return [
    { key: 'critical', label: 'Critical', count: counts.critical },
    { key: 'high', label: 'High', count: counts.high },
    { key: 'medium', label: 'Medium', count: counts.medium },
    { key: 'low', label: 'Low', count: counts.low },
    { key: 'urgent_sla', label: 'Urgent SLA', count: urgentSla },
  ];
}

export function getSettlementChargebackFixture(
  scenario: ChargebackFixtureScenario,
): SettlementChargebackRow[] {
  if (scenario === 'error') {
    throw new Error('Fixture scenario failed: simulated monitor adapter outage.');
  }
  if (scenario === 'empty') {
    return [];
  }
  return FIXTURE_ROWS.map((row) => ({ ...row }));
}

export function buildChargebackViewState(input: {
  loading: boolean;
  rowsCount: number;
  fallbackActive: boolean;
  errorMessage?: string;
}): ChargebackViewState {
  if (input.loading) {
    return {
      tone: 'loading',
      message: 'Loading settlement chargeback monitor queue.',
      hint: 'Deterministic loading state keeps queue ordering stable while data refreshes.',
    };
  }

  if (input.errorMessage) {
    return {
      tone: 'error',
      message: 'Chargeback monitor failed to load.',
      hint: `Retry to recover monitor data. Last error: ${input.errorMessage}`,
    };
  }

  if (input.rowsCount === 0) {
    return {
      tone: 'empty',
      message: 'No settlement chargebacks match this filter set.',
      hint: 'Clear merchant/risk/status filters or switch to default fixture scenario.',
    };
  }

  if (input.fallbackActive) {
    return {
      tone: 'degraded',
      message: 'Backend unavailable. Showing deterministic fixture fallback queue.',
      hint: 'Use Retry to attempt live backend mode again.',
    };
  }

  return {
    tone: 'ready',
    message: 'Chargeback queue loaded.',
    hint: 'Default order is risk desc, then createdAt desc for deterministic operator triage.',
  };
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
