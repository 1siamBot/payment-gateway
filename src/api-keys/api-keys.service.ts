import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiKeyStatus } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

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
