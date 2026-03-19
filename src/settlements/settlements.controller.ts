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
import { BuildSettlementPublicationWindowPlanDto } from './dto/build-settlement-publication-window-plan.dto';
import { BuildSettlementPublicationReadinessTrendDto } from './dto/build-settlement-publication-readiness-trend.dto';
import { DetectSettlementExceptionsDto } from './dto/detect-settlement-exceptions.dto';
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
