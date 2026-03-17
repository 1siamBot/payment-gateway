import { PrismaClient, TransactionStatus, TransactionType } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const merchant = await prisma.merchant.upsert({
    where: { id: 'merchant_demo' },
    update: {
      name: 'Demo Merchant',
      webhookUrl: 'https://example.com/webhooks/payments',
      webhookSecret: 'whsec_demo_merchant_secret',
    },
    create: {
      id: 'merchant_demo',
      name: 'Demo Merchant',
      webhookUrl: 'https://example.com/webhooks/payments',
      webhookSecret: 'whsec_demo_merchant_secret',
    },
  });

  const apiKeyRaw = 'pk_demo_live_key_for_local_seed_only';
  await prisma.apiKey.upsert({
    where: { id: 'key_demo_primary' },
    update: {
      name: 'primary',
      keyHash: createHash('sha256').update(apiKeyRaw).digest('hex'),
      prefix: apiKeyRaw.slice(0, 8),
      last4: apiKeyRaw.slice(-4),
      status: 'ACTIVE',
      merchantId: merchant.id,
    },
    create: {
      id: 'key_demo_primary',
      merchantId: merchant.id,
      name: 'primary',
      keyHash: createHash('sha256').update(apiKeyRaw).digest('hex'),
      prefix: apiKeyRaw.slice(0, 8),
      last4: apiKeyRaw.slice(-4),
      status: 'ACTIVE',
    },
  });

  const customer = await prisma.customer.upsert({
    where: {
      merchantId_email: {
        merchantId: merchant.id,
        email: 'customer@example.com',
      },
    },
    update: {
      name: 'Seed Customer',
    },
    create: {
      merchantId: merchant.id,
      email: 'customer@example.com',
      name: 'Seed Customer',
      externalId: 'cust_seed_001',
    },
  });

  await prisma.transaction.upsert({
    where: { reference: 'seed-payment-001' },
    update: {
      merchantId: merchant.id,
      customerId: customer.id,
      amount: 120,
      currency: 'USD',
      status: TransactionStatus.PAID,
      type: TransactionType.DEPOSIT,
      providerName: 'mock-a',
      externalRef: 'provider-seed-001',
    },
    create: {
      merchantId: merchant.id,
      customerId: customer.id,
      amount: 120,
      currency: 'USD',
      status: TransactionStatus.PAID,
      type: TransactionType.DEPOSIT,
      reference: 'seed-payment-001',
      providerName: 'mock-a',
      externalRef: 'provider-seed-001',
    },
  });

  console.log('Seed completed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
