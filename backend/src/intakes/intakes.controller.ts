import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { IntakesService } from './intakes.service';
import { CreateIntakeDto } from './dto/create-intake.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('intakes')
export class IntakesController {
  constructor(private readonly intakesService: IntakesService) {}

  @Post()
  create(@Body() createIntakeDto: CreateIntakeDto, @Req() req: any) {
    return this.intakesService.create(createIntakeDto, req.user.sub);
  }

  @Get('repair-order/:id')
  findByRepairOrder(@Param('id') id: string) {
    return this.intakesService.findByRepairOrder(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.intakesService.findOne(id);
  }
}
