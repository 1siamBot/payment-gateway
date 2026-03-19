import { IsArray, IsString } from 'class-validator';

export class BuildSettlementReleaseCandidateHandoffPacketDto {
  @IsString()
  candidateId!: string;

  @IsString()
  scorecardFingerprint!: string;

  @IsString()
  manifestFingerprint!: string;

  @IsArray()
  laneStatuses!: unknown[];

  @IsArray()
  evidenceRefs!: unknown[];
}
