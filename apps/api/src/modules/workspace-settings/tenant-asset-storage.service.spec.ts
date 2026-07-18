import { BadRequestException, HttpException } from '@nestjs/common';
import { TenantAssetStorageService } from './tenant-asset-storage.service';

describe('TenantAssetStorageService', () => {
  const originalEnvironment = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnvironment;
  });

  it('creates only tenant-prefixed image upload keys', async () => {
    const result = await new TenantAssetStorageService().presignLogo(
      'tenant-a',
      '../../brand image.png',
      'image/png',
      250_000,
    );

    expect(result.objectKey).toMatch(/^tenant-a\/branding\/[0-9a-f-]+-/);
    expect(result.objectKey.split('/branding/')[1]).not.toContain('/');
    expect(result.uploadUrl).toBe(`memory://${result.objectKey}`);
  });

  it.each([
    ['image/svg+xml', 100_000],
    ['image/png', 2_000_001],
  ])('rejects unsafe logo input %s at %i bytes', async (type, size) => {
    await expect(
      new TenantAssetStorageService().presignLogo(
        'tenant-a',
        'logo.file',
        type,
        size,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a logo key owned by another tenant', async () => {
    try {
      await new TenantAssetStorageService().signedLogoUrl(
        'tenant-a',
        'tenant-b/branding/logo.png',
      );
      throw new Error('Expected a cross-tenant logo key to be rejected');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toEqual(
        expect.objectContaining({ code: 'TENANT_LOGO_INVALID' }),
      );
    }
  });
});
