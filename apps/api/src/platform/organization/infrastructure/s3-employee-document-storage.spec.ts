import { BadRequestException, NotFoundException } from '@nestjs/common';
import { S3EmployeeDocumentStorage } from './s3-employee-document-storage';

describe('S3EmployeeDocumentStorage', () => {
  const previousNodeEnv = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env.NODE_ENV = previousNodeEnv;
  });

  it('owns the complete private document lifecycle', async () => {
    const storage = new S3EmployeeDocumentStorage();
    const upload = await storage.createUpload(
      'tenant-1',
      'employee-1',
      'Contract Final.PDF',
      'application/pdf',
      512,
    );

    expect(upload).toMatchObject({
      uploadUrl: `memory://${upload.objectKey}`,
      headers: {
        'Content-Type': 'application/pdf',
      },
      expiresIn: 300,
    });
    expect(upload.objectKey).toMatch(
      /^private\/tenant-1\/employee-documents\/employee-1\/.+\.pdf$/,
    );

    await expect(
      storage.verifyUpload(
        'tenant-1',
        'employee-1',
        upload.objectKey,
        'application/pdf',
        512,
      ),
    ).resolves.toBeUndefined();
    await expect(
      storage.createDownload('tenant-1', 'employee-1', upload.objectKey),
    ).resolves.toEqual({
      url: `memory://${upload.objectKey}`,
      expiresIn: 300,
    });

    await storage.delete('tenant-1', 'employee-1', upload.objectKey);
    await expect(
      storage.verifyUpload(
        'tenant-1',
        'employee-1',
        upload.objectKey,
        'application/pdf',
        512,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects registration metadata that does not match the upload', async () => {
    const storage = new S3EmployeeDocumentStorage();
    const upload = await storage.createUpload(
      'tenant-1',
      'employee-1',
      'contract.pdf',
      'application/pdf',
      512,
    );

    await expect(
      storage.verifyUpload(
        'tenant-1',
        'employee-1',
        upload.objectKey,
        'application/pdf',
        513,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects unsupported, empty, and oversized files', async () => {
    const storage = new S3EmployeeDocumentStorage();

    await expect(
      storage.createUpload(
        'tenant-1',
        'employee-1',
        'script.exe',
        'application/octet-stream',
        512,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      storage.createUpload(
        'tenant-1',
        'employee-1',
        'empty.pdf',
        'application/pdf',
        0,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      storage.createUpload(
        'tenant-1',
        'employee-1',
        'large.pdf',
        'application/pdf',
        10_000_001,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents cross-tenant and cross-employee object access', async () => {
    const storage = new S3EmployeeDocumentStorage();
    const upload = await storage.createUpload(
      'tenant-1',
      'employee-1',
      'contract.pdf',
      'application/pdf',
      512,
    );

    await expect(
      storage.createDownload('tenant-2', 'employee-1', upload.objectKey),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      storage.createDownload('tenant-1', 'employee-2', upload.objectKey),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
