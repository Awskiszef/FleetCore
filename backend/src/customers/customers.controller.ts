import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Prisma } from '@prisma/client';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@Body() createCustomerDto: Prisma.CustomerCreateInput) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  findAll() {
    return this.customersService.findAll();
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
  update(@Param('id') id: string, @Body() updateCustomerDto: Prisma.CustomerUpdateInput) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
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
