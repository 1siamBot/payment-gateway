export type MerchantOperationsTab = 'merchant_profile' | 'api_keys' | 'webhook_endpoints';

export type MerchantOperationsDataMode =
  | 'api'
  | 'fixture_success'
  | 'fixture_empty'
  | 'fixture_error'
  | 'fixture_loading';

export type DeterministicViewState = {
  key: 'loading' | 'error' | 'empty' | 'ready';
  message: string;
  showRetry: boolean;
};

export type StateBadge = {
  text: string;
  tone: 'ok' | 'warn' | 'danger' | 'neutral';
};

export const MERCHANT_OPERATIONS_TAB_ORDER: MerchantOperationsTab[] = [
  'merchant_profile',
  'api_keys',
  'webhook_endpoints',
];

export function parseMerchantOperationsTab(input?: string): MerchantOperationsTab {
  if (!input) return 'merchant_profile';
  return MERCHANT_OPERATIONS_TAB_ORDER.includes(input as MerchantOperationsTab)
    ? (input as MerchantOperationsTab)
    : 'merchant_profile';
}

export function buildMerchantOperationsTabs(active: MerchantOperationsTab) {
  return [
    { key: 'merchant_profile' as const, label: 'Merchant Profile', isActive: active === 'merchant_profile' },
    { key: 'api_keys' as const, label: 'API Keys', isActive: active === 'api_keys' },
    { key: 'webhook_endpoints' as const, label: 'Webhook Endpoints', isActive: active === 'webhook_endpoints' },
  ];
}

export function buildDeterministicViewState(input: {
  loading: boolean;
  error: string;
  itemCount: number;
  loadingMessage: string;
  emptyMessage: string;
  readyMessage: string;
}): DeterministicViewState {
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

export function stateBadgeFromViewState(viewState: DeterministicViewState): StateBadge {
  if (viewState.key === 'ready') return { text: 'ready', tone: 'ok' };
  if (viewState.key === 'loading') return { text: 'loading', tone: 'warn' };
  if (viewState.key === 'error') return { text: 'error', tone: 'danger' };
  return { text: 'empty', tone: 'neutral' };
}

export function resolveEffectiveDataSource(input: {
  mode: MerchantOperationsDataMode;
  latestApiStatusCode?: number;
}): 'api' | 'fixture' {
  if (input.mode !== 'api') {
    return 'fixture';
  }
  if (input.latestApiStatusCode === 404 || input.latestApiStatusCode === 405 || input.latestApiStatusCode === 501) {
    return 'fixture';
  }
  return 'api';
}
