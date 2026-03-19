import { IsArray, IsOptional, IsString } from 'class-validator';

export class BuildSettlementRemediationPublicationRouteDecisionEnvelopeDto {
  @IsString()
  candidateId!: string;

  @IsString()
  routingPacketFingerprint!: string;

  @IsString()
  routeDecision!: string;

  @IsArray()
  routeSteps!: unknown[];

  @IsArray()
  blockingDependencies!: unknown[];

  @IsArray()
  missingEvidence!: unknown[];

  @IsArray()
  requiredApprovals!: unknown[];

  @IsString()
  policyVersion!: string;

  @IsOptional()
  @IsString()
  schemaVersion?: string;
}
