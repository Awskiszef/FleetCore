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
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    try {
      return await this.customersService.create(createCustomerDto);
    } catch (error) {
      throw error;
    }
  }

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return await this.customersService.findAll(query);
  }

  @Get('fetch-nip/:nip')
  async fetchNip(@Param('nip') nip: string) {
    return this.customersService.fetchNip(nip);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    try {
      return await this.customersService.update(id, updateCustomerDto);
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  async remove(@Param('id') id: string) {
    try {
      return await this.customersService.remove(id);
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new HttpException(
          'Foreign key constraint violated',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }
}
