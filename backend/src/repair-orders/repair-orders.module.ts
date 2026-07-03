import { Module } from '@nestjs/common';
import { RepairOrdersService } from './repair-orders.service';
import { RepairOrdersController } from './repair-orders.controller';
import { InfaktModule } from '../infakt/infakt.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [InfaktModule, NotificationsModule],
  providers: [RepairOrdersService],
  controllers: [RepairOrdersController]
})
export class RepairOrdersModule {}
