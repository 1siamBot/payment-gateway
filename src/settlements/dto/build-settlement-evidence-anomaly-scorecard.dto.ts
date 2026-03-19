import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class BuildSettlementEvidenceAnomalyScorecardDto {
  @IsArray()
  lanes!: unknown[];

  @IsOptional()
  @IsString()
  asOfIso?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  staleAfterMinutes?: number;
}
