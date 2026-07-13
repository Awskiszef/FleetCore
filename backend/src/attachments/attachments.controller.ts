import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Get,
  Param,
  Delete,
  Res,
  HttpException,
  HttpStatus,
  UseGuards,
  Inject,
  BadRequestException,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachmentsService } from './attachments.service';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { FILE_STORAGE } from './storage.service';
import type { FileStorage } from './storage.service';
import { AttachmentEntityType } from '@prisma/client';
import { extname } from 'path';

function checkMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;

  const hex = buffer.toString('hex', 0, 8).toUpperCase();

  switch (mimeType) {
    case 'image/jpeg':
      return hex.startsWith('FFD8FF');
    case 'image/png':
      return hex.startsWith('89504E470D0A1A0A');
    case 'application/pdf':
      return hex.startsWith('25504446'); // %PDF
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      // docx, zip
      return hex.startsWith('504B0304');
    case 'application/msword':
      // old doc
      return hex.startsWith('D0CF11E0A1B11AE1');
    default:
      return false;
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE) private storage: FileStorage,
  ) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'RECEPTIONIST', 'MECHANIC')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return cb(new Error('Niedozwolony format pliku'), false);
        }
        cb(null, true);
      },
    }),
  )
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('entityType') entityType: AttachmentEntityType,
    @Body('entityId') entityId: string,
    @Req() req: any,
  ) {
    if (req.user?.role === 'MECHANIC') {
      if (entityType !== AttachmentEntityType.REPAIR_ORDER) {
        throw new ForbiddenException(
          'Mechanik może dodawać załączniki tylko do zleceń naprawy',
        );
      }
      const order = await this.prisma.repairOrder.findUnique({
        where: { id: entityId },
      });
      if (!order || order.assignedMechanicId !== req.user.sub) {
        throw new ForbiddenException(
          'Nie możesz dodać załącznika do nieswojego zlecenia',
        );
      }
    }
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Walidacja Magic Bytes
    if (!checkMagicBytes(file.buffer, file.mimetype)) {
      throw new BadRequestException(
        'Nieprawidłowa zawartość pliku (magic bytes mismatch)',
      );
    }

    // Walidacja czy obiekt istnieje
    if (entityType === AttachmentEntityType.VEHICLE) {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: entityId },
      });
      if (!vehicle) throw new BadRequestException('Vehicle not found');
    } else if (entityType === AttachmentEntityType.REPAIR_ORDER) {
      const order = await this.prisma.repairOrder.findUnique({
        where: { id: entityId },
      });
      if (!order) throw new BadRequestException('RepairOrder not found');
    } else if (entityType === AttachmentEntityType.CUSTOMER) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: entityId },
      });
      if (!customer) throw new BadRequestException('Customer not found');
    } else {
      throw new BadRequestException('Invalid entityType');
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    const storedFileName = `${entityType.toLowerCase()}_${entityId}_${uniqueSuffix}${ext}`;

    await this.storage.save(file, storedFileName);

    return this.attachmentsService.create({
      entityType,
      entityId,
      originalFileName: file.originalname,
      storedFileName,
      mimeType: file.mimetype,
      size: file.size,
    });
  }

  @Get('entity/:entityType/:entityId')
  findByEntity(
    @Param('entityType') entityType: AttachmentEntityType,
    @Param('entityId') entityId: string,
  ) {
    return this.attachmentsService.findByEntity(entityType, entityId);
  }

  @Get(':id/content')
  async download(@Param('id') id: string, @Res() res: Response) {
    const attachment = await this.attachmentsService.findOne(id);
    if (!attachment) {
      throw new HttpException('Plik nie istnieje', HttpStatus.NOT_FOUND);
    }

    const fileExists = await this.storage.exists(attachment.storedFileName);
    if (!fileExists) {
      throw new HttpException(
        'Plik nie istnieje na dysku',
        HttpStatus.NOT_FOUND,
      );
    }

    const stream = await this.storage.open(attachment.storedFileName);

    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `inline; filename="${attachment.originalFileName}"`,
    });

    stream.pipe(res);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  remove(@Param('id') id: string) {
    return this.attachmentsService.remove(id);
  }
}
