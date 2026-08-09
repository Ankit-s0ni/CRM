import type { NextFunction, Request, Response } from 'express';
import {
  CSRF_COOKIE,
  TENANT_ACCESS_COOKIE,
  TENANT_REFRESH_COOKIE,
} from './auth-cookies';
import { csrfProtection } from './csrf.middleware';

describe('csrfProtection', () => {
  it('rejects cookie-authenticated mutations without a matching token', () => {
    const response = responseRecorder();
    const next = jest.fn() as NextFunction;

    csrfProtection(
      requestWith({
        method: 'POST',
        path: '/employees',
        cookie: `${TENANT_ACCESS_COOKIE}=access; ${CSRF_COOKIE}=csrf-value`,
      }),
      response.value,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'CSRF_VALIDATION_FAILED' }),
    );
  });

  it('accepts cookie-authenticated mutations with a matching token', () => {
    const response = responseRecorder();
    const next = jest.fn() as NextFunction;

    csrfProtection(
      requestWith({
        method: 'PATCH',
        path: '/employees/employee-1',
        cookie: `${TENANT_ACCESS_COOKIE}=access; ${CSRF_COOKIE}=csrf-value`,
        'x-csrf-token': 'csrf-value',
      }),
      response.value,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.status).not.toHaveBeenCalled();
  });

  it('requires CSRF for cookie-based refresh rotation', () => {
    const response = responseRecorder();
    const next = jest.fn() as NextFunction;

    csrfProtection(
      requestWith({
        method: 'POST',
        path: '/auth/refresh',
        cookie: `${TENANT_REFRESH_COOKIE}=refresh`,
      }),
      response.value,
      next,
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ['bearer mobile mutation', '/employees', { authorization: 'Bearer token' }],
    ['public browser login', '/auth/login', {}],
    ['safe cookie request', '/auth/me', {}],
  ])('does not block %s', (_label, path, headers) => {
    const response = responseRecorder();
    const next = jest.fn() as NextFunction;
    const method = path === '/auth/me' ? 'GET' : 'POST';

    csrfProtection(
      requestWith({
        method,
        path,
        cookie: `${TENANT_ACCESS_COOKIE}=access`,
        ...headers,
      }),
      response.value,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
  });
});

function requestWith(input: {
  method: string;
  path: string;
  cookie: string;
  authorization?: string;
  'x-csrf-token'?: string;
}): Request {
  const headers: Record<string, string | undefined> = {
    cookie: input.cookie,
    authorization: input.authorization,
    'x-csrf-token': input['x-csrf-token'],
  };
  return {
    method: input.method,
    path: input.path,
    originalUrl: input.path,
    headers,
    get(name: string) {
      return headers[name.toLowerCase()];
    },
  } as unknown as Request;
}

function responseRecorder() {
  const status = jest.fn().mockReturnThis();
  const json = jest.fn().mockReturnThis();
  return {
    status,
    json,
    value: { status, json } as unknown as Response,
  };
}
