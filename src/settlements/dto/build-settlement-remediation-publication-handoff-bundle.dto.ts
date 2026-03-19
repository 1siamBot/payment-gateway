import { IsArray, IsBoolean, IsString } from 'class-validator';

export class BuildSettlementRemediationPublicationHandoffBundleDto {
  @IsString()
  candidateId!: string;

  @IsString()
  envelopeFingerprint!: string;

  @IsBoolean()
  readyForPublication!: boolean;

  @IsArray()
  publicationActions!: unknown[];

  @IsArray()
  blockingDependencies!: unknown[];

  @IsArray()
  missingEvidence!: unknown[];

  @IsArray()
  requiredApprovals!: unknown[];

  @IsString()
  policyVersion!: string;
}
