import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSettlementExceptionDto {
  @IsIn(['resolve', 'ignore'])
  action!: 'resolve' | 'ignore';

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  idempotencyKey?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}
