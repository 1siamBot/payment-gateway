import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { ProvidersModule } from './providers/providers.module';
import { PaymentsModule } from './payments/payments.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { MaintenanceGuard } from './common/maintenance.guard';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    ProvidersModule,
    PaymentsModule,
    ApiKeysModule,
    MaintenanceModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: MaintenanceGuard },
  ],
})
export class AppModule {}
