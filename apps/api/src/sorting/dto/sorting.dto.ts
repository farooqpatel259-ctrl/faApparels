import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSortingOrderDto {
  @IsString()
  @IsNotEmpty()
  articleId!: string;

  @IsString()
  @IsNotEmpty()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsNumber()
  @Min(0.0001)
  qty!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}

export class UpdateSortingOrderDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  qty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsString()
  locationId?: string;
}
