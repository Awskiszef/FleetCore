import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../common/pagination/paginated-response';

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

    const allowedSortFields = [
      'createdAt',
      'name',
      'oemNumber',
      'aftermarketNumber',
      'barcode',
      'quantity',
      'price',
    ];
    if (query?.sortBy && !allowedSortFields.includes(query.sortBy)) {
      throw new BadRequestException(
        `Niedozwolone pole sortowania: ${query.sortBy}. Dozwolone: ${allowedSortFields.join(', ')}`,
      );
    }

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
        orderBy: query?.sortBy
          ? { [query.sortBy]: query.sortOrder }
          : { createdAt: 'desc' },
        include: { supplier: true },
      }),
      this.prisma.part.count({ where }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    return this.prisma.part.findUnique({
      where: { id },
    });
  }

  async update(
    id: string,
    data: Prisma.PartUpdateInput,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.prisma.part.findUnique({ where: { id } });
    const updated = await this.prisma.part.update({
      where: { id },
      data,
    });

    if (
      existing &&
      data.quantity !== undefined &&
      existing.quantity !== data.quantity
    ) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'MANUAL_STOCK_UPDATE',
          entity: 'Part',
          entityId: id,
          oldValues: { quantity: existing.quantity } as any,
          newValues: { quantity: updated.quantity } as any,
          ipAddress,
          userAgent,
        },
      });
    }

    return updated;
  }

  async remove(id: string) {
    return this.prisma.part.delete({
      where: { id },
    });
  }
}
