import http from 'k6/http';
import { check } from 'k6';
import { config, headers, requireConfig, uuid } from './config.js';

export const options = {
  scenarios: {
    pings: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.RATE || 25),
      timeUnit: '1s',
      duration: __ENV.DURATION || '2m',
      preAllocatedVUs: 40,
      maxVUs: 200,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  requireConfig('deviceUuid', 'fieldSessionId');
}

export default function () {
  const response = http.post(
    `${config.baseUrl}/field-pings/batch`,
    JSON.stringify({
      deviceUuid: config.deviceUuid,
      items: [{
        clientPingUuid: uuid(),
        sessionId: config.fieldSessionId,
        latitude: 23.588,
        longitude: 58.382,
        accuracyM: 8,
        capturedAt: new Date().toISOString(),
      }],
    }),
    { headers: headers(), tags: { endpoint: 'field-pings' } },
  );
  check(response, { 'ping batch accepted': (result) => result.status === 201 });
}
