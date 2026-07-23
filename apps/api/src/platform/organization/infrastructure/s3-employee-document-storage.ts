import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import {
  createS3ClientConfig,
  requireStorageBucket,
} from '../../../shared/storage/s3-storage-config';
import type {
  EmployeeDocumentDownload,
  EmployeeDocumentStorage,
  EmployeeDocumentUpload,
} from '../domain/employee-document-storage.interface';

const CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const MAX_FILE_SIZE = 10_000_000;

@Injectable()
export class S3EmployeeDocumentStorage implements EmployeeDocumentStorage {
  private readonly testObjects = new Map<
    string,
    {
      tenantId: string;
      employeeId: string;
      contentType: string;
      fileSize: number;
    }
  >();
  private readonly internalClient = this.client(process.env.S3_ENDPOINT);
  private readonly publicClient = this.client(
    process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT,
  );

  async createUpload(
    tenantId: string,
    employeeId: string,
    filename: string,
    contentType: string,
    fileSize: number,
  ): Promise<EmployeeDocumentUpload> {
    this.validate(contentType, fileSize);
    const objectKey = this.key(tenantId, employeeId, filename);
    const headers = {
      'Content-Type': contentType,
    };

    if (process.env.NODE_ENV === 'test') {
      this.testObjects.set(objectKey, {
        tenantId,
        employeeId,
        contentType,
        fileSize,
      });
      return {
        objectKey,
        uploadUrl: `memory://${objectKey}`,
        headers,
        expiresIn: 300,
      };
    }

    return {
      objectKey,
      uploadUrl: await getSignedUrl(
        this.publicClient,
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
          ContentType: contentType,
          Metadata: {
            tenantId,
            ownerId: employeeId,
            purpose: 'employee-documents',
          },
        }),
        { expiresIn: 300 },
      ),
      headers,
      expiresIn: 300,
    };
  }

  async verifyUpload(
    tenantId: string,
    employeeId: string,
    objectKey: string,
    contentType: string,
    fileSize: number,
  ) {
    this.assertOwner(tenantId, employeeId, objectKey);
    await this.assertExists(tenantId, employeeId, objectKey, {
      contentType,
      fileSize,
    });
  }

  async createDownload(
    tenantId: string,
    employeeId: string,
    objectKey: string,
  ): Promise<EmployeeDocumentDownload> {
    this.assertOwner(tenantId, employeeId, objectKey);
    await this.assertExists(tenantId, employeeId, objectKey);

    if (process.env.NODE_ENV === 'test') {
      return { url: `memory://${objectKey}`, expiresIn: 300 };
    }

    return {
      url: await getSignedUrl(
        this.publicClient,
        new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
        { expiresIn: 300 },
      ),
      expiresIn: 300,
    };
  }

  async delete(tenantId: string, employeeId: string, objectKey: string) {
    this.assertOwner(tenantId, employeeId, objectKey);
    if (process.env.NODE_ENV === 'test') {
      this.testObjects.delete(objectKey);
      return;
    }
    await this.internalClient.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
  }

  private client(endpoint?: string) {
    return new S3Client(createS3ClientConfig(endpoint));
  }

  private get bucket() {
    return requireStorageBucket('S3_PRIVATE_BUCKET');
  }

  private validate(contentType: string, fileSize: number) {
    if (
      !CONTENT_TYPES.has(contentType) ||
      fileSize < 1 ||
      fileSize > MAX_FILE_SIZE
    ) {
      throw new BadRequestException({
        code: 'EMPLOYEE_DOCUMENT_INVALID',
        message: 'Document must be PNG, JPEG, WebP, or PDF under 10 MB',
      });
    }
  }

  private key(tenantId: string, employeeId: string, filename: string) {
    const extension =
      filename
        .split('.')
        .pop()
        ?.replace(/[^a-z0-9]/gi, '')
        .toLowerCase() || 'bin';
    return `private/${tenantId}/employee-documents/${employeeId}/${randomUUID()}.${extension}`;
  }

  private assertOwner(tenantId: string, employeeId: string, objectKey: string) {
    const prefix = `private/${tenantId}/employee-documents/${employeeId}/`;
    if (!objectKey.startsWith(prefix)) {
      throw new BadRequestException({
        code: 'PRIVATE_OBJECT_KEY_INVALID',
        message: 'Private object does not belong to this employee',
      });
    }
  }

  private async assertExists(
    tenantId: string,
    employeeId: string,
    objectKey: string,
    expected?: { contentType: string; fileSize: number },
  ) {
    if (process.env.NODE_ENV === 'test') {
      const object = this.testObjects.get(objectKey);
      if (
        !object ||
        object.tenantId !== tenantId ||
        object.employeeId !== employeeId ||
        (expected &&
          (object.contentType !== expected.contentType ||
            object.fileSize !== expected.fileSize))
      ) {
        this.missing();
      }
      return;
    }

    try {
      const result = await this.internalClient.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
      if (
        result.Metadata?.tenantid !== tenantId ||
        result.Metadata?.ownerid !== employeeId ||
        result.Metadata?.purpose !== 'employee-documents' ||
        (expected &&
          (result.ContentType !== expected.contentType ||
            result.ContentLength !== expected.fileSize))
      ) {
        this.missing();
      }
    } catch {
      this.missing();
    }
  }

  private missing(): never {
    throw new NotFoundException({
      code: 'PRIVATE_OBJECT_NOT_FOUND',
      message: 'Private employee document was not found',
    });
  }
}
