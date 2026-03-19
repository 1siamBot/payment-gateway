import { IsArray, IsOptional, IsString } from 'class-validator';

export class BuildSettlementRemediationManifestDto {
  @IsArray()
  runbook!: unknown[];

  @IsOptional()
  @IsString()
  asOfIso?: string;
}
