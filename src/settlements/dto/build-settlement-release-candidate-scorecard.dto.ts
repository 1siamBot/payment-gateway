import { IsArray, IsString } from 'class-validator';

export class BuildSettlementReleaseCandidateScorecardDto {
  @IsString()
  candidateId!: string;

  @IsString()
  manifestFingerprint!: string;

  @IsArray()
  laneEvidence!: unknown[];

  @IsArray()
  dependencyStates!: unknown[];
}
