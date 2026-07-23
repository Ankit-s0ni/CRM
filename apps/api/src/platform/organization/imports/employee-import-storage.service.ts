import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class EmployeeImportStorageService {
  private readonly memory = new Map<string, string>();
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

  async presign(tenantId: string, filename: string, contentType: string) {
    return this.presignFor(tenantId, 'employee-imports', filename, contentType);
  }

  async presignFor(
    tenantId: string,
    folder: string,
    filename: string,
    contentType: string,
  ) {
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
    const objectKey = `${tenantId}/${safeFolder}/${randomUUID()}-${safeFilename}`;
    if (this.isMemoryMode()) {
      return { objectKey, uploadUrl: `memory://${objectKey}`, expiresIn: 900 };
    }

    await this.ensureBucket();
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

  async getText(objectKey: string) {
    if (this.isMemoryMode()) {
      const content = this.memory.get(objectKey);
      if (content === undefined) this.throwMissing();
      return content;
    }

    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
      return (await response.Body?.transformToString('utf-8')) ?? '';
    } catch {
      this.throwMissing();
    }
  }

  putTestObject(objectKey: string, content: string) {
    this.memory.set(objectKey, content);
  }

  async putObject(
    objectKey: string,
    content: string,
    contentType = 'text/csv',
  ) {
    if (this.isMemoryMode()) {
      this.memory.set(objectKey, content);
      return;
    }
    await this.ensureBucket();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: content,
        ContentType: contentType,
      }),
    );
  }

  private async ensureBucket() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  private isMemoryMode() {
    if (process.env.IMPORT_STORAGE_MODE) {
      return process.env.IMPORT_STORAGE_MODE === 'memory';
    }
    return process.env.NODE_ENV === 'test';
  }

  private throwMissing(): never {
    throw new NotFoundException({
      code: 'IMPORT_FILE_NOT_FOUND',
      message: 'Import file was not found in private storage',
    });
  }
}
