import { RefundStatus } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

const REFUND_LIFECYCLE_TARGET_STATUSES = [
  RefundStatus.PROCESSING,
  RefundStatus.SUCCEEDED,
  RefundStatus.FAILED,
] as const;

export class UpdateRefundLifecycleDto {
  @IsEnum(RefundStatus)
  @IsIn(REFUND_LIFECYCLE_TARGET_STATUSES)
  toStatus!: RefundStatus;

  @IsOptional()
  @IsEnum(RefundStatus)
  expectedCurrentStatus?: RefundStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
