import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import { Authorize } from '../common/authz.decorator';
import type { AuthenticatedRequest } from '../common/authz.guard';
import { BuildSettlementBulkActionPreviewDto } from './dto/build-settlement-bulk-action-preview.dto';
import { BuildSettlementEvidenceLineageDto } from './dto/build-settlement-evidence-lineage.dto';
import { BuildSettlementEvidencePacketLintDto } from './dto/build-settlement-evidence-packet-lint.dto';
import { BuildSettlementEvidenceGapSummaryDto } from './dto/build-settlement-evidence-gap-summary.dto';
import { BuildSettlementEvidenceAnomalyScorecardDto } from './dto/build-settlement-evidence-anomaly-scorecard.dto';
import { BuildSettlementRemediationManifestDto } from './dto/build-settlement-remediation-manifest.dto';
import { BuildSettlementRemediationRunbookDto } from './dto/build-settlement-remediation-runbook.dto';
import { BuildSettlementDeliveryReadinessDigestDto } from './dto/build-settlement-delivery-readiness-digest.dto';
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
import { BuildSettlementRemediationPublicationReadinessEnvelopeDto } from './dto/build-settlement-remediation-publication-readiness-envelope.dto';
import { BuildSettlementPublicationWindowPlanDto } from './dto/build-settlement-publication-window-plan.dto';
import { BuildSettlementPublicationReadinessTrendDto } from './dto/build-settlement-publication-readiness-trend.dto';
import { DetectSettlementExceptionsDto } from './dto/detect-settlement-exceptions.dto';
import { ListReconciliationDiscrepanciesDto } from './dto/list-reconciliation-discrepancies.dto';
import { ListSettlementExceptionQaFixturesDto } from './dto/list-settlement-exception-qa-fixtures.dto';
import { ListSettlementExceptionsDto } from './dto/list-settlement-exceptions.dto';
import { UpdateSettlementExceptionDto } from './dto/update-settlement-exception.dto';
import { SettlementsService } from './settlements.service';

@Controller('settlements')
@Authorize('ops', 'admin')
export class SettlementsController {
  constructor(private readonly settlements: SettlementsService) {}

  @Post('reconciliation/generate')
  generate(@Query('date') date?: string) {
    return this.settlements.generateDailyReconciliation(date);
  }

  @Get('reconciliation/mismatches')
  mismatches(
    @Query('date') date?: string,
    @Query('merchantId') merchantId?: string,
    @Query('transactionReference') transactionReference?: string,
  ) {
    return this.settlements.queryMismatches({
      date,
      merchantId,
      transactionReference,
    });
  }

  @Get('reconciliation/discrepancies')
  listDiscrepancies(@Query() query: ListReconciliationDiscrepanciesDto) {
    return this.settlements.listReconciliationDiscrepancies(query);
  }

  @Get('reconciliation/discrepancies/:discrepancyId')
  getDiscrepancy(@Param('discrepancyId') discrepancyId: string) {
    return this.settlements.getReconciliationDiscrepancy(discrepancyId);
  }

  @Get('daily-summary')
  summary(@Query('date') date?: string, @Query('merchantId') merchantId?: string) {
    return this.settlements.getDailySummary(date, merchantId);
  }

  @Post('exceptions/detect')
  detectExceptions(@Req() request: AuthenticatedRequest, @Body() body: DetectSettlementExceptionsDto) {
    return this.settlements.detectSettlementExceptions(body, request.auth?.role ?? 'system');
  }

  @Get('exceptions')
  listExceptions(@Query() query: ListSettlementExceptionsDto) {
    return this.settlements.listSettlementExceptions(query);
  }

  @Post('exceptions/bulk-action-preview')
  bulkActionPreview(@Body() body: BuildSettlementBulkActionPreviewDto) {
    return this.settlements.buildSettlementExceptionBulkActionPreview(body);
  }

  @Post('exceptions/bulk-triage-snapshot')
  bulkTriageSnapshot(@Body() body: BuildSettlementBulkActionPreviewDto) {
    return this.settlements.buildSettlementExceptionBulkTriageSnapshot(body);
  }

  @Post('exceptions/bulk-action-simulation')
  bulkActionSimulation(@Body() body: BuildSettlementBulkActionPreviewDto) {
    return this.settlements.buildSettlementExceptionBulkActionSimulation(body);
  }

  @Post('exceptions/explainability-preset-profile')
  explainabilityPresetProfile(@Body() body: BuildSettlementExplainabilityPresetProfileDto) {
    return this.settlements.buildSettlementExceptionExplainabilityPresetProfile(body);
  }

  @Post('exceptions/packet-audit-summary')
  packetAuditSummary(@Body() body: BuildSettlementPacketAuditSummaryDto) {
    return this.settlements.buildSettlementExceptionPacketAuditSummary(body);
  }

  @Post('exceptions/evidence-lineage')
  evidenceLineage(@Body() body: BuildSettlementEvidenceLineageDto) {
    return this.settlements.buildSettlementExceptionEvidenceLineage(body);
  }

  @Post('exceptions/evidence-gap-summary')
  evidenceGapSummary(@Body() body: BuildSettlementEvidenceGapSummaryDto) {
    return this.settlements.buildSettlementExceptionEvidenceGapSummary(body);
  }

  @Post('exceptions/evidence-packet-lint')
  evidencePacketLint(@Body() body: BuildSettlementEvidencePacketLintDto) {
    return this.settlements.buildSettlementExceptionEvidencePacketLint(body);
  }

  @Post('exceptions/publication-readiness-trend')
  publicationReadinessTrend(@Body() body: BuildSettlementPublicationReadinessTrendDto) {
    return this.settlements.buildSettlementExceptionPublicationReadinessTrend(body);
  }

  @Post('exceptions/publication-window-plan')
  publicationWindowPlan(@Body() body: BuildSettlementPublicationWindowPlanDto) {
    return this.settlements.buildSettlementExceptionPublicationWindowPlan(body);
  }

  @Post('exceptions/publication-window-diagnostics')
  publicationWindowDiagnostics(@Body() body: BuildSettlementPublicationWindowDiagnosticsDto) {
    return this.settlements.buildSettlementExceptionPublicationWindowDiagnostics(body);
  }

  @Post('exceptions/publication-diagnostics-contract-snapshot')
  publicationDiagnosticsContractSnapshot(@Body() body: BuildSettlementPublicationDiagnosticsContractSnapshotDto) {
    return this.settlements.buildSettlementExceptionPublicationDiagnosticsContractSnapshot(body);
  }

  @Post('exceptions/publication-diagnostics-delta-bundle')
  publicationDiagnosticsDeltaBundle(@Body() body: BuildSettlementPublicationDiagnosticsDeltaBundleDto) {
    return this.settlements.buildSettlementExceptionPublicationDiagnosticsDeltaBundle(body);
  }

  @Post('exceptions/publication-diagnostics-fixture-export')
  publicationDiagnosticsFixtureExport(@Body() body: BuildSettlementPublicationDiagnosticsFixtureExportDto) {
    return this.settlements.buildSettlementExceptionPublicationDiagnosticsFixtureExport(body);
  }

  @Post('exceptions/publication-diagnostics-trend-digest')
  publicationDiagnosticsTrendDigest(@Body() body: BuildSettlementPublicationDiagnosticsTrendDigestDto) {
    return this.settlements.buildSettlementExceptionPublicationDiagnosticsTrendDigest(body);
  }

  @Post('exceptions/publication-evidence-manifest')
  publicationEvidenceManifest(@Body() body: BuildSettlementPublicationEvidenceManifestDto) {
    return this.settlements.buildSettlementExceptionPublicationEvidenceManifest(body);
  }

  @Post('exceptions/release-candidate-scorecard')
  releaseCandidateScorecard(@Body() body: BuildSettlementReleaseCandidateScorecardDto) {
    return this.settlements.buildSettlementExceptionReleaseCandidateScorecard(body);
  }

  @Post('exceptions/release-candidate-handoff-packet')
  releaseCandidateHandoffPacket(@Body() body: BuildSettlementReleaseCandidateHandoffPacketDto) {
    return this.settlements.buildSettlementExceptionReleaseCandidateHandoffPacket(body);
  }

  @Post('exceptions/release-evidence-adjudication-snapshot')
  releaseEvidenceAdjudicationSnapshot(@Body() body: BuildSettlementReleaseEvidenceAdjudicationSnapshotDto) {
    return this.settlements.buildSettlementExceptionReleaseEvidenceAdjudicationSnapshot(body);
  }

  @Post('exceptions/release-candidate-remediation-queue')
  releaseCandidateRemediationQueue(@Body() body: BuildSettlementReleaseCandidateRemediationQueueDto) {
    return this.settlements.buildSettlementExceptionReleaseCandidateRemediationQueue(body);
  }

  @Post('exceptions/remediation-execution-blueprint-packet')
  remediationExecutionBlueprintPacket(@Body() body: BuildSettlementRemediationExecutionBlueprintPacketDto) {
    return this.settlements.buildSettlementExceptionRemediationExecutionBlueprintPacket(body);
  }

  @Post('exceptions/remediation-publication-readiness-envelope')
  remediationPublicationReadinessEnvelope(@Body() body: BuildSettlementRemediationPublicationReadinessEnvelopeDto) {
    return this.settlements.buildSettlementExceptionRemediationPublicationReadinessEnvelope(body);
  }

  @Post('exceptions/release-ready-dependency-graph-snapshot')
  releaseReadyDependencyGraphSnapshot(@Body() body: BuildSettlementReleaseReadyDependencyGraphSnapshotDto) {
    return this.settlements.buildSettlementExceptionReleaseReadyDependencyGraphSnapshot(body);
  }

  @Post('exceptions/qa-release-gate-verdict-packet')
  qaReleaseGateVerdictPacket(@Body() body: BuildSettlementQaReleaseGateVerdictPacketDto) {
    return this.settlements.buildSettlementExceptionQaReleaseGateVerdictPacket(body);
  }

  @Post('exceptions/adjudication-routing-manifest')
  adjudicationRoutingManifest(@Body() body: BuildSettlementAdjudicationRoutingManifestDto) {
    return this.settlements.buildSettlementExceptionAdjudicationRoutingManifest(body);
  }

  @Post('exceptions/delivery-readiness-digest')
  deliveryReadinessDigest(@Body() body: BuildSettlementDeliveryReadinessDigestDto) {
    return this.settlements.buildSettlementExceptionDeliveryReadinessDigest(body);
  }

  @Post('exceptions/evidence-anomaly-scorecard')
  evidenceAnomalyScorecard(@Body() body: BuildSettlementEvidenceAnomalyScorecardDto) {
    return this.settlements.buildSettlementExceptionEvidenceAnomalyScorecard(body);
  }

  @Post('exceptions/remediation-runbook')
  remediationRunbook(@Body() body: BuildSettlementRemediationRunbookDto) {
    return this.settlements.buildSettlementExceptionRemediationRunbook(body);
  }

  @Post('exceptions/remediation-manifest')
  remediationManifest(@Body() body: BuildSettlementRemediationManifestDto) {
    return this.settlements.buildSettlementExceptionRemediationManifest(body);
  }

  @Get('exceptions/qa-fixtures')
  listExceptionQaFixtures(@Query() query: ListSettlementExceptionQaFixturesDto) {
    return this.settlements.listSettlementExceptionQaFixtures(query);
  }

  @Get('exceptions/:exceptionId')
  getException(@Param('exceptionId') exceptionId: string) {
    return this.settlements.getSettlementException(exceptionId);
  }

  @Post('exceptions/:exceptionId/action')
  updateException(
    @Req() request: AuthenticatedRequest,
    @Param('exceptionId') exceptionId: string,
    @Body() body: UpdateSettlementExceptionDto,
    @Headers('idempotency-key') idempotencyHeader?: string,
  ) {
    return this.settlements.updateSettlementException(
      exceptionId,
      {
        ...body,
        idempotencyKey: body.idempotencyKey ?? idempotencyHeader,
      },
      request.auth?.role ?? 'system',
    );
  }
}
