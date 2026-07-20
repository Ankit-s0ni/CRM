import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserStatus } from '@prisma/client';
import { PlatformDatabaseService } from './platform-database.service';
import type { AuthenticatedPlatformUser } from './platform-auth.types';

@Injectable()
export class PlatformJwtGuard extends AuthGuard('platform-jwt') {
  constructor(private readonly database: PlatformDatabaseService) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const authenticated = await super.canActivate(context);
    if (!authenticated) return false;
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedPlatformUser }>();
    const user = request.user;
    if (!user) this.unauthorized();

    const session = await this.database.transaction((tx) =>
      tx.platformSession.findUnique({
        where: { id: user.sessionId },
        include: { platformUser: true },
      }),
    );
    if (
      !session ||
      session.platformUserId !== user.platformUserId ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      session.platformUser.status !== UserStatus.ACTIVE
    ) {
      this.unauthorized();
    }
    return true;
  }

  private unauthorized(): never {
    throw new UnauthorizedException({
      code: 'PLATFORM_AUTH_INVALID',
      message: 'Platform session is invalid or expired',
    });
  }
}
