export type PaymentStatus = 'CREATED' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type PaymentListItem = {
  reference: string;
  merchantId: string;
  status: PaymentStatus;
  type: string;
  amount: string;
  currency: string;
  providerName?: string | null;
  createdAt: string;
};

export type PaymentAudit = {
  id: string;
  eventType: string;
  actor?: string | null;
  createdAt?: string | null;
  metadata?: string | null;
};

export type PaymentDetail = {
  reference: string;
  merchantId: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt?: string;
  audits?: PaymentAudit[];
};

export type PaymentFilters = {
  status: 'ALL' | PaymentStatus;
  merchant: string;
  reference: string;
  dateFrom: string;
  dateTo: string;
};

export type TimelineStage = 'created' | 'authorized' | 'captured' | 'failed' | 'refunded';

export type TimelineEntry = {
  id: string;
  stage: TimelineStage;
  occurredAt: string;
  actor: string;
  note: string;
};

export type ViewState = {
  key: 'loading' | 'error' | 'empty' | 'ready';
  message: string;
  showRetry: boolean;
};

const STAGE_ORDER: Record<TimelineStage, number> = {
  created: 0,
  authorized: 1,
  captured: 2,
  failed: 3,
  refunded: 4,
};

const STATUS_TO_STAGE: Record<PaymentStatus, TimelineStage> = {
  CREATED: 'created',
  PENDING: 'authorized',
  PAID: 'captured',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export function sortPaymentsDeterministic(rows: PaymentListItem[]): PaymentListItem[] {
  return [...rows].sort((left, right) => {
    const timeDelta = Date.parse(right.createdAt) - Date.parse(left.createdAt);
    if (timeDelta !== 0) {
      return timeDelta;
    }
    return left.reference.localeCompare(right.reference);
  });
}

export function filterPayments(rows: PaymentListItem[], filters: PaymentFilters): PaymentListItem[] {
  const merchant = filters.merchant.trim().toLowerCase();
  const reference = filters.reference.trim().toLowerCase();
  const fromEpoch = filters.dateFrom ? Date.parse(`${filters.dateFrom}T00:00:00.000Z`) : null;
  const toEpoch = filters.dateTo ? Date.parse(`${filters.dateTo}T23:59:59.999Z`) : null;

  return rows.filter((row) => {
    if (filters.status !== 'ALL' && row.status !== filters.status) {
      return false;
    }
    if (merchant && !row.merchantId.toLowerCase().includes(merchant)) {
      return false;
    }
    if (reference && !row.reference.toLowerCase().includes(reference)) {
      return false;
    }
    const createdAtEpoch = Date.parse(row.createdAt);
    if (fromEpoch !== null && createdAtEpoch < fromEpoch) {
      return false;
    }
    if (toEpoch !== null && createdAtEpoch > toEpoch) {
      return false;
    }
    return true;
  });
}

export function buildListViewState(input: {
  loading: boolean;
  error: string;
  rows: PaymentListItem[];
}): ViewState {
  if (input.loading) {
    return {
      key: 'loading',
      message: 'Loading payments with deterministic sorting and filter replay...',
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
  if (input.rows.length === 0) {
    return {
      key: 'empty',
      message: 'No payments match the current filter set.',
      showRetry: false,
    };
  }
  return {
    key: 'ready',
    message: `${input.rows.length} payment(s) loaded.`,
    showRetry: false,
  };
}

export function buildDetailViewState(input: {
  loading: boolean;
  error: string;
  detail: PaymentDetail | null;
}): ViewState {
  if (input.loading) {
    return {
      key: 'loading',
      message: 'Loading payment detail and timeline...',
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
  if (!input.detail) {
    return {
      key: 'empty',
      message: 'Select a payment to view deterministic timeline detail.',
      showRetry: false,
    };
  }
  return {
    key: 'ready',
    message: `Detail loaded for ${input.detail.reference}.`,
    showRetry: false,
  };
}

export function buildPaymentTimeline(detail: PaymentDetail): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    {
      id: `${detail.reference}:created`,
      stage: 'created',
      occurredAt: detail.createdAt,
      actor: 'system',
      note: 'Payment intent created.',
    },
  ];

  for (const audit of detail.audits ?? []) {
    if (audit.eventType !== 'transaction.transition') {
      continue;
    }
    const metadata = parseMetadata(audit.metadata);
    const toStatusRaw = typeof metadata.toStatus === 'string' ? metadata.toStatus : '';
    const toStatus = toStatusRaw.toUpperCase() as PaymentStatus;
    const stage = STATUS_TO_STAGE[toStatus];
    if (!stage || stage === 'created') {
      continue;
    }
    const occurredAt = typeof metadata.occurredAt === 'string' && !Number.isNaN(Date.parse(metadata.occurredAt))
      ? metadata.occurredAt
      : audit.createdAt || detail.updatedAt || detail.createdAt;
    const actor = typeof metadata.actor === 'string' && metadata.actor.trim()
      ? metadata.actor
      : audit.actor || 'system';
    const note = typeof metadata.note === 'string' && metadata.note.trim()
      ? metadata.note
      : `Transitioned to ${toStatus}.`;

    entries.push({
      id: audit.id,
      stage,
      occurredAt,
      actor,
      note,
    });
  }

  const terminalStage = STATUS_TO_STAGE[detail.status];
  const hasTerminal = entries.some((entry) => entry.stage === terminalStage);
  if (terminalStage !== 'created' && !hasTerminal) {
    entries.push({
      id: `${detail.reference}:${terminalStage}`,
      stage: terminalStage,
      occurredAt: detail.updatedAt || detail.createdAt,
      actor: 'system',
      note: `Current payment status is ${detail.status}.`,
    });
  }

  return entries
    .sort((left, right) => {
      const timeDelta = Date.parse(left.occurredAt) - Date.parse(right.occurredAt);
      if (timeDelta !== 0) {
        return timeDelta;
      }
      const stageDelta = STAGE_ORDER[left.stage] - STAGE_ORDER[right.stage];
      if (stageDelta !== 0) {
        return stageDelta;
      }
      return left.id.localeCompare(right.id);
    })
    .filter((entry, index, all) => all.findIndex((candidate) => candidate.id === entry.id) === index);
}

function parseMetadata(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}
