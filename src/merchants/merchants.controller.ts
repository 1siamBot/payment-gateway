import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsOptional, IsString, IsUrl } from 'class-validator';
import { Authorize } from '../common/authz.decorator';
import { MerchantsService } from './merchants.service';

class CreateMerchantDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  webhookUrl?: string;
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
}
