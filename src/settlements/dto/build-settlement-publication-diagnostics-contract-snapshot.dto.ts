import { IsObject, IsOptional, IsString } from 'class-validator';

export class BuildSettlementPublicationDiagnosticsContractSnapshotDto {
  @IsObject()
  diagnostics!: Record<string, unknown>;

  @IsObject()
  expectedSchema!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  asOfIso?: string;
}
