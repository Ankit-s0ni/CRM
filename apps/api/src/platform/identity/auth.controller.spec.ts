import type { Request, Response } from 'express';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';
import type { VerificationTokensService } from './verification-tokens.service';
import {
  CSRF_COOKIE,
  TENANT_ACCESS_COOKIE,
  TENANT_REFRESH_COOKIE,
} from '../../shared/http/auth-cookies';

describe('AuthController browser sessions', () => {
  const session = {
    accessToken: 'tenant-access',
    refreshToken: 'tenant-refresh',
    user: {
      id: 'user-1',
      tenantId: 'tenant-1',
      workspace: 'acme',
    },
  };
  let authService: jest.Mocked<
    Pick<AuthService, 'login' | 'refresh' | 'logout'>
  >;
  let controller: AuthController;

  beforeEach(() => {
    authService = {
      login: jest.fn().mockResolvedValue(session),
      refresh: jest.fn().mockResolvedValue(session),
      logout: jest.fn().mockResolvedValue({ success: true }),
    };
    controller = new AuthController(
      authService as unknown as AuthService,
      {} as VerificationTokensService,
    );
  });

  it('sets HTTP-only cookies and does not expose tokens to web login clients', async () => {
    const response = responseRecorder();
    const result = await controller.login(
      { email: 'admin@acme.test', password: 'Password123!' },
      requestWith({ 'x-auth-client': 'web' }),
      response.value,
    );

    expect(result).toEqual({ user: session.user });
    expect(response.cookies.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        TENANT_ACCESS_COOKIE,
        TENANT_REFRESH_COOKIE,
        CSRF_COOKIE,
      ]),
    );
  });

  it('preserves bearer-token responses for non-browser clients', async () => {
    const response = responseRecorder();
    const result = await controller.login(
      { email: 'admin@acme.test', password: 'Password123!' },
      requestWith({ 'x-auth-client': 'mobile' }),
      response.value,
    );

    expect(result).toEqual(session);
    expect(response.cookies).toHaveLength(0);
  });

  it('rotates a browser refresh token sourced from its HTTP-only cookie', async () => {
    const response = responseRecorder();
    const result = await controller.refresh(
      {},
      requestWith({
        'x-auth-client': 'web',
        cookie: `${TENANT_REFRESH_COOKIE}=cookie-refresh`,
      }),
      response.value,
    );

    expect(authService.refresh).toHaveBeenCalledWith(
      'cookie-refresh',
      '127.0.0.1',
      'test-agent',
      undefined,
    );
    expect(result).toEqual({ user: session.user });
  });

  it('rejects refresh when neither body nor cookie supplies a token', async () => {
    await expect(
      controller.refresh({}, requestWith({}), responseRecorder().value),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokes the refresh token and clears browser cookies on logout', async () => {
    const response = responseRecorder();
    const result = await controller.logout(
      {},
      { userId: 'user-1' } as never,
      requestWith({ cookie: `${TENANT_REFRESH_COOKIE}=cookie-refresh` }),
      response.value,
    );

    expect(authService.logout).toHaveBeenCalledWith('user-1', 'cookie-refresh');
    expect(response.cleared.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        TENANT_ACCESS_COOKIE,
        TENANT_REFRESH_COOKIE,
        CSRF_COOKIE,
      ]),
    );
    expect(result).toEqual({ success: true });
  });
});

function requestWith(headers: Record<string, string>): Request {
  const normalizedHeaders: Record<string, string> = {
    'user-agent': 'test-agent',
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
