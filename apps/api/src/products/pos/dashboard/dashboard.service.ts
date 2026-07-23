import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics() {
    return this.prisma.forTenant(async (tx) => {
      // 1. Order Metrics
      const orderStats = await tx.productOrder.aggregate({
        _sum: { total: true },
        _count: { id: true }
      });
      
      const transactions = orderStats._count.id;
      const revenue = orderStats._sum.total ? Number(orderStats._sum.total) : 0;
      const averageOrderValue = transactions > 0 ? revenue / transactions : 0;

      // Calculate Total Items Sold
      const itemsStats = await tx.productOrderItem.aggregate({
        _sum: { quantity: true }
      });
      const totalItemsSold = itemsStats._sum.quantity || 0;

      // 2. Low Stock Alerts
      const lowStockAlerts = await tx.productInventory.findMany({
        where: { isActive: true, stockQuantity: { lte: 5 } },
        orderBy: { stockQuantity: 'asc' },
        take: 10
      });

      // 3. Recent Sales
      const recentSales = await tx.productOrder.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          items: {
            include: { product: true }
          }
        }
      });

      // Overall inventory health
      const activeProductsCount = await tx.productInventory.count({ where: { isActive: true } });

      return {
        metrics: {
          revenue,
          transactions,
          averageOrderValue,
          totalItemsSold,
          lowStockCount: lowStockAlerts.length,
          activeProductsCount
        },
        lowStockAlerts,
        recentSales
      };
    });
  }
}
