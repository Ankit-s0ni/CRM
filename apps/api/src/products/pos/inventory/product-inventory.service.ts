import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { TenantContextService } from '../../../platform/tenancy/public';
import { CreateProductInventoryDto, QueryProductInventoryDto } from './dto/product-inventory.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductInventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService
  ) {}

  async create(dto: CreateProductInventoryDto) {
    const tenantId = this.tenantContext.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is missing');
    }

    try {
      return await this.prisma.forTenant(async (tx) => {
        return tx.productInventory.create({
          data: {
            tenantId,
            name: dto.name,
            sku: dto.sku,
            barcode: dto.barcode || null,
            categoryId: dto.categoryId || null,
            sellingPrice: dto.sellingPrice,
            costPrice: dto.costPrice,
            taxPercentage: dto.taxPercentage ?? 0,
            stockQuantity: dto.stockQuantity ?? 0,
            unit: dto.unit ?? 'pcs',
            imageUrl: dto.imageUrl || null,
            isActive: dto.isActive ?? true,
          },
        });
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        const target = error.meta?.target || [];
        throw new BadRequestException(`Duplicate entry found for ${target.join(', ')}`);
      }
      throw error;
    }
  }

  async findAll(query: QueryProductInventoryDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductInventoryWhereInput = {
      deletedAt: null,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.ProductInventoryOrderByWithRelationInput = {};
    if (query.sortBy) {
      orderBy[query.sortBy as keyof Prisma.ProductInventoryOrderByWithRelationInput] = query.sortOrder || 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    return this.prisma.forTenant(async (tx) => {
      const [data, total] = await Promise.all([
        tx.productInventory.findMany({
          where,
          include: { category: true },
          skip,
          take: limit,
          orderBy,
        }),
        tx.productInventory.count({ where }),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    });
  }

  async findOne(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const product = await tx.productInventory.findUnique({
        where: { id },
        include: { category: true },
      });
      if (!product || product.deletedAt) throw new NotFoundException('Product not found');
      return product;
    });
  }

  async remove(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const product = await tx.productInventory.findUnique({ where: { id } });
      if (!product || product.deletedAt) throw new NotFoundException('Product not found');

      return tx.productInventory.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }
}
