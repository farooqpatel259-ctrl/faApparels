import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLocationDto,
  CreateWarehouseDto,
  UpdateLocationDto,
  UpdateWarehouseDto,
} from './dto/warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllWarehouses() {
    return this.prisma.warehouse.findMany({
      where: { deletedAt: null },
      include: {
        locations: {
          where: { deletedAt: null },
          orderBy: { code: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async findWarehouse(id: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, deletedAt: null },
      include: {
        locations: {
          where: { deletedAt: null },
          orderBy: { code: 'asc' },
        },
      },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  createWarehouse(dto: CreateWarehouseDto) {
    return this.prisma.warehouse.create({
      data: {
        code: dto.code,
        name: dto.name,
        address: dto.address,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateWarehouse(id: string, dto: UpdateWarehouseDto) {
    await this.findWarehouse(id);
    return this.prisma.warehouse.update({ where: { id }, data: dto });
  }

  async removeWarehouse(id: string) {
    await this.findWarehouse(id);
    return this.prisma.warehouse.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async listLocations(warehouseId: string) {
    await this.findWarehouse(warehouseId);
    return this.prisma.location.findMany({
      where: { warehouseId, deletedAt: null },
      include: {
        parent: { select: { id: true, code: true, name: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async createLocation(warehouseId: string, dto: CreateLocationDto) {
    await this.findWarehouse(warehouseId);
    return this.prisma.location.create({
      data: {
        warehouseId,
        code: dto.code,
        name: dto.name,
        level: dto.level,
        parentId: dto.parentId,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateLocation(
    warehouseId: string,
    locationId: string,
    dto: UpdateLocationDto,
  ) {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, warehouseId, deletedAt: null },
    });
    if (!location) throw new NotFoundException('Location not found');
    return this.prisma.location.update({
      where: { id: locationId },
      data: dto,
    });
  }

  async removeLocation(warehouseId: string, locationId: string) {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, warehouseId, deletedAt: null },
    });
    if (!location) throw new NotFoundException('Location not found');
    return this.prisma.location.update({
      where: { id: locationId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
