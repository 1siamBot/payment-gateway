import { IsIn, IsString } from 'class-validator';

export class CallbackDto {
  @IsString()
  provider!: string;

  @IsString()
  eventId!: string;

  @IsString()
  transactionReference!: string;

  @IsIn(['succeeded', 'failed'])
  status!: 'succeeded' | 'failed';

  @IsString()
  signature!: string;
}
