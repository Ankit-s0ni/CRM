import { fail } from 'k6';

export const config = Object.freeze({
  baseUrl: (__ENV.BASE_URL || 'http://127.0.0.1:4001').replace(/\/$/, ''),
  accessToken: required('ACCESS_TOKEN'),
  tenantId: required('TENANT_ID'),
  deviceUuid: __ENV.DEVICE_UUID || '',
  attestationToken: __ENV.ATTESTATION_TOKEN || '',
  fieldSessionId: __ENV.FIELD_SESSION_ID || '',
});

export function headers() {
  return {
    Authorization: `Bearer ${config.accessToken}`,
    'Content-Type': 'application/json',
    'x-tenant-id': config.tenantId,
  };
}

export function requireConfig(...keys) {
  for (const key of keys) {
    if (!config[key]) fail(`Missing required configuration: ${key}`);
  }
}

export function uuid(sequence = 0) {
  const seed = `${Date.now().toString(16)}${Number(__VU).toString(16)}${Number(__ITER).toString(16)}${sequence.toString(16)}`
    .padEnd(32, '0')
    .slice(0, 32);
  return `${seed.slice(0, 8)}-${seed.slice(8, 12)}-4${seed.slice(13, 16)}-8${seed.slice(17, 20)}-${seed.slice(20)}`;
}

function required(name) {
  const value = __ENV[name];
  if (!value) fail(`Missing required environment variable ${name}`);
  return value;
}
