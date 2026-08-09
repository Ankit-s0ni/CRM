import type { NextFunction, Request, Response } from 'express';
import { RequestIdMiddleware } from './request-id.middleware';

describe('RequestIdMiddleware', () => {
  const middleware = new RequestIdMiddleware();

  it('preserves valid request and distributed trace identifiers', () => {
    const request = {
      headers: {
        'x-request-id': 'request-1',
        traceparent: '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01',
      },
    } as unknown as Request;
    const setHeader = jest.fn();
    const next = jest.fn() as NextFunction;

    middleware.use(request, { setHeader } as unknown as Response, next);

    expect(request.headers['x-request-id']).toBe('request-1');
    expect(request.headers['x-trace-id']).toBe(
      '0123456789abcdef0123456789abcdef',
    );
    expect(setHeader).toHaveBeenCalledWith('x-request-id', 'request-1');
    expect(setHeader).toHaveBeenCalledWith(
      'x-trace-id',
      '0123456789abcdef0123456789abcdef',
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('replaces invalid correlation identifiers without trusting the caller', () => {
    const request = {
      headers: {
        'x-request-id': 'x'.repeat(129),
        'x-trace-id': 'not-a-trace',
        traceparent: '00-00000000000000000000000000000000-0123456789abcdef-01',
      },
    } as unknown as Request;
    const setHeader = jest.fn();

    middleware.use(
      request,
      { setHeader } as unknown as Response,
      jest.fn() as NextFunction,
    );

    expect(request.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(request.headers['x-trace-id']).toMatch(/^[0-9a-f]{32}$/);
    expect(request.headers['x-trace-id']).not.toBe(
      '00000000000000000000000000000000',
    );
  });
});
