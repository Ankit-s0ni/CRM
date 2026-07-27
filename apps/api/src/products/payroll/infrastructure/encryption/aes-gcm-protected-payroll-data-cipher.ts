import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import {
  EncryptedPayrollValue,
  ProtectedPayrollDataCipher,
} from '../../application/ports/protected-payroll-data-cipher';

const DEV_FALLBACK_KEY =
  'DeltCRM payroll development key - replace in production!';

@Injectable()
export class AesGcmProtectedPayrollDataCipher implements ProtectedPayrollDataCipher {
  private readonly keyVersion = process.env.PAYROLL_DATA_KEY_VERSION ?? 'v1';
  private readonly key = Buffer.from(this.keyMaterial()).subarray(0, 32);

  encrypt(value: string): Promise<EncryptedPayrollValue> {
    try {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', this.key, iv);
      const encrypted = Buffer.concat([
        cipher.update(value, 'utf8'),
        cipher.final(),
      ]);
      const tag = cipher.getAuthTag();
      return Promise.resolve({
        ciphertext: [
          'aes-256-gcm',
          this.keyVersion,
          iv.toString('base64url'),
          tag.toString('base64url'),
          encrypted.toString('base64url'),
        ].join(':'),
        keyVersion: this.keyVersion,
      });
    } catch {
      throw new InternalServerErrorException({
        code: 'PROTECTED_PAYROLL_DATA_ENCRYPTION_FAILED',
        message: 'Protected payroll data could not be encrypted',
      });
    }
  }

  decrypt(value: EncryptedPayrollValue): Promise<string> {
    try {
      const [algorithm, , iv, tag, encrypted] = value.ciphertext.split(':');
      if (algorithm !== 'aes-256-gcm') throw new Error('Unsupported envelope');
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.key,
        Buffer.from(iv, 'base64url'),
      );
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      return Promise.resolve(
        Buffer.concat([
          decipher.update(Buffer.from(encrypted, 'base64url')),
          decipher.final(),
        ]).toString('utf8'),
      );
    } catch {
      throw new InternalServerErrorException({
        code: 'PROTECTED_PAYROLL_DATA_ENCRYPTION_FAILED',
        message: 'Protected payroll data could not be decrypted',
      });
    }
  }

  private keyMaterial() {
    const configured = process.env.PAYROLL_DATA_ENCRYPTION_KEY;
    if (configured) return configured.padEnd(32, configured);
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PAYROLL_DATA_ENCRYPTION_KEY is required in production');
    }
    return DEV_FALLBACK_KEY;
  }
}
