import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  CreateCustomerDto,
  CreateSalesOrderDto,
  UpdateSalesOrderDto,
} from './dto/orders.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('customers')
  @Permissions('orders.view')
  listCustomers() {
    return this.ordersService.listCustomers();
  }

  @Post('customers')
  @Permissions('orders.manage')
  createCustomer(@Body() dto: CreateCustomerDto) {
    return this.ordersService.createCustomer(dto);
  }

  @Get('sales-orders')
  @Permissions('orders.view')
  findAllOrders() {
    return this.ordersService.findAllOrders();
  }

  @Get('sales-orders/:id')
  @Permissions('orders.view')
  findOneOrder(@Param('id') id: string) {
    return this.ordersService.findOneOrder(id);
  }

  @Post('sales-orders')
  @Permissions('orders.manage')
  createOrder(@Body() dto: CreateSalesOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  @Patch('sales-orders/:id')
  @Permissions('orders.manage')
  updateOrder(@Param('id') id: string, @Body() dto: UpdateSalesOrderDto) {
    return this.ordersService.updateOrder(id, dto);
  }
}
