import { Body, Controller, Post } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto, RevokeApiKeyDto, RotateApiKeyDto } from './dto';

@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Post('create')
  create(@Body() body: CreateApiKeyDto) {
    return this.apiKeys.createKey(body.shopId, body.name);
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
