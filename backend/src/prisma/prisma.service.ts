import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    this.$use(async (params, next) => {
      const modelsWithDeletedAt = [
        'User',
        'Customer',
        'Vehicle',
        'RepairOrder',
        'Part',
        'FleetVehicle',
      ];

      if (params.model && modelsWithDeletedAt.includes(params.model)) {
        if (params.action === 'findUnique' || params.action === 'findFirst') {
          params.action = 'findFirst';
          params.args.where['deletedAt'] = null;
        }
        if (params.action === 'findMany') {
          if (params.args.where) {
            if (params.args.where.deletedAt === undefined) {
              params.args.where['deletedAt'] = null;
            }
          } else {
            params.args['where'] = { deletedAt: null };
          }
        }
      }
      return next(params);
    });

    this.$use(async (params, next) => {
      const modelsWithDeletedAt = [
        'User',
        'Customer',
        'Vehicle',
        'RepairOrder',
        'Part',
        'FleetVehicle',
      ];

      if (params.model && modelsWithDeletedAt.includes(params.model)) {
        if (params.action == 'delete') {
          params.action = 'update';
          params.args['data'] = { deletedAt: new Date() };
        }
        if (params.action == 'deleteMany') {
          params.action = 'updateMany';
          if (params.args.data != undefined) {
            params.args.data['deletedAt'] = new Date();
          } else {
            params.args['data'] = { deletedAt: new Date() };
          }
        }
      }
      return next(params);
    });

    await this.$connect();
  }
}
