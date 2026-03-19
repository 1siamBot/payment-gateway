import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Authorize } from '../common/authz.decorator';
import type { AuthenticatedRequest } from '../common/authz.guard';
import { WebhooksService } from './webhooks.service';

class RetryWebhooksDto {
  limit?: number;
}

@Controller('webhooks')
@Authorize('ops', 'admin')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Get('deliveries')
  @Authorize('merchant', 'support', 'ops', 'admin')
  list(
    @Req() request: AuthenticatedRequest,
    @Query('merchantId') merchantId?: string,
    @Query('status') status?: 'PENDING' | 'DELIVERED' | 'FAILED',
    @Query('eventType') eventType?: string,
    @Query('take') take?: string,
  ) {
    return this.webhooks.listDeliveries({
      merchantId: merchantId ?? request.auth?.merchantId,
      status,
      eventType,
      take: take ? Number(take) : undefined,
    }, request.auth?.merchantId);
  }

  @Post('retry-pending')
  retry(@Body() body: RetryWebhooksDto) {
    return this.webhooks.retryPending(body.limit ?? 25);
  }
}
