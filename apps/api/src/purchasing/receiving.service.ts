import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryEngineService } from '../inventory/inventory-engine.service';
import { CreateReceivingDto } from './dto/purchasing.dto';

@Injectable()
export class ReceivingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryEngine: InventoryEngineService,
  ) {}

  findAll() {
    return this.prisma.receiving.findMany({
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        purchaseOrder: { select: { id: true, number: true } },
        receiver: { select: { id: true, fullName: true } },
        items: {
          include: {
            article: { select: { id: true, sku: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const receiving = await this.prisma.receiving.findUnique({
      where: { id },
      include: {
        warehouse: true,
        purchaseOrder: true,
        receiver: { select: { id: true, fullName: true, email: true } },
        items: { include: { article: true, variant: true } },
      },
    });
    if (!receiving) throw new NotFoundException('Receiving not found');
    return receiving;
  }

  async create(dto: CreateReceivingDto, userId: string) {
    if (dto.purchaseOrderId) {
      const po = await this.prisma.purchaseOrder.findUnique({
        where: { id: dto.purchaseOrderId },
        include: { items: true },
      });
      if (!po) throw new NotFoundException('Purchase order not found');
    }

    const number = await this.nextReceivingNumber();

    const receiving = await this.prisma.receiving.create({
      data: {
        number,
        purchaseOrderId: dto.purchaseOrderId,
        warehouseId: dto.warehouseId,
        locationId: dto.locationId,
        receivedBy: userId,
        notes: dto.notes,
        status: 'COMPLETED',
        items: {
          create: dto.items.map((item) => ({
            articleId: item.articleId,
            variantId: item.variantId,
            qtyReceived: item.qtyAccepted,
            qtyAccepted: item.qtyAccepted,
            qtyRejected: item.qtyRejected ?? 0,
          })),
        },
      },
      include: { items: true },
    });

    for (const item of dto.items) {
      if (item.qtyAccepted > 0) {
        await this.inventoryEngine.receive({
          articleId: item.articleId,
          variantId: item.variantId,
          warehouseId: dto.warehouseId,
          locationId: dto.locationId,
          status: 'AVAILABLE',
          quantity: item.qtyAccepted,
          performedBy: userId,
          type: 'PUTAWAY',
          referenceType: 'Receiving',
          referenceId: receiving.id,
          reason: 'Goods received and put away',
        });
      }

      if ((item.qtyRejected ?? 0) > 0) {
        await this.inventoryEngine.receive({
          articleId: item.articleId,
          variantId: item.variantId,
          warehouseId: dto.warehouseId,
          locationId: dto.locationId,
          status: 'REJECTED',
          quantity: item.qtyRejected!,
          performedBy: userId,
          type: 'REJECTION',
          referenceType: 'Receiving',
          referenceId: receiving.id,
          reason: 'Rejected on receiving',
        });
      }

      if (dto.purchaseOrderId) {
        const poItem = await this.prisma.purchaseOrderItem.findFirst({
          where: {
            purchaseOrderId: dto.purchaseOrderId,
            articleId: item.articleId,
            variantId: item.variantId ?? null,
          },
        });
        if (!poItem) {
          throw new BadRequestException(
            `PO line not found for article ${item.articleId}`,
          );
        }
        const newReceived = poItem.qtyReceived.add(
          new Prisma.Decimal(item.qtyAccepted),
        );
        await this.prisma.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { qtyReceived: newReceived },
        });
      }
    }

    if (dto.purchaseOrderId) {
      const items = await this.prisma.purchaseOrderItem.findMany({
        where: { purchaseOrderId: dto.purchaseOrderId },
      });
      const allReceived = items.every((i) => i.qtyReceived.gte(i.qtyOrdered));
      const anyReceived = items.some((i) => i.qtyReceived.gt(0));
      await this.prisma.purchaseOrder.update({
        where: { id: dto.purchaseOrderId },
        data: {
          status: allReceived ? 'RECEIVED' : anyReceived ? 'PARTIAL' : 'OPEN',
        },
      });
    }

    return this.prisma.receiving.findUnique({
      where: { id: receiving.id },
      include: {
        items: { include: { article: true } },
        warehouse: true,
        purchaseOrder: true,
      },
    });
  }

  private async nextReceivingNumber(): Promise<string> {
    const count = await this.prisma.receiving.count();
    return `RCV-${String(count + 1).padStart(6, '0')}`;
  }
}
