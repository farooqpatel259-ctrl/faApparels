import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { SuppliersService } from './suppliers.service';
import { PurchaseOrdersService } from './purchase-orders.service';
import { ReceivingService } from './receiving.service';
import { PurchasingController } from './purchasing.controller';

@Module({
  imports: [InventoryModule],
  controllers: [PurchasingController],
  providers: [SuppliersService, PurchaseOrdersService, ReceivingService],
})
export class PurchasingModule {}
