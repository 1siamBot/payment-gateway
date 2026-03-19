import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

class ProviderSettlementRecordDto {
  @IsString()
  @IsNotEmpty()
  merchantId!: string;

  @IsString()
  @IsNotEmpty()
  providerName!: string;

  @Type(() => Number)
  @IsNumber()
  providerTotal!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class DetectSettlementExceptionsDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  windowDate!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProviderSettlementRecordDto)
  records!: ProviderSettlementRecordDto[];
}

export type DetectSettlementRecord = ProviderSettlementRecordDto;
