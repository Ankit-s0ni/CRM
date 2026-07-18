import { fail } from 'k6';

export const config = Object.freeze({
  baseUrl: (__ENV.BASE_URL || 'http://127.0.0.1:4001').replace(/\/$/, ''),
  accessToken: required('ACCESS_TOKEN'),
  tenantId: required('TENANT_ID'),
  fieldSessionId: __ENV.FIELD_SESSION_ID || '',
  deviceUuid: __ENV.DEVICE_UUID || '',
  attestationToken: __ENV.ATTESTATION_TOKEN || '',
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
    if (!config[key]) fail(`Missing required environment variable ${toEnv(key)}`);
  }
}

export function uuid(sequence = 0) {
  const time = Date.now().toString(16).padStart(12, '0').slice(-12);
  const vu = Number(__VU).toString(16).padStart(4, '0').slice(-4);
  const iteration = Number(__ITER)
    .toString(16)
    .padStart(8, '0')
    .slice(-8);
  const tail = (Number(sequence) + Number(__VU) * 1000 + Number(__ITER))
    .toString(16)
    .padStart(12, '0')
    .slice(-12);
  return `${time.slice(0, 8)}-${time.slice(8)}-4${vu.slice(1)}-8${iteration.slice(1, 4)}-${tail}`;
}

function required(name) {
  const value = __ENV[name];
  if (!value) fail(`Missing required environment variable ${name}`);
  return value;
}

function toEnv(value) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase();
}
