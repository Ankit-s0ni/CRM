import {
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';

export type LivenessResult = {
  embeddingRef: string;
  provider: string;
};

@Injectable()
export class LivenessProvider {
  async verify(objectKey: string, proofToken: string): Promise<LivenessResult> {
    if (
      process.env.NODE_ENV !== 'production' &&
      (proofToken === `test-live:${objectKey}` ||
        proofToken === `dev-live:${objectKey}`)
    ) {
      return this.result(objectKey, 'local-development');
    }
    const response = await livenessRequest(objectKey, proofToken);
    if (!response) this.throwUnavailable();
    if (
      response.livenessOk !== true ||
      !isOpaqueReference(response.embeddingRef)
    ) {
      this.throwFailed();
    }
    return {
      embeddingRef: response.embeddingRef,
      provider: 'face-liveness-gateway',
    };
  }

  private result(objectKey: string, provider: string): LivenessResult {
    return {
      embeddingRef: `face:${createHash('sha256').update(objectKey).digest('hex')}`,
      provider,
    };
  }

  private throwUnavailable(): never {
    throw new ServiceUnavailableException({
      code: 'VERIFICATION_PROVIDER_UNAVAILABLE',
      message: 'Face verification is temporarily unavailable',
    });
  }

  private throwFailed(): never {
    throw new UnprocessableEntityException({
      code: 'LIVENESS_FAILED',
      message: 'Liveness verification failed. Please capture your face again',
    });
  }
}

type LivenessGatewayResponse = {
  embeddingRef?: unknown;
  livenessOk?: unknown;
};

async function livenessRequest(
  objectKey: string,
  captureProof: string,
): Promise<{ embeddingRef: string; livenessOk: boolean } | null> {
  const url = process.env.FACE_LIVENESS_PROVIDER_URL;
  const token = process.env.FACE_LIVENESS_PROVIDER_TOKEN;
  if (!url?.startsWith('https://') || !token) return null;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ objectKey, captureProof }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const result = (await response.json()) as LivenessGatewayResponse;
    if (
      typeof result.embeddingRef !== 'string' ||
      typeof result.livenessOk !== 'boolean'
    ) {
      return null;
    }
    return result as { embeddingRef: string; livenessOk: boolean };
  } catch {
    return null;
  }
}

function isOpaqueReference(value: string) {
  return value.length >= 16 && value.length <= 500;
}
