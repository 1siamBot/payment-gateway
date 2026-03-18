import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSettlementExceptionDto {
  @IsIn(['resolve', 'ignore'])
  action!: 'resolve' | 'ignore';

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
