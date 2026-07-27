import { ConflictException, Injectable } from '@nestjs/common';
import { AuditService } from '../../../../platform/audit/public';
import { TenantContextService } from '../../../../platform/tenancy/public';
import {
  PrismaService,
  PrismaTransaction,
} from '../../../../shared/database/prisma.service';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { UpdatePosSettingsDto } from '../presentation/dto/pos-settings.dto';
import { ensurePosTenantDefaults } from './ensure-pos-tenant-defaults';

const POS_AUDIT_MODULE = 'POS';

@Injectable()
export class PosSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * Idempotent. Re-running is how an existing tenant is backfilled, so a second call
   * returns the same settings rather than failing.
   */
  async setup() {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      const existing = await tx.posSettings.findUnique({ where: { tenantId } });
      const alreadyInitialized = Boolean(existing?.initializedAt);
      const settings = await ensurePosTenantDefaults(tx, tenantId);

      if (!alreadyInitialized) {
        await this.audit.append(tx, {
          tenantId,
          action: 'pos.setup.completed',
          module: POS_AUDIT_MODULE,
          entityType: 'PosSettings',
          entityId: tenantId,
          newValue: settings,
        });
        await this.outbox.append(tx, {
          tenantId,
          eventKey: 'pos.tenant.initialized.v1',
          payload: { tenantId },
        });
      }

      return { data: settings, alreadyInitialized };
    });
  }

  get() {
    return this.prisma.forTenant(async (tx) => ({
      data: await this.requireInitialized(tx),
    }));
  }

  async update(dto: UpdatePosSettingsDto) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      const oldValue = await this.requireInitialized(tx);
      const settings = await tx.posSettings.update({
        where: { tenantId },
        data: dto,
      });

      await this.audit.append(tx, {
        tenantId,
        action: 'pos.settings.updated',
        module: POS_AUDIT_MODULE,
        entityType: 'PosSettings',
        entityId: tenantId,
        oldValue,
        newValue: settings,
      });
      await this.outbox.append(tx, {
        tenantId,
        eventKey: 'pos.settings.changed.v1',
        payload: { tenantId, changed: Object.keys(dto) },
      });

      return { data: settings };
    });
  }

  listOutlets() {
    return this.prisma.forTenant(async (tx) => {
      await this.requireInitialized(tx);
      return {
        data: await tx.posOutlet.findMany({ orderBy: { name: 'asc' } }),
      };
    });
  }

  /**
   * POS is inert until setup has run. Reporting that distinctly from "no permission"
   * lets the web shell route the user to the setup wizard instead of an error page.
   */
  private async requireInitialized(tx: PrismaTransaction) {
    const settings = await tx.posSettings.findUnique({
      where: { tenantId: this.tenantId() },
    });
    if (!settings?.initializedAt) {
      throw new ConflictException({
        code: 'POS_NOT_INITIALIZED',
        message: 'POS has not been set up for this workspace yet',
      });
    }
    return settings;
  }

  private tenantId() {
    const tenantId = this.tenantContext.tenantId;
    if (!tenantId) {
      throw new ConflictException({
        code: 'TENANT_CONTEXT_MISSING',
        message: 'Tenant context is required',
      });
    }
    return tenantId;
  }
}
