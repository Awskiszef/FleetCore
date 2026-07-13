import { Module } from '@nestjs/common';
import { InfaktService } from './infakt.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PrismaModule, SettingsModule],
  providers: [InfaktService],
  exports: [InfaktService],
})
export class InfaktModule {}
