import { Body, Controller, Get, Patch } from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { MaintenanceService } from '../common/maintenance.service';

class MaintenanceDto {
  @IsBoolean()
  enabled!: boolean;
}

@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Get()
  getState(): { enabled: boolean } {
    return { enabled: this.maintenance.isEnabled() };
  }

  @Patch()
  setState(@Body() body: MaintenanceDto): { enabled: boolean } {
    this.maintenance.setEnabled(body.enabled);
    return { enabled: this.maintenance.isEnabled() };
  }
}
