import { HttpException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { PrismaService } from '../database/prisma.service';
import { TenantContextService } from './tenant-context.service';
import { TenantMiddleware } from './tenant.middleware';

describe('TenantMiddleware', () => {
  const next = jest.fn();

  beforeEach(() => next.mockClear());

  it.each([
    [null, 401, 'WORKSPACE_NOT_FOUND'],
    [{ id: 'tenant-a', status: 'SUSPENDED' }, 403, 'TENANT_SUSPENDED'],
    [{ id: 'tenant-a', status: 'CHURNED' }, 403, 'WORKSPACE_UNAVAILABLE'],
  ])(
    'returns a stable code for unavailable workspace state %#',
    async (tenant, status, code) => {
      const middleware = createMiddleware(tenant);
      try {
        await middleware.use(request(), {} as Response, next as NextFunction);
        throw new Error('Expected unavailable workspace to be rejected');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(status);
        expect((error as HttpException).getResponse()).toEqual(
          expect.objectContaining({ code }),
        );
      }
      expect(next).not.toHaveBeenCalled();
    },
  );

  it('establishes tenant context for an active workspace', async () => {
    const middleware = createMiddleware({ id: 'tenant-a', status: 'ACTIVE' });

    await middleware.use(request(), {} as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
  });
});

function createMiddleware(tenant: { id: string; status: string } | null) {
  const prisma = {
    forAdmin: (callback: (tx: object) => unknown) =>
      callback({
        tenant: {
          findUnique: jest.fn().mockResolvedValue(tenant),
        },
      }),
  } as unknown as PrismaService;
  return new TenantMiddleware(prisma, new TenantContextService());
}

function request() {
  return {
    headers: { 'x-tenant-id': 'tenant-a' },
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('jest'),
  } as unknown as Request;
}
