import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type MerchantConfigResponse = {
  mode: 'live' | 'fixture';
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

  async getConfig(
    merchantId: string,
    options?: { mode?: 'live' | 'fixture' },
  ): Promise<MerchantConfigResponse> {
    if (options?.mode === 'fixture') {
      return this.buildFixtureConfig(merchantId);
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return this.toConfigResponse(merchant, 'live');
  }

  async updateConfig(
    merchantId: string,
    changes: {
      name?: string;
      webhookUrl?: string | null;
      regenerateWebhookSecret?: boolean;
    },
    options?: { mode?: 'live' | 'fixture' },
  ): Promise<MerchantConfigResponse> {
    if (options?.mode === 'fixture') {
      const fixture = this.buildFixtureConfig(merchantId);
      return {
        ...fixture,
        name: typeof changes.name === 'string' && changes.name.trim().length > 0
          ? changes.name.trim()
          : fixture.name,
        webhookUrl: changes.webhookUrl === undefined ? fixture.webhookUrl : changes.webhookUrl,
        webhookSecretPreview: changes.regenerateWebhookSecret ? 'whsec_fixture***rot8' : fixture.webhookSecretPreview,
      };
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const normalizedName = typeof changes.name === 'string' ? changes.name.trim() : undefined;
    if (changes.name !== undefined && (!normalizedName || normalizedName.length === 0)) {
      throw new BadRequestException({
        message: 'merchant config validation failed',
        reasonCode: 'merchant_name_required',
        field: 'name',
      });
    }
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

    return this.toConfigResponse(updated, 'live');
  }

  private generateWebhookSecret(): string {
    return `whsec_${randomBytes(24).toString('hex')}`;
  }

  private toConfigResponse(
    merchant: {
    id: string;
    name: string;
    webhookUrl: string | null;
    webhookSecret: string;
    createdAt: Date;
    updatedAt: Date;
    },
    mode: 'live' | 'fixture',
  ): MerchantConfigResponse {
    return {
      mode,
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

  private buildFixtureConfig(merchantId: string): MerchantConfigResponse {
    return {
      mode: 'fixture',
      id: merchantId,
      name: `Fixture Merchant ${merchantId.slice(0, 6)}`,
      webhookUrl: 'https://fixtures.gateway.local/webhooks/merchant',
      webhookSecretPreview: 'whsec_fixture***0001',
      createdAt: '2026-03-19T00:00:00.000Z',
      updatedAt: '2026-03-19T00:00:00.000Z',
    };
  }
}
