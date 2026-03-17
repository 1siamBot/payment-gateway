import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class SecretCryptoService {
  private readonly key: Buffer;

  constructor() {
    const source = process.env.CONNECTOR_SECRET_KEY ?? 'dev-only-connector-key-change-me';
    this.key = Buffer.from(source.padEnd(32, '0').slice(0, 32));
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
  }

  decrypt(payload: string): string {
    const [ivB64, tagB64, encryptedB64] = payload.split('.');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedB64, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
