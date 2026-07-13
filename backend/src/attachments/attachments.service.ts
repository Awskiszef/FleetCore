import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FILE_STORAGE } from './storage.service';
import type { FileStorage } from './storage.service';
import { AttachmentEntityType } from '@prisma/client';

@Injectable()
export class AttachmentsService {
  constructor(
    private prisma: PrismaService,
    @Inject(FILE_STORAGE) private storage: FileStorage,
  ) {}

  async create(data: {
    entityType: AttachmentEntityType;
    entityId: string;
    originalFileName: string;
    storedFileName: string;
    mimeType: string;
    size: number;
  }) {
    return this.prisma.attachment.create({
      data,
    });
  }

  async findByEntity(entityType: AttachmentEntityType, entityId: string) {
    return this.prisma.attachment.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.attachment.findUnique({ where: { id } });
  }

  async remove(id: string) {
    const attachment = await this.findOne(id);
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Usuń plik ze storage
    await this.storage.delete(attachment.storedFileName);

    return this.prisma.attachment.delete({ where: { id } });
  }
}
