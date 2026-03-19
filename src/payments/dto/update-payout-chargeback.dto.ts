import { IsIn, IsOptional, IsString } from 'class-validator';

export const PAYOUT_CHARGEBACK_TARGET_STATUSES = [
  'opened',
  'investigating',
  'won',
  'lost',
  'reversed',
] as const;

export type PayoutChargebackTargetStatus = (typeof PAYOUT_CHARGEBACK_TARGET_STATUSES)[number];

export class UpdatePayoutChargebackDto {
  @IsString()
  @IsIn(PAYOUT_CHARGEBACK_TARGET_STATUSES)
  toStatus!: PayoutChargebackTargetStatus;

  @IsString()
  eventId!: string;

  @IsOptional()
  @IsString()
  @IsIn(PAYOUT_CHARGEBACK_TARGET_STATUSES)
  expectedCurrentStatus?: PayoutChargebackTargetStatus;

  @IsOptional()
  @IsString()
  occurredAt?: string;
}
