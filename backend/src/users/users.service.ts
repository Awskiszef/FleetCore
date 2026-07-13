import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const usersCount = await this.prisma.user.count();
    if (usersCount === 0) {
      console.log('No users found. Creating default admin...');
      const passwordHash = await bcrypt.hash('admin123', 10);
      await this.prisma.user.create({
        data: {
          email: 'admin@atlashc.pl',
          passwordHash,
          fullName: 'Admin',
          role: 'OWNER',
        },
      });
      console.log('Default admin created (admin@atlashc.pl / admin123).');
    }
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async create(data: Prisma.UserCreateInput) {
    const passwordHash = data.passwordHash ? await bcrypt.hash(data.passwordHash, 10) : null;
    return this.prisma.user.create({
      data: {
        ...data,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
