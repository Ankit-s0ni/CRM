import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditService } from '../../shared/audit/audit.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { OutboxService } from '../../shared/events/outbox.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import {
  CompleteOnboardingDto,
  LogoPresignDto,
  UpdateTenantSettingsDto,
} from './dto/workspace-settings.dto';
import { TenantAssetStorageService } from './tenant-asset-storage.service';
import {
  assertClockTime,
  assertTimezone,
  normalizeWeeklyOffs,
} from './workspace-settings.rules';

@Injectable()
export class WorkspaceSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly storage: TenantAssetStorageService,
  ) {}

  get() {
    return this.prisma.forTenant(async (tx) => {
      const settings = await tx.tenantSettings.findUnique({
        where: { tenantId: this.tenantId() },
      });
      return { data: settings };
    });
  }

  async update(dto: UpdateTenantSettingsDto) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'At least one setting must be provided',
      });
    }
    if (dto.timezone) assertTimezone(dto.timezone);
    for (const time of [
      dto.workingDayStart,
      dto.workingDayEnd,
      dto.absenteeAlertTime,
    ]) {
      if (time) assertClockTime(time);
    }
    const weeklyOffs =
      dto.weeklyOffs === undefined
        ? undefined
        : normalizeWeeklyOffs(dto.weeklyOffs);
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      const oldValue = await tx.tenantSettings.findUnique({
        where: { tenantId },
      });
      const settings = await tx.tenantSettings.upsert({
        where: { tenantId },
        create: {
          tenantId,
          ...dto,
          weeklyOffs,
        },
        update: {
          ...dto,
          weeklyOffs,
        },
      });
      await this.audit.append(tx, {
        tenantId,
        action: 'workspace.settings.updated',
        module: 'WORKSPACE',
        entityType: 'TenantSettings',
        entityId: tenantId,
        oldValue,
        newValue: settings,
      });
      await this.outbox.append(tx, {
        tenantId,
        eventKey: 'workspace.settings.updated',
        payload: { tenantId, updatedAt: settings.updatedAt.toISOString() },
      });
      return { data: settings };
    });
  }

  async presignLogo(dto: LogoPresignDto) {
    const result = await this.storage.presignLogo(
      this.tenantId(),
      dto.filename,
      dto.contentType,
      dto.fileSize,
    );
    await this.updateLogoKey(result.objectKey);
    return { data: result };
  }

  status() {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      const [tenant, settings, departments, employees] = await Promise.all([
        tx.tenant.findUnique({
          where: { id: tenantId },
          select: { onboardingCompletedAt: true },
        }),
        tx.tenantSettings.findUnique({ where: { tenantId } }),
        tx.department.count(),
        tx.employee.count(),
      ]);
      return {
        data: {
          completed: Boolean(tenant?.onboardingCompletedAt),
          currentStep: settings?.onboardingStep ?? 1,
          steps: {
            company: Boolean(settings),
            organization: departments > 0,
            employees: employees > 0,
          },
        },
      };
    });
  }

  complete(dto: CompleteOnboardingDto) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant)
        throw new BadRequestException({
          code: 'WORKSPACE_NOT_FOUND',
          message: 'Workspace not found',
        });
      if (tenant.onboardingCompletedAt)
        return {
          data: { completed: true, completedAt: tenant.onboardingCompletedAt },
        };
      const completedAt = new Date();
      await tx.tenant.update({
        where: { id: tenantId },
        data: { onboardingCompletedAt: completedAt },
      });
      await this.audit.append(tx, {
        tenantId,
        action: 'workspace.onboarding.completed',
        module: 'WORKSPACE',
        entityType: 'Tenant',
        entityId: tenantId,
        newValue: { completedAt, progress: dto.progress },
      });
      await this.outbox.append(tx, {
        tenantId,
        eventKey: 'workspace.onboarding.completed',
        payload: { tenantId, completedAt: completedAt.toISOString() },
      });
      return { data: { completed: true, completedAt } };
    });
  }

  private updateLogoKey(companyLogoKey: string) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      const oldValue = await tx.tenantSettings.findUnique({
        where: { tenantId },
      });
      const settings = await tx.tenantSettings.upsert({
        where: { tenantId },
        create: { tenantId, companyLogoKey },
        update: { companyLogoKey },
      });
      await this.audit.append(tx, {
        tenantId,
        action: 'workspace.logo.updated',
        module: 'WORKSPACE',
        entityType: 'TenantSettings',
        entityId: tenantId,
        oldValue: { companyLogoKey: oldValue?.companyLogoKey ?? null },
        newValue: { companyLogoKey },
      });
      await this.outbox.append(tx, {
        tenantId,
        eventKey: 'workspace.logo.updated',
        payload: { tenantId, companyLogoKey },
      });
      return settings;
    });
  }

  private tenantId() {
    const tenantId = this.context.tenantId;
    if (!tenantId)
      throw new BadRequestException({
        code: 'WORKSPACE_HEADER_REQUIRED',
        message: 'Workspace header required',
      });
    return tenantId;
  }
}
