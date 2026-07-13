import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../common/pagination/paginated-response';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findAll(query?: PaginationQueryDto) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const allowedSortFields = ['createdAt', 'email', 'fullName', 'role'];
    if (query?.sortBy && !allowedSortFields.includes(query.sortBy)) {
      throw new BadRequestException(
        `Niedozwolone pole sortowania: ${query.sortBy}. Dozwolone: ${allowedSortFields.join(', ')}`,
      );
    }

    const where: Prisma.UserWhereInput = {};
    if (query?.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: query?.sortBy
          ? { [query.sortBy]: query.sortOrder || 'asc' }
          : { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          createdAt: true,
          mustChangePassword: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async create(dto: CreateUserDto) {
    const { password, ...userData } = dto;
    const email = userData.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException(
        'Użytkownik o takim adresie e-mail już istnieje',
      );
    }

    const passwordHash = password ? await bcrypt.hash(password, 12) : null;

    return this.prisma.user.create({
      data: {
        ...userData,
        email,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        mustChangePassword: true,
      },
    });
  }

  async delete(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new BadRequestException('Użytkownik nie istnieje');
    }

    if (user.role === 'OWNER') {
      const ownerCount = await this.prisma.user.count({
        where: { role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Nie można usunąć ostatniego właściciela systemu',
        );
      }
    }

    return this.prisma.user.delete({ where: { id } });
  }

  async resetPassword(
    id: string,
    temporaryPassword?: string,
    mustChangePassword: boolean = true,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BadRequestException('Użytkownik nie istnieje');

    const passwordHash = temporaryPassword
      ? await bcrypt.hash(temporaryPassword, 12)
      : null;

    return this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword,
      },
      select: {
        id: true,
        email: true,
        mustChangePassword: true,
      },
    });
  }
}
