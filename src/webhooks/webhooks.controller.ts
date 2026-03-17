import { Body, Controller, Post } from '@nestjs/common';
import { Authorize } from '../common/authz.decorator';
import { WebhooksService } from './webhooks.service';

class RetryWebhooksDto {
  limit?: number;
}

@Controller('webhooks')
@Authorize('ops', 'admin')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post('retry-pending')
  retry(@Body() body: RetryWebhooksDto) {
    return this.webhooks.retryPending(body.limit ?? 25);
  }
}
