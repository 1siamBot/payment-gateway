import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SettlementExceptionActivityController } from './settlement-exception-activity.controller';
import { SettlementsController } from './settlements.controller';
import { SettlementsService } from './settlements.service';

@Module({
  imports: [PrismaModule],
  controllers: [SettlementsController, SettlementExceptionActivityController],
  providers: [SettlementsService],
  exports: [SettlementsService],
})
export class SettlementsModule {}
