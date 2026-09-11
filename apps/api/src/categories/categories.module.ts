import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { UnitsController } from './units.controller';

@Module({
  controllers: [CategoriesController, UnitsController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
