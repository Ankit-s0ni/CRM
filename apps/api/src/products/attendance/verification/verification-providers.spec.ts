import {
  DeviceIntegrityProvider,
  FaceMatchProvider,
} from './verification-providers';
import type { PrismaTransaction } from '../../../shared/database/prisma.service';
import { DeviceIntegrityChallengeService } from './device-integrity-challenge.service';

describe('verification providers', () => {
  const originalEnvironment = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnvironment;
    delete process.env.DEVICE_INTEGRITY_PROVIDER_URL;
    delete process.env.DEVICE_INTEGRITY_PROVIDER_TOKEN;
    delete process.env.FACE_MATCH_PROVIDER_URL;
    delete process.env.FACE_MATCH_PROVIDER_TOKEN;
    jest.restoreAllMocks();
  });

  describe('DeviceIntegrityProvider', () => {
    const resolve = jest.fn().mockResolvedValue({
      id: '70000000-0000-4000-8000-000000000001',
      nonceHash: 'expected-nonce-hash',
      action: 'PUNCH',
    });
    const consume = jest.fn().mockResolvedValue(undefined);
    const provider = new DeviceIntegrityProvider({
      resolve,
      consume,
    } as unknown as DeviceIntegrityChallengeService);

    it.each([
      ['test-valid', true, false, false],
      ['test-invalid', false, false, false],
      ['test-rooted', true, false, true],
      ['test-mock', true, true, false],
    ])(
      'maps %s to the expected integrity verdict',
      async (token, genuineDevice, mockLocation, rooted) => {
        process.env.NODE_ENV = 'test';

        await expect(provider.verify(token)).resolves.toMatchObject({
          genuineDevice,
          mockLocation,
          rooted,
        });
      },
    );

    it('fails closed when a production adapter is unavailable', async () => {
      process.env.NODE_ENV = 'production';
      await expect(
        provider.verify('opaque-provider-token'),
      ).resolves.toBeNull();
    });

    it('accepts a bounded production integrity-gateway verdict', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DEVICE_INTEGRITY_PROVIDER_URL =
        'https://integrity.example.test/verify';
      process.env.DEVICE_INTEGRITY_PROVIDER_TOKEN = 'provider-secret';
      jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            genuineDevice: true,
            mockLocation: false,
            rooted: false,
            ignoredInternalPayload: 'must-not-be-retained',
          }),
          { status: 200 },
        ),
      );

      const envelope = JSON.stringify({
        challengeId: '70000000-0000-4000-8000-000000000001',
        platform: 'ANDROID',
        evidence: 'opaque-provider-token',
        mode: 'STANDARD',
      });
      await expect(
        provider.verify(envelope, {
          tx: {} as PrismaTransaction,
          tenantId: 'tenant-1',
          employeeId: 'employee-1',
          deviceId: 'device-1',
          platform: 'ANDROID',
        }),
      ).resolves.toEqual({
        genuineDevice: true,
        mockLocation: false,
        rooted: false,
        raw: {
          provider: 'integrity-gateway',
          platform: 'ANDROID',
          genuineDevice: true,
          mockLocation: false,
          rooted: false,
        },
      });
      expect(resolve).toHaveBeenCalledWith(
        expect.anything(),
        '70000000-0000-4000-8000-000000000001',
        expect.objectContaining({
          tenantId: 'tenant-1',
          employeeId: 'employee-1',
          deviceId: 'device-1',
        }),
      );
      expect(consume).toHaveBeenCalledWith(
        expect.anything(),
        '70000000-0000-4000-8000-000000000001',
      );
    });
  });

  describe('FaceMatchProvider', () => {
    const provider = new FaceMatchProvider();

    it.each([
      ['private/punch.jpg', 99, true],
      ['private/mismatch.jpg', 40, true],
      ['private/liveness-fail.jpg', 99, false],
    ])(
      'maps %s to the expected face verdict',
      async (key, score, livenessOk) => {
        process.env.NODE_ENV = 'test';
        await expect(provider.compare('face:employee', key)).resolves.toEqual({
          score,
          livenessOk,
        });
      },
    );

    it('fails closed when a production adapter is unavailable', async () => {
      process.env.NODE_ENV = 'production';
      await expect(
        provider.compare('face:employee', 'private/punch.jpg'),
      ).resolves.toBeNull();
    });

    it('accepts a bounded production face-gateway verdict', async () => {
      process.env.NODE_ENV = 'production';
      process.env.FACE_MATCH_PROVIDER_URL = 'https://face.example.test/compare';
      process.env.FACE_MATCH_PROVIDER_TOKEN = 'provider-secret';
      jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ score: 96.5, livenessOk: true }), {
          status: 200,
        }),
      );

      await expect(
        provider.compare('face:employee', 'private/punch.jpg'),
      ).resolves.toEqual({ score: 96.5, livenessOk: true });
    });
  });
});
