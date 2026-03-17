import { ServiceUnavailableException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { ProviderRouterService } from '../src/providers/provider-router.service';

describe('ProviderRouterService', () => {
  it('falls back to second provider when first is unhealthy', async () => {
    const first = {
      name: 'mock-a',
      isHealthy: jest.fn(async () => false),
      initiate: jest.fn(),
    };
    const second = {
      name: 'mock-b',
      isHealthy: jest.fn(async () => true),
      initiate: jest.fn(async () => ({ providerName: 'mock-b', externalRef: 'B-ref' })),
    };

    const router = new ProviderRouterService([first as any, second as any]);
    const result = await router.initiateWithFailover({
      amount: 1,
      currency: 'USD',
      type: TransactionType.DEPOSIT,
      reference: 'ref',
    });

    expect(result.providerName).toBe('mock-b');
    expect(second.initiate).toHaveBeenCalledTimes(1);
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
});
