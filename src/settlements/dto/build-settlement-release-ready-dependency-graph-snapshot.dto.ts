import { IsArray, IsString } from 'class-validator';

export class BuildSettlementReleaseReadyDependencyGraphSnapshotDto {
  @IsString()
  candidateId!: string;

  @IsArray()
  laneRefs!: unknown[];

  @IsArray()
  dependencyRefs!: unknown[];

  @IsArray()
  evidenceRefs!: unknown[];
}
