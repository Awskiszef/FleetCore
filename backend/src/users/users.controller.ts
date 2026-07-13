import { Controller, Get, Post, Body, Delete, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { Prisma } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Post()
  async create(@Body() data: Prisma.UserCreateInput) {
    return this.usersService.create(data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
