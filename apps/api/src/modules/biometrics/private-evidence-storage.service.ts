import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  HeadBucketCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class PrivateEvidenceStorageService {
  private readonly issuedTestKeys = new Set<string>();
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

  async presign(
    tenantId: string,
    employeeId: string,
    filename: string,
    contentType: string,
    fileSize: number,
  ) {
    return this.presignFor(
      tenantId,
      employeeId,
      'biometrics',
      filename,
      contentType,
      fileSize,
    );
  }

  async presignPunch(
    tenantId: string,
    employeeId: string,
    filename: string,
    contentType: string,
    fileSize: number,
  ) {
    return this.presignFor(
      tenantId,
      employeeId,
      'punches',
      filename,
      contentType,
      fileSize,
    );
  }

  verifyPunchObject(tenantId: string, employeeId: string, objectKey: string) {
    return this.verifyObject(tenantId, employeeId, 'punches', objectKey);
  }

  async signedRead(tenantId: string, employeeId: string, objectKey: string) {
    await this.verifyPunchObject(tenantId, employeeId, objectKey);
    if (process.env.NODE_ENV === 'test') {
      return { url: `memory://${objectKey}`, expiresIn: 60 };
    }
    return {
      url: await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
        { expiresIn: 60 },
      ),
      expiresIn: 60,
    };
  }

  private async presignFor(
    tenantId: string,
    employeeId: string,
    folder: 'biometrics' | 'punches',
    filename: string,
    contentType: string,
    fileSize: number,
  ) {
    if (!IMAGE_TYPES.has(contentType) || fileSize > 5_000_000) {
      throw new BadRequestException({
        code: 'ENROLLMENT_FILE_INVALID',
        message: 'Enrollment evidence must be PNG, JPEG, or WebP under 5 MB',
      });
    }
    const extension =
      filename
        .split('.')
        .pop()
        ?.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const basename =
      filename
        .replace(/\.[^.]+$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'evidence';
    const objectKey = `private/${tenantId}/${folder}/${employeeId}/${basename}-${randomUUID()}.${extension}`;
    if (process.env.NODE_ENV === 'test') {
      this.issuedTestKeys.add(objectKey);
      return { objectKey, uploadUrl: `memory://${objectKey}`, expiresIn: 300 };
    }
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ContentType: contentType,
        ContentLength: fileSize,
        Metadata: { tenantId, employeeId, purpose: folder },
      }),
      { expiresIn: 300 },
    );
    return { objectKey, uploadUrl, expiresIn: 300 };
  }

  async verifyOwnedObject(
    tenantId: string,
    employeeId: string,
    objectKey: string,
  ) {
    return this.verifyObject(tenantId, employeeId, 'biometrics', objectKey);
  }

  async deleteEnrollmentObject(
    tenantId: string,
    employeeId: string,
    objectKey: string,
  ) {
    const expectedPrefix = `private/${tenantId}/biometrics/${employeeId}/`;
    if (!objectKey.startsWith(expectedPrefix)) {
      throw new BadRequestException({
        code: 'EVIDENCE_KEY_INVALID',
        message: 'Enrollment evidence does not belong to this employee',
      });
    }
    if (process.env.NODE_ENV === 'test') {
      this.issuedTestKeys.delete(objectKey);
      return;
    }
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
  }

  private async verifyObject(
    tenantId: string,
    employeeId: string,
    folder: 'biometrics' | 'punches',
    objectKey: string,
  ) {
    const expectedPrefix = `private/${tenantId}/${folder}/${employeeId}/`;
    if (!objectKey.startsWith(expectedPrefix)) {
      throw new BadRequestException({
        code: 'EVIDENCE_KEY_INVALID',
        message: 'Enrollment evidence does not belong to this employee',
      });
    }
    if (process.env.NODE_ENV === 'test') {
      if (!this.issuedTestKeys.has(objectKey)) this.throwMissing();
      return;
    }
    try {
      const head = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
      if (
        head.Metadata?.tenantid !== tenantId ||
        head.Metadata?.employeeid !== employeeId
      ) {
        throw new Error('metadata mismatch');
      }
    } catch {
      this.throwMissing();
    }
  }

  private throwMissing(): never {
    throw new NotFoundException({
      code: 'ENROLLMENT_EVIDENCE_NOT_FOUND',
      message: 'Enrollment evidence was not found in private storage',
    });
  }
}
