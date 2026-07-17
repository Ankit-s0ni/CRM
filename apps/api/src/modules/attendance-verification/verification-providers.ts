import { Injectable } from '@nestjs/common';

export type IntegrityVerdict = {
  genuineDevice: boolean;
  mockLocation: boolean;
  rooted: boolean;
  raw: Record<string, boolean | string>;
};

@Injectable()
export class DeviceIntegrityProvider {
  async verify(token: string): Promise<IntegrityVerdict | null> {
    if (process.env.NODE_ENV !== 'production') {
      const verdict = {
        genuineDevice: !token.includes('invalid'),
        mockLocation: token.includes('mock'),
        rooted: token.includes('rooted'),
      };
      return {
        ...verdict,
        raw: { provider: 'local-development', ...verdict },
      };
    }
    const response = await providerRequest(
      process.env.DEVICE_INTEGRITY_PROVIDER_URL,
      process.env.DEVICE_INTEGRITY_PROVIDER_TOKEN,
      { token },
    );
    if (
      typeof response?.genuineDevice !== 'boolean' ||
      typeof response.mockLocation !== 'boolean' ||
      typeof response.rooted !== 'boolean'
    ) {
      return null;
    }
    return {
      genuineDevice: response.genuineDevice,
      mockLocation: response.mockLocation,
      rooted: response.rooted,
      raw: {
        provider: 'integrity-gateway',
        genuineDevice: response.genuineDevice,
        mockLocation: response.mockLocation,
        rooted: response.rooted,
      },
    };
  }
}

export type FaceVerdict = { score: number; livenessOk: boolean };

@Injectable()
export class FaceMatchProvider {
  async compare(
    embeddingRef: string,
    selfieKey: string,
  ): Promise<FaceVerdict | null> {
    if (process.env.NODE_ENV !== 'production') {
      return {
        score: selfieKey.includes('mismatch') ? 40 : 99,
        livenessOk: !selfieKey.includes('liveness-fail'),
      };
    }
    const response = await providerRequest(
      process.env.FACE_MATCH_PROVIDER_URL,
      process.env.FACE_MATCH_PROVIDER_TOKEN,
      { embeddingRef, selfieKey },
    );
    if (
      typeof response?.score !== 'number' ||
      typeof response.livenessOk !== 'boolean' ||
      response.score < 0 ||
      response.score > 100
    ) {
      return null;
    }
    return { score: response.score, livenessOk: response.livenessOk };
  }
}

async function providerRequest(
  url: string | undefined,
  token: string | undefined,
  body: Record<string, string>,
): Promise<Record<string, unknown> | null> {
  if (!url?.startsWith('https://') || !token) return null;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
