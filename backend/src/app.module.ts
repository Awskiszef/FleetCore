import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CustomersModule } from './customers/customers.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { RepairOrdersModule } from './repair-orders/repair-orders.module';
import { PartsModule } from './parts/parts.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SettingsModule } from './settings/settings.module';
import { FleetModule } from './fleet/fleet.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt.guard';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule, 
    CustomersModule, 
    VehiclesModule, 
    RepairOrdersModule, 
    PartsModule, 
    AttachmentsModule,
    DashboardModule,
    NotificationsModule,
    SettingsModule,
    FleetModule,
    UsersModule,
    AuthModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
