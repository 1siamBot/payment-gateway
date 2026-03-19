import { Module } from '@nestjs/common';
import { ProvidersModule } from '../providers/providers.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { PaymentCallbackGuardService } from './payment-callback-guard.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [ProvidersModule, WebhooksModule],
  providers: [PaymentsService, PaymentCallbackGuardService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
