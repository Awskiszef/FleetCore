import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateIntakeDto {
  @IsString()
  repairOrderId: string;

  @IsInt()
  @IsOptional()
  mileage?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  fuelLevel?: number;

  @IsString()
  @IsOptional()
  damages?: string;

  @IsString()
  @IsOptional()
  equipment?: string;

  @IsString()
  @IsOptional()
  signatureUrl?: string;
}
