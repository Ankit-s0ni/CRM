import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { ObservabilityInterceptor } from './observability.interceptor';
import type { TraceRecorder } from './observability.port';

describe('ObservabilityInterceptor', () => {
  const record: jest.MockedFunction<TraceRecorder['record']> = jest.fn();
  const interceptor = new ObservabilityInterceptor({ record });

  beforeEach(() => record.mockClear());

  it('records route, method, status, and duration without request data', async () => {
    const handler: CallHandler = { handle: () => of({ ok: true }) };
    await lastValueFrom(interceptor.intercept(context(201), handler));

    expect(record).toHaveBeenCalledTimes(1);
    const [name, attributes] = record.mock.calls[0];
    expect(name).toBe('http.server.request');
    expect(attributes['http.request.method']).toBe('POST');
    expect(attributes['http.route']).toBe('/billing/subscription');
    expect(attributes['http.response.status_code']).toBe(201);
    expect(typeof attributes['http.server.duration_ms']).toBe('number');
    expect(JSON.stringify(record.mock.calls)).not.toContain('secret');
  });

  it('records failures as server errors', async () => {
    await expect(
      lastValueFrom(
        interceptor.intercept(context(200), {
          handle: () => throwError(() => new Error('failed')),
        }),
      ),
    ).rejects.toThrow('failed');

    expect(record.mock.calls[0]?.[1]['http.response.status_code']).toBe(500);
  });
});

function context(statusCode: number) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'POST',
        path: '/billing/subscription',
        route: { path: '/billing/subscription' },
        body: { password: 'secret' },
      }),
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}
