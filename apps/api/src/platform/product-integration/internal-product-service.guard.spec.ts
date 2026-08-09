import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import {
  AUTHENTICATED_PRODUCT_SERVICE,
  InternalProductServiceGuard,
} from './internal-product-service.guard';

describe('InternalProductServiceGuard', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  function context(options: {
    product?: string;
    key?: string;
    routeProduct?: string;
  }) {
    const request: Record<string, unknown> = {
      headers: {
        ...(options.product ? { 'x-product-key': options.product } : {}),
        ...(options.key ? { 'x-product-service-key': options.key } : {}),
      },
      params: options.routeProduct ? { productKey: options.routeProduct } : {},
    };
    return {
      request,
      execution: {
        switchToHttp: () => ({ getRequest: () => request }),
      } as ExecutionContext,
    };
  }

  it('accepts a current or previous key for the identified product', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      PRODUCT_SERVICE_CREDENTIALS_JSON: JSON.stringify({
        HRMS: ['current-key', 'previous-key'],
      }),
    };
    const guard = new InternalProductServiceGuard();
    for (const key of ['current-key', 'previous-key']) {
      const request = context({ product: 'HRMS', key });
      expect(guard.canActivate(request.execution)).toBe(true);
      expect(request.request[AUTHENTICATED_PRODUCT_SERVICE]).toBe('HRMS');
    }
  });

  it('fails closed in production when credentials are not configured', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      PRODUCT_SERVICE_CREDENTIALS_JSON: '',
      PRODUCT_SERVICE_API_KEY: '',
    };
    expect(() =>
      new InternalProductServiceGuard().canActivate(
        context({ product: 'HRMS', key: 'anything' }).execution,
      ),
    ).toThrow(UnauthorizedException);
  });

  it.each([
    ['missing product identity', { key: 'hrms-key' }],
    ['wrong product key', { product: 'MAIL', key: 'hrms-key' }],
    ['wrong credential', { product: 'HRMS', key: 'wrong-key' }],
  ])('rejects %s', (_case, requestOptions) => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      PRODUCT_SERVICE_CREDENTIALS_JSON: JSON.stringify({ HRMS: ['hrms-key'] }),
    };
    expect(() =>
      new InternalProductServiceGuard().canActivate(
        context(requestOptions).execution,
      ),
    ).toThrow(UnauthorizedException);
  });

  it('prevents one product credential from reading another product scope', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      PRODUCT_SERVICE_CREDENTIALS_JSON: JSON.stringify({
        HRMS: ['hrms-key'],
        MAIL: ['mail-key'],
      }),
    };
    expect(() =>
      new InternalProductServiceGuard().canActivate(
        context({
          product: 'HRMS',
          key: 'hrms-key',
          routeProduct: 'MAIL',
        }).execution,
      ),
    ).toThrow(UnauthorizedException);
  });
});
