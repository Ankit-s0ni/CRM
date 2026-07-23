import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { TenantContextService } from '../../../platform/tenancy/public';
import { CreateProductCategoryDto, UpdateProductCategoryDto } from './dto/product-category.dto';

@Injectable()
export class ProductCategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService
  ) {}

  async create(dto: CreateProductCategoryDto) {
    const tenantId = this.tenantContext.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is missing');
    }
    
    return this.prisma.forTenant(async (tx) => {
      if (dto.parentId) {
        const parent = await tx.productCategory.findUnique({ where: { id: dto.parentId } });
        if (!parent || parent.deletedAt) throw new NotFoundException('Parent category not found');
      }

      return tx.productCategory.create({
        data: {
          tenantId,
          name: dto.name,
          description: dto.description,
          isActive: dto.isActive ?? true,
          parentId: dto.parentId || null,
        },
      });
    });
  }

  async findAll() {
    return this.prisma.forTenant(async (tx) => {
      return tx.productCategory.findMany({
        where: { deletedAt: null },
        include: {
          parent: true,
          children: true,
        },
      });
    });
  }

  async findOne(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const category = await tx.productCategory.findUnique({
        where: { id },
        include: {
          parent: true,
          children: true,
        },
      });
      if (!category || category.deletedAt) throw new NotFoundException('Category not found');
      return category;
    });
  }

  async update(id: string, dto: UpdateProductCategoryDto) {
    return this.prisma.forTenant(async (tx) => {
      const category = await tx.productCategory.findUnique({ where: { id } });
      if (!category || category.deletedAt) throw new NotFoundException('Category not found');

      if (dto.parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      const updateData: any = { ...dto };
      if (dto.parentId !== undefined) {
        updateData.parentId = dto.parentId || null;
      }

      return tx.productCategory.update({
        where: { id },
        data: updateData,
      });
    });
  }

  async remove(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const category = await tx.productCategory.findUnique({ where: { id } });
      if (!category || category.deletedAt) throw new NotFoundException('Category not found');

      return tx.productCategory.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }
}
