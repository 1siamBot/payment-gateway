import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { Authorize } from '../common/authz.decorator';
import type { AuthenticatedRequest } from '../common/authz.guard';
import { CallbackDto } from './dto/callback.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { SearchCustomersDto } from './dto/search-customers.dto';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('payments')
  @Authorize('merchant', 'support', 'ops', 'admin')
  initiate(@Body() body: CreatePaymentDto) {
    return this.payments.initiatePayment(body);
  }

  @Get('payments')
  @Authorize('merchant', 'support', 'ops', 'admin')
  list(
    @Req() request: AuthenticatedRequest,
    @Query('merchantId') merchantId?: string,
    @Query('shopId') shopId?: string,
    @Query('status') status?: TransactionStatus,
    @Query('type') type?: TransactionType,
    @Query('reference') reference?: string,
    @Query('take') take?: string,
  ) {
    return this.payments.listTransactions({
      merchantId: merchantId ?? request.auth?.merchantId,
      shopId,
      status,
      type,
      reference,
      take: take ? Number(take) : undefined,
    }, request.auth?.merchantId);
  }

  @Get('payments/observability')
  @Authorize('merchant', 'support', 'ops', 'admin')
  observability(
    @Req() request: AuthenticatedRequest,
    @Query('merchantId') merchantId: string,
    @Query('provider') provider?: string,
    @Query('segment') segment?: 'emerging' | 'growth' | 'enterprise',
    @Query('timeframeHours') timeframeHours?: string,
    @Query('take') take?: string,
  ) {
    return this.payments.getObservabilityDashboard({
      merchantId: merchantId ?? request.auth?.merchantId ?? '',
      provider,
      segment,
      timeframeHours: timeframeHours ? Number(timeframeHours) : undefined,
      take: take ? Number(take) : undefined,
    }, request.auth?.merchantId);
  }

  @Get('payments/:reference')
  @Authorize('merchant', 'support', 'ops', 'admin')
  inquiry(@Req() request: AuthenticatedRequest, @Param('reference') reference: string) {
    return this.payments.getTransaction(reference, request.auth?.merchantId);
  }

  @Get('payments/:reference/routing-telemetry')
  @Authorize('merchant', 'support', 'ops', 'admin')
  routingTelemetry(@Req() request: AuthenticatedRequest, @Param('reference') reference: string) {
    return this.payments.getRoutingTelemetry(reference, request.auth?.merchantId);
  }

  @Post('payments/:reference/refund')
  @Authorize('support', 'ops', 'admin')
  refund(
    @Req() request: AuthenticatedRequest,
    @Param('reference') reference: string,
    @Body() body: RefundPaymentDto,
  ) {
    return this.payments.manualRefund(reference, body.reason, request.auth?.merchantId);
  }

  @Post('payments/callbacks/provider')
  callback(@Body() body: CallbackDto) {
    return this.payments.handleCallback(body);
  }

  @Get('customers/search')
  @Authorize('merchant', 'support', 'ops', 'admin')
  searchCustomers(@Req() request: AuthenticatedRequest, @Query() query: SearchCustomersDto) {
    return this.payments.searchCustomers(
      query.merchantId ?? request.auth?.merchantId ?? '',
      query.query,
      request.auth?.merchantId,
    );
  }

  @Get('customers/:customerId/payments')
  @Authorize('merchant', 'support', 'ops', 'admin')
  customerPayments(
    @Req() request: AuthenticatedRequest,
    @Param('customerId') customerId: string,
    @Query('merchantId') merchantId: string,
  ) {
    return this.payments.customerPaymentHistory(
      customerId,
      merchantId ?? request.auth?.merchantId ?? '',
      request.auth?.merchantId,
    );
  }
}
