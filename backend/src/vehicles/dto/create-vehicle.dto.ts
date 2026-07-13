import { IsString, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVehicleDto {
  @IsString()
  customerId: string;

  @IsString()
  @IsOptional()
  vin?: string;

  @IsString()
  @IsOptional()
  licensePlate?: string;

  @IsString()
  @IsOptional()
  make?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  generation?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  productionYear?: number;

  @IsString()
  @IsOptional()
  engine?: string;

  @IsString()
  @IsOptional()
  engineCode?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  horsepower?: number;

  @IsString()
  @IsOptional()
  fuelType?: string;

  @IsString()
  @IsOptional()
  transmission?: string;

  @IsString()
  @IsOptional()
  driveType?: string;

  @IsString()
  @IsOptional()
  bodyType?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  mileage?: number;

  @IsString()
  @IsOptional()
  registrationDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
