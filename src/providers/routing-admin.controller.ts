import { Body, Controller, Get, Put } from '@nestjs/common';
import { Authorize } from '../common/authz.decorator';
import { ProviderRouterService, RoutingPolicyConfigUpdate } from './provider-router.service';

@Controller('admin/routing')
@Authorize('admin', 'ops')
export class RoutingAdminController {
  constructor(private readonly router: ProviderRouterService) {}

  @Get('policy')
  policy() {
    return this.router.getPolicyConfig();
  }

  @Put('policy')
  updatePolicy(@Body() input: RoutingPolicyConfigUpdate) {
    return this.router.updatePolicyConfig(input ?? {});
  }

  @Get('health')
  health() {
    return this.router.getProviderHealthSnapshot();
  }
}
