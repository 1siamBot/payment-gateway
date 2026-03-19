import { PrismaClient, TransactionStatus, TransactionType } from '@prisma/client';
import { PAYMENT_ATTEMPT_TIMELINE_FIXTURES } from '../src/payments/payment-attempt-timeline-fixtures';

const prisma = new PrismaClient();

async function upsertMerchant(merchantId: string): Promise<void> {
  await prisma.merchant.upsert({
    where: { id: merchantId },
    update: {
      name: `Timeline ${merchantId}`,
      webhookSecret: `whsec_${merchantId}`,
    },
    create: {
      id: merchantId,
      name: `Timeline ${merchantId}`,
      webhookSecret: `whsec_${merchantId}`,
    },
  });
}

function toTransactionStatus(value: string): TransactionStatus {
  if (value === TransactionStatus.FAILED) {
    return TransactionStatus.FAILED;
  }
  if (value === TransactionStatus.PAID) {
    return TransactionStatus.PAID;
  }
  return TransactionStatus.CREATED;
}

async function seedTimelineFixture(): Promise<void> {
  for (const fixture of PAYMENT_ATTEMPT_TIMELINE_FIXTURES) {
    await upsertMerchant(fixture.merchantId);

    const tx = await prisma.transaction.upsert({
      where: { reference: fixture.paymentReference },
      update: {
        merchantId: fixture.merchantId,
        type: TransactionType.DEPOSIT,
        amount: fixture.amount,
        currency: fixture.currency,
        status: toTransactionStatus(fixture.finalStatus),
        providerName: 'mock-a',
      },
      create: {
        merchantId: fixture.merchantId,
        type: TransactionType.DEPOSIT,
        amount: fixture.amount,
        currency: fixture.currency,
        status: toTransactionStatus(fixture.finalStatus),
        reference: fixture.paymentReference,
        providerName: 'mock-a',
      },
    });

    await prisma.auditLog.deleteMany({
      where: {
        entityType: 'transaction',
        entityId: tx.id,
        eventType: 'payment.attempt.event',
      },
    });

    for (const event of fixture.events) {
      const parsedOccurredAt = Date.parse(event.occurredAt);
      await prisma.auditLog.create({
        data: {
          eventType: 'payment.attempt.event',
          actor: event.actor,
          entityType: 'transaction',
          entityId: tx.id,
          metadata: JSON.stringify({
            stage: event.stage,
            status: event.status,
            actor: event.actor,
            note: event.note,
            occurredAt: event.occurredAt,
          }),
          createdAt: Number.isFinite(parsedOccurredAt) ? new Date(parsedOccurredAt) : new Date(),
        },
      });
    }
  }

  console.log(
    `Seeded payment-attempt timeline fixtures: ${PAYMENT_ATTEMPT_TIMELINE_FIXTURES.map((fixture) => fixture.paymentReference).join(', ')}`,
  );
}

seedTimelineFixture()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
