import { Module } from '@nestjs/common';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from '../common/maintenance.service';

@Module({
  providers: [MaintenanceService],
  controllers: [MaintenanceController],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
