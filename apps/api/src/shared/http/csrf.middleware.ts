import type { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  PLATFORM_ACCESS_COOKIE,
  PLATFORM_REFRESH_COOKIE,
  TENANT_ACCESS_COOKIE,
  TENANT_REFRESH_COOKIE,
  parseRequestCookies,
} from './auth-cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const PUBLIC_AUTH_PATHS = new Set([
  '/auth/login',
  '/auth/mobile-login',
  '/auth/signup',
  '/auth/password-reset',
  '/auth/password-reset/confirm',
  '/auth/verify',
  '/auth/verify/resend',
  '/platform/auth/login',
  '/platform/auth/mfa/verify',
]);

export function csrfProtection(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (
    SAFE_METHODS.has(request.method.toUpperCase()) ||
    PUBLIC_AUTH_PATHS.has(request.path) ||
    request.get('authorization')
  ) {
    next();
    return;
  }

  const cookies = parseRequestCookies(request);
  const usesCookieAuthentication = Boolean(
    cookies[TENANT_ACCESS_COOKIE] ||
    cookies[TENANT_REFRESH_COOKIE] ||
    cookies[PLATFORM_ACCESS_COOKIE] ||
    cookies[PLATFORM_REFRESH_COOKIE],
  );
  if (!usesCookieAuthentication) {
    next();
    return;
  }

  const cookieToken = cookies[CSRF_COOKIE];
  const headerToken = request.get(CSRF_HEADER);
  if (!tokensMatch(cookieToken, headerToken)) {
    response.status(403).json({
      statusCode: 403,
      code: 'CSRF_VALIDATION_FAILED',
      message: 'Request validation failed',
      path: request.originalUrl,
    });
    return;
  }

  next();
}

function tokensMatch(left?: string, right?: string): boolean {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
