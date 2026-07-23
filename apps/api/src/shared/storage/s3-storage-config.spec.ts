import {
  createS3ClientConfig,
  requireStorageBucket,
} from './s3-storage-config';

describe('S3 storage configuration', () => {
  const originalEnvironment = {
    S3_BUCKET: process.env.S3_BUCKET,
    S3_PRIVATE_BUCKET: process.env.S3_PRIVATE_BUCKET,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY,
  };

  afterEach(() => {
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });

  it('rejects a missing bucket instead of silently choosing one', () => {
    delete process.env.S3_PRIVATE_BUCKET;

    expect(() => requireStorageBucket('S3_PRIVATE_BUCKET')).toThrow(
      'S3_PRIVATE_BUCKET must be configured',
    );
  });

  it('rejects partial explicit credentials', () => {
    process.env.S3_ACCESS_KEY = 'access-key';
    delete process.env.S3_SECRET_KEY;

    expect(() => createS3ClientConfig()).toThrow(
      'S3_ACCESS_KEY and S3_SECRET_KEY must be configured together',
    );
  });

  it('uses the AWS credential provider chain when keys are not configured', () => {
    delete process.env.S3_ACCESS_KEY;
    delete process.env.S3_SECRET_KEY;

    expect(createS3ClientConfig()).not.toHaveProperty('credentials');
  });
});
