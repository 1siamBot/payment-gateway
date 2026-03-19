import { IsArray, IsOptional, IsString } from 'class-validator';

export class BuildSettlementReleaseGateEvidenceDigestDto {
  @IsString()
  candidateId!: string;

  @IsArray()
  laneEvidence!: unknown[];

  @IsArray()
  dependencySnapshots!: unknown[];

  @IsString()
  policyVersion!: string;

  @IsOptional()
  @IsString()
  schemaVersion?: string;
}
