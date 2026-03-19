import { IsArray } from 'class-validator';

export class BuildSettlementPublicationReadinessTrendDto {
  @IsArray()
  rows!: unknown[];
}
