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
    try {
      const today = new Date().toISOString().split('T')[0];
      const url = `https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${today}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new HttpException('Błąd podczas pobierania danych z API MF.', HttpStatus.BAD_REQUEST);
      }
      
      const data = await response.json();
      if (!data?.result?.subject) {
        throw new HttpException('Nie znaleziono firmy o podanym NIP w bazie MF.', HttpStatus.NOT_FOUND);
      }
      
      const subject = data.result.subject;
      
      return {
        name: subject.name,
        address: subject.workingAddress || subject.residenceAddress || '',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Błąd wewnętrzny serwera przy odpytywaniu GUS/MF.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
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
