import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { TenantContextService } from '../../../shared/tenancy/tenant-context.service';
import { EmployeeImportStorageService } from '../../organization/imports/employee-import-storage.service';
import {
  CreateRosterImportDto,
  RosterImportPresignDto,
} from '../dto/attendance-config.dto';
import { parseRosterCsv } from './roster-import-parser';
import { RosterImportQueue } from './roster-import.queue';

@Injectable()
export class RosterImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly storage: EmployeeImportStorageService,
    private readonly queue: RosterImportQueue,
  ) {}

  presign(dto: RosterImportPresignDto) {
    return this.storage.presignFor(
      this.tenantId(),
      'roster-imports',
      dto.filename,
      dto.contentType ?? 'text/csv',
    );
  }

  async register(dto: CreateRosterImportDto, requestedBy: string) {
    const tenantId = this.tenantId();
    if (!dto.objectKey.startsWith(`${tenantId}/roster-imports/`))
      throw new BadRequestException({
        code: 'IMPORT_OBJECT_KEY_INVALID',
        message: 'Import object key does not belong to this workspace',
      });
    parseRosterCsv(await this.storage.getText(dto.objectKey));
    const existing = await this.prisma.forTenant((tx) =>
      tx.importJob.findFirst({
        where: { kind: 'ROSTERS', idempotencyKey: dto.idempotencyKey },
      }),
    );
    if (existing) return this.get(existing.id);
    const job = await this.prisma.forTenant((tx) =>
      tx.importJob.create({
        data: {
          tenantId,
          requestedBy,
          kind: 'ROSTERS',
          objectKey: dto.objectKey,
          fileUrl: dto.objectKey,
          originalFilename: dto.originalFilename,
          contentType: 'text/csv',
          idempotencyKey: dto.idempotencyKey,
        },
      }),
    );
    await this.queue.enqueue({ tenantId, importJobId: job.id });
    return this.get(job.id);
  }

  async get(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const job = await tx.importJob.findFirst({
        where: { id, kind: 'ROSTERS' },
        include: {
          rosterRows: {
            where: { status: 'ERROR' },
            orderBy: { rowNumber: 'asc' },
          },
        },
      });
      if (!job)
        throw new NotFoundException({
          code: 'IMPORT_NOT_FOUND',
          message: 'Roster import was not found',
        });
      return { data: job };
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
