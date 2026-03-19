import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  CircuitState,
  ProviderConnector,
  ProviderRequest,
  ProviderResult,
  RoutingReasonCode,
  RoutingScoreCard,
  RoutingTelemetryEvent,
} from './provider.interface';

type ProviderProfile = {
  successRate: number;
  latencyMs: number;
  feePercent: number;
  riskScore: number;
};

type RoutingWeights = {
  successRate: number;
  latency: number;
  fee: number;
  risk: number;
};

type RouterFlags = {
  policyEnabled: boolean;
  shadowMode: boolean;
  rolloutPercent: number;
  legacyFallbackEnabled: boolean;
};

type CircuitBreakerSettings = {
  failureThreshold: number;
  cooldownMs: number;
};

export type RoutingPolicyConfigSnapshot = {
  weights: RoutingWeights;
  featureFlags: RouterFlags;
  circuitBreaker: CircuitBreakerSettings;
  providerProfiles: Record<string, ProviderProfile>;
};

export type RoutingPolicyConfigUpdate = {
  weights?: Partial<RoutingWeights>;
  featureFlags?: Partial<RouterFlags>;
  circuitBreaker?: Partial<CircuitBreakerSettings>;
  providerProfiles?: Record<string, Partial<ProviderProfile>>;
};

export type ProviderHealthSnapshot = {
  providerName: string;
  healthy: boolean;
  circuit: BreakerState;
  runtime: ProviderRuntimeStats;
};

export type ProviderRouterOptions = {
  providerProfiles?: Record<string, ProviderProfile>;
  weights?: Partial<RoutingWeights>;
  featureFlags?: Partial<RouterFlags>;
  circuitBreaker?: Partial<CircuitBreakerSettings>;
  now?: () => number;
  telemetrySink?: (event: string, payload: Record<string, unknown>) => void;
};

type ProviderRuntimeStats = {
  attempts: number;
  successes: number;
  failures: number;
  totalLatencyMs: number;
};

type BreakerState = {
  state: CircuitState;
  consecutiveFailures: number;
  openedAtMs: number | null;
  probeInFlight: boolean;
};

@Injectable()
export class ProviderRouterService {
  private readonly logger = new Logger(ProviderRouterService.name);
  private readonly now: () => number;
  private readonly telemetrySink?: (event: string, payload: Record<string, unknown>) => void;
  private readonly profiles: Record<string, ProviderProfile>;
  private readonly weights: RoutingWeights;
  private readonly flags: RouterFlags;
  private readonly breakerSettings: CircuitBreakerSettings;
  private readonly runtimeStats = new Map<string, ProviderRuntimeStats>();
  private readonly breakerStates = new Map<string, BreakerState>();

  constructor(
    private readonly providers: ProviderConnector[],
    options?: ProviderRouterOptions,
  ) {
    this.now = options?.now ?? (() => Date.now());
    this.telemetrySink = options?.telemetrySink;

    this.profiles = options?.providerProfiles ?? {};
    this.weights = {
      successRate: options?.weights?.successRate ?? 0.45,
      latency: options?.weights?.latency ?? 0.25,
      fee: options?.weights?.fee ?? 0.2,
      risk: options?.weights?.risk ?? 0.1,
    };
    this.flags = {
      policyEnabled: options?.featureFlags?.policyEnabled ?? true,
      shadowMode: options?.featureFlags?.shadowMode ?? false,
      rolloutPercent: this.clamp(options?.featureFlags?.rolloutPercent ?? 100, 0, 100),
      legacyFallbackEnabled: options?.featureFlags?.legacyFallbackEnabled ?? true,
    };
    this.breakerSettings = {
      failureThreshold: Math.max(1, options?.circuitBreaker?.failureThreshold ?? 2),
      cooldownMs: Math.max(100, options?.circuitBreaker?.cooldownMs ?? 30_000),
    };
  }

  getPolicyConfig(): RoutingPolicyConfigSnapshot {
    return {
      weights: { ...this.weights },
      featureFlags: { ...this.flags },
      circuitBreaker: { ...this.breakerSettings },
      providerProfiles: JSON.parse(JSON.stringify(this.profiles)) as Record<string, ProviderProfile>,
    };
  }

  updatePolicyConfig(input: RoutingPolicyConfigUpdate): RoutingPolicyConfigSnapshot {
    if (input.weights) {
      this.weights.successRate = this.clamp(input.weights.successRate ?? this.weights.successRate, 0, 1);
      this.weights.latency = this.clamp(input.weights.latency ?? this.weights.latency, 0, 1);
      this.weights.fee = this.clamp(input.weights.fee ?? this.weights.fee, 0, 1);
      this.weights.risk = this.clamp(input.weights.risk ?? this.weights.risk, 0, 1);
    }

    if (input.featureFlags) {
      this.flags.policyEnabled = input.featureFlags.policyEnabled ?? this.flags.policyEnabled;
      this.flags.shadowMode = input.featureFlags.shadowMode ?? this.flags.shadowMode;
      this.flags.rolloutPercent = this.clamp(input.featureFlags.rolloutPercent ?? this.flags.rolloutPercent, 0, 100);
      this.flags.legacyFallbackEnabled = input.featureFlags.legacyFallbackEnabled ?? this.flags.legacyFallbackEnabled;
    }

    if (input.circuitBreaker) {
      this.breakerSettings.failureThreshold = Math.max(
        1,
        input.circuitBreaker.failureThreshold ?? this.breakerSettings.failureThreshold,
      );
      this.breakerSettings.cooldownMs = Math.max(100, input.circuitBreaker.cooldownMs ?? this.breakerSettings.cooldownMs);
    }

    if (input.providerProfiles) {
      for (const [providerName, patch] of Object.entries(input.providerProfiles)) {
        const current = this.getProfile(providerName);
        this.profiles[providerName] = {
          successRate: this.clamp(patch.successRate ?? current.successRate, 0, 1),
          latencyMs: Math.max(1, patch.latencyMs ?? current.latencyMs),
          feePercent: this.clamp(patch.feePercent ?? current.feePercent, 0, 100),
          riskScore: this.clamp(patch.riskScore ?? current.riskScore, 0, 100),
        };
      }
    }

    return this.getPolicyConfig();
  }

  async getProviderHealthSnapshot(): Promise<ProviderHealthSnapshot[]> {
    const snapshots: ProviderHealthSnapshot[] = [];
    for (const provider of this.providers) {
      const breaker = this.getOrInitBreaker(provider.name);
      const runtime = this.getOrInitRuntimeStats(provider.name);
      snapshots.push({
        providerName: provider.name,
        healthy: await provider.isHealthy(),
        circuit: { ...breaker },
        runtime: { ...runtime },
      });
    }
    return snapshots;
  }

  async initiateWithFailover(request: ProviderRequest): Promise<ProviderResult> {
    const requestTelemetry: RoutingTelemetryEvent[] = [];
    const rolloutApplied = this.shouldApplyPolicy(request.reference);
    const policyDecision = this.resolvePolicyGateReason(rolloutApplied);

    if (policyDecision === null) {
      const result = await this.executePolicyRouting(request, rolloutApplied, requestTelemetry);
      return { ...result, telemetry: requestTelemetry };
    }

    const legacyResult = await this.executeLegacyRouting(request, policyDecision, rolloutApplied, [], requestTelemetry);
    if (this.flags.shadowMode) {
      await this.evaluatePolicyInShadow(request, rolloutApplied, requestTelemetry);
    }
    return { ...legacyResult, telemetry: requestTelemetry };
  }

  private async executePolicyRouting(
    request: ProviderRequest,
    rolloutApplied: boolean,
    requestTelemetry: RoutingTelemetryEvent[],
  ): Promise<ProviderResult> {
    const rankedCandidates = await this.buildRankedCandidates(requestTelemetry);
    if (rankedCandidates.length === 0) {
      throw new ServiceUnavailableException('No healthy provider available');
    }

    const failovers: string[] = [];

    for (let i = 0; i < rankedCandidates.length; i += 1) {
      const candidate = rankedCandidates[i];
      const provider = candidate.provider;
      const startedAt = this.now();
      this.markProbeIfNeeded(provider.name);
      try {
        const result = await provider.initiate(request);
        const latencyMs = this.now() - startedAt;
        this.recordSuccess(provider.name, latencyMs, requestTelemetry);

        const reasonCode = this.resolveReasonCodeForSelection(i, rankedCandidates);
        const decision = this.buildDecision({
          algorithm: 'policy',
          reasonCode,
          selectedProvider: provider.name,
          scores: rankedCandidates.map((item) => item.scoreCard),
          failovers,
          rolloutApplied,
          shadowMode: this.flags.shadowMode,
          usedLegacyPath: false,
        });
        this.emitTelemetry('routing.decision', {
          provider: provider.name,
          reasonCode,
          rolloutApplied,
          failovers: [...failovers],
          score: candidate.scoreCard.score,
          marginKpi: decision.marginKpi,
        }, requestTelemetry);

        return { ...result, decision };
      } catch {
        this.recordFailure(provider.name, requestTelemetry);
        failovers.push(provider.name);
        this.emitTelemetry('routing.failover', {
          failedProvider: provider.name,
          failoverCount: failovers.length,
        }, requestTelemetry);
      }
    }

    if (this.flags.legacyFallbackEnabled) {
      return this.executeLegacyRouting(
        request,
        RoutingReasonCode.LEGACY_FALLBACK,
        rolloutApplied,
        failovers,
        requestTelemetry,
      );
    }

    throw new ServiceUnavailableException('No healthy provider available');
  }

  private async executeLegacyRouting(
    request: ProviderRequest,
    reasonCode: RoutingReasonCode,
    rolloutApplied: boolean,
    inheritedFailovers: string[] = [],
    requestTelemetry: RoutingTelemetryEvent[] = [],
  ): Promise<ProviderResult> {
    const failovers = [...inheritedFailovers];

    for (const provider of this.providers) {
      if (!(await provider.isHealthy())) {
        continue;
      }
      try {
        const result = await provider.initiate(request);
        const scoreCard = this.buildScoreCard(provider.name, 'closed');
        const decision = this.buildDecision({
          algorithm: 'legacy',
          reasonCode,
          selectedProvider: provider.name,
          scores: [scoreCard],
          failovers,
          rolloutApplied,
          shadowMode: this.flags.shadowMode,
          usedLegacyPath: true,
        });
        this.emitTelemetry('routing.decision', {
          provider: provider.name,
          reasonCode,
          rolloutApplied,
          failovers: [...failovers],
          score: scoreCard.score,
          marginKpi: decision.marginKpi,
        }, requestTelemetry);
        return { ...result, decision };
      } catch {
        failovers.push(provider.name);
        this.emitTelemetry('routing.failover', {
          failedProvider: provider.name,
          failoverCount: failovers.length,
        }, requestTelemetry);
      }
    }

    throw new ServiceUnavailableException('No healthy provider available');
  }

  private async evaluatePolicyInShadow(
    request: ProviderRequest,
    rolloutApplied: boolean,
    requestTelemetry: RoutingTelemetryEvent[],
  ): Promise<void> {
    try {
      const rankedCandidates = await this.buildRankedCandidates(requestTelemetry);
      if (rankedCandidates.length === 0) {
        return;
      }
      this.emitTelemetry('routing.shadow', {
        reference: request.reference,
        rolloutApplied,
        selectedProvider: rankedCandidates[0].provider.name,
        scores: rankedCandidates.map((item) => item.scoreCard),
      }, requestTelemetry);
    } catch {
      // Best-effort shadow evaluation; must not impact live routing.
    }
  }

  private async buildRankedCandidates(
    requestTelemetry: RoutingTelemetryEvent[],
  ): Promise<Array<{ provider: ProviderConnector; scoreCard: RoutingScoreCard }>> {
    const candidates: Array<{ provider: ProviderConnector; scoreCard: RoutingScoreCard }> = [];
    for (const provider of this.providers) {
      if (!(await provider.isHealthy())) {
        continue;
      }
      const breaker = this.getOrInitBreaker(provider.name);
      const state = this.refreshCircuitState(provider.name, breaker, requestTelemetry);
      if (state === 'open') {
        continue;
      }
      if (state === 'half_open' && breaker.probeInFlight) {
        continue;
      }
      candidates.push({
        provider,
        scoreCard: this.buildScoreCard(provider.name, state),
      });
    }

    candidates.sort((a, b) => {
      const byScore = b.scoreCard.score - a.scoreCard.score;
      if (Math.abs(byScore) > 0.00001) {
        return byScore;
      }
      if (a.scoreCard.riskScore !== b.scoreCard.riskScore) {
        return a.scoreCard.riskScore - b.scoreCard.riskScore;
      }
      if (a.scoreCard.feePercent !== b.scoreCard.feePercent) {
        return a.scoreCard.feePercent - b.scoreCard.feePercent;
      }
      return a.provider.name.localeCompare(b.provider.name);
    });

    return candidates;
  }

  private buildScoreCard(providerName: string, circuitState: CircuitState): RoutingScoreCard {
    const profile = this.getProfile(providerName);
    const stats = this.getOrInitRuntimeStats(providerName);

    const priorWeight = 20;
    const observedSuccessRate = stats.attempts === 0 ? profile.successRate : stats.successes / stats.attempts;
    const successRate = this.clamp(
      ((profile.successRate * priorWeight) + (observedSuccessRate * stats.attempts)) / (priorWeight + stats.attempts),
      0,
      1,
    );
    const observedLatency = stats.attempts === 0 ? profile.latencyMs : stats.totalLatencyMs / Math.max(1, stats.attempts);
    const latencyMs = ((profile.latencyMs * priorWeight) + (observedLatency * stats.attempts)) / (priorWeight + stats.attempts);

    const successComponent = successRate;
    const latencyComponent = 1 - this.clamp(latencyMs / 1000, 0, 1);
    const feeComponent = 1 - this.clamp(profile.feePercent / 10, 0, 1);
    const riskComponent = 1 - this.clamp(profile.riskScore / 100, 0, 1);
    const score = this.round4(
      (successComponent * this.weights.successRate)
      + (latencyComponent * this.weights.latency)
      + (feeComponent * this.weights.fee)
      + (riskComponent * this.weights.risk),
    );

    return {
      providerName,
      score,
      successRate: this.round4(successRate),
      latencyMs: this.round4(latencyMs),
      feePercent: profile.feePercent,
      riskScore: profile.riskScore,
      circuitState,
    };
  }

  private resolveReasonCodeForSelection(
    selectedIndex: number,
    ranked: Array<{ provider: ProviderConnector; scoreCard: RoutingScoreCard }>,
  ): RoutingReasonCode {
    if (selectedIndex > 0) {
      return RoutingReasonCode.FAILOVER_AFTER_ERROR;
    }
    if (ranked.length === 1) {
      return RoutingReasonCode.ONLY_ELIGIBLE_PROVIDER;
    }

    const first = ranked[0].scoreCard;
    const second = ranked[1].scoreCard;
    if (Math.abs(first.score - second.score) > 0.00001) {
      return RoutingReasonCode.POLICY_SCORE_WIN;
    }
    if (first.riskScore !== second.riskScore) {
      return RoutingReasonCode.TIE_BREAKER_LOWER_RISK;
    }
    if (first.feePercent !== second.feePercent) {
      return RoutingReasonCode.TIE_BREAKER_LOWER_FEE;
    }
    return RoutingReasonCode.TIE_BREAKER_PROVIDER_NAME;
  }

  private buildDecision(params: {
    algorithm: 'policy' | 'legacy';
    reasonCode: RoutingReasonCode;
    selectedProvider: string;
    scores: RoutingScoreCard[];
    failovers: string[];
    rolloutApplied: boolean;
    shadowMode: boolean;
    usedLegacyPath: boolean;
  }) {
    const selected = params.scores.find((score) => score.providerName === params.selectedProvider) ?? params.scores[0];
    return {
      algorithm: params.algorithm,
      reasonCode: params.reasonCode,
      selectedProvider: params.selectedProvider,
      scores: params.scores,
      failovers: params.failovers,
      rolloutApplied: params.rolloutApplied,
      shadowMode: params.shadowMode,
      usedLegacyPath: params.usedLegacyPath,
      marginKpi: {
        estimatedFeePercent: selected?.feePercent ?? 0,
        weightedScore: selected?.score ?? 0,
      },
    };
  }

  private recordSuccess(providerName: string, latencyMs: number, requestTelemetry: RoutingTelemetryEvent[]): void {
    const stats = this.getOrInitRuntimeStats(providerName);
    stats.attempts += 1;
    stats.successes += 1;
    stats.totalLatencyMs += Math.max(1, latencyMs);

    const breaker = this.getOrInitBreaker(providerName);
    breaker.consecutiveFailures = 0;
    if (breaker.state !== 'closed') {
      const from = breaker.state;
      breaker.state = 'closed';
      breaker.openedAtMs = null;
      breaker.probeInFlight = false;
      this.emitBreakerTransition(providerName, from, 'closed', requestTelemetry);
    } else {
      breaker.probeInFlight = false;
    }
  }

  private recordFailure(providerName: string, requestTelemetry: RoutingTelemetryEvent[]): void {
    const stats = this.getOrInitRuntimeStats(providerName);
    stats.attempts += 1;
    stats.failures += 1;

    const breaker = this.getOrInitBreaker(providerName);
    breaker.probeInFlight = false;
    breaker.consecutiveFailures += 1;

    if (breaker.consecutiveFailures >= this.breakerSettings.failureThreshold && breaker.state !== 'open') {
      const from = breaker.state;
      breaker.state = 'open';
      breaker.openedAtMs = this.now();
      this.emitBreakerTransition(providerName, from, 'open', requestTelemetry);
    }
  }

  private markProbeIfNeeded(providerName: string): void {
    const breaker = this.getOrInitBreaker(providerName);
    if (breaker.state === 'half_open') {
      breaker.probeInFlight = true;
    }
  }

  private getOrInitRuntimeStats(providerName: string): ProviderRuntimeStats {
    const existing = this.runtimeStats.get(providerName);
    if (existing) {
      return existing;
    }
    const created: ProviderRuntimeStats = { attempts: 0, successes: 0, failures: 0, totalLatencyMs: 0 };
    this.runtimeStats.set(providerName, created);
    return created;
  }

  private getOrInitBreaker(providerName: string): BreakerState {
    const existing = this.breakerStates.get(providerName);
    if (existing) {
      return existing;
    }
    const created: BreakerState = {
      state: 'closed',
      consecutiveFailures: 0,
      openedAtMs: null,
      probeInFlight: false,
    };
    this.breakerStates.set(providerName, created);
    return created;
  }

  private refreshCircuitState(
    providerName: string,
    breaker: BreakerState,
    requestTelemetry: RoutingTelemetryEvent[],
  ): CircuitState {
    if (breaker.state !== 'open') {
      return breaker.state;
    }
    if (breaker.openedAtMs === null) {
      return breaker.state;
    }
    if ((this.now() - breaker.openedAtMs) < this.breakerSettings.cooldownMs) {
      return 'open';
    }
    breaker.state = 'half_open';
    breaker.probeInFlight = false;
    this.emitBreakerTransition(providerName, 'open', 'half_open', requestTelemetry);
    return breaker.state;
  }

  private resolvePolicyGateReason(rolloutApplied: boolean): RoutingReasonCode | null {
    if (!this.flags.policyEnabled) {
      return RoutingReasonCode.LEGACY_POLICY_DISABLED;
    }
    if (this.flags.shadowMode) {
      return RoutingReasonCode.LEGACY_SHADOW_MODE;
    }
    if (!rolloutApplied) {
      return RoutingReasonCode.LEGACY_ROLLOUT_GATE;
    }
    return null;
  }

  private shouldApplyPolicy(reference: string): boolean {
    if (!this.flags.policyEnabled) {
      return false;
    }
    if (this.flags.rolloutPercent >= 100) {
      return true;
    }
    if (this.flags.rolloutPercent <= 0) {
      return false;
    }
    return this.bucket(reference) < this.flags.rolloutPercent;
  }

  private bucket(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = ((hash * 31) + input.charCodeAt(i)) % 100;
    }
    return Math.abs(hash);
  }

  private getProfile(providerName: string): ProviderProfile {
    return this.profiles[providerName] ?? {
      successRate: 0.95,
      latencyMs: 250,
      feePercent: 2.5,
      riskScore: 20,
    };
  }

  private emitBreakerTransition(
    providerName: string,
    from: CircuitState,
    to: CircuitState,
    requestTelemetry: RoutingTelemetryEvent[],
  ): void {
    this.emitTelemetry('routing.breaker.transition', { provider: providerName, from, to }, requestTelemetry);
  }

  private emitTelemetry(
    event: string,
    payload: Record<string, unknown>,
    requestTelemetry?: RoutingTelemetryEvent[],
  ): void {
    requestTelemetry?.push({
      eventType: event,
      occurredAt: new Date(this.now()).toISOString(),
      payload,
    });
    this.telemetrySink?.(event, payload);
    this.logger.log(`${event} ${JSON.stringify(payload)}`);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private round4(value: number): number {
    return Math.round(value * 10000) / 10000;
  }
}
