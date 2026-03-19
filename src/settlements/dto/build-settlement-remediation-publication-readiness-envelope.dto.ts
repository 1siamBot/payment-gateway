import { IsArray, IsObject, IsString } from 'class-validator';

export class BuildSettlementRemediationPublicationReadinessEnvelopeDto {
  @IsString()
  candidateId!: string;

  @IsString()
  blueprintFingerprint!: string;

  @IsString()
  executionReadiness!: string;

  @IsArray()
  executionSteps!: unknown[];

  @IsArray()
  blockingDependencies!: unknown[];

  @IsArray()
  missingEvidence!: unknown[];

  @IsObject()
  publicationConstraints!: Record<string, unknown>;

  @IsString()
  policyVersion!: string;
}
