import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaTransaction } from '../../shared/database/prisma.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import { CreateDesignationDto } from './dto/create-designation.dto';
import { ListDesignationsQueryDto } from './dto/list-designations-query.dto';
import { UpdateDesignationDto } from './dto/update-designation.dto';

@Injectable()
export class DesignationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async list(query: ListDesignationsQueryDto) {
    const search = query.search?.trim();
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          name: {
            contains: search,
            mode: 'insensitive' as const,
          },
        }
      : {};

    const { data, total } = await this.prisma.forTenant(async (tx) => {
      const data = await tx.designation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      });
      const total = await tx.designation.count({ where });
      return { data, total };
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string) {
    const designation = await this.prisma.forTenant((tx) =>
      tx.designation.findUnique({
        where: { id },
        include: {
          _count: {
            select: { employees: true },
          },
        },
      }),
    );

    if (!designation) {
      throw new NotFoundException({
        code: 'DESIGNATION_NOT_FOUND',
        message: 'Designation not found',
      });
    }

    return {
      data: {
        id: designation.id,
        name: designation.name,
        employeeCount: designation._count.employees,
      },
    };
  }

  async create(dto: CreateDesignationDto) {
    const tenantId = this.tenantContextService.tenantId;
    if (!tenantId) {
      throw new BadRequestException({
        code: 'WORKSPACE_HEADER_REQUIRED',
        message: 'Workspace header required',
      });
    }

    const name = this.normalizeName(dto.name);

    return this.prisma.forTenant(async (tx) => {
      await this.ensureUniqueName(tx, name);

      const designation = await tx.designation.create({
        data: {
          tenantId,
          name,
        },
      });

      return { data: designation };
    });
  }

  async update(id: string, dto: UpdateDesignationDto) {
    if (dto.name === undefined) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Designation name is required',
      });
    }

    const name = this.normalizeName(dto.name);

    return this.prisma.forTenant(async (tx) => {
      const designation = await tx.designation.findUnique({
        where: { id },
      });

      if (!designation) {
        throw new NotFoundException({
          code: 'DESIGNATION_NOT_FOUND',
          message: 'Designation not found',
        });
      }

      await this.ensureUniqueName(tx, name, id);

      const updated = await tx.designation.update({
        where: { id },
        data: { name },
      });

      return { data: updated };
    });
  }

  async remove(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const designation = await tx.designation.findUnique({
        where: { id },
        include: {
          _count: {
            select: { employees: true },
          },
        },
      });

      if (!designation) {
        throw new NotFoundException({
          code: 'DESIGNATION_NOT_FOUND',
          message: 'Designation not found',
        });
      }

      if (designation._count.employees > 0) {
        throw new ConflictException({
          code: 'DESIGNATION_IN_USE',
          message: 'Designation cannot be deleted while employees are assigned',
          details: {
            employeeCount: designation._count.employees,
          },
        });
      }

      await tx.designation.delete({
        where: { id },
      });

      return { success: true };
    });
  }

  private normalizeName(name: string) {
    const normalized = name.trim().replace(/\s+/g, ' ');
    if (!normalized) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Designation name is required',
      });
    }

    return normalized;
  }

  private async ensureUniqueName(
    tx: PrismaTransaction,
    name: string,
    excludeId?: string,
  ) {
    const duplicate = await tx.designation.findFirst({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (duplicate) {
      throw new ConflictException({
        code: 'DESIGNATION_NAME_EXISTS',
        message: 'A designation with this name already exists',
      });
    }
  }
}
