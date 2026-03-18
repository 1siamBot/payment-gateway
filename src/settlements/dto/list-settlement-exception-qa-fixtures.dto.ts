import { SettlementExceptionStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { SETTLEMENT_EXCEPTION_QA_SCENARIOS } from '../exception-qa-fixtures';

export enum SettlementExceptionQaScenarioEnum {
  RESOLVE_SUCCESS = 'resolve_success',
  IGNORE_SUCCESS = 'ignore_success',
  STALE_VERSION_CONFLICT = 'stale_version_conflict',
  ACTION_FAILURE_RETRY = 'action_failure_retry',
  INVESTIGATING_REFERENCE = 'investigating_reference',
  RESOLVED_REFERENCE = 'resolved_reference',
  IGNORED_REFERENCE = 'ignored_reference',
}

export class ListSettlementExceptionQaFixturesDto {
  @IsOptional()
  @IsEnum(SettlementExceptionQaScenarioEnum)
  scenario?: (typeof SETTLEMENT_EXCEPTION_QA_SCENARIOS)[number];

  @IsOptional()
  @IsEnum(SettlementExceptionStatus)
  status?: SettlementExceptionStatus;
}
