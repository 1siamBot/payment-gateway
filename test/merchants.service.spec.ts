import { MerchantsService } from '../src/merchants/merchants.service';

function createPrismaMock() {
  const merchantStore = new Map<string, any>();
  const auditRows: any[] = [];

  return {
    merchantStore,
    auditRows,
    prisma: {
      merchant: {
        create: jest.fn(async ({ data }) => {
          const now = new Date();
          const merchant = {
            id: `merchant-${merchantStore.size + 1}`,
            createdAt: now,
            updatedAt: now,
            ...data,
          };
          merchantStore.set(merchant.id, merchant);
          return merchant;
        }),
        findMany: jest.fn(async () => [...merchantStore.values()]),
        findUnique: jest.fn(async ({ where }) => merchantStore.get(where.id) ?? null),
        update: jest.fn(async ({ where, data }) => {
          const existing = merchantStore.get(where.id);
          const updated = {
            ...existing,
            ...data,
            updatedAt: new Date(),
          };
          merchantStore.set(where.id, updated);
          return updated;
        }),
      },
      auditLog: {
        create: jest.fn(async ({ data }) => {
          const row = { id: `audit-${auditRows.length + 1}`, createdAt: new Date(), ...data };
          auditRows.push(row);
          return row;
        }),
      },
    },
  };
}

describe('MerchantsService', () => {
  it('creates merchant and exposes masked config view', async () => {
    const prismaMock = createPrismaMock();
    const service = new MerchantsService(prismaMock.prisma as any);

    const created = await service.create('Demo Merchant', 'https://merchant.example/hook');
    const config = await service.getConfig(created.id);

    expect(config.id).toBe(created.id);
    expect(config.name).toBe('Demo Merchant');
    expect(config.webhookUrl).toBe('https://merchant.example/hook');
    expect(config.webhookSecretPreview).toMatch(/^whsec_/);
    expect(config.webhookSecretPreview).toContain('***');
  });

  it('updates merchant config and can regenerate webhook secret', async () => {
    const prismaMock = createPrismaMock();
    const service = new MerchantsService(prismaMock.prisma as any);

    const created = await service.create('Legacy Merchant');
    const firstConfig = await service.getConfig(created.id);

    const updated = await service.updateConfig(created.id, {
      name: 'Updated Merchant',
      webhookUrl: 'https://merchant.example/new-hook',
      regenerateWebhookSecret: true,
    });

    expect(updated.name).toBe('Updated Merchant');
    expect(updated.webhookUrl).toBe('https://merchant.example/new-hook');
    expect(updated.webhookSecretPreview).not.toBe(firstConfig.webhookSecretPreview);
    expect(prismaMock.auditRows.at(-1)).toEqual(expect.objectContaining({
      eventType: 'merchant.config.updated',
      entityId: created.id,
    }));
  });
});
