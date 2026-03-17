import {
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CustomerPayloadDto {
  @IsOptional()
  @IsString()
  externalId?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class CreatePaymentDto {
  @IsString()
  merchantId!: string;

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

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerPayloadDto)
  customer?: CustomerPayloadDto;
}
