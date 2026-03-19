import { Type } from 'class-transformer';
import { SettlementExceptionStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class ListSettlementExceptionsDto {
  @IsOptional()
  @IsString()
  merchantId?: string;

  @IsOptional()
  @IsString()
  providerName?: string;

  @IsOptional()
  @IsEnum(SettlementExceptionStatus)
  status?: SettlementExceptionStatus;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
