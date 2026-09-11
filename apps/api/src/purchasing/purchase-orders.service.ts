import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/purchasing.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.purchaseOrder.findMany({
      include: {
        supplier: { select: { id: true, code: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
        items: {
          include: {
            article: { select: { id: true, sku: true, name: true } },
            variant: { select: { id: true, sku: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            article: true,
            variant: true,
          },
        },
        receivings: true,
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async create(dto: CreatePurchaseOrderDto) {
    const number = await this.nextPoNumber();
    return this.prisma.purchaseOrder.create({
      data: {
        number,
        supplierId: dto.supplierId,
        warehouseId: dto.warehouseId,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        notes: dto.notes,
        status: 'OPEN',
        items: {
          create: dto.items.map((item) => ({
            articleId: item.articleId,
            variantId: item.variantId,
            qtyOrdered: item.qtyOrdered,
            unitCost: item.unitCost ?? 0,
          })),
        },
      },
      include: {
        supplier: true,
        warehouse: true,
        items: { include: { article: true, variant: true } },
      },
    });
  }

  private async nextPoNumber(): Promise<string> {
    const count = await this.prisma.purchaseOrder.count();
    return `PO-${String(count + 1).padStart(6, '0')}`;
  }
}
