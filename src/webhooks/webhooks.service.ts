import { ForbiddenException, Injectable } from '@nestjs/common';
import { WebhookDeliveryStatus } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type DeliveryPayload = {
  transactionReference: string;
  status: string;
  eventType: string;
  amount: string;
  currency: string;
};

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  async listDeliveries(filters: {
    merchantId?: string;
    status?: WebhookDeliveryStatus;
    eventType?: string;
    take?: number;
  }, actorMerchantId?: string) {
    const merchantId = filters.merchantId ?? actorMerchantId;
    if (merchantId && actorMerchantId && merchantId !== actorMerchantId) {
      throw new ForbiddenException('Merchant is not allowed to access this resource');
    }

    const take = this.clampInteger(filters.take, 50, 1, 200);
    const deliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        status: filters.status,
        eventType: filters.eventType,
        transaction: merchantId ? { merchantId } : undefined,
      },
      include: {
        transaction: {
          select: {
            merchantId: true,
            reference: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return deliveries.map((delivery) => ({
      id: delivery.id,
      transactionId: delivery.transactionId,
      transactionReference: delivery.transaction.reference,
      merchantId: delivery.transaction.merchantId,
      eventType: delivery.eventType,
      status: delivery.status,
      retry: {
        attemptCount: delivery.attemptCount,
        maxAttempts: delivery.maxAttempts,
        nextRetryAt: delivery.nextRetryAt ? delivery.nextRetryAt.toISOString() : null,
        lastError: delivery.lastError,
      },
      deliveredAt: delivery.deliveredAt ? delivery.deliveredAt.toISOString() : null,
      createdAt: delivery.createdAt.toISOString(),
      updatedAt: delivery.updatedAt.toISOString(),
    }));
  }

  signPayload(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = this.signPayload(payload, secret);
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const providedBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, providedBuffer);
  }

  async queueTransactionWebhook(transactionId: string, eventType: string): Promise<void> {
    const tx = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { merchant: true },
    });

    if (!tx) {
      return;
    }

    const payload: DeliveryPayload = {
      transactionReference: tx.reference,
      status: tx.status,
      eventType,
      amount: tx.amount.toString(),
      currency: tx.currency,
    };

    const payloadString = JSON.stringify(payload);
    const signature = this.signPayload(payloadString, tx.merchant.webhookSecret);

    await this.prisma.webhookDelivery.create({
      data: {
        transactionId: tx.id,
        eventType,
        payload: payloadString,
        signature,
        nextRetryAt: new Date(),
      },
    });
  }

  async retryPending(limit = 25): Promise<{ processed: number; delivered: number; failed: number }> {
    const now = new Date();
    const deliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        status: WebhookDeliveryStatus.PENDING,
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      include: {
        transaction: {
          include: { merchant: true },
        },
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    let delivered = 0;
    let failed = 0;

    for (const delivery of deliveries) {
      const targetUrl = delivery.transaction.merchant.webhookUrl;
      if (!targetUrl) {
        failed += await this.markAttemptFailure(delivery.id, delivery.attemptCount, delivery.maxAttempts, 'missing webhook url');
        continue;
      }

      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-webhook-signature': delivery.signature,
          },
          body: delivery.payload,
        });

        if (!response.ok) {
          failed += await this.markAttemptFailure(
            delivery.id,
            delivery.attemptCount,
            delivery.maxAttempts,
            `http ${response.status}`,
          );
          continue;
        }

        delivered += 1;
        await this.prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: WebhookDeliveryStatus.DELIVERED,
            deliveredAt: new Date(),
            attemptCount: delivery.attemptCount + 1,
            lastError: null,
            nextRetryAt: null,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'network error';
        failed += await this.markAttemptFailure(delivery.id, delivery.attemptCount, delivery.maxAttempts, message);
      }
    }

    return {
      processed: deliveries.length,
      delivered,
      failed,
    };
  }

  private async markAttemptFailure(
    deliveryId: string,
    attemptCount: number,
    maxAttempts: number,
    errorMessage: string,
  ): Promise<number> {
    const nextAttempt = attemptCount + 1;
    const isFinalFailure = nextAttempt >= maxAttempts;
    const retryDelaySeconds = Math.min(60 * 30, Math.pow(2, nextAttempt) * 30);

    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        attemptCount: nextAttempt,
        status: isFinalFailure ? WebhookDeliveryStatus.FAILED : WebhookDeliveryStatus.PENDING,
        lastError: errorMessage,
        nextRetryAt: isFinalFailure ? null : new Date(Date.now() + retryDelaySeconds * 1000),
      },
    });

    return 1;
  }

  private clampInteger(value: number | undefined, fallback: number, min: number, max: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, Math.trunc(value)));
  }
}
