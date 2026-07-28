import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { PosSettingsService } from '../../core/application/pos-settings.service';
import { PRODUCT_IMPORT_COLUMNS } from '../domain/product-import-parser';

function escapeCsv(value: string | null | undefined) {
  if (value === null || value === undefined) return '';
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

@Injectable()
export class ProductExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: PosSettingsService,
  ) {}

  /**
   * Emits exactly PRODUCT_IMPORT_COLUMNS in order, so an export round-trips back through
   * the importer. Decimals are stringified from Prisma's Decimal, never through a float.
   */
  toCsv() {
    return this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);
      const products = await tx.posProduct.findMany({
        orderBy: { sku: 'asc' },
        include: {
          category: { select: { name: true } },
          taxGroup: { select: { name: true } },
          unitOfMeasure: { select: { code: true } },
        },
      });

      const lines = [PRODUCT_IMPORT_COLUMNS.join(',')];
      for (const product of products) {
        lines.push(
          [
            product.sku,
            product.name,
            product.barcode,
            product.description,
            product.brand,
            product.category?.name,
            product.taxGroup?.name,
            product.unitOfMeasure?.code,
            product.costPrice.toString(),
            product.sellingPrice.toString(),
            product.mrp?.toString(),
            product.wholesalePrice?.toString(),
            String(product.trackInventory),
            product.reorderPoint?.toString(),
            product.reorderQuantity?.toString(),
          ]
            .map(escapeCsv)
            .join(','),
        );
      }
      return `${lines.join('\n')}\n`;
    });
  }
}
