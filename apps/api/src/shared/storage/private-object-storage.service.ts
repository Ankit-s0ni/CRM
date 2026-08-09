import {
  BadRequestException,
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
import {
  createS3ClientConfig,
  requireStorageBucket,
} from './s3-storage-config';

@Injectable()
export class PrivateObjectStorageService {
  private readonly testObjects = new Map<string, Buffer>();
  private readonly client = new S3Client(
    createS3ClientConfig(process.env.S3_ENDPOINT),
  );

  private get bucket() {
    return requireStorageBucket('S3_PRIVATE_BUCKET');
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
