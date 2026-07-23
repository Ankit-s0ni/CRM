import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { TenantContextService } from '../../../platform/tenancy/public';
import { CheckoutDto } from './dto/checkout.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService
  ) {}

  async processCheckout(dto: CheckoutDto) {
    const tenantId = this.tenantContext.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is missing');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Execute within a strict Prisma transaction to avoid race conditions
    return await this.prisma.forTenant(async (tx) => {
      let subtotal = 0;
      let taxTotal = 0;
      let total = 0;
      const orderItems: any[] = [];

      for (const item of dto.items) {
        // Fetch product inside transaction
        const product = await tx.productInventory.findUnique({
          where: { id: item.productId }
        });

        if (!product || !product.isActive || product.deletedAt) {
          throw new BadRequestException(`Product with ID ${item.productId} is invalid or deleted.`);
        }

        if (product.stockQuantity < item.quantity) {
          throw new BadRequestException(`Insufficient stock for product ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}`);
        }

        // Deduct stock
        await tx.productInventory.update({
          where: { id: product.id },
          data: {
            stockQuantity: {
              decrement: item.quantity
            }
          }
        });

        const itemSubtotal = Number(product.sellingPrice) * item.quantity;
        const itemTax = (itemSubtotal * Number(product.taxPercentage)) / 100;
        
        subtotal += itemSubtotal;
        taxTotal += itemTax;
        total += (itemSubtotal + itemTax);

        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.sellingPrice,
          subtotal: new Prisma.Decimal(itemSubtotal)
        });
      }

      // Create Order
      const order = await tx.productOrder.create({
        data: {
          tenantId,
          subtotal: new Prisma.Decimal(subtotal),
          taxTotal: new Prisma.Decimal(taxTotal),
          total: new Prisma.Decimal(total),
          paymentMethod: dto.paymentMethod,
          status: 'COMPLETED',
          items: {
            create: orderItems
          }
        },
        include: {
          items: true
        }
      });

      return order;
    });
  }
}
