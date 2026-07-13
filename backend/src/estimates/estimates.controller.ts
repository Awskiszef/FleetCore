import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { EstimatesService } from './estimates.service';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('estimates')
export class EstimatesController {
  constructor(private readonly estimatesService: EstimatesService) {}

  @Post()
  create(@Body() createEstimateDto: CreateEstimateDto, @Req() req: any) {
    return this.estimatesService.create(createEstimateDto, req.user.sub);
  }

  @Get('repair-order/:id')
  findAllByRepairOrder(@Param('id') id: string) {
    return this.estimatesService.findAllByRepairOrder(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.estimatesService.findOne(id);
  }

  @Get(':id/pdf')
  generatePdf(@Param('id') id: string, @Res() res: Response) {
    return this.estimatesService.generatePdf(id, res);
  }
}
