import { IsArray, IsObject, IsString } from 'class-validator';

export class BuildSettlementRemediationExecutionBlueprintPacketDto {
  @IsString()
  candidateId!: string;

  @IsString()
  queueFingerprint!: string;

  @IsArray()
  queueItems!: unknown[];

  @IsObject()
  dependencyGraph!: Record<string, unknown>;

  @IsObject()
  operatorConstraints!: Record<string, unknown>;

  @IsString()
  policyVersion!: string;
}
