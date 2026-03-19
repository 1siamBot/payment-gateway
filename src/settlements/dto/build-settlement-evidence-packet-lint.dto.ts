import { IsArray } from 'class-validator';

export class BuildSettlementEvidencePacketLintDto {
  @IsArray()
  packets!: unknown[];
}
