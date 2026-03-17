import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AuthzGuard } from './common/authz.guard';
import { MaintenanceGuard } from './common/maintenance.guard';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { MerchantsModule } from './merchants/merchants.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProvidersModule } from './providers/providers.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    ProvidersModule,
    PaymentsModule,
    ApiKeysModule,
    MaintenanceModule,
    WebhooksModule,
    MerchantsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: MaintenanceGuard },
    { provide: APP_GUARD, useClass: AuthzGuard },
  ],
})
export class AppModule {}
