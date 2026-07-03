import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttachmentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { entityType: string, entityId: string, fileName: string, mimeType: string, url: string, size: number }) {
    return this.prisma.attachment.create({
      data,
    });
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.prisma.attachment.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
}
