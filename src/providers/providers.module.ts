import { Module } from '@nestjs/common';
import { MockAConnector } from './mock-a.connector';
import { MockBConnector } from './mock-b.connector';
import { ProviderRouterOptions, ProviderRouterService } from './provider-router.service';
import { ProviderConnector } from './provider.interface';
import { RoutingAdminController } from './routing-admin.controller';

function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  return fallback;
}

@Module({
  controllers: [RoutingAdminController],
  providers: [
    MockAConnector,
    MockBConnector,
    {
      provide: ProviderRouterService,
      useFactory: (a: MockAConnector, b: MockBConnector) => {
        const providers: ProviderConnector[] = [a, b];
        const options: ProviderRouterOptions = {
          weights: {
            successRate: parseNumber(process.env.ROUTING_WEIGHT_SUCCESS, 0.45),
            latency: parseNumber(process.env.ROUTING_WEIGHT_LATENCY, 0.25),
            fee: parseNumber(process.env.ROUTING_WEIGHT_FEE, 0.2),
            risk: parseNumber(process.env.ROUTING_WEIGHT_RISK, 0.1),
          },
          providerProfiles: {
            'mock-a': {
              successRate: parseNumber(process.env.ROUTING_MOCK_A_SUCCESS_RATE, 0.96),
              latencyMs: parseNumber(process.env.ROUTING_MOCK_A_LATENCY_MS, 180),
              feePercent: parseNumber(process.env.ROUTING_MOCK_A_FEE_PERCENT, 2.2),
              riskScore: parseNumber(process.env.ROUTING_MOCK_A_RISK_SCORE, 18),
            },
            'mock-b': {
              successRate: parseNumber(process.env.ROUTING_MOCK_B_SUCCESS_RATE, 0.93),
              latencyMs: parseNumber(process.env.ROUTING_MOCK_B_LATENCY_MS, 220),
              feePercent: parseNumber(process.env.ROUTING_MOCK_B_FEE_PERCENT, 1.9),
              riskScore: parseNumber(process.env.ROUTING_MOCK_B_RISK_SCORE, 24),
            },
          },
          featureFlags: {
            policyEnabled: parseBool(process.env.ROUTING_POLICY_ENABLED, true),
            shadowMode: parseBool(process.env.ROUTING_POLICY_SHADOW_MODE, false),
            rolloutPercent: parseNumber(process.env.ROUTING_POLICY_ROLLOUT_PERCENT, 100),
            legacyFallbackEnabled: parseBool(process.env.ROUTING_LEGACY_FALLBACK_ENABLED, true),
          },
          circuitBreaker: {
            failureThreshold: parseNumber(process.env.ROUTING_CB_FAILURE_THRESHOLD, 2),
            cooldownMs: parseNumber(process.env.ROUTING_CB_COOLDOWN_MS, 30000),
          },
        };
        return new ProviderRouterService(providers, options);
      },
      inject: [MockAConnector, MockBConnector],
    },
  ],
  exports: [ProviderRouterService],
})
export class ProvidersModule {}
