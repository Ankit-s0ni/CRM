import { Injectable, Logger } from '@nestjs/common';
import {
  ImportRowStatus,
  JobStatus,
  PosImportMode,
  Prisma,
} from '@prisma/client';
import { TenantJobContextRunner } from '../../../../platform/tenancy/public';
import {
  PrismaService,
  PrismaTransaction,
} from '../../../../shared/database/prisma.service';
import {
  ParsedProductRow,
  ProductImportFormatError,
  ProductRowError,
  parseProductCsv,
} from '../domain/product-import-parser';
import { PosCatalogStorageService } from '../infrastructure/pos-catalog-storage.service';

export interface ProductImportJobData {
  tenantId: string;
  importJobId: string;
}

/** Rows are applied in batches so one bad row never rolls back the whole file. */
const BATCH_SIZE = 50;

@Injectable()
export class ProductImportProcessor {
  private readonly logger = new Logger(ProductImportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: TenantJobContextRunner,
    private readonly storage: PosCatalogStorageService,
  ) {}

  async process(data: ProductImportJobData) {
    await this.runner.run(data, () => this.run(data.importJobId));
  }

  private async run(importJobId: string) {
    const job = await this.prisma.forTenant((tx) =>
      tx.posProductImportJob.findUnique({ where: { id: importJobId } }),
    );
    if (!job || job.status === JobStatus.COMPLETED) return;

    await this.prisma.forTenant((tx) =>
      tx.posProductImportJob.update({
        where: { id: importJobId },
        data: {
          status: JobStatus.RUNNING,
          startedAt: new Date(),
          attemptCount: { increment: 1 },
        },
      }),
    );

    let text: string;
    let parsed: { rows: ParsedProductRow[]; errors: ProductRowError[] };
    try {
      text = await this.storage.getText(job.objectKey);
      parsed = parseProductCsv(text);
    } catch (error) {
      const message =
        error instanceof ProductImportFormatError
          ? error.message
          : `Could not read the uploaded file: ${(error as Error).message}`;
      await this.prisma.forTenant((tx) =>
        tx.posProductImportJob.update({
          where: { id: importJobId },
          data: {
            status: JobStatus.FAILED,
            failureReason: message,
            completedAt: new Date(),
          },
        }),
      );
      return;
    }

    const rowErrors: ProductRowError[] = [...parsed.errors];
    let successRows = 0;

    for (let index = 0; index < parsed.rows.length; index += BATCH_SIZE) {
      const batch = parsed.rows.slice(index, index + BATCH_SIZE);
      const outcome = await this.prisma.forTenant((tx) =>
        this.applyBatch(tx, job.tenantId, importJobId, job.mode, batch),
      );
      successRows += outcome.applied;
      rowErrors.push(...outcome.errors);
    }

    await this.prisma.forTenant((tx) =>
      tx.posProductImportJob.update({
        where: { id: importJobId },
        data: {
          status: JobStatus.COMPLETED,
          totalRows: parsed.rows.length + parsed.errors.length,
          successRows,
          errorRows: rowErrors.length,
          rowErrors: rowErrors as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      }),
    );

    this.logger.log(
      `POS product import ${importJobId} finished: ${successRows} applied, ${rowErrors.length} errors`,
    );
  }

  private async applyBatch(
    tx: PrismaTransaction,
    tenantId: string,
    importJobId: string,
    mode: PosImportMode,
    rows: ParsedProductRow[],
  ) {
    const errors: ProductRowError[] = [];
    let applied = 0;

    // Resolve human-readable references once per batch rather than per row.
    const [categories, taxGroups, units] = await Promise.all([
      tx.posCategory.findMany({ select: { id: true, name: true } }),
      tx.posTaxGroup.findMany({ select: { id: true, name: true } }),
      tx.posUnitOfMeasure.findMany({ select: { id: true, code: true } }),
    ]);
    const categoryByName = new Map(
      categories.map((row) => [row.name.toLowerCase(), row.id]),
    );
    const taxGroupByName = new Map(
      taxGroups.map((row) => [row.name.toLowerCase(), row.id]),
    );
    const unitByCode = new Map(
      units.map((row) => [row.code.toLowerCase(), row.id]),
    );

    for (const row of rows) {
      const rowFailures: ProductRowError[] = [];
      const resolve = (
        value: string | undefined,
        lookup: Map<string, string>,
        column: string,
      ) => {
        if (!value) return undefined;
        const id = lookup.get(value.toLowerCase());
        if (!id) {
          rowFailures.push({
            rowNumber: row.rowNumber,
            column,
            message: `Unknown ${column} "${value}"`,
          });
        }
        return id;
      };

      const categoryId = resolve(row.category, categoryByName, 'category');
      const taxGroupId = resolve(row.taxGroup, taxGroupByName, 'taxGroup');
      const unitOfMeasureId = resolve(row.unit, unitByCode, 'unit');

      if (rowFailures.length > 0) {
        errors.push(...rowFailures);
        await this.recordRow(tx, tenantId, importJobId, row, {
          status: ImportRowStatus.ERROR,
          errorMessage: rowFailures.map(({ message }) => message).join('; '),
        });
        continue;
      }

      const data = {
        tenantId,
        name: row.name,
        sku: row.sku,
        barcode: row.barcode ?? null,
        description: row.description ?? null,
        brand: row.brand ?? null,
        categoryId: categoryId ?? null,
        taxGroupId: taxGroupId ?? null,
        unitOfMeasureId: unitOfMeasureId ?? null,
        costPrice: row.costPrice,
        sellingPrice: row.sellingPrice,
        mrp: row.mrp ?? null,
        wholesalePrice: row.wholesalePrice ?? null,
        trackInventory: row.trackInventory,
        reorderPoint: row.reorderPoint ?? null,
        reorderQuantity: row.reorderQuantity ?? null,
      };

      try {
        const product =
          mode === PosImportMode.UPSERT
            ? await tx.posProduct.upsert({
                where: { tenantId_sku: { tenantId, sku: row.sku } },
                update: data,
                create: data,
              })
            : await tx.posProduct.create({ data });

        applied += 1;
        await this.recordRow(tx, tenantId, importJobId, row, {
          status: ImportRowStatus.IMPORTED,
          productId: product.id,
        });
      } catch (error) {
        const duplicate = (error as { code?: string }).code === 'P2002';
        const message = duplicate
          ? `A product with this SKU or barcode already exists`
          : `Could not save the row: ${(error as Error).message}`;
        errors.push({
          rowNumber: row.rowNumber,
          column: duplicate ? 'sku' : 'row',
          message,
        });
        await this.recordRow(tx, tenantId, importJobId, row, {
          status: ImportRowStatus.ERROR,
          errorMessage: message,
        });
      }
    }

    return { applied, errors };
  }

  private recordRow(
    tx: PrismaTransaction,
    tenantId: string,
    importJobId: string,
    row: ParsedProductRow,
    outcome: {
      status: ImportRowStatus;
      errorMessage?: string;
      productId?: string;
    },
  ) {
    return tx.posProductImportRow.upsert({
      where: {
        tenantId_importJobId_rowNumber: {
          tenantId,
          importJobId,
          rowNumber: row.rowNumber,
        },
      },
      update: {
        status: outcome.status,
        errorMessage: outcome.errorMessage ?? null,
        productId: outcome.productId ?? null,
      },
      create: {
        tenantId,
        importJobId,
        rowNumber: row.rowNumber,
        sku: row.sku,
        rawData: row.raw,
        status: outcome.status,
        errorMessage: outcome.errorMessage ?? null,
        productId: outcome.productId ?? null,
      },
    });
  }
}
