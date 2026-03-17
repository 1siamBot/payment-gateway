import { IsIn, IsNumber, IsPositive, IsString, Length } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  shopId!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsIn(['deposit', 'withdraw'])
  type!: 'deposit' | 'withdraw';

  @IsString()
  idempotencyKey!: string;
}
