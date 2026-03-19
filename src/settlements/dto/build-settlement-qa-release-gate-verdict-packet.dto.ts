import { IsArray, IsObject, IsString } from 'class-validator';

export class BuildSettlementQaReleaseGateVerdictPacketDto {
  @IsString()
  candidateId!: string;

  @IsArray()
  laneStatuses!: unknown[];

  @IsObject()
  dependencyGraph!: Record<string, unknown>;

  @IsArray()
  evidenceManifestRefs!: unknown[];

  @IsString()
  policyVersion!: string;
}
