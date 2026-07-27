import { InternalServerErrorException } from '@nestjs/common';
import { AesGcmProtectedPayrollDataCipher } from './aes-gcm-protected-payroll-data-cipher';

describe('AesGcmProtectedPayrollDataCipher', () => {
  const originalKey = process.env.PAYROLL_DATA_ENCRYPTION_KEY;
  const originalVersion = process.env.PAYROLL_DATA_KEY_VERSION;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.PAYROLL_DATA_ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef';
    process.env.PAYROLL_DATA_KEY_VERSION = 'test-v1';
  });

  afterEach(() => {
    process.env.PAYROLL_DATA_ENCRYPTION_KEY = originalKey;
    process.env.PAYROLL_DATA_KEY_VERSION = originalVersion;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('encrypts without embedding plaintext and decrypts with the key version', async () => {
    const cipher = new AesGcmProtectedPayrollDataCipher();
    const plaintext = 'BANK-ACCOUNT-TEST-998877';

    const encrypted = await cipher.encrypt(plaintext);

    expect(encrypted.keyVersion).toBe('test-v1');
    expect(encrypted.ciphertext).not.toContain(plaintext);
    expect(await cipher.decrypt(encrypted)).toBe(plaintext);
  });

  it('uses a fresh IV for repeated encryption of the same plaintext', async () => {
    const cipher = new AesGcmProtectedPayrollDataCipher();
    const plaintext = 'BANK-ACCOUNT-TEST-998877';

    const first = await cipher.encrypt(plaintext);
    const second = await cipher.encrypt(plaintext);

    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(await cipher.decrypt(first)).toBe(plaintext);
    expect(await cipher.decrypt(second)).toBe(plaintext);
  });

  it('fails closed when encrypted data is tampered with', async () => {
    const cipher = new AesGcmProtectedPayrollDataCipher();
    const encrypted = await cipher.encrypt('BANK-ACCOUNT-TEST-998877');

    await expect(
      Promise.resolve().then(() =>
        cipher.decrypt({
          ...encrypted,
          ciphertext: tamperEnvelopePart(encrypted.ciphertext, 4),
        }),
      ),
    ).rejects.toThrow(InternalServerErrorException);
    await expect(
      Promise.resolve().then(() =>
        cipher.decrypt({
          ...encrypted,
          ciphertext: tamperEnvelopePart(encrypted.ciphertext, 3),
        }),
      ),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('does not decrypt values with the wrong key', async () => {
    const encryptingCipher = new AesGcmProtectedPayrollDataCipher();
    const encrypted = await encryptingCipher.encrypt(
      'BANK-ACCOUNT-TEST-998877',
    );

    process.env.PAYROLL_DATA_ENCRYPTION_KEY =
      'fedcba9876543210fedcba9876543210';
    const decryptingCipher = new AesGcmProtectedPayrollDataCipher();

    await expect(
      Promise.resolve().then(() => decryptingCipher.decrypt(encrypted)),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('requires an explicit data key in production', () => {
    delete process.env.PAYROLL_DATA_ENCRYPTION_KEY;
    process.env.NODE_ENV = 'production';

    expect(() => new AesGcmProtectedPayrollDataCipher()).toThrow(
      'PAYROLL_DATA_ENCRYPTION_KEY is required in production',
    );
  });
});

function tamperEnvelopePart(envelope: string, index: number) {
  const parts = envelope.split(':');
  const decoded = Buffer.from(parts[index], 'base64url');
  decoded[0] = decoded[0] ^ 1;
  parts[index] = decoded.toString('base64url');
  return parts.join(':');
}
