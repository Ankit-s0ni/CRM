import http from 'k6/http';
import { check } from 'k6';
import { config, headers } from './config.js';

export const options = {
  scenarios: {
    reports: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.RATE || 2),
      timeUnit: '1s',
      duration: __ENV.DURATION || '2m',
      preAllocatedVUs: 5,
      maxVUs: 25,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<750', 'p(99)<1500'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const period = __ENV.REPORT_PERIOD || new Date().toISOString().slice(0, 7);
  const response = http.post(
    `${config.baseUrl}/reports/muster`,
    JSON.stringify({ period, format: 'CSV' }),
    { headers: headers(), tags: { endpoint: 'report-create' } },
  );
  check(response, { 'report queued': (result) => result.status === 201 });
}
