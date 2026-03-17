import { Module } from '@nestjs/common';
import { MockAConnector } from './mock-a.connector';
import { MockBConnector } from './mock-b.connector';
import { ProviderRouterService } from './provider-router.service';
import { ProviderConnector } from './provider.interface';

@Module({
  providers: [
    MockAConnector,
    MockBConnector,
    {
      provide: ProviderRouterService,
      useFactory: (a: MockAConnector, b: MockBConnector) => {
        const providers: ProviderConnector[] = [a, b];
        return new ProviderRouterService(providers);
      },
      inject: [MockAConnector, MockBConnector],
    },
  ],
  exports: [ProviderRouterService],
})
export class ProvidersModule {}
