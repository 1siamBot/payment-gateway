import { TransactionType } from '@prisma/client';

export type ProviderRequest = {
  amount: number;
  currency: string;
  type: TransactionType;
  reference: string;
};

export type ProviderResult = {
  providerName: string;
  externalRef: string;
  decision?: RoutingDecision;
  telemetry?: RoutingTelemetryEvent[];
};

export interface ProviderConnector {
  readonly name: string;
  isHealthy(): Promise<boolean>;
  initiate(request: ProviderRequest): Promise<ProviderResult>;
}

export type CircuitState = 'closed' | 'open' | 'half_open';

export enum RoutingReasonCode {
  POLICY_SCORE_WIN = 'policy_score_win',
  TIE_BREAKER_LOWER_RISK = 'tie_breaker_lower_risk',
  TIE_BREAKER_LOWER_FEE = 'tie_breaker_lower_fee',
  TIE_BREAKER_PROVIDER_NAME = 'tie_breaker_provider_name',
  ONLY_ELIGIBLE_PROVIDER = 'only_eligible_provider',
  FAILOVER_AFTER_ERROR = 'failover_after_error',
  LEGACY_POLICY_DISABLED = 'legacy_policy_disabled',
  LEGACY_SHADOW_MODE = 'legacy_shadow_mode',
  LEGACY_ROLLOUT_GATE = 'legacy_rollout_gate',
  LEGACY_FALLBACK = 'legacy_fallback',
}

export type RoutingScoreCard = {
  providerName: string;
  score: number;
  successRate: number;
  latencyMs: number;
  feePercent: number;
  riskScore: number;
  circuitState: CircuitState;
};

export type RoutingDecision = {
  algorithm: 'policy' | 'legacy';
  reasonCode: RoutingReasonCode;
  selectedProvider: string;
  scores: RoutingScoreCard[];
  failovers: string[];
  rolloutApplied: boolean;
  shadowMode: boolean;
  usedLegacyPath: boolean;
  marginKpi: {
    estimatedFeePercent: number;
    weightedScore: number;
  };
};

export type RoutingTelemetryEvent = {
  eventType: string;
  occurredAt: string;
  payload: Record<string, unknown>;
};
