import { IsArray, IsOptional, IsString } from 'class-validator';

export class BuildSettlementDeliveryReadinessDigestDto {
  @IsArray()
  lanes!: unknown[];

  @IsOptional()
  @IsString()
  currentLaneIssueIdentifier?: string;
}
