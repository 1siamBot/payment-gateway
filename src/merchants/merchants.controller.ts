import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';
import { Authorize } from '../common/authz.decorator';
import { MerchantsService } from './merchants.service';

class CreateMerchantDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  webhookUrl?: string;
}

class UpdateMerchantConfigDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @Transform(({ value }) => (value === '' ? null : value))
  webhookUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  regenerateWebhookSecret?: boolean;
}

@Controller('merchants')
@Authorize('admin', 'ops')
export class MerchantsController {
  constructor(private readonly merchants: MerchantsService) {}

  @Post()
  create(@Body() body: CreateMerchantDto) {
    return this.merchants.create(body.name, body.webhookUrl);
  }

  @Get()
  list() {
    return this.merchants.list();
  }

  @Get(':merchantId/config')
  getConfig(@Param('merchantId') merchantId: string) {
    return this.merchants.getConfig(merchantId);
  }

  @Patch(':merchantId/config')
  updateConfig(@Param('merchantId') merchantId: string, @Body() body: UpdateMerchantConfigDto) {
    return this.merchants.updateConfig(merchantId, {
      name: body.name,
      webhookUrl: body.webhookUrl,
      regenerateWebhookSecret: body.regenerateWebhookSecret,
    });
  }
}
