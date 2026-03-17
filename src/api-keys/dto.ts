import { IsString } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  shopId!: string;

  @IsString()
  name!: string;
}

export class RotateApiKeyDto {
  @IsString()
  keyId!: string;
}

export class RevokeApiKeyDto {
  @IsString()
  keyId!: string;
}
