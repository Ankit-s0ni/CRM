import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  LoginFailReason,
  Prisma,
  RevokeReason,
  TenantStatus,
  TokenPurpose,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../shared/database/prisma.service';
import { VerificationTokensService } from './verification-tokens.service';
import { TenantContextService } from '../tenancy/public';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
} from '../../shared/authorization/permissions.constants';
import { provisionTenantAttendanceDefaults } from '../tenancy/public';
import { TenantAssetStorageService } from '../workspace/public';
import {
  TRANSACTIONAL_EMAIL_PORT,
  type TransactionalEmailPort,
} from '../notifications/public';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly verificationTokensService: VerificationTokensService,
    private readonly tenantAssets: TenantAssetStorageService,
    @Inject(TRANSACTIONAL_EMAIL_PORT)
    private readonly transactionalEmail: TransactionalEmailPort,
  ) {}

  async signup(input: {
    companyName: string;
    workEmail: string;
    password: string;
    subdomain: string;
    employeeCount?: string;
  }) {
    const normalizedEmail = input.workEmail.trim().toLowerCase();
    const normalizedSubdomain = input.subdomain.trim().toLowerCase();

    const existingTenant = await this.prisma.forAdmin((tx) =>
      tx.tenant.findUnique({
        where: { subdomain: normalizedSubdomain },
      }),
    );

    if (existingTenant) {
      throw new ConflictException('That workspace subdomain is already taken');
    }

    const passwordHash = await argon2.hash(input.password);

    const tenant = await this.prisma.forAdmin(async (tx) => {
      const createdTenant = await tx.tenant.create({
        data: {
          companyName: input.companyName.trim(),
          subdomain: normalizedSubdomain,
          status: 'TRIAL',
        },
      });

      await tx.tenantSettings.create({
        data: { tenantId: createdTenant.id },
      });
      await provisionTenantAttendanceDefaults(tx, createdTenant.id);

      const trialPlan = await tx.subscriptionPlan.upsert({
        where: { name: 'Starter Trial' },
        update: {},
        create: {
          name: 'Starter Trial',
          pricePerUser: 0,
          maxEmployees: 500,
          billingPeriod: 'MONTHLY',
        },
      });

      const periodStart = new Date();
      const periodEnd = new Date(periodStart);
      periodEnd.setUTCDate(periodEnd.getUTCDate() + 14);

      await tx.tenantSubscription.create({
        data: {
          tenantId: createdTenant.id,
          planId: trialPlan.id,
          status: 'TRIALING',
          seatCount: this.employeeCountToSeats(input.employeeCount),
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });

      await tx.permission.createMany({
        data: Object.values(PERMISSIONS).map((key) => ({ key })),
        skipDuplicates: true,
      });

      const permissions = await tx.permission.findMany({
        where: { key: { in: Object.values(PERMISSIONS) } },
      });
      const permissionIdByKey = new Map(
        permissions.map((permission) => [permission.key, permission.id]),
      );
      const roles = new Map<string, { id: string }>();

      for (const [roleName, rolePermissions] of Object.entries(
        DEFAULT_ROLE_PERMISSIONS,
      )) {
        const role = await tx.role.create({
          data: {
            tenantId: createdTenant.id,
            name: roleName,
            isSystem: true,
          },
        });
        roles.set(roleName, role);

        await tx.rolePermission.createMany({
          data: rolePermissions.map((permissionKey) => ({
            roleId: role.id,
            permissionId: permissionIdByKey.get(permissionKey)!,
          })),
        });
      }

      const adminRole = roles.get('BUSINESS_ADMIN');
      if (!adminRole) {
        throw new Error('BUSINESS_ADMIN role provisioning failed');
      }

      const adminUser = await tx.user.create({
        data: {
          tenantId: createdTenant.id,
          email: normalizedEmail,
          passwordHash,
          status: 'ACTIVE',
        },
      });

      await tx.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      });

      const attendanceModule = await tx.module.upsert({
        where: { key: 'ATTENDANCE' },
        update: { name: 'Attendance' },
        create: { key: 'ATTENDANCE', name: 'Attendance' },
      });

      await tx.tenantModule.create({
        data: {
          tenantId: createdTenant.id,
          moduleId: attendanceModule.id,
          isActive: true,
          activatedAt: new Date(),
          activatedBy: adminUser.id,
        },
      });

      return {
        tenant: createdTenant,
        user: adminUser,
      };
    });

    const verificationToken = await TenantContextService.run(
      { tenantId: tenant.tenant.id },
      () =>
        this.verificationTokensService.createToken(
          tenant.tenant.id,
          tenant.user.email,
          TokenPurpose.EMAIL_VERIFY,
          {
            userId: tenant.user.id,
            employeeCount: input.employeeCount ?? null,
          },
          tenant.user.id,
        ),
    );
    const emailDelivery = await this.transactionalEmail.sendVerificationCode(
      tenant.user.email,
      verificationToken,
    );

    return {
      message: 'Workspace created. Verify your email to continue.',
      nextStep: 'EMAIL_VERIFY',
      tenantId: tenant.tenant.id,
      email: tenant.user.email,
      subdomain: tenant.tenant.subdomain,
      emailDelivery,
      debugVerificationToken:
        process.env.NODE_ENV === 'production' ? undefined : verificationToken,
    };
  }

  async verifyToken(token: string, purpose: TokenPurpose) {
    const verificationToken = await this.verificationTokensService.consumeToken(
      token,
      purpose,
    );

    if (purpose === TokenPurpose.EMAIL_VERIFY) {
      const payload = this.readPayload(verificationToken.payload);
      const userId =
        typeof payload?.userId === 'string'
          ? payload.userId
          : verificationToken.userId;

      if (!userId) {
        throw new UnauthorizedException('Verification token is invalid');
      }

      await this.prisma.forTenant((tx) =>
        tx.user.update({
          where: { id: userId },
          data: { emailVerifiedAt: new Date() },
        }),
      );
    }

    return {
      message: 'Token verified successfully',
      tokenId: verificationToken.id,
      purpose: verificationToken.purpose,
      email: verificationToken.email,
      payload: verificationToken.payload,
    };
  }

  async resendEmailVerification(email: string, tenantId: string) {
    const user = await this.prisma.forTenant((tx) =>
      tx.user.findFirst({
        where: { email: email.trim().toLowerCase() },
      }),
    );

    if (!user) {
      throw new UnauthorizedException('User not found for this workspace');
    }

    const token = await this.verificationTokensService.createToken(
      tenantId,
      user.email,
      TokenPurpose.EMAIL_VERIFY,
      { userId: user.id },
      user.id,
    );
    const emailDelivery = await this.transactionalEmail.sendVerificationCode(
      user.email,
      token,
    );

    return {
      message:
        emailDelivery === 'SENT'
          ? 'A fresh verification code has been sent'
          : 'The code was created, but email delivery is temporarily unavailable',
      emailDelivery,
      debugVerificationToken:
        process.env.NODE_ENV === 'production' ? undefined : token,
    };
  }

  async login(
    email: string,
    passwordPlain: string,
    ipAddress?: string,
    userAgent?: string,
    deviceUuid?: string,
  ) {
    const user = await this.prisma.forTenant(async (tx) => {
      return tx.user.findFirst({
        where: { email },
        include: { tenant: true, roles: { include: { role: true } } },
      });
    });

    if (!user) {
      await this.recordLoginAttempt(
        email,
        false,
        LoginFailReason.UNKNOWN_USER,
        ipAddress,
        userAgent,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    this.assertTenantAvailable(user.tenant.status);

    if (user.status !== 'ACTIVE') {
      await this.recordLoginAttempt(
        email,
        false,
        LoginFailReason.DISABLED,
        ipAddress,
        userAgent,
      );
      throw new ForbiddenException('User account is suspended');
    }

    // TODO: Re-enable email verification when email service is ready
    // if (!user.emailVerifiedAt) {
    //   throw new ForbiddenException('Email verification required');
    // }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.recordLoginAttempt(
        email,
        false,
        LoginFailReason.LOCKED,
        ipAddress,
        userAgent,
      );
      throw new ForbiddenException(
        'Account temporarily locked due to too many failed attempts',
      );
    }

    const isPasswordValid = await this.verifyPassword(
      user.passwordHash,
      passwordPlain,
    );

    if (!isPasswordValid) {
      // Increment failed_login_count
      const failedCount = (user.failedLoginCount || 0) + 1;
      const updates: Prisma.UserUpdateInput = { failedLoginCount: failedCount };

      if (failedCount >= 5) {
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await this.prisma.forTenant((tx) =>
        tx.user.update({
          where: { id: user.id },
          data: updates,
        }),
      );

      await this.recordLoginAttempt(
        email,
        false,
        LoginFailReason.BAD_PASSWORD,
        ipAddress,
        userAgent,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.forTenant((tx) =>
      tx.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress ?? null,
        },
      }),
    );

    await this.recordLoginAttempt(email, true, null, ipAddress, userAgent);

    return this.buildSession(user, ipAddress, userAgent, undefined, deviceUuid);
  }

  async mobileLogin(
    email: string,
    passwordPlain: string,
    ipAddress?: string,
    userAgent?: string,
    deviceUuid?: string,
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const candidates = await this.prisma.forAdmin((tx) =>
      tx.user.findMany({
        where: {
          email: normalizedEmail,
          roles: { some: { role: { name: 'EMPLOYEE' } } },
        },
        select: { tenantId: true, passwordHash: true },
      }),
    );
    const matches = (
      await Promise.all(
        candidates.map(async (candidate) => ({
          tenantId: candidate.tenantId,
          valid: await this.verifyPassword(
            candidate.passwordHash,
            passwordPlain,
          ),
        })),
      )
    ).filter((candidate) => candidate.valid);

    // Never guess when identical employee credentials exist in multiple tenants.
    if (matches.length !== 1) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return TenantContextService.run({ tenantId: matches[0].tenantId }, () =>
      this.login(
        normalizedEmail,
        passwordPlain,
        ipAddress,
        userAgent,
        deviceUuid,
      ),
    );
  }

  async refresh(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
    deviceUuid?: string,
  ) {
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.prisma.forTenant((tx) =>
      tx.refreshToken.findFirst({
        where: { tokenHash },
      }),
    );

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.revokedAt) {
      if (storedToken.familyId) {
        await this.revokeTokenFamily(
          storedToken.familyId,
          RevokeReason.REUSE_DETECTED,
        );
      }
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    if (storedToken.expiresAt < new Date()) {
      if (storedToken.familyId) {
        await this.revokeTokenFamily(
          storedToken.familyId,
          storedToken.revokedReason ?? RevokeReason.LOGOUT,
        );
      }
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    const user = await this.prisma.forTenant((tx) =>
      tx.user.findUnique({
        where: { id: storedToken.userId },
        include: { tenant: true, roles: { include: { role: true } } },
      }),
    );

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is no longer active');
    }

    this.assertTenantAvailable(user.tenant.status);

    if (storedToken.deviceId) {
      const boundDevice = await this.prisma.forTenant((tx) =>
        tx.registeredDevice.findUnique({
          where: { id: storedToken.deviceId! },
        }),
      );
      if (!boundDevice || boundDevice.status !== 'ACTIVE') {
        await this.revokeTokenFamily(storedToken.familyId, RevokeReason.ADMIN);
        throw new UnauthorizedException({
          code: 'DEVICE_SESSION_REVOKED',
          message: 'The device session is no longer active',
        });
      }
      if (deviceUuid && deviceUuid !== boundDevice.deviceUuid) {
        throw new UnauthorizedException({
          code: 'DEVICE_SESSION_MISMATCH',
          message: 'The refresh token belongs to another device',
        });
      }
    }

    await this.prisma.forTenant((tx) =>
      tx.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          revokedAt: new Date(),
          revokedReason: RevokeReason.LOGOUT,
        },
      }),
    );

    return this.buildSession(
      user,
      ipAddress,
      userAgent,
      storedToken.familyId,
      deviceUuid,
      storedToken.deviceId,
    );
  }

  async logout(userId: string, refreshToken: string) {
    await this.prisma.forTenant((tx) =>
      tx.refreshToken.updateMany({
        where: {
          userId,
          tokenHash: this.hashToken(refreshToken),
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokedReason: RevokeReason.LOGOUT,
        },
      }),
    );

    return { message: 'Logged out successfully' };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.forTenant((tx) =>
      tx.user.findUnique({
        where: { id: userId },
        include: {
          tenant: { include: { settings: true } },
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

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is no longer active');
    }

    this.assertTenantAvailable(user.tenant.status);

    let logoUrl = safeLogoUrl(user.tenant.companyLogo);
    if (user.tenant.settings?.companyLogoKey) {
      try {
        logoUrl = await this.tenantAssets.signedLogoUrl(
          user.tenant.id,
          user.tenant.settings.companyLogoKey,
        );
      } catch {
        logoUrl = null;
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        status: user.status,
        emailVerified: Boolean(user.emailVerifiedAt),
        roles: user.roles.map(({ role }) => role.name),
        permissions: [
          ...new Set(
            user.roles.flatMap(({ role }) =>
              role.permissions.map(({ permission }) => permission.key),
            ),
          ),
        ],
      },
      workspace: {
        id: user.tenant.id,
        companyName: user.tenant.companyName,
        subdomain: user.tenant.subdomain,
        status: user.tenant.status,
        logoUrl,
      },
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.forTenant((tx) =>
      tx.user.findFirst({
        where: { email },
      }),
    );

    if (!user) {
      return { message: 'Password reset link sent if account exists' };
    }

    const token = await this.verificationTokensService.createToken(
      user.tenantId,
      user.email,
      TokenPurpose.PASSWORD_RESET,
      { userId: user.id },
      user.id,
    );

    return {
      message: 'Password reset link sent if account exists',
      debugResetToken:
        process.env.NODE_ENV === 'production' ? undefined : token,
    };
  }

  async resetPassword(token: string, password: string) {
    const verificationToken = await this.verificationTokensService.consumeToken(
      token,
      TokenPurpose.PASSWORD_RESET,
    );

    const payload = this.readPayload(verificationToken.payload);
    const userId =
      typeof payload?.userId === 'string'
        ? payload.userId
        : verificationToken.userId;

    if (!userId) {
      throw new UnauthorizedException('Password reset token is invalid');
    }

    const passwordHash = await argon2.hash(password);

    await this.prisma.forTenant((tx) =>
      tx.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      }),
    );

    const user = await this.prisma.forTenant((tx) =>
      tx.user.findUnique({
        where: { id: userId },
      }),
    );

    if (user) {
      await this.revokeUserRefreshTokens(user.id, RevokeReason.PASSWORD_CHANGE);
    }

    return { message: 'Password updated successfully' };
  }

  private async buildSession(
    user: {
      id: string;
      email: string;
      tenantId: string;
      tenant?: {
        subdomain: string;
      } | null;
      roles: Array<{ role: { name: string } }>;
    },
    ipAddress?: string,
    userAgent?: string,
    familyId: string = randomUUID(),
    deviceUuid?: string,
    preferredDeviceId?: string | null,
  ) {
    const device = await this.resolveSessionDevice(
      user.id,
      deviceUuid,
      preferredDeviceId,
    );
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles.map((r) => r.role.name),
      ...(device?.status === 'ACTIVE' ? { deviceId: device.id } : {}),
    };

    const accessToken = this.jwtService.sign(payload);
    const rawRefreshToken = randomUUID();
    const refreshTokenHash = this.hashToken(rawRefreshToken);

    await this.prisma.forTenant((tx) =>
      tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: refreshTokenHash,
          familyId,
          deviceId: device?.status === 'ACTIVE' ? device.id : null,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdIp: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      }),
    );

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        workspace: user.tenant?.subdomain ?? '',
        roles: user.roles.map(({ role }) => role.name),
        device: device
          ? {
              id: device.id,
              status: device.status,
              isPrimary: device.isPrimary,
            }
          : null,
      },
    };
  }

  private async resolveSessionDevice(
    userId: string,
    deviceUuid?: string,
    preferredDeviceId?: string | null,
  ) {
    if (!deviceUuid && !preferredDeviceId) return null;
    const device = await this.prisma.forTenant((tx) =>
      tx.registeredDevice.findFirst({
        where: {
          ...(preferredDeviceId
            ? { id: preferredDeviceId }
            : { deviceUuid, employee: { userId } }),
        },
      }),
    );
    if (!device) return null;
    if (device.status === 'BLOCKED' || device.status === 'REPLACED') {
      throw new ForbiddenException({
        code:
          device.status === 'BLOCKED' ? 'DEVICE_BLOCKED' : 'DEVICE_REPLACED',
        message: 'This device is no longer permitted to access the workspace',
      });
    }
    return device;
  }

  private async recordLoginAttempt(
    email: string,
    success: boolean,
    failureReason: LoginFailReason | null,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.prisma.forTenant((tx) =>
      tx.loginAttempt.create({
        data: {
          tenantId: this.prisma['tenantContextService'].tenantId ?? null,
          email,
          ipAddress: ipAddress ?? 'unknown',
          userAgent: userAgent ?? null,
          success,
          failureReason: success ? undefined : (failureReason ?? undefined),
        },
      }),
    );
  }

  private async revokeUserRefreshTokens(
    userId: string,
    revokedReason: RevokeReason,
  ) {
    await this.prisma.forTenant((tx) =>
      tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason },
      }),
    );
  }

  private async revokeTokenFamily(
    familyId: string,
    revokedReason: RevokeReason,
  ) {
    await this.prisma.forTenant((tx) =>
      tx.refreshToken.updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason },
      }),
    );
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async verifyPassword(passwordHash: string, passwordPlain: string) {
    try {
      if (passwordHash === 'dummy_hash' && passwordPlain === 'dummy_password') {
        return true;
      }
      return await argon2.verify(passwordHash, passwordPlain);
    } catch {
      return false;
    }
  }

  private readPayload(payload: Prisma.JsonValue | null) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }

    return payload as Record<string, unknown>;
  }

  private assertTenantAvailable(status: TenantStatus) {
    if (status === TenantStatus.SUSPENDED) {
      throw new ForbiddenException({
        code: 'TENANT_SUSPENDED',
        message: 'Workspace is suspended. Please contact billing.',
      });
    }

    if (status === TenantStatus.CHURNED) {
      throw new ForbiddenException({
        code: 'WORKSPACE_UNAVAILABLE',
        message: 'Workspace is no longer available.',
      });
    }
  }

  private employeeCountToSeats(employeeCount?: string) {
    const counts = employeeCount?.match(/\d+/g)?.map(Number) ?? [];
    const requestedSeats = counts.length ? Math.max(...counts) : 25;
    return Math.max(1, Math.min(requestedSeats, 500));
  }
}

function safeLogoUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
