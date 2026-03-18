import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import { Authorize } from '../common/authz.decorator';
import type { AuthenticatedRequest } from '../common/authz.guard';
import { DetectSettlementExceptionsDto } from './dto/detect-settlement-exceptions.dto';
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

  @Get('exceptions/:exceptionId')
  getException(@Param('exceptionId') exceptionId: string) {
    return this.settlements.getSettlementException(exceptionId);
  }

  @Post('exceptions/:exceptionId/action')
  updateException(
    @Req() request: AuthenticatedRequest,
    @Param('exceptionId') exceptionId: string,
    @Headers('idempotency-key') idempotencyHeader?: string,
    @Body() body: UpdateSettlementExceptionDto,
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
