import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformAuthService } from './platform-auth.service';
import type { AuthenticatedPlatformUser } from './platform-auth.types';
import type { PlatformPermissionKey } from './platform-permissions';

export const PLATFORM_PERMISSIONS_KEY = 'platform_permissions';

@Injectable()
export class PlatformPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: PlatformAuthService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<PlatformPermissionKey[]>(
      PLATFORM_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) {
      throw new ForbiddenException({
        code: 'PLATFORM_PERMISSION_CONFIGURATION_MISSING',
        message: 'Platform endpoint has no permission policy',
      });
    }
    const user = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedPlatformUser }>().user;
    if (!user) this.forbidden(required);
    const granted = new Set(await this.auth.permissions(user.role));
    if (required.every((permission) => granted.has(permission))) return true;
    this.forbidden(required);
  }

  private forbidden(required: PlatformPermissionKey[]): never {
    throw new ForbiddenException({
      code: 'PLATFORM_PERMISSION_DENIED',
      message: 'Platform permission denied',
      details: { requiredPermissions: required },
    });
  }
}
