import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { UserStatus } from '@prisma/client';

@Injectable()
export class JwtTenantGuard extends AuthGuard(['jwt', 'impersonation-jwt']) {
  constructor(
    private readonly tenantContextService: TenantContextService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const authenticated = await super.canActivate(context);
    if (!authenticated) {
      return false;
    }

    const request = context.switchToHttp().getRequest<{
      user?: {
        userId?: string;
        tenantId?: string;
        impersonationSessionId?: string;
        impersonationTokenJti?: string;
        platformSessionId?: string;
      };
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

    if (request.user.userId) {
      this.tenantContextService.setActor(request.user.userId);
    }
    if (request.user.impersonationSessionId) {
      const session = await this.prisma.forAdmin((tx) =>
        tx.impersonationSession.findUnique({
          where: { id: request.user?.impersonationSessionId },
          include: { platformSession: true },
        }),
      );
      if (
        !session ||
        session.tokenJti !== request.user.impersonationTokenJti ||
        session.platformSessionId !== request.user.platformSessionId ||
        session.endedAt ||
        session.expiresAt <= new Date() ||
        session.platformSession.revokedAt ||
        session.platformSession.expiresAt <= new Date()
      ) {
        throw new UnauthorizedException({
          code: 'IMPERSONATION_EXPIRED',
          message: 'Impersonation session has ended or expired',
        });
      }
      const target = await this.prisma.forAdmin((tx) =>
        tx.user.findUnique({
          where: { id: request.user?.userId },
          select: { status: true, tenantId: true },
        }),
      );
      if (
        !target ||
        target.status !== UserStatus.ACTIVE ||
        target.tenantId !== tenantId
      )
        throw new UnauthorizedException({
          code: 'IMPERSONATION_EXPIRED',
          message: 'Impersonation target is unavailable',
        });
      this.tenantContextService.setImpersonation(session.id);
    }

    return true;
  }
}
