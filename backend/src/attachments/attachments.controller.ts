import { Controller, Post, UseInterceptors, UploadedFile, Body, Get, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachmentsService } from './attachments.service';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';

@Controller('attachments')
export class AttachmentsController {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly prisma: PrismaService
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
      }
    })
  }))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('entityType') entityType: string,
    @Body('entityId') entityId: string,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    
    let customerFolder = 'common';

    if (entityType === 'VEHICLE') {
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id: entityId } });
      if (vehicle && vehicle.customerId) {
        customerFolder = vehicle.customerId;
      }
    } else if (entityType === 'REPAIR_ORDER') {
      const order = await this.prisma.repairOrder.findUnique({ where: { id: entityId } });
      if (order && order.customerId) {
        customerFolder = order.customerId;
      }
    }

    const customerDir = join(process.cwd(), 'uploads', customerFolder);
    if (!fs.existsSync(customerDir)) {
      fs.mkdirSync(customerDir, { recursive: true });
    }

    const newFilePath = join(customerDir, file.filename);
    fs.renameSync(file.path, newFilePath);

    return this.attachmentsService.create({
      entityType,
      entityId,
      fileName: file.filename,
      mimeType: file.mimetype,
      url: `/uploads/${customerFolder}/${file.filename}`,
      size: file.size,
    });
  }

  @Get('entity/:entityType/:entityId')
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.attachmentsService.findByEntity(entityType, entityId);
  }
}
