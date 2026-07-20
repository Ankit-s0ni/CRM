import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ModuleAvailability, Prisma } from '@prisma/client';
import { OutboxService } from '../../../shared/events/outbox.service';
import type { AuthenticatedPlatformUser } from '../platform-auth/platform-auth.types';
import {
  PlatformDatabaseService,
  type PlatformTransaction,
} from '../platform-auth/platform-database.service';
import {
  CreatePlatformModuleDto,
  ReplaceTenantCapabilityOverridesDto,
  ReplaceTenantModulesDto,
  UpdatePlatformModuleDto,
} from './dto/platform-module.dto';
import { moduleAssignmentViolation } from '../platform-policy';
import { bumpRuntimeConfigVersion } from '../../runtime-config/runtime-config-version';
import {
  CatalogSelectionError,
  resolveCatalogSelection,
} from '../catalog-policy';

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

  catalog() {
    return this.database.transaction(async (tx) => ({
      data: await tx.module.findMany({
        where: { customerVisible: true, parentModuleId: null },
        include: {
          capabilities: { orderBy: { displayOrder: 'asc' } },
          addOns: {
            where: { customerVisible: true },
            orderBy: { catalogOrder: 'asc' },
          },
        },
        orderBy: [{ catalogOrder: 'asc' }, { name: 'asc' }],
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
          kind: dto.kind,
          parentModuleId: dto.parentModuleId,
          catalogOrder: dto.catalogOrder,
          customerVisible: dto.customerVisible,
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

  tenantEntitlements(tenantId: string) {
    return this.database.transaction(async (tx) => {
      await this.assertTenant(tx, tenantId);
      const now = new Date();
      const [activeModules, subscription, overrides, capabilities] =
        await Promise.all([
          tx.tenantModule.findMany({
            where: { tenantId, isActive: true },
            include: { module: true },
          }),
          tx.tenantSubscription.findFirst({
            where: {
              tenantId,
              status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED'] },
            },
            include: {
              plan: {
                include: {
                  modules: { include: { module: true } },
                  capabilities: { include: { capability: true } },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          }),
          tx.tenantCapabilityOverride.findMany({
            where: { tenantId },
            include: { capability: true },
            orderBy: { capability: { displayOrder: 'asc' } },
          }),
          tx.moduleCapability.findMany({
            orderBy: { displayOrder: 'asc' },
          }),
        ]);
      const planKeys = new Set(
        subscription?.plan.capabilities
          .filter(({ included }) => included)
          .map(({ capability }) => capability.key) ?? [],
      );
      const activeOverrides = new Map(
        overrides
          .filter(
            (override) =>
              (!override.startsAt || override.startsAt <= now) &&
              (!override.endsAt || override.endsAt > now),
          )
          .map((override) => [override.capability.key, override]),
      );
      return {
        data: {
          plan: subscription
            ? { id: subscription.plan.id, name: subscription.plan.name }
            : null,
          products: activeModules.map(({ module }) => ({
            key: module.key,
            name: module.name,
            kind: module.kind,
            active: true,
            source: subscription?.plan.modules.some(
              ({ module: planModule }) => planModule.key === module.key,
            )
              ? 'PLAN'
              : 'OVERRIDE',
          })),
          capabilities: capabilities.map((capability) => {
            const override = activeOverrides.get(capability.key);
            const included = override
              ? override.mode === 'ENABLE'
              : planKeys.has(capability.key);
            return {
              ...capability,
              included,
              source: override
                ? 'OVERRIDE'
                : planKeys.has(capability.key)
                  ? 'PLAN'
                  : 'NONE',
              override: override
                ? {
                    mode: override.mode,
                    reason: override.reason,
                    startsAt: override.startsAt,
                    endsAt: override.endsAt,
                  }
                : null,
            };
          }),
          overrides,
          limits: { employees: subscription?.plan.maxEmployees ?? 0 },
        },
      };
    });
  }

  replaceTenantCapabilityOverrides(
    tenantId: string,
    dto: ReplaceTenantCapabilityOverridesDto,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    return this.database.transaction(async (tx) => {
      await this.assertTenant(tx, tenantId);
      const keys = dto.overrides.map(({ capabilityKey }) =>
        capabilityKey.toUpperCase(),
      );
      const [capabilities, activeModules, previous, subscription, modules] =
        await Promise.all([
          tx.moduleCapability.findMany(),
          tx.tenantModule.findMany({
            where: { tenantId, isActive: true },
            include: { module: true },
          }),
          tx.tenantCapabilityOverride.findMany({
            where: { tenantId },
            include: { capability: true },
          }),
          tx.tenantSubscription.findFirst({
            where: {
              tenantId,
              status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED'] },
            },
            include: {
              plan: {
                include: {
                  capabilities: { include: { capability: true } },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          }),
          tx.module.findMany(),
        ]);
      const capabilityByKey = new Map(
        capabilities.map((capability) => [capability.key, capability]),
      );
      if (keys.some((key) => !capabilityByKey.has(key))) {
        this.capabilityViolation(
          'CATALOG_ITEM_NOT_FOUND',
          'One or more capabilities do not exist',
        );
      }
      const moduleKeys = new Set(activeModules.map(({ module }) => module.key));
      for (const override of dto.overrides) {
        const capability = capabilityByKey.get(
          override.capabilityKey.toUpperCase(),
        )!;
        if (
          override.mode === 'ENABLE' &&
          (capability.availability !== ModuleAvailability.AVAILABLE ||
            capability.requiredModuleKeys.some((key) => !moduleKeys.has(key)))
        ) {
          this.capabilityViolation(
            'TENANT_OVERRIDE_NOT_ALLOWED',
            `${capability.key} is unavailable or its product is inactive`,
          );
        }
        if (override.mode === 'DISABLE' && capability.isCore) {
          this.capabilityViolation(
            'CORE_CAPABILITY_REQUIRED',
            `${capability.key} is required by its product`,
          );
        }
        if (
          override.startsAt &&
          override.endsAt &&
          new Date(override.endsAt) <= new Date(override.startsAt)
        ) {
          this.capabilityViolation(
            'TENANT_OVERRIDE_NOT_ALLOWED',
            'Override end must be later than its start',
          );
        }
      }
      this.validateOverrideDependencies({
        modules,
        capabilities,
        moduleKeys: [...moduleKeys],
        planCapabilityKeys:
          subscription?.plan.capabilities
            .filter(({ included }) => included)
            .map(({ capability }) => capability.key) ?? [],
        overrides: dto.overrides.map((override) => ({
          capabilityKey: override.capabilityKey.toUpperCase(),
          mode: override.mode,
          startsAt: override.startsAt ? new Date(override.startsAt) : null,
          endsAt: override.endsAt ? new Date(override.endsAt) : null,
        })),
      });
      await tx.tenantCapabilityOverride.deleteMany({ where: { tenantId } });
      for (const override of dto.overrides) {
        if (override.mode === 'INHERIT') continue;
        await tx.tenantCapabilityOverride.create({
          data: {
            tenantId,
            capabilityId: capabilityByKey.get(
              override.capabilityKey.toUpperCase(),
            )!.id,
            mode: override.mode,
            reason: override.reason.trim(),
            startsAt: override.startsAt ? new Date(override.startsAt) : null,
            endsAt: override.endsAt ? new Date(override.endsAt) : null,
            changedBy: actor.platformUserId,
          },
        });
      }
      await this.systemAudit(
        tx,
        actor,
        metadata,
        'platform.tenant.entitlements.replaced',
        previous,
        dto.overrides,
        tenantId,
      );
      await this.outbox.append(tx, {
        tenantId,
        eventKey: 'tenant.entitlements.changed',
        payload: { tenantId, capabilityKeys: keys },
      });
      await bumpRuntimeConfigVersion(tx, tenantId);
      return { data: { updated: true } };
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
      if (selected.some((module) => !module.customerVisible))
        this.violation('Only customer-facing catalog items can be assigned');
      const assignmentViolation = moduleAssignmentViolation(selected, keys);
      if (assignmentViolation) this.violation(assignmentViolation);
      const [previous, managedModules] = await Promise.all([
        tx.tenantModule.findMany({
          where: { tenantId, isActive: true },
          include: { module: true },
        }),
        tx.module.findMany({
          where: {
            customerVisible: true,
            availability: ModuleAvailability.AVAILABLE,
          },
          select: { id: true },
        }),
      ]);
      await tx.tenantModule.updateMany({
        where: {
          tenantId,
          isActive: true,
          moduleId: { in: managedModules.map(({ id }) => id) },
        },
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
      const active = await tx.tenantModule.findMany({
        where: { tenantId, isActive: true },
        include: { module: true },
      });
      const effectiveKeys = active.map(({ module }) => module.key).sort();
      await this.systemAudit(
        tx,
        actor,
        metadata,
        'platform.tenant.modules.replaced',
        { tenantId, moduleKeys: oldKeys },
        { tenantId, moduleKeys: effectiveKeys },
        tenantId,
      );
      await tx.tenantAuditLog.create({
        data: {
          tenantId,
          action: 'workspace.modules.replaced',
          module: 'workspace',
          oldValue: this.json({ moduleKeys: oldKeys }),
          newValue: this.json({ moduleKeys: effectiveKeys }),
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          requestId: metadata.requestId,
        },
      });
      await this.outbox.append(tx, {
        tenantId,
        eventKey: 'tenant.modules.replaced',
        payload: { tenantId, moduleKeys: effectiveKeys },
      });
      await bumpRuntimeConfigVersion(tx, tenantId);
      return this.tenantModulesInTransaction(tx, tenantId);
    });
  }

  private validateOverrideDependencies(input: {
    modules: Array<{
      key: string;
      availability: ModuleAvailability;
      dependencyKeys: string[];
      conflictKeys: string[];
    }>;
    capabilities: Array<{
      key: string;
      availability: ModuleAvailability;
      isCore: boolean;
      requiredModuleKeys: string[];
      dependencyKeys: string[];
      conflictKeys: string[];
    }>;
    moduleKeys: string[];
    planCapabilityKeys: string[];
    overrides: Array<{
      capabilityKey: string;
      mode: 'INHERIT' | 'ENABLE' | 'DISABLE';
      startsAt: Date | null;
      endsAt: Date | null;
    }>;
  }) {
    const now = new Date();
    const checkpoints = [
      now,
      ...input.overrides.flatMap((override) => [
        override.startsAt,
        override.endsAt ? new Date(override.endsAt.getTime() + 1) : null,
      ]),
    ].filter((value): value is Date => Boolean(value && value >= now));

    for (const checkpoint of checkpoints) {
      const selected = new Set(input.planCapabilityKeys);
      const explicitlyDisabled = new Set<string>();
      for (const override of input.overrides) {
        const active =
          (!override.startsAt || override.startsAt <= checkpoint) &&
          (!override.endsAt || override.endsAt > checkpoint);
        if (!active || override.mode === 'INHERIT') continue;
        if (override.mode === 'ENABLE') selected.add(override.capabilityKey);
        if (override.mode === 'DISABLE') {
          selected.delete(override.capabilityKey);
          explicitlyDisabled.add(override.capabilityKey);
        }
      }

      try {
        const resolved = resolveCatalogSelection({
          modules: input.modules,
          capabilities: input.capabilities,
          requestedModuleKeys: input.moduleKeys,
          requestedCapabilityKeys: [...selected],
        });
        const missingDependency = resolved.capabilityKeys.find(
          (key) => !selected.has(key),
        );
        if (missingDependency) {
          this.capabilityViolation(
            'CAPABILITY_DEPENDENCY_REQUIRED',
            `${missingDependency} must remain enabled for the selected capabilities`,
          );
        }
        const disabledDependency = resolved.capabilityKeys.find((key) =>
          explicitlyDisabled.has(key),
        );
        if (disabledDependency) {
          this.capabilityViolation(
            'CAPABILITY_DEPENDENCY_REQUIRED',
            `${disabledDependency} cannot be disabled while a dependent capability is enabled`,
          );
        }
      } catch (error) {
        if (error instanceof CatalogSelectionError) {
          this.capabilityViolation(error.code, error.message);
        }
        throw error;
      }
    }
  }

  private normalize(dto: CreatePlatformModuleDto) {
    return {
      key: dto.key.toUpperCase(),
      name: dto.name.trim(),
      description: dto.description?.trim(),
      icon: dto.icon?.trim(),
      availability: dto.availability ?? ModuleAvailability.AVAILABLE,
      kind: dto.kind,
      parentModuleId: dto.parentModuleId,
      catalogOrder: dto.catalogOrder,
      customerVisible: dto.customerVisible,
      dependencyKeys: dto.dependencyKeys?.map((key) => key.toUpperCase()) ?? [],
      conflictKeys: dto.conflictKeys?.map((key) => key.toUpperCase()) ?? [],
    };
  }

  private async validateRules(
    tx: PlatformTransaction,
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
    tx: PlatformTransaction,
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

  private async assertTenant(tx: PlatformTransaction, id: string) {
    if (!(await tx.tenant.findUnique({ where: { id }, select: { id: true } })))
      this.notFound('Tenant');
  }
  private violation(message: string): never {
    throw new ConflictException({
      code: 'MODULE_DEPENDENCY_VIOLATION',
      message,
    });
  }
  private capabilityViolation(code: string, message: string): never {
    throw new ConflictException({ code, message });
  }
  private notFound(entity: string): never {
    throw new NotFoundException({
      code: `${entity.toUpperCase()}_NOT_FOUND`,
      message: `${entity} not found`,
    });
  }
  private systemAudit(
    tx: PlatformTransaction,
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
