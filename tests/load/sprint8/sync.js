import http from 'k6/http';
import { check } from 'k6';
import { config, headers, requireConfig, uuid } from './config.js';

export const options = {
  scenarios: {
    sync: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.RATE || 10),
      timeUnit: '1s',
      duration: __ENV.DURATION || '2m',
      preAllocatedVUs: 20,
      maxVUs: 100,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  requireConfig('deviceUuid', 'attestationToken');
}

export default function () {
  const clientEventUuid = uuid();
  const now = new Date();
  const response = http.post(
    `${config.baseUrl}/attendance/sync`,
    JSON.stringify({
      items: [{
        clientEventUuid,
        type: 'CHECKIN',
        deviceUuid: config.deviceUuid,
        attestationToken: config.attestationToken,
        integrityIssuedAt: new Date(now.getTime() - 30_000).toISOString(),
        integrityExpiresAt: new Date(now.getTime() + 300_000).toISOString(),
        clientTime: now.toISOString(),
        clientClockOffsetSeconds: 0,
        latitude: 23.588,
        longitude: 58.382,
        accuracyMeters: 8,
      }],
    }),
    { headers: headers(), tags: { endpoint: 'attendance-sync' } },
  );
  check(response, {
    'sync returns a stable outcome': (result) =>
      result.status === 201 && result.json()?.data?.[0]?.clientEventUuid === clientEventUuid,
  });
}
