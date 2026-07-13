import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  Query,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { UsersService } from './users.service';
import { Roles } from '../auth/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('users')
@Roles('OWNER', 'ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.usersService.findAll(query);
  }

  @Post()
  @Roles('OWNER', 'ADMIN')
  create(
    @Body() createUserDto: CreateUserDto,
    @Request() req: ExpressRequest & { user?: any },
  ) {
    if (req.user?.role === 'ADMIN' && createUserDto.role === 'OWNER') {
      throw new ForbiddenException('Admin nie może tworzyć właścicieli');
    }
    return this.usersService.create(createUserDto);
  }

  @Post(':id/reset-password')
  @Roles('OWNER', 'ADMIN')
  async resetPassword(
    @Param('id') id: string,
    @Body() body: { temporaryPassword?: string; mustChangePassword?: boolean },
    @Request() req: ExpressRequest & { user?: any },
  ) {
    return this.usersService.resetPassword(
      id,
      body.temporaryPassword,
      body.mustChangePassword,
      req.user,
    );
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  async delete(
    @Param('id') id: string,
    @Request() req: ExpressRequest & { user?: any },
  ) {
    return this.usersService.delete(id, req.user);
  }
}
