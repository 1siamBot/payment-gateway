import { IsObject, IsOptional, IsString } from 'class-validator';

export class BuildSettlementPublicationDiagnosticsDeltaBundleDto {
  @IsObject()
  baselineDigest!: Record<string, unknown>;

  @IsObject()
  candidateDigest!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  asOfIso?: string;
}
