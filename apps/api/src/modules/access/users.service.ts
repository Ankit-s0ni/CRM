import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RevokeReason, UserStatus } from '@prisma/client';
import type { PrismaTransaction } from '../../shared/database/prisma.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import {
  ListUsersQueryDto,
  UpdateUserRolesDto,
  UpdateUserStatusDto,
} from './dto/user-access.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const search = query.search?.trim();
    const where = {
      status: query.status,
      ...(search
        ? { email: { contains: search, mode: 'insensitive' as const } }
        : {}),
    };

    return this.prisma.forTenant(async (tx) => {
      const data = await tx.user.findMany({
        where,
        include: { roles: { include: { role: true } }, employee: true },
        orderBy: { email: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const total = await tx.user.count({ where });

      return {
        data: data.map((user) => this.serializeUser(user)),
        pagination: {
          page,
          limit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
      };
    });
  }

  async replaceRoles(id: string, dto: UpdateUserRolesDto, actorUserId: string) {
    return this.prisma.forTenant(async (tx) => {
      const user = await this.findUser(tx, id);
      const roles = await tx.role.findMany({
        where: { id: { in: dto.roleIds }, tenantId: { not: null } },
      });
      if (roles.length !== dto.roleIds.length) {
        throw new BadRequestException({
          code: 'ROLE_NOT_FOUND',
          message: 'One or more roles do not exist in this workspace',
        });
      }

      const nextRoleIds = new Set(dto.roleIds);
      await this.assertLastBusinessAdmin(tx, user, nextRoleIds, user.status);
      const previousRoleIds = user.roles.map(({ roleId }) => roleId);
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({
        data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
      });

      const updated = await tx.user.findUniqueOrThrow({
        where: { id },
        include: { roles: { include: { role: true } }, employee: true },
      });
      await this.auditService.append(tx, {
        tenantId: updated.tenantId,
        actorUserId,
        action: 'identity.user.roles_replaced',
        module: 'identity',
        entityType: 'User',
        entityId: id,
        oldValue: { roleIds: previousRoleIds },
        newValue: { roleIds: dto.roleIds },
      });
      return { data: this.serializeUser(updated) };
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    actorUserId: string,
  ) {
    return this.prisma.forTenant(async (tx) => {
      const user = await this.findUser(tx, id);
      await this.assertLastBusinessAdmin(tx, user, null, dto.status);

      const updated = await tx.user.update({
        where: { id },
        data: {
          status: dto.status,
          failedLoginCount: dto.status === UserStatus.ACTIVE ? 0 : undefined,
          lockedUntil: dto.status === UserStatus.ACTIVE ? null : undefined,
        },
        include: { roles: { include: { role: true } }, employee: true },
      });

      if (dto.status !== UserStatus.ACTIVE) {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date(), revokedReason: RevokeReason.ADMIN },
        });
      }
      await this.auditService.append(tx, {
        tenantId: updated.tenantId,
        actorUserId,
        action: 'identity.user.status_updated',
        module: 'identity',
        entityType: 'User',
        entityId: id,
        oldValue: { status: user.status },
        newValue: { status: updated.status },
      });

      return { data: this.serializeUser(updated) };
    });
  }

  private async assertLastBusinessAdmin(
    tx: PrismaTransaction,
    user: Awaited<ReturnType<UsersService['findUser']>>,
    nextRoleIds: Set<string> | null,
    nextStatus: UserStatus,
  ) {
    const adminRole = await tx.role.findFirst({
      where: { name: 'BUSINESS_ADMIN', isSystem: true },
    });
    if (!adminRole) return;

    const currentlyAdmin = user.roles.some(
      ({ roleId }) => roleId === adminRole.id,
    );
    const remainsAdmin = nextRoleIds
      ? nextRoleIds.has(adminRole.id)
      : currentlyAdmin;
    const remainsActive = nextStatus === UserStatus.ACTIVE;
    if (!currentlyAdmin || (remainsAdmin && remainsActive)) return;

    const otherActiveAdmins = await tx.user.count({
      where: {
        id: { not: user.id },
        status: UserStatus.ACTIVE,
        roles: { some: { roleId: adminRole.id } },
      },
    });
    if (otherActiveAdmins === 0) {
      throw new ConflictException({
        code: 'LAST_ADMIN_REQUIRED',
        message: 'The workspace must retain one active business administrator',
      });
    }
  }

  private async findUser(tx: PrismaTransaction, id: string) {
    const user = await tx.user.findUnique({
      where: { id },
      include: { roles: true },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }
    return user;
  }

  private serializeUser(user: {
    id: string;
    email: string;
    phone: string | null;
    status: UserStatus;
    emailVerifiedAt: Date | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    roles: Array<{ role: { id: string; name: string; isSystem: boolean } }>;
    employee: { id: string; employeeCode: string; fullName: string } | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      roles: user.roles.map(({ role }) => role),
      employee: user.employee
        ? {
            id: user.employee.id,
            employeeCode: user.employee.employeeCode,
            fullName: user.employee.fullName,
          }
        : null,
    };
  }
}
