import { IsOptional } from 'class-validator';

export class BuildSettlementExplainabilityPresetProfileDto {
  @IsOptional()
  presetSlots?: unknown;

  @IsOptional()
  defaultSelection?: unknown;
}
