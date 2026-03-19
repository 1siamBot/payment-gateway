import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RefundPaymentDto {
  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
