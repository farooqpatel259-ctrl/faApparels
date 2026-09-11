import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  listBalances(filters: {
    warehouseId?: string;
    articleId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 50;
    const skip = (page - 1) * pageSize;

    const where = {
      ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
      ...(filters.articleId && { articleId: filters.articleId }),
      ...(filters.status && { status: filters.status }),
    };

    return this.prisma.$transaction([
      this.prisma.inventoryBalance.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          article: { select: { id: true, sku: true, name: true } },
          variant: { select: { id: true, sku: true } },
          warehouse: { select: { id: true, code: true, name: true } },
          location: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.inventoryBalance.count({ where }),
    ]).then(([data, total]) => ({
      data,
      meta: { page, pageSize, total },
    }));
  }

  listTransactions(filters: {
    warehouseId?: string;
    articleId?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 50;
    const skip = (page - 1) * pageSize;

    const where = {
      ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
      ...(filters.articleId && { articleId: filters.articleId }),
      ...(filters.type && { type: filters.type }),
    };

    return this.prisma.$transaction([
      this.prisma.inventoryTransaction.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          article: { select: { id: true, sku: true, name: true } },
          variant: { select: { id: true, sku: true } },
          warehouse: { select: { id: true, code: true, name: true } },
          location: { select: { id: true, code: true, name: true } },
          performer: { select: { id: true, email: true, fullName: true } },
        },
      }),
      this.prisma.inventoryTransaction.count({ where }),
    ]).then(([data, total]) => ({
      data,
      meta: { page, pageSize, total },
    }));
  }
}
