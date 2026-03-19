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
        const createdAt = new Date(1700000000000 + keys.size * 1000);
        const record = { id, ...data, status: 'ACTIVE', version: data.version ?? 1, createdAt, revokedAt: null };
        keys.set(id, record);
        return record;
      }),
      findUnique: jest.fn(async ({ where }) => keys.get(where.id) ?? null),
      findMany: jest.fn(async ({ where }) => {
        const rows = [...keys.values()].filter((row) => row.merchantId === where.merchantId);
        return rows.sort((left, right) => {
          const dateDiff = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
          if (dateDiff !== 0) {
            return dateDiff;
          }
          return String(left.id).localeCompare(String(right.id));
        });
      }),
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
  it('lists deterministic fixture rows when mode=fixture', async () => {
    const prisma = prismaMock();
    const service = new ApiKeysService(prisma as any);

    const response = await service.listKeys('merchant-1', { mode: 'fixture' });

    expect(response.mode).toBe('fixture');
    expect(response.total).toBe(2);
    expect(response.data.map((row) => row.version)).toEqual([2, 1]);
  });

  it('lists live keys in deterministic createdAt/id order', async () => {
    const prisma = prismaMock();
    const service = new ApiKeysService(prisma as any);

    const first = await service.createKey('merchant-1', 'primary');
    const second = await service.createKey('merchant-1', 'primary-v2');

    const rows = await service.listKeys('merchant-1');
    expect(rows.mode).toBe('live');
    expect(rows.total).toBe(2);
    expect(rows.data[0].id).toBe(second.id);
    expect(rows.data[1].id).toBe(first.id);
  });

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

  it('returns not-found error when listing keys for unknown merchant', async () => {
    const prisma = prismaMock();
    const service = new ApiKeysService(prisma as any);

    await expect(service.listKeys('merchant-404')).rejects.toMatchObject({
      response: {
        message: 'Merchant not found',
      },
      status: 404,
    });
  });
});
