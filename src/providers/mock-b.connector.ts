import { Injectable } from '@nestjs/common';
import { ProviderConnector, ProviderRequest, ProviderResult } from './provider.interface';

@Injectable()
export class MockBConnector implements ProviderConnector {
  readonly name = 'mock-b';

  async isHealthy(): Promise<boolean> {
    return process.env.PROVIDER_MOCK_B_HEALTHY !== 'false';
  }

  async initiate(request: ProviderRequest): Promise<ProviderResult> {
    return {
      providerName: this.name,
      externalRef: `B-${request.reference}`,
    };
  }
}
