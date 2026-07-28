import {
  BadRequestException,
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
  CreatePosCategoryDto,
  UpdatePosCategoryDto,
} from '../presentation/dto/pos-category.dto';

@Injectable()
export class PosCategoryService {
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
        data: await tx.posCategory.findMany({
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        }),
      };
    });
  }

  async create(dto: CreatePosCategoryDto) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);
      if (dto.parentId) await this.mustExist(tx, dto.parentId);

      const category = await tx.posCategory
        .create({ data: { ...dto, tenantId } })
        .catch(this.rethrowDuplicate);

      await this.audit.append(tx, {
        tenantId,
        action: 'pos.category.created',
        module: 'POS',
        entityType: 'PosCategory',
        entityId: category.id,
        newValue: category,
      });
      return { data: category };
    });
  }

  async update(id: string, dto: UpdatePosCategoryDto) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);
      const oldValue = await this.mustExist(tx, id);

      if (dto.parentId !== undefined && dto.parentId !== oldValue.parentId) {
        if (dto.parentId) await this.assertNoCycle(tx, id, dto.parentId);
      }

      const category = await tx.posCategory
        .update({ where: { id }, data: dto })
        .catch(this.rethrowDuplicate);

      await this.audit.append(tx, {
        tenantId,
        action: 'pos.category.updated',
        module: 'POS',
        entityType: 'PosCategory',
        entityId: id,
        oldValue,
        newValue: category,
      });
      return { data: category };
    });
  }

  /**
   * Categories are never hard-deleted while anything points at them — a product whose
   * category vanished would silently lose its grouping. In use means deactivate only.
   */
  async remove(id: string) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);
      const category = await this.mustExist(tx, id);

      const [products, children] = await Promise.all([
        tx.posProduct.count({ where: { categoryId: id } }),
        tx.posCategory.count({ where: { parentId: id } }),
      ]);

      if (products > 0 || children > 0) {
        const deactivated = await tx.posCategory.update({
          where: { id },
          data: { isActive: false },
        });
        await this.audit.append(tx, {
          tenantId,
          action: 'pos.category.deactivated',
          module: 'POS',
          entityType: 'PosCategory',
          entityId: id,
          oldValue: category,
          newValue: deactivated,
        });
        return { data: deactivated, deactivated: true };
      }

      await tx.posCategory.delete({ where: { id } });
      await this.audit.append(tx, {
        tenantId,
        action: 'pos.category.deleted',
        module: 'POS',
        entityType: 'PosCategory',
        entityId: id,
        oldValue: category,
      });
      return { data: category, deactivated: false };
    });
  }

  private async mustExist(tx: PrismaTransaction, id: string) {
    const category = await tx.posCategory.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException({
        code: 'POS_CATEGORY_NOT_FOUND',
        message: 'Category not found',
      });
    }
    return category;
  }

  /**
   * Walking up from the proposed parent must never reach the category being moved,
   * otherwise the tree becomes a ring and every recursive read hangs.
   */
  private async assertNoCycle(
    tx: PrismaTransaction,
    id: string,
    parentId: string,
  ) {
    let cursor: string | null = parentId;
    const seen = new Set<string>([id]);
    while (cursor) {
      if (seen.has(cursor)) {
        throw new BadRequestException({
          code: 'POS_CATEGORY_CYCLE',
          message: 'A category cannot be moved beneath itself',
        });
      }
      seen.add(cursor);
      const parent: { parentId: string | null } | null =
        await tx.posCategory.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        });
      cursor = parent?.parentId ?? null;
    }
  }

  private rethrowDuplicate = (error: unknown): never => {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ConflictException({
        code: 'POS_CATEGORY_DUPLICATE',
        message: 'A category with this name already exists under this parent',
        details: [{ field: 'name', messages: ['Already in use'] }],
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
