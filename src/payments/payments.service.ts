import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { createHmac, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderRouterService } from '../providers/provider-router.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CallbackDto } from './dto/callback.dto';

type PaymentResponse = {
  reference: string;
  status: TransactionStatus;
  provider: string | null;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly router: ProviderRouterService,
  ) {}

  async initiatePayment(input: CreatePaymentDto): Promise<PaymentResponse> {
    const scope = `${input.shopId}:${input.type}`;
    const existingKey = await this.prisma.idempotencyKey.findUnique({
      where: { scope_key: { scope, key: input.idempotencyKey } },
    });

    if (existingKey) {
      return JSON.parse(existingKey.responseBody) as PaymentResponse;
    }

    const reference = randomUUID();
    const type = input.type === 'deposit' ? TransactionType.DEPOSIT : TransactionType.WITHDRAW;
    const amountDecimal = new Prisma.Decimal(input.amount);

    const created = await this.prisma.transaction.create({
      data: {
        shopId: input.shopId,
        type,
        amount: amountDecimal,
        currency: input.currency,
        reference,
        status: TransactionStatus.PENDING,
      },
    });

    await this.logTransition(created.id, null, TransactionStatus.PENDING, 'payment initiated');

    const route = await this.router.initiateWithFailover({
      amount: input.amount,
      currency: input.currency,
      type,
      reference,
    });

    await this.prisma.tenant.upsert({
      where: { id: 'system' },
      update: {},
      create: {
        id: 'system',
        name: 'System Tenant',
      },
    });

    const provider = await this.prisma.provider.upsert({
      where: {
        tenantId_name: {
          tenantId: 'system',
          name: route.providerName,
        },
      },
      update: {},
      create: {
        tenantId: 'system',
        name: route.providerName,
      },
    });

    const updated = await this.prisma.transaction.update({
      where: { id: created.id },
      data: {
        providerId: provider.id,
        externalRef: route.externalRef,
        status: TransactionStatus.PROCESSING,
      },
    });

    await this.logTransition(updated.id, TransactionStatus.PENDING, TransactionStatus.PROCESSING, 'routed to provider');

    const response: PaymentResponse = {
      reference: updated.reference,
      status: updated.status,
      provider: route.providerName,
    };

    await this.prisma.idempotencyKey.create({
      data: {
        scope,
        key: input.idempotencyKey,
        responseBody: JSON.stringify(response),
      },
    });

    return response;
  }

  async getTransaction(reference: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { reference },
      include: { audits: { orderBy: { createdAt: 'asc' } } },
    });

    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    return tx;
  }

  async handleCallback(input: CallbackDto): Promise<{ applied: boolean; status: string }> {
    this.verifySignature(input);

    const tx = await this.prisma.transaction.findUnique({
      where: { reference: input.transactionReference },
    });

    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    const duplicate = await this.prisma.callbackEvent.findUnique({
      where: {
        providerName_eventId: {
          providerName: input.provider,
          eventId: input.eventId,
        },
      },
    });

    if (duplicate) {
      return { applied: false, status: tx.status };
    }

    const targetStatus = input.status === 'succeeded' ? TransactionStatus.SUCCEEDED : TransactionStatus.FAILED;

    await this.prisma.callbackEvent.create({
      data: {
        transactionId: tx.id,
        providerName: input.provider,
        eventId: input.eventId,
        status: input.status,
        payload: JSON.stringify(input),
      },
    });

    if (tx.status === TransactionStatus.SUCCEEDED || tx.status === TransactionStatus.FAILED) {
      return { applied: false, status: tx.status };
    }

    const updated = await this.prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status: targetStatus,
        failureReason: targetStatus === TransactionStatus.FAILED ? 'provider_callback_failed' : null,
      },
    });

    await this.logTransition(tx.id, tx.status, targetStatus, `callback:${input.eventId}`);

    return { applied: true, status: updated.status };
  }

  private verifySignature(input: CallbackDto): void {
    const callbackSecret = process.env.CALLBACK_SIGNING_SECRET ?? 'dev-callback-secret';
    const signedPayload = `${input.provider}:${input.eventId}:${input.transactionReference}:${input.status}`;
    const expected = createHmac('sha256', callbackSecret).update(signedPayload).digest('hex');
    if (expected !== input.signature) {
      throw new BadRequestException('Invalid callback signature');
    }
  }

  private async logTransition(
    transactionId: string,
    fromStatus: TransactionStatus | null,
    toStatus: TransactionStatus,
    note: string,
  ): Promise<void> {
    await this.prisma.transactionAudit.create({
      data: {
        transactionId,
        fromStatus,
        toStatus,
        note,
        actor: 'system',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'transaction.transition',
        actor: 'system',
        entityType: 'transaction',
        entityId: transactionId,
        metadata: JSON.stringify({ fromStatus, toStatus, note }),
      },
    });
  }
}
