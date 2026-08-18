import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';

export const AUTH_CLIENT_HEADER = 'x-auth-client';
export const CSRF_HEADER = 'x-csrf-token';
export const CSRF_COOKIE = 'deltcrm_csrf';
export const TENANT_ACCESS_COOKIE = 'deltcrm_access';
export const TENANT_REFRESH_COOKIE = 'deltcrm_refresh';
export const PLATFORM_ACCESS_COOKIE = 'deltcrm_platform_access';
export const PLATFORM_REFRESH_COOKIE = 'deltcrm_platform_refresh';

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

type BrowserSessionKind = 'tenant' | 'platform';

export function isWebAuthRequest(request: Request): boolean {
  return request.get(AUTH_CLIENT_HEADER)?.toLowerCase() === 'web';
}

export function parseRequestCookies(request: Request): Record<string, string> {
  const header = request.headers.cookie;
  if (!header) return {};

  return header.split(';').reduce<Record<string, string>>((cookies, entry) => {
    const separator = entry.indexOf('=');
    if (separator < 0) return cookies;

    const name = entry.slice(0, separator).trim();
    const value = entry.slice(separator + 1).trim();
    if (!name) return cookies;

    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
    return cookies;
  }, {});
}

export function accessTokenFromRequest(
  request: Request,
  kind: BrowserSessionKind,
): string | null {
  const cookieName =
    kind === 'platform' ? PLATFORM_ACCESS_COOKIE : TENANT_ACCESS_COOKIE;
  return parseRequestCookies(request)[cookieName] ?? null;
}

export function refreshTokenFromRequest(
  request: Request,
  kind: BrowserSessionKind,
): string | null {
  const cookieName =
    kind === 'platform' ? PLATFORM_REFRESH_COOKIE : TENANT_REFRESH_COOKIE;
  return parseRequestCookies(request)[cookieName] ?? null;
}

export function setBrowserSessionCookies(
  response: Response,
  tokens: SessionTokens,
  kind: BrowserSessionKind,
): void {
  const secure = process.env.NODE_ENV === 'production';
  const accessCookie =
    kind === 'platform' ? PLATFORM_ACCESS_COOKIE : TENANT_ACCESS_COOKIE;
  const refreshCookie =
    kind === 'platform' ? PLATFORM_REFRESH_COOKIE : TENANT_REFRESH_COOKIE;

  const cookieDomain =
    process.env.AUTH_CSRF_COOKIE_DOMAIN ||
    process.env.COOKIE_DOMAIN ||
    (process.env.NODE_ENV === 'production' ? '.liqaahq.com' : undefined);

  response.cookie(accessCookie, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_MS,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
  response.cookie(refreshCookie, tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TOKEN_TTL_MS,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });

  const csrfToken = randomBytes(32).toString('base64url');
  response.cookie(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TOKEN_TTL_MS,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
  response.setHeader(CSRF_HEADER, csrfToken);
}

export function clearBrowserSessionCookies(
  response: Response,
  kind: BrowserSessionKind,
): void {
  const secure = process.env.NODE_ENV === 'production';
  const accessCookie =
    kind === 'platform' ? PLATFORM_ACCESS_COOKIE : TENANT_ACCESS_COOKIE;
  const refreshCookie =
    kind === 'platform' ? PLATFORM_REFRESH_COOKIE : TENANT_REFRESH_COOKIE;
  const cookieDomain =
    process.env.AUTH_CSRF_COOKIE_DOMAIN ||
    process.env.COOKIE_DOMAIN ||
    (process.env.NODE_ENV === 'production' ? '.liqaahq.com' : undefined);
  const authOptions = {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  };

  response.clearCookie(accessCookie, authOptions);
  response.clearCookie(refreshCookie, authOptions);
  response.clearCookie(CSRF_COOKIE, {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    path: '/',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
}

export function withoutSessionTokens<T extends SessionTokens>(
  session: T,
): Omit<T, keyof SessionTokens> {
  const safe = { ...session } as Partial<SessionTokens> &
    Omit<T, keyof SessionTokens>;
  delete safe.accessToken;
  delete safe.refreshToken;
  return safe;
}
