import { IsArray, IsString } from 'class-validator';

export class BuildSettlementAdjudicationRoutingManifestDto {
  @IsString()
  snapshotFingerprint!: string;

  @IsString()
  candidateId!: string;

  @IsArray()
  laneEvidence!: unknown[];

  @IsArray()
  blockingReasons!: unknown[];

  @IsArray()
  missingEvidence!: unknown[];
}
