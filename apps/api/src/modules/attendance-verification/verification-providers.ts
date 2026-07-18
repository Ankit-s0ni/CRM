import { Injectable } from '@nestjs/common';
import type { PrismaTransaction } from '../../shared/database/prisma.service';
import { DeviceIntegrityChallengeService } from './device-integrity-challenge.service';

export type IntegrityVerdict = {
  genuineDevice: boolean;
  mockLocation: boolean;
  rooted: boolean;
  raw: Record<string, boolean | string>;
};

type IntegrityContext = {
  tx: PrismaTransaction;
  tenantId: string;
  employeeId: string;
  deviceId: string;
  platform: 'ANDROID' | 'IOS';
};

type IntegrityEnvelope = {
  challengeId: string;
  platform: 'ANDROID' | 'IOS';
  evidence: string;
  mode?: 'ATTESTATION' | 'ASSERTION' | 'STANDARD';
  keyId?: string;
};

@Injectable()
export class DeviceIntegrityProvider {
  constructor(private readonly challenges: DeviceIntegrityChallengeService) {}

  async verify(
    token: string,
    context?: IntegrityContext,
  ): Promise<IntegrityVerdict | null> {
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
    if (!context) return null;
    const envelope = parseIntegrityEnvelope(token);
    if (!envelope || envelope.platform !== context.platform) return null;
    const challenge = await this.challenges.resolve(
      context.tx,
      envelope.challengeId,
      context,
    );
    const response = await providerRequest(
      process.env.DEVICE_INTEGRITY_PROVIDER_URL,
      process.env.DEVICE_INTEGRITY_PROVIDER_TOKEN,
      {
        platform: envelope.platform,
        evidence: envelope.evidence,
        mode: envelope.mode,
        keyId: envelope.keyId,
        challengeHash: challenge.nonceHash,
        challengeAction: challenge.action,
        deviceId: context.deviceId,
      },
    );
    if (
      typeof response?.genuineDevice !== 'boolean' ||
      typeof response.mockLocation !== 'boolean' ||
      typeof response.rooted !== 'boolean'
    ) {
      return null;
    }
    await this.challenges.consume(context.tx, challenge.id);
    return {
      genuineDevice: response.genuineDevice,
      mockLocation: response.mockLocation,
      rooted: response.rooted,
      raw: {
        provider: 'integrity-gateway',
        platform: envelope.platform,
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
  body: Record<string, unknown>,
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

function parseIntegrityEnvelope(token: string): IntegrityEnvelope | null {
  try {
    const value = JSON.parse(token) as Record<string, unknown>;
    if (
      typeof value.challengeId !== 'string' ||
      typeof value.platform !== 'string' ||
      !['ANDROID', 'IOS'].includes(value.platform) ||
      typeof value.evidence !== 'string' ||
      value.evidence.length < 8
    ) {
      return null;
    }
    const mode = value.mode;
    if (
      mode !== undefined &&
      (typeof mode !== 'string' ||
        !['ATTESTATION', 'ASSERTION', 'STANDARD'].includes(mode))
    ) {
      return null;
    }
    return {
      challengeId: value.challengeId,
      platform: value.platform as 'ANDROID' | 'IOS',
      evidence: value.evidence,
      mode: mode as IntegrityEnvelope['mode'],
      keyId: typeof value.keyId === 'string' ? value.keyId : undefined,
    };
  } catch {
    return null;
  }
}
