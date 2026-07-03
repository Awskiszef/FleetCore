import { Module } from '@nestjs/common';
import { InfaktService } from './infakt.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [InfaktService],
  exports: [InfaktService],
})
export class InfaktModule {}
