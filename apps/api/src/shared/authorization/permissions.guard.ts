import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { AuthenticatedUser } from '../http/authenticated-user';
import type { PermissionKey } from './permissions.constants';
import {
  REQUIRED_ANY_PERMISSIONS_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from './require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredAny = this.reflector.getAllAndOverride<PermissionKey[]>(
      REQUIRED_ANY_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length && !requiredAny?.length) {
      throw new ForbiddenException({
        code: 'PERMISSION_CONFIGURATION_MISSING',
        message: 'This endpoint has no permission policy configured',
      });
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    if (!request.user) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'User is not authenticated',
      });
    }

    const user = await this.prisma.forTenant((tx) =>
      tx.user.findUnique({
        where: { id: request.user?.userId },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: { include: { permission: true } },
                },
              },
            },
          },
        },
      }),
    );

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'User is not active',
      });
    }

    const granted = new Set(
      user.roles.flatMap(({ role }) =>
        role.permissions.map(({ permission }) => permission.key),
      ),
    );

    const hasAll =
      !required?.length ||
      required.every((permission) => granted.has(permission));
    const hasAny =
      !requiredAny?.length ||
      requiredAny.some((permission) => granted.has(permission));
    if (hasAll && hasAny) {
      return true;
    }

    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action',
      details: {
        requiredPermissions: required ?? [],
        anyOfPermissions: requiredAny ?? [],
      },
    });
  }
}
