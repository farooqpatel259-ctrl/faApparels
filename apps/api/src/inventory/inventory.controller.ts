import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryEngineService } from './inventory-engine.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.service';
import {
  AdjustInventoryDto,
  ReceiveInventoryDto,
  ReserveInventoryDto,
} from './dto/inventory-operations.dto';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly inventoryEngine: InventoryEngineService,
  ) {}

  @Get('balances')
  @Permissions('inventory.view')
  listBalances(
    @Query('warehouseId') warehouseId?: string,
    @Query('articleId') articleId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.inventoryService.listBalances({
      warehouseId,
      articleId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('transactions')
  @Permissions('inventory.view')
  listTransactions(
    @Query('warehouseId') warehouseId?: string,
    @Query('articleId') articleId?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.inventoryService.listTransactions({
      warehouseId,
      articleId,
      type,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Post('operations/receive')
  @Permissions('inventory.create')
  receive(@Body() dto: ReceiveInventoryDto, @CurrentUser() user: AuthUser) {
    return this.inventoryEngine.receive({
      ...dto,
      performedBy: user.id,
    });
  }

  @Post('operations/adjust')
  @Permissions('inventory.adjust')
  adjust(@Body() dto: AdjustInventoryDto, @CurrentUser() user: AuthUser) {
    return this.inventoryEngine.adjust({
      ...dto,
      performedBy: user.id,
    });
  }

  @Post('operations/reserve')
  @Permissions('inventory.edit')
  reserve(@Body() dto: ReserveInventoryDto, @CurrentUser() user: AuthUser) {
    return this.inventoryEngine.reserve({
      ...dto,
      performedBy: user.id,
    });
  }

  @Post('operations/release-reservation')
  @Permissions('inventory.edit')
  releaseReserve(
    @Body() dto: ReserveInventoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventoryEngine.releaseReserve({
      ...dto,
      performedBy: user.id,
    });
  }
}
