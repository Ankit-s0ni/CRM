import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ModuleAvailability, Prisma } from '@prisma/client';
import { OutboxService } from '../../../shared/events/outbox.service';
import type { PrismaTransaction } from '../../../shared/database/prisma.service';
import type { AuthenticatedPlatformUser } from '../platform-auth/platform-auth.types';
import { PlatformDatabaseService } from '../platform-auth/platform-database.service';
import {
  CreatePlatformModuleDto,
  ReplaceTenantModulesDto,
  UpdatePlatformModuleDto,
} from './dto/platform-module.dto';
import { moduleAssignmentViolation } from '../platform-policy';

type RequestMetadata = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

@Injectable()
export class PlatformModulesService {
  constructor(
    private readonly database: PlatformDatabaseService,
    private readonly outbox: OutboxService,
  ) {}

  list() {
    return this.database.transaction(async (tx) => ({
      data: await tx.module.findMany({
        include: {
          tenantModules: {
            where: { isActive: true },
            select: { tenantId: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
    }));
  }

  create(
    dto: CreatePlatformModuleDto,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    return this.database
      .transaction(async (tx) => {
        const normalized = this.normalize(dto);
        await this.validateRules(
          tx,
          normalized.key,
          normalized.dependencyKeys,
          normalized.conflictKeys,
        );
        const module = await tx.module.create({ data: normalized });
        await this.systemAudit(
          tx,
          actor,
          metadata,
          'platform.module.created',
          null,
          module,
        );
        return module;
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException({
            code: 'MODULE_KEY_EXISTS',
            message: 'Module key already exists',
          });
        }
        throw error;
      });
  }

  update(
    id: string,
    dto: UpdatePlatformModuleDto,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    return this.database.transaction(async (tx) => {
      const existing = await tx.module.findUnique({ where: { id } });
      if (!existing) this.notFound('Module');
      const dependencyKeys =
        dto.dependencyKeys?.map((key) => key.toUpperCase()) ??
        existing.dependencyKeys;
      const conflictKeys =
        dto.conflictKeys?.map((key) => key.toUpperCase()) ??
        existing.conflictKeys;
      await this.validateRules(tx, existing.key, dependencyKeys, conflictKeys);
      const updated = await tx.module.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description: dto.description?.trim(),
          icon: dto.icon?.trim(),
          availability: dto.availability,
          dependencyKeys,
          conflictKeys,
        },
      });
      await this.systemAudit(
        tx,
        actor,
        metadata,
        'platform.module.updated',
        existing,
        updated,
      );
      return updated;
    });
  }

  tenantModules(tenantId: string) {
    return this.database.transaction(async (tx) => {
      await this.assertTenant(tx, tenantId);
      const modules = await tx.module.findMany({
        include: { tenantModules: { where: { tenantId }, take: 1 } },
        orderBy: { name: 'asc' },
      });
      return {
        data: modules.map(({ tenantModules, ...module }) => ({
          ...module,
          isActive: tenantModules[0]?.isActive ?? false,
          activatedAt: tenantModules[0]?.activatedAt ?? null,
        })),
      };
    });
  }

  replaceTenantModules(
    tenantId: string,
    dto: ReplaceTenantModulesDto,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    const keys = [
      ...new Set(dto.moduleKeys.map((key) => key.toUpperCase())),
    ].sort();
    return this.database.transaction(async (tx) => {
      await this.assertTenant(tx, tenantId);
      const selected = await tx.module.findMany({
        where: { key: { in: keys } },
      });
      if (selected.length !== keys.length)
        this.violation('One or more selected modules do not exist');
      const assignmentViolation = moduleAssignmentViolation(selected, keys);
      if (assignmentViolation) this.violation(assignmentViolation);
      const previous = await tx.tenantModule.findMany({
        where: { tenantId, isActive: true },
        include: { module: true },
      });
      await tx.tenantModule.updateMany({
        where: { tenantId, isActive: true },
        data: { isActive: false },
      });
      const now = new Date();
      for (const module of selected) {
        await tx.tenantModule.upsert({
          where: { tenantId_moduleId: { tenantId, moduleId: module.id } },
          update: {
            isActive: true,
            activatedAt: now,
            activatedBy: actor.platformUserId,
          },
          create: {
            tenantId,
            moduleId: module.id,
            isActive: true,
            activatedAt: now,
            activatedBy: actor.platformUserId,
          },
        });
      }
      const oldKeys = previous.map(({ module }) => module.key).sort();
      await this.systemAudit(
        tx,
        actor,
        metadata,
        'platform.tenant.modules.replaced',
        { tenantId, moduleKeys: oldKeys },
        { tenantId, moduleKeys: keys },
        tenantId,
      );
      await tx.tenantAuditLog.create({
        data: {
          tenantId,
          action: 'workspace.modules.replaced',
          module: 'workspace',
          oldValue: this.json({ moduleKeys: oldKeys }),
          newValue: this.json({ moduleKeys: keys }),
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          requestId: metadata.requestId,
        },
      });
      await this.outbox.append(tx, {
        tenantId,
        eventKey: 'tenant.modules.replaced',
        payload: { tenantId, moduleKeys: keys },
      });
      return this.tenantModulesInTransaction(tx, tenantId);
    });
  }

  private normalize(dto: CreatePlatformModuleDto) {
    return {
      key: dto.key.toUpperCase(),
      name: dto.name.trim(),
      description: dto.description?.trim(),
      icon: dto.icon?.trim(),
      availability: dto.availability ?? ModuleAvailability.AVAILABLE,
      dependencyKeys: dto.dependencyKeys?.map((key) => key.toUpperCase()) ?? [],
      conflictKeys: dto.conflictKeys?.map((key) => key.toUpperCase()) ?? [],
    };
  }

  private async validateRules(
    tx: PrismaTransaction,
    key: string,
    dependencies: string[],
    conflicts: string[],
  ) {
    if (dependencies.includes(key) || conflicts.includes(key))
      this.violation('A module cannot depend on or conflict with itself');
    if (dependencies.some((item) => conflicts.includes(item)))
      this.violation(
        'A module cannot both depend on and conflict with the same module',
      );
    const references = [...new Set([...dependencies, ...conflicts])];
    if (
      references.length &&
      (await tx.module.count({ where: { key: { in: references } } })) !==
        references.length
    )
      this.violation('Dependency or conflict references an unknown module');
  }

  private async tenantModulesInTransaction(
    tx: PrismaTransaction,
    tenantId: string,
  ) {
    const modules = await tx.module.findMany({
      include: { tenantModules: { where: { tenantId }, take: 1 } },
      orderBy: { name: 'asc' },
    });
    return {
      data: modules.map(({ tenantModules, ...module }) => ({
        ...module,
        isActive: tenantModules[0]?.isActive ?? false,
        activatedAt: tenantModules[0]?.activatedAt ?? null,
      })),
    };
  }

  private async assertTenant(tx: PrismaTransaction, id: string) {
    if (!(await tx.tenant.findUnique({ where: { id }, select: { id: true } })))
      this.notFound('Tenant');
  }
  private violation(message: string): never {
    throw new ConflictException({
      code: 'MODULE_DEPENDENCY_VIOLATION',
      message,
    });
  }
  private notFound(entity: string): never {
    throw new NotFoundException({
      code: `${entity.toUpperCase()}_NOT_FOUND`,
      message: `${entity} not found`,
    });
  }
  private systemAudit(
    tx: PrismaTransaction,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
    action: string,
    oldValue: unknown,
    newValue: unknown,
    tenantId?: string,
  ) {
    return tx.systemAuditLog.create({
      data: {
        actorPlatformUserId: actor.platformUserId,
        tenantId,
        action,
        module: 'platform.modules',
        oldValue: this.json(oldValue),
        newValue: this.json(newValue),
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        requestId: metadata.requestId,
      },
    });
  }
  private json(value: unknown) {
    return value == null
      ? undefined
      : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
  }
}
