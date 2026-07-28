import { BadRequestException, Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import {
  createS3ClientConfig,
  requireStorageBucket,
} from '../../../../shared/storage/s3-storage-config';

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_IMAGE_BYTES = 5_000_000;
const MAX_CSV_BYTES = 10_000_000;

export const MAX_IMAGES_PER_PRODUCT = 5;

/**
 * Object storage for the POS catalog: product images and import CSVs.
 *
 * Modelled on TenantAssetStorageService (company logo) and EmployeeImportStorageService.
 * Uploads are presigned — the client PUTs straight to S3 and the API never sees the bytes.
 *
 * ponytail: no server-side image compression. Presigned uploads make `sharp` impossible
 * without introducing a multipart endpoint, which no other route in this API has. Originals
 * are stored as uploaded. Revisit with client-side resize, or a public CDN bucket, when the
 * MVP-06 register grid shows the payload actually hurts.
 */
@Injectable()
export class PosCatalogStorageService {
  private readonly memory = new Map<string, string>();
  private readonly client = new S3Client(
    createS3ClientConfig(process.env.S3_ENDPOINT),
  );

  private get bucket() {
    return requireStorageBucket('S3_BUCKET');
  }

  async presignProductImage(
    tenantId: string,
    filename: string,
    contentType: string,
    fileSize: number,
  ) {
    if (!IMAGE_TYPES.has(contentType) || fileSize > MAX_IMAGE_BYTES) {
      throw new BadRequestException({
        code: 'POS_IMAGE_INVALID',
        message: 'Images must be PNG, JPEG or WebP and no larger than 5 MB',
      });
    }
    return this.presignFor(tenantId, 'pos/products', filename, contentType);
  }

  async presignImportCsv(
    tenantId: string,
    filename: string,
    contentType: string,
    fileSize: number,
  ) {
    const allowed = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    if (!allowed.includes(contentType) || fileSize > MAX_CSV_BYTES) {
      throw new BadRequestException({
        code: 'POS_IMPORT_FILE_INVALID',
        message: 'Import files must be CSV and no larger than 10 MB',
      });
    }
    return this.presignFor(tenantId, 'pos/imports', filename, contentType);
  }

  /**
   * Signing is a local HMAC with no network call, so signing a whole page of products is
   * cheap. Keys are validated against the tenant prefix so one tenant can never sign
   * another's object.
   */
  async signedImageUrl(tenantId: string, objectKey: string | null | undefined) {
    if (!objectKey) return null;
    if (!objectKey.startsWith(`${tenantId}/pos/products/`)) return null;
    if (this.isMemoryMode()) return `memory://${objectKey}`;
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      { expiresIn: 900 },
    );
  }

  async signedImageUrls(tenantId: string, objectKeys: string[]) {
    return (
      await Promise.all(
        objectKeys.map((key) => this.signedImageUrl(tenantId, key)),
      )
    ).filter((url): url is string => url !== null);
  }

  async getText(objectKey: string) {
    if (this.isMemoryMode()) return this.memory.get(objectKey) ?? '';
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
    return (await response.Body?.transformToString('utf-8')) ?? '';
  }

  /** Test seam: lets e2e specs stage a CSV without touching S3. */
  putTestObject(objectKey: string, content: string) {
    this.memory.set(objectKey, content);
  }

  private async presignFor(
    tenantId: string,
    folder: string,
    filename: string,
    contentType: string,
  ) {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `${tenantId}/${folder}/${randomUUID()}-${safeName}`;
    if (this.isMemoryMode()) {
      return { objectKey, uploadUrl: `memory://${objectKey}`, expiresIn: 900 };
    }
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ContentType: contentType,
      }),
      { expiresIn: 900 },
    );
    return { objectKey, uploadUrl, expiresIn: 900 };
  }

  private isMemoryMode() {
    return process.env.NODE_ENV === 'test';
  }
}
