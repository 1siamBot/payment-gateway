import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  SettlementExceptionStatus,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BULK_SETTLEMENT_PREVIEW_WARNING_HINTS,
  BulkSettlementActionSimulation,
  SettlementExplainabilityPresetProfile,
  BulkSettlementRollbackReasonCode,
  BulkSettlementRollbackReasonSeverity,
  BulkSettlementTriageSnapshot,
  BulkSettlementPreviewStatusBucket,
  BulkSettlementPreviewRiskBucket,
  BulkSettlementPreviewWarningCode,
  buildBulkSettlementActionPreviewExport,
  buildBulkSettlementActionSimulation,
  buildBulkSettlementRollbackRecommendation,
  buildBulkSettlementTriageSnapshot,
  buildSettlementExplainabilityPresetProfile,
} from './bulk-settlement-preview';
import {
  BuildSettlementEvidenceLineageDto,
} from './dto/build-settlement-evidence-lineage.dto';
import {
  BuildSettlementBulkActionPreviewDto,
} from './dto/build-settlement-bulk-action-preview.dto';
import { BuildSettlementExplainabilityPresetProfileDto } from './dto/build-settlement-explainability-preset-profile.dto';
import { BuildSettlementPacketAuditSummaryDto } from './dto/build-settlement-packet-audit-summary.dto';
import { BuildSettlementPublicationReadinessTrendDto } from './dto/build-settlement-publication-readiness-trend.dto';
import {
  ExceptionQaScenario,
  SETTLEMENT_EXCEPTION_QA_FIXTURES,
  SETTLEMENT_EXCEPTION_QA_WINDOW_DATE,
} from './exception-qa-fixtures';
import { buildSettlementPacketAuditSummary, SettlementPacketAuditSummary } from './packet-audit-summary';
import { buildSettlementEvidenceLineage, SettlementEvidenceLineageContract } from './evidence-lineage';
import {
  buildSettlementPublicationReadinessTrend,
  SettlementPublicationReadinessTrend,
} from './publication-readiness-trend';
import type {
  DetectSettlementExceptionsDto,
  DetectSettlementRecord,
} from './dto/detect-settlement-exceptions.dto';
import { ListSettlementExceptionQaFixturesDto } from './dto/list-settlement-exception-qa-fixtures.dto';
import { ListSettlementExceptionsDto } from './dto/list-settlement-exceptions.dto';
import { UpdateSettlementExceptionDto } from './dto/update-settlement-exception.dto';

type ReconciliationMismatchReason =
  | 'paid_without_success_callback'
  | 'failed_with_success_callback'
  | 'stuck_non_terminal';

type ReconciliationMismatch = {
  transactionId: string;
  transactionReference: string;
  merchantId: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
  reason: ReconciliationMismatchReason;
};

type MerchantReconciliationSummary = {
  merchantId: string;
  paidDepositAmount: number;
  paidWithdrawAmount: number;
  refundedAmount: number;
  netSettledAmount: number;
  transactionCount: number;
};

type ReconciliationReport = {
  reportDate: string;
  windowStart: string;
  windowEnd: string;
  generatedAt: string;
  merchants: MerchantReconciliationSummary[];
  mismatches: ReconciliationMismatch[];
};

type DailySettlementSummary = {
  reportDate: string;
  windowStart: string;
  windowEnd: string;
  generatedAt: string;
  summary: {
    merchantCount: number;
    transactionCount: number;
    paidDepositAmount: number;
    paidWithdrawAmount: number;
    refundedAmount: number;
    netSettledAmount: number;
    mismatchCount: number;
  };
  merchants: MerchantReconciliationSummary[];
};

type ExceptionListItem = {
  id: string;
  merchantId: string;
  providerName: string;
  windowDate: string;
  ledgerTotal: number;
  providerTotal: number;
  deltaAmount: number;
  status: SettlementExceptionStatus;
  openedReason: string;
  openedNote: string | null;
  latestOperatorReason: string | null;
  latestOperatorNote: string | null;
  resolutionActor: string | null;
  resolutionAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

type ExceptionAuditItem = {
  id: string;
  fromStatus: SettlementExceptionStatus | null;
  toStatus: SettlementExceptionStatus;
  reason: string;
  note: string | null;
  actor: string;
  createdAt: string;
};

type ExceptionDetail = ExceptionListItem & {
  audits: ExceptionAuditItem[];
};

type ExceptionActionIdempotencyEnvelope = {
  status: 'pending' | 'completed';
  fingerprint: string;
  response?: ExceptionDetail;
};

type ExceptionActionConflictReason =
  | 'stale_version'
  | 'stale_updated_at'
  | 'terminal_status'
  | 'idempotency_key_reused'
  | 'idempotency_in_progress';

type ExceptionQaFixtureItem = {
  id: string;
  scenario: ExceptionQaScenario;
  merchantId: string;
  providerName: string;
  windowDate: string;
  ledgerTotal: number;
  providerTotal: number;
  deltaAmount: number;
  status: SettlementExceptionStatus;
  openedReason: string;
  openedNote: string;
  latestOperatorReason: string | null;
  latestOperatorNote: string | null;
  resolutionActor: string | null;
  resolutionAt: string | null;
  version: number;
};

type SettlementBulkActionPreviewContractWarning = {
  code: BulkSettlementPreviewWarningCode;
  message: string;
  remediationHint: string;
  rowIndex: number | null;
  exceptionId: string | null;
  field: 'row' | 'id' | 'status' | 'deltaAmount' | 'riskBucket' | 'selection';
};

type SettlementBulkActionPreviewContractResponse = {
  contract: 'settlement-bulk-action-preview.v1';
  selectedCount: number;
  byStatus: Record<BulkSettlementPreviewStatusBucket, number>;
  byRiskBucket: Record<BulkSettlementPreviewRiskBucket, number>;
  malformedCount: number;
  warnings: SettlementBulkActionPreviewContractWarning[];
  metadata: {
    requestedCount: number;
    validCount: number;
    hasMismatch: boolean;
    warningCount: number;
    warningByCode: Record<BulkSettlementPreviewWarningCode, number>;
    errorCodeMap: Array<{
      code: BulkSettlementPreviewWarningCode;
      remediationHint: string;
    }>;
  };
  recommendation: {
    contract: 'settlement-bulk-rollback-recommendation.v1';
    classification: 'safe_to_apply' | 'needs_review' | 'rollback_recommended';
    bucketCounts: Record<'safe_to_apply' | 'needs_review' | 'rollback_recommended', number>;
    reasonCodes: BulkSettlementRollbackReasonCode[];
    reasonCodeMap: Array<{
      code: BulkSettlementRollbackReasonCode;
      severity: BulkSettlementRollbackReasonSeverity;
      description: string;
    }>;
  };
};

type SettlementBulkActionSimulationContractResponse = BulkSettlementActionSimulation;
type SettlementExplainabilityPresetProfileContractResponse = SettlementExplainabilityPresetProfile;
type SettlementPacketAuditSummaryContractResponse = SettlementPacketAuditSummary;
type SettlementEvidenceLineageContractResponse = SettlementEvidenceLineageContract;
type SettlementPublicationReadinessTrendContractResponse = SettlementPublicationReadinessTrend;

@Injectable()
export class SettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateDailyReconciliation(date?: string): Promise<ReconciliationReport> {
    const report = await this.buildReport(date);

    await this.prisma.auditLog.create({
      data: {
        eventType: 'settlement.reconciliation.generated',
        actor: 'system',
        entityType: 'settlement_report',
        entityId: report.reportDate,
        metadata: JSON.stringify({
          reportDate: report.reportDate,
          generatedAt: report.generatedAt,
          merchants: report.merchants.length,
          mismatches: report.mismatches.length,
        }),
      },
    });

    return report;
  }

  async queryMismatches(filters: {
    date?: string;
    merchantId?: string;
    transactionReference?: string;
  }): Promise<ReconciliationReport> {
    const report = await this.buildReport(filters.date);
    return {
      ...report,
      mismatches: report.mismatches.filter((row) => {
        if (filters.merchantId && row.merchantId !== filters.merchantId) {
          return false;
        }
        if (filters.transactionReference && row.transactionReference !== filters.transactionReference) {
          return false;
        }
        return true;
      }),
    };
  }

  async getDailySummary(date?: string, merchantId?: string): Promise<DailySettlementSummary> {
    const report = await this.buildReport(date);
    const merchants = merchantId
      ? report.merchants.filter((row) => row.merchantId === merchantId)
      : report.merchants;

    const summary = merchants.reduce(
      (acc, row) => {
        acc.transactionCount += row.transactionCount;
        acc.paidDepositAmount += row.paidDepositAmount;
        acc.paidWithdrawAmount += row.paidWithdrawAmount;
        acc.refundedAmount += row.refundedAmount;
        acc.netSettledAmount += row.netSettledAmount;
        return acc;
      },
      {
        merchantCount: merchants.length,
        transactionCount: 0,
        paidDepositAmount: 0,
        paidWithdrawAmount: 0,
        refundedAmount: 0,
        netSettledAmount: 0,
        mismatchCount: report.mismatches.filter((row) => (merchantId ? row.merchantId === merchantId : true)).length,
      },
    );

    return {
      reportDate: report.reportDate,
      windowStart: report.windowStart,
      windowEnd: report.windowEnd,
      generatedAt: report.generatedAt,
      summary,
      merchants,
    };
  }

  async detectSettlementExceptions(input: DetectSettlementExceptionsDto, actor: string) {
    if (!input.records.length) {
      throw new BadRequestException('records must not be empty');
    }

    const { dateKey, start, end } = this.resolveDayWindow(input.windowDate);
    const uniqueKeys = new Set<string>();
    for (const record of input.records) {
      const key = `${record.merchantId}::${record.providerName}`;
      if (uniqueKeys.has(key)) {
        throw new BadRequestException(`Duplicate record for merchant/provider pair: ${key}`);
      }
      uniqueKeys.add(key);
    }

    const merchantIds = [...new Set(input.records.map((record) => record.merchantId))];
    const providerNames = [...new Set(input.records.map((record) => record.providerName))];

    const transactions = await this.prisma.transaction.findMany({
      where: {
        merchantId: { in: merchantIds },
        providerName: { in: providerNames },
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      select: {
        merchantId: true,
        providerName: true,
        type: true,
        status: true,
        amount: true,
      },
    });

    const ledgerByKey = new Map<string, number>();
    for (const tx of transactions) {
      if (!tx.providerName) {
        continue;
      }
      const key = `${tx.merchantId}::${tx.providerName}`;
      const running = ledgerByKey.get(key) ?? 0;
      const amount = this.decimalToNumber(tx.amount);

      if (tx.status === TransactionStatus.PAID) {
        if (tx.type === TransactionType.DEPOSIT) {
          ledgerByKey.set(key, running + amount);
        } else {
          ledgerByKey.set(key, running - amount);
        }
      } else if (tx.status === TransactionStatus.REFUNDED) {
        ledgerByKey.set(key, running - amount);
      }
    }

    const detected: ExceptionListItem[] = [];
    for (const record of input.records) {
      const exception = await this.upsertMismatchException(record, {
        actor,
        dateKey,
        ledgerTotal: ledgerByKey.get(`${record.merchantId}::${record.providerName}`) ?? 0,
      });
      if (exception) {
        detected.push(exception);
      }
    }

    return {
      reportDate: dateKey,
      detectedCount: detected.length,
      exceptions: detected,
    };
  }

  async listSettlementExceptions(query: ListSettlementExceptionsDto) {
    const take = this.clampTake(query.take);
    const where: Prisma.SettlementExceptionWhereInput = {};

    if (query.merchantId) {
      where.merchantId = query.merchantId;
    }
    if (query.providerName) {
      where.providerName = query.providerName;
    }
    if (query.status) {
      where.status = query.status;
    }

    if (query.dateFrom || query.dateTo) {
      where.windowDate = {
        ...(query.dateFrom ? { gte: this.resolveDayWindow(query.dateFrom).start } : {}),
        ...(query.dateTo ? { lt: this.resolveDayWindow(query.dateTo).end } : {}),
      };
    }

    const rows = await this.prisma.settlementException.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: take + 1,
      ...(query.cursor
        ? {
          cursor: { id: query.cursor },
          skip: 1,
        }
        : {}),
    });

    const hasNext = rows.length > take;
    const page = hasNext ? rows.slice(0, take) : rows;

    return {
      data: page.map((item) => this.toExceptionListItem(item)),
      pageInfo: {
        take,
        hasNext,
        nextCursor: hasNext ? page[page.length - 1]?.id ?? null : null,
      },
    };
  }

  listSettlementExceptionQaFixtures(query: ListSettlementExceptionQaFixturesDto): {
    data: ExceptionQaFixtureItem[];
    total: number;
  } {
    const fixtures = SETTLEMENT_EXCEPTION_QA_FIXTURES.filter((row) => {
      if (query.scenario && row.scenario !== query.scenario) {
        return false;
      }
      if (query.status && row.status !== query.status) {
        return false;
      }
      return true;
    });

    return {
      data: fixtures.map((row) => ({
        ...row,
        windowDate: SETTLEMENT_EXCEPTION_QA_WINDOW_DATE,
      })),
      total: fixtures.length,
    };
  }

  buildSettlementExceptionBulkActionPreview(
    input: BuildSettlementBulkActionPreviewDto,
  ): SettlementBulkActionPreviewContractResponse {
    const preview = buildBulkSettlementActionPreviewExport(input);
    const recommendation = buildBulkSettlementRollbackRecommendation(input);

    return {
      contract: 'settlement-bulk-action-preview.v1',
      selectedCount: preview.summary.selection.validCount,
      byStatus: preview.summary.statusBuckets,
      byRiskBucket: preview.summary.riskBuckets,
      malformedCount: preview.summary.selection.malformedCount,
      warnings: preview.warnings.map((warning) => ({
        ...warning,
        remediationHint: BULK_SETTLEMENT_PREVIEW_WARNING_HINTS[warning.code],
      })),
      metadata: {
        requestedCount: preview.summary.selection.requestedCount,
        validCount: preview.summary.selection.validCount,
        hasMismatch: preview.summary.selection.hasMismatch,
        warningCount: preview.warningSummary.totalWarnings,
        warningByCode: preview.warningSummary.byCode,
        errorCodeMap: Object.entries(BULK_SETTLEMENT_PREVIEW_WARNING_HINTS).map(
          ([code, remediationHint]) => ({
            code: code as BulkSettlementPreviewWarningCode,
            remediationHint,
          }),
        ),
      },
      recommendation: {
        contract: recommendation.contract,
        classification: recommendation.classification,
        bucketCounts: recommendation.bucketCounts,
        reasonCodes: recommendation.reasonCodes,
        reasonCodeMap: recommendation.reasonCodeMap,
      },
    };
  }

  buildSettlementExceptionBulkTriageSnapshot(
    input: BuildSettlementBulkActionPreviewDto,
  ): BulkSettlementTriageSnapshot {
    return buildBulkSettlementTriageSnapshot(input);
  }

  buildSettlementExceptionBulkActionSimulation(
    input: BuildSettlementBulkActionPreviewDto,
  ): SettlementBulkActionSimulationContractResponse {
    return buildBulkSettlementActionSimulation(input);
  }

  buildSettlementExceptionExplainabilityPresetProfile(
    input: BuildSettlementExplainabilityPresetProfileDto,
  ): SettlementExplainabilityPresetProfileContractResponse {
    return buildSettlementExplainabilityPresetProfile(input);
  }

  buildSettlementExceptionPacketAuditSummary(
    input: BuildSettlementPacketAuditSummaryDto,
  ): SettlementPacketAuditSummaryContractResponse {
    try {
      return buildSettlementPacketAuditSummary(input);
    } catch (error) {
      if (
        typeof error === 'object'
        && error !== null
        && 'status' in error
        && (error as { status?: number }).status === 400
        && 'response' in error
      ) {
        throw new BadRequestException((error as { response: unknown }).response);
      }
      throw error;
    }
  }

  buildSettlementExceptionEvidenceLineage(
    input: BuildSettlementEvidenceLineageDto,
  ): SettlementEvidenceLineageContractResponse {
    try {
      return buildSettlementEvidenceLineage(input);
    } catch (error) {
      if (
        typeof error === 'object'
        && error !== null
        && 'status' in error
        && (error as { status?: number }).status === 400
        && 'response' in error
      ) {
        throw new BadRequestException((error as { response: unknown }).response);
      }
      throw error;
    }
  }

  buildSettlementExceptionPublicationReadinessTrend(
    input: BuildSettlementPublicationReadinessTrendDto,
  ): SettlementPublicationReadinessTrendContractResponse {
    return buildSettlementPublicationReadinessTrend(input);
  }

  async getSettlementException(exceptionId: string): Promise<ExceptionDetail> {
    const exception = await this.prisma.settlementException.findUnique({
      where: { id: exceptionId },
      include: {
        audits: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!exception) {
      throw new NotFoundException('Settlement exception not found');
    }

    return this.toExceptionDetail(exception);
  }

  async updateSettlementException(
    exceptionId: string,
    input: UpdateSettlementExceptionDto,
    actor: string,
  ): Promise<ExceptionDetail> {
    const reason = input.reason.trim();
    if (!reason) {
      throw new BadRequestException('reason is required');
    }
    const note = input.note?.trim() || null;
    const idempotencyKey = input.idempotencyKey?.trim() || null;

    const existing = await this.prisma.settlementException.findUnique({ where: { id: exceptionId } });

    if (!existing) {
      throw new NotFoundException('Settlement exception not found');
    }

    const requestFingerprint = this.exceptionActionRequestFingerprint(exceptionId, {
      action: input.action,
      reason,
      note,
      expectedVersion: input.expectedVersion,
      expectedUpdatedAt: input.expectedUpdatedAt?.trim() || null,
    });

    let claimedIdempotency = false;
    if (idempotencyKey) {
      const replay = await this.claimOrReplayExceptionAction(
        exceptionId,
        existing,
        idempotencyKey,
        requestFingerprint,
      );
      if (replay) {
        return replay;
      }
      claimedIdempotency = true;
    }

    const toStatus = input.action === 'resolve'
      ? SettlementExceptionStatus.RESOLVED
      : SettlementExceptionStatus.IGNORED;

    await this.logExceptionActionEvent('attempted', existing, actor, {
      action: input.action,
      expectedVersion: input.expectedVersion,
      expectedUpdatedAt: input.expectedUpdatedAt?.trim() || null,
      idempotencyKeyPresent: Boolean(idempotencyKey),
    });

    try {
      if (input.expectedUpdatedAt && existing.updatedAt.toISOString() !== input.expectedUpdatedAt) {
        await this.logExceptionActionEvent('conflict', existing, actor, {
          reason: 'stale_updated_at',
          action: input.action,
          expectedVersion: input.expectedVersion,
          expectedUpdatedAt: input.expectedUpdatedAt,
        });
        throw this.buildActionConflict(
          existing,
          'stale_updated_at',
          'Version conflict; refresh and retry with current version',
          input.expectedVersion,
          input.expectedUpdatedAt,
          true,
        );
      }

      if (
        existing.status === SettlementExceptionStatus.RESOLVED
        || existing.status === SettlementExceptionStatus.IGNORED
      ) {
        await this.logExceptionActionEvent('invalid', existing, actor, {
          reason: 'terminal_status',
          action: input.action,
        });
        throw this.buildActionConflict(
          existing,
          'terminal_status',
          'Settlement exception is already in terminal status',
          input.expectedVersion,
          input.expectedUpdatedAt?.trim() || null,
          false,
        );
      }

      const updated = await this.prisma.settlementException.updateMany({
        where: {
          id: exceptionId,
          version: input.expectedVersion,
        },
        data: {
          status: toStatus,
          latestOperatorReason: reason,
          latestOperatorNote: note,
          resolutionActor: actor,
          resolutionAt: new Date(),
          version: {
            increment: 1,
          },
        },
      });

      if (updated.count !== 1) {
        const latest = await this.prisma.settlementException.findUnique({ where: { id: exceptionId } });
        if (latest) {
          await this.logExceptionActionEvent('conflict', latest, actor, {
            reason: 'stale_version',
            action: input.action,
            expectedVersion: input.expectedVersion,
          });
          throw this.buildActionConflict(
            latest,
            'stale_version',
            'Version conflict; refresh and retry with current version',
            input.expectedVersion,
            input.expectedUpdatedAt?.trim() || null,
            true,
          );
        }

        throw new ConflictException('Version conflict; refresh and retry with current version');
      }

      await this.prisma.settlementExceptionAudit.create({
        data: {
          settlementExceptionId: exceptionId,
          fromStatus: existing.status,
          toStatus,
          reason,
          note,
          actor,
        },
      });

      const response = await this.getSettlementException(exceptionId);
      await this.logExceptionActionEvent('succeeded', {
        ...existing,
        status: response.status,
        version: response.version,
        updatedAt: new Date(response.updatedAt),
      }, actor, {
        action: input.action,
        toStatus: response.status,
      });

      if (idempotencyKey) {
        await this.prisma.idempotencyKey.update({
          where: {
            scope_key: {
              scope: this.exceptionActionIdempotencyScope(exceptionId),
              key: idempotencyKey,
            },
          },
          data: {
            responseBody: JSON.stringify({
              status: 'completed',
              fingerprint: requestFingerprint,
              response,
            } satisfies ExceptionActionIdempotencyEnvelope),
          },
        });
      }

      return response;
    } catch (error) {
      if (idempotencyKey && claimedIdempotency) {
        await this.releasePendingExceptionActionIdempotency(exceptionId, idempotencyKey, requestFingerprint);
      }
      throw error;
    }
  }

  private async claimOrReplayExceptionAction(
    exceptionId: string,
    existing: {
      id: string;
      merchantId: string;
      providerName: string;
      status: SettlementExceptionStatus;
      version: number;
      updatedAt: Date;
    },
    idempotencyKey: string,
    requestFingerprint: string,
  ): Promise<ExceptionDetail | null> {
    const scope = this.exceptionActionIdempotencyScope(exceptionId);

    try {
      await this.prisma.idempotencyKey.create({
        data: {
          scope,
          key: idempotencyKey,
          responseBody: JSON.stringify({
            status: 'pending',
            fingerprint: requestFingerprint,
          } satisfies ExceptionActionIdempotencyEnvelope),
        },
      });
      return null;
    } catch (error) {
      if (!this.isPrismaUniqueViolation(error)) {
        throw error;
      }

      const existingKey = await this.prisma.idempotencyKey.findUnique({
        where: {
          scope_key: { scope, key: idempotencyKey },
        },
      });

      if (!existingKey) {
        throw error;
      }

      const envelope = this.parseExceptionActionIdempotencyEnvelope(existingKey.responseBody);
      if (envelope && envelope.fingerprint === requestFingerprint) {
        if (envelope.status === 'completed' && envelope.response) {
          return envelope.response;
        }
        throw this.buildActionConflict(
          existing,
          'idempotency_in_progress',
          'Action request with this idempotency key is in progress; retry shortly',
          existing.version,
          existing.updatedAt.toISOString(),
          true,
        );
      }

      throw this.buildActionConflict(
        existing,
        'idempotency_key_reused',
        'Idempotency key already used with different request payload',
        existing.version,
        existing.updatedAt.toISOString(),
        false,
      );
    }
  }

  private parseExceptionActionIdempotencyEnvelope(responseBody: string): ExceptionActionIdempotencyEnvelope | null {
    try {
      const parsed = JSON.parse(responseBody) as ExceptionActionIdempotencyEnvelope;
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }
      if ((parsed.status !== 'pending' && parsed.status !== 'completed') || typeof parsed.fingerprint !== 'string') {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private async releasePendingExceptionActionIdempotency(
    exceptionId: string,
    idempotencyKey: string,
    requestFingerprint: string,
  ): Promise<void> {
    const scope = this.exceptionActionIdempotencyScope(exceptionId);
    const existingKey = await this.prisma.idempotencyKey.findUnique({
      where: {
        scope_key: { scope, key: idempotencyKey },
      },
    });

    if (!existingKey) {
      return;
    }

    const envelope = this.parseExceptionActionIdempotencyEnvelope(existingKey.responseBody);
    if (envelope?.status === 'pending' && envelope.fingerprint === requestFingerprint) {
      await this.prisma.idempotencyKey.delete({
        where: {
          scope_key: { scope, key: idempotencyKey },
        },
      });
    }
  }

  private exceptionActionIdempotencyScope(exceptionId: string): string {
    return `settlement_exception_action:${exceptionId}`;
  }

  private exceptionActionRequestFingerprint(
    exceptionId: string,
    input: {
      action: 'resolve' | 'ignore';
      reason: string;
      note: string | null;
      expectedVersion: number;
      expectedUpdatedAt: string | null;
    },
  ): string {
    return JSON.stringify({
      exceptionId,
      action: input.action,
      reason: input.reason,
      note: input.note,
      expectedVersion: input.expectedVersion,
      expectedUpdatedAt: input.expectedUpdatedAt,
    });
  }

  private isPrismaUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object'
      && error !== null
      && 'code' in error
      && (error as { code?: string }).code === 'P2002'
    );
  }

  private buildActionConflict(
    exception: {
      id: string;
      status?: SettlementExceptionStatus;
      version: number;
      updatedAt: Date;
    },
    reason: ExceptionActionConflictReason,
    message: string,
    expectedVersion: number,
    expectedUpdatedAt: string | null,
    retryable: boolean,
  ): ConflictException {
    return new ConflictException({
      code: 'SETTLEMENT_EXCEPTION_ACTION_CONFLICT',
      reason,
      message,
      retryable,
      exceptionId: exception.id,
      expectedVersion,
      expectedUpdatedAt,
      currentStatus: exception.status ?? null,
      currentVersion: exception.version,
      currentUpdatedAt: exception.updatedAt.toISOString(),
    });
  }

  private async logExceptionActionEvent(
    outcome: 'attempted' | 'succeeded' | 'conflict' | 'invalid',
    exception: {
      id: string;
      merchantId: string;
      providerName: string;
      status: SettlementExceptionStatus;
      version: number;
      updatedAt: Date;
    },
    actor: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        eventType: `settlement.exception.action.${outcome}`,
        actor,
        entityType: 'settlement_exception',
        entityId: exception.id,
        metadata: JSON.stringify({
          merchantId: exception.merchantId,
          providerName: exception.providerName,
          status: exception.status,
          version: exception.version,
          updatedAt: exception.updatedAt.toISOString(),
          ...metadata,
        }),
      },
    });
  }

  private async upsertMismatchException(
    record: DetectSettlementRecord,
    context: {
      actor: string;
      dateKey: string;
      ledgerTotal: number;
    },
  ): Promise<ExceptionListItem | null> {
    const providerTotal = this.normalizeAmount(record.providerTotal);
    const ledgerTotal = this.normalizeAmount(context.ledgerTotal);
    const deltaAmount = this.normalizeAmount(ledgerTotal - providerTotal);

    if (Math.abs(deltaAmount) < 0.000001) {
      return null;
    }

    const fingerprint = this.exceptionFingerprint(context.dateKey, record.merchantId, record.providerName);
    const existing = await this.prisma.settlementException.findUnique({
      where: { fingerprint },
    });

    if (!existing) {
      const created = await this.prisma.settlementException.create({
        data: {
          merchantId: record.merchantId,
          providerName: record.providerName,
          windowDate: new Date(`${context.dateKey}T00:00:00.000Z`),
          ledgerTotal: new Prisma.Decimal(ledgerTotal),
          providerTotal: new Prisma.Decimal(providerTotal),
          deltaAmount: new Prisma.Decimal(deltaAmount),
          fingerprint,
          status: SettlementExceptionStatus.OPEN,
          openedReason: 'ledger_provider_mismatch',
          openedNote: record.note?.trim() || null,
        },
      });

      await this.prisma.settlementExceptionAudit.create({
        data: {
          settlementExceptionId: created.id,
          fromStatus: null,
          toStatus: SettlementExceptionStatus.OPEN,
          reason: 'mismatch_detected',
          note: record.note?.trim() || null,
          actor: context.actor,
        },
      });

      return this.toExceptionListItem(created);
    }

    let nextStatus = existing.status;
    let auditReason: string | null = null;
    if (
      existing.status === SettlementExceptionStatus.RESOLVED
      || existing.status === SettlementExceptionStatus.IGNORED
    ) {
      nextStatus = SettlementExceptionStatus.OPEN;
      auditReason = 'mismatch_reopened';
    }

    const updated = await this.prisma.settlementException.update({
      where: { id: existing.id },
      data: {
        ledgerTotal: new Prisma.Decimal(ledgerTotal),
        providerTotal: new Prisma.Decimal(providerTotal),
        deltaAmount: new Prisma.Decimal(deltaAmount),
        status: nextStatus,
        latestOperatorReason: null,
        latestOperatorNote: null,
        resolutionActor: null,
        resolutionAt: null,
        version: {
          increment: 1,
        },
      },
    });

    if (auditReason) {
      await this.prisma.settlementExceptionAudit.create({
        data: {
          settlementExceptionId: existing.id,
          fromStatus: existing.status,
          toStatus: SettlementExceptionStatus.OPEN,
          reason: auditReason,
          note: record.note?.trim() || null,
          actor: context.actor,
        },
      });
    }

    return this.toExceptionListItem(updated);
  }

  private toExceptionListItem(exception: {
    id: string;
    merchantId: string;
    providerName: string;
    windowDate: Date;
    ledgerTotal: Prisma.Decimal | number;
    providerTotal: Prisma.Decimal | number;
    deltaAmount: Prisma.Decimal | number;
    status: SettlementExceptionStatus;
    openedReason: string;
    openedNote: string | null;
    latestOperatorReason: string | null;
    latestOperatorNote: string | null;
    resolutionActor: string | null;
    resolutionAt: Date | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }): ExceptionListItem {
    return {
      id: exception.id,
      merchantId: exception.merchantId,
      providerName: exception.providerName,
      windowDate: exception.windowDate.toISOString().slice(0, 10),
      ledgerTotal: this.decimalToNumber(exception.ledgerTotal),
      providerTotal: this.decimalToNumber(exception.providerTotal),
      deltaAmount: this.decimalToNumber(exception.deltaAmount),
      status: exception.status,
      openedReason: exception.openedReason,
      openedNote: exception.openedNote,
      latestOperatorReason: exception.latestOperatorReason,
      latestOperatorNote: exception.latestOperatorNote,
      resolutionActor: exception.resolutionActor,
      resolutionAt: exception.resolutionAt ? exception.resolutionAt.toISOString() : null,
      version: exception.version,
      createdAt: exception.createdAt.toISOString(),
      updatedAt: exception.updatedAt.toISOString(),
    };
  }

  private toExceptionDetail(exception: {
    id: string;
    merchantId: string;
    providerName: string;
    windowDate: Date;
    ledgerTotal: Prisma.Decimal | number;
    providerTotal: Prisma.Decimal | number;
    deltaAmount: Prisma.Decimal | number;
    status: SettlementExceptionStatus;
    openedReason: string;
    openedNote: string | null;
    latestOperatorReason: string | null;
    latestOperatorNote: string | null;
    resolutionActor: string | null;
    resolutionAt: Date | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    audits: Array<{
      id: string;
      fromStatus: SettlementExceptionStatus | null;
      toStatus: SettlementExceptionStatus;
      reason: string;
      note: string | null;
      actor: string;
      createdAt: Date;
    }>;
  }): ExceptionDetail {
    return {
      ...this.toExceptionListItem(exception),
      audits: exception.audits.map((audit) => ({
        id: audit.id,
        fromStatus: audit.fromStatus,
        toStatus: audit.toStatus,
        reason: audit.reason,
        note: audit.note,
        actor: audit.actor,
        createdAt: audit.createdAt.toISOString(),
      })),
    };
  }

  private clampTake(value?: number): number {
    if (!value || Number.isNaN(value)) {
      return 20;
    }
    return Math.max(1, Math.min(100, value));
  }

  private normalizeAmount(amount: number): number {
    return Number(amount.toFixed(2));
  }

  private decimalToNumber(value: Prisma.Decimal | number): number {
    if (typeof value === 'number') {
      return value;
    }
    return Number(value.toString());
  }

  private exceptionFingerprint(windowDate: string, merchantId: string, providerName: string): string {
    return `${windowDate}:${merchantId}:${providerName}`;
  }

  private async buildReport(date?: string): Promise<ReconciliationReport> {
    const { dateKey, start, end } = this.resolveDayWindow(date);
    const transactions = await this.prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      include: {
        callbackEvents: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const byMerchant = new Map<string, MerchantReconciliationSummary>();
    const mismatches: ReconciliationMismatch[] = [];

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      const merchant = byMerchant.get(tx.merchantId) ?? {
        merchantId: tx.merchantId,
        paidDepositAmount: 0,
        paidWithdrawAmount: 0,
        refundedAmount: 0,
        netSettledAmount: 0,
        transactionCount: 0,
      };
      merchant.transactionCount += 1;

      if (tx.status === TransactionStatus.PAID) {
        if (tx.type === TransactionType.DEPOSIT) {
          merchant.paidDepositAmount += amount;
        } else {
          merchant.paidWithdrawAmount += amount;
        }
      } else if (tx.status === TransactionStatus.REFUNDED) {
        merchant.refundedAmount += amount;
      }

      merchant.netSettledAmount = merchant.paidDepositAmount - merchant.paidWithdrawAmount - merchant.refundedAmount;
      byMerchant.set(tx.merchantId, merchant);

      const hasSuccessCallback = tx.callbackEvents.some((event) => event.status === 'succeeded');
      if (tx.status === TransactionStatus.PAID && !hasSuccessCallback) {
        mismatches.push(this.toMismatch(tx, amount, 'paid_without_success_callback'));
        continue;
      }
      if (tx.status === TransactionStatus.FAILED && hasSuccessCallback) {
        mismatches.push(this.toMismatch(tx, amount, 'failed_with_success_callback'));
        continue;
      }
      if (tx.status === TransactionStatus.CREATED || tx.status === TransactionStatus.PENDING) {
        mismatches.push(this.toMismatch(tx, amount, 'stuck_non_terminal'));
      }
    }

    return {
      reportDate: dateKey,
      windowStart: start.toISOString(),
      windowEnd: end.toISOString(),
      generatedAt: new Date().toISOString(),
      merchants: [...byMerchant.values()].sort((a, b) => a.merchantId.localeCompare(b.merchantId)),
      mismatches,
    };
  }

  private toMismatch(
    tx: {
      id: string;
      reference: string;
      merchantId: string;
      status: TransactionStatus;
      amount: unknown;
      currency: string;
    },
    amount: number,
    reason: ReconciliationMismatchReason,
  ): ReconciliationMismatch {
    return {
      transactionId: tx.id,
      transactionReference: tx.reference,
      merchantId: tx.merchantId,
      status: tx.status,
      amount,
      currency: tx.currency,
      reason,
    };
  }

  private resolveDayWindow(rawDate?: string): { dateKey: string; start: Date; end: Date } {
    const dateKey = rawDate?.trim() || new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }

    const start = new Date(`${dateKey}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    const end = new Date(start.getTime() + (24 * 60 * 60 * 1000));
    return { dateKey, start, end };
  }
}
