import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProductionOrderDto,
  UpdateProductionOrderDto,
} from './dto/production.dto';

const ALLOWED_STATUSES = [
  'DRAFT',
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.productionOrder.findMany({
      include: {
        article: {
          select: { id: true, sku: true, name: true, color: true },
        },
        warehouse: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id },
      include: {
        article: true,
        warehouse: true,
      },
    });
    if (!order) throw new NotFoundException('Production order not found');
    return order;
  }

  async create(dto: CreateProductionOrderDto) {
    const number = await this.nextNumber();
    return this.prisma.productionOrder.create({
      data: {
        number,
        articleId: dto.articleId,
        warehouseId: dto.warehouseId,
        qtyPlanned: dto.qtyPlanned,
        qtyCompleted: 0,
        status: 'PLANNED',
        plannedStart: dto.plannedStart
          ? new Date(dto.plannedStart)
          : new Date(),
        plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : undefined,
      },
      include: {
        article: {
          select: { id: true, sku: true, name: true, color: true },
        },
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdateProductionOrderDto) {
    const existing = await this.findOne(id);

    if (dto.status && !ALLOWED_STATUSES.includes(dto.status as (typeof ALLOWED_STATUSES)[number])) {
      throw new BadRequestException(
        `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
      );
    }

    const qtyCompleted =
      dto.qtyCompleted !== undefined
        ? dto.qtyCompleted
        : Number(existing.qtyCompleted);
    const qtyPlanned = Number(existing.qtyPlanned);

    if (qtyCompleted > qtyPlanned) {
      throw new BadRequestException(
        `Completed qty (${qtyCompleted}) cannot exceed planned qty (${qtyPlanned})`,
      );
    }

    let status = dto.status ?? existing.status;
    if (dto.qtyCompleted !== undefined && !dto.status) {
      if (qtyCompleted <= 0) status = existing.status === 'DRAFT' ? 'DRAFT' : 'PLANNED';
      else if (qtyCompleted >= qtyPlanned) status = 'COMPLETED';
      else status = 'IN_PROGRESS';
    }

    return this.prisma.productionOrder.update({
      where: { id },
      data: {
        status,
        qtyCompleted,
        plannedStart: dto.plannedStart
          ? new Date(dto.plannedStart)
          : undefined,
        plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : undefined,
      },
      include: {
        article: {
          select: { id: true, sku: true, name: true, color: true },
        },
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });
  }

  private async nextNumber(): Promise<string> {
    const count = await this.prisma.productionOrder.count();
    return `PRD-${String(count + 1).padStart(6, '0')}`;
  }
}
