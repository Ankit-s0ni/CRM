import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type {
  PrismaService,
  PrismaTransaction,
} from '../database/prisma.service';
import { ModuleGuard } from './module.guard';

describe('ModuleGuard', () => {
  it('returns the product capability error for a disabled Payroll URL', async () => {
    const guard = createGuard('PAYROLL', null);

    await expect(guard.canActivate(context())).rejects.toMatchObject({
      response: {
        code: 'PRODUCT_CAPABILITY_NOT_ENTITLED',
        message: 'HRMS Payroll is not enabled for this workspace',
      },
    });
  });

  it('preserves the generic module error for other disabled modules', async () => {
    const guard = createGuard('ATTENDANCE', null);

    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(guard.canActivate(context())).rejects.toMatchObject({
      response: { code: 'MODULE_ACCESS_DENIED' },
    });
  });

  it('allows an active available module assignment', async () => {
    const guard = createGuard('PAYROLL', { id: 'assignment-1' });

    await expect(guard.canActivate(context())).resolves.toBe(true);
  });
});

function createGuard(moduleKey: string, assignment: { id: string } | null) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(moduleKey),
  } as unknown as Reflector;
  const tenantModule = {
    findFirst: jest.fn().mockResolvedValue(assignment),
  };
  const prisma = {
    forAdmin: jest
      .fn()
      .mockImplementation(
        (callback: (transaction: PrismaTransaction) => Promise<unknown>) =>
          callback({ tenantModule } as unknown as PrismaTransaction),
      ),
  } as unknown as PrismaService;
  return new ModuleGuard(reflector, prisma);
}

function context() {
  return {
    getHandler: () => function handler() {},
    getClass: () => class TestController {},
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          tenantId: 'tenant-1',
          id: 'user-1',
        },
      }),
    }),
  } as unknown as ExecutionContext;
}
