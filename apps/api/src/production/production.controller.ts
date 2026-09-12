import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProductionService } from './production.service';
import {
  CreateProductionOrderDto,
  UpdateProductionOrderDto,
} from './dto/production.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('production-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get()
  @Permissions('production.view')
  findAll() {
    return this.productionService.findAll();
  }

  @Get(':id')
  @Permissions('production.view')
  findOne(@Param('id') id: string) {
    return this.productionService.findOne(id);
  }

  @Post()
  @Permissions('production.manage')
  create(@Body() dto: CreateProductionOrderDto) {
    return this.productionService.create(dto);
  }

  @Patch(':id')
  @Permissions('production.manage')
  update(@Param('id') id: string, @Body() dto: UpdateProductionOrderDto) {
    return this.productionService.update(id, dto);
  }
}
