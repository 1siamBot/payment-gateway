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
});
