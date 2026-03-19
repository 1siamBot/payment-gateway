import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type MerchantConfigResponse = {
  id: string;
  name: string;
  webhookUrl: string | null;
  webhookSecretPreview: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class MerchantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(name: string, webhookUrl?: string) {
    const merchant = await this.prisma.merchant.create({
      data: {
        name,
        webhookUrl,
        webhookSecret: this.generateWebhookSecret(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'merchant.created',
        actor: 'system',
        entityType: 'merchant',
        entityId: merchant.id,
        metadata: JSON.stringify({ name, webhookUrl: webhookUrl ?? null }),
      },
    });

    return merchant;
  }

  list() {
    return this.prisma.merchant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getConfig(merchantId: string): Promise<MerchantConfigResponse> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return this.toConfigResponse(merchant);
  }

  async updateConfig(
    merchantId: string,
    changes: {
      name?: string;
      webhookUrl?: string | null;
      regenerateWebhookSecret?: boolean;
    },
  ): Promise<MerchantConfigResponse> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const normalizedName = typeof changes.name === 'string' ? changes.name.trim() : undefined;
    const nextWebhookUrl = changes.webhookUrl === undefined ? undefined : changes.webhookUrl ?? null;
    const shouldRegenerateSecret = changes.regenerateWebhookSecret === true;

    const updated = await this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        name: normalizedName && normalizedName.length > 0 ? normalizedName : undefined,
        webhookUrl: nextWebhookUrl,
        webhookSecret: shouldRegenerateSecret ? this.generateWebhookSecret() : undefined,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'merchant.config.updated',
        actor: 'system',
        entityType: 'merchant',
        entityId: updated.id,
        metadata: JSON.stringify({
          nameUpdated: normalizedName !== undefined,
          webhookUrlUpdated: changes.webhookUrl !== undefined,
          webhookSecretRegenerated: shouldRegenerateSecret,
        }),
      },
    });

    return this.toConfigResponse(updated);
  }

  private generateWebhookSecret(): string {
    return `whsec_${randomBytes(24).toString('hex')}`;
  }

  private toConfigResponse(merchant: {
    id: string;
    name: string;
    webhookUrl: string | null;
    webhookSecret: string;
    createdAt: Date;
    updatedAt: Date;
  }): MerchantConfigResponse {
    return {
      id: merchant.id,
      name: merchant.name,
      webhookUrl: merchant.webhookUrl,
      webhookSecretPreview: this.maskWebhookSecret(merchant.webhookSecret),
      createdAt: merchant.createdAt.toISOString(),
      updatedAt: merchant.updatedAt.toISOString(),
    };
  }

  private maskWebhookSecret(secret: string): string {
    if (!secret) {
      return 'whsec_***';
    }
    if (secret.length <= 10) {
      return `${secret.slice(0, 4)}***`;
    }
    return `${secret.slice(0, 6)}***${secret.slice(-4)}`;
  }
}
