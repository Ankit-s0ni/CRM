import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../../../platform/audit/public';
import { TenantContextService } from '../../../../platform/tenancy/public';
import {
  PrismaService,
  PrismaTransaction,
} from '../../../../shared/database/prisma.service';
import { PosSettingsService } from '../../core/application/pos-settings.service';
import {
  GeneratedVariant,
  generateVariantMatrix,
} from '../domain/variant-matrix';
import {
  MAX_IMAGES_PER_PRODUCT,
  PosCatalogStorageService,
} from '../infrastructure/pos-catalog-storage.service';
import {
  CreatePosProductDto,
  GenerateVariantsDto,
  PosProductLookupDto,
  PosProductQueryDto,
  PosVariantDto,
  PutBundleDto,
  UpdatePosProductDto,
} from '../presentation/dto/pos-product.dto';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

@Injectable()
export class PosProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly settings: PosSettingsService,
    private readonly storage: PosCatalogStorageService,
    private readonly audit: AuditService,
  ) {}

  list(query: PosProductQueryDto) {
    const tenantId = this.tenantId();
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(
      query.pageSize ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );

    return this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);

      const where: Prisma.PosProductWhereInput = {
        ...(query.includeInactive ? {} : { isActive: true }),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                { sku: { contains: query.q, mode: 'insensitive' } },
                { barcode: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      };

      const [total, products] = await Promise.all([
        tx.posProduct.count({ where }),
        tx.posProduct.findMany({
          where,
          orderBy: { name: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { category: { select: { id: true, name: true } } },
        }),
      ]);

      return {
        data: await Promise.all(
          products.map((product) => this.withImageUrls(tenantId, product)),
        ),
        meta: { page, pageSize, total },
      };
    });
  }

  get(id: string) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);
      const product = await tx.posProduct.findUnique({
        where: { id },
        include: {
          category: { select: { id: true, name: true } },
          variants: { orderBy: { name: 'asc' } },
          bundle: { include: { components: true } },
        },
      });
      if (!product) throw this.notFound();
      return { data: await this.withImageUrls(tenantId, product) };
    });
  }

  /**
   * Register hot path (MVP-06). One indexed query, returning only what a cart line needs —
   * deliberately not the list serialiser.
   */
  lookup(query: PosProductLookupDto) {
    if (!query.barcode && !query.sku) {
      throw new BadRequestException({
        code: 'POS_LOOKUP_CRITERIA_REQUIRED',
        message: 'Provide either a barcode or a SKU',
      });
    }

    return this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);
      const select = {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        sellingPrice: true,
        taxGroupId: true,
        unitOfMeasureId: true,
        isBundle: true,
        trackInventory: true,
      } satisfies Prisma.PosProductSelect;

      const product = await tx.posProduct.findFirst({
        where: {
          isActive: true,
          ...(query.barcode ? { barcode: query.barcode } : { sku: query.sku }),
        },
        select,
      });
      if (product) return { data: { ...product, variantId: null } };

      // Variants carry their own barcodes; resolve them to the parent so the caller always
      // gets a sellable line.
      const variant = await tx.posVariant.findFirst({
        where: {
          isActive: true,
          ...(query.barcode ? { barcode: query.barcode } : { sku: query.sku }),
        },
        include: { product: { select } },
      });
      if (!variant) throw this.notFound();

      return {
        data: {
          ...variant.product,
          variantId: variant.id,
          name: `${variant.product.name} — ${variant.name}`,
          sku: variant.sku,
          barcode: variant.barcode,
          sellingPrice: variant.sellingPrice ?? variant.product.sellingPrice,
        },
      };
    });
  }

  async create(dto: CreatePosProductDto) {
    const tenantId = this.tenantId();
    this.assertImageCount(dto.imageKeys);
    return this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);
      await this.assertReferences(tx, dto);

      const product = await tx.posProduct
        .create({ data: { ...dto, tenantId } })
        .catch(this.rethrowDuplicate);

      await this.audit.append(tx, {
        tenantId,
        action: 'pos.product.created',
        module: 'POS',
        entityType: 'PosProduct',
        entityId: product.id,
        newValue: product,
      });
      return { data: await this.withImageUrls(tenantId, product) };
    });
  }

  async update(id: string, dto: UpdatePosProductDto) {
    const tenantId = this.tenantId();
    this.assertImageCount(dto.imageKeys);
    return this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);
      const oldValue = await this.mustExist(tx, id);
      await this.assertReferences(tx, dto);

      const product = await tx.posProduct
        .update({ where: { id }, data: dto })
        .catch(this.rethrowDuplicate);

      await this.audit.append(tx, {
        tenantId,
        action: 'pos.product.updated',
        module: 'POS',
        entityType: 'PosProduct',
        entityId: id,
        oldValue,
        newValue: product,
      });
      return { data: await this.withImageUrls(tenantId, product) };
    });
  }

  /**
   * Soft delete only. A product referenced by a historical sale must never disappear, and
   * MVP-06 snapshots names onto sale lines precisely because catalogue rows outlive edits.
   */
  async deactivate(id: string) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);
      const oldValue = await this.mustExist(tx, id);
      const product = await tx.posProduct.update({
        where: { id },
        data: { isActive: false },
      });
      await this.audit.append(tx, {
        tenantId,
        action: 'pos.product.deactivated',
        module: 'POS',
        entityType: 'PosProduct',
        entityId: id,
        oldValue,
        newValue: product,
      });
      return { data: product };
    });
  }

  async presignImage(
    id: string,
    filename: string,
    contentType: string,
    fileSize: number,
  ) {
    const tenantId = this.tenantId();
    await this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);
      await this.mustExist(tx, id);
    });
    return this.storage.presignProductImage(
      tenantId,
      filename,
      contentType,
      fileSize,
    );
  }

  // ---------- variants ----------

  async addVariant(productId: string, dto: PosVariantDto) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);
      await this.mustExist(tx, productId);

      const variant = await tx.posVariant
        .create({ data: { ...dto, productId, tenantId } })
        .catch(this.rethrowDuplicate);
      await tx.posProduct.update({
        where: { id: productId },
        data: { hasVariants: true },
      });

      await this.audit.append(tx, {
        tenantId,
        action: 'pos.variant.created',
        module: 'POS',
        entityType: 'PosVariant',
        entityId: variant.id,
        newValue: variant,
      });
      return { data: variant };
    });
  }

  async removeVariant(productId: string, variantId: string) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);
      const variant = await tx.posVariant.findFirst({
        where: { id: variantId, productId },
      });
      if (!variant) throw this.notFound();

      await tx.posVariant.delete({ where: { id: variantId } });
      const remaining = await tx.posVariant.count({ where: { productId } });
      await tx.posProduct.update({
        where: { id: productId },
        data: { hasVariants: remaining > 0 },
      });

      await this.audit.append(tx, {
        tenantId,
        action: 'pos.variant.deleted',
        module: 'POS',
        entityType: 'PosVariant',
        entityId: variantId,
        oldValue: variant,
      });
      return { data: variant };
    });
  }

  /**
   * Generates the attribute matrix and creates only the combinations that do not exist yet,
   * so regenerating after adding a value is additive rather than destructive.
   */
  async generateVariants(productId: string, dto: GenerateVariantsDto) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);
      const product = await this.mustExist(tx, productId);

      let rows: GeneratedVariant[];
      try {
        rows = generateVariantMatrix(product.sku, dto.attributes);
      } catch (error) {
        throw new BadRequestException({
          code: 'POS_VARIANT_MATRIX_INVALID',
          message: (error as Error).message,
        });
      }

      const existing = await tx.posVariant.findMany({
        where: { productId },
        select: { sku: true },
      });
      const known = new Set(existing.map(({ sku }) => sku));
      const toCreate = rows.filter((row) => !known.has(row.sku));

      if (toCreate.length > 0) {
        await tx.posVariant
          .createMany({
            data: toCreate.map((row) => ({
              tenantId,
              productId,
              name: row.name,
              sku: row.sku,
              attributes: row.attributes,
            })),
          })
          .catch(this.rethrowDuplicate);
        await tx.posProduct.update({
          where: { id: productId },
          data: { hasVariants: true },
        });
      }

      await this.audit.append(tx, {
        tenantId,
        action: 'pos.variant.matrix_generated',
        module: 'POS',
        entityType: 'PosProduct',
        entityId: productId,
        newValue: { created: toCreate.length, total: rows.length },
      });

      return {
        data: await tx.posVariant.findMany({
          where: { productId },
          orderBy: { name: 'asc' },
        }),
        meta: {
          created: toCreate.length,
          skipped: rows.length - toCreate.length,
        },
      };
    });
  }

  // ---------- bundles ----------

  /**
   * Replace-set semantics. Bundles are one level deep: a component may not itself be a
   * bundle, or resolving stock at checkout would need arbitrary recursion.
   *
   * Nothing decrements component stock yet — that is MVP-02 StockService plus MVP-06
   * checkout. Safe today because no sale can exist before MVP-06.
   */
  async putBundle(productId: string, dto: PutBundleDto) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);
      const product = await this.mustExist(tx, productId);

      if (dto.components.length === 0) {
        throw new BadRequestException({
          code: 'POS_BUNDLE_EMPTY',
          message: 'A bundle needs at least one component',
        });
      }

      for (const component of dto.components) {
        if (component.productId === productId) {
          throw new BadRequestException({
            code: 'POS_BUNDLE_SELF_REFERENCE',
            message: 'A bundle cannot contain itself',
          });
        }
        const componentProduct = await tx.posProduct.findUnique({
          where: { id: component.productId },
          select: { id: true, isBundle: true },
        });
        if (!componentProduct) {
          throw new BadRequestException({
            code: 'POS_BUNDLE_COMPONENT_NOT_FOUND',
            message: `Component product ${component.productId} does not exist`,
          });
        }
        if (componentProduct.isBundle) {
          throw new BadRequestException({
            code: 'POS_BUNDLE_NESTED',
            message: 'A bundle cannot contain another bundle',
          });
        }
      }

      const bundle = await tx.posBundle.upsert({
        where: { productId },
        update: { bundlePrice: dto.bundlePrice },
        create: { tenantId, productId, bundlePrice: dto.bundlePrice },
      });
      await tx.posBundleComponent.deleteMany({
        where: { bundleId: bundle.id },
      });
      await tx.posBundleComponent.createMany({
        data: dto.components.map((component) => ({
          tenantId,
          bundleId: bundle.id,
          productId: component.productId,
          variantId: component.variantId ?? null,
          quantity: component.quantity,
        })),
      });
      await tx.posProduct.update({
        where: { id: productId },
        data: { isBundle: true },
      });

      await this.audit.append(tx, {
        tenantId,
        action: 'pos.bundle.updated',
        module: 'POS',
        entityType: 'PosBundle',
        entityId: bundle.id,
        oldValue: product,
        newValue: { bundlePrice: dto.bundlePrice, components: dto.components },
      });

      return {
        data: await tx.posBundle.findUnique({
          where: { productId },
          include: { components: true },
        }),
      };
    });
  }

  // ---------- helpers ----------

  private async withImageUrls<T extends { imageKeys: string[] }>(
    tenantId: string,
    product: T,
  ) {
    return {
      ...product,
      imageUrls: await this.storage.signedImageUrls(
        tenantId,
        product.imageKeys,
      ),
    };
  }

  private assertImageCount(imageKeys?: string[]) {
    if (imageKeys && imageKeys.length > MAX_IMAGES_PER_PRODUCT) {
      throw new BadRequestException({
        code: 'POS_IMAGE_LIMIT',
        message: `At most ${MAX_IMAGES_PER_PRODUCT} images per product`,
      });
    }
  }

  private async assertReferences(
    tx: PrismaTransaction,
    dto: CreatePosProductDto,
  ) {
    const checks: Array<[string | undefined, () => Promise<unknown>, string]> =
      [
        [
          dto.categoryId,
          () => tx.posCategory.findUnique({ where: { id: dto.categoryId } }),
          'categoryId',
        ],
        [
          dto.taxGroupId,
          () => tx.posTaxGroup.findUnique({ where: { id: dto.taxGroupId } }),
          'taxGroupId',
        ],
        [
          dto.unitOfMeasureId,
          () =>
            tx.posUnitOfMeasure.findUnique({
              where: { id: dto.unitOfMeasureId },
            }),
          'unitOfMeasureId',
        ],
      ];
    for (const [value, load, field] of checks) {
      if (!value) continue;
      if (!(await load())) {
        throw new BadRequestException({
          code: 'POS_PRODUCT_REFERENCE_INVALID',
          message: `Unknown ${field}`,
          details: [{ field, messages: ['Does not exist'] }],
        });
      }
    }
  }

  private async mustExist(tx: PrismaTransaction, id: string) {
    const product = await tx.posProduct.findUnique({ where: { id } });
    if (!product) throw this.notFound();
    return product;
  }

  private notFound() {
    return new NotFoundException({
      code: 'POS_PRODUCT_NOT_FOUND',
      message: 'Product not found',
    });
  }

  private rethrowDuplicate = (error: unknown): never => {
    if ((error as { code?: string }).code === 'P2002') {
      const target = (error as { meta?: { target?: string[] } }).meta?.target;
      const field = target?.includes('barcode') ? 'barcode' : 'sku';
      throw new ConflictException({
        code: 'POS_PRODUCT_DUPLICATE',
        message: `A product with this ${field} already exists`,
        details: [{ field, messages: ['Already in use'] }],
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
