import { IsObject, IsOptional, IsString } from 'class-validator';

export class BuildSettlementPublicationDiagnosticsFixtureExportDto {
  @IsObject()
  diagnostics!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  asOfIso?: string;
}
