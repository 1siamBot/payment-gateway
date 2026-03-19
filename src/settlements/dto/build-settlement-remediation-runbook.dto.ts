import { IsArray, IsOptional, IsString } from 'class-validator';

export class BuildSettlementRemediationRunbookDto {
  @IsArray()
  scorecard!: unknown[];

  @IsOptional()
  @IsString()
  asOfIso?: string;
}
