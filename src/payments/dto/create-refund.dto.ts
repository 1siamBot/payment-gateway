import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRefundDto {
  @IsString()
  @IsNotEmpty()
  paymentReference!: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
