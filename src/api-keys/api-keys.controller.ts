import { Body, Controller, Post } from '@nestjs/common';
import { Authorize } from '../common/authz.decorator';
import { CreateApiKeyDto, RevokeApiKeyDto, RotateApiKeyDto } from './dto';
import { ApiKeysService } from './api-keys.service';

@Controller('api-keys')
@Authorize('admin', 'ops')
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Post('create')
  create(@Body() body: CreateApiKeyDto) {
    return this.apiKeys.createKey(body.merchantId, body.name);
  }

  @Post('rotate')
  rotate(@Body() body: RotateApiKeyDto) {
    return this.apiKeys.rotateKey(body.keyId);
  }

  @Post('revoke')
  revoke(@Body() body: RevokeApiKeyDto) {
    return this.apiKeys.revokeKey(body.keyId);
  }
}
