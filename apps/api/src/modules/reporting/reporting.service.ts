import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobStatus, Prisma, ReportFormat, ReportType } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { PrivateObjectStorageService } from '../../shared/storage/private-object-storage.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import { CreateReportDto, ReportListQueryDto } from './dto/reporting.dto';
import { ReportingQueue } from './reporting.queue';

@Injectable()
export class ReportingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly queue: ReportingQueue,
    private readonly storage: PrivateObjectStorageService,
  ) {}

  async create(reportType: ReportType, dto: CreateReportDto) {
    await this.assertReportEntitlement(reportType);
    const tenantId = this.required(this.context.tenantId);
    const requestedBy = this.required(this.context.userId);
    const filters = normalizeFilters(reportType, dto);
    const format = dto.format ?? ReportFormat.CSV;
    if (format !== ReportFormat.CSV) {
      throw new BadRequestException({
        code: 'REPORT_FORMAT_UNSUPPORTED',
        message: 'Sprint 7 report contracts currently support CSV exports',
      });
    }
    const report = await this.prisma.forTenant((tx) =>
      tx.reportExport.create({
        data: {
          tenantId,
          requestedBy,
          reportType,
          period: filters.period ?? `${filters.startDate}:${filters.endDate}`,
          format,
          contractVersion: 1,
          filters: filters,
          sourceCutoff: new Date(),
        },
      }),
    );
    await this.queue.enqueue({ tenantId, reportId: report.id });
    return { data: await this.find(report.id) };
  }

  async list(query: ReportListQueryDto) {
    const status = query.status as JobStatus | undefined;
    if (status && !Object.values(JobStatus).includes(status)) {
      this.invalid('Unknown report status');
    }
    const payrollEnabled = await this.moduleEnabled('PAYROLL');
    if (query.reportType === ReportType.PAYROLL && !payrollEnabled) {
      this.moduleDenied('PAYROLL');
    }
    return this.prisma.forTenant(async (tx) => {
      const where: Prisma.ReportExportWhereInput = {
        reportType:
          query.reportType ??
          (payrollEnabled ? undefined : { not: ReportType.PAYROLL }),
        status,
      };
      const [data, total] = await Promise.all([
        tx.reportExport.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.reportExport.count({ where }),
      ]);
      return {
        data,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          pages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  get(id: string) {
    return this.find(id).then((data) => ({ data }));
  }

  async download(id: string) {
    const report = await this.find(id);
    if (
      report.status === JobStatus.PENDING ||
      report.status === JobStatus.RUNNING
    ) {
      throw new HttpException(
        {
          code: 'REPORT_NOT_READY',
          message: 'Report generation is still in progress',
          status: report.status,
        },
        202,
      );
    }
    if (
      report.status === JobStatus.FAILED ||
      !report.objectKey ||
      !report.expiresAt
    ) {
      throw new BadRequestException({
        code: report.failureCode ?? 'REPORT_FAILED',
        message: report.failureMessage ?? 'Report generation failed',
      });
    }
    return {
      data: {
        ...(await this.storage.signedReportDownload(
          this.required(this.context.tenantId),
          report.id,
          report.objectKey,
          report.expiresAt,
        )),
        checksum: report.checksum,
        expiresAt: report.expiresAt,
      },
    };
  }

  private find(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const report = await tx.reportExport.findUnique({ where: { id } });
      if (!report) {
        throw new NotFoundException({
          code: 'REPORT_NOT_FOUND',
          message: 'Report export was not found',
        });
      }
      if (report.reportType === ReportType.PAYROLL) {
        const payrollEnabled = await tx.tenantModule.findFirst({
          where: {
            tenantId: this.required(this.context.tenantId),
            isActive: true,
            module: { key: 'PAYROLL', availability: 'AVAILABLE' },
          },
          select: { id: true },
        });
        if (!payrollEnabled) this.moduleDenied('PAYROLL');
      }
      return report;
    });
  }

  private async assertReportEntitlement(reportType: ReportType) {
    if (
      reportType === ReportType.PAYROLL &&
      !(await this.moduleEnabled('PAYROLL'))
    ) {
      this.moduleDenied('PAYROLL');
    }
  }

  private moduleEnabled(moduleKey: string) {
    const tenantId = this.required(this.context.tenantId);
    return this.prisma.forTenant((tx) =>
      tx.tenantModule
        .findFirst({
          where: {
            tenantId,
            isActive: true,
            module: { key: moduleKey, availability: 'AVAILABLE' },
          },
          select: { id: true },
        })
        .then(Boolean),
    );
  }

  private moduleDenied(moduleKey: string): never {
    throw new ForbiddenException({
      code: 'MODULE_ACCESS_DENIED',
      message: `${moduleKey} is not active for this workspace`,
    });
  }

  private invalid(message: string): never {
    throw new BadRequestException({ code: 'REPORT_FILTER_INVALID', message });
  }

  private required(value?: string) {
    if (!value) throw new Error('Tenant authentication context is required');
    return value;
  }
}

function normalizeFilters(reportType: ReportType, dto: CreateReportDto) {
  if (reportType === ReportType.PAYROLL && !dto.period)
    invalid('Payroll export requires period');
  let start: Date;
  let end: Date;
  if (dto.period) {
    const [year, month] = dto.period.split('-').map(Number);
    if (month < 1 || month > 12) invalid('Period must be YYYY-MM');
    start = new Date(Date.UTC(year, month - 1, 1));
    end = new Date(Date.UTC(year, month, 0));
  } else {
    if (!dto.startDate || !dto.endDate)
      invalid('Provide period or startDate and endDate');
    start = new Date(`${dto.startDate}T00:00:00.000Z`);
    end = new Date(`${dto.endDate}T00:00:00.000Z`);
  }
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  )
    invalid('Report date range is invalid');
  if (end.getTime() - start.getTime() > 366 * 86_400_000)
    invalid('Report date range cannot exceed one year');
  return {
    period: dto.period,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    employeeId: dto.employeeId,
    departmentId: dto.departmentId,
  };
}

function invalid(message: string): never {
  throw new BadRequestException({ code: 'REPORT_FILTER_INVALID', message });
}
