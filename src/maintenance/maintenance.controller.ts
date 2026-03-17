import { Body, Controller, Get, Patch } from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { Authorize } from '../common/authz.decorator';
import { MaintenanceService } from '../common/maintenance.service';

class MaintenanceDto {
  @IsBoolean()
  enabled!: boolean;
}

@Controller('maintenance')
@Authorize('admin')
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
