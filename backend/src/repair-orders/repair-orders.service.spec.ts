import { Test, TestingModule } from '@nestjs/testing';
import { RepairOrdersService } from './repair-orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Prisma } from '@prisma/client';

describe('RepairOrdersService', () => {
  let service: RepairOrdersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepairOrdersService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
            repairOrder: { findUnique: jest.fn(), update: jest.fn() },
            part: { findUnique: jest.fn() },
            repairOrderPart: { findUnique: jest.fn() },
            $executeRaw: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            sendEmail: jest.fn(),
            sendSms: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RepairOrdersService>(RepairOrdersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addPart', () => {
    it('should prevent race condition using $executeRaw', async () => {
      // Mock order finding
      (prisma.repairOrder.findUnique as jest.Mock).mockResolvedValue({
        id: 'order-1',
        status: 'REPAIRING',
      });
      // Mock part finding
      (prisma.part.findUnique as jest.Mock).mockResolvedValue({
        id: 'part-1',
        quantity: 10,
        reservedQuantity: 0,
        unitPrice: new Prisma.Decimal(100),
      });

      let executeRawCalled = false;
      // Mock transaction
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
        if (typeof cb === 'function') {
          // It's an interactive transaction
          const txMock = {
            $executeRaw: jest.fn().mockResolvedValue(1),
            inventoryTransaction: { create: jest.fn() },
            repairOrderPart: { create: jest.fn() },
          };
          const result = await cb(txMock);
          executeRawCalled = txMock.$executeRaw.mock.calls.length > 0;
          return result;
        }
      });

      await service.addPart('order-1', 'part-1', 2, 'user-1');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(executeRawCalled).toBe(true);
    });
  });

  describe('update (idempotent finalize)', () => {
    it('should be idempotent and not decrement inventory twice if inventoryFinalizedAt is present', async () => {
      // Mock existing order
      (prisma.repairOrder.findUnique as jest.Mock).mockResolvedValue({
        id: 'order-1',
        status: 'READY',
        inventoryFinalizedAt: new Date(), // Already finalized!
        parts: [
          {
            partId: 'part-1',
            quantity: 1,
            priceAtUsage: new Prisma.Decimal(50),
          },
        ],
      });

      let partUpdateCalled = false;

      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          const txMock = {
            part: {
              update: jest.fn().mockImplementation(() => {
                partUpdateCalled = true;
              }),
            },
            inventoryTransaction: { create: jest.fn() },
            repairOrder: {
              update: jest.fn().mockResolvedValue({ finalCost: 100 }),
            },
            repairOrderHistory: { create: jest.fn() },
          };
          return await cb(txMock);
        }
      });

      await service.update('order-1', { status: 'COMPLETED' }, 'user-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(partUpdateCalled).toBe(false); // Should not update part again because it's already finalized
    });
  });
});
