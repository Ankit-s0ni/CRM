import http from 'k6/http';
import { check } from 'k6';
import { config, headers, requireConfig, uuid } from './config.js';

export const options = {
  scenarios: {
    offline_replay: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: Number(__ENV.PREALLOCATED_VUS || 10),
      maxVUs: Number(__ENV.MAX_VUS || 50),
      stages: [
        { target: Number(__ENV.SYNC_REQUESTS_PER_SECOND || 10), duration: '30s' },
        { target: Number(__ENV.SYNC_REQUESTS_PER_SECOND || 10), duration: __ENV.DURATION || '2m' },
        { target: 0, duration: '15s' },
      ],
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
  const clientTime = new Date(Date.now() - 60_000);
  const eventId = uuid(0);
  const item = {
    clientEventUuid: eventId,
    type: 'CHECKIN',
    deviceUuid: config.deviceUuid,
    attestationToken: config.attestationToken,
    integrityIssuedAt: new Date(clientTime.getTime() - 30_000).toISOString(),
    integrityExpiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    clientTime: clientTime.toISOString(),
    clientClockOffsetSeconds: 0,
    latitude: 23.588,
    longitude: 58.382,
    accuracyMeters: 8,
  };
  const response = http.post(
    `${config.baseUrl}/attendance/sync`,
    JSON.stringify({ items: [item] }),
    { headers: headers(), tags: { endpoint: 'attendance-sync' } },
  );

  check(response, {
    'sync request accepted': (result) => result.status === 201,
    'sync outcome is stable': (result) => {
      const outcome = result.json()?.data?.[0];
      return (
        outcome?.clientEventUuid === eventId &&
        ['ACCEPTED', 'DUPLICATE', 'RETRYABLE', 'REJECTED'].includes(
          outcome?.status,
        )
      );
    },
  });
}
