import { IsArray, IsString } from 'class-validator';

export class BuildSettlementBulkActionPreviewDto {
  @IsArray()
  rows!: unknown[];

  @IsArray()
  @IsString({ each: true })
  selectedExceptionIds!: string[];
}
