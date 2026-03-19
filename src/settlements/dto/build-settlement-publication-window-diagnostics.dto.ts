import { IsObject, IsOptional, IsString } from 'class-validator';

export class BuildSettlementPublicationWindowDiagnosticsDto {
  @IsObject()
  baselinePlan!: Record<string, unknown>;

  @IsObject()
  candidatePlan!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  asOfIso?: string;
}
