import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PosImportMode } from '@prisma/client';
import { AuditService } from '../../../../platform/audit/public';
import { TenantContextService } from '../../../../platform/tenancy/public';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { PosSettingsService } from '../../core/application/pos-settings.service';
import { PRODUCT_IMPORT_COLUMNS } from '../domain/product-import-parser';
import { PosCatalogStorageService } from '../infrastructure/pos-catalog-storage.service';
import {
  PresignProductImportDto,
  RegisterProductImportDto,
} from '../presentation/dto/product-import.dto';
import { ProductImportQueue } from './product-import.queue';

@Injectable()
export class ProductImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly settings: PosSettingsService,
    private readonly storage: PosCatalogStorageService,
    private readonly queue: ProductImportQueue,
    private readonly audit: AuditService,
  ) {}

  template() {
    return {
      data: {
        columns: PRODUCT_IMPORT_COLUMNS,
        required: ['sku', 'name', 'costPrice', 'sellingPrice'],
        csv: `${PRODUCT_IMPORT_COLUMNS.join(',')}\n`,
      },
    };
  }

  async presign(dto: PresignProductImportDto) {
    const tenantId = this.tenantId();
    await this.prisma.forTenant((tx) => this.settings.assertInitialized(tx));
    return this.storage.presignImportCsv(
      tenantId,
      dto.filename,
      dto.contentType,
      dto.fileSize,
    );
  }

  /**
   * Idempotent by `idempotencyKey`: re-registering the same upload returns the original job
   * instead of importing the file twice.
   */
  async register(dto: RegisterProductImportDto, requestedBy: string) {
    const tenantId = this.tenantId();
    const job = await this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);

      if (dto.idempotencyKey) {
        const existing = await tx.posProductImportJob.findFirst({
          where: { idempotencyKey: dto.idempotencyKey },
        });
        if (existing) return { record: existing, replayed: true };
      }

      const record = await tx.posProductImportJob.create({
        data: {
          tenantId,
          requestedBy,
          objectKey: dto.objectKey,
          originalFilename: dto.originalFilename ?? null,
          contentType: dto.contentType ?? null,
          fileSize: dto.fileSize ?? null,
          mode: dto.mode ?? PosImportMode.CREATE,
          idempotencyKey: dto.idempotencyKey ?? null,
        },
      });

      await this.audit.append(tx, {
        tenantId,
        action: 'pos.product.import_registered',
        module: 'POS',
        entityType: 'PosProductImportJob',
        entityId: record.id,
        newValue: { objectKey: dto.objectKey, mode: record.mode },
      });

      return { record, replayed: false };
    });

    if (!job.replayed) {
      await this.queue.enqueue({ tenantId, importJobId: job.record.id });
    }

    // Inline mode finishes synchronously, so re-read to return the final state.
    const fresh = await this.prisma.forTenant((tx) =>
      tx.posProductImportJob.findUnique({ where: { id: job.record.id } }),
    );
    return { data: fresh ?? job.record, replayed: job.replayed };
  }

  get(id: string) {
    return this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);
      const job = await tx.posProductImportJob.findUnique({ where: { id } });
      if (!job) throw this.notFound();
      return { data: job };
    });
  }

  errors(id: string) {
    return this.prisma.forTenant(async (tx) => {
      await this.settings.assertInitialized(tx);
      const job = await tx.posProductImportJob.findUnique({ where: { id } });
      if (!job) throw this.notFound();
      return {
        data: await tx.posProductImportRow.findMany({
          where: { importJobId: id, status: 'ERROR' },
          orderBy: { rowNumber: 'asc' },
        }),
      };
    });
  }

  private notFound() {
    return new NotFoundException({
      code: 'POS_IMPORT_JOB_NOT_FOUND',
      message: 'Import job not found',
    });
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
