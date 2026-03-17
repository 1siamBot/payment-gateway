import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

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

  private generateWebhookSecret(): string {
    return `whsec_${randomBytes(24).toString('hex')}`;
  }
}
