import {
  canEnforceBiometrics,
  mobileReleasePolicy,
  validateProductionRuntimeConfiguration,
} from './production-runtime-config';

const productionEnvironment = {
  NODE_ENV: 'production',
  JWT_SECRET: 'access-secret-from-secret-manager',
  JWT_REFRESH_SECRET: 'refresh-secret-from-secret-manager',
  S3_ENDPOINT: 'https://objects.example.com',
  S3_PRIVATE_BUCKET: 'hrms-private-gulf-1',
  S3_ACCESS_KEY: 'storage-access-key',
  S3_SECRET_KEY: 'storage-secret-key',
  MOBILE_MINIMUM_VERSION: '1.4.0',
  MOBILE_RECOMMENDED_VERSION: '1.6.0',
  MOBILE_ANDROID_UPDATE_URL:
    'https://play.google.com/store/apps/details?id=com.deltcrm.employee',
  MOBILE_IOS_UPDATE_URL: 'https://apps.apple.com/app/deltcrm/id000000000',
  SENTRY_DSN: 'https://public@example.ingest.sentry.io/1',
  OTEL_EXPORTER_OTLP_ENDPOINT: 'https://otel.example.com/v1/traces',
  OTEL_SERVICE_NAME: 'deltcrm-api',
  RELEASE_VERSION: '1.0.0',
  OBSERVABILITY_ALERT_WEBHOOK_URL: 'https://alerts.example.com/hooks/deltcrm',
  EMAIL_GATEWAY_URL: 'https://notifications.example.com/email/send',
  EMAIL_GATEWAY_TOKEN: 'email-gateway-secret',
  RAZORPAY_CHARGE_URL: 'https://payments.example.com/razorpay/charges',
  RAZORPAY_HEALTH_URL: 'https://payments.example.com/razorpay/health',
  RAZORPAY_API_KEY: 'razorpay-api-secret',
  RAZORPAY_WEBHOOK_SECRET: 'razorpay-webhook-secret',
};

describe('production runtime configuration', () => {
  it('does not constrain local and test environments', () => {
    expect(() =>
      validateProductionRuntimeConfiguration({ NODE_ENV: 'test' }),
    ).not.toThrow();
  });

  it('requires private encrypted-object-store configuration in production', () => {
    expect(() =>
      validateProductionRuntimeConfiguration({
        ...productionEnvironment,
        S3_ENDPOINT: 'http://localhost:9000',
        S3_PRIVATE_BUCKET: '',
        S3_SECRET_KEY: 'minioadmin',
      }),
    ).toThrow(
      'S3_ENDPOINT must be an HTTPS URL; S3_PRIVATE_BUCKET must be configured; S3_SECRET_KEY must be a non-placeholder secret',
    );
  });

  it('requires a real integrity gateway before attestation enforcement is enabled', () => {
    expect(() =>
      validateProductionRuntimeConfiguration({
        ...productionEnvironment,
        DEVICE_INTEGRITY_ENFORCEMENT_ENABLED: 'true',
        DEVICE_INTEGRITY_PROVIDER_URL: 'https://integrity.example.com/verify',
        DEVICE_INTEGRITY_PROVIDER_TOKEN: 'replace-with-secret-manager-value',
      }),
    ).toThrow(
      'DEVICE_INTEGRITY_PROVIDER_TOKEN must be a non-placeholder secret',
    );

    expect(() =>
      validateProductionRuntimeConfiguration({
        ...productionEnvironment,
        DEVICE_INTEGRITY_ENFORCEMENT_ENABLED: 'true',
        DEVICE_INTEGRITY_PROVIDER_URL: 'https://integrity.example.com/verify',
        DEVICE_INTEGRITY_PROVIDER_TOKEN: 'integrity-gateway-secret',
      }),
    ).not.toThrow();
  });

  it('requires both server-side biometric gateways before biometric enforcement is enabled', () => {
    expect(() =>
      validateProductionRuntimeConfiguration({
        ...productionEnvironment,
        BIOMETRICS_ENFORCEMENT_ENABLED: 'true',
      }),
    ).toThrow(
      'FACE_LIVENESS_PROVIDER_URL must be an HTTPS URL; FACE_LIVENESS_PROVIDER_TOKEN must be a non-placeholder secret; FACE_MATCH_PROVIDER_URL must be an HTTPS URL; FACE_MATCH_PROVIDER_TOKEN must be a non-placeholder secret',
    );
    expect(canEnforceBiometrics({ NODE_ENV: 'production' })).toBe(false);
    expect(
      canEnforceBiometrics({
        NODE_ENV: 'production',
        BIOMETRICS_ENFORCEMENT_ENABLED: 'true',
      }),
    ).toBe(true);
  });

  it('requires a valid mobile release policy and exposes safe local defaults', () => {
    expect(() =>
      validateProductionRuntimeConfiguration({
        ...productionEnvironment,
        MOBILE_MINIMUM_VERSION: 'latest',
        MOBILE_ANDROID_UPDATE_URL: 'http://downloads.example.com/app',
      }),
    ).toThrow(
      'MOBILE_MINIMUM_VERSION must be a semantic version; MOBILE_ANDROID_UPDATE_URL must be an HTTPS URL',
    );
    expect(mobileReleasePolicy({ NODE_ENV: 'test' })).toEqual({
      minimumVersion: '1.0.0',
      recommendedVersion: '1.0.0',
      androidUpdateUrl: null,
      iosUpdateUrl: null,
    });
  });

  it('requires production error reporting, tracing, release, and alert routing', () => {
    expect(() =>
      validateProductionRuntimeConfiguration({
        ...productionEnvironment,
        SENTRY_DSN: '',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4318/v1/traces',
        OTEL_SERVICE_NAME: '',
        RELEASE_VERSION: '',
        OBSERVABILITY_ALERT_WEBHOOK_URL: '',
      }),
    ).toThrow(
      'SENTRY_DSN must be an HTTPS URL; OTEL_EXPORTER_OTLP_ENDPOINT must be an HTTPS URL; OTEL_SERVICE_NAME must be configured; RELEASE_VERSION must be configured; OBSERVABILITY_ALERT_WEBHOOK_URL must be an HTTPS URL',
    );
  });

  it('requires the primary billing provider and any enabled secondary provider', () => {
    expect(() =>
      validateProductionRuntimeConfiguration({
        ...productionEnvironment,
        RAZORPAY_API_KEY: '',
        RAZORPAY_WEBHOOK_SECRET: '',
      }),
    ).toThrow(
      'RAZORPAY_API_KEY must be a non-placeholder secret; RAZORPAY_WEBHOOK_SECRET must be a non-placeholder secret',
    );
    expect(() =>
      validateProductionRuntimeConfiguration({
        ...productionEnvironment,
        STRIPE_ENABLED: 'true',
      }),
    ).toThrow(
      'STRIPE_CHARGE_URL must be an HTTPS URL; STRIPE_HEALTH_URL must be an HTTPS URL; STRIPE_API_KEY must be a non-placeholder secret; STRIPE_WEBHOOK_SECRET must be a non-placeholder secret',
    );
  });
});
