import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryEngineService } from './inventory-engine.service';
import { InventoryController } from './inventory.controller';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, InventoryEngineService],
  exports: [InventoryEngineService],
})
export class InventoryModule {}
