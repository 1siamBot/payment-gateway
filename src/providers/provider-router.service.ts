import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ProviderConnector, ProviderRequest, ProviderResult } from './provider.interface';

@Injectable()
export class ProviderRouterService {
  constructor(private readonly providers: ProviderConnector[]) {}

  async initiateWithFailover(request: ProviderRequest): Promise<ProviderResult> {
    for (const provider of this.providers) {
      if (!(await provider.isHealthy())) {
        continue;
      }
      try {
        return await provider.initiate(request);
      } catch {
        continue;
      }
    }

    throw new ServiceUnavailableException('No healthy provider available');
  }
}
