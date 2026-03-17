import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(private readonly maintenance: MaintenanceService) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.maintenance.isEnabled()) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ path?: string }>();
    if (request.path?.startsWith('/maintenance')) {
      return true;
    }

    throw new ServiceUnavailableException('Maintenance mode enabled');
  }
}
