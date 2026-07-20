import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ImportRowStatus, JobStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { TenantContextService } from '../../../shared/tenancy/tenant-context.service';
import {
  EMPLOYEE_IMPORT_FIELDS,
  EMPLOYEE_IMPORT_HEADERS,
  parseEmployeeCsv,
} from './employee-import-parser';
import { EmployeeImportQueue } from './employee-import.queue';
import { EmployeeImportStorageService } from './employee-import-storage.service';
import {
  ListEmployeeImportsQueryDto,
  PresignEmployeeImportDto,
  RegisterEmployeeImportDto,
} from './dto/employee-import.dto';

@Injectable()
export class EmployeeImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContextService: TenantContextService,
    private readonly storage: EmployeeImportStorageService,
    private readonly queue: EmployeeImportQueue,
  ) {}

  schema() {
    return {
      data: {
        format: 'CSV',
        encoding: 'UTF-8',
        maxFileSizeBytes: 5_242_880,
        maxRows: 5000,
        fields: EMPLOYEE_IMPORT_FIELDS,
        templateCsv: `${EMPLOYEE_IMPORT_HEADERS.join(',')}\n`,
        notes: [
          'Create departments and designations before importing employees.',
          'Managers may already exist or be included in the same file; reporting cycles are rejected.',
          'Excel users should save the completed file as CSV UTF-8.',
        ],
      },
    };
  }

  presign(dto: PresignEmployeeImportDto) {
    return this.storage.presign(
      this.requireTenantId(),
      dto.filename,
      dto.contentType,
    );
  }

  async register(dto: RegisterEmployeeImportDto, requestedBy: string) {
    const tenantId = this.requireTenantId();
    this.assertTenantObjectKey(dto.objectKey, tenantId);
    const content = await this.storage.getText(dto.objectKey);
    parseEmployeeCsv(content);

    const job = await this.prisma.forTenant((tx) =>
      tx.importJob.create({
        data: {
          tenantId,
          requestedBy,
          kind: 'EMPLOYEES',
          objectKey: dto.objectKey,
          fileUrl: dto.objectKey,
          originalFilename: dto.filename,
          contentType: dto.contentType,
          fileSize: dto.fileSize,
        },
      }),
    );
    await this.queue.enqueue({ tenantId, importJobId: job.id });
    return this.getById(job.id);
  }

  async list(query: ListEmployeeImportsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    return this.prisma.forTenant(async (tx) => {
      const data = await tx.importJob.findMany({
        where: { kind: 'EMPLOYEES' },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const total = await tx.importJob.count({ where: { kind: 'EMPLOYEES' } });
      return {
        data: data.map((job) => this.serialize(job)),
        pagination: {
          page,
          limit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
      };
    });
  }

  async getById(id: string) {
    const job = await this.prisma.forTenant((tx) =>
      tx.importJob.findUnique({ where: { id } }),
    );
    if (!job) this.throwNotFound();
    return { data: this.serialize(job) };
  }

  async errors(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const job = await tx.importJob.findUnique({ where: { id } });
      if (!job) this.throwNotFound();
      const data = await tx.employeeImportRow.findMany({
        where: { importJobId: id, status: ImportRowStatus.ERROR },
        select: {
          rowNumber: true,
          employeeCode: true,
          errorCode: true,
          errorMessage: true,
          isRetryable: true,
        },
        orderBy: { rowNumber: 'asc' },
      });
      return { data };
    });
  }

  async retry(id: string) {
    const tenantId = this.requireTenantId();
    const job = await this.prisma.forTenant(async (tx) => {
      const existing = await tx.importJob.findUnique({ where: { id } });
      if (!existing) this.throwNotFound();
      if (
        existing.status === JobStatus.RUNNING ||
        existing.status === JobStatus.PENDING
      ) {
        throw new ConflictException({
          code: 'IMPORT_ALREADY_PROCESSING',
          message: 'Import is already processing',
        });
      }
      await tx.employeeImportRow.updateMany({
        where: {
          importJobId: id,
          status: ImportRowStatus.ERROR,
          isRetryable: true,
        },
        data: {
          status: ImportRowStatus.VALIDATED,
          errorCode: null,
          errorMessage: null,
        },
      });
      return tx.importJob.update({
        where: { id },
        data: {
          status: JobStatus.PENDING,
          failureReason: null,
          completedAt: null,
        },
      });
    });
    await this.queue.enqueue({ tenantId, importJobId: job.id });
    return this.getById(job.id);
  }

  private serialize(job: {
    id: string;
    status: JobStatus;
    originalFilename: string | null;
    totalRows: number;
    successRows: number;
    errorRows: number;
    attemptCount: number;
    failureReason: string | null;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
  }) {
    return {
      id: job.id,
      status: job.status,
      filename: job.originalFilename,
      totalRows: job.totalRows,
      successRows: job.successRows,
      errorRows: job.errorRows,
      attemptCount: job.attemptCount,
      failureReason: job.failureReason,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }

  private assertTenantObjectKey(objectKey: string, tenantId: string) {
    if (!objectKey.startsWith(`${tenantId}/employee-imports/`)) {
      throw new BadRequestException({
        code: 'IMPORT_OBJECT_KEY_INVALID',
        message: 'Import object key does not belong to this workspace',
      });
    }
  }

  private requireTenantId() {
    const tenantId = this.tenantContextService.tenantId;
    if (!tenantId) {
      throw new BadRequestException({
        code: 'WORKSPACE_HEADER_REQUIRED',
        message: 'Workspace header required',
      });
    }
    return tenantId;
  }

  private throwNotFound(): never {
    throw new NotFoundException({
      code: 'IMPORT_NOT_FOUND',
      message: 'Employee import was not found',
    });
  }
}
