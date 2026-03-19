import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { createHmac } from 'crypto';
import { CallbackDto } from './dto/callback.dto';

export type CallbackProcessingStatus = 'succeeded' | 'failed';

export type NormalizedCallbackPayload = {
  provider: string;
  eventId: string;
  replayKey: string;
  transactionReference: string;
  status: CallbackProcessingStatus;
  signature: string;
  eventTimestamp: Date | null;
};

@Injectable()
export class PaymentCallbackGuardService {
  normalizePayload(input: CallbackDto): NormalizedCallbackPayload {
    const provider = input.provider?.trim();
    const eventId = input.eventId?.trim();
    const replayKey = input.replayKey?.trim() || eventId;
    const transactionReference = input.transactionReference?.trim();
    const status = input.status;
    const signature = input.signature?.trim();
    const eventTimestamp = this.parseTimestamp(input.eventTimestamp);

    const missingFields = [
      !provider ? 'provider' : null,
      !eventId ? 'eventId' : null,
      !replayKey ? 'replayKey' : null,
      !transactionReference ? 'transactionReference' : null,
      !status ? 'status' : null,
      !signature ? 'signature' : null,
    ].filter((value): value is string => Boolean(value));

    if (missingFields.length > 0) {
      throw new BadRequestException({
        code: 'PAYMENT_CALLBACK_VALIDATION_FAILED',
        reason: 'missing_required_fields',
        missingFields,
      });
    }

    if (signature.length !== 64 || !/^[a-f0-9]{64}$/i.test(signature)) {
      throw new BadRequestException({
        code: 'PAYMENT_CALLBACK_VALIDATION_FAILED',
        reason: 'invalid_signature_format',
      });
    }

    return {
      provider,
      eventId,
      replayKey,
      transactionReference,
      status,
      signature: signature.toLowerCase(),
      eventTimestamp,
    };
  }

  verifySignature(input: NormalizedCallbackPayload): void {
    const callbackSecret = process.env.CALLBACK_SIGNING_SECRET ?? 'dev-callback-secret';
    const signedPayload = `${input.provider}:${input.eventId}:${input.transactionReference}:${input.status}`;
    const expected = createHmac('sha256', callbackSecret).update(signedPayload).digest('hex');
    if (expected !== input.signature) {
      throw new UnauthorizedException({
        code: 'PAYMENT_CALLBACK_INVALID_SIGNATURE',
        reason: 'signature_mismatch',
      });
    }
  }

  throwReplayDuplicate(replayKey: string): never {
    throw new ConflictException({
      code: 'PAYMENT_CALLBACK_REPLAY_DUPLICATE',
      reason: 'replay_key_seen',
      replayKey,
    });
  }

  throwStaleEvent(input: {
    transactionStatus: TransactionStatus;
    latestEventTimestamp: Date | null;
    incomingEventTimestamp: Date | null;
    incomingStatus: CallbackProcessingStatus;
  }): never {
    throw new ConflictException({
      code: 'PAYMENT_CALLBACK_STALE_EVENT',
      reason: 'out_of_order_event',
      transactionStatus: input.transactionStatus,
      latestEventTimestamp: input.latestEventTimestamp?.toISOString() ?? null,
      incomingEventTimestamp: input.incomingEventTimestamp?.toISOString() ?? null,
      incomingStatus: input.incomingStatus,
    });
  }

  shouldRejectAsStale(input: {
    transactionStatus: TransactionStatus;
    incomingStatus: CallbackProcessingStatus;
    latestEventTimestamp: Date | null;
    incomingEventTimestamp: Date | null;
  }): boolean {
    if (input.transactionStatus === TransactionStatus.REFUNDED) {
      return true;
    }

    const incomingStatus = input.incomingStatus === 'succeeded'
      ? TransactionStatus.PAID
      : TransactionStatus.FAILED;

    if (
      (input.transactionStatus === TransactionStatus.PAID || input.transactionStatus === TransactionStatus.FAILED)
      && input.transactionStatus !== incomingStatus
    ) {
      return true;
    }

    if (
      input.latestEventTimestamp
      && input.incomingEventTimestamp
      && input.incomingEventTimestamp.getTime() < input.latestEventTimestamp.getTime()
    ) {
      return true;
    }

    return false;
  }

  resolveLatestEventTimestamp(payload: string, fallbackCreatedAt: Date): Date {
    try {
      const parsed = JSON.parse(payload) as { eventTimestamp?: string };
      if (!parsed?.eventTimestamp) {
        return fallbackCreatedAt;
      }
      const timestamp = new Date(parsed.eventTimestamp);
      if (!Number.isFinite(timestamp.getTime())) {
        return fallbackCreatedAt;
      }
      return timestamp;
    } catch {
      return fallbackCreatedAt;
    }
  }

  private parseTimestamp(value?: string): Date | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) {
      throw new BadRequestException({
        code: 'PAYMENT_CALLBACK_VALIDATION_FAILED',
        reason: 'invalid_event_timestamp',
      });
    }
    return parsed;
  }
}
