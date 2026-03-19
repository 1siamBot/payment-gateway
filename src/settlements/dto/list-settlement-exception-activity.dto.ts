import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const SETTLEMENT_EXCEPTION_ACTIVITY_MODES = ['live', 'fixture'] as const;
const SETTLEMENT_EXCEPTION_ACTIVITY_SCENARIOS = ['normal', 'empty', 'stale_cursor'] as const;

export class ListSettlementExceptionActivityDto {
  @IsOptional()
  @IsIn(SETTLEMENT_EXCEPTION_ACTIVITY_MODES)
  mode?: 'live' | 'fixture';

  @IsOptional()
  @IsIn(SETTLEMENT_EXCEPTION_ACTIVITY_SCENARIOS)
  scenario?: 'normal' | 'empty' | 'stale_cursor';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
