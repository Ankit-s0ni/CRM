import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, TenantStatus, TokenPurpose, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import type { PrismaTransaction } from '../../shared/database/prisma.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import {
  AcceptInvitationDto,
  CreateInvitationDto,
  ResendInvitationDto,
} from './dto/invitation.dto';

type InvitationPayload = {
  tenantId: string;
  inviterId: string;
  roleIds: string[];
};

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async create(dto: CreateInvitationDto, inviterId: string) {
    const tenantId = this.requireTenantId();
    const email = dto.email.trim().toLowerCase();
    const token = randomBytes(32).toString('hex');

    await this.prisma.forTenant(async (tx) => {
      await this.assertEmailAvailable(tx, email);
      await this.assertRoles(tx, dto.roleIds);
      const pending = await tx.verificationToken.findFirst({
        where: {
          email,
          purpose: TokenPurpose.USER_INVITE,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (pending) {
        throw new ConflictException({
          code: 'INVITATION_PENDING',
          message: 'A pending invitation already exists for this email',
        });
      }

      await this.writeInvitation(tx, {
        tenantId,
        inviterId,
        email,
        roleIds: dto.roleIds,
        token,
      });
    });

    return this.invitationResponse(token);
  }

  async resend(dto: ResendInvitationDto, inviterId: string) {
    const tenantId = this.requireTenantId();
    const email = dto.email.trim().toLowerCase();
    const token = randomBytes(32).toString('hex');
    let invitationFound = false;

    await this.prisma.forTenant(async (tx) => {
      await this.assertEmailAvailable(tx, email);
      const latest = await tx.verificationToken.findFirst({
        where: {
          email,
          purpose: TokenPurpose.USER_INVITE,
          consumedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (!latest) return;

      const payload = this.readPayload(latest.payload);
      await this.assertRoles(tx, payload.roleIds);
      await tx.verificationToken.updateMany({
        where: {
          email,
          purpose: TokenPurpose.USER_INVITE,
          consumedAt: null,
        },
        data: { consumedAt: new Date() },
      });
      await this.writeInvitation(tx, {
        tenantId,
        inviterId,
        email,
        roleIds: payload.roleIds,
        token,
      });
      invitationFound = true;
    });

    return this.invitationResponse(invitationFound ? token : undefined);
  }

  async accept(dto: AcceptInvitationDto) {
    const passwordHash = await argon2.hash(dto.password);
    const tokenHash = this.hash(dto.token);

    return this.prisma.forAdmin(async (tx) => {
      const invitation = await tx.verificationToken.findFirst({
        where: {
          tokenHash,
          purpose: TokenPurpose.USER_INVITE,
          consumedAt: null,
        },
      });
      if (!invitation || invitation.expiresAt <= new Date()) {
        this.throwInvalidInvitation();
      }

      const claimed = await tx.verificationToken.updateMany({
        where: { id: invitation.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (claimed.count !== 1) this.throwInvalidInvitation();

      const payload = this.readPayload(invitation.payload);
      if (payload.tenantId !== invitation.tenantId) {
        this.throwInvalidInvitation();
      }
      const tenant = await tx.tenant.findUnique({
        where: { id: payload.tenantId },
      });
      if (!tenant) this.throwInvalidInvitation();
      if (
        tenant.status !== TenantStatus.ACTIVE &&
        tenant.status !== TenantStatus.TRIAL
      ) {
        throw new ForbiddenException({
          code: 'WORKSPACE_UNAVAILABLE',
          message: 'Workspace is unavailable',
        });
      }

      const roles = await tx.role.findMany({
        where: { id: { in: payload.roleIds }, tenantId: payload.tenantId },
      });
      if (roles.length !== payload.roleIds.length) {
        throw new BadRequestException({
          code: 'INVITATION_ROLES_INVALID',
          message: 'Invitation roles are no longer available',
        });
      }
      const existing = await tx.user.findFirst({
        where: {
          tenantId: payload.tenantId,
          email: { equals: invitation.email, mode: 'insensitive' },
        },
      });
      if (existing) this.throwInvalidInvitation();

      const user = await tx.user.create({
        data: {
          tenantId: payload.tenantId,
          email: invitation.email,
          passwordHash,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
          roles: {
            create: payload.roleIds.map((roleId) => ({ roleId })),
          },
        },
        include: { roles: { include: { role: true } } },
      });
      await tx.verificationToken.updateMany({
        where: {
          tenantId: payload.tenantId,
          email: invitation.email,
          purpose: TokenPurpose.USER_INVITE,
          consumedAt: null,
        },
        data: { consumedAt: new Date() },
      });

      return {
        message: 'Invitation accepted successfully',
        user: {
          id: user.id,
          tenantId: user.tenantId,
          email: user.email,
          roles: user.roles.map(({ role }) => role.name),
        },
      };
    });
  }

  private async writeInvitation(
    tx: PrismaTransaction,
    input: InvitationPayload & { email: string; token: string },
  ) {
    await tx.verificationToken.create({
      data: {
        tenantId: input.tenantId,
        email: input.email,
        purpose: TokenPurpose.USER_INVITE,
        tokenHash: this.hash(input.token),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        invitedBy: input.inviterId,
        payload: {
          tenantId: input.tenantId,
          inviterId: input.inviterId,
          roleIds: input.roleIds,
        },
      },
    });
  }

  private async assertEmailAvailable(tx: PrismaTransaction, email: string) {
    const existing = await tx.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException({
        code: 'USER_EMAIL_EXISTS',
        message: 'This email is already associated with a workspace user',
      });
    }
  }

  private async assertRoles(tx: PrismaTransaction, roleIds: string[]) {
    const roles = await tx.role.findMany({
      where: { id: { in: roleIds }, tenantId: { not: null } },
    });
    if (roles.length !== roleIds.length) {
      throw new BadRequestException({
        code: 'ROLE_NOT_FOUND',
        message: 'One or more roles do not exist in this workspace',
      });
    }
  }

  private readPayload(payload: Prisma.JsonValue): InvitationPayload {
    if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
      this.throwInvalidInvitation();
    }
    const value = payload as Record<string, unknown>;
    if (
      typeof value.tenantId !== 'string' ||
      typeof value.inviterId !== 'string' ||
      !Array.isArray(value.roleIds) ||
      !value.roleIds.every((roleId) => typeof roleId === 'string')
    ) {
      this.throwInvalidInvitation();
    }
    return {
      tenantId: value.tenantId,
      inviterId: value.inviterId,
      roleIds: value.roleIds,
    };
  }

  private invitationResponse(token?: string) {
    return {
      message: 'Invitation sent if an eligible pending invitation exists',
      debugInvitationToken:
        process.env.NODE_ENV === 'production' ? undefined : token,
    };
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private requireTenantId() {
    const tenantId = this.tenantContextService.tenantId;
    if (!tenantId) {
      throw new BadRequestException({
        code: 'WORKSPACE_HEADER_REQUIRED',
        message: 'Workspace header required',
      });
    }
    return tenantId;
  }

  private throwInvalidInvitation(): never {
    throw new UnauthorizedException({
      code: 'INVITATION_INVALID',
      message: 'Invitation is invalid, expired, or already used',
    });
  }
}
