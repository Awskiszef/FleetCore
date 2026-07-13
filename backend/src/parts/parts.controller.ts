import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  HttpStatus,
  Query,
  Request,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { PartsService } from './parts.service';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('parts')
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  create(@Body() createPartDto: CreatePartDto) {
    return this.partsService.create(createPartDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.partsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partsService.findOne(id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  update(
    @Param('id') id: string,
    @Body() updatePartDto: UpdatePartDto,
    @Request() req: any,
  ) {
    return this.partsService.update(
      id,
      updatePartDto,
      req.user?.sub,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  async remove(@Param('id') id: string) {
    return this.partsService.remove(id);
  }
}
