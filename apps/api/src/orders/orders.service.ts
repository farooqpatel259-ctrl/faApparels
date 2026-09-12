import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCustomerDto,
  CreateSalesOrderDto,
  UpdateSalesOrderDto,
} from './dto/orders.dto';

const ALLOWED_STATUSES = [
  'DRAFT',
  'CONFIRMED',
  'PACKED',
  'DISPATCHED',
  'DELIVERED',
  'CANCELLED',
] as const;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  listCustomers() {
    return this.prisma.customer.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  createCustomer(dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        code: dto.code,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        isActive: true,
      },
    });
  }

  findAllOrders() {
    return this.prisma.salesOrder.findMany({
      include: {
        customer: { select: { id: true, code: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
        items: {
          include: {
            article: {
              select: { id: true, sku: true, name: true, color: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneOrder(id: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        warehouse: true,
        items: { include: { article: true } },
      },
    });
    if (!order) throw new NotFoundException('Sales order not found');
    return order;
  }

  async createOrder(dto: CreateSalesOrderDto) {
    const number = await this.nextNumber();
    return this.prisma.salesOrder.create({
      data: {
        number,
        customerId: dto.customerId,
        warehouseId: dto.warehouseId,
        notes: dto.notes,
        status: 'CONFIRMED',
        items: {
          create: dto.items.map((item) => ({
            articleId: item.articleId,
            qtyOrdered: item.qtyOrdered,
            unitPrice: item.unitPrice ?? 0,
          })),
        },
      },
      include: {
        customer: { select: { id: true, code: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
        items: {
          include: {
            article: {
              select: { id: true, sku: true, name: true, color: true },
            },
          },
        },
      },
    });
  }

  async updateOrder(id: string, dto: UpdateSalesOrderDto) {
    await this.findOneOrder(id);

    if (
      dto.status &&
      !ALLOWED_STATUSES.includes(dto.status as (typeof ALLOWED_STATUSES)[number])
    ) {
      throw new BadRequestException(
        `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
      );
    }

    return this.prisma.salesOrder.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
      },
      include: {
        customer: { select: { id: true, code: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
        items: {
          include: {
            article: {
              select: { id: true, sku: true, name: true, color: true },
            },
          },
        },
      },
    });
  }

  private async nextNumber(): Promise<string> {
    const count = await this.prisma.salesOrder.count();
    return `SO-${String(count + 1).padStart(6, '0')}`;
  }
}
