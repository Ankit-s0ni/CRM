import http from 'k6/http';
import { check, sleep } from 'k6';
import { config, headers } from './config.js';

export const options = {
  vus: Number(__ENV.VUS || 30),
  duration: __ENV.DURATION || '2m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<750', 'p(99)<1500'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const response = http.get(`${config.baseUrl}/field/employees/live`, {
    headers: headers(),
    tags: { endpoint: 'field-live-board' },
  });
  check(response, { 'live board available': (result) => result.status === 200 });
  sleep(Number(__ENV.POLL_SECONDS || 5));
}
