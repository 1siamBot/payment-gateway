import { IsArray, IsOptional } from 'class-validator';

export class BuildSettlementPacketAuditSummaryDto {
  @IsArray()
  evidenceRows!: unknown[];

  @IsOptional()
  blockerMetadata?: unknown;
}
