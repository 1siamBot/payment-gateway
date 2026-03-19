import { IsArray, IsObject, IsString } from 'class-validator';

export class BuildSettlementReleaseCandidateRemediationQueueDto {
  @IsString()
  candidateId!: string;

  @IsObject()
  verdictPacket!: Record<string, unknown>;

  @IsObject()
  dependencyGraph!: Record<string, unknown>;

  @IsArray()
  evidenceRefs!: unknown[];

  @IsString()
  policyVersion!: string;
}
