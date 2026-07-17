import {
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export type LivenessResult = {
  embeddingRef: string;
  provider: string;
};

@Injectable()
export class LivenessProvider {
  verify(objectKey: string, proofToken: string): LivenessResult {
    if (
      process.env.NODE_ENV !== 'production' &&
      (proofToken === `test-live:${objectKey}` ||
        proofToken === `dev-live:${objectKey}`)
    ) {
      return this.result(objectKey, 'local-development');
    }
    const secret = process.env.LIVENESS_PROOF_SECRET;
    if (!secret) {
      throw new ServiceUnavailableException({
        code: 'VERIFICATION_PROVIDER_UNAVAILABLE',
        message: 'Face verification is temporarily unavailable',
      });
    }
    const [timestampText, supplied] = proofToken.split('.');
    const timestamp = Number(timestampText);
    if (!timestamp || !supplied || Math.abs(Date.now() - timestamp) > 300_000) {
      this.throwFailed();
    }
    const expected = createHmac('sha256', secret)
      .update(`${objectKey}:${timestampText}`)
      .digest('hex');
    const expectedBuffer = Buffer.from(expected);
    const suppliedBuffer = Buffer.from(supplied);
    if (
      expectedBuffer.length !== suppliedBuffer.length ||
      !timingSafeEqual(expectedBuffer, suppliedBuffer)
    ) {
      this.throwFailed();
    }
    return this.result(objectKey, 'signed-proof');
  }

  private result(objectKey: string, provider: string): LivenessResult {
    return {
      embeddingRef: `face:${createHash('sha256').update(objectKey).digest('hex')}`,
      provider,
    };
  }

  private throwFailed(): never {
    throw new UnprocessableEntityException({
      code: 'LIVENESS_FAILED',
      message: 'Liveness verification failed. Please capture your face again',
    });
  }
}
