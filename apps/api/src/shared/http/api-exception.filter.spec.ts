import type { ArgumentsHost } from '@nestjs/common';
import type { ErrorReporter } from '../observability/observability.port';
import { ApiExceptionFilter } from './api-exception.filter';

describe('ApiExceptionFilter observability safety', () => {
  it('reports server errors using a route template without query data', () => {
    const captureException: jest.MockedFunction<
      ErrorReporter['captureException']
    > = jest.fn();
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-request-id': 'request-1' },
          baseUrl: '/billing/invoices',
          route: { path: '/:id' },
          path: '/019f0000-0000-7000-8000-000000000001',
          originalUrl:
            '/billing/invoices/019f0000-0000-7000-8000-000000000001?token=secret',
        }),
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    new ApiExceptionFilter({ captureException }).catch(
      new Error('database unavailable'),
      host,
    );

    expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
      requestId: 'request-1',
      path: '/billing/invoices/:id',
    });
    expect(JSON.stringify(captureException.mock.calls)).not.toContain('secret');
    expect(response.status).toHaveBeenCalledWith(500);
  });
});
