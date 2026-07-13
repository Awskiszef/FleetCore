import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateIntakeDto } from './dto/create-intake.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntakesService {
  constructor(private prisma: PrismaService) {}

  async create(createIntakeDto: CreateIntakeDto, userId: string) {
    return this.prisma.vehicleIntake.create({
      data: {
        ...createIntakeDto,
        createdByUserId: userId,
      },
    });
  }

  async findByRepairOrder(repairOrderId: string) {
    return this.prisma.vehicleIntake.findUnique({
      where: { repairOrderId },
    });
  }

  async findOne(id: string) {
    const intake = await this.prisma.vehicleIntake.findUnique({
      where: { id },
    });
    if (!intake) throw new NotFoundException('Intake not found');
    return intake;
  }
}
