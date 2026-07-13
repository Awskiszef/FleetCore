import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { RepairOrderStatus } from '@prisma/client';

export class CreateRepairOrderDto {
  @IsString()
  customerId: string;

  @IsString()
  vehicleId: string;

  @IsString()
  @IsOptional()
  assignedMechanicId?: string;

  @IsString()
  reportedIssue: string;

  @IsEnum(RepairOrderStatus)
  @IsOptional()
  status?: RepairOrderStatus;

  @IsString()
  @IsOptional()
  diagnosis?: string;

  @IsString()
  @IsOptional()
  mechanicNotes?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  estimatedCost?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  finalCost?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  laborCost?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  marginPercentage?: number;
}
