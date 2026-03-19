import { WebhookDeliveryStatus } from '@prisma/client';
import { WebhooksService } from '../src/webhooks/webhooks.service';

describe('WebhooksService', () => {
  it('signs and verifies payload signatures', () => {
    const prisma = {};
    const service = new WebhooksService(prisma as any);

    const payload = JSON.stringify({ event: 'payment.paid', reference: 'ref-1' });
    const secret = 'whsec_test';
    const signature = service.signPayload(payload, secret);

    expect(service.verifySignature(payload, signature, secret)).toBe(true);
    expect(service.verifySignature(payload, 'bad-signature', secret)).toBe(false);
  });

  it('marks delivery as failed when webhook url is missing', async () => {
    const webhookDelivery = {
      id: 'wd-1',
      transactionId: 'tx-1',
      eventType: 'payment.paid',
      payload: '{}',
      signature: 'sig',
      status: WebhookDeliveryStatus.PENDING,
      attemptCount: 0,
      maxAttempts: 1,
      transaction: {
        merchant: { webhookUrl: null },
      },
    };

    const prisma = {
      webhookDelivery: {
        findMany: jest.fn(async () => [webhookDelivery]),
        update: jest.fn(async ({ data }) => data),
      },
    };

    const service = new WebhooksService(prisma as any);
    const result = await service.retryPending();

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
    expect(prisma.webhookDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'wd-1' },
        data: expect.objectContaining({ status: WebhookDeliveryStatus.FAILED }),
      }),
    );
  });

  it('lists delivery logs with retry metadata', async () => {
    const now = new Date('2026-03-17T10:00:00.000Z');
    const prisma = {
      webhookDelivery: {
        findMany: jest.fn(async () => [
          {
            id: 'wd-2',
            transactionId: 'tx-2',
            eventType: 'payment.failed',
            status: WebhookDeliveryStatus.PENDING,
            attemptCount: 2,
            maxAttempts: 5,
            nextRetryAt: now,
            lastError: 'http 500',
            deliveredAt: null,
            createdAt: now,
            updatedAt: now,
            transaction: {
              merchantId: 'merchant-1',
              reference: 'ref-2',
            },
          },
        ]),
      },
    };

    const service = new WebhooksService(prisma as any);
    const rows = await service.listDeliveries({ merchantId: 'merchant-1', status: WebhookDeliveryStatus.PENDING });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(expect.objectContaining({
      transactionReference: 'ref-2',
      status: WebhookDeliveryStatus.PENDING,
      retry: expect.objectContaining({
        attemptCount: 2,
        maxAttempts: 5,
      }),
    }));
  });
});
