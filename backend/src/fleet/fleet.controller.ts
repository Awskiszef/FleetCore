import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { FleetService } from './fleet.service';
import { Prisma } from '@prisma/client';

@Controller('fleet')
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Post()
  createVehicle(@Body() data: Prisma.FleetVehicleCreateInput) {
    return this.fleetService.createVehicle(data);
  }

  @Get()
  findAllVehicles() {
    return this.fleetService.findAllVehicles();
  }

  @Get(':id')
  findOneVehicle(@Param('id') id: string) {
    return this.fleetService.findOneVehicle(id);
  }

  @Patch(':id')
  updateVehicle(
    @Param('id') id: string,
    @Body() data: Prisma.FleetVehicleUpdateInput,
  ) {
    return this.fleetService.updateVehicle(id, data);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  remove(@Param('id') id: string) {
    return this.fleetService.removeVehicle(id);
  }

  // Logs
  @Post(':id/logs')
  createLog(
    @Param('id') id: string,
    @Body() data: Omit<Prisma.FleetVehicleLogCreateInput, 'fleetVehicle'>,
  ) {
    return this.fleetService.createLog(id, data);
  }

  @Delete('logs/:logId')
  @Roles('OWNER', 'ADMIN')
  removeLog(@Param('logId') logId: string) {
    return this.fleetService.removeLog(logId);
  }
}
