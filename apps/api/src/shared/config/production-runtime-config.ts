const PLACEHOLDER_VALUES = new Set([
  'replace-with-secret-manager-value',
  'replace-with-a-long-random-access-secret',
  'replace-with-a-long-random-refresh-secret',
  'replace-with-pkcs8-private-key',
  'replace-with-spki-public-key',
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
  optionalHttpsUrl(errors, environment, 'S3_ENDPOINT');
  optionalHttpsUrl(errors, environment, 'S3_PUBLIC_ENDPOINT');
  requireValue(errors, environment, 'S3_PRIVATE_BUCKET');
  requireSecret(errors, environment, 'S3_ACCESS_KEY');
  requireSecret(errors, environment, 'S3_SECRET_KEY');
  optionalSemver(errors, environment, 'MOBILE_MINIMUM_VERSION');
  optionalSemver(errors, environment, 'MOBILE_RECOMMENDED_VERSION');
  optionalHttpsUrl(errors, environment, 'MOBILE_ANDROID_UPDATE_URL');
  optionalHttpsUrl(errors, environment, 'MOBILE_IOS_UPDATE_URL');
  requireValue(errors, environment, 'MAIL_PROVIDER');
  requireValue(errors, environment, 'MAIL_FROM_ADDRESS');
  requireValue(errors, environment, 'MAIL_FROM_NAME');
  requireValue(errors, environment, 'PUBLIC_BASE_DOMAIN');
  requireCsrfCookieDomain(errors, environment);
  requireHttpsUrl(errors, environment, 'PRODUCT_TOKEN_ISSUER');
  requireValue(errors, environment, 'PRODUCT_TOKEN_KEY_ID');
  requireSecret(errors, environment, 'PRODUCT_TOKEN_PRIVATE_KEY');
  requireSecret(errors, environment, 'PRODUCT_TOKEN_PUBLIC_KEY');
  requireProductServiceCredentials(errors, environment);
  if (environment.MAIL_PROVIDER === 'smtp') {
    requireValue(errors, environment, 'SMTP_HOST');
    requirePort(errors, environment, 'SMTP_PORT');
    requireValue(errors, environment, 'SMTP_USERNAME');
    requireSecret(errors, environment, 'SMTP_PASSWORD');
    if (environment.SMTP_REQUIRE_TLS !== 'true') {
      errors.push('SMTP_REQUIRE_TLS must be true in production');
    }
  } else {
    requireHttpsUrl(errors, environment, 'EMAIL_GATEWAY_URL');
    requireSecret(errors, environment, 'EMAIL_GATEWAY_TOKEN');
  }
  if (environment.OBSERVABILITY_ENABLED === 'true') {
    requireHttpsUrl(errors, environment, 'SENTRY_DSN');
    requireHttpsUrl(errors, environment, 'OTEL_EXPORTER_OTLP_ENDPOINT');
    requireValue(errors, environment, 'OTEL_SERVICE_NAME');
    requireValue(errors, environment, 'RELEASE_VERSION');
    requireHttpsUrl(errors, environment, 'OBSERVABILITY_ALERT_WEBHOOK_URL');
  }

  if (environment.RAZORPAY_ENABLED === 'true') {
    requireHttpsUrl(errors, environment, 'RAZORPAY_CHARGE_URL');
    requireHttpsUrl(errors, environment, 'RAZORPAY_HEALTH_URL');
    requireSecret(errors, environment, 'RAZORPAY_API_KEY');
    requireSecret(errors, environment, 'RAZORPAY_WEBHOOK_SECRET');
  }

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

function optionalHttpsUrl(
  errors: string[],
  environment: RuntimeEnvironment,
  name: string,
) {
  if (environment[name]?.trim()) requireHttpsUrl(errors, environment, name);
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

function optionalSemver(
  errors: string[],
  environment: RuntimeEnvironment,
  name: string,
) {
  if (environment[name]?.trim()) requireSemver(errors, environment, name);
}

function requirePort(
  errors: string[],
  environment: RuntimeEnvironment,
  name: string,
) {
  const port = Number(environment[name]);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    errors.push(`${name} must be a valid TCP port`);
  }
}

function requireCsrfCookieDomain(
  errors: string[],
  environment: RuntimeEnvironment,
) {
  const baseDomain = environment.PUBLIC_BASE_DOMAIN?.trim().replace(/^\./, '');
  const cookieDomain = environment.AUTH_CSRF_COOKIE_DOMAIN?.trim();
  if (!baseDomain || cookieDomain !== `.${baseDomain}`) {
    errors.push(
      'AUTH_CSRF_COOKIE_DOMAIN must match PUBLIC_BASE_DOMAIN with a leading dot',
    );
  }
}

function requireProductServiceCredentials(
  errors: string[],
  environment: RuntimeEnvironment,
) {
  const configured = environment.PRODUCT_SERVICE_CREDENTIALS_JSON?.trim();
  if (!configured) {
    errors.push('PRODUCT_SERVICE_CREDENTIALS_JSON must be configured');
    return;
  }

  try {
    const credentials = JSON.parse(configured) as Record<string, unknown>;
    const hrmsKeys = credentials.HRMS;
    if (
      !Array.isArray(hrmsKeys) ||
      hrmsKeys.length === 0 ||
      hrmsKeys.some(
        (key) =>
          typeof key !== 'string' ||
          key.trim().length < 32 ||
          PLACEHOLDER_VALUES.has(key.trim().toLowerCase()),
      )
    ) {
      errors.push(
        'PRODUCT_SERVICE_CREDENTIALS_JSON must contain non-placeholder HRMS keys of at least 32 characters',
      );
    }
  } catch {
    errors.push('PRODUCT_SERVICE_CREDENTIALS_JSON must be valid JSON');
  }
}
