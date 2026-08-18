import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
} from 'node:crypto';

@Injectable()
export class ProductSigningKeyService {
  readonly keyId = process.env.PRODUCT_TOKEN_KEY_ID ?? 'deltcrm-local-v1';
  readonly issuer =
    process.env.PRODUCT_TOKEN_ISSUER ?? 'https://auth.liqaahq.com';
  readonly privateKey: string;
  readonly publicKey: string;

  constructor() {
    const configuredPrivateKey = this.normalize(
      process.env.PRODUCT_TOKEN_PRIVATE_KEY,
    );
    const configuredPublicKey = this.normalize(
      process.env.PRODUCT_TOKEN_PUBLIC_KEY,
    );

    if (configuredPrivateKey && configuredPublicKey) {
      this.assertMatchingKeyPair(configuredPrivateKey, configuredPublicKey);
      this.privateKey = configuredPrivateKey;
      this.publicKey = configuredPublicKey;
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new InternalServerErrorException(
        'Product token signing keys are not configured',
      );
    }

    const generated = generateKeyPairSync('rsa', { modulusLength: 2048 });
    this.privateKey = generated.privateKey.export({
      format: 'pem',
      type: 'pkcs8',
    }) as string;
    this.publicKey = generated.publicKey.export({
      format: 'pem',
      type: 'spki',
    }) as string;
  }

  jwks() {
    const jwk = createPublicKey(this.publicKey).export({ format: 'jwk' });
    return {
      keys: [
        {
          ...jwk,
          kid: this.keyId,
          alg: 'RS256',
          use: 'sig',
        },
      ],
    };
  }

  private normalize(value?: string) {
    return value?.replace(/\\n/g, '\n').trim();
  }

  private assertMatchingKeyPair(privateKey: string, publicKey: string) {
    try {
      const derivedPublicKey = createPublicKey(createPrivateKey(privateKey))
        .export({ format: 'pem', type: 'spki' })
        .toString()
        .trim();
      const configuredPublicKey = createPublicKey(publicKey)
        .export({ format: 'pem', type: 'spki' })
        .toString()
        .trim();
      if (derivedPublicKey !== configuredPublicKey) throw new Error('mismatch');
    } catch {
      throw new InternalServerErrorException(
        'Product token signing keys are invalid or do not match',
      );
    }
  }
}
