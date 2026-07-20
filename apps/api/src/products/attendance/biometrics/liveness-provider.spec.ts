import { HttpException } from '@nestjs/common';
import { LivenessProvider } from './liveness-provider';

describe('LivenessProvider', () => {
  const originalEnvironment = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnvironment;
    delete process.env.FACE_LIVENESS_PROVIDER_URL;
    delete process.env.FACE_LIVENESS_PROVIDER_TOKEN;
    jest.restoreAllMocks();
  });

  it('uses deterministic evidence only outside production', async () => {
    process.env.NODE_ENV = 'test';
    await expect(
      new LivenessProvider().verify(
        'private/tenant/face.jpg',
        'test-live:private/tenant/face.jpg',
      ),
    ).resolves.toMatchObject({ provider: 'local-development' });
  });

  it('fails closed when the production liveness gateway is unavailable', async () => {
    process.env.NODE_ENV = 'production';
    await expectFailure(
      new LivenessProvider().verify(
        'private/tenant/face.jpg',
        'opaque-capture-proof',
      ),
      'VERIFICATION_PROVIDER_UNAVAILABLE',
    );
  });

  it('persists only a provider-issued opaque enrollment reference', async () => {
    process.env.NODE_ENV = 'production';
    process.env.FACE_LIVENESS_PROVIDER_URL = 'https://face.example.test/enroll';
    process.env.FACE_LIVENESS_PROVIDER_TOKEN = 'gateway-secret';
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          livenessOk: true,
          embeddingRef: 'provider-opaque-enrollment-reference',
          rawScore: 99.7,
        }),
        { status: 200 },
      ),
    );

    await expect(
      new LivenessProvider().verify(
        'private/tenant/face.jpg',
        'opaque-capture-proof',
      ),
    ).resolves.toEqual({
      provider: 'face-liveness-gateway',
      embeddingRef: 'provider-opaque-enrollment-reference',
    });
  });

  it('rejects a failed liveness verdict without accepting an embedding', async () => {
    process.env.NODE_ENV = 'production';
    process.env.FACE_LIVENESS_PROVIDER_URL = 'https://face.example.test/enroll';
    process.env.FACE_LIVENESS_PROVIDER_TOKEN = 'gateway-secret';
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          livenessOk: false,
          embeddingRef: 'provider-opaque-enrollment-reference',
        }),
        { status: 200 },
      ),
    );

    await expectFailure(
      new LivenessProvider().verify(
        'private/tenant/face.jpg',
        'opaque-capture-proof',
      ),
      'LIVENESS_FAILED',
    );
  });
});

async function expectFailure(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    throw new Error('Expected liveness verification to fail');
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(HttpException);
    const response = (error as HttpException).getResponse();
    expect(response).toEqual(expect.objectContaining({ code }));
  }
}
