import { Module } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LocalFileStorage } from './local-storage.service';
import { FILE_STORAGE } from './storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [AttachmentsController],
  providers: [
    AttachmentsService,
    {
      provide: FILE_STORAGE,
      useClass: LocalFileStorage,
    },
  ],
})
export class AttachmentsModule {}
