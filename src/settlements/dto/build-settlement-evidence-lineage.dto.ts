import { IsArray, IsOptional } from 'class-validator';

export class BuildSettlementEvidenceLineageDto {
  @IsArray()
  rows!: unknown[];

  @IsOptional()
  cursor?: unknown;
}
