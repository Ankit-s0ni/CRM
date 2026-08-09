import { generateKeyPairSync } from 'node:crypto';
import { ProductSigningKeyService } from './product-signing-key.service';

describe('ProductSigningKeyService', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    process.env = { ...originalEnvironment, NODE_ENV: 'test' };
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('accepts a configured matching RSA key pair', () => {
    const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
    process.env.PRODUCT_TOKEN_PRIVATE_KEY = pair.privateKey
      .export({ format: 'pem', type: 'pkcs8' })
      .toString();
    process.env.PRODUCT_TOKEN_PUBLIC_KEY = pair.publicKey
      .export({ format: 'pem', type: 'spki' })
      .toString();

    const service = new ProductSigningKeyService();

    expect(service.jwks().keys[0]).toMatchObject({
      alg: 'RS256',
      use: 'sig',
    });
  });

  it('rejects mismatched configured keys', () => {
    const first = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const second = generateKeyPairSync('rsa', { modulusLength: 2048 });
    process.env.PRODUCT_TOKEN_PRIVATE_KEY = first.privateKey
      .export({ format: 'pem', type: 'pkcs8' })
      .toString();
    process.env.PRODUCT_TOKEN_PUBLIC_KEY = second.publicKey
      .export({ format: 'pem', type: 'spki' })
      .toString();

    expect(() => new ProductSigningKeyService()).toThrow(
      'Product token signing keys are invalid or do not match',
    );
  });
});
