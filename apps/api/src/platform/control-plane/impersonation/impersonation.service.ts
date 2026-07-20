import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, TenantStatus, UserStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import type { AuthenticatedPlatformUser } from '../platform-auth/platform-auth.types';
import {
  PlatformDatabaseService,
  type PlatformTransaction,
} from '../platform-auth/platform-database.service';
import { CreateImpersonationDto } from './dto/impersonation.dto';
import { impersonationScopeViolation } from '../platform-policy';
const MFA_FRESH_MS = 10 * 60 * 1000;

type Metadata = { ipAddress?: string; userAgent?: string; requestId?: string };

@Injectable()
export class ImpersonationService {
  constructor(
    private readonly database: PlatformDatabaseService,
    private readonly jwt: JwtService,
  ) {}

  targets(tenantId: string) {
    return this.database.transaction(async (tx) => {
      if (
        !(await tx.tenant.findUnique({
          where: { id: tenantId },
          select: { id: true },
        }))
      )
        this.notFoundTenant();
      const users = await tx.user.findMany({
        where: { tenantId, status: UserStatus.ACTIVE },
        include: {
          roles: { include: { role: true } },
          employee: { select: { fullName: true, employeeCode: true } },
        },
        orderBy: { email: 'asc' },
      });
      return {
        data: users.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.employee?.fullName ?? null,
          employeeCode: user.employee?.employeeCode ?? null,
          roles: user.roles.map(({ role }) => role.name),
        })),
      };
    });
  }

  start(
    tenantId: string,
    dto: CreateImpersonationDto,
    actor: AuthenticatedPlatformUser,
    metadata: Metadata,
  ) {
    return this.database.transaction(async (tx) => {
      const platformSession = await tx.platformSession.findFirst({
        where: {
          id: actor.sessionId,
          platformUserId: actor.platformUserId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (
        !platformSession ||
        Date.now() - platformSession.mfaVerifiedAt.getTime() > MFA_FRESH_MS
      )
        this.denied('Fresh MFA verification is required');
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      if (
        !tenant ||
        (tenant.status !== TenantStatus.ACTIVE &&
          tenant.status !== TenantStatus.TRIAL)
      )
        this.denied('Tenant is not available for impersonation');
      const target = await tx.user.findFirst({
        where: { id: dto.targetUserId, tenantId, status: UserStatus.ACTIVE },
        include: {
          roles: {
            include: {
              role: {
                include: { permissions: { include: { permission: true } } },
              },
            },
          },
        },
      });
      if (!target)
        this.denied('Target user is not an active member of this tenant');
      const requested = [...new Set(dto.scopes)].sort();
      const targetPermissions = new Set(
        target.roles.flatMap(({ role }) =>
          role.permissions.map(({ permission }) => permission.key),
        ),
      );
      const scopeViolation = impersonationScopeViolation({
        role: actor.role,
        requested,
        targetPermissions,
      });
      if (scopeViolation) this.denied(scopeViolation);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + dto.minutes * 60_000);
      const tokenJti = randomUUID();
      const session = await tx.impersonationSession.create({
        data: {
          platformUserId: actor.platformUserId,
          platformSessionId: actor.sessionId,
          tenantId,
          targetUserId: target.id,
          tokenJti,
          scopes: requested,
          reason: dto.reason.trim(),
          expiresAt,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      });
      const snapshot = {
        impersonationSessionId: session.id,
        tenantId,
        targetUserId: target.id,
        scopes: requested,
        reason: session.reason,
        expiresAt,
      };
      await this.systemAudit(
        tx,
        actor,
        metadata,
        'platform.impersonation.started',
        session.id,
        snapshot,
        tenantId,
      );
      await tx.tenantAuditLog.create({
        data: {
          tenantId,
          actorUserId: target.id,
          impersonationSessionId: session.id,
          action: 'support.impersonation.started',
          module: 'identity',
          newValue: this.json(snapshot),
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          requestId: metadata.requestId,
        },
      });
      const roles = target.roles.map(({ role }) => role.name);
      const accessToken = this.jwt.sign(
        {
          sub: target.id,
          email: target.email,
          tenantId,
          roles,
          platformUserId: actor.platformUserId,
          platformSessionId: actor.sessionId,
          impersonationSessionId: session.id,
          scopes: requested,
          jti: tokenJti,
        },
        {
          secret:
            process.env.IMPERSONATION_JWT_SECRET ??
            'dev-impersonation-secret-change-me',
          issuer: 'deltcrm-impersonation',
          audience: 'deltcrm-tenant-api',
          expiresIn: dto.minutes * 60,
        },
      );
      return {
        accessToken,
        refreshToken: null,
        session: snapshot,
        target: { id: target.id, email: target.email, roles },
        workspace: {
          id: tenant.id,
          companyName: tenant.companyName,
          subdomain: tenant.subdomain,
        },
      };
    });
  }

  get(id: string, actor: AuthenticatedPlatformUser) {
    return this.database.transaction(async (tx) => {
      const session = await tx.impersonationSession.findFirst({
        where: {
          id,
          platformUserId: actor.platformUserId,
          platformSessionId: actor.sessionId,
        },
      });
      if (!session) this.notFound();
      return {
        session: {
          ...session,
          active: !session.endedAt && session.expiresAt > new Date(),
        },
      };
    });
  }

  end(
    id: string,
    reason: string,
    actor: AuthenticatedPlatformUser,
    metadata: Metadata,
  ) {
    return this.database.transaction(async (tx) => {
      const session = await tx.impersonationSession.findFirst({
        where: {
          id,
          platformUserId: actor.platformUserId,
          platformSessionId: actor.sessionId,
        },
      });
      if (!session) this.notFound();
      if (session.endedAt) return { session: { ...session, active: false } };
      const ended = await tx.impersonationSession.update({
        where: { id },
        data: {
          endedAt: new Date(),
          endedReason: reason.trim(),
          endedByPlatformUserId: actor.platformUserId,
        },
      });
      const snapshot = {
        impersonationSessionId: id,
        tenantId: session.tenantId,
        targetUserId: session.targetUserId,
        reason: ended.endedReason,
      };
      await this.systemAudit(
        tx,
        actor,
        metadata,
        'platform.impersonation.ended',
        id,
        snapshot,
        session.tenantId,
      );
      await tx.tenantAuditLog.create({
        data: {
          tenantId: session.tenantId,
          actorUserId: session.targetUserId,
          impersonationSessionId: id,
          action: 'support.impersonation.ended',
          module: 'identity',
          newValue: this.json(snapshot),
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          requestId: metadata.requestId,
        },
      });
      return { session: { ...ended, active: false } };
    });
  }

  private systemAudit(
    tx: PlatformTransaction,
    actor: AuthenticatedPlatformUser,
    metadata: Metadata,
    action: string,
    impersonationSessionId: string,
    value: unknown,
    tenantId: string,
  ) {
    return tx.systemAuditLog.create({
      data: {
        actorPlatformUserId: actor.platformUserId,
        impersonationSessionId,
        tenantId,
        action,
        module: 'platform.impersonation',
        newValue: this.json(value),
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        requestId: metadata.requestId,
      },
    });
  }
  private json(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
  private denied(message: string): never {
    throw new ForbiddenException({
      code: 'IMPERSONATION_NOT_ALLOWED',
      message,
    });
  }
  private notFound(): never {
    throw new NotFoundException({
      code: 'IMPERSONATION_NOT_FOUND',
      message: 'Impersonation session not found',
    });
  }
  private notFoundTenant(): never {
    throw new NotFoundException({
      code: 'TENANT_NOT_FOUND',
      message: 'Tenant not found',
    });
  }
}
