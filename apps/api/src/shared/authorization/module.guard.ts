import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../database/prisma.service';
import type { AuthenticatedUser } from '../http/authenticated-user';
import { REQUIRED_MODULE_KEY } from './require-module.decorator';

@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const moduleKey = this.reflector.getAllAndOverride<string>(
      REQUIRED_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!moduleKey) return true;
    const user = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>().user;
    if (!user)
      throw new ForbiddenException({
        code: 'MODULE_ACCESS_DENIED',
        message: 'User is not authenticated',
      });
    const assignment = await this.prisma.forAdmin((tx) =>
      tx.tenantModule.findFirst({
        where: {
          tenantId: user.tenantId,
          isActive: true,
          module: { key: moduleKey, availability: 'AVAILABLE' },
        },
        select: { id: true },
      }),
    );
    if (!assignment)
      throw new ForbiddenException({
        code: 'MODULE_ACCESS_DENIED',
        message: `${moduleKey} is not active for this workspace`,
      });
    return true;
  }
}
