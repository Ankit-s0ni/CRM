const PLACEHOLDER_VALUES = new Set([
  'replace-with-secret-manager-value',
  'replace-with-a-long-random-access-secret',
  'replace-with-a-long-random-refresh-secret',
  'minioadmin',
  'replace-me',
]);

type RuntimeEnvironment = NodeJS.ProcessEnv;

export function validateProductionRuntimeConfiguration(
  environment: RuntimeEnvironment = process.env,
) {
  if (environment.NODE_ENV !== 'production') return;

  const errors: string[] = [];
  requireSecret(errors, environment, 'JWT_SECRET');
  requireSecret(errors, environment, 'JWT_REFRESH_SECRET');
  requireHttpsUrl(errors, environment, 'S3_ENDPOINT');
  requireValue(errors, environment, 'S3_PRIVATE_BUCKET');
  requireSecret(errors, environment, 'S3_ACCESS_KEY');
  requireSecret(errors, environment, 'S3_SECRET_KEY');
  requireSemver(errors, environment, 'MOBILE_MINIMUM_VERSION');
  requireSemver(errors, environment, 'MOBILE_RECOMMENDED_VERSION');
  requireHttpsUrl(errors, environment, 'MOBILE_ANDROID_UPDATE_URL');
  requireHttpsUrl(errors, environment, 'MOBILE_IOS_UPDATE_URL');
  requireHttpsUrl(errors, environment, 'SENTRY_DSN');
  requireHttpsUrl(errors, environment, 'OTEL_EXPORTER_OTLP_ENDPOINT');
  requireValue(errors, environment, 'OTEL_SERVICE_NAME');
  requireValue(errors, environment, 'RELEASE_VERSION');
  requireHttpsUrl(errors, environment, 'OBSERVABILITY_ALERT_WEBHOOK_URL');
  requireHttpsUrl(errors, environment, 'EMAIL_GATEWAY_URL');
  requireSecret(errors, environment, 'EMAIL_GATEWAY_TOKEN');
  requireHttpsUrl(errors, environment, 'RAZORPAY_CHARGE_URL');
  requireHttpsUrl(errors, environment, 'RAZORPAY_HEALTH_URL');
  requireSecret(errors, environment, 'RAZORPAY_API_KEY');
  requireSecret(errors, environment, 'RAZORPAY_WEBHOOK_SECRET');

  if (environment.STRIPE_ENABLED === 'true') {
    requireHttpsUrl(errors, environment, 'STRIPE_CHARGE_URL');
    requireHttpsUrl(errors, environment, 'STRIPE_HEALTH_URL');
    requireSecret(errors, environment, 'STRIPE_API_KEY');
    requireSecret(errors, environment, 'STRIPE_WEBHOOK_SECRET');
  }

  if (environment.DEVICE_INTEGRITY_ENFORCEMENT_ENABLED === 'true') {
    requireHttpsUrl(errors, environment, 'DEVICE_INTEGRITY_PROVIDER_URL');
    requireSecret(errors, environment, 'DEVICE_INTEGRITY_PROVIDER_TOKEN');
  }

  if (environment.BIOMETRICS_ENFORCEMENT_ENABLED === 'true') {
    requireHttpsUrl(errors, environment, 'FACE_LIVENESS_PROVIDER_URL');
    requireSecret(errors, environment, 'FACE_LIVENESS_PROVIDER_TOKEN');
    requireHttpsUrl(errors, environment, 'FACE_MATCH_PROVIDER_URL');
    requireSecret(errors, environment, 'FACE_MATCH_PROVIDER_TOKEN');
  }

  if (errors.length) {
    throw new Error(
      `Invalid production runtime configuration: ${errors.join('; ')}`,
    );
  }
}

export function mobileReleasePolicy(
  environment: RuntimeEnvironment = process.env,
) {
  const minimumVersion = environment.MOBILE_MINIMUM_VERSION?.trim() || '1.0.0';
  return {
    minimumVersion,
    recommendedVersion:
      environment.MOBILE_RECOMMENDED_VERSION?.trim() || minimumVersion,
    androidUpdateUrl: environment.MOBILE_ANDROID_UPDATE_URL?.trim() || null,
    iosUpdateUrl: environment.MOBILE_IOS_UPDATE_URL?.trim() || null,
  };
}

export function canEnforceBiometrics(
  environment: RuntimeEnvironment = process.env,
) {
  return (
    environment.NODE_ENV !== 'production' ||
    environment.BIOMETRICS_ENFORCEMENT_ENABLED === 'true'
  );
}

function requireValue(
  errors: string[],
  environment: RuntimeEnvironment,
  name: string,
) {
  if (!environment[name]?.trim()) errors.push(`${name} must be configured`);
}

function requireSecret(
  errors: string[],
  environment: RuntimeEnvironment,
  name: string,
) {
  const value = environment[name]?.trim();
  if (!value || PLACEHOLDER_VALUES.has(value.toLowerCase())) {
    errors.push(`${name} must be a non-placeholder secret`);
  }
}

function requireHttpsUrl(
  errors: string[],
  environment: RuntimeEnvironment,
  name: string,
) {
  const value = environment[name]?.trim();
  if (!value?.startsWith('https://')) {
    errors.push(`${name} must be an HTTPS URL`);
  }
}

function requireSemver(
  errors: string[],
  environment: RuntimeEnvironment,
  name: string,
) {
  const value = environment[name]?.trim();
  if (!value || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value)) {
    errors.push(`${name} must be a semantic version`);
  }
}
