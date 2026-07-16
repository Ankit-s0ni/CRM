import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaTransaction } from '../../shared/database/prisma.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import { AuditService } from '../../shared/audit/audit.service';
import {
  CreateRoleDto,
  ReplaceRolePermissionsDto,
  UpdateRoleDto,
} from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContextService: TenantContextService,
    private readonly auditService: AuditService,
  ) {}

  async permissions() {
    const permissions = await this.prisma.forTenant((tx) =>
      tx.permission.findMany({ orderBy: { key: 'asc' } }),
    );
    const groups = new Map<string, string[]>();
    for (const permission of permissions) {
      const module = permission.key.split('.')[0] ?? 'other';
      groups.set(module, [...(groups.get(module) ?? []), permission.key]);
    }

    return {
      data: [...groups.entries()].map(([module, keys]) => ({ module, keys })),
    };
  }

  async list() {
    const data = await this.prisma.forTenant((tx) =>
      tx.role.findMany({
        where: { tenantId: { not: null } },
        include: {
          permissions: { include: { permission: true } },
          _count: { select: { users: true } },
        },
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      }),
    );

    return {
      data: data.map((role) => this.serializeRole(role)),
    };
  }

  async matrix() {
    const [catalog, roles] = await Promise.all([
      this.permissions(),
      this.list(),
    ]);
    return { permissions: catalog.data, roles: roles.data };
  }

  async getById(id: string) {
    const role = await this.prisma.forTenant((tx) =>
      tx.role.findUnique({
        where: { id },
        include: {
          permissions: { include: { permission: true } },
          _count: { select: { users: true } },
        },
      }),
    );
    if (!role || !role.tenantId) this.throwNotFound();
    return { data: this.serializeRole(role) };
  }

  async create(dto: CreateRoleDto, actorUserId: string) {
    const tenantId = this.requireTenantId();
    const name = this.normalizeName(dto.name);

    return this.prisma.forTenant(async (tx) => {
      await this.ensureUniqueName(tx, name);
      const permissions = await this.resolvePermissions(tx, dto.permissionKeys);
      const role = await tx.role.create({
        data: {
          tenantId,
          name,
          isSystem: false,
          permissions: {
            create: permissions.map((permission) => ({
              permissionId: permission.id,
            })),
          },
        },
        include: {
          permissions: { include: { permission: true } },
          _count: { select: { users: true } },
        },
      });
      await this.auditService.append(tx, {
        tenantId,
        actorUserId,
        action: 'identity.role.created',
        module: 'identity',
        entityType: 'Role',
        entityId: role.id,
        newValue: {
          name: role.name,
          permissionKeys: role.permissions.map(
            ({ permission }) => permission.key,
          ),
        },
      });
      return { data: this.serializeRole(role) };
    });
  }

  async update(id: string, dto: UpdateRoleDto, actorUserId: string) {
    if (dto.name === undefined) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Role name is required',
      });
    }
    const name = this.normalizeName(dto.name);

    return this.prisma.forTenant(async (tx) => {
      const role = await this.findTenantRole(tx, id);
      this.assertCustomRole(role);
      await this.ensureUniqueName(tx, name, id);
      const updated = await tx.role.update({ where: { id }, data: { name } });
      await this.auditService.append(tx, {
        tenantId: role.tenantId!,
        actorUserId,
        action: 'identity.role.updated',
        module: 'identity',
        entityType: 'Role',
        entityId: id,
        oldValue: { name: role.name },
        newValue: { name: updated.name },
      });
      return { data: updated };
    });
  }

  async replacePermissions(
    id: string,
    dto: ReplaceRolePermissionsDto,
    actorUserId: string,
  ) {
    return this.prisma.forTenant(async (tx) => {
      const existingRole = await this.findTenantRole(tx, id);
      const previous = await tx.rolePermission.findMany({
        where: { roleId: id },
        include: { permission: true },
      });
      const permissions = await this.resolvePermissions(tx, dto.permissionKeys);

      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: id,
          permissionId: permission.id,
        })),
      });

      const role = await tx.role.findUniqueOrThrow({
        where: { id },
        include: {
          permissions: { include: { permission: true } },
          _count: { select: { users: true } },
        },
      });
      await this.auditService.append(tx, {
        tenantId: existingRole.tenantId!,
        actorUserId,
        action: 'identity.role.permissions_replaced',
        module: 'identity',
        entityType: 'Role',
        entityId: id,
        oldValue: {
          permissionKeys: previous.map(({ permission }) => permission.key),
        },
        newValue: { permissionKeys: dto.permissionKeys },
      });
      return { data: this.serializeRole(role) };
    });
  }

  async remove(id: string, actorUserId: string) {
    return this.prisma.forTenant(async (tx) => {
      const role = await this.findTenantRole(tx, id);
      this.assertCustomRole(role);
      const assignedUsers = await tx.userRole.count({ where: { roleId: id } });
      if (assignedUsers > 0) {
        throw new ConflictException({
          code: 'ROLE_IN_USE',
          message: 'Role cannot be deleted while it is assigned to users',
          details: { assignedUsers },
        });
      }

      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.role.delete({ where: { id } });
      await this.auditService.append(tx, {
        tenantId: role.tenantId!,
        actorUserId,
        action: 'identity.role.deleted',
        module: 'identity',
        entityType: 'Role',
        entityId: id,
        oldValue: { name: role.name },
      });
      return { success: true };
    });
  }

  private async findTenantRole(tx: PrismaTransaction, id: string) {
    const role = await tx.role.findUnique({ where: { id } });
    if (!role || !role.tenantId) this.throwNotFound();
    return role;
  }

  private async resolvePermissions(
    tx: PrismaTransaction,
    permissionKeys: string[],
  ) {
    const uniqueKeys = [...new Set(permissionKeys)];
    const permissions = await tx.permission.findMany({
      where: { key: { in: uniqueKeys } },
    });
    if (permissions.length !== uniqueKeys.length) {
      const found = new Set(permissions.map(({ key }) => key));
      throw new BadRequestException({
        code: 'PERMISSION_NOT_FOUND',
        message: 'One or more permission keys do not exist',
        details: { unknownKeys: uniqueKeys.filter((key) => !found.has(key)) },
      });
    }
    return permissions;
  }

  private async ensureUniqueName(
    tx: PrismaTransaction,
    name: string,
    excludeId?: string,
  ) {
    const duplicate = await tx.role.findFirst({
      where: {
        tenantId: { not: null },
        id: excludeId ? { not: excludeId } : undefined,
        name: { equals: name, mode: 'insensitive' },
      },
    });
    if (duplicate) {
      throw new ConflictException({
        code: 'ROLE_NAME_EXISTS',
        message: 'A role with this name already exists',
      });
    }
  }

  private assertCustomRole(role: { isSystem: boolean }) {
    if (role.isSystem) {
      throw new ConflictException({
        code: 'SYSTEM_ROLE_IMMUTABLE',
        message: 'System roles cannot be renamed or deleted',
      });
    }
  }

  private serializeRole(role: {
    id: string;
    name: string;
    isSystem: boolean;
    permissions: Array<{ permission: { key: string } }>;
    _count: { users: number };
  }) {
    return {
      id: role.id,
      name: role.name,
      isSystem: role.isSystem,
      permissionKeys: role.permissions
        .map(({ permission }) => permission.key)
        .sort(),
      assignedUsers: role._count.users,
    };
  }

  private normalizeName(value: string) {
    return value.trim().replace(/\s+/g, ' ');
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

  private throwNotFound(): never {
    throw new NotFoundException({
      code: 'ROLE_NOT_FOUND',
      message: 'Role not found',
    });
  }
}
