import { IsArray, IsString } from 'class-validator';

export class BuildSettlementReleaseEvidenceAdjudicationSnapshotDto {
  @IsString()
  candidateId!: string;

  @IsString()
  scorecardFingerprint!: string;

  @IsString()
  handoffPacketFingerprint!: string;

  @IsArray()
  laneEvidence!: unknown[];

  @IsArray()
  dependencyBlocks!: unknown[];
}
