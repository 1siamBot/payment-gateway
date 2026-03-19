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
import { BuildSettlementEvidencePacketLintDto } from './dto/build-settlement-evidence-packet-lint.dto';
import { BuildSettlementEvidenceGapSummaryDto } from './dto/build-settlement-evidence-gap-summary.dto';
import { BuildSettlementEvidenceAnomalyScorecardDto } from './dto/build-settlement-evidence-anomaly-scorecard.dto';
import { BuildSettlementRemediationManifestDto } from './dto/build-settlement-remediation-manifest.dto';
import { BuildSettlementRemediationPublicationRouteDecisionEnvelopeDto } from './dto/build-settlement-remediation-publication-route-decision-envelope.dto';
import { BuildSettlementReleaseGateRemediationPlanDto } from './dto/build-settlement-release-gate-remediation-plan.dto';
import { BuildSettlementRemediationRunbookDto } from './dto/build-settlement-remediation-runbook.dto';
import { BuildSettlementReleaseGateEvidenceDigestDto } from './dto/build-settlement-release-gate-evidence-digest.dto';
import { BuildSettlementDeliveryReadinessDigestDto } from './dto/build-settlement-delivery-readiness-digest.dto';
import {
  BuildSettlementBulkActionPreviewDto,
} from './dto/build-settlement-bulk-action-preview.dto';
import { BuildSettlementExplainabilityPresetProfileDto } from './dto/build-settlement-explainability-preset-profile.dto';
import { BuildSettlementPacketAuditSummaryDto } from './dto/build-settlement-packet-audit-summary.dto';
import { BuildSettlementPublicationWindowDiagnosticsDto } from './dto/build-settlement-publication-window-diagnostics.dto';
import { BuildSettlementPublicationDiagnosticsContractSnapshotDto } from './dto/build-settlement-publication-diagnostics-contract-snapshot.dto';
import { BuildSettlementPublicationDiagnosticsDeltaBundleDto } from './dto/build-settlement-publication-diagnostics-delta-bundle.dto';
import { BuildSettlementPublicationDiagnosticsFixtureExportDto } from './dto/build-settlement-publication-diagnostics-fixture-export.dto';
import { BuildSettlementPublicationDiagnosticsTrendDigestDto } from './dto/build-settlement-publication-diagnostics-trend-digest.dto';
import { BuildSettlementPublicationEvidenceManifestDto } from './dto/build-settlement-publication-evidence-manifest.dto';
import { BuildSettlementAdjudicationRoutingManifestDto } from './dto/build-settlement-adjudication-routing-manifest.dto';
import { BuildSettlementQaReleaseGateVerdictPacketDto } from './dto/build-settlement-qa-release-gate-verdict-packet.dto';
import { BuildSettlementReleaseEvidenceAdjudicationSnapshotDto } from './dto/build-settlement-release-evidence-adjudication-snapshot.dto';
import { BuildSettlementReleaseCandidateRemediationQueueDto } from './dto/build-settlement-release-candidate-remediation-queue.dto';
import { BuildSettlementReleaseReadyDependencyGraphSnapshotDto } from './dto/build-settlement-release-ready-dependency-graph-snapshot.dto';
import { BuildSettlementReleaseCandidateHandoffPacketDto } from './dto/build-settlement-release-candidate-handoff-packet.dto';
import { BuildSettlementReleaseCandidateScorecardDto } from './dto/build-settlement-release-candidate-scorecard.dto';
import { BuildSettlementRemediationExecutionBlueprintPacketDto } from './dto/build-settlement-remediation-execution-blueprint-packet.dto';
import { BuildSettlementRemediationPublicationHandoffBundleDto } from './dto/build-settlement-remediation-publication-handoff-bundle.dto';
import { BuildSettlementRemediationPublicationReadinessEnvelopeDto } from './dto/build-settlement-remediation-publication-readiness-envelope.dto';
import { BuildSettlementPublicationWindowPlanDto } from './dto/build-settlement-publication-window-plan.dto';
import { BuildSettlementPublicationReadinessTrendDto } from './dto/build-settlement-publication-readiness-trend.dto';
import {
  ExceptionQaScenario,
  SETTLEMENT_EXCEPTION_QA_FIXTURES,
  SETTLEMENT_EXCEPTION_QA_WINDOW_DATE,
} from './exception-qa-fixtures';
import {
  RECONCILIATION_DISCREPANCY_CONTRACT_VERSION,
  RECONCILIATION_DISCREPANCY_FIXTURES,
  RECONCILIATION_DISCREPANCY_FIXTURE_TIMESTAMP,
  type ReconciliationDiscrepancyFixture,
  type ReconciliationDiscrepancyPath,
  type ReconciliationDiscrepancyState,
} from './reconciliation-discrepancy-fixtures';
import {
  RECONCILIATION_MISMATCH_CATEGORIES,
  RECONCILIATION_MISMATCH_DETAIL_CONTRACT_VERSION,
  RECONCILIATION_MISMATCH_DETAIL_FIXTURES,
  RECONCILIATION_MISMATCH_DETAIL_FIXTURE_TIMESTAMP,
  type ReconciliationMismatchCategory,
} from './reconciliation-mismatch-detail-fixtures';
import { buildSettlementPacketAuditSummary, SettlementPacketAuditSummary } from './packet-audit-summary';
import { buildSettlementEvidenceLineage, SettlementEvidenceLineageContract } from './evidence-lineage';
import { buildSettlementEvidenceGapSummary, SettlementEvidenceGapSummary } from './evidence-gap-summary';
import {
  lintSettlementEvidencePackets,
  SettlementEvidencePacketLintContract,
} from './evidence-packet-lint';
import {
  buildSettlementPublicationWindowDiagnostics,
  SettlementPublicationWindowDiagnostics,
} from './publication-window-diagnostics';
import {
  buildSettlementPublicationDiagnosticsContractSnapshot,
  SettlementPublicationDiagnosticsContractSnapshot,
} from './publication-diagnostics-contract-snapshot';
import {
  buildSettlementPublicationDiagnosticsDeltaBundle,
  SettlementPublicationDiagnosticsDeltaBundle,
} from './publication-diagnostics-delta-bundle';
import {
  buildSettlementPublicationDiagnosticsFixtureExport,
  SettlementPublicationDiagnosticsFixtureExport,
} from './publication-diagnostics-fixture-export';
import {
  buildSettlementPublicationDiagnosticsTrendDigest,
  SettlementPublicationDiagnosticsTrendDigest,
} from './publication-diagnostics-trend-digest';
import {
  buildSettlementPublicationEvidenceManifest,
  SettlementPublicationEvidenceManifest,
} from './publication-evidence-manifest';
import {
  buildSettlementReleaseCandidateScorecard,
  SettlementReleaseCandidateScorecard,
} from './release-candidate-scorecard';
import {
  buildSettlementReleaseEvidenceAdjudicationSnapshot,
  SettlementReleaseEvidenceAdjudicationSnapshot,
} from './release-evidence-adjudication-snapshot';
import {
  buildSettlementReleaseCandidateRemediationQueue,
  SettlementReleaseCandidateRemediationQueue,
} from './release-candidate-remediation-queue';
import {
  buildSettlementRemediationExecutionBlueprintPacket,
  SettlementRemediationExecutionBlueprintPacket,
} from './remediation-execution-blueprint-packet';
import {
  buildSettlementRemediationPublicationHandoffBundle,
  SettlementRemediationPublicationHandoffBundle,
} from './remediation-publication-handoff-bundle';
import {
  buildSettlementRemediationPublicationReadinessEnvelope,
  SettlementRemediationPublicationReadinessEnvelope,
} from './remediation-publication-readiness-envelope';
import {
  buildSettlementReleaseReadyDependencyGraphSnapshot,
  SettlementReleaseReadyDependencyGraphSnapshot,
} from './release-ready-dependency-graph-snapshot';
import {
  buildSettlementAdjudicationRoutingManifest,
  SettlementAdjudicationRoutingManifest,
} from './adjudication-routing-manifest';
import {
  buildSettlementQaReleaseGateVerdictPacket,
  SettlementQaReleaseGateVerdictPacket,
} from './qa-release-gate-verdict-packet';
import {
  buildSettlementReleaseCandidateHandoffPacket,
  SettlementReleaseCandidateHandoffPacket,
} from './release-candidate-handoff-packet';
import {
  buildSettlementPublicationWindowPlan,
  SettlementPublicationWindowPlan,
} from './publication-window-plan';
import {
  buildSettlementPublicationReadinessTrend,
  SettlementPublicationReadinessTrend,
} from './publication-readiness-trend';
import {
  buildSettlementDeliveryReadinessDigest,
  SettlementDeliveryReadinessDigest,
} from './delivery-readiness-digest';
import {
  buildSettlementEvidenceAnomalyScorecard,
  SettlementEvidenceAnomalyScorecard,
} from './evidence-anomaly-scorecard';
import {
  buildSettlementExceptionRemediationManifest,
  SettlementExceptionRemediationManifest,
} from './remediation-manifest';
import {
  buildSettlementExceptionRemediationRunbook,
  SettlementExceptionRemediationRunbook,
} from './remediation-runbook';
import {
  buildSettlementRemediationPublicationRouteDecisionEnvelope,
  SettlementRemediationPublicationRouteDecisionEnvelope,
} from './remediation-publication-route-decision-envelope';
import {
  buildSettlementReleaseGateEvidenceDigest,
  SettlementReleaseGateEvidenceDigest,
} from './release-gate-evidence-digest';
import {
  buildSettlementReleaseGateRemediationPlan,
  SettlementReleaseGateRemediationPlan,
} from './release-gate-remediation-plan';
import type {
  DetectSettlementExceptionsDto,
  DetectSettlementRecord,
} from './dto/detect-settlement-exceptions.dto';
import { ListReconciliationDiscrepanciesDto } from './dto/list-reconciliation-discrepancies.dto';
import { ListSettlementExceptionActivityDto } from './dto/list-settlement-exception-activity.dto';
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

type ExceptionSeverity = 'critical' | 'high' | 'medium' | 'low';

type ExceptionActionState = {
  acknowledge: {
    enabled: boolean;
    reason: string;
  };
  assignOwner: {
    enabled: boolean;
    reason: string;
  };
  markResolved: {
    enabled: boolean;
    reason: string;
  };
};

type ExceptionListItem = {
  id: string;
  merchantId: string;
  providerName: string;
  windowDate: string;
  severity: ExceptionSeverity;
  ledgerTotal: number;
  providerTotal: number;
  deltaAmount: number;
  status: SettlementExceptionStatus;
  actionState: ExceptionActionState;
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

type SettlementExceptionActivityActorType = 'system' | 'operator' | 'merchant';

type SettlementExceptionActivityEvent = {
  id: string;
  eventType: string;
  actorType: SettlementExceptionActivityActorType;
  reasonCode: string;
  fromStatus: SettlementExceptionStatus | null;
  toStatus: SettlementExceptionStatus;
  occurredAt: string;
};

type SettlementExceptionActivityCursorReasonCode = 'INVALID_CURSOR' | 'STALE_CURSOR';

type SettlementExceptionActivityResponse = {
  contract: 'settlement-exception-activity-timeline.v1';
  exceptionId: string;
  mode: 'live' | 'fixture';
  data: SettlementExceptionActivityEvent[];
  pageInfo: {
    limit: number;
    hasNext: boolean;
    nextCursor: string | null;
  };
  metadata: {
    reasonCodeMap: Array<{
      reasonCode: SettlementExceptionActivityCursorReasonCode;
      httpStatus: number;
      description: string;
    }>;
  };
};

type SettlementExceptionActivityFixtureScenario = 'normal' | 'empty' | 'stale_cursor';

type SettlementExceptionActivityCursorPayload = {
  version: 'v1';
  anchor: string;
};

type ExceptionActionIdempotencyEnvelope = {
  status: 'pending' | 'completed';
  fingerprint: string;
  response?: ExceptionDetail;
};

type SettlementExceptionCommand = 'acknowledge' | 'assignOwner' | 'markResolved' | 'ignore';

type SettlementExceptionCommandInput = {
  command: SettlementExceptionCommand;
  reason: string;
  note?: string;
  owner?: string;
  idempotencyKey?: string;
  expectedVersion: number;
  expectedUpdatedAt?: string;
};

const EXCEPTION_SEVERITY_WEIGHT: Record<ExceptionSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const SETTLEMENT_EXCEPTION_ACTIVITY_CURSOR_VERSION = 'v1';

const SETTLEMENT_EXCEPTION_ACTIVITY_REASON_CODE_MAP: SettlementExceptionActivityResponse['metadata']['reasonCodeMap'] = [
  {
    reasonCode: 'INVALID_CURSOR',
    httpStatus: 400,
    description: 'Cursor payload is malformed or unsupported.',
  },
  {
    reasonCode: 'STALE_CURSOR',
    httpStatus: 409,
    description: 'Cursor anchor no longer exists in the latest timeline projection.',
  },
];

const SETTLEMENT_EXCEPTION_ACTIVITY_FIXTURE_EVENTS: Record<
SettlementExceptionActivityFixtureScenario,
SettlementExceptionActivityEvent[]
> = {
  normal: [
    {
      id: 'fx_evt_003',
      eventType: 'exception_mark_resolved',
      actorType: 'operator',
      reasonCode: 'resolved_after_manual_review',
      fromStatus: SettlementExceptionStatus.INVESTIGATING,
      toStatus: SettlementExceptionStatus.RESOLVED,
      occurredAt: '2026-03-19T09:20:00.000Z',
    },
    {
      id: 'fx_evt_002',
      eventType: 'exception_acknowledged',
      actorType: 'operator',
      reasonCode: 'investigation_started',
      fromStatus: SettlementExceptionStatus.OPEN,
      toStatus: SettlementExceptionStatus.INVESTIGATING,
      occurredAt: '2026-03-19T09:10:00.000Z',
    },
    {
      id: 'fx_evt_001',
      eventType: 'exception_opened',
      actorType: 'system',
      reasonCode: 'ledger_provider_delta_detected',
      fromStatus: null,
      toStatus: SettlementExceptionStatus.OPEN,
      occurredAt: '2026-03-19T09:00:00.000Z',
    },
  ],
  empty: [],
  stale_cursor: [
    {
      id: 'fx_stale_evt_001',
      eventType: 'exception_opened',
      actorType: 'system',
      reasonCode: 'ledger_provider_delta_detected',
      fromStatus: null,
      toStatus: SettlementExceptionStatus.OPEN,
      occurredAt: '2026-03-19T09:00:00.000Z',
    },
  ],
};

type ExceptionActionConflictReason =
  | 'stale_version'
  | 'stale_updated_at'
  | 'terminal_status'
  | 'invalid_transition'
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

type ReconciliationDiscrepancyListItem = {
  id: string;
  transactionReference: string;
  merchantId: string;
  paymentId: string;
  state: ReconciliationDiscrepancyState;
  path: Exclude<ReconciliationDiscrepancyPath, 'empty'>;
  currency: string;
  ledgerAmount: number;
  providerAmount: number;
  deltaAmount: number;
  captureReference: string | null;
  duplicateEventCount: number;
  providerEventCount: number;
  observedAt: string;
};

type ReconciliationDiscrepancyDetail = ReconciliationDiscrepancyListItem & {
  notes: string[];
  timeline: Array<{
    eventId: string;
    stage: 'ledger_recorded' | 'provider_authorized' | 'provider_captured' | 'provider_webhook_received';
    status: 'ok' | 'warning';
    occurredAt: string;
    metadata: Record<string, string | number | boolean | null>;
  }>;
};

type ReconciliationMismatchDetailDiff = {
  path: string;
  reasonCode: string;
  expected: string | number | boolean | null;
  actual: string | number | boolean | null;
};

type ReconciliationMismatchDetailContract = {
  contract: string;
  generatedAt: string;
  mismatch: {
    id: string;
    category: ReconciliationMismatchCategory;
    transactionReference: string;
    merchantId: string;
    reasonCode: string;
    summary: {
      mismatchCount: number;
      normalizedFieldPaths: string[];
      fallbackApplied: boolean;
    };
    expected: {
      source: 'ledger';
      payload: Record<string, unknown>;
    };
    actual: {
      source: 'provider';
      payload: Record<string, unknown>;
    };
    diffs: ReconciliationMismatchDetailDiff[];
  };
  metadata: {
    categoryMap: Array<{
      category: ReconciliationMismatchCategory;
      reasonCode: string;
      label: string;
    }>;
  };
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
type SettlementEvidenceGapSummaryContractResponse = SettlementEvidenceGapSummary;
type SettlementEvidencePacketLintContractResponse = SettlementEvidencePacketLintContract;
type SettlementPublicationReadinessTrendContractResponse = SettlementPublicationReadinessTrend;
type SettlementPublicationWindowDiagnosticsContractResponse = SettlementPublicationWindowDiagnostics;
type SettlementPublicationDiagnosticsContractSnapshotContractResponse =
  SettlementPublicationDiagnosticsContractSnapshot;
type SettlementPublicationDiagnosticsDeltaBundleContractResponse = SettlementPublicationDiagnosticsDeltaBundle;
type SettlementPublicationDiagnosticsFixtureExportContractResponse = SettlementPublicationDiagnosticsFixtureExport;
type SettlementPublicationDiagnosticsTrendDigestContractResponse = SettlementPublicationDiagnosticsTrendDigest;
type SettlementPublicationEvidenceManifestContractResponse = SettlementPublicationEvidenceManifest;
type SettlementReleaseCandidateScorecardContractResponse = SettlementReleaseCandidateScorecard;
type SettlementReleaseCandidateHandoffPacketContractResponse = SettlementReleaseCandidateHandoffPacket;
type SettlementReleaseEvidenceAdjudicationSnapshotContractResponse = SettlementReleaseEvidenceAdjudicationSnapshot;
type SettlementReleaseCandidateRemediationQueueContractResponse = SettlementReleaseCandidateRemediationQueue;
type SettlementRemediationExecutionBlueprintPacketContractResponse = SettlementRemediationExecutionBlueprintPacket;
type SettlementRemediationPublicationHandoffBundleContractResponse = SettlementRemediationPublicationHandoffBundle;
type SettlementRemediationPublicationReadinessEnvelopeContractResponse = SettlementRemediationPublicationReadinessEnvelope;
type SettlementReleaseReadyDependencyGraphSnapshotContractResponse = SettlementReleaseReadyDependencyGraphSnapshot;
type SettlementQaReleaseGateVerdictPacketContractResponse = SettlementQaReleaseGateVerdictPacket;
type SettlementAdjudicationRoutingManifestContractResponse = SettlementAdjudicationRoutingManifest;
type SettlementPublicationWindowPlanContractResponse = SettlementPublicationWindowPlan;
type SettlementDeliveryReadinessDigestContractResponse = SettlementDeliveryReadinessDigest;
type SettlementEvidenceAnomalyScorecardContractResponse = SettlementEvidenceAnomalyScorecard;
type SettlementExceptionRemediationManifestContractResponse = SettlementExceptionRemediationManifest;
type SettlementExceptionRemediationRunbookContractResponse = SettlementExceptionRemediationRunbook;
type SettlementRemediationPublicationRouteDecisionEnvelopeContractResponse =
  SettlementRemediationPublicationRouteDecisionEnvelope;
type SettlementReleaseGateEvidenceDigestContractResponse = SettlementReleaseGateEvidenceDigest;
type SettlementReleaseGateRemediationPlanContractResponse = SettlementReleaseGateRemediationPlan;

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

  listReconciliationDiscrepancies(query: ListReconciliationDiscrepanciesDto): {
    contract: string;
    generatedAt: string;
    total: number;
    data: ReconciliationDiscrepancyListItem[];
  } {
    const records = RECONCILIATION_DISCREPANCY_FIXTURES
      .filter((row) => {
        if (query.path === 'empty') {
          return false;
        }
        if (query.path && row.path !== query.path) {
          return false;
        }
        if (query.merchantId && row.merchantId !== query.merchantId) {
          return false;
        }
        if (query.transactionReference && row.transactionReference !== query.transactionReference) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((row) => this.toReconciliationDiscrepancyListItem(row));

    return {
      contract: `${RECONCILIATION_DISCREPANCY_CONTRACT_VERSION}.list`,
      generatedAt: RECONCILIATION_DISCREPANCY_FIXTURE_TIMESTAMP,
      total: records.length,
      data: records,
    };
  }

  getReconciliationDiscrepancy(discrepancyId: string): {
    contract: string;
    generatedAt: string;
    discrepancy: ReconciliationDiscrepancyDetail;
  } {
    const fixture = RECONCILIATION_DISCREPANCY_FIXTURES.find((row) => row.id === discrepancyId);
    if (!fixture) {
      throw new NotFoundException('Reconciliation discrepancy not found');
    }

    return {
      contract: `${RECONCILIATION_DISCREPANCY_CONTRACT_VERSION}.detail`,
      generatedAt: RECONCILIATION_DISCREPANCY_FIXTURE_TIMESTAMP,
      discrepancy: this.toReconciliationDiscrepancyDetail(fixture),
    };
  }

  getReconciliationMismatchDetail(mismatchId: string): ReconciliationMismatchDetailContract {
    const fixture = RECONCILIATION_MISMATCH_DETAIL_FIXTURES.find(
      (row): row is Record<string, unknown> => typeof row === 'object' && row !== null && row.id === mismatchId,
    );

    if (!fixture) {
      throw new NotFoundException('Reconciliation mismatch detail not found');
    }

    const fallbackApplied = !this.isValidMismatchFixture(fixture);
    const category = this.normalizeMismatchCategory(fixture.category);
    const reasonCode = this.reasonCodeForMismatchCategory(category);
    const expectedPayload = this.normalizeMismatchPayload(fixture.expectedPayload);
    const actualPayload = this.normalizeMismatchPayload(fixture.actualPayload);
    const diffs = this.normalizeMismatchDiffs(fixture.diffs, reasonCode, fallbackApplied);

    return {
      contract: RECONCILIATION_MISMATCH_DETAIL_CONTRACT_VERSION,
      generatedAt: RECONCILIATION_MISMATCH_DETAIL_FIXTURE_TIMESTAMP,
      mismatch: {
        id: String(fixture.id),
        category,
        transactionReference:
          typeof fixture.transactionReference === 'string'
            ? fixture.transactionReference
            : 'fixture_unknown_transaction_reference',
        merchantId: typeof fixture.merchantId === 'string' ? fixture.merchantId : 'fixture_unknown_merchant',
        reasonCode: diffs[0]?.reasonCode ?? reasonCode,
        summary: {
          mismatchCount: diffs.length,
          normalizedFieldPaths: diffs.map((row) => row.path),
          fallbackApplied,
        },
        expected: {
          source: 'ledger',
          payload: expectedPayload,
        },
        actual: {
          source: 'provider',
          payload: actualPayload,
        },
        diffs,
      },
      metadata: {
        categoryMap: RECONCILIATION_MISMATCH_CATEGORIES.map((row) => ({
          category: row,
          reasonCode: this.reasonCodeForMismatchCategory(row),
          label: this.labelForMismatchCategory(row),
        })),
      },
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

    const ordered = this.sortExceptionRowsDeterministic(rows.map((item) => this.toExceptionListItem(item)));
    const hasNext = ordered.length > take;
    const page = hasNext ? ordered.slice(0, take) : ordered;

    return {
      data: page,
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

  async getSettlementExceptionActivityTimeline(
    exceptionId: string,
    query: ListSettlementExceptionActivityDto,
  ): Promise<SettlementExceptionActivityResponse> {
    const limit = this.clampTake(query.limit);
    const mode = query.mode ?? 'live';
    const scenario = (query.scenario ?? 'normal') as SettlementExceptionActivityFixtureScenario;

    if (mode === 'fixture') {
      if (scenario === 'stale_cursor' && query.cursor) {
        throw new ConflictException({
          code: 'SETTLEMENT_EXCEPTION_ACTIVITY_CURSOR_STALE',
          reasonCode: 'STALE_CURSOR',
          message: 'cursor is stale; request the timeline from the first page',
        });
      }

      const events = SETTLEMENT_EXCEPTION_ACTIVITY_FIXTURE_EVENTS[scenario] ?? [];
      return this.buildSettlementExceptionActivityResponse(exceptionId, events, limit, query.cursor, mode);
    }

    const exception = await this.prisma.settlementException.findUnique({
      where: { id: exceptionId },
      include: {
        audits: {
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        },
      },
    });

    if (!exception) {
      throw new NotFoundException('Settlement exception not found');
    }

    const events = this.toSettlementExceptionActivityEvents(exception);
    return this.buildSettlementExceptionActivityResponse(exceptionId, events, limit, query.cursor, mode);
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

  buildSettlementExceptionEvidenceGapSummary(
    input: BuildSettlementEvidenceGapSummaryDto,
  ): SettlementEvidenceGapSummaryContractResponse {
    try {
      return buildSettlementEvidenceGapSummary(input);
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

  buildSettlementExceptionEvidencePacketLint(
    input: BuildSettlementEvidencePacketLintDto,
  ): SettlementEvidencePacketLintContractResponse {
    return lintSettlementEvidencePackets(input);
  }

  buildSettlementExceptionPublicationReadinessTrend(
    input: BuildSettlementPublicationReadinessTrendDto,
  ): SettlementPublicationReadinessTrendContractResponse {
    return buildSettlementPublicationReadinessTrend(input);
  }

  buildSettlementExceptionPublicationWindowPlan(
    input: BuildSettlementPublicationWindowPlanDto,
  ): SettlementPublicationWindowPlanContractResponse {
    try {
      return buildSettlementPublicationWindowPlan(input);
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

  buildSettlementExceptionPublicationWindowDiagnostics(
    input: BuildSettlementPublicationWindowDiagnosticsDto,
  ): SettlementPublicationWindowDiagnosticsContractResponse {
    return buildSettlementPublicationWindowDiagnostics(input);
  }

  buildSettlementExceptionPublicationDiagnosticsContractSnapshot(
    input: BuildSettlementPublicationDiagnosticsContractSnapshotDto,
  ): SettlementPublicationDiagnosticsContractSnapshotContractResponse {
    return buildSettlementPublicationDiagnosticsContractSnapshot(input);
  }

  buildSettlementExceptionPublicationDiagnosticsDeltaBundle(
    input: BuildSettlementPublicationDiagnosticsDeltaBundleDto,
  ): SettlementPublicationDiagnosticsDeltaBundleContractResponse {
    return buildSettlementPublicationDiagnosticsDeltaBundle(input);
  }

  buildSettlementExceptionPublicationDiagnosticsFixtureExport(
    input: BuildSettlementPublicationDiagnosticsFixtureExportDto,
  ): SettlementPublicationDiagnosticsFixtureExportContractResponse {
    return buildSettlementPublicationDiagnosticsFixtureExport(input);
  }

  buildSettlementExceptionPublicationDiagnosticsTrendDigest(
    input: BuildSettlementPublicationDiagnosticsTrendDigestDto,
  ): SettlementPublicationDiagnosticsTrendDigestContractResponse {
    return buildSettlementPublicationDiagnosticsTrendDigest(input);
  }

  buildSettlementExceptionPublicationEvidenceManifest(
    input: BuildSettlementPublicationEvidenceManifestDto,
  ): SettlementPublicationEvidenceManifestContractResponse {
    return buildSettlementPublicationEvidenceManifest(input);
  }

  buildSettlementExceptionReleaseCandidateScorecard(
    input: BuildSettlementReleaseCandidateScorecardDto,
  ): SettlementReleaseCandidateScorecardContractResponse {
    return buildSettlementReleaseCandidateScorecard(input);
  }

  buildSettlementExceptionReleaseCandidateHandoffPacket(
    input: BuildSettlementReleaseCandidateHandoffPacketDto,
  ): SettlementReleaseCandidateHandoffPacketContractResponse {
    return buildSettlementReleaseCandidateHandoffPacket(input);
  }

  buildSettlementExceptionReleaseEvidenceAdjudicationSnapshot(
    input: BuildSettlementReleaseEvidenceAdjudicationSnapshotDto,
  ): SettlementReleaseEvidenceAdjudicationSnapshotContractResponse {
    return buildSettlementReleaseEvidenceAdjudicationSnapshot(input);
  }

  buildSettlementExceptionReleaseCandidateRemediationQueue(
    input: BuildSettlementReleaseCandidateRemediationQueueDto,
  ): SettlementReleaseCandidateRemediationQueueContractResponse {
    return buildSettlementReleaseCandidateRemediationQueue(input);
  }

  buildSettlementExceptionRemediationExecutionBlueprintPacket(
    input: BuildSettlementRemediationExecutionBlueprintPacketDto,
  ): SettlementRemediationExecutionBlueprintPacketContractResponse {
    return buildSettlementRemediationExecutionBlueprintPacket(input);
  }

  buildSettlementExceptionRemediationPublicationReadinessEnvelope(
    input: BuildSettlementRemediationPublicationReadinessEnvelopeDto,
  ): SettlementRemediationPublicationReadinessEnvelopeContractResponse {
    return buildSettlementRemediationPublicationReadinessEnvelope({
      ...input,
      executionReadiness: input.executionReadiness === 'ready' ? 'ready' : 'blocked',
    });
  }

  buildSettlementExceptionRemediationPublicationHandoffBundle(
    input: BuildSettlementRemediationPublicationHandoffBundleDto,
  ): SettlementRemediationPublicationHandoffBundleContractResponse {
    return buildSettlementRemediationPublicationHandoffBundle(input);
  }

  buildSettlementExceptionReleaseReadyDependencyGraphSnapshot(
    input: BuildSettlementReleaseReadyDependencyGraphSnapshotDto,
  ): SettlementReleaseReadyDependencyGraphSnapshotContractResponse {
    return buildSettlementReleaseReadyDependencyGraphSnapshot(input);
  }

  buildSettlementExceptionQaReleaseGateVerdictPacket(
    input: BuildSettlementQaReleaseGateVerdictPacketDto,
  ): SettlementQaReleaseGateVerdictPacketContractResponse {
    return buildSettlementQaReleaseGateVerdictPacket(input);
  }

  buildSettlementExceptionAdjudicationRoutingManifest(
    input: BuildSettlementAdjudicationRoutingManifestDto,
  ): SettlementAdjudicationRoutingManifestContractResponse {
    return buildSettlementAdjudicationRoutingManifest(input);
  }

  buildSettlementExceptionDeliveryReadinessDigest(
    input: BuildSettlementDeliveryReadinessDigestDto,
  ): SettlementDeliveryReadinessDigestContractResponse {
    return buildSettlementDeliveryReadinessDigest(input);
  }

  buildSettlementExceptionEvidenceAnomalyScorecard(
    input: BuildSettlementEvidenceAnomalyScorecardDto,
  ): SettlementEvidenceAnomalyScorecardContractResponse {
    return buildSettlementEvidenceAnomalyScorecard(input);
  }

  buildSettlementExceptionRemediationRunbook(
    input: BuildSettlementRemediationRunbookDto,
  ): SettlementExceptionRemediationRunbookContractResponse {
    try {
      return buildSettlementExceptionRemediationRunbook(input);
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

  buildSettlementExceptionRemediationManifest(
    input: BuildSettlementRemediationManifestDto,
  ): SettlementExceptionRemediationManifestContractResponse {
    try {
      return buildSettlementExceptionRemediationManifest(input);
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

  buildSettlementRemediationPublicationRouteDecisionEnvelope(
    input: BuildSettlementRemediationPublicationRouteDecisionEnvelopeDto,
  ): SettlementRemediationPublicationRouteDecisionEnvelopeContractResponse {
    try {
      return buildSettlementRemediationPublicationRouteDecisionEnvelope(input);
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

  buildSettlementReleaseGateEvidenceDigest(
    input: BuildSettlementReleaseGateEvidenceDigestDto,
  ): SettlementReleaseGateEvidenceDigestContractResponse {
    try {
      return buildSettlementReleaseGateEvidenceDigest(input);
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

  buildSettlementReleaseGateRemediationPlan(
    input: BuildSettlementReleaseGateRemediationPlanDto,
  ): SettlementReleaseGateRemediationPlanContractResponse {
    try {
      return buildSettlementReleaseGateRemediationPlan(input);
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
    return this.commandSettlementException(
      exceptionId,
      {
        command: input.action === 'resolve' ? 'markResolved' : 'ignore',
        reason: input.reason,
        note: input.note,
        idempotencyKey: input.idempotencyKey,
        expectedVersion: input.expectedVersion,
        expectedUpdatedAt: input.expectedUpdatedAt,
      },
      actor,
    );
  }

  async commandSettlementException(
    exceptionId: string,
    input: SettlementExceptionCommandInput,
    actor: string,
  ): Promise<ExceptionDetail> {
    const reason = input.reason.trim();
    if (!reason) {
      throw new BadRequestException('reason is required');
    }
    const note = input.note?.trim() || null;
    const owner = input.owner?.trim() || null;
    const effectiveNote = this.buildExceptionCommandNote(input.command, note, owner);
    const idempotencyKey = input.idempotencyKey?.trim() || null;
    const expectedUpdatedAt = input.expectedUpdatedAt?.trim() || null;

    const existing = await this.prisma.settlementException.findUnique({ where: { id: exceptionId } });

    if (!existing) {
      throw new NotFoundException('Settlement exception not found');
    }

    const requestFingerprint = this.exceptionActionRequestFingerprint(exceptionId, {
      command: input.command,
      reason,
      note: effectiveNote,
      expectedVersion: input.expectedVersion,
      expectedUpdatedAt,
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

    await this.logExceptionActionEvent('attempted', existing, actor, {
      command: input.command,
      expectedVersion: input.expectedVersion,
      expectedUpdatedAt,
      idempotencyKeyPresent: Boolean(idempotencyKey),
    });

    try {
      if (expectedUpdatedAt && existing.updatedAt.toISOString() !== expectedUpdatedAt) {
        await this.logExceptionActionEvent('conflict', existing, actor, {
          reason: 'stale_updated_at',
          command: input.command,
          expectedVersion: input.expectedVersion,
          expectedUpdatedAt,
        });
        throw this.buildActionConflict(
          existing,
          'stale_updated_at',
          'Version conflict; refresh and retry with current version',
          input.expectedVersion,
          expectedUpdatedAt,
          true,
        );
      }

      if (
        existing.status === SettlementExceptionStatus.RESOLVED
        || existing.status === SettlementExceptionStatus.IGNORED
      ) {
        await this.logExceptionActionEvent('invalid', existing, actor, {
          reason: 'terminal_status',
          command: input.command,
        });
        throw this.buildActionConflict(
          existing,
          'terminal_status',
          'Settlement exception is already in terminal status',
          input.expectedVersion,
          expectedUpdatedAt,
          false,
        );
      }

      const transition = this.resolveExceptionCommandTransition(existing.status, input.command);
      if (!transition.allowed) {
        await this.logExceptionActionEvent('invalid', existing, actor, {
          reason: 'invalid_transition',
          command: input.command,
          currentStatus: existing.status,
        });
        throw this.buildActionConflict(
          existing,
          'invalid_transition',
          transition.message,
          input.expectedVersion,
          expectedUpdatedAt,
          false,
        );
      }

      const updated = await this.prisma.settlementException.updateMany({
        where: {
          id: exceptionId,
          version: input.expectedVersion,
        },
        data: {
          status: transition.toStatus,
          latestOperatorReason: reason,
          latestOperatorNote: effectiveNote,
          resolutionActor: transition.terminal ? actor : null,
          resolutionAt: transition.terminal ? new Date() : null,
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
            command: input.command,
            expectedVersion: input.expectedVersion,
          });
          throw this.buildActionConflict(
            latest,
            'stale_version',
            'Version conflict; refresh and retry with current version',
            input.expectedVersion,
            expectedUpdatedAt,
            true,
          );
        }

        throw new ConflictException('Version conflict; refresh and retry with current version');
      }

      await this.prisma.settlementExceptionAudit.create({
        data: {
          settlementExceptionId: exceptionId,
          fromStatus: existing.status,
          toStatus: transition.toStatus,
          reason,
          note: effectiveNote,
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
        command: input.command,
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

  private buildExceptionCommandNote(
    command: SettlementExceptionCommand,
    note: string | null,
    owner: string | null,
  ): string | null {
    if (command !== 'assignOwner') {
      return note;
    }

    if (!owner) {
      throw new BadRequestException('owner is required for assignOwner');
    }

    return note ? `owner=${owner}; ${note}` : `owner=${owner}`;
  }

  private resolveExceptionCommandTransition(
    currentStatus: SettlementExceptionStatus,
    command: SettlementExceptionCommand,
  ): { allowed: true; toStatus: SettlementExceptionStatus; terminal: boolean } | { allowed: false; message: string } {
    if (command === 'acknowledge') {
      if (currentStatus !== SettlementExceptionStatus.OPEN) {
        return {
          allowed: false,
          message: `Command acknowledge is only allowed for status ${SettlementExceptionStatus.OPEN}`,
        };
      }
      return {
        allowed: true,
        toStatus: SettlementExceptionStatus.INVESTIGATING,
        terminal: false,
      };
    }

    if (command === 'assignOwner') {
      return {
        allowed: true,
        toStatus: SettlementExceptionStatus.INVESTIGATING,
        terminal: false,
      };
    }

    if (command === 'markResolved') {
      return {
        allowed: true,
        toStatus: SettlementExceptionStatus.RESOLVED,
        terminal: true,
      };
    }

    return {
      allowed: true,
      toStatus: SettlementExceptionStatus.IGNORED,
      terminal: true,
    };
  }

  private exceptionActionIdempotencyScope(exceptionId: string): string {
    return `settlement_exception_action:${exceptionId}`;
  }

  private exceptionActionRequestFingerprint(
    exceptionId: string,
    input: {
      command: SettlementExceptionCommand;
      reason: string;
      note: string | null;
      expectedVersion: number;
      expectedUpdatedAt: string | null;
    },
  ): string {
    return JSON.stringify({
      exceptionId,
      command: input.command,
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
    const deltaAmount = this.decimalToNumber(exception.deltaAmount);
    return {
      id: exception.id,
      merchantId: exception.merchantId,
      providerName: exception.providerName,
      windowDate: exception.windowDate.toISOString().slice(0, 10),
      severity: this.resolveExceptionSeverity(deltaAmount),
      ledgerTotal: this.decimalToNumber(exception.ledgerTotal),
      providerTotal: this.decimalToNumber(exception.providerTotal),
      deltaAmount,
      status: exception.status,
      actionState: this.resolveExceptionActionState(exception.status),
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

  private toSettlementExceptionActivityEvents(exception: {
    id: string;
    status: SettlementExceptionStatus;
    openedReason: string;
    createdAt: Date;
    audits: Array<{
      id: string;
      fromStatus: SettlementExceptionStatus | null;
      toStatus: SettlementExceptionStatus;
      reason: string;
      actor: string;
      createdAt: Date;
    }>;
  }): SettlementExceptionActivityEvent[] {
    const fromAudits = exception.audits.map((audit) => ({
      id: audit.id,
      eventType: this.resolveAuditEventType(audit.toStatus),
      actorType: this.resolveActivityActorType(audit.actor),
      reasonCode: audit.reason,
      fromStatus: audit.fromStatus,
      toStatus: audit.toStatus,
      occurredAt: audit.createdAt.toISOString(),
    }));

    const hasOpenedAudit = exception.audits.some(
      (audit) => audit.fromStatus === null && audit.toStatus === SettlementExceptionStatus.OPEN,
    );
    const openedEvent: SettlementExceptionActivityEvent = {
      id: `${exception.id}_opened`,
      eventType: 'exception_opened',
      actorType: 'system',
      reasonCode: exception.openedReason,
      fromStatus: null,
      toStatus: SettlementExceptionStatus.OPEN,
      occurredAt: exception.createdAt.toISOString(),
    };

    return [
      ...fromAudits,
      ...(hasOpenedAudit ? [] : [openedEvent]),
    ].sort((left, right) => {
      const byTime = new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
      if (byTime !== 0) {
        return byTime;
      }
      return right.id.localeCompare(left.id);
    });
  }

  private resolveAuditEventType(toStatus: SettlementExceptionStatus): string {
    if (toStatus === SettlementExceptionStatus.OPEN) {
      return 'exception_opened';
    }
    if (toStatus === SettlementExceptionStatus.INVESTIGATING) {
      return 'exception_acknowledged';
    }
    if (toStatus === SettlementExceptionStatus.RESOLVED) {
      return 'exception_mark_resolved';
    }
    if (toStatus === SettlementExceptionStatus.IGNORED) {
      return 'exception_ignored';
    }
    return 'exception_status_updated';
  }

  private resolveActivityActorType(actor: string): SettlementExceptionActivityActorType {
    const normalized = actor.trim().toLowerCase();
    if (normalized === 'system') {
      return 'system';
    }
    if (normalized.startsWith('merchant')) {
      return 'merchant';
    }
    return 'operator';
  }

  private buildSettlementExceptionActivityResponse(
    exceptionId: string,
    events: SettlementExceptionActivityEvent[],
    limit: number,
    cursor: string | undefined,
    mode: 'live' | 'fixture',
  ): SettlementExceptionActivityResponse {
    const startIndex = this.resolveActivityPageStart(events, cursor);
    const page = events.slice(startIndex, startIndex + limit);
    const hasNext = startIndex + limit < events.length;
    const nextCursor = hasNext && page.length > 0
      ? this.encodeSettlementExceptionActivityCursor(page[page.length - 1].id)
      : null;

    return {
      contract: 'settlement-exception-activity-timeline.v1',
      exceptionId,
      mode,
      data: page,
      pageInfo: {
        limit,
        hasNext,
        nextCursor,
      },
      metadata: {
        reasonCodeMap: SETTLEMENT_EXCEPTION_ACTIVITY_REASON_CODE_MAP,
      },
    };
  }

  private resolveActivityPageStart(events: SettlementExceptionActivityEvent[], cursor?: string): number {
    if (!cursor) {
      return 0;
    }

    const parsed = this.parseSettlementExceptionActivityCursor(cursor);
    const anchorIndex = events.findIndex((row) => row.id === parsed.anchor);

    if (anchorIndex < 0) {
      throw new ConflictException({
        code: 'SETTLEMENT_EXCEPTION_ACTIVITY_CURSOR_STALE',
        reasonCode: 'STALE_CURSOR',
        message: 'cursor is stale; request the timeline from the first page',
      });
    }

    return anchorIndex + 1;
  }

  private encodeSettlementExceptionActivityCursor(anchor: string): string {
    const payload: SettlementExceptionActivityCursorPayload = {
      version: SETTLEMENT_EXCEPTION_ACTIVITY_CURSOR_VERSION,
      anchor,
    };
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  }

  private parseSettlementExceptionActivityCursor(cursor: string): SettlementExceptionActivityCursorPayload {
    let decoded: string;
    try {
      decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    } catch {
      throw new BadRequestException({
        code: 'SETTLEMENT_EXCEPTION_ACTIVITY_CURSOR_INVALID',
        reasonCode: 'INVALID_CURSOR',
        message: 'cursor must be a valid base64url payload',
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(decoded);
    } catch {
      throw new BadRequestException({
        code: 'SETTLEMENT_EXCEPTION_ACTIVITY_CURSOR_INVALID',
        reasonCode: 'INVALID_CURSOR',
        message: 'cursor must decode into a valid JSON payload',
      });
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new BadRequestException({
        code: 'SETTLEMENT_EXCEPTION_ACTIVITY_CURSOR_INVALID',
        reasonCode: 'INVALID_CURSOR',
        message: 'cursor payload must be an object',
      });
    }

    const maybeCursor = parsed as Partial<SettlementExceptionActivityCursorPayload>;
    if (maybeCursor.version !== SETTLEMENT_EXCEPTION_ACTIVITY_CURSOR_VERSION || !maybeCursor.anchor?.trim()) {
      throw new BadRequestException({
        code: 'SETTLEMENT_EXCEPTION_ACTIVITY_CURSOR_INVALID',
        reasonCode: 'INVALID_CURSOR',
        message: 'cursor payload has unsupported version or missing anchor',
      });
    }

    return {
      version: maybeCursor.version,
      anchor: maybeCursor.anchor.trim(),
    };
  }

  private toReconciliationDiscrepancyListItem(
    fixture: ReconciliationDiscrepancyFixture,
  ): ReconciliationDiscrepancyListItem {
    return {
      id: fixture.id,
      transactionReference: fixture.transactionReference,
      merchantId: fixture.merchantId,
      paymentId: fixture.paymentId,
      state: fixture.state,
      path: fixture.path,
      currency: fixture.currency,
      ledgerAmount: fixture.ledgerAmount,
      providerAmount: fixture.providerAmount,
      deltaAmount: fixture.deltaAmount,
      captureReference: fixture.captureReference,
      duplicateEventCount: fixture.duplicateEventCount,
      providerEventCount: fixture.providerEventCount,
      observedAt: fixture.observedAt,
    };
  }

  private toReconciliationDiscrepancyDetail(
    fixture: ReconciliationDiscrepancyFixture,
  ): ReconciliationDiscrepancyDetail {
    const listItem = this.toReconciliationDiscrepancyListItem(fixture);
    const timeline: ReconciliationDiscrepancyDetail['timeline'] = [
      {
        eventId: `${fixture.id}_evt_ledger`,
        stage: 'ledger_recorded',
        status: 'ok',
        occurredAt: fixture.observedAt,
        metadata: {
          amount: fixture.ledgerAmount,
          currency: fixture.currency,
        },
      },
      {
        eventId: `${fixture.id}_evt_provider_auth`,
        stage: 'provider_authorized',
        status: 'ok',
        occurredAt: fixture.observedAt,
        metadata: {
          providerEventCount: fixture.providerEventCount,
        },
      },
      {
        eventId: `${fixture.id}_evt_provider_capture`,
        stage: 'provider_captured',
        status: fixture.captureReference ? 'ok' : 'warning',
        occurredAt: fixture.observedAt,
        metadata: {
          captureReference: fixture.captureReference,
          providerAmount: fixture.providerAmount,
        },
      },
      {
        eventId: `${fixture.id}_evt_webhook`,
        stage: 'provider_webhook_received',
        status: fixture.duplicateEventCount > 0 ? 'warning' : 'ok',
        occurredAt: fixture.observedAt,
        metadata: {
          duplicateEventCount: fixture.duplicateEventCount,
          deltaAmount: fixture.deltaAmount,
        },
      },
    ];

    return {
      ...listItem,
      notes: [...fixture.notes],
      timeline,
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

  private resolveExceptionSeverity(deltaAmount: number): ExceptionSeverity {
    const magnitude = Math.abs(deltaAmount);
    if (magnitude >= 1000) return 'critical';
    if (magnitude >= 300) return 'high';
    if (magnitude >= 100) return 'medium';
    return 'low';
  }

  private resolveExceptionActionState(status: SettlementExceptionStatus): ExceptionActionState {
    const enabled = status === SettlementExceptionStatus.OPEN || status === SettlementExceptionStatus.INVESTIGATING;
    const reason = enabled ? 'available' : 'terminal_status';

    return {
      acknowledge: {
        enabled,
        reason,
      },
      assignOwner: {
        enabled,
        reason,
      },
      markResolved: {
        enabled,
        reason,
      },
    };
  }

  private isValidMismatchFixture(
    fixture: Record<string, unknown>,
  ): fixture is {
    id: string;
    category: ReconciliationMismatchCategory;
    transactionReference: string;
    merchantId: string;
    expectedPayload: Record<string, unknown>;
    actualPayload: Record<string, unknown>;
    diffs: Array<{
      path: string;
      expected: string | number | boolean | null;
      actual: string | number | boolean | null;
    }>;
  } {
    if (!this.isMismatchCategory(fixture.category)) {
      return false;
    }
    if (typeof fixture.id !== 'string' || typeof fixture.transactionReference !== 'string' || typeof fixture.merchantId !== 'string') {
      return false;
    }
    if (!this.isPlainObject(fixture.expectedPayload) || !this.isPlainObject(fixture.actualPayload)) {
      return false;
    }
    if (!Array.isArray(fixture.diffs)) {
      return false;
    }

    return fixture.diffs.every((row) => (
      typeof row === 'object'
      && row !== null
      && typeof (row as { path?: unknown }).path === 'string'
      && Object.prototype.hasOwnProperty.call(row, 'expected')
      && Object.prototype.hasOwnProperty.call(row, 'actual')
    ));
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isMismatchCategory(value: unknown): value is ReconciliationMismatchCategory {
    return typeof value === 'string'
      && (RECONCILIATION_MISMATCH_CATEGORIES as readonly string[]).includes(value);
  }

  private normalizeMismatchCategory(value: unknown): ReconciliationMismatchCategory {
    if (this.isMismatchCategory(value)) {
      return value;
    }
    return 'stale_status';
  }

  private normalizeMismatchPayload(value: unknown): Record<string, unknown> {
    if (this.isPlainObject(value)) {
      return value;
    }
    return {};
  }

  private normalizeMismatchDiffs(
    value: unknown,
    defaultReasonCode: string,
    forceFallback: boolean,
  ): ReconciliationMismatchDetailDiff[] {
    if (forceFallback || !Array.isArray(value)) {
      return [
        {
          path: 'payload',
          reasonCode: 'RECON_FIXTURE_MALFORMED_FALLBACK',
          expected: 'unavailable',
          actual: 'unavailable',
        },
      ];
    }

    const normalized = value
      .filter((row): row is { path: unknown; expected: unknown; actual: unknown } => typeof row === 'object' && row !== null)
      .map((row) => ({
        path: this.normalizeMismatchFieldPath(row.path),
        reasonCode: defaultReasonCode,
        expected: this.normalizeDiffValue(row.expected),
        actual: this.normalizeDiffValue(row.actual),
      }));

    if (!normalized.length) {
      return [
        {
          path: 'payload',
          reasonCode: 'RECON_FIXTURE_MALFORMED_FALLBACK',
          expected: 'unavailable',
          actual: 'unavailable',
        },
      ];
    }

    return normalized;
  }

  private normalizeDiffValue(value: unknown): string | number | boolean | null {
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }
    if (value === undefined) {
      return null;
    }
    return JSON.stringify(value);
  }

  private normalizeMismatchFieldPath(path: unknown): string {
    if (typeof path !== 'string' || !path.trim()) {
      return 'payload';
    }

    const trimmed = path.trim();
    if (trimmed.startsWith('/')) {
      return trimmed.slice(1).replace(/\//g, '.');
    }
    return trimmed;
  }

  private reasonCodeForMismatchCategory(category: ReconciliationMismatchCategory): string {
    switch (category) {
      case 'amount':
        return 'RECON_AMOUNT_MISMATCH';
      case 'currency':
        return 'RECON_CURRENCY_MISMATCH';
      case 'missing_event':
        return 'RECON_MISSING_EVENT';
      case 'duplicate_event':
        return 'RECON_DUPLICATE_EVENT';
      case 'stale_status':
        return 'RECON_STALE_STATUS';
      default:
        return 'RECON_MISMATCH_UNSPECIFIED';
    }
  }

  private labelForMismatchCategory(category: ReconciliationMismatchCategory): string {
    switch (category) {
      case 'amount':
        return 'Amount mismatch';
      case 'currency':
        return 'Currency mismatch';
      case 'missing_event':
        return 'Missing event';
      case 'duplicate_event':
        return 'Duplicate event';
      case 'stale_status':
        return 'Stale status';
      default:
        return 'Unknown mismatch';
    }
  }

  private sortExceptionRowsDeterministic(rows: ExceptionListItem[]): ExceptionListItem[] {
    return [...rows].sort((left, right) => {
      const bySeverity = EXCEPTION_SEVERITY_WEIGHT[right.severity] - EXCEPTION_SEVERITY_WEIGHT[left.severity];
      if (bySeverity !== 0) {
        return bySeverity;
      }

      const byCreatedAt = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      if (byCreatedAt !== 0) {
        return byCreatedAt;
      }

      return left.id.localeCompare(right.id);
    });
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
