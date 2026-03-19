import { ServiceUnavailableException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { ProviderRouterService } from '../src/providers/provider-router.service';
import { RoutingReasonCode } from '../src/providers/provider.interface';

describe('ProviderRouterService', () => {
  it('picks provider by weighted score and tie-breaks on lower risk', async () => {
    const first = {
      name: 'mock-a',
      isHealthy: jest.fn(async () => true),
      initiate: jest.fn(async () => ({ providerName: 'mock-a', externalRef: 'A-ref' })),
    };
    const second = {
      name: 'mock-b',
      isHealthy: jest.fn(async () => true),
      initiate: jest.fn(async () => ({ providerName: 'mock-b', externalRef: 'B-ref' })),
    };

    const router = new ProviderRouterService(
      [first as any, second as any],
      {
        weights: { successRate: 0, latency: 0, fee: 1, risk: 0 },
        providerProfiles: {
          'mock-a': { successRate: 0.95, latencyMs: 120, feePercent: 2, riskScore: 20 },
          'mock-b': { successRate: 0.95, latencyMs: 120, feePercent: 2, riskScore: 10 },
        },
      },
    );
    const result = await router.initiateWithFailover({
      amount: 1,
      currency: 'USD',
      type: TransactionType.DEPOSIT,
      reference: 'ref-score',
    });

    expect(result.providerName).toBe('mock-b');
    expect(result.decision?.reasonCode).toBe(RoutingReasonCode.TIE_BREAKER_LOWER_RISK);
    expect(result.decision?.scores.map((item) => item.providerName)).toEqual(['mock-b', 'mock-a']);
  });

  it('fails over and opens circuit breaker after threshold then half-open probe closes it', async () => {
    const events: string[] = [];
    let nowMs = 0;

    const first = {
      name: 'mock-a',
      isHealthy: jest.fn(async () => true),
      initiate: jest
        .fn()
        .mockImplementationOnce(async () => {
          throw new Error('down');
        })
        .mockImplementationOnce(async () => {
          throw new Error('down');
        })
        .mockImplementationOnce(async () => ({ providerName: 'mock-a', externalRef: 'A-recovered' })),
    };
    const second = {
      name: 'mock-b',
      isHealthy: jest.fn(async () => true),
      initiate: jest.fn(async () => ({ providerName: 'mock-b', externalRef: 'B-ref' })),
    };

    const router = new ProviderRouterService(
      [first as any, second as any],
      {
        providerProfiles: {
          'mock-a': { successRate: 0.99, latencyMs: 40, feePercent: 1.1, riskScore: 2 },
          'mock-b': { successRate: 0.7, latencyMs: 400, feePercent: 4.5, riskScore: 40 },
        },
        circuitBreaker: { failureThreshold: 2, cooldownMs: 1000 },
        now: () => nowMs,
        telemetrySink: (event) => {
          events.push(event);
        },
      },
    );

    const request = {
      amount: 1,
      currency: 'USD',
      type: TransactionType.DEPOSIT,
      reference: 'ref-cb',
    };

    await router.initiateWithFailover(request);
    await router.initiateWithFailover(request);
    await router.initiateWithFailover(request);
    nowMs = 1500;
    const recovered = await router.initiateWithFailover(request);

    expect(recovered.providerName).toBe('mock-a');
    expect(first.initiate).toHaveBeenCalledTimes(3);
    expect(events).toContain('routing.breaker.transition');
    expect(events.filter((event) => event === 'routing.failover').length).toBeGreaterThan(0);
  });

  it('uses legacy path in shadow mode and marks decision accordingly', async () => {
    const first = {
      name: 'mock-a',
      isHealthy: jest.fn(async () => true),
      initiate: jest.fn(async () => ({ providerName: 'mock-a', externalRef: 'A-ref' })),
    };
    const second = {
      name: 'mock-b',
      isHealthy: jest.fn(async () => true),
      initiate: jest.fn(async () => ({ providerName: 'mock-b', externalRef: 'B-ref' })),
    };

    const router = new ProviderRouterService(
      [first as any, second as any],
      {
        featureFlags: {
          policyEnabled: true,
          shadowMode: true,
          rolloutPercent: 100,
          legacyFallbackEnabled: true,
        },
        providerProfiles: {
          'mock-a': { successRate: 0.7, latencyMs: 350, feePercent: 3, riskScore: 35 },
          'mock-b': { successRate: 0.98, latencyMs: 100, feePercent: 1.2, riskScore: 8 },
        },
      },
    );

    const result = await router.initiateWithFailover({
      amount: 1,
      currency: 'USD',
      type: TransactionType.DEPOSIT,
      reference: 'ref-shadow',
    });

    expect(result.providerName).toBe('mock-a');
    expect(result.decision?.algorithm).toBe('legacy');
    expect(result.decision?.reasonCode).toBe(RoutingReasonCode.LEGACY_SHADOW_MODE);
  });

  it('throws when no healthy providers exist', async () => {
    const first = {
      name: 'mock-a',
      isHealthy: jest.fn(async () => false),
      initiate: jest.fn(),
    };
    const router = new ProviderRouterService([first as any]);

    await expect(
      router.initiateWithFailover({
        amount: 1,
        currency: 'USD',
        type: TransactionType.DEPOSIT,
        reference: 'ref',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('supports runtime policy updates and provider health snapshots', async () => {
    const first = {
      name: 'mock-a',
      isHealthy: jest.fn(async () => true),
      initiate: jest.fn(async () => ({ providerName: 'mock-a', externalRef: 'A-ref' })),
    };
    const router = new ProviderRouterService([first as any], {
      weights: { successRate: 0.45, latency: 0.25, fee: 0.2, risk: 0.1 },
      featureFlags: { policyEnabled: true, shadowMode: false, rolloutPercent: 100, legacyFallbackEnabled: true },
    });

    const updated = router.updatePolicyConfig({
      featureFlags: { rolloutPercent: 35 },
      weights: { fee: 0.6 },
      providerProfiles: {
        'mock-a': { feePercent: 1.7, riskScore: 10 },
      },
    });
    expect(updated.featureFlags.rolloutPercent).toBe(35);
    expect(updated.weights.fee).toBe(0.6);
    expect(updated.providerProfiles['mock-a'].feePercent).toBe(1.7);

    const health = await router.getProviderHealthSnapshot();
    expect(health).toHaveLength(1);
    expect(health[0]).toMatchObject({
      providerName: 'mock-a',
      healthy: true,
    });
  });
});
