import { IsArray } from 'class-validator';

export class BuildSettlementEvidenceGapSummaryDto {
  @IsArray()
  rows!: unknown[];
}
