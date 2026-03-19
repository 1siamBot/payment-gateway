import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class BuildSettlementReleaseGateRemediationPlanDto {
  @IsString()
  candidateId!: string;

  @IsArray()
  laneEvidence!: unknown[];

  @IsArray()
  dependencySnapshots!: unknown[];

  @IsString()
  policyVersion!: string;

  @IsOptional()
  @IsIn(['strict', 'balanced', 'expedite'])
  policyProfile?: 'strict' | 'balanced' | 'expedite';

  @IsOptional()
  @IsString()
  schemaVersion?: string;
}
