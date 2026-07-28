import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../../../../platform/audit/public';
import { TenantContextService } from '../../../../platform/tenancy/public';
import {
  PrismaService,
  PrismaTransaction,
} from '../../../../shared/database/prisma.service';
import { PosSettingsService } from '../../core/application/pos-settings.service';
import {
  CreatePosUnitDto,
  UpdatePosUnitDto,
} from '../presentation/dto/pos-unit.dto';

@Injectable()
export class PosUnitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly settings: PosSettingsService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);
      return {
        data: await tx.posUnitOfMeasure.findMany({ orderBy: { code: 'asc' } }),
      };
    });
  }

  async create(dto: CreatePosUnitDto) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);
      if (dto.baseUnitId) await this.mustExist(tx, dto.baseUnitId);

      const unit = await tx.posUnitOfMeasure
        .create({ data: { ...dto, tenantId } })
        .catch(this.rethrowDuplicate);

      await this.audit.append(tx, {
        tenantId,
        action: 'pos.unit.created',
        module: 'POS',
        entityType: 'PosUnitOfMeasure',
        entityId: unit.id,
        newValue: unit,
      });
      return { data: unit };
    });
  }

  async update(id: string, dto: UpdatePosUnitDto) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);
      const oldValue = await this.mustExist(tx, id);
      if (dto.baseUnitId) {
        if (dto.baseUnitId === id) {
          throw new ConflictException({
            code: 'POS_UNIT_SELF_BASE',
            message: 'A unit cannot convert into itself',
          });
        }
        await this.mustExist(tx, dto.baseUnitId);
      }

      const unit = await tx.posUnitOfMeasure
        .update({ where: { id }, data: dto })
        .catch(this.rethrowDuplicate);

      await this.audit.append(tx, {
        tenantId,
        action: 'pos.unit.updated',
        module: 'POS',
        entityType: 'PosUnitOfMeasure',
        entityId: id,
        oldValue,
        newValue: unit,
      });
      return { data: unit };
    });
  }

  /** Units in use are deactivated, never deleted — see PosCategoryService.remove. */
  async remove(id: string) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);
      const unit = await this.mustExist(tx, id);

      const [products, derived] = await Promise.all([
        tx.posProduct.count({ where: { unitOfMeasureId: id } }),
        tx.posUnitOfMeasure.count({ where: { baseUnitId: id } }),
      ]);

      if (products > 0 || derived > 0) {
        const deactivated = await tx.posUnitOfMeasure.update({
          where: { id },
          data: { isActive: false },
        });
        return { data: deactivated, deactivated: true };
      }

      await tx.posUnitOfMeasure.delete({ where: { id } });
      await this.audit.append(tx, {
        tenantId,
        action: 'pos.unit.deleted',
        module: 'POS',
        entityType: 'PosUnitOfMeasure',
        entityId: id,
        oldValue: unit,
      });
      return { data: unit, deactivated: false };
    });
  }

  private async mustExist(tx: PrismaTransaction, id: string) {
    const unit = await tx.posUnitOfMeasure.findUnique({ where: { id } });
    if (!unit) {
      throw new NotFoundException({
        code: 'POS_UNIT_NOT_FOUND',
        message: 'Unit of measure not found',
      });
    }
    return unit;
  }

  private rethrowDuplicate = (error: unknown): never => {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ConflictException({
        code: 'POS_UNIT_DUPLICATE',
        message: 'A unit with this code already exists',
        details: [{ field: 'code', messages: ['Already in use'] }],
      });
    }
    throw error;
  };

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
