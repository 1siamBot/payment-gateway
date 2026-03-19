import { IsArray, IsOptional, IsString } from 'class-validator';

export class BuildSettlementPublicationEvidenceManifestDto {
  @IsString()
  bundleDigest!: string;

  @IsString()
  contractDigest!: string;

  @IsArray()
  laneRefs!: unknown[];

  @IsArray()
  artifactRefs!: unknown[];

  @IsOptional()
  @IsString()
  asOfIso?: string;
}
