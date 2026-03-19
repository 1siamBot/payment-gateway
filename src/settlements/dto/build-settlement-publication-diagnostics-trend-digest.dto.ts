import { IsArray } from 'class-validator';

export class BuildSettlementPublicationDiagnosticsTrendDigestDto {
  @IsArray()
  snapshotSummaries!: unknown[];
}
