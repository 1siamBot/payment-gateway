import { Injectable } from '@nestjs/common';

@Injectable()
export class MaintenanceService {
  private enabled = false;

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}
