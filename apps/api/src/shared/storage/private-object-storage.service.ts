import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

const ATTACHMENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

@Injectable()
export class PrivateObjectStorageService {
  private readonly testObjects = new Map<string, Buffer>();
  private readonly bucket = process.env.S3_PRIVATE_BUCKET ?? 'hrms-private';
  private readonly client = new S3Client({
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
    },
  });

  async presignRegularizationAttachment(
    tenantId: string,
    employeeId: string,
    filename: string,
    contentType: string,
    fileSize: number,
  ) {
    if (
      !ATTACHMENT_TYPES.has(contentType) ||
      fileSize < 1 ||
      fileSize > 10_000_000
    ) {
      throw new BadRequestException({
        code: 'REGULARIZATION_ATTACHMENT_INVALID',
        message: 'Attachment must be PNG, JPEG, WebP, or PDF under 10 MB',
      });
    }
    const objectKey = this.key(
      tenantId,
      'regularizations',
      employeeId,
      filename,
    );
    if (process.env.NODE_ENV === 'test') {
      this.testObjects.set(objectKey, Buffer.alloc(0));
      return { objectKey, uploadUrl: `memory://${objectKey}`, expiresIn: 300 };
    }
    return {
      objectKey,
      uploadUrl: await getSignedUrl(
        this.client,
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
          ContentType: contentType,
          ContentLength: fileSize,
          Metadata: {
            tenantId,
            ownerId: employeeId,
            purpose: 'regularizations',
          },
        }),
        { expiresIn: 300 },
      ),
      expiresIn: 300,
    };
  }

  async verifyRegularizationAttachment(
    tenantId: string,
    employeeId: string,
    objectKey: string,
  ) {
    this.assertPrefix(tenantId, 'regularizations', employeeId, objectKey);
    await this.assertExists(objectKey, tenantId);
  }

  async putReport(
    tenantId: string,
    reportId: string,
    extension: string,
    contentType: string,
    body: Buffer,
  ) {
    const objectKey = `private/${tenantId}/reports/${reportId}/export.${extension}`;
    if (process.env.NODE_ENV === 'test') {
      this.testObjects.set(objectKey, body);
      return objectKey;
    }
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ContentType: contentType,
        Body: body,
        Metadata: { tenantId, reportId, purpose: 'reports' },
      }),
    );
    return objectKey;
  }

  async signedReportDownload(
    tenantId: string,
    reportId: string,
    objectKey: string,
    expiresAt: Date,
  ) {
    this.assertPrefix(tenantId, 'reports', reportId, objectKey);
    if (expiresAt <= new Date()) {
      throw new GoneException({
        code: 'REPORT_EXPIRED',
        message: 'This report export has expired',
      });
    }
    await this.assertExists(objectKey, tenantId);
    if (process.env.NODE_ENV === 'test') {
      return { url: `memory://${objectKey}`, expiresIn: 900 };
    }
    return {
      url: await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
        { expiresIn: 900 },
      ),
      expiresIn: 900,
    };
  }

  async putInvoice(tenantId: string, invoiceId: string, body: Buffer) {
    const objectKey = `private/${tenantId}/invoices/${invoiceId}/invoice.pdf`;
    if (process.env.NODE_ENV === 'test') {
      this.testObjects.set(objectKey, body);
      return objectKey;
    }
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ContentType: 'application/pdf',
        Body: body,
        Metadata: { tenantId, invoiceId, purpose: 'invoices' },
      }),
    );
    return objectKey;
  }

  async signedInvoiceDownload(
    tenantId: string,
    invoiceId: string,
    objectKey: string,
  ) {
    this.assertPrefix(tenantId, 'invoices', invoiceId, objectKey);
    await this.assertExists(objectKey, tenantId);
    if (process.env.NODE_ENV === 'test') {
      return { url: `memory://${objectKey}`, expiresIn: 900 };
    }
    return {
      url: await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
        { expiresIn: 900 },
      ),
      expiresIn: 900,
    };
  }

  private key(
    tenantId: string,
    purpose: string,
    ownerId: string,
    filename: string,
  ) {
    const extension =
      filename
        .split('.')
        .pop()
        ?.replace(/[^a-z0-9]/gi, '')
        .toLowerCase() || 'bin';
    return `private/${tenantId}/${purpose}/${ownerId}/${randomUUID()}.${extension}`;
  }

  private assertPrefix(
    tenantId: string,
    purpose: string,
    ownerId: string,
    objectKey: string,
  ) {
    if (!objectKey.startsWith(`private/${tenantId}/${purpose}/${ownerId}/`)) {
      throw new BadRequestException({
        code: 'PRIVATE_OBJECT_KEY_INVALID',
        message: 'Private object does not belong to this workspace resource',
      });
    }
  }

  private async assertExists(objectKey: string, tenantId: string) {
    if (process.env.NODE_ENV === 'test') {
      if (!this.testObjects.has(objectKey)) this.missing();
      return;
    }
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
      if (result.Metadata?.tenantid !== tenantId) this.missing();
    } catch {
      this.missing();
    }
  }

  private missing(): never {
    throw new NotFoundException({
      code: 'PRIVATE_OBJECT_NOT_FOUND',
      message: 'Private object was not found',
    });
  }
}
