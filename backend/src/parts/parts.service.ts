import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PartsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.PartCreateInput) {
    return this.prisma.part.create({ data });
  }

  async findAll() {
    return this.prisma.part.findMany();
  }

  async findOne(id: string) {
    return this.prisma.part.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: Prisma.PartUpdateInput) {
    return this.prisma.part.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.part.delete({
      where: { id },
    });
  }
}
