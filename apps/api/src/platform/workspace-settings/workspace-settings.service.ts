import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/public';
import { PrismaService } from '../../shared/database/prisma.service';
import { OutboxService } from '../../shared/events/outbox.service';
import { TenantContextService } from '../tenancy/public';
import {
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
      let logoUrl: string | null = null;
      if (settings?.companyLogoKey) {
        try {
          logoUrl = await this.storage.signedLogoUrl(
            this.tenantId(),
            settings.companyLogoKey,
          );
        } catch {
          logoUrl = null;
        }
      }
      return { data: settings ? { ...settings, logoUrl } : null };
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
    if (dto.locale) {
      try {
        new Intl.Locale(dto.locale);
      } catch {
        throw new BadRequestException({
          code: 'LOCALE_INVALID',
          message: 'Locale must be a valid BCP 47 language tag',
        });
      }
    }
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
          runtimeConfigVersion: { increment: 1 },
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
        eventKey: 'tenant.runtime-config.changed.v1',
        payload: {
          tenantId,
          runtimeConfigVersion: settings.runtimeConfigVersion,
          changed: Object.keys(dto),
        },
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

  private updateLogoKey(companyLogoKey: string) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      const oldValue = await tx.tenantSettings.findUnique({
        where: { tenantId },
      });
      const settings = await tx.tenantSettings.upsert({
        where: { tenantId },
        create: { tenantId, companyLogoKey, runtimeConfigVersion: 1 },
        update: {
          companyLogoKey,
          runtimeConfigVersion: { increment: 1 },
        },
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
        eventKey: 'tenant.runtime-config.changed.v1',
        payload: {
          tenantId,
          runtimeConfigVersion: settings.runtimeConfigVersion,
          changed: ['companyLogoKey'],
        },
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
