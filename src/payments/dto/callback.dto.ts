import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

export class CallbackDto {
  @IsString()
  provider!: string;

  @IsString()
  eventId!: string;

  @IsOptional()
  @IsString()
  replayKey?: string;

  @IsString()
  transactionReference!: string;

  @IsIn(['succeeded', 'failed'])
  status!: 'succeeded' | 'failed';

  @IsOptional()
  @IsISO8601()
  eventTimestamp?: string;

  @IsString()
  signature!: string;
}
