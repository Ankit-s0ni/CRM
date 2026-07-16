import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';

@Injectable()
export class JwtTenantGuard extends AuthGuard('jwt') {
  constructor(private readonly tenantContextService: TenantContextService) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const authenticated = await super.canActivate(context);
    if (!authenticated) {
      return false;
    }

    const request = context.switchToHttp().getRequest<{
      user?: { tenantId?: string };
    }>();
    const tenantId = this.tenantContextService.tenantId;

    if (!tenantId) {
      throw new UnauthorizedException('Workspace header required');
    }

    if (!request.user?.tenantId || request.user.tenantId !== tenantId) {
      throw new ForbiddenException(
        'Access token does not belong to this workspace',
      );
    }

    return true;
  }
}
