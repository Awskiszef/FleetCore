import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FleetService {
  constructor(private prisma: PrismaService) {}

  // Vehicles
  async createVehicle(data: Prisma.FleetVehicleCreateInput) {
    return this.prisma.fleetVehicle.create({ data });
  }

  async findAllVehicles() {
    return this.prisma.fleetVehicle.findMany({
      include: {
        logs: {
          orderBy: { date: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOneVehicle(id: string) {
    return this.prisma.fleetVehicle.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { date: 'desc' }
        }
      }
    });
  }

  async updateVehicle(id: string, data: Prisma.FleetVehicleUpdateInput) {
    return this.prisma.fleetVehicle.update({
      where: { id },
      data,
    });
  }

  async removeVehicle(id: string) {
    return this.prisma.fleetVehicle.delete({
      where: { id },
    });
  }

  // Logs
  async createLog(vehicleId: string, data: Omit<Prisma.FleetVehicleLogCreateInput, 'fleetVehicle'>) {
    return this.prisma.fleetVehicleLog.create({
      data: {
        ...data,
        fleetVehicle: { connect: { id: vehicleId } }
      }
    });
  }

  async removeLog(id: string) {
    return this.prisma.fleetVehicleLog.delete({
      where: { id },
    });
  }
}
