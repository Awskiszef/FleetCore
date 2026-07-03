import { Module } from '@nestjs/common';
import { PartsService } from './parts.service';
import { PartsController } from './parts.controller';

@Module({
  providers: [PartsService],
  controllers: [PartsController]
})
export class PartsModule {}
