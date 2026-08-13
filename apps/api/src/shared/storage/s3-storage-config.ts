import type { S3ClientConfig } from '@aws-sdk/client-s3';

export function requireStorageBucket(name: 'S3_BUCKET' | 'S3_PRIVATE_BUCKET') {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be configured before using object storage`);
  }
  return value;
}

export function createS3ClientConfig(endpoint?: string): S3ClientConfig {
  const accessKeyId = process.env.S3_ACCESS_KEY?.trim();
  const secretAccessKey = process.env.S3_SECRET_KEY?.trim();

  if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
    throw new Error(
      'S3_ACCESS_KEY and S3_SECRET_KEY must be configured together',
    );
  }

  return {
    // Presigned PUT clients do not know the body while signing. The SDK's
    // WHEN_SUPPORTED default signs a CRC32 for an empty body, which makes S3
    // compatible stores reject the real browser upload.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    ...(endpoint ? { endpoint } : {}),
    ...(process.env.S3_REGION?.trim()
      ? { region: process.env.S3_REGION.trim() }
      : {}),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  };
}
