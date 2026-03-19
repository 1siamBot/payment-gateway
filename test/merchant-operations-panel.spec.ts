import {
  buildDeterministicViewState,
  buildMerchantOperationsTabs,
  parseMerchantOperationsTab,
  resolveEffectiveDataSource,
  stateBadgeFromViewState,
} from '../frontend/utils/merchantOperationsPanel';

describe('merchant operations panel utilities', () => {
  it('switches tabs deterministically and keeps exactly one active tab', () => {
    const profileTabs = buildMerchantOperationsTabs(parseMerchantOperationsTab('merchant_profile'));
    const apiKeyTabs = buildMerchantOperationsTabs(parseMerchantOperationsTab('api_keys'));

    expect(profileTabs.filter((tab) => tab.isActive)).toHaveLength(1);
    expect(profileTabs[0]).toMatchObject({ key: 'merchant_profile', isActive: true });
    expect(apiKeyTabs[1]).toMatchObject({ key: 'api_keys', isActive: true });
  });

  it('maps deterministic view states into badge tones', () => {
    const readyBadge = stateBadgeFromViewState(buildDeterministicViewState({
      loading: false,
      error: '',
      itemCount: 2,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    }));
    const errorBadge = stateBadgeFromViewState(buildDeterministicViewState({
      loading: false,
      error: 'boom',
      itemCount: 0,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    }));

    expect(readyBadge).toEqual({ text: 'ready', tone: 'ok' });
    expect(errorBadge).toEqual({ text: 'error', tone: 'danger' });
  });

  it('resolves fixture fallback mode when API endpoints are unsupported', () => {
    expect(resolveEffectiveDataSource({ mode: 'api', latestApiStatusCode: 404 })).toBe('fixture');
    expect(resolveEffectiveDataSource({ mode: 'api', latestApiStatusCode: 501 })).toBe('fixture');
    expect(resolveEffectiveDataSource({ mode: 'fixture_success' })).toBe('fixture');
    expect(resolveEffectiveDataSource({ mode: 'api', latestApiStatusCode: 500 })).toBe('api');
  });

  it('shows retry action only for error states', () => {
    const loading = buildDeterministicViewState({
      loading: true,
      error: '',
      itemCount: 0,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });
    const empty = buildDeterministicViewState({
      loading: false,
      error: '',
      itemCount: 0,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });
    const error = buildDeterministicViewState({
      loading: false,
      error: 'failed',
      itemCount: 0,
      loadingMessage: 'loading',
      emptyMessage: 'empty',
      readyMessage: 'ready',
    });

    expect(loading.showRetry).toBe(false);
    expect(empty.showRetry).toBe(false);
    expect(error.showRetry).toBe(true);
  });
});
