import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SortingService } from './sorting.service';
import {
  CreateSortingOrderDto,
  UpdateSortingOrderDto,
} from './dto/sorting.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('sorting-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SortingController {
  constructor(private readonly sortingService: SortingService) {}

  @Get()
  @Permissions('sorting.view')
  findAll() {
    return this.sortingService.findAll();
  }

  @Get(':id')
  @Permissions('sorting.view')
  findOne(@Param('id') id: string) {
    return this.sortingService.findOne(id);
  }

  @Post()
  @Permissions('sorting.manage')
  create(@Body() dto: CreateSortingOrderDto) {
    return this.sortingService.create(dto);
  }

  @Patch(':id')
  @Permissions('sorting.manage')
  update(@Param('id') id: string, @Body() dto: UpdateSortingOrderDto) {
    return this.sortingService.update(id, dto);
  }
}
