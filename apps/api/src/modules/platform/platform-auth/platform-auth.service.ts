import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PlatformRole, RevokeReason, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PlatformDatabaseService } from './platform-database.service';
import type { AuthenticatedPlatformUser } from './platform-auth.types';
import { verifyTotp } from './totp';

type RequestMetadata = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly database: PlatformDatabaseService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string, metadata: RequestMetadata) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.database.transaction((tx) =>
      tx.platformUser.findUnique({ where: { email: normalizedEmail } }),
    );

    if (!user) this.invalidAuth();
    if (user.status !== UserStatus.ACTIVE) this.invalidAuth();
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new HttpException(
        {
          code: 'PLATFORM_ACCOUNT_LOCKED',
          message: 'Platform account is temporarily locked',
        },
        HttpStatus.LOCKED,
      );
    }

    const passwordValid = await this.verifyPassword(
      user.passwordHash,
      password,
    );
    if (!passwordValid) {
      const failedLoginCount = user.failedLoginCount + 1;
      await this.database.transaction((tx) =>
        tx.platformUser.update({
          where: { id: user.id },
          data: {
            failedLoginCount,
            lockedUntil:
              failedLoginCount >= 5
                ? new Date(Date.now() + 15 * 60 * 1000)
                : null,
          },
        }),
      );
      this.invalidAuth();
    }

    if (!this.mfaRequired()) {
      return this.issueMvpSession(user, metadata);
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new ForbiddenException({
        code: 'MFA_ENROLLMENT_REQUIRED',
        message: 'Platform MFA must be configured before login',
      });
    }

    const challengeToken = this.randomToken();
    await this.database.transaction(async (tx) => {
      await tx.platformUser.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      });
      await tx.platformAuthChallenge.deleteMany({
        where: { platformUserId: user.id, consumedAt: null },
      });
      await tx.platformAuthChallenge.create({
        data: {
          platformUserId: user.id,
          tokenHash: this.hash(challengeToken),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          createdIp: metadata.ipAddress ?? null,
          userAgent: metadata.userAgent ?? null,
        },
      });
    });

    return { mfaRequired: true, challengeToken, expiresIn: 300 };
  }

  async verifyMfa(
    challengeToken: string,
    code: string,
    metadata: RequestMetadata,
  ) {
    const challenge = await this.database.transaction((tx) =>
      tx.platformAuthChallenge.findUnique({
        where: { tokenHash: this.hash(challengeToken) },
        include: { platformUser: true },
      }),
    );

    if (
      !challenge ||
      challenge.consumedAt ||
      challenge.expiresAt < new Date() ||
      challenge.attemptCount >= 5 ||
      challenge.platformUser.status !== UserStatus.ACTIVE ||
      !challenge.platformUser.mfaSecret
    ) {
      this.invalidAuth();
    }

    if (!verifyTotp(challenge.platformUser.mfaSecret, code)) {
      const attemptCount = challenge.attemptCount + 1;
      await this.database.transaction(async (tx) => {
        await tx.platformAuthChallenge.update({
          where: { id: challenge.id },
          data: {
            attemptCount,
            consumedAt: attemptCount >= 5 ? new Date() : null,
          },
        });
        if (attemptCount >= 5) {
          await tx.platformUser.update({
            where: { id: challenge.platformUserId },
            data: { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) },
          });
        }
      });
      this.invalidAuth();
    }

    const now = new Date();
    const rawRefreshToken = this.randomToken();
    const session = await this.database.transaction(async (tx) => {
      const consumed = await tx.platformAuthChallenge.updateMany({
        where: { id: challenge.id, consumedAt: null },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) return null;

      const created = await tx.platformSession.create({
        data: {
          platformUserId: challenge.platformUserId,
          mfaVerifiedAt: now,
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          createdIp: metadata.ipAddress ?? null,
          userAgent: metadata.userAgent ?? null,
          refreshTokens: {
            create: {
              tokenHash: this.hash(rawRefreshToken),
              familyId: randomUUID(),
              expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
              createdIp: metadata.ipAddress ?? null,
              userAgent: metadata.userAgent ?? null,
            },
          },
        },
      });
      await tx.platformUser.update({
        where: { id: challenge.platformUserId },
        data: {
          lastLoginAt: now,
          lastLoginIp: metadata.ipAddress ?? null,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
      await tx.systemAuditLog.create({
        data: {
          actorPlatformUserId: challenge.platformUserId,
          action: 'platform.auth.login',
          module: 'platform.identity',
          ipAddress: metadata.ipAddress ?? null,
          userAgent: metadata.userAgent ?? null,
          requestId: metadata.requestId ?? null,
        },
      });
      return created;
    });

    if (!session) this.invalidAuth();
    return this.sessionResponse(
      challenge.platformUser,
      session.id,
      session.mfaVerifiedAt,
      rawRefreshToken,
    );
  }

  async refresh(refreshToken: string, metadata: RequestMetadata) {
    const stored = await this.database.transaction((tx) =>
      tx.platformRefreshToken.findUnique({
        where: { tokenHash: this.hash(refreshToken) },
        include: { session: { include: { platformUser: true } } },
      }),
    );
    if (!stored) this.invalidAuth();

    if (stored.revokedAt) {
      await this.database.transaction(async (tx) => {
        await tx.platformRefreshToken.updateMany({
          where: { familyId: stored.familyId, revokedAt: null },
          data: {
            revokedAt: new Date(),
            revokedReason: RevokeReason.REUSE_DETECTED,
          },
        });
        await tx.platformSession.update({
          where: { id: stored.sessionId },
          data: { revokedAt: new Date() },
        });
      });
      this.invalidAuth();
    }

    const now = new Date();
    if (
      stored.expiresAt < now ||
      stored.session.expiresAt < now ||
      stored.session.revokedAt ||
      stored.session.platformUser.status !== UserStatus.ACTIVE
    ) {
      this.invalidAuth();
    }

    const nextRefreshToken = this.randomToken();
    const rotated = await this.database.transaction(async (tx) => {
      const revoked = await tx.platformRefreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: now, revokedReason: RevokeReason.ROTATED },
      });
      if (revoked.count !== 1) return false;
      await tx.platformRefreshToken.create({
        data: {
          sessionId: stored.sessionId,
          tokenHash: this.hash(nextRefreshToken),
          familyId: stored.familyId,
          expiresAt: stored.expiresAt,
          createdIp: metadata.ipAddress ?? null,
          userAgent: metadata.userAgent ?? null,
        },
      });
      await tx.platformSession.update({
        where: { id: stored.sessionId },
        data: { lastSeenAt: now },
      });
      return true;
    });
    if (!rotated) this.invalidAuth();

    return this.sessionResponse(
      stored.session.platformUser,
      stored.sessionId,
      stored.session.mfaVerifiedAt,
      nextRefreshToken,
    );
  }

  async logout(user: AuthenticatedPlatformUser, metadata: RequestMetadata) {
    await this.database.transaction(async (tx) => {
      await tx.platformSession.updateMany({
        where: { id: user.sessionId, platformUserId: user.platformUserId },
        data: { revokedAt: new Date() },
      });
      await tx.platformRefreshToken.updateMany({
        where: { sessionId: user.sessionId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: RevokeReason.LOGOUT },
      });
      await tx.systemAuditLog.create({
        data: {
          actorPlatformUserId: user.platformUserId,
          action: 'platform.auth.logout',
          module: 'platform.identity',
          ipAddress: metadata.ipAddress ?? null,
          userAgent: metadata.userAgent ?? null,
          requestId: metadata.requestId ?? null,
        },
      });
    });
    return { message: 'Logged out successfully' };
  }

  async me(user: AuthenticatedPlatformUser) {
    const platformUser = await this.database.transaction((tx) =>
      tx.platformUser.findUnique({ where: { id: user.platformUserId } }),
    );
    if (!platformUser || platformUser.status !== UserStatus.ACTIVE) {
      this.invalidAuth();
    }
    return {
      user: {
        id: platformUser.id,
        email: platformUser.email,
        role: platformUser.role,
        permissions: await this.permissions(platformUser.role),
      },
      session: {
        id: user.sessionId,
        mfaVerifiedAt: user.mfaVerifiedAt,
      },
    };
  }

  async permissions(role: PlatformRole) {
    const assignments = await this.database.transaction((tx) =>
      tx.platformRolePermission.findMany({
        where: { role },
        include: { permission: true },
      }),
    );
    return assignments.map(({ permission }) => permission.key).sort();
  }

  private async sessionResponse(
    user: { id: string; email: string; role: PlatformRole },
    sessionId: string,
    mfaVerifiedAt: Date,
    refreshToken: string,
  ) {
    const permissions = await this.permissions(user.role);
    const accessToken = this.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        sessionId,
        permissions,
        mfaVerifiedAt: mfaVerifiedAt.toISOString(),
      },
      {
        secret: this.jwtSecret(),
        issuer: 'deltcrm-platform',
        audience: 'deltcrm-platform-api',
        expiresIn: '15m',
      },
    );
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role, permissions },
      session: { id: sessionId, mfaVerifiedAt: mfaVerifiedAt.toISOString() },
    };
  }

  private async verifyPassword(hash: string, password: string) {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  private async issueMvpSession(
    user: { id: string; email: string; role: PlatformRole },
    metadata: RequestMetadata,
  ) {
    const now = new Date();
    const rawRefreshToken = this.randomToken();
    const session = await this.database.transaction(async (tx) => {
      const created = await tx.platformSession.create({
        data: {
          platformUserId: user.id,
          mfaVerifiedAt: now,
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          createdIp: metadata.ipAddress ?? null,
          userAgent: metadata.userAgent ?? null,
          refreshTokens: {
            create: {
              tokenHash: this.hash(rawRefreshToken),
              familyId: randomUUID(),
              expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
              createdIp: metadata.ipAddress ?? null,
              userAgent: metadata.userAgent ?? null,
            },
          },
        },
      });
      await tx.platformUser.update({
        where: { id: user.id },
        data: {
          lastLoginAt: now,
          lastLoginIp: metadata.ipAddress ?? null,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
      await tx.systemAuditLog.create({
        data: {
          actorPlatformUserId: user.id,
          action: 'platform.auth.login',
          module: 'platform.identity',
          newValue: { authenticationMode: 'PASSWORD_MVP' },
          ipAddress: metadata.ipAddress ?? null,
          userAgent: metadata.userAgent ?? null,
          requestId: metadata.requestId ?? null,
        },
      });
      return created;
    });
    return {
      ...(await this.sessionResponse(
        user,
        session.id,
        session.mfaVerifiedAt,
        rawRefreshToken,
      )),
      mfaRequired: false,
    };
  }

  private mfaRequired() {
    if (process.env.PLATFORM_MFA_REQUIRED !== undefined) {
      return process.env.PLATFORM_MFA_REQUIRED.toLowerCase() !== 'false';
    }
    return (
      process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test'
    );
  }

  private randomToken() {
    return randomBytes(32).toString('base64url');
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private jwtSecret() {
    return process.env.PLATFORM_JWT_SECRET ?? 'dev-platform-secret-change-me';
  }

  private invalidAuth(): never {
    throw new UnauthorizedException({
      code: 'PLATFORM_AUTH_INVALID',
      message: 'Invalid platform credentials or verification code',
    });
  }
}
