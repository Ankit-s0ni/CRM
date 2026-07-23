import { BadRequestException, Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

@Injectable()
export class TenantAssetStorageService {
  private readonly bucket = process.env.S3_BUCKET ?? 'hrms-uploads';
  private readonly client = new S3Client({
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION ?? 'eu-north-1',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
    },
  });

  async presignLogo(
    tenantId: string,
    filename: string,
    contentType: string,
    fileSize: number,
  ) {
    if (!LOGO_TYPES.has(contentType) || fileSize > 2_000_000) {
      throw new BadRequestException({
        code: 'LOGO_FILE_INVALID',
        message: 'Logo must be PNG, JPEG, or WebP and no larger than 2 MB',
      });
    }
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `${tenantId}/branding/${randomUUID()}-${safeName}`;
    if (process.env.NODE_ENV === 'test') {
      return { objectKey, uploadUrl: `memory://${objectKey}`, expiresIn: 900 };
    }
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ContentType: contentType,
        ContentLength: fileSize,
      }),
      { expiresIn: 900 },
    );
    return { objectKey, uploadUrl, expiresIn: 900 };
  }

  async signedLogoUrl(tenantId: string, objectKey: string | null | undefined) {
    if (!objectKey) return null;
    if (!objectKey.startsWith(`${tenantId}/branding/`)) {
      throw new BadRequestException({
        code: 'TENANT_LOGO_INVALID',
        message: 'The tenant logo does not belong to this workspace',
      });
    }
    if (process.env.NODE_ENV === 'test') return `memory://${objectKey}`;
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      { expiresIn: 900 },
    );
  }
}
