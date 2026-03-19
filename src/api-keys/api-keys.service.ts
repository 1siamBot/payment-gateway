import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiKeyStatus } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type ApiKeyContractRow = {
  id: string;
  merchantId: string;
  name: string;
  status: ApiKeyStatus;
  version: number;
  prefix: string;
  last4: string;
  createdAt: string;
  revokedAt: string | null;
};

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async listKeys(
    merchantId: string,
    options?: { mode?: 'live' | 'fixture' },
  ): Promise<{ mode: 'live' | 'fixture'; merchantId: string; total: number; data: ApiKeyContractRow[] }> {
    if (options?.mode === 'fixture') {
      return {
        mode: 'fixture',
        merchantId,
        total: 2,
        data: [
          {
            id: `${merchantId}-fixture-key-2`,
            merchantId,
            name: 'fixture-primary-v2',
            status: ApiKeyStatus.ACTIVE,
            version: 2,
            prefix: 'pk_fix02',
            last4: '0002',
            createdAt: '2026-03-19T00:05:00.000Z',
            revokedAt: null,
          },
          {
            id: `${merchantId}-fixture-key-1`,
            merchantId,
            name: 'fixture-primary-v1',
            status: ApiKeyStatus.REVOKED,
            version: 1,
            prefix: 'pk_fix01',
            last4: '0001',
            createdAt: '2026-03-18T23:55:00.000Z',
            revokedAt: '2026-03-19T00:05:00.000Z',
          },
        ],
      };
    }

    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const rows = await this.prisma.apiKey.findMany({
      where: { merchantId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        merchantId: true,
        name: true,
        status: true,
        version: true,
        prefix: true,
        last4: true,
        createdAt: true,
        revokedAt: true,
      },
    });

    return {
      mode: 'live',
      merchantId,
      total: rows.length,
      data: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
      })),
    };
  }

  async createKey(merchantId: string, name: string, version = 1): Promise<{ id: string; apiKey: string }> {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const raw = this.generateRawKey();
    const keyHash = this.hash(raw);
    const prefix = raw.slice(0, 8);
    const last4 = raw.slice(-4);

    const record = await this.prisma.apiKey.create({
      data: {
        merchantId,
        name,
        keyHash,
        prefix,
        last4,
        version,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'api_key.created',
        actor: 'system',
        entityType: 'api_key',
        entityId: record.id,
        metadata: JSON.stringify({ merchantId, name }),
      },
    });

    return { id: record.id, apiKey: raw };
  }

  async rotateKey(keyId: string): Promise<{ id: string; apiKey: string }> {
    const existing = await this.prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!existing) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: {
        status: ApiKeyStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    const nextVersion = existing.version + 1;
    const next = await this.createKey(existing.merchantId, `${existing.name}-v${nextVersion}`, nextVersion);

    await this.prisma.auditLog.create({
      data: {
        eventType: 'api_key.rotated',
        actor: 'system',
        entityType: 'api_key',
        entityId: keyId,
        metadata: JSON.stringify({ replacementId: next.id }),
      },
    });

    return next;
  }

  async revokeKey(keyId: string): Promise<{ revoked: boolean }> {
    const existing = await this.prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!existing) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: {
        status: ApiKeyStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'api_key.revoked',
        actor: 'system',
        entityType: 'api_key',
        entityId: keyId,
        metadata: JSON.stringify({ merchantId: existing.merchantId }),
      },
    });

    return { revoked: true };
  }

  private generateRawKey(): string {
    return `pk_${randomBytes(24).toString('hex')}`;
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
