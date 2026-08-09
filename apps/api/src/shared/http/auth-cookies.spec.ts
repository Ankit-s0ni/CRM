import type { Request, Response } from 'express';
import {
  CSRF_COOKIE,
  PLATFORM_ACCESS_COOKIE,
  PLATFORM_REFRESH_COOKIE,
  TENANT_ACCESS_COOKIE,
  TENANT_REFRESH_COOKIE,
  accessTokenFromRequest,
  clearBrowserSessionCookies,
  isWebAuthRequest,
  parseRequestCookies,
  refreshTokenFromRequest,
  setBrowserSessionCookies,
  withoutSessionTokens,
} from './auth-cookies';

describe('browser auth cookies', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCsrfDomain = process.env.AUTH_CSRF_COOKIE_DOMAIN;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalCsrfDomain === undefined) {
      delete process.env.AUTH_CSRF_COOKIE_DOMAIN;
    } else {
      process.env.AUTH_CSRF_COOKIE_DOMAIN = originalCsrfDomain;
    }
  });

  it('parses encoded cookies and selects tenant and platform tokens', () => {
    const request = requestWith({
      cookie: `${TENANT_ACCESS_COOKIE}=tenant%20access; ${TENANT_REFRESH_COOKIE}=tenant-refresh; ${PLATFORM_ACCESS_COOKIE}=platform-access; ${PLATFORM_REFRESH_COOKIE}=platform-refresh`,
    });

    expect(parseRequestCookies(request)).toMatchObject({
      [TENANT_ACCESS_COOKIE]: 'tenant access',
      [TENANT_REFRESH_COOKIE]: 'tenant-refresh',
      [PLATFORM_ACCESS_COOKIE]: 'platform-access',
      [PLATFORM_REFRESH_COOKIE]: 'platform-refresh',
    });
    expect(accessTokenFromRequest(request, 'tenant')).toBe('tenant access');
    expect(refreshTokenFromRequest(request, 'tenant')).toBe('tenant-refresh');
    expect(accessTokenFromRequest(request, 'platform')).toBe('platform-access');
    expect(refreshTokenFromRequest(request, 'platform')).toBe(
      'platform-refresh',
    );
  });

  it('identifies only explicitly declared web authentication clients', () => {
    expect(isWebAuthRequest(requestWith({ 'x-auth-client': 'web' }))).toBe(
      true,
    );
    expect(isWebAuthRequest(requestWith({ 'x-auth-client': 'mobile' }))).toBe(
      false,
    );
  });

  it('issues secure production cookies and keeps only CSRF readable', () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_CSRF_COOKIE_DOMAIN = '.blufield.cloud';
    const response = responseRecorder();

    setBrowserSessionCookies(
      response.value,
      { accessToken: 'access', refreshToken: 'refresh' },
      'tenant',
    );

    const accessCookie = response.cookies.find(
      ({ name }) => name === TENANT_ACCESS_COOKIE,
    );
    const refreshCookie = response.cookies.find(
      ({ name }) => name === TENANT_REFRESH_COOKIE,
    );
    const csrfCookie = response.cookies.find(
      ({ name }) => name === CSRF_COOKIE,
    );

    expect(accessCookie).toMatchObject({
      name: TENANT_ACCESS_COOKIE,
      value: 'access',
    });
    expect(accessCookie?.options).toMatchObject({
      httpOnly: true,
      secure: true,
    });
    expect(refreshCookie).toMatchObject({
      name: TENANT_REFRESH_COOKIE,
      value: 'refresh',
    });
    expect(refreshCookie?.options).toMatchObject({
      httpOnly: true,
      secure: true,
    });
    expect(csrfCookie?.options).toMatchObject({
      httpOnly: false,
      secure: true,
      domain: '.blufield.cloud',
    });
  });

  it('clears both authentication cookies and removes tokens from web JSON', () => {
    const response = responseRecorder();
    clearBrowserSessionCookies(response.value, 'platform');

    expect(response.cleared.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        PLATFORM_ACCESS_COOKIE,
        PLATFORM_REFRESH_COOKIE,
        CSRF_COOKIE,
      ]),
    );
    expect(
      withoutSessionTokens({
        accessToken: 'access',
        refreshToken: 'refresh',
        user: { id: 'user-1' },
      }),
    ).toEqual({ user: { id: 'user-1' } });
  });
});

function requestWith(headers: Record<string, string>): Request {
  return {
    headers,
    get(name: string) {
      return headers[name.toLowerCase()];
    },
  } as unknown as Request;
}

function responseRecorder() {
  const cookies: Array<{ name: string; value: string; options: object }> = [];
  const cleared: Array<{ name: string; options: object }> = [];
  const value = {
    cookie(name: string, cookieValue: string, options: object) {
      cookies.push({ name, value: cookieValue, options });
    },
    clearCookie(name: string, options: object) {
      cleared.push({ name, options });
    },
    setHeader() {},
  } as unknown as Response;
  return { value, cookies, cleared };
}
