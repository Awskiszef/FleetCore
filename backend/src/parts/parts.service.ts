import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class PartsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.PartCreateInput) {
    return this.prisma.part.create({ data });
  }

  async findAll(query?: PaginationQueryDto) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PartWhereInput = {};
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { oemNumber: { contains: query.search, mode: 'insensitive' } },
        { aftermarketNumber: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.part.findMany({
        where,
        skip,
        take: limit,
        orderBy: query?.sortBy ? { [query.sortBy]: query.sortOrder } : { createdAt: 'desc' },
        include: { supplier: true },
      }),
      this.prisma.part.count({ where }),
    ]);

    return { data, total, page, limit };
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
