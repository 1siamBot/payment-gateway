import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CallbackDto } from './dto/callback.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  initiate(@Body() body: CreatePaymentDto) {
    return this.payments.initiatePayment(body);
  }

  @Get(':reference')
  inquiry(@Param('reference') reference: string) {
    return this.payments.getTransaction(reference);
  }

  @Post('callbacks/provider')
  callback(@Body() body: CallbackDto) {
    return this.payments.handleCallback(body);
  }
}
