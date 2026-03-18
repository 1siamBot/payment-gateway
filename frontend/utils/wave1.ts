export type RefundableStatus = 'CREATED' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export function canRefundStatus(status: RefundableStatus): boolean {
  return status === 'PAID';
}

export function applyRefundStatus<T extends { reference: string; status: RefundableStatus }>(
  rows: T[],
  reference: string,
): T[] {
  return rows.map((row) => {
    if (row.reference !== reference) {
      return row;
    }
    return {
      ...row,
      status: 'REFUNDED',
    };
  });
}

export type SettlementMerchantSummary = {
  merchantId: string;
  paidDepositAmount: number;
  paidWithdrawAmount: number;
  refundedAmount: number;
  netSettledAmount: number;
  transactionCount: number;
};

export function filterSettlementMerchants(
  merchants: SettlementMerchantSummary[],
  merchantId?: string,
): SettlementMerchantSummary[] {
  const normalized = merchantId?.trim();
  if (!normalized) {
    return merchants;
  }
  return merchants.filter((row) => row.merchantId === normalized);
}

export type ExceptionStatus = 'open' | 'investigating' | 'resolved' | 'ignored';
export type ExceptionAction = 'resolve' | 'ignore';
export type ExceptionActionErrorKind = 'version_conflict' | 'permission' | 'transient' | 'unknown';
export type ExceptionPresetKey = 'open' | 'investigating' | 'resolved' | 'ignored' | 'high_risk_merchant';

export type SettlementExceptionRow = {
  id: string;
  merchantId: string;
  provider: string;
  status: ExceptionStatus;
  updatedAt: string;
};

export type SettlementExceptionAuditEntry = {
  id: string;
  action: ExceptionAction;
  reason: string;
  note: string | null;
  actor: string;
  createdAt: string;
};

export function normalizeOptional(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export type ExceptionRiskBucket = 'high' | 'medium' | 'low';

export type ExceptionBulkPreview = {
  selectedCount: number;
  validCount: number;
  malformedCount: number;
  isEmpty: boolean;
  statusCounts: Record<ExceptionStatus, number>;
  riskCounts: Record<ExceptionRiskBucket, number>;
  warnings: string[];
  emptyMessage: string;
  malformedMessage: string | null;
  recoveryHint: string;
  csvPreview: string;
  jsonPreview: string;
};

export type ExceptionBulkConfirmation = {
  action: ExceptionAction;
  selectedCount: number;
  validCount: number;
  malformedCount: number;
  staleSelectionCount: number;
  statusCounts: Record<ExceptionStatus, number>;
  riskCounts: Record<ExceptionRiskBucket, number>;
  hasFallback: boolean;
  fallbackTitle: string;
  fallbackMessage: string;
  needsRollbackHint: boolean;
  rollbackHint: string;
  canConfirm: boolean;
};

export type ExceptionDiffField = 'amount' | 'status' | 'updatedAt' | 'version';
export type ExceptionConflictReason = 'stale_version' | 'malformed' | 'high_delta' | 'mixed_status';
export type ExceptionConflictDrilldownKey = 'all' | ExceptionConflictReason;

export type ExceptionDiffDelta = {
  field: ExceptionDiffField;
  current: string | number;
  incoming: string | number;
  changed: boolean;
};

export type ExceptionDiffInspectorRow = {
  id: string;
  merchantId: string;
  provider: string;
  deltas: ExceptionDiffDelta[];
  reasons: ExceptionConflictReason[];
};

export type ExceptionBulkDiffInspector = {
  rows: ExceptionDiffInspectorRow[];
  reasonCounts: Record<ExceptionConflictReason, number>;
};

type ExceptionBulkPreviewRow = {
  id: string;
  merchantId: string;
  provider: string;
  status: ExceptionStatus;
  mismatchCount: number;
  version: number;
  updatedAt: string;
  amount: number;
  incomingAmount: number;
  incomingStatus: ExceptionStatus;
  incomingUpdatedAt: string;
  incomingVersion: number;
};

const DIFF_FIELD_ORDER: ExceptionDiffField[] = ['amount', 'status', 'updatedAt', 'version'];
const CONFLICT_REASON_ORDER: ExceptionConflictReason[] = ['stale_version', 'malformed', 'high_delta', 'mixed_status'];
const DIFF_FALLBACK_TIMESTAMP = '2026-03-18T00:00:00.000Z';

function parseFiniteNumber(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return input;
  }
  if (typeof input === 'string' && input.trim().length > 0) {
    const parsed = Number(input);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function resolveDateString(input: unknown, fallback: string): string {
  if (typeof input !== 'string' || input.trim().length === 0) {
    return fallback;
  }
  const parsed = new Date(input);
  if (!Number.isFinite(parsed.getTime())) {
    return fallback;
  }
  return parsed.toISOString();
}

function resolveIncomingStatus(status: ExceptionStatus, mismatchCount: number): ExceptionStatus {
  if (status === 'open') {
    return mismatchCount > 0 ? 'investigating' : 'open';
  }
  if (status === 'investigating') {
    return mismatchCount > 0 ? 'investigating' : 'resolved';
  }
  return status;
}

function parseExceptionBulkPreviewRow(raw: unknown): ExceptionBulkPreviewRow | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const id = normalizeOptional(typeof row.id === 'string' ? row.id : String(row.id ?? ''));
  const merchantId = normalizeOptional(typeof row.merchantId === 'string' ? row.merchantId : String(row.merchantId ?? ''));
  const provider = normalizeOptional(typeof row.provider === 'string' ? row.provider : String(row.provider ?? ''));
  const status = normalizeExceptionStatus(row.status);
  const mismatchCount = Number(row.mismatchCount);
  const summary = (row.summary && typeof row.summary === 'object')
    ? row.summary as Record<string, unknown>
    : null;
  const versionRaw = parseFiniteNumber(row.version ?? row.currentVersion);
  const version = versionRaw !== null ? Math.max(1, Math.trunc(versionRaw)) : 1;
  const updatedAt = resolveDateString(row.updatedAt, DIFF_FALLBACK_TIMESTAMP);
  const amountRaw = parseFiniteNumber(row.currentAmount ?? row.amount ?? row.ledgerAmount ?? summary?.ledgerAmount);
  const amount = amountRaw !== null ? amountRaw : (100 + (mismatchCount * 50));
  const incomingAmountRaw = parseFiniteNumber(
    row.incomingAmount ?? row.providerAmount ?? summary?.providerAmount ?? row.nextAmount,
  );
  const incomingAmount = incomingAmountRaw !== null
    ? incomingAmountRaw
    : amount + (mismatchCount * 35);
  const incomingStatusRaw = typeof row.incomingStatus === 'string'
    ? normalizeExceptionStatus(row.incomingStatus)
    : resolveIncomingStatus(status, Math.max(0, mismatchCount));
  const incomingVersionRaw = parseFiniteNumber(row.incomingVersion ?? row.nextVersion);
  const incomingVersion = incomingVersionRaw !== null
    ? Math.max(1, Math.trunc(incomingVersionRaw))
    : (mismatchCount >= 3 ? Math.max(1, version - 1) : version);
  const incomingUpdatedAt = resolveDateString(
    row.incomingUpdatedAt ?? row.nextUpdatedAt,
    incomingVersion < version ? '2026-03-17T23:59:00.000Z' : updatedAt,
  );

  if (!id || !merchantId || !provider) {
    return null;
  }
  if (!Number.isFinite(mismatchCount) || mismatchCount < 0) {
    return null;
  }

  return {
    id,
    merchantId,
    provider,
    status,
    mismatchCount,
    version,
    updatedAt,
    amount,
    incomingAmount,
    incomingStatus: incomingStatusRaw,
    incomingUpdatedAt,
    incomingVersion,
  };
}

function resolveExceptionRiskBucket(row: { mismatchCount: number; status: ExceptionStatus }): ExceptionRiskBucket {
  if (row.status === 'open' && row.mismatchCount >= 3) {
    return 'high';
  }
  if (row.status === 'investigating' || row.mismatchCount >= 1) {
    return 'medium';
  }
  return 'low';
}

export function buildExceptionBulkPreview(selectedRows: unknown[]): ExceptionBulkPreview {
  const statusCounts: Record<ExceptionStatus, number> = {
    open: 0,
    investigating: 0,
    resolved: 0,
    ignored: 0,
  };
  const riskCounts: Record<ExceptionRiskBucket, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };
  const normalizedRows = selectedRows
    .map((row) => parseExceptionBulkPreviewRow(row))
    .filter((row): row is ExceptionBulkPreviewRow => Boolean(row))
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const row of normalizedRows) {
    statusCounts[row.status] += 1;
    riskCounts[resolveExceptionRiskBucket(row)] += 1;
  }

  const malformedCount = selectedRows.length - normalizedRows.length;
  const warnings: string[] = [];
  if (malformedCount > 0) {
    warnings.push(`Malformed selection rows detected: ${malformedCount}.`);
  }
  if (selectedRows.length === 0) {
    warnings.push('No exception rows selected.');
  }

  const csvRows = [
    ['metric', 'value'],
    ['selected_total', String(selectedRows.length)],
    ['valid_rows', String(normalizedRows.length)],
    ['malformed_rows', String(malformedCount)],
    ['status_open', String(statusCounts.open)],
    ['status_investigating', String(statusCounts.investigating)],
    ['status_resolved', String(statusCounts.resolved)],
    ['status_ignored', String(statusCounts.ignored)],
    ['risk_high', String(riskCounts.high)],
    ['risk_medium', String(riskCounts.medium)],
    ['risk_low', String(riskCounts.low)],
  ];
  if (malformedCount > 0) {
    csvRows.push(['warning', 'malformed_rows_present']);
  }

  const csvPreview = csvRows.map((row) => row.join(',')).join('\n');
  const jsonPreview = JSON.stringify({
    selectedTotal: selectedRows.length,
    validRows: normalizedRows.length,
    malformedRows: malformedCount,
    statusCounts,
    riskCounts,
    warnings,
  }, null, 2);

  return {
    selectedCount: selectedRows.length,
    validCount: normalizedRows.length,
    malformedCount,
    isEmpty: selectedRows.length === 0,
    statusCounts,
    riskCounts,
    warnings,
    emptyMessage: 'No rows selected. Select at least one exception to preview bulk actions safely.',
    malformedMessage: malformedCount > 0
      ? `${malformedCount} malformed row(s) are excluded from preview/export until corrected.`
      : null,
    recoveryHint: 'Clear invalid rows or refresh fixture data before confirming bulk action.',
    csvPreview,
    jsonPreview,
  };
}

export function buildExceptionBulkConfirmation(input: {
  action: ExceptionAction;
  preview: ExceptionBulkPreview;
  staleSelectionCount: number;
}): ExceptionBulkConfirmation {
  const staleSelectionCount = Number.isFinite(input.staleSelectionCount)
    ? Math.max(0, Math.trunc(input.staleSelectionCount))
    : 0;
  const hasNoSelection = input.preview.isEmpty;
  const hasMalformedRows = input.preview.malformedCount > 0;
  const hasMixedConflictRisk = input.preview.riskCounts.high > 0
    && (input.preview.riskCounts.medium > 0 || input.preview.riskCounts.low > 0);
  const needsRollbackHint = hasMalformedRows || hasMixedConflictRisk;

  let fallbackTitle = '';
  let fallbackMessage = '';
  if (staleSelectionCount > 0) {
    fallbackTitle = 'Stale selection detected';
    fallbackMessage = `${staleSelectionCount} selected row(s) are no longer in the current fixture scope. Use safe reset before confirming.`;
  } else if (hasNoSelection) {
    fallbackTitle = 'No rows selected';
    fallbackMessage = `${input.preview.emptyMessage} Use safe reset to clear selection state and reselect rows.`;
  } else if (hasMalformedRows) {
    fallbackTitle = 'Malformed rows detected';
    fallbackMessage = `${input.preview.malformedMessage ?? 'Malformed rows are present.'} Use safe reset and reselect only valid rows.`;
  }

  const rollbackHint = hasMalformedRows
    ? 'Rollback hint: malformed rows are excluded. Clear malformed selections and re-run preview before submit.'
    : (hasMixedConflictRisk
      ? 'Rollback hint: mixed high-risk and non-high-risk rows detected. Split actions by risk bucket to keep rollback deterministic.'
      : 'Rollback hint: selection is deterministic and safe for fixture confirmation.');

  const canConfirm = fallbackMessage.length === 0
    && input.preview.validCount > 0;

  return {
    action: input.action,
    selectedCount: input.preview.selectedCount,
    validCount: input.preview.validCount,
    malformedCount: input.preview.malformedCount,
    staleSelectionCount,
    statusCounts: { ...input.preview.statusCounts },
    riskCounts: { ...input.preview.riskCounts },
    hasFallback: fallbackMessage.length > 0,
    fallbackTitle,
    fallbackMessage,
    needsRollbackHint,
    rollbackHint,
    canConfirm,
  };
}

function normalizeReasons(reasons: ExceptionConflictReason[]): ExceptionConflictReason[] {
  const reasonSet = new Set<ExceptionConflictReason>(reasons);
  return CONFLICT_REASON_ORDER.filter((reason) => reasonSet.has(reason));
}

export function buildExceptionBulkDiffInspector(selectedRows: unknown[]): ExceptionBulkDiffInspector {
  const reasonCounts: Record<ExceptionConflictReason, number> = {
    stale_version: 0,
    malformed: 0,
    high_delta: 0,
    mixed_status: 0,
  };

  const rows = selectedRows.map((raw, index) => {
    const parsed = parseExceptionBulkPreviewRow(raw);
    if (!parsed) {
      const reasons = normalizeReasons(['malformed']);
      return {
        sortKey: `~malformed-${String(index + 1).padStart(4, '0')}`,
        originalIndex: index,
        row: {
          id: `malformed-${index + 1}`,
          merchantId: '-',
          provider: '-',
          deltas: DIFF_FIELD_ORDER.map((field) => ({
            field,
            current: 'n/a',
            incoming: 'n/a',
            changed: false,
          })),
          reasons,
        } satisfies ExceptionDiffInspectorRow,
      };
    }

    const deltas: ExceptionDiffDelta[] = [
      { field: 'amount', current: parsed.amount, incoming: parsed.incomingAmount, changed: parsed.amount !== parsed.incomingAmount },
      { field: 'status', current: parsed.status, incoming: parsed.incomingStatus, changed: parsed.status !== parsed.incomingStatus },
      { field: 'updatedAt', current: parsed.updatedAt, incoming: parsed.incomingUpdatedAt, changed: parsed.updatedAt !== parsed.incomingUpdatedAt },
      { field: 'version', current: parsed.version, incoming: parsed.incomingVersion, changed: parsed.version !== parsed.incomingVersion },
    ];

    const reasons: ExceptionConflictReason[] = [];
    if (parsed.incomingVersion < parsed.version) {
      reasons.push('stale_version');
    }
    if (Math.abs(parsed.incomingAmount - parsed.amount) >= 100) {
      reasons.push('high_delta');
    }
    if (parsed.incomingStatus !== parsed.status) {
      reasons.push('mixed_status');
    }

    return {
      sortKey: parsed.id,
      originalIndex: index,
      row: {
        id: parsed.id,
        merchantId: parsed.merchantId,
        provider: parsed.provider,
        deltas,
        reasons: normalizeReasons(reasons),
      } satisfies ExceptionDiffInspectorRow,
    };
  }).sort((a, b) => a.sortKey.localeCompare(b.sortKey) || (a.originalIndex - b.originalIndex));

  for (const item of rows) {
    for (const reason of item.row.reasons) {
      reasonCounts[reason] += 1;
    }
  }

  return {
    rows: rows.map((item) => item.row),
    reasonCounts,
  };
}

export function filterExceptionDiffInspectorRows(
  rows: ExceptionDiffInspectorRow[],
  drilldown: ExceptionConflictDrilldownKey,
): ExceptionDiffInspectorRow[] {
  if (drilldown === 'all') {
    return rows;
  }
  return rows.filter((row) => row.reasons.includes(drilldown));
}

export function resolveExceptionDiffInspectorEmptyState(input: {
  activeReason: ExceptionConflictDrilldownKey;
  totalRows: number;
  filteredRows: number;
}): { title: string; message: string } | null {
  if (input.totalRows === 0) {
    return {
      title: 'No diff rows selected',
      message: 'Select exception rows first, then use safe reset to recover quickly if selection becomes stale.',
    };
  }
  if (input.filteredRows === 0 && input.activeReason !== 'all') {
    return {
      title: 'No rows in this drilldown',
      message: `No rows match "${input.activeReason}". Switch drilldown or use safe reset to return to confirmation state.`,
    };
  }
  return null;
}

export type ExceptionQueryState = {
  merchantId: string;
  provider: string;
  status: '' | ExceptionStatus;
  startDate: string;
  endDate: string;
  page: number;
  pageSize: number;
  preset: '' | ExceptionPresetKey;
};

export type ExceptionQueryPreset = {
  key: ExceptionPresetKey;
  label: string;
  filters: Pick<ExceptionQueryState, 'merchantId' | 'provider' | 'status' | 'startDate' | 'endDate'>;
};

export const DEFAULT_EXCEPTION_QUERY_STATE: ExceptionQueryState = {
  merchantId: '',
  provider: '',
  status: 'open',
  startDate: '',
  endDate: '',
  page: 1,
  pageSize: 10,
  preset: 'open',
};

const EXCEPTION_QUERY_PRESETS: ExceptionQueryPreset[] = [
  {
    key: 'open',
    label: 'Open',
    filters: { merchantId: '', provider: '', status: 'open', startDate: '', endDate: '' },
  },
  {
    key: 'investigating',
    label: 'Investigating',
    filters: { merchantId: '', provider: '', status: 'investigating', startDate: '', endDate: '' },
  },
  {
    key: 'resolved',
    label: 'Resolved',
    filters: { merchantId: '', provider: '', status: 'resolved', startDate: '', endDate: '' },
  },
  {
    key: 'ignored',
    label: 'Ignored',
    filters: { merchantId: '', provider: '', status: 'ignored', startDate: '', endDate: '' },
  },
  {
    key: 'high_risk_merchant',
    label: 'High-Risk Merchant',
    filters: { merchantId: 'merchant-high-risk', provider: '', status: 'open', startDate: '', endDate: '' },
  },
];

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function firstQueryValue(input: unknown): string | undefined {
  if (Array.isArray(input)) {
    const hit = input.find((value) => typeof value === 'string');
    return typeof hit === 'string' ? hit : undefined;
  }
  return typeof input === 'string' ? input : undefined;
}

function isValidDateOnly(input: string): boolean {
  if (!DATE_ONLY_RE.test(input)) {
    return false;
  }
  const date = new Date(`${input}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === input;
}

function parsePositiveInt(input: string | undefined): number | null {
  if (!input) {
    return null;
  }
  if (!/^\d+$/.test(input)) {
    return null;
  }
  const value = Number(input);
  return Number.isFinite(value) ? value : null;
}

function isExceptionPresetKey(input: string): input is ExceptionPresetKey {
  return EXCEPTION_QUERY_PRESETS.some((preset) => preset.key === input);
}

function resolvePreset(key: ExceptionPresetKey): ExceptionQueryPreset {
  return EXCEPTION_QUERY_PRESETS.find((preset) => preset.key === key) ?? EXCEPTION_QUERY_PRESETS[0];
}

export function listExceptionQueryPresets(): ExceptionQueryPreset[] {
  return EXCEPTION_QUERY_PRESETS;
}

export function applyExceptionQueryPreset(state: ExceptionQueryState, key: ExceptionPresetKey): ExceptionQueryState {
  const preset = resolvePreset(key);
  return {
    ...DEFAULT_EXCEPTION_QUERY_STATE,
    pageSize: state.pageSize,
    ...preset.filters,
    page: 1,
    preset: preset.key,
  };
}

export function resolveActiveExceptionPreset(state: ExceptionQueryState): '' | ExceptionPresetKey {
  for (const preset of EXCEPTION_QUERY_PRESETS) {
    if (
      state.merchantId.trim() === preset.filters.merchantId
      && state.provider.trim() === preset.filters.provider
      && state.status === preset.filters.status
      && state.startDate === preset.filters.startDate
      && state.endDate === preset.filters.endDate
    ) {
      return preset.key;
    }
  }
  return '';
}

export function serializeExceptionQueryState(state: ExceptionQueryState): Record<string, string> {
  const query: Record<string, string> = {};
  const merchantId = state.merchantId.trim();
  const provider = state.provider.trim();
  const activePreset = resolveActiveExceptionPreset(state);
  if (merchantId) query.exceptionMerchant = merchantId;
  if (provider) query.exceptionProvider = provider;
  if (state.status) query.exceptionStatus = state.status;
  if (state.startDate) query.exceptionStartDate = state.startDate;
  if (state.endDate) query.exceptionEndDate = state.endDate;
  if (state.page > 1) query.exceptionPage = String(state.page);
  if (state.pageSize !== DEFAULT_EXCEPTION_QUERY_STATE.pageSize) query.exceptionPageSize = String(state.pageSize);
  if (activePreset) query.exceptionPreset = activePreset;
  return query;
}

export type ExceptionQueryParseResult = {
  state: ExceptionQueryState;
  recoveryReasons: string[];
};

export function parseExceptionQueryState(
  query: Record<string, unknown>,
  now = new Date(),
): ExceptionQueryParseResult {
  const recoveryReasons: string[] = [];
  const presetRaw = firstQueryValue(query.exceptionPreset)?.trim() ?? '';
  const hasPreset = Boolean(presetRaw);
  const state = hasPreset && isExceptionPresetKey(presetRaw)
    ? applyExceptionQueryPreset(DEFAULT_EXCEPTION_QUERY_STATE, presetRaw)
    : { ...DEFAULT_EXCEPTION_QUERY_STATE };

  if (hasPreset && !isExceptionPresetKey(presetRaw)) {
    recoveryReasons.push(`Unknown preset "${presetRaw}".`);
  }

  const merchant = normalizeOptional(firstQueryValue(query.exceptionMerchant));
  if (merchant) state.merchantId = merchant;

  const provider = normalizeOptional(firstQueryValue(query.exceptionProvider));
  if (provider) state.provider = provider;

  const statusRaw = normalizeOptional(firstQueryValue(query.exceptionStatus));
  if (statusRaw) {
    if (statusRaw === 'open' || statusRaw === 'investigating' || statusRaw === 'resolved' || statusRaw === 'ignored') {
      state.status = statusRaw;
    } else {
      recoveryReasons.push(`Unknown status "${statusRaw}".`);
    }
  }

  const startDate = normalizeOptional(firstQueryValue(query.exceptionStartDate));
  if (startDate) {
    if (isValidDateOnly(startDate)) {
      state.startDate = startDate;
    } else {
      recoveryReasons.push(`Invalid start date "${startDate}".`);
    }
  }

  const endDate = normalizeOptional(firstQueryValue(query.exceptionEndDate));
  if (endDate) {
    if (isValidDateOnly(endDate)) {
      state.endDate = endDate;
    } else {
      recoveryReasons.push(`Invalid end date "${endDate}".`);
    }
  }

  if (state.startDate && state.endDate && state.startDate > state.endDate) {
    recoveryReasons.push('Start date is after end date.');
  }

  if (state.endDate) {
    const end = new Date(`${state.endDate}T23:59:59.000Z`);
    const ageMs = now.getTime() - end.getTime();
    const maxAgeMs = 90 * 24 * 60 * 60 * 1000;
    if (ageMs > maxAgeMs) {
      recoveryReasons.push(`Query window expired for end date "${state.endDate}".`);
    }
  }

  const pageRaw = firstQueryValue(query.exceptionPage);
  if (pageRaw) {
    const parsed = parsePositiveInt(pageRaw);
    if (parsed && parsed >= 1) {
      state.page = parsed;
    } else {
      recoveryReasons.push(`Invalid page "${pageRaw}".`);
    }
  }

  const pageSizeRaw = firstQueryValue(query.exceptionPageSize);
  if (pageSizeRaw) {
    const parsed = parsePositiveInt(pageSizeRaw);
    if (parsed && parsed >= 1 && parsed <= 100) {
      state.pageSize = parsed;
    } else {
      recoveryReasons.push(`Invalid page size "${pageSizeRaw}".`);
    }
  }

  state.preset = resolveActiveExceptionPreset(state);
  if (recoveryReasons.length > 0) {
    return {
      state: { ...DEFAULT_EXCEPTION_QUERY_STATE },
      recoveryReasons,
    };
  }

  return { state, recoveryReasons };
}

export const EXCEPTION_SAVED_VIEW_SCHEMA_VERSION = 1;
export const EXCEPTION_SAVED_VIEW_QUERY_KEY = 'exceptionSavedViews';
export const EXCEPTION_SAVED_VIEW_STORAGE_KEY = 'pg.exceptionSavedViews.v1';

export type ExceptionSavedViewQuery = Pick<
  ExceptionQueryState,
  'merchantId' | 'provider' | 'status' | 'startDate' | 'endDate' | 'pageSize'
>;

export type ExceptionSavedView = {
  id: string;
  name: string;
  pinned: boolean;
  query: ExceptionSavedViewQuery;
  createdAt: string;
  updatedAt: string;
};

export type ExceptionSavedViewState = {
  version: typeof EXCEPTION_SAVED_VIEW_SCHEMA_VERSION;
  activeViewId: string;
  views: ExceptionSavedView[];
};

export type ExceptionSavedViewRestoreResult = {
  state: ExceptionSavedViewState;
  source: 'query' | 'storage' | 'default';
  recoveryReasons: string[];
};

export const DEFAULT_EXCEPTION_SAVED_VIEW_STATE: ExceptionSavedViewState = {
  version: EXCEPTION_SAVED_VIEW_SCHEMA_VERSION,
  activeViewId: '',
  views: [],
};

function normalizeSavedViewName(input: string, fallbackIndex: number): string {
  const normalized = input.trim().replace(/\s+/g, ' ');
  if (normalized) {
    return normalized.slice(0, 64);
  }
  return `Saved View ${fallbackIndex}`;
}

function normalizeSavedViewQuery(input: Partial<ExceptionSavedViewQuery>): ExceptionSavedViewQuery {
  const status = input.status === 'open'
    || input.status === 'investigating'
    || input.status === 'resolved'
    || input.status === 'ignored'
    ? input.status
    : '';
  const startDate = typeof input.startDate === 'string' && isValidDateOnly(input.startDate) ? input.startDate : '';
  const endDate = typeof input.endDate === 'string' && isValidDateOnly(input.endDate) ? input.endDate : '';
  const pageSize = Number(input.pageSize);
  return {
    merchantId: normalizeOptional(input.merchantId) ?? '',
    provider: normalizeOptional(input.provider) ?? '',
    status,
    startDate,
    endDate,
    pageSize: Number.isFinite(pageSize) && pageSize >= 1 && pageSize <= 100 ? pageSize : DEFAULT_EXCEPTION_QUERY_STATE.pageSize,
  };
}

function sortSavedViews(views: ExceptionSavedView[]): ExceptionSavedView[] {
  return [...views].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }
    if (left.updatedAt !== right.updatedAt) {
      return right.updatedAt.localeCompare(left.updatedAt);
    }
    return left.id.localeCompare(right.id);
  });
}

function normalizeSavedViewState(raw: ExceptionSavedViewState): ExceptionSavedViewState {
  const views = sortSavedViews(raw.views.map((view) => ({
    ...view,
    query: normalizeSavedViewQuery(view.query),
    name: normalizeSavedViewName(view.name, 1),
  })));
  const pinnedViewId = views.find((view) => view.pinned)?.id ?? '';
  const activeViewId = views.some((view) => view.id === raw.activeViewId)
    ? raw.activeViewId
    : (pinnedViewId || views[0]?.id || '');
  return {
    version: EXCEPTION_SAVED_VIEW_SCHEMA_VERSION,
    activeViewId,
    views: views.map((view) => ({
      ...view,
      pinned: pinnedViewId ? view.id === pinnedViewId : false,
    })),
  };
}

export function createExceptionSavedView(
  state: ExceptionSavedViewState,
  input: {
    name: string;
    query: Partial<ExceptionSavedViewQuery>;
    nowIso?: string;
  },
): ExceptionSavedViewState {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const query = normalizeSavedViewQuery(input.query);
  const name = normalizeSavedViewName(input.name, state.views.length + 1);
  const id = `sv-${hashFNV1a(JSON.stringify({ name, query, nowIso }))}`;
  const views = sortSavedViews([
    ...state.views,
    {
      id,
      name,
      pinned: state.views.length === 0,
      query,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ]);
  return normalizeSavedViewState({
    version: EXCEPTION_SAVED_VIEW_SCHEMA_VERSION,
    activeViewId: id,
    views,
  });
}

export function renameExceptionSavedView(
  state: ExceptionSavedViewState,
  input: { viewId: string; name: string; nowIso?: string },
): ExceptionSavedViewState {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const target = state.views.find((view) => view.id === input.viewId);
  if (!target) {
    return state;
  }
  const name = normalizeSavedViewName(input.name, 1);
  if (name === target.name) {
    return state;
  }
  const views = sortSavedViews(state.views.map((view) => (
    view.id === input.viewId
      ? { ...view, name, updatedAt: nowIso }
      : view
  )));
  return normalizeSavedViewState({
    version: EXCEPTION_SAVED_VIEW_SCHEMA_VERSION,
    activeViewId: state.activeViewId,
    views,
  });
}

export function deleteExceptionSavedView(
  state: ExceptionSavedViewState,
  viewId: string,
): ExceptionSavedViewState {
  const views = state.views.filter((view) => view.id !== viewId);
  return normalizeSavedViewState({
    version: EXCEPTION_SAVED_VIEW_SCHEMA_VERSION,
    activeViewId: state.activeViewId === viewId ? '' : state.activeViewId,
    views,
  });
}

export function pinExceptionSavedView(
  state: ExceptionSavedViewState,
  input: { viewId: string; nowIso?: string },
): ExceptionSavedViewState {
  const nowIso = input.nowIso ?? new Date().toISOString();
  if (!state.views.some((view) => view.id === input.viewId)) {
    return state;
  }
  const views = sortSavedViews(state.views.map((view) => ({
    ...view,
    pinned: view.id === input.viewId,
    updatedAt: view.id === input.viewId ? nowIso : view.updatedAt,
  })));
  return normalizeSavedViewState({
    version: EXCEPTION_SAVED_VIEW_SCHEMA_VERSION,
    activeViewId: input.viewId,
    views,
  });
}

export function activateExceptionSavedView(
  state: ExceptionSavedViewState,
  viewId: string,
): ExceptionSavedViewState {
  if (!state.views.some((view) => view.id === viewId)) {
    return state;
  }
  return normalizeSavedViewState({
    version: EXCEPTION_SAVED_VIEW_SCHEMA_VERSION,
    activeViewId: viewId,
    views: state.views,
  });
}

export function buildExceptionQueryFromSavedView(
  state: ExceptionSavedViewState,
  viewId: string,
): ExceptionQueryState | null {
  const view = state.views.find((candidate) => candidate.id === viewId);
  if (!view) {
    return null;
  }
  const next: ExceptionQueryState = {
    ...DEFAULT_EXCEPTION_QUERY_STATE,
    ...normalizeSavedViewQuery(view.query),
    page: 1,
    preset: '',
  };
  next.preset = resolveActiveExceptionPreset(next);
  return next;
}

export function serializeExceptionSavedViewState(state: ExceptionSavedViewState): string {
  const normalized = normalizeSavedViewState(state);
  return JSON.stringify({
    version: normalized.version,
    activeViewId: normalized.activeViewId,
    views: normalized.views.map((view) => ({
      id: view.id,
      name: view.name,
      pinned: view.pinned,
      query: view.query,
      createdAt: view.createdAt,
      updatedAt: view.updatedAt,
    })),
  });
}

function parseExceptionSavedViewStatePayload(
  rawPayload: unknown,
): { state: ExceptionSavedViewState; recoveryReasons: string[] } {
  const payload = firstQueryValue(rawPayload)?.trim() ?? (typeof rawPayload === 'string' ? rawPayload.trim() : '');
  if (!payload) {
    return {
      state: DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
      recoveryReasons: [],
    };
  }

  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    if (parsed.version !== EXCEPTION_SAVED_VIEW_SCHEMA_VERSION) {
      return {
        state: DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
        recoveryReasons: [`Unsupported saved-view payload version "${String(parsed.version)}".`],
      };
    }
    if (!Array.isArray(parsed.views)) {
      return {
        state: DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
        recoveryReasons: ['Saved-view payload is malformed (missing views array).'],
      };
    }
    const views: ExceptionSavedView[] = [];
    for (const rawView of parsed.views) {
      if (!rawView || typeof rawView !== 'object') {
        return {
          state: DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
          recoveryReasons: ['Saved-view payload is malformed (invalid row).'],
        };
      }
      const view = rawView as Record<string, unknown>;
      if (typeof view.id !== 'string' || !view.id.trim()) {
        return {
          state: DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
          recoveryReasons: ['Saved-view payload is malformed (missing id).'],
        };
      }
      if (typeof view.name !== 'string') {
        return {
          state: DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
          recoveryReasons: ['Saved-view payload is malformed (missing name).'],
        };
      }
      if (typeof view.createdAt !== 'string' || typeof view.updatedAt !== 'string') {
        return {
          state: DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
          recoveryReasons: ['Saved-view payload is malformed (missing timestamps).'],
        };
      }
      const query = normalizeSavedViewQuery((view.query ?? {}) as Partial<ExceptionSavedViewQuery>);
      views.push({
        id: view.id.trim(),
        name: normalizeSavedViewName(view.name, views.length + 1),
        pinned: Boolean(view.pinned),
        query,
        createdAt: view.createdAt,
        updatedAt: view.updatedAt,
      });
    }
    const activeViewId = typeof parsed.activeViewId === 'string' ? parsed.activeViewId : '';
    return {
      state: normalizeSavedViewState({
        version: EXCEPTION_SAVED_VIEW_SCHEMA_VERSION,
        activeViewId,
        views,
      }),
      recoveryReasons: [],
    };
  } catch {
    return {
      state: DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
      recoveryReasons: ['Saved-view payload is not valid JSON.'],
    };
  }
}

export function restoreExceptionSavedViewState(input: {
  queryPayload: unknown;
  storagePayload: unknown;
}): ExceptionSavedViewRestoreResult {
  const queryParsed = parseExceptionSavedViewStatePayload(input.queryPayload);
  if (queryParsed.recoveryReasons.length === 0 && queryParsed.state.views.length > 0) {
    return {
      state: queryParsed.state,
      source: 'query',
      recoveryReasons: [],
    };
  }
  const storageParsed = parseExceptionSavedViewStatePayload(input.storagePayload);
  if (storageParsed.recoveryReasons.length === 0 && storageParsed.state.views.length > 0) {
    return {
      state: storageParsed.state,
      source: 'storage',
      recoveryReasons: queryParsed.recoveryReasons,
    };
  }
  return {
    state: DEFAULT_EXCEPTION_SAVED_VIEW_STATE,
    source: 'default',
    recoveryReasons: [...queryParsed.recoveryReasons, ...storageParsed.recoveryReasons],
  };
}

export function validateExceptionActionInput(reason: string): string | null {
  const normalized = reason.trim();
  if (!normalized) {
    return 'Reason is required.';
  }
  if (normalized.length < 4) {
    return 'Reason must be at least 4 characters.';
  }
  return null;
}

export function applyExceptionActionOptimistic(
  rows: SettlementExceptionRow[],
  exceptionId: string,
  action: ExceptionAction,
  updatedAt: string,
): SettlementExceptionRow[] {
  const nextStatus: ExceptionStatus = action === 'resolve' ? 'resolved' : 'ignored';
  return rows.map((row) => {
    if (row.id !== exceptionId) {
      return row;
    }
    return {
      ...row,
      status: nextStatus,
      updatedAt,
    };
  });
}

export function prependExceptionAudit(
  entries: SettlementExceptionAuditEntry[],
  entry: SettlementExceptionAuditEntry,
): SettlementExceptionAuditEntry[] {
  return [entry, ...entries];
}

export type ExceptionActionFailure = {
  kind: ExceptionActionErrorKind;
  retryable: boolean;
  userMessage: string;
};

function coerceString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toMessageText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(', ');
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  if (value == null) {
    return '';
  }
  return String(value);
}

function parseCanonicalExceptionActionEnvelope(raw: unknown): {
  statusCode: number | null;
  code: string | null;
  reason: string | null;
  retryable: boolean | null;
  message: string;
} {
  if (!raw || typeof raw !== 'object') {
    return {
      statusCode: null,
      code: null,
      reason: null,
      retryable: null,
      message: toMessageText(raw),
    };
  }

  const payload = raw as Record<string, unknown>;
  const messageValue = payload.message;
  const messageObject = (typeof messageValue === 'object' && messageValue !== null)
    ? messageValue as Record<string, unknown>
    : null;

  return {
    statusCode: typeof payload.statusCode === 'number' ? payload.statusCode : null,
    code: coerceString(messageObject?.code ?? payload.code),
    reason: coerceString(messageObject?.reason ?? payload.reason),
    retryable: typeof (messageObject?.retryable ?? payload.retryable) === 'boolean'
      ? Boolean(messageObject?.retryable ?? payload.retryable)
      : null,
    message: toMessageText(messageObject?.message ?? messageValue ?? payload.error ?? ''),
  };
}

export function normalizeExceptionStatus(input: unknown): ExceptionStatus {
  if (input === 'open' || input === 'investigating' || input === 'resolved' || input === 'ignored') {
    return input;
  }
  if (input === 'OPEN') return 'open';
  if (input === 'INVESTIGATING') return 'investigating';
  if (input === 'RESOLVED') return 'resolved';
  if (input === 'IGNORED') return 'ignored';
  return 'open';
}

function hashFNV1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let idx = 0; idx < input.length; idx += 1) {
    hash ^= input.charCodeAt(idx);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function buildExceptionActionIdempotencyKey(input: {
  exceptionId: string;
  action: ExceptionAction;
  reason: string;
  note: string | null;
  expectedVersion: number;
  expectedUpdatedAt: string | null;
}): string {
  const fingerprint = JSON.stringify({
    exceptionId: input.exceptionId,
    action: input.action,
    reason: input.reason.trim(),
    note: input.note ?? null,
    expectedVersion: input.expectedVersion,
    expectedUpdatedAt: input.expectedUpdatedAt ?? null,
  });
  return `settlement-action-${hashFNV1a(fingerprint)}`;
}

export function classifyExceptionActionFailure(raw: unknown): ExceptionActionFailure {
  const parsed = parseCanonicalExceptionActionEnvelope(raw);
  const message = parsed.message.trim();
  const normalized = message.toLowerCase();

  if (
    parsed.code === 'SETTLEMENT_EXCEPTION_ACTION_CONFLICT'
    && (parsed.reason === 'stale_version' || parsed.reason === 'stale_updated_at')
  ) {
    return {
      kind: 'version_conflict',
      retryable: true,
      userMessage: 'This exception was updated by another operator. Refresh detail and retry with the latest version.',
    };
  }

  if (parsed.statusCode === 401 || parsed.statusCode === 403) {
    return {
      kind: 'permission',
      retryable: false,
      userMessage: 'Your role cannot perform this action. Use an admin/ops role.',
    };
  }

  if (
    parsed.code === 'SETTLEMENT_EXCEPTION_ACTION_CONFLICT'
    && (parsed.reason === 'idempotency_in_progress' || parsed.retryable === true)
  ) {
    return {
      kind: 'transient',
      retryable: true,
      userMessage: 'Action failed due to a temporary backend issue. Retry with the same reason.',
    };
  }

  if (normalized.includes('version conflict') || normalized.includes('stale version')) {
    return {
      kind: 'version_conflict',
      retryable: true,
      userMessage: 'This exception was updated by another operator. Refresh detail and retry with the latest version.',
    };
  }

  if (normalized.includes('forbidden') || normalized.includes('unauthorized') || normalized.includes('permission')) {
    return {
      kind: 'permission',
      retryable: false,
      userMessage: 'Your role cannot perform this action. Use an admin/ops role.',
    };
  }

  if (normalized.includes('timeout') || normalized.includes('temporar') || normalized.includes('unavailable')) {
    return {
      kind: 'transient',
      retryable: true,
      userMessage: 'Action failed due to a temporary backend issue. Retry with the same reason.',
    };
  }

  return {
    kind: 'unknown',
    retryable: false,
    userMessage: message || 'Action failed. Verify the input and try again.',
  };
}
