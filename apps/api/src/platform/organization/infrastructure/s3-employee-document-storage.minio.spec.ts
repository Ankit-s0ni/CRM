import { randomUUID } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import { S3EmployeeDocumentStorage } from './s3-employee-document-storage';

const describeMinio =
  process.env.RUN_MINIO_INTEGRATION === 'true' ? describe : describe.skip;

describeMinio('S3EmployeeDocumentStorage MinIO integration', () => {
  const originalEnvironment = {
    NODE_ENV: process.env.NODE_ENV,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_PUBLIC_ENDPOINT: process.env.S3_PUBLIC_ENDPOINT,
    S3_REGION: process.env.S3_REGION,
    S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY,
    S3_PRIVATE_BUCKET: process.env.S3_PRIVATE_BUCKET,
  };

  beforeAll(() => {
    process.env.NODE_ENV = 'development';
    process.env.S3_ENDPOINT = 'http://localhost:9000';
    process.env.S3_PUBLIC_ENDPOINT = 'http://localhost:9000';
    process.env.S3_REGION = 'us-east-1';
    process.env.S3_FORCE_PATH_STYLE = 'true';
    process.env.S3_ACCESS_KEY = 'minioadmin';
    process.env.S3_SECRET_KEY = 'minioadmin';
    process.env.S3_PRIVATE_BUCKET = 'hrms-private';
  });

  afterAll(() => {
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('uploads, verifies, downloads, and deletes a private object', async () => {
    const storage = new S3EmployeeDocumentStorage();
    const tenantId = `tenant-${randomUUID()}`;
    const employeeId = `employee-${randomUUID()}`;
    const body = Buffer.from('%PDF-1.4\nDeltCRM employee document test\n');
    const upload = await storage.createUpload(
      tenantId,
      employeeId,
      'contract.pdf',
      'application/pdf',
      body.length,
    );

    const preflight = await fetch(upload.uploadUrl, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:4002',
        'Access-Control-Request-Method': 'PUT',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    expect(preflight.ok).toBe(true);
    expect(preflight.headers.get('access-control-allow-origin')).toBe(
      'http://localhost:4002',
    );

    const put = await fetch(upload.uploadUrl, {
      method: 'PUT',
      headers: upload.headers,
      body,
    });
    expect(put.ok).toBe(true);

    await storage.verifyUpload(
      tenantId,
      employeeId,
      upload.objectKey,
      'application/pdf',
      body.length,
    );

    const download = await storage.createDownload(
      tenantId,
      employeeId,
      upload.objectKey,
    );
    const downloaded = await fetch(download.url);
    expect(downloaded.ok).toBe(true);
    expect(Buffer.from(await downloaded.arrayBuffer())).toEqual(body);

    await storage.delete(tenantId, employeeId, upload.objectKey);
    await expect(
      storage.createDownload(tenantId, employeeId, upload.objectKey),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
