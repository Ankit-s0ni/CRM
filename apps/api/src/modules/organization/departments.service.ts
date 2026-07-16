import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaTransaction } from '../../shared/database/prisma.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import {
  assertDepartmentPlacement,
  buildDepartmentTree,
} from './department-tree';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async list(view: 'flat' | 'tree' = 'flat') {
    const departments = await this.prisma.forTenant((tx) =>
      tx.department.findMany({
        orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
      }),
    );

    return {
      data: view === 'tree' ? buildDepartmentTree(departments) : departments,
    };
  }

  async getById(id: string) {
    const department = await this.prisma.forTenant((tx) =>
      tx.department.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              children: true,
              employees: true,
            },
          },
        },
      }),
    );

    if (!department) {
      throw new NotFoundException({
        code: 'DEPARTMENT_NOT_FOUND',
        message: 'Department not found',
      });
    }

    return {
      data: {
        id: department.id,
        name: department.name,
        parentDeptId: department.parentDeptId,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
        counts: {
          children: department._count.children,
          employees: department._count.employees,
        },
      },
    };
  }

  async create(dto: CreateDepartmentDto) {
    const name = this.normalizeName(dto.name);
    const parentDeptId = dto.parentDeptId ?? null;
    const tenantId = this.tenantContextService.tenantId;

    if (!tenantId) {
      throw new BadRequestException({
        code: 'WORKSPACE_HEADER_REQUIRED',
        message: 'Workspace header required',
      });
    }

    return this.prisma.forTenant(async (tx) => {
      if (parentDeptId) {
        const departments = await tx.department.findMany({
          select: { id: true, parentDeptId: true },
        });
        const parent = departments.find(({ id }) => id === parentDeptId);

        if (!parent) {
          throw new NotFoundException({
            code: 'DEPARTMENT_PARENT_NOT_FOUND',
            message: 'Parent department not found',
          });
        }
        assertDepartmentPlacement(
          '__new_department__',
          parentDeptId,
          departments,
        );
      }

      await this.ensureUniqueName(tx, name, parentDeptId);

      const department = await tx.department.create({
        data: { tenantId, name, parentDeptId },
      });

      return { data: department };
    });
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const hasName = dto.name !== undefined;
    const hasParent = 'parentDeptId' in dto;

    if (!hasName && !hasParent) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'At least one field must be provided',
      });
    }

    return this.prisma.forTenant(async (tx) => {
      const department = await tx.department.findUnique({
        where: { id },
      });

      if (!department) {
        throw new NotFoundException({
          code: 'DEPARTMENT_NOT_FOUND',
          message: 'Department not found',
        });
      }

      const nextName = hasName
        ? this.normalizeName(dto.name as string)
        : department.name;
      const nextParentId = hasParent
        ? dto.parentDeptId === undefined
          ? department.parentDeptId
          : dto.parentDeptId
        : department.parentDeptId;

      if (nextParentId === id) {
        throw new ConflictException({
          code: 'DEPARTMENT_CYCLE',
          message: 'A department cannot be its own parent',
        });
      }

      if (hasParent && nextParentId) {
        const parent = await tx.department.findUnique({
          where: { id: nextParentId },
        });

        if (!parent) {
          throw new NotFoundException({
            code: 'DEPARTMENT_PARENT_NOT_FOUND',
            message: 'Parent department not found',
          });
        }

        const departments = await tx.department.findMany({
          select: {
            id: true,
            parentDeptId: true,
            name: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        assertDepartmentPlacement(id, nextParentId, departments);
      }

      await this.ensureUniqueName(tx, nextName, nextParentId ?? null, id);

      const updated = await tx.department.update({
        where: { id },
        data: {
          name: nextName,
          parentDeptId: nextParentId ?? null,
        },
      });

      return { data: updated };
    });
  }

  async remove(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const department = await tx.department.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              children: true,
              employees: true,
            },
          },
        },
      });

      if (!department) {
        throw new NotFoundException({
          code: 'DEPARTMENT_NOT_FOUND',
          message: 'Department not found',
        });
      }

      if (department._count.children > 0 || department._count.employees > 0) {
        throw new ConflictException({
          code: 'DEPARTMENT_NOT_EMPTY',
          message:
            'Department cannot be deleted while it has children or employees',
          details: {
            childCount: department._count.children,
            employeeCount: department._count.employees,
          },
        });
      }

      await tx.department.delete({
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
        message: 'Department name is required',
      });
    }

    return normalized;
  }

  private async ensureUniqueName(
    tx: PrismaTransaction,
    name: string,
    parentDeptId: string | null,
    excludeId?: string,
  ) {
    const duplicate = await tx.department.findFirst({
      where: {
        parentDeptId,
        id: excludeId ? { not: excludeId } : undefined,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (duplicate) {
      throw new ConflictException({
        code: 'DEPARTMENT_NAME_EXISTS',
        message:
          'A department with this name already exists in the selected level',
      });
    }
  }
}
