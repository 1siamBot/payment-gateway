import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  Prisma,
  RefundStatus,
  TransactionStatus,
  TransactionType,
  WebhookDeliveryStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderRouterService } from '../providers/provider-router.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { CallbackDto } from './dto/callback.dto';
import { PaymentCallbackGuardService } from './payment-callback-guard.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsDto } from './dto/list-payments.dto';
import {
  normalizePaymentAttemptTimelineAuditLogs,
  type PaymentAttemptTimelineErrorCode,
  type PaymentAttemptTimelineEvent,
} from './payment-attempt-timeline-normalizer';

type PaymentResponse = {
  reference: string;
  status: TransactionStatus;
  provider: string | null;
};

type RoutingTelemetryFeed = {
  reference: string;
  transactionId: string;
  decision: {
    provider: string | null;
    algorithm: string | null;
    reasonCode: string | null;
    failovers: string[];
    marginKpi: Record<string, unknown> | null;
    scores: Array<Record<string, unknown>>;
    rolloutApplied: boolean | null;
    shadowMode: boolean | null;
    usedLegacyPath: boolean | null;
  } | null;
  failover: {
    sequence: string[];
    events: Array<{
      occurredAt: string;
      failedProvider: string | null;
      failoverCount: number | null;
    }>;
  };
  breaker: {
    providerStates: Array<{
      providerName: string;
      circuitState: string;
    }>;
    transitions: Array<{
      occurredAt: string;
      provider: string | null;
      from: string | null;
      to: string | null;
    }>;
  };
  events: Array<{
    eventType: string;
    occurredAt: string;
    metadata: Record<string, unknown>;
  }>;
};

type ObservabilitySegment = 'emerging' | 'growth' | 'enterprise';

type ObservabilityQuery = {
  merchantId: string;
  provider?: string;
  segment?: ObservabilitySegment;
  timeframeHours?: number;
  take?: number;
};

type RefundResponse = {
  id: string;
  paymentReference: string;
  merchantId: string;
  amount: number;
  currency: string;
  reason: string | null;
  status: RefundStatus;
  createdAt: string;
  updatedAt: string;
  transition: {
    fromStatus: RefundStatus | null;
    toStatus: RefundStatus;
    reasonCode: RefundLifecycleEventReasonCode;
    occurredAt: string;
  };
  lifecycle: {
    contract: 'refund-lifecycle.v1';
    currentStatus: RefundStatus;
    terminal: boolean;
    allowedNextStatuses: RefundStatus[];
    reasonCodes: {
      duplicateRequest: 'duplicate_request';
      invalidPriorState: 'invalid_prior_state';
      staleUpdate: 'stale_update';
    };
    httpStatusByReason: {
      duplicate_request: 409;
      invalid_prior_state: 409;
      stale_update: 409;
    };
  };
};

type RefundLifecycleConflictReason = 'duplicate_request' | 'invalid_prior_state' | 'stale_update';
type RefundLifecycleEventReasonCode = 'refund_requested' | 'refund_processing' | 'refund_succeeded' | 'refund_failed';
type RefundTransitionTargetStatus = Exclude<RefundStatus, 'REQUESTED'>;
type PayoutChargebackStatus = 'opened' | 'investigating' | 'won' | 'lost' | 'reversed';
type PayoutChargebackLifecycleConflictReason = 'duplicate_event' | 'invalid_prior_state' | 'stale_transition_update';
type PayoutChargebackLifecycleEventReasonCode =
  | 'chargeback_opened'
  | 'chargeback_investigating'
  | 'chargeback_won'
  | 'chargeback_lost'
  | 'payout_reversed';

type PayoutChargebackTransition = {
  fromStatus: PayoutChargebackStatus | null;
  toStatus: PayoutChargebackStatus;
  eventId: string;
  reasonCode: PayoutChargebackLifecycleEventReasonCode;
  occurredAt: string;
};

type PayoutChargebackLifecycleResponse = {
  paymentReference: string;
  transactionId: string;
  merchantId: string;
  transition: PayoutChargebackTransition | null;
  timeline: PayoutChargebackTransition[];
  lifecycle: {
    contract: 'payout-chargeback-transition.v1';
    currentStatus: PayoutChargebackStatus | null;
    terminal: boolean;
    allowedNextStatuses: PayoutChargebackStatus[];
    reasonCodes: {
      duplicateEvent: 'duplicate_event';
      invalidPriorState: 'invalid_prior_state';
      staleTransitionUpdate: 'stale_transition_update';
    };
    httpStatusByReason: {
      duplicate_event: 409;
      invalid_prior_state: 409;
      stale_transition_update: 409;
    };
  };
};

const REFUND_LIFECYCLE_TRANSITIONS: Record<RefundStatus, RefundStatus[]> = {
  REQUESTED: [RefundStatus.PROCESSING],
  PROCESSING: [RefundStatus.SUCCEEDED, RefundStatus.FAILED],
  SUCCEEDED: [],
  FAILED: [],
};

const REFUND_LIFECYCLE_EVENT_REASON_CODES: Record<RefundStatus, RefundLifecycleEventReasonCode> = {
  REQUESTED: 'refund_requested',
  PROCESSING: 'refund_processing',
  SUCCEEDED: 'refund_succeeded',
  FAILED: 'refund_failed',
};

const PAYOUT_CHARGEBACK_TRANSITIONS: Record<PayoutChargebackStatus, PayoutChargebackStatus[]> = {
  opened: ['investigating', 'reversed'],
  investigating: ['won', 'lost', 'reversed'],
  won: [],
  lost: [],
  reversed: [],
};

const PAYOUT_CHARGEBACK_EVENT_REASON_CODES: Record<PayoutChargebackStatus, PayoutChargebackLifecycleEventReasonCode> = {
  opened: 'chargeback_opened',
  investigating: 'chargeback_investigating',
  won: 'chargeback_won',
  lost: 'chargeback_lost',
  reversed: 'payout_reversed',
};

type PaymentAttemptTimelineResponse = {
  paymentReference: string;
  transactionId: string;
  merchantId: string;
  finalStatus: TransactionStatus;
  events: PaymentAttemptTimelineEvent[];
  summary: {
    eventCount: number;
    malformedCount: number;
    emptyTimeline: boolean;
  };
  normalization: {
    contract: 'payment-attempt-timeline.v2';
    malformedByCode: Record<PaymentAttemptTimelineErrorCode, number>;
    errorCodeMap: Array<{
      code: PaymentAttemptTimelineErrorCode;
      description: string;
      remediationHint: string;
    }>;
  };
};

type PaymentStatusSnapshotResponse = {
  reference: string;
  transactionId: string;
  merchantId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  providerName: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  callbacks: {
    total: number;
    lastEventId: string | null;
    lastStatus: string | null;
    lastReceivedAt: string | null;
  };
  webhooks: {
    total: number;
    delivered: number;
    pending: number;
    failed: number;
    lastEventType: string | null;
    lastStatus: WebhookDeliveryStatus | null;
    lastAttemptAt: string | null;
  };
};

@Injectable()
export class PaymentsService {
  private readonly defaultCallbackGuard = new PaymentCallbackGuardService();

  constructor(
    private readonly prisma: PrismaService,
    private readonly router: ProviderRouterService,
    @Optional() private readonly webhooks?: WebhooksService,
    @Optional() private readonly callbackGuard?: PaymentCallbackGuardService,
  ) {}

  async initiatePayment(input: CreatePaymentDto): Promise<PaymentResponse> {
    await this.assertMerchantExists(input.merchantId);

    const scope = `${input.merchantId}:${input.type}`;
    const existingKey = await this.prisma.idempotencyKey.findUnique({
      where: { scope_key: { scope, key: input.idempotencyKey } },
    });

    if (existingKey) {
      return JSON.parse(existingKey.responseBody) as PaymentResponse;
    }

    const reference = randomUUID();
    const type = input.type === 'deposit' ? TransactionType.DEPOSIT : TransactionType.WITHDRAW;
    const amountDecimal = new Prisma.Decimal(input.amount);
    const customerId = await this.resolveCustomerId(input.merchantId, input.customer);

    const created = await this.prisma.transaction.create({
      data: {
        merchantId: input.merchantId,
        customerId,
        type,
        amount: amountDecimal,
        currency: input.currency.toUpperCase(),
        reference,
        status: TransactionStatus.CREATED,
      },
    });

    await this.logTransition(created.id, null, TransactionStatus.CREATED, 'payment intent created');

    const route = await this.router.initiateWithFailover({
      amount: input.amount,
      currency: input.currency,
      type,
      reference,
    });

    if (route.decision) {
      await this.prisma.auditLog.create({
        data: {
          eventType: 'routing.decision',
          actor: 'system',
          entityType: 'transaction',
          entityId: created.id,
          metadata: JSON.stringify({
            provider: route.providerName,
            reasonCode: route.decision.reasonCode,
            scores: route.decision.scores,
            failovers: route.decision.failovers,
            marginKpi: route.decision.marginKpi,
            algorithm: route.decision.algorithm,
            rolloutApplied: route.decision.rolloutApplied,
            shadowMode: route.decision.shadowMode,
            usedLegacyPath: route.decision.usedLegacyPath,
          }),
        },
      });
    }

    if (route.telemetry?.length) {
      for (const telemetryEvent of route.telemetry) {
        if (telemetryEvent.eventType === 'routing.decision') {
          continue;
        }
        await this.prisma.auditLog.create({
          data: {
            eventType: telemetryEvent.eventType,
            actor: 'system',
            entityType: 'transaction',
            entityId: created.id,
            metadata: JSON.stringify({
              ...telemetryEvent.payload,
              occurredAt: telemetryEvent.occurredAt,
            }),
          },
        });
      }
    }

    const updated = await this.prisma.transaction.update({
      where: { id: created.id },
      data: {
        providerName: route.providerName,
        externalRef: route.externalRef,
        status: TransactionStatus.PENDING,
      },
    });

    await this.logTransition(updated.id, TransactionStatus.CREATED, TransactionStatus.PENDING, 'routed to provider');

    const response: PaymentResponse = {
      reference: updated.reference,
      status: updated.status,
      provider: route.providerName,
    };

    await this.prisma.idempotencyKey.create({
      data: {
        scope,
        key: input.idempotencyKey,
        responseBody: JSON.stringify(response),
      },
    });

    return response;
  }

  async getTransaction(reference: string, actorMerchantId?: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { reference },
      include: {
        audits: { orderBy: { createdAt: 'asc' } },
        customer: true,
      },
    });

    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    this.assertMerchantScope(tx.merchantId, actorMerchantId);

    return tx;
  }

  async getPaymentStatus(reference: string, actorMerchantId?: string): Promise<PaymentStatusSnapshotResponse> {
    const tx = await this.prisma.transaction.findUnique({
      where: { reference },
      include: {
        callbackEvents: {
          orderBy: { createdAt: 'desc' },
        },
        webhookDeliveries: {
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    this.assertMerchantScope(tx.merchantId, actorMerchantId);

    const latestCallback = tx.callbackEvents[0] ?? null;
    const latestWebhook = tx.webhookDeliveries[0] ?? null;

    return {
      reference: tx.reference,
      transactionId: tx.id,
      merchantId: tx.merchantId,
      type: tx.type,
      status: tx.status,
      amount: Number(tx.amount),
      currency: tx.currency,
      providerName: tx.providerName,
      failureReason: tx.failureReason,
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
      callbacks: {
        total: tx.callbackEvents.length,
        lastEventId: latestCallback?.eventId ?? null,
        lastStatus: latestCallback?.status ?? null,
        lastReceivedAt: latestCallback?.createdAt.toISOString() ?? null,
      },
      webhooks: {
        total: tx.webhookDeliveries.length,
        delivered: tx.webhookDeliveries.filter((row) => row.status === WebhookDeliveryStatus.DELIVERED).length,
        pending: tx.webhookDeliveries.filter((row) => row.status === WebhookDeliveryStatus.PENDING).length,
        failed: tx.webhookDeliveries.filter((row) => row.status === WebhookDeliveryStatus.FAILED).length,
        lastEventType: latestWebhook?.eventType ?? null,
        lastStatus: latestWebhook?.status ?? null,
        lastAttemptAt: latestWebhook?.updatedAt.toISOString() ?? null,
      },
    };
  }

  async getRoutingTelemetry(reference: string, actorMerchantId?: string): Promise<RoutingTelemetryFeed> {
    const tx = await this.prisma.transaction.findUnique({
      where: { reference },
    });

    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    this.assertMerchantScope(tx.merchantId, actorMerchantId);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        entityType: 'transaction',
        entityId: tx.id,
      },
      orderBy: { createdAt: 'asc' },
    });

    return this.buildRoutingTelemetryFeed(reference, tx.id, logs);
  }

  async getPaymentAttemptTimeline(
    reference: string,
    actorMerchantId?: string,
  ): Promise<PaymentAttemptTimelineResponse> {
    const tx = await this.prisma.transaction.findUnique({
      where: { reference },
    });

    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    this.assertMerchantScope(tx.merchantId, actorMerchantId);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        entityType: 'transaction',
        entityId: tx.id,
      },
      orderBy: { createdAt: 'asc' },
    });

    const normalizedTimeline = normalizePaymentAttemptTimelineAuditLogs(logs);

    return {
      paymentReference: tx.reference,
      transactionId: tx.id,
      merchantId: tx.merchantId,
      finalStatus: tx.status,
      events: normalizedTimeline.events,
      summary: {
        eventCount: normalizedTimeline.events.length,
        malformedCount: normalizedTimeline.malformedCount,
        emptyTimeline: normalizedTimeline.events.length === 0,
      },
      normalization: normalizedTimeline.normalization,
    };
  }

  async getObservabilityDashboard(query: ObservabilityQuery, actorMerchantId?: string) {
    this.assertMerchantScope(query.merchantId, actorMerchantId);

    if (!query.merchantId) {
      throw new BadRequestException('merchantId is required');
    }
    await this.assertMerchantExists(query.merchantId);

    const timeframeHours = this.clampInteger(query.timeframeHours, 24, 1, 24 * 7);
    const take = this.clampInteger(query.take, 250, 1, 500);
    const since = new Date(Date.now() - (timeframeHours * 60 * 60 * 1000));

    const scopedTransactions = await this.prisma.transaction.findMany({
      where: {
        merchantId: query.merchantId,
        createdAt: { gte: since },
      },
      select: {
        id: true,
        reference: true,
        amount: true,
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    const transactions = scopedTransactions.filter((tx) => {
      if (!query.segment) return true;
      return this.resolveSegment(tx.amount) === query.segment;
    });

    if (!transactions.length) {
      return {
        merchantId: query.merchantId,
        timeframeHours,
        summary: {
          analyzedTransactions: 0,
          decisions: 0,
        },
        providers: [],
        alerts: [],
        decisions: [],
        failovers: [],
        breakerTransitions: [],
        margins: [],
      };
    }

    const transactionById = new Map(transactions.map((tx) => [tx.id, tx]));
    const routingLogs = await this.prisma.auditLog.findMany({
      where: {
        entityType: 'transaction',
        entityId: { in: [...transactionById.keys()] },
        eventType: { startsWith: 'routing.' },
      },
      orderBy: { createdAt: 'asc' },
    });

    const logsByTransaction = new Map<string, typeof routingLogs>();
    for (const log of routingLogs) {
      const bucket = logsByTransaction.get(log.entityId) ?? [];
      bucket.push(log);
      logsByTransaction.set(log.entityId, bucket);
    }

    const providerSet = new Set<string>();
    const marginByProvider = new Map<string, {
      decisionCount: number;
      failedAttempts: number;
      feeTotal: number;
      feeSamples: number;
      weightedScoreTotal: number;
      weightedScoreSamples: number;
    }>();
    const decisions: Array<{
      at: string;
      reference: string;
      provider: string;
      reasonCode: string;
      algorithm: string;
      score: number | null;
      failoverCount: number;
      estimatedFeePercent: number | null;
      weightedScore: number | null;
    }> = [];
    const failovers: Array<{
      at: string;
      reference: string;
      from: string;
      to: string;
      failoverCount: number;
      reasonCode: string;
    }> = [];
    const breakerTransitions: Array<{
      at: string;
      reference: string;
      provider: string;
      from: string;
      to: string;
    }> = [];

    for (const tx of transactions) {
      const logs = logsByTransaction.get(tx.id) ?? [];
      if (!logs.length) continue;

      const feed = this.buildRoutingTelemetryFeed(tx.reference, tx.id, logs);
      const decision = feed.decision;
      const provider = decision?.provider;
      if (!provider) continue;
      if (query.provider && provider !== query.provider) continue;

      providerSet.add(provider);
      const decisionScore = decision.scores.find((score) => this.getStringValue(score.providerName) === provider);
      const scoreValue = this.getNumberValue(decisionScore?.score);
      const estimatedFeePercent = this.getNumberValue(decision.marginKpi?.estimatedFeePercent);
      const weightedScore = this.getNumberValue(decision.marginKpi?.weightedScore);

      decisions.push({
        at: feed.events.find((event) => event.eventType === 'routing.decision')?.occurredAt ?? new Date().toISOString(),
        reference: tx.reference,
        provider,
        reasonCode: decision.reasonCode ?? 'unknown',
        algorithm: decision.algorithm ?? 'unknown',
        score: scoreValue,
        failoverCount: feed.failover.sequence.length,
        estimatedFeePercent,
        weightedScore,
      });

      const providerMargin = marginByProvider.get(provider) ?? {
        decisionCount: 0,
        failedAttempts: 0,
        feeTotal: 0,
        feeSamples: 0,
        weightedScoreTotal: 0,
        weightedScoreSamples: 0,
      };
      providerMargin.decisionCount += 1;
      if (estimatedFeePercent !== null) {
        providerMargin.feeTotal += estimatedFeePercent;
        providerMargin.feeSamples += 1;
      }
      if (weightedScore !== null) {
        providerMargin.weightedScoreTotal += weightedScore;
        providerMargin.weightedScoreSamples += 1;
      }
      marginByProvider.set(provider, providerMargin);

      for (const event of feed.failover.events) {
        if (!event.failedProvider) continue;
        providerSet.add(event.failedProvider);
        const failedMargin = marginByProvider.get(event.failedProvider) ?? {
          decisionCount: 0,
          failedAttempts: 0,
          feeTotal: 0,
          feeSamples: 0,
          weightedScoreTotal: 0,
          weightedScoreSamples: 0,
        };
        failedMargin.failedAttempts += 1;
        marginByProvider.set(event.failedProvider, failedMargin);

        failovers.push({
          at: event.occurredAt,
          reference: tx.reference,
          from: event.failedProvider,
          to: provider,
          failoverCount: event.failoverCount ?? 0,
          reasonCode: decision.reasonCode ?? 'unknown',
        });
      }

      for (const transition of feed.breaker.transitions) {
        if (!transition.provider || !transition.from || !transition.to) continue;
        providerSet.add(transition.provider);
        breakerTransitions.push({
          at: transition.occurredAt,
          reference: tx.reference,
          provider: transition.provider,
          from: transition.from,
          to: transition.to,
        });
      }
    }

    const margins = [...marginByProvider.entries()]
      .map(([provider, metric]) => {
        const attempts = metric.decisionCount + metric.failedAttempts;
        const failureRate = attempts > 0 ? (metric.failedAttempts / attempts) * 100 : 0;
        return {
          provider,
          decisionCount: metric.decisionCount,
          failedAttempts: metric.failedAttempts,
          failureRate,
          estimatedFeePercent: metric.feeSamples > 0 ? metric.feeTotal / metric.feeSamples : null,
          weightedScore: metric.weightedScoreSamples > 0 ? metric.weightedScoreTotal / metric.weightedScoreSamples : null,
        };
      })
      .sort((a, b) => b.decisionCount - a.decisionCount);

    const alerts = margins.flatMap((metric) => {
      const rows: Array<{ type: 'warning' | 'error'; message: string }> = [];
      if (metric.failureRate >= 25) {
        rows.push({
          type: 'error',
          message: `${metric.provider}: failover pressure ${metric.failureRate.toFixed(1)}%`,
        });
      }
      if (metric.weightedScore !== null && metric.weightedScore < 0.75) {
        rows.push({
          type: 'warning',
          message: `${metric.provider}: weighted score dropped to ${metric.weightedScore.toFixed(2)}`,
        });
      }
      return rows;
    });

    return {
      merchantId: query.merchantId,
      timeframeHours,
      summary: {
        analyzedTransactions: transactions.length,
        decisions: decisions.length,
      },
      providers: [...providerSet].sort(),
      alerts,
      decisions: decisions.sort((a, b) => this.sortByTimestampDesc(a.at, b.at)).slice(0, 50),
      failovers: failovers.sort((a, b) => this.sortByTimestampDesc(a.at, b.at)).slice(0, 50),
      breakerTransitions: breakerTransitions.sort((a, b) => this.sortByTimestampDesc(a.at, b.at)).slice(0, 50),
      margins,
    };
  }

  async listTransactions(filters: {
    merchantId?: string;
    shopId?: string;
    status?: TransactionStatus;
    type?: TransactionType;
    reference?: string;
    take?: number;
  }, actorMerchantId?: string) {
    const merchantId = filters.merchantId ?? filters.shopId;
    if (!merchantId) {
      throw new BadRequestException('merchantId is required');
    }

    this.assertMerchantScope(merchantId, actorMerchantId);
    await this.assertMerchantExists(merchantId);

    return this.prisma.transaction.findMany({
      where: {
        merchantId,
        status: filters.status,
        type: filters.type,
        reference: filters.reference ? { contains: filters.reference } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: filters.take ?? 20,
    });
  }

  async listPayments(query: ListPaymentsDto) {
    if (query.merchantId) {
      await this.assertMerchantExists(query.merchantId);
    }

    const where: Prisma.TransactionWhereInput = {
      ...(query.merchantId ? { merchantId: query.merchantId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.reference ? { reference: { contains: query.reference } } : {}),
    };

    const rows = await this.prisma.transaction.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 20,
    });

    return rows.map((row) => ({
      reference: row.reference,
      merchantId: row.merchantId,
      customerId: row.customerId,
      customerName: row.customer?.name ?? null,
      customerEmail: row.customer?.email ?? null,
      type: row.type,
      status: row.status,
      amount: row.amount,
      currency: row.currency,
      providerName: row.providerName,
      failureReason: row.failureReason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async searchCustomers(merchantId: string, query?: string, actorMerchantId?: string) {
    this.assertMerchantScope(merchantId, actorMerchantId);
    await this.assertMerchantExists(merchantId);

    if (!query) {
      return this.prisma.customer.findMany({
        where: { merchantId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }

    return this.prisma.customer.findMany({
      where: {
        merchantId,
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
          { externalId: { contains: query } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async customerPaymentHistory(customerId: string, merchantId: string, actorMerchantId?: string) {
    this.assertMerchantScope(merchantId, actorMerchantId);
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, merchantId },
      include: {
        txns: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return {
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        externalId: customer.externalId,
      },
      payments: customer.txns,
    };
  }

  async createRefund(
    reference: string,
    idempotencyKey: string,
    reason?: string,
    actorMerchantId?: string,
  ): Promise<RefundResponse> {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('idempotencyKey is required');
    }

    const tx = await this.prisma.transaction.findUnique({ where: { reference } });

    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    this.assertMerchantScope(tx.merchantId, actorMerchantId);

    const normalizedIdempotencyKey = idempotencyKey.trim();
    const existingByKey = await this.prisma.refund.findUnique({
      where: {
        merchantId_idempotencyKey: {
          merchantId: tx.merchantId,
          idempotencyKey: normalizedIdempotencyKey,
        },
      },
      include: {
        transaction: {
          select: { reference: true },
        },
      },
    });

    if (existingByKey) {
      this.throwRefundLifecycleConflict('duplicate_request', {
        idempotencyKey: normalizedIdempotencyKey,
        existingPaymentReference: existingByKey.transaction.reference,
        requestedPaymentReference: reference,
      });
    }

    const existingByPayment = await this.prisma.refund.findUnique({
      where: { transactionId: tx.id },
      include: {
        transaction: {
          select: { reference: true },
        },
      },
    });

    if (existingByPayment) {
      this.throwRefundLifecycleConflict('duplicate_request', {
        paymentReference: reference,
        refundId: existingByPayment.id,
      });
    }

    if (tx.status !== TransactionStatus.PAID) {
      this.throwRefundLifecycleConflict('invalid_prior_state', {
        paymentReference: reference,
        transactionStatus: tx.status,
        expectedTransactionStatus: TransactionStatus.PAID,
      });
    }

    const created = await this.prisma.refund.create({
      data: {
        transactionId: tx.id,
        merchantId: tx.merchantId,
        idempotencyKey: normalizedIdempotencyKey,
        amount: tx.amount,
        currency: tx.currency,
        reason: reason ?? null,
        status: RefundStatus.REQUESTED,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'refund.transition',
        actor: 'system',
        entityType: 'refund',
        entityId: created.id,
        metadata: JSON.stringify({
          fromStatus: null,
          toStatus: created.status,
          reasonCode: REFUND_LIFECYCLE_EVENT_REASON_CODES[created.status],
          paymentReference: reference,
        }),
      },
    });

    await this.webhooks?.queueTransactionWebhook(tx.id, 'payment.refund_requested');

    return this.toRefundResponse(created, reference, {
      fromStatus: null,
      toStatus: created.status,
      occurredAt: created.updatedAt,
    });
  }

  async transitionRefund(
    refundId: string,
    toStatus: RefundTransitionTargetStatus,
    expectedCurrentStatus?: RefundStatus,
    reason?: string,
    actorMerchantId?: string,
  ): Promise<RefundResponse> {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        transaction: {
          select: {
            id: true,
            reference: true,
            status: true,
            merchantId: true,
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    this.assertMerchantScope(refund.merchantId, actorMerchantId);

    if (expectedCurrentStatus && expectedCurrentStatus !== refund.status) {
      this.throwRefundLifecycleConflict('stale_update', {
        refundId,
        expectedCurrentStatus,
        currentStatus: refund.status,
      });
    }

    const allowedTransitions = REFUND_LIFECYCLE_TRANSITIONS[refund.status];
    if (!allowedTransitions.includes(toStatus)) {
      this.throwRefundLifecycleConflict('invalid_prior_state', {
        refundId,
        currentStatus: refund.status,
        requestedStatus: toStatus,
        allowedNextStatuses: allowedTransitions,
      });
    }

    const updated = await this.prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: toStatus,
        reason: reason ?? refund.reason,
      },
    });

    if (toStatus === RefundStatus.SUCCEEDED) {
      await this.prisma.transaction.update({
        where: { id: refund.transactionId },
        data: {
          status: TransactionStatus.REFUNDED,
          failureReason: null,
        },
      });
      await this.logTransition(
        refund.transactionId,
        refund.transaction.status,
        TransactionStatus.REFUNDED,
        `refund:${refund.id}:succeeded`,
      );
      await this.webhooks?.queueTransactionWebhook(refund.transactionId, 'payment.refunded');
    }

    if (toStatus === RefundStatus.FAILED) {
      await this.webhooks?.queueTransactionWebhook(refund.transactionId, 'payment.refund_failed');
    }

    await this.prisma.auditLog.create({
      data: {
        eventType: 'refund.transition',
        actor: 'system',
        entityType: 'refund',
        entityId: updated.id,
        metadata: JSON.stringify({
          fromStatus: refund.status,
          toStatus,
          reasonCode: REFUND_LIFECYCLE_EVENT_REASON_CODES[toStatus],
          paymentReference: refund.transaction.reference,
        }),
      },
    });

    return this.toRefundResponse(updated, refund.transaction.reference, {
      fromStatus: refund.status,
      toStatus: updated.status,
      occurredAt: updated.updatedAt,
    });
  }

  async getPayoutChargebackLifecycle(
    reference: string,
    actorMerchantId?: string,
  ): Promise<PayoutChargebackLifecycleResponse> {
    const tx = await this.prisma.transaction.findUnique({ where: { reference } });
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    this.assertMerchantScope(tx.merchantId, actorMerchantId);
    const timeline = await this.getPayoutChargebackTimeline(tx.id);
    const currentStatus = timeline[timeline.length - 1]?.toStatus ?? null;

    return {
      paymentReference: tx.reference,
      transactionId: tx.id,
      merchantId: tx.merchantId,
      transition: timeline[timeline.length - 1] ?? null,
      timeline,
      lifecycle: {
        contract: 'payout-chargeback-transition.v1',
        currentStatus,
        terminal: currentStatus ? PAYOUT_CHARGEBACK_TRANSITIONS[currentStatus].length === 0 : false,
        allowedNextStatuses: this.resolvePayoutChargebackAllowedNextStatuses(currentStatus),
        reasonCodes: {
          duplicateEvent: 'duplicate_event',
          invalidPriorState: 'invalid_prior_state',
          staleTransitionUpdate: 'stale_transition_update',
        },
        httpStatusByReason: {
          duplicate_event: 409,
          invalid_prior_state: 409,
          stale_transition_update: 409,
        },
      },
    };
  }

  async transitionPayoutChargeback(
    reference: string,
    input: {
      toStatus: PayoutChargebackStatus;
      eventId: string;
      expectedCurrentStatus?: PayoutChargebackStatus;
      occurredAt?: string;
    },
    actorMerchantId?: string,
  ): Promise<PayoutChargebackLifecycleResponse> {
    const tx = await this.prisma.transaction.findUnique({ where: { reference } });
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    this.assertMerchantScope(tx.merchantId, actorMerchantId);
    const eventId = input.eventId.trim();
    if (!eventId) {
      throw new BadRequestException('eventId is required');
    }

    const timeline = await this.getPayoutChargebackTimeline(tx.id);
    const currentStatus = timeline[timeline.length - 1]?.toStatus ?? null;

    if (timeline.some((row) => row.eventId === eventId)) {
      this.throwPayoutChargebackLifecycleConflict('duplicate_event', {
        paymentReference: reference,
        transactionId: tx.id,
        eventId,
      });
    }

    if (input.expectedCurrentStatus && input.expectedCurrentStatus !== currentStatus) {
      this.throwPayoutChargebackLifecycleConflict('stale_transition_update', {
        paymentReference: reference,
        transactionId: tx.id,
        expectedCurrentStatus: input.expectedCurrentStatus,
        currentStatus,
      });
    }

    const allowedNextStatuses = this.resolvePayoutChargebackAllowedNextStatuses(currentStatus);
    if (!allowedNextStatuses.includes(input.toStatus)) {
      this.throwPayoutChargebackLifecycleConflict('invalid_prior_state', {
        paymentReference: reference,
        transactionId: tx.id,
        currentStatus,
        requestedStatus: input.toStatus,
        allowedNextStatuses,
      });
    }

    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('occurredAt must be a valid ISO datetime string');
    }

    await this.prisma.auditLog.create({
      data: {
        eventType: 'chargeback.transition',
        actor: 'system',
        entityType: 'transaction',
        entityId: tx.id,
        metadata: JSON.stringify({
          fromStatus: currentStatus,
          toStatus: input.toStatus,
          eventId,
          reasonCode: PAYOUT_CHARGEBACK_EVENT_REASON_CODES[input.toStatus],
          occurredAt: occurredAt.toISOString(),
        }),
      },
    });

    return this.getPayoutChargebackLifecycle(reference, actorMerchantId);
  }

  async listRefunds(filters: {
    merchantId?: string;
    paymentReference?: string;
    take?: number;
  }, actorMerchantId?: string): Promise<RefundResponse[]> {
    const merchantId = filters.merchantId ?? actorMerchantId;
    if (merchantId) {
      this.assertMerchantScope(merchantId, actorMerchantId);
      await this.assertMerchantExists(merchantId);
    }

    const refunds = await this.prisma.refund.findMany({
      where: {
        merchantId,
        transaction: filters.paymentReference ? { reference: { contains: filters.paymentReference } } : undefined,
      },
      include: {
        transaction: {
          select: { reference: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters.take ?? 20,
    });

    return refunds.map((refund) => this.toRefundResponse(refund, refund.transaction.reference));
  }

  async getRefund(refundId: string, actorMerchantId?: string): Promise<RefundResponse> {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        transaction: {
          select: { reference: true },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    this.assertMerchantScope(refund.merchantId, actorMerchantId);
    return this.toRefundResponse(refund, refund.transaction.reference);
  }

  async manualRefund(reference: string, reason?: string, actorMerchantId?: string) {
    return this.createRefund(reference, `legacy-${reference}`, reason, actorMerchantId);
  }

  async handleCallback(input: CallbackDto): Promise<{ applied: boolean; status: string }> {
    const callbackGuard = this.callbackGuard ?? this.defaultCallbackGuard;
    const normalized = callbackGuard.normalizePayload(input);
    callbackGuard.verifySignature(normalized);

    const tx = await this.prisma.transaction.findUnique({
      where: { reference: normalized.transactionReference },
      include: {
        callbackEvents: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    const duplicate = await this.prisma.callbackEvent.findUnique({
      where: {
        providerName_eventId: {
          providerName: normalized.provider,
          eventId: normalized.replayKey,
        },
      },
    });

    if (duplicate) {
      callbackGuard.throwReplayDuplicate(normalized.replayKey);
    }

    const latestCallback = tx.callbackEvents[0];
    const latestEventTimestamp = latestCallback
      ? callbackGuard.resolveLatestEventTimestamp(latestCallback.payload, latestCallback.createdAt)
      : null;
    const incomingEventTimestamp = normalized.eventTimestamp;

    if (callbackGuard.shouldRejectAsStale({
      transactionStatus: tx.status,
      incomingStatus: normalized.status,
      latestEventTimestamp,
      incomingEventTimestamp,
    })) {
      callbackGuard.throwStaleEvent({
        transactionStatus: tx.status,
        latestEventTimestamp,
        incomingEventTimestamp,
        incomingStatus: normalized.status,
      });
    }

    const targetStatus = normalized.status === 'succeeded' ? TransactionStatus.PAID : TransactionStatus.FAILED;

    await this.prisma.callbackEvent.create({
      data: {
        transactionId: tx.id,
        providerName: normalized.provider,
        eventId: normalized.replayKey,
        status: normalized.status,
        payload: JSON.stringify({
          ...input,
          replayKey: normalized.replayKey,
          eventTimestamp: normalized.eventTimestamp?.toISOString() ?? null,
          sourceEventId: normalized.eventId,
        }),
      },
    });

    if (
      tx.status === TransactionStatus.PAID
      || tx.status === TransactionStatus.FAILED
      || tx.status === TransactionStatus.REFUNDED
    ) {
      return { applied: false, status: tx.status };
    }

    const updated = await this.prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status: targetStatus,
        failureReason: targetStatus === TransactionStatus.FAILED ? 'provider_callback_failed' : null,
      },
    });

    await this.logTransition(tx.id, tx.status, targetStatus, `callback:${normalized.eventId}`);

    const eventType = targetStatus === TransactionStatus.PAID ? 'payment.paid' : 'payment.failed';
    await this.webhooks?.queueTransactionWebhook(tx.id, eventType);

    return { applied: true, status: updated.status };
  }

  private async assertMerchantExists(merchantId: string): Promise<void> {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }
  }

  private assertMerchantScope(targetMerchantId: string, actorMerchantId?: string): void {
    if (!actorMerchantId) {
      return;
    }
    if (actorMerchantId !== targetMerchantId) {
      throw new ForbiddenException('Merchant is not allowed to access this resource');
    }
  }

  private buildRoutingTelemetryFeed(
    reference: string,
    transactionId: string,
    logs: Array<{ eventType: string; createdAt: Date; metadata: string }>,
  ): RoutingTelemetryFeed {
    const routingEvents = logs
      .filter((log) => log.eventType.startsWith('routing.'))
      .map((log) => {
        const metadata = this.parseAuditMetadata(log.metadata);
        const occurredAt = this.getDateValue(metadata.occurredAt) ?? log.createdAt.toISOString();
        return {
          eventType: log.eventType,
          occurredAt,
          metadata,
        };
      });

    const decisionEvent = [...routingEvents].reverse().find((event) => event.eventType === 'routing.decision');
    const decisionMetadata = decisionEvent?.metadata ?? {};
    const scores = Array.isArray(decisionMetadata.scores)
      ? (decisionMetadata.scores as Array<Record<string, unknown>>)
      : [];
    const failovers = Array.isArray(decisionMetadata.failovers)
      ? decisionMetadata.failovers.filter((value): value is string => typeof value === 'string')
      : [];

    const failoverEvents = routingEvents
      .filter((event) => event.eventType === 'routing.failover')
      .map((event) => ({
        occurredAt: event.occurredAt,
        failedProvider: this.getStringValue(event.metadata.failedProvider),
        failoverCount: this.getNumberValue(event.metadata.failoverCount),
      }));

    const breakerTransitions = routingEvents
      .filter((event) => event.eventType === 'routing.breaker.transition')
      .map((event) => ({
        occurredAt: event.occurredAt,
        provider: this.getStringValue(event.metadata.provider),
        from: this.getStringValue(event.metadata.from),
        to: this.getStringValue(event.metadata.to),
      }));

    const providerStates = scores
      .map((score) => ({
        providerName: this.getStringValue(score.providerName),
        circuitState: this.getStringValue(score.circuitState),
      }))
      .filter((score): score is { providerName: string; circuitState: string } => Boolean(score.providerName && score.circuitState));

    return {
      reference,
      transactionId,
      decision: decisionEvent ? {
        provider: this.getStringValue(decisionMetadata.provider),
        algorithm: this.getStringValue(decisionMetadata.algorithm),
        reasonCode: this.getStringValue(decisionMetadata.reasonCode),
        failovers,
        marginKpi: this.getObjectValue(decisionMetadata.marginKpi),
        scores,
        rolloutApplied: this.getBooleanValue(decisionMetadata.rolloutApplied),
        shadowMode: this.getBooleanValue(decisionMetadata.shadowMode),
        usedLegacyPath: this.getBooleanValue(decisionMetadata.usedLegacyPath),
      } : null,
      failover: {
        sequence: failovers,
        events: failoverEvents,
      },
      breaker: {
        providerStates,
        transitions: breakerTransitions,
      },
      events: routingEvents,
    };
  }

  private parseAuditMetadata(metadata: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(metadata) as unknown;
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }

  private getStringValue(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private getNumberValue(value: unknown): number | null {
    return typeof value === 'number' ? value : null;
  }

  private getBooleanValue(value: unknown): boolean | null {
    return typeof value === 'boolean' ? value : null;
  }

  private getDateValue(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  private async getPayoutChargebackTimeline(transactionId: string): Promise<PayoutChargebackTransition[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        entityType: 'transaction',
        entityId: transactionId,
        eventType: 'chargeback.transition',
      },
      orderBy: { createdAt: 'asc' },
    });

    return logs
      .map((log) => this.parseAuditMetadata(log.metadata))
      .map((metadata) => {
        const toStatus = this.getPayoutChargebackStatusValue(metadata.toStatus);
        const reasonCode = this.getPayoutChargebackReasonCodeValue(metadata.reasonCode);
        const eventId = this.getStringValue(metadata.eventId);
        if (!toStatus || !reasonCode || !eventId) {
          return null;
        }

        return {
          fromStatus: this.getPayoutChargebackStatusValue(metadata.fromStatus),
          toStatus,
          eventId,
          reasonCode,
          occurredAt: this.getDateValue(metadata.occurredAt) ?? new Date(0).toISOString(),
        } satisfies PayoutChargebackTransition;
      })
      .filter((transition): transition is PayoutChargebackTransition => transition !== null);
  }

  private resolvePayoutChargebackAllowedNextStatuses(
    currentStatus: PayoutChargebackStatus | null,
  ): PayoutChargebackStatus[] {
    if (!currentStatus) {
      return ['opened'];
    }
    return PAYOUT_CHARGEBACK_TRANSITIONS[currentStatus];
  }

  private getPayoutChargebackStatusValue(value: unknown): PayoutChargebackStatus | null {
    if (value === 'opened' || value === 'investigating' || value === 'won' || value === 'lost' || value === 'reversed') {
      return value;
    }
    return null;
  }

  private getPayoutChargebackReasonCodeValue(value: unknown): PayoutChargebackLifecycleEventReasonCode | null {
    if (
      value === 'chargeback_opened'
      || value === 'chargeback_investigating'
      || value === 'chargeback_won'
      || value === 'chargeback_lost'
      || value === 'payout_reversed'
    ) {
      return value;
    }
    return null;
  }

  private getObjectValue(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  }

  private resolveSegment(amount: Prisma.Decimal): ObservabilitySegment {
    const numeric = Number(amount);
    if (numeric >= 3000) return 'enterprise';
    if (numeric >= 700) return 'growth';
    return 'emerging';
  }

  private clampInteger(value: number | undefined, fallback: number, min: number, max: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, Math.trunc(value)));
  }

  private sortByTimestampDesc(left: string, right: string): number {
    const leftTs = new Date(left).getTime();
    const rightTs = new Date(right).getTime();
    return rightTs - leftTs;
  }

  private async resolveCustomerId(
    merchantId: string,
    customer?: { externalId?: string; email?: string; name?: string },
  ): Promise<string | null> {
    if (!customer) {
      return null;
    }

    if (customer.externalId) {
      const external = await this.prisma.customer.upsert({
        where: {
          merchantId_externalId: {
            merchantId,
            externalId: customer.externalId,
          },
        },
        update: {
          email: customer.email,
          name: customer.name,
        },
        create: {
          merchantId,
          externalId: customer.externalId,
          email: customer.email,
          name: customer.name,
        },
      });
      return external.id;
    }

    if (customer.email) {
      const byEmail = await this.prisma.customer.upsert({
        where: {
          merchantId_email: {
            merchantId,
            email: customer.email,
          },
        },
        update: {
          name: customer.name,
        },
        create: {
          merchantId,
          email: customer.email,
          name: customer.name,
        },
      });
      return byEmail.id;
    }

    const created = await this.prisma.customer.create({
      data: {
        merchantId,
        name: customer.name,
      },
    });

    return created.id;
  }

  private async logTransition(
    transactionId: string,
    fromStatus: TransactionStatus | null,
    toStatus: TransactionStatus,
    note: string,
  ): Promise<void> {
    await this.prisma.transactionAudit.create({
      data: {
        transactionId,
        fromStatus,
        toStatus,
        note,
        actor: 'system',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'transaction.transition',
        actor: 'system',
        entityType: 'transaction',
        entityId: transactionId,
        metadata: JSON.stringify({ fromStatus, toStatus, note }),
      },
    });
  }

  private toRefundResponse(
    refund: {
      id: string;
      merchantId: string;
      amount: Prisma.Decimal;
      currency: string;
      reason: string | null;
      status: RefundStatus;
      createdAt: Date;
      updatedAt: Date;
    },
    paymentReference: string,
    transition?: {
      fromStatus: RefundStatus | null;
      toStatus: RefundStatus;
      occurredAt: Date;
    },
  ): RefundResponse {
    const normalizedTransition = transition ?? {
      fromStatus: null,
      toStatus: refund.status,
      occurredAt: refund.updatedAt,
    };

    return {
      id: refund.id,
      paymentReference,
      merchantId: refund.merchantId,
      amount: Number(refund.amount),
      currency: refund.currency,
      reason: refund.reason,
      status: refund.status,
      createdAt: refund.createdAt.toISOString(),
      updatedAt: refund.updatedAt.toISOString(),
      transition: {
        fromStatus: normalizedTransition.fromStatus,
        toStatus: normalizedTransition.toStatus,
        reasonCode: REFUND_LIFECYCLE_EVENT_REASON_CODES[normalizedTransition.toStatus],
        occurredAt: normalizedTransition.occurredAt.toISOString(),
      },
      lifecycle: {
        contract: 'refund-lifecycle.v1',
        currentStatus: refund.status,
        terminal: REFUND_LIFECYCLE_TRANSITIONS[refund.status].length === 0,
        allowedNextStatuses: REFUND_LIFECYCLE_TRANSITIONS[refund.status],
        reasonCodes: {
          duplicateRequest: 'duplicate_request',
          invalidPriorState: 'invalid_prior_state',
          staleUpdate: 'stale_update',
        },
        httpStatusByReason: {
          duplicate_request: 409,
          invalid_prior_state: 409,
          stale_update: 409,
        },
      },
    };
  }

  private throwRefundLifecycleConflict(
    reason: RefundLifecycleConflictReason,
    metadata: Record<string, unknown>,
  ): never {
    throw new ConflictException({
      code: 'REFUND_LIFECYCLE_CONFLICT',
      reason,
      httpStatus: 409,
      metadata,
    });
  }

  private throwPayoutChargebackLifecycleConflict(
    reason: PayoutChargebackLifecycleConflictReason,
    metadata: Record<string, unknown>,
  ): never {
    throw new ConflictException({
      code: 'PAYOUT_CHARGEBACK_TRANSITION_CONFLICT',
      reason,
      httpStatus: 409,
      metadata,
    });
  }
}
