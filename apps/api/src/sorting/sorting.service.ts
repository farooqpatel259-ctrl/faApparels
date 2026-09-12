import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSortingOrderDto,
  UpdateSortingOrderDto,
} from './dto/sorting.dto';

const ALLOWED_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

@Injectable()
export class SortingService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.sortingOrder.findMany({
      include: {
        article: {
          select: { id: true, sku: true, name: true, color: true },
        },
        warehouse: { select: { id: true, code: true, name: true } },
        location: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.sortingOrder.findUnique({
      where: { id },
      include: {
        article: true,
        warehouse: true,
        location: true,
      },
    });
    if (!order) throw new NotFoundException('Sorting order not found');
    return order;
  }

  async create(dto: CreateSortingOrderDto) {
    const number = await this.nextNumber();
    return this.prisma.sortingOrder.create({
      data: {
        number,
        articleId: dto.articleId,
        warehouseId: dto.warehouseId,
        locationId: dto.locationId,
        qty: dto.qty,
        priority: dto.priority ?? 1,
        status: 'PENDING',
      },
      include: {
        article: {
          select: { id: true, sku: true, name: true, color: true },
        },
        warehouse: { select: { id: true, code: true, name: true } },
        location: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdateSortingOrderDto) {
    await this.findOne(id);

    if (
      dto.status &&
      !ALLOWED_STATUSES.includes(dto.status as (typeof ALLOWED_STATUSES)[number])
    ) {
      throw new BadRequestException(
        `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
      );
    }

    return this.prisma.sortingOrder.update({
      where: { id },
      data: {
        status: dto.status,
        qty: dto.qty,
        priority: dto.priority,
        locationId: dto.locationId,
      },
      include: {
        article: {
          select: { id: true, sku: true, name: true, color: true },
        },
        warehouse: { select: { id: true, code: true, name: true } },
        location: { select: { id: true, code: true, name: true } },
      },
    });
  }

  private async nextNumber(): Promise<string> {
    const count = await this.prisma.sortingOrder.count();
    return `SRT-${String(count + 1).padStart(6, '0')}`;
  }
}
