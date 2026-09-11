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
import { SuppliersService } from './suppliers.service';
import { PurchaseOrdersService } from './purchase-orders.service';
import { ReceivingService } from './receiving.service';
import {
  CreatePurchaseOrderDto,
  CreateReceivingDto,
  CreateSupplierDto,
  UpdateSupplierDto,
} from './dto/purchasing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.service';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchasingController {
  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly purchaseOrdersService: PurchaseOrdersService,
    private readonly receivingService: ReceivingService,
  ) {}

  @Get('suppliers')
  @Permissions('purchasing.view')
  listSuppliers() {
    return this.suppliersService.findAll();
  }

  @Get('suppliers/:id')
  @Permissions('purchasing.view')
  getSupplier(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Post('suppliers')
  @Permissions('purchasing.create')
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Patch('suppliers/:id')
  @Permissions('purchasing.create')
  updateSupplier(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }

  @Delete('suppliers/:id')
  @Permissions('purchasing.create')
  removeSupplier(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }

  @Get('purchase-orders')
  @Permissions('purchasing.view')
  listPurchaseOrders() {
    return this.purchaseOrdersService.findAll();
  }

  @Get('purchase-orders/:id')
  @Permissions('purchasing.view')
  getPurchaseOrder(@Param('id') id: string) {
    return this.purchaseOrdersService.findOne(id);
  }

  @Post('purchase-orders')
  @Permissions('purchasing.create')
  createPurchaseOrder(@Body() dto: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.create(dto);
  }

  @Get('receivings')
  @Permissions('purchasing.view')
  listReceivings() {
    return this.receivingService.findAll();
  }

  @Get('receivings/:id')
  @Permissions('purchasing.view')
  getReceiving(@Param('id') id: string) {
    return this.receivingService.findOne(id);
  }

  @Post('receivings')
  @Permissions('purchasing.receive')
  createReceiving(
    @Body() dto: CreateReceivingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.receivingService.create(dto, user.id);
  }
}
