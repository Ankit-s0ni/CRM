import type { Request, Response } from 'express';
import { UnauthorizedException } from '@nestjs/common';
import { PlatformAuthController } from './platform-auth.controller';
import type { PlatformAuthService } from './platform-auth.service';
import {
  CSRF_COOKIE,
  PLATFORM_ACCESS_COOKIE,
  PLATFORM_REFRESH_COOKIE,
} from '../../../shared/http/auth-cookies';

describe('PlatformAuthController browser sessions', () => {
  const session = {
    accessToken: 'platform-access',
    refreshToken: 'platform-refresh',
    user: { id: 'owner-1', email: 'owner@deltcrm.test' },
    permissions: ['platform.tenants.read'],
  };
  let auth: jest.Mocked<
    Pick<PlatformAuthService, 'login' | 'verifyMfa' | 'refresh' | 'logout'>
  >;
  let controller: PlatformAuthController;

  beforeEach(() => {
    auth = {
      login: jest.fn().mockResolvedValue(session),
      verifyMfa: jest.fn().mockResolvedValue(session),
      refresh: jest.fn().mockResolvedValue(session),
      logout: jest.fn().mockResolvedValue({ success: true }),
    };
    controller = new PlatformAuthController(
      auth as unknown as PlatformAuthService,
    );
  });

  it('stores a completed web login in cookies without returning tokens', async () => {
    const response = responseRecorder();
    const result = await controller.login(
      { email: 'owner@deltcrm.test', password: 'Password123!' },
      requestWith({ 'x-auth-client': 'web' }),
      response.value,
    );

    expect(result).toEqual({
      user: session.user,
      permissions: session.permissions,
    });
    expect(response.cookies.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        PLATFORM_ACCESS_COOKIE,
        PLATFORM_REFRESH_COOKIE,
        CSRF_COOKIE,
      ]),
    );
  });

  it('does not treat an MFA challenge as an authenticated browser session', async () => {
    auth.login.mockResolvedValueOnce({
      mfaRequired: true,
      challengeToken: 'challenge',
      expiresIn: 300,
    });
    const response = responseRecorder();
    const result = await controller.login(
      { email: 'owner@deltcrm.test', password: 'Password123!' },
      requestWith({ 'x-auth-client': 'web' }),
      response.value,
    );

    expect(result).toEqual({
      mfaRequired: true,
      challengeToken: 'challenge',
      expiresIn: 300,
    });
    expect(response.cookies).toHaveLength(0);
  });

  it('rotates the platform refresh token from its cookie', async () => {
    const result = await controller.refresh(
      {},
      requestWith({
        'x-auth-client': 'web',
        cookie: `${PLATFORM_REFRESH_COOKIE}=cookie-refresh`,
      }),
      responseRecorder().value,
    );

    expect(auth.refresh).toHaveBeenCalledWith(
      'cookie-refresh',
      expect.objectContaining({ requestId: 'request-1' }),
    );
    expect(result).toEqual({
      user: session.user,
      permissions: session.permissions,
    });
  });

  it('rejects a refresh request without a body or cookie token', async () => {
    await expect(
      controller.refresh({}, requestWith({}), responseRecorder().value),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('clears platform browser cookies on logout', async () => {
    const response = responseRecorder();
    await controller.logout(
      { userId: 'owner-1' } as never,
      requestWith({}),
      response.value,
    );

    expect(response.cleared.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        PLATFORM_ACCESS_COOKIE,
        PLATFORM_REFRESH_COOKIE,
        CSRF_COOKIE,
      ]),
    );
  });
});

function requestWith(headers: Record<string, string>): Request {
  const normalizedHeaders: Record<string, string> = {
    'user-agent': 'test-agent',
    'x-request-id': 'request-1',
    ...headers,
  };
  return {
    ip: '127.0.0.1',
    headers: normalizedHeaders,
    get(name: string) {
      return normalizedHeaders[name.toLowerCase()];
    },
  } as unknown as Request;
}

function responseRecorder() {
  const cookies: Array<{ name: string; options: object }> = [];
  const cleared: Array<{ name: string; options: object }> = [];
  const value = {
    cookie(name: string, _value: string, options: object) {
      cookies.push({ name, options });
    },
    clearCookie(name: string, options: object) {
      cleared.push({ name, options });
    },
    setHeader() {},
  } as unknown as Response;
  return { value, cookies, cleared };
}
