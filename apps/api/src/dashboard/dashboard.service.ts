import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalArticles,
      warehouseCount,
      openPurchaseOrders,
      transactionsToday,
      balances,
      lowStockCandidates,
    ] = await Promise.all([
      this.prisma.article.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.warehouse.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.purchaseOrder.count({
        where: { status: { in: ['OPEN', 'PARTIAL', 'DRAFT'] } },
      }),
      this.prisma.inventoryTransaction.count({
        where: { createdAt: { gte: startOfDay } },
      }),
      this.prisma.inventoryBalance.groupBy({
        by: ['status'],
        _sum: { quantity: true },
      }),
      this.prisma.article.findMany({
        where: { deletedAt: null, isActive: true },
        select: {
          id: true,
          minStock: true,
          reorderLevel: true,
          inventoryBalances: { select: { quantity: true, status: true } },
        },
      }),
    ]);

    const qtyByStatus: Record<string, number> = {};
    for (const row of balances) {
      qtyByStatus[row.status] = Number(row._sum.quantity ?? 0);
    }

    const totalQuantity = Object.values(qtyByStatus).reduce((a, b) => a + b, 0);
    const availableStock = qtyByStatus['AVAILABLE'] ?? 0;
    const reservedStock = qtyByStatus['RESERVED'] ?? 0;
    const damagedStock = qtyByStatus['DAMAGED'] ?? 0;
    const productionStock = qtyByStatus['PRODUCTION'] ?? 0;
    const sortingPending = qtyByStatus['SORTING_PENDING'] ?? 0;

    let lowStockItems = 0;
    for (const article of lowStockCandidates) {
      const onHand = article.inventoryBalances
        .filter((b) => b.status === 'AVAILABLE')
        .reduce((sum, b) => sum + Number(b.quantity), 0);
      const threshold = Number(article.reorderLevel ?? article.minStock ?? 0);
      if (threshold > 0 && onHand <= threshold) lowStockItems += 1;
    }

    const valueAgg = await this.prisma.inventoryBalance.findMany({
      where: { status: 'AVAILABLE' },
      include: { article: { select: { costPrice: true } } },
    });
    const totalStockValue = valueAgg.reduce(
      (sum, row) => sum + Number(row.quantity) * Number(row.article.costPrice),
      0,
    );

    return {
      totalArticles,
      totalQuantity,
      availableStock,
      reservedStock,
      productionStock,
      sortingPending,
      damagedStock,
      lowStockItems,
      warehouseCount,
      openPurchaseOrders,
      transactionsToday,
      totalStockValue,
    };
  }
}
