import { Injectable } from '@nestjs/common';
import { ProviderConnector, ProviderRequest, ProviderResult } from './provider.interface';

@Injectable()
export class MockAConnector implements ProviderConnector {
  readonly name = 'mock-a';

  async isHealthy(): Promise<boolean> {
    return process.env.PROVIDER_MOCK_A_HEALTHY !== 'false';
  }

  async initiate(request: ProviderRequest): Promise<ProviderResult> {
    return {
      providerName: this.name,
      externalRef: `A-${request.reference}`,
    };
  }
}
