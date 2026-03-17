import { IsOptional, IsString } from 'class-validator';

export class SearchCustomersDto {
  @IsString()
  merchantId!: string;

  @IsOptional()
  @IsString()
  query?: string;
}
