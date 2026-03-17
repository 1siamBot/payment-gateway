import { ApiKeysService } from '../src/api-keys/api-keys.service';

function prismaMock() {
  const keys = new Map<string, any>();
  return {
    merchant: {
      findUnique: jest.fn(async ({ where }) => (where.id === 'merchant-1' ? { id: 'merchant-1' } : null)),
    },
    apiKey: {
      create: jest.fn(async ({ data }) => {
        const id = `key-${keys.size + 1}`;
        const record = { id, ...data, status: 'ACTIVE', version: 1 };
        keys.set(id, record);
        return record;
      }),
      findUnique: jest.fn(async ({ where }) => keys.get(where.id) ?? null),
      update: jest.fn(async ({ where, data }) => {
        const current = keys.get(where.id);
        const updated = { ...current, ...data };
        keys.set(where.id, updated);
        return updated;
      }),
    },
    auditLog: {
      create: jest.fn(async ({ data }) => data),
    },
  };
}

describe('ApiKeysService', () => {
  it('creates, rotates and revokes keys with audit calls', async () => {
    const prisma = prismaMock();
    const service = new ApiKeysService(prisma as any);

    const created = await service.createKey('merchant-1', 'primary');
    expect(created.apiKey.startsWith('pk_')).toBe(true);

    const rotated = await service.rotateKey(created.id);
    expect(rotated.id).not.toBe(created.id);

    const revoked = await service.revokeKey(rotated.id);
    expect(revoked.revoked).toBe(true);

    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
});
