import sse from 'k6/x/sse';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { config, headers } from './config.js';

const locationEvents = new Counter('sse_location_events');
const reconnectLatency = new Trend('sse_reconnect_latency', true);

export const options = {
  scenarios: {
    live_fanout: {
      executor: 'constant-vus',
      vus: Number(__ENV.SSE_CONNECTIONS || 100),
      duration: __ENV.DURATION || '2m',
    },
  },
  thresholds: {
    checks: ['rate>0.99'],
    sse_reconnect_latency: ['p(95)<2000'],
  },
};

export default function () {
  const startedAt = Date.now();
  const params = {
    headers: {
      ...headers(),
      Accept: 'text/event-stream',
      ...(String(__ENV.LAST_EVENT_ID || '')
        ? { 'Last-Event-ID': String(__ENV.LAST_EVENT_ID) }
        : {}),
    },
    timeout: __ENV.SSE_HOLD || '30s',
  };
  const response = sse.open(
    `${config.baseUrl}/field/stream`,
    params,
    (client) => {
      client.on('open', () => reconnectLatency.add(Date.now() - startedAt));
      client.on('event', (event) => {
        if (event.type === 'location') locationEvents.add(1);
      });
      client.on('error', (error) => {
        throw error;
      });
    },
  );

  check(response, {
    'SSE authenticated': (result) => result?.status === 200,
  });
}
