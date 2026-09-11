import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import {
  CreateLocationDto,
  CreateWarehouseDto,
  UpdateLocationDto,
  UpdateWarehouseDto,
} from './dto/warehouse.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('warehouses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  @Permissions('warehouses.view')
  findAll() {
    return this.warehousesService.findAllWarehouses();
  }

  @Get(':id')
  @Permissions('warehouses.view')
  findOne(@Param('id') id: string) {
    return this.warehousesService.findWarehouse(id);
  }

  @Post()
  @Permissions('warehouses.manage')
  create(@Body() dto: CreateWarehouseDto) {
    return this.warehousesService.createWarehouse(dto);
  }

  @Patch(':id')
  @Permissions('warehouses.manage')
  update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.warehousesService.updateWarehouse(id, dto);
  }

  @Delete(':id')
  @Permissions('warehouses.manage')
  remove(@Param('id') id: string) {
    return this.warehousesService.removeWarehouse(id);
  }

  @Get(':id/locations')
  @Permissions('warehouses.view')
  listLocations(@Param('id') warehouseId: string) {
    return this.warehousesService.listLocations(warehouseId);
  }

  @Post(':id/locations')
  @Permissions('warehouses.manage')
  createLocation(
    @Param('id') warehouseId: string,
    @Body() dto: CreateLocationDto,
  ) {
    return this.warehousesService.createLocation(warehouseId, dto);
  }

  @Patch(':warehouseId/locations/:locationId')
  @Permissions('warehouses.manage')
  updateLocation(
    @Param('warehouseId') warehouseId: string,
    @Param('locationId') locationId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.warehousesService.updateLocation(warehouseId, locationId, dto);
  }

  @Delete(':warehouseId/locations/:locationId')
  @Permissions('warehouses.manage')
  removeLocation(
    @Param('warehouseId') warehouseId: string,
    @Param('locationId') locationId: string,
  ) {
    return this.warehousesService.removeLocation(warehouseId, locationId);
  }
}
