import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  type ReconciliationDiscrepancyPath,
} from '../reconciliation-discrepancy-fixtures';

export enum ReconciliationDiscrepancyPathEnum {
  EMPTY = 'empty',
  MATCHED = 'matched',
  MISMATCHED_AMOUNT = 'mismatched-amount',
  MISSING_CAPTURE = 'missing-capture',
  DUPLICATE_EVENT = 'duplicate-event',
}

export class ListReconciliationDiscrepanciesDto {
  @IsOptional()
  @IsEnum(ReconciliationDiscrepancyPathEnum)
  path?: ReconciliationDiscrepancyPath;

  @IsOptional()
  @IsString()
  merchantId?: string;

  @IsOptional()
  @IsString()
  transactionReference?: string;
}
