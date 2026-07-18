import http from 'k6/http';
import { check } from 'k6';
import { config, headers, requireConfig, uuid } from './config.js';

export const options = {
  scenarios: {
    bounded_ingestion: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.PING_BATCHES_PER_SECOND || 10),
      timeUnit: '1s',
      duration: __ENV.DURATION || '2m',
      preAllocatedVUs: Number(__ENV.PREALLOCATED_VUS || 20),
      maxVUs: Number(__ENV.MAX_VUS || 100),
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<750', 'p(99)<1500'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  requireConfig('fieldSessionId');
}

export default function () {
  const batchSize = Math.min(100, Math.max(1, Number(__ENV.BATCH_SIZE || 20)));
  const capturedAt = Date.now() - batchSize * 1000;
  const items = Array.from({ length: batchSize }, (_, index) => ({
    clientPingUuid: uuid(index),
    sessionId: config.fieldSessionId,
    latitude: 23.588 + index * 0.000001,
    longitude: 58.382 + index * 0.000001,
    accuracyM: 8,
    speedMps: 2,
    batteryLevel: 80,
    capturedAt: new Date(capturedAt + index * 1000).toISOString(),
    isOfflineSync: false,
  }));
  const response = http.post(
    `${config.baseUrl}/field-pings/batch`,
    JSON.stringify({ items }),
    { headers: headers(), tags: { endpoint: 'field-pings-batch' } },
  );

  check(response, {
    'ping batch accepted': (result) => result.status === 201,
    'ordered per-item outcomes returned': (result) => {
      const body = result.json();
      return Array.isArray(body?.data) && body.data.length === batchSize;
    },
  });
}
