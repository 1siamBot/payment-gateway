import { IsObject, IsOptional, IsString } from 'class-validator';

export class BuildSettlementPublicationWindowPlanDto {
  @IsObject()
  manifest!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  asOfIso?: string;
}
