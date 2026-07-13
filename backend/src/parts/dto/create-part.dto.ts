import { IsString, IsOptional, IsNumber, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePartDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  oemNumber?: string;

  @IsString()
  @IsOptional()
  aftermarketNumber?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsNumber()
  @Type(() => Number)
  unitPrice: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  quantity?: number;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsString()
  @IsOptional()
  shelfLocation?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  minQuantity?: number;
}
