import http from 'k6/http';
import { check } from 'k6';
import { config, headers, uuid } from './config.js';

export const options = profile(20, 200, 500);
const punchStatuses = http.expectedStatuses(200, 201, 409);

export default function () {
  const response = http.post(
    `${config.baseUrl}/attendance/check-in`,
    JSON.stringify({ requestId: uuid() }),
    {
      headers: headers(),
      tags: { endpoint: 'attendance-punch' },
      responseCallback: punchStatuses,
    },
  );
  check(response, {
    'punch is accepted or safely deduplicated': (result) =>
      [200, 201, 409].includes(result.status),
  });
}

function profile(rate, p95, p99) {
  return {
    scenarios: {
      punch: {
        executor: 'constant-arrival-rate',
        rate: Number(__ENV.RATE || rate),
        timeUnit: '1s',
        duration: __ENV.DURATION || '2m',
        preAllocatedVUs: Number(__ENV.PREALLOCATED_VUS || 30),
        maxVUs: Number(__ENV.MAX_VUS || 150),
      },
    },
    thresholds: {
      http_req_failed: ['rate<0.01'],
      http_req_duration: [`p(95)<${p95}`, `p(99)<${p99}`],
      checks: ['rate>0.99'],
    },
  };
}
