import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, RepairOrderStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class RepairOrdersService {
  private readonly logger = new Logger(RepairOrdersService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(data: Prisma.RepairOrderUncheckedCreateInput, userId?: string) {
    const order = await this.prisma.repairOrder.create({ data });
    await this.prisma.repairOrderHistory.create({
      data: {
        repairOrderId: order.id,
        status: order.status,
        userId: userId,
        notes: 'Utworzenie zlecenia',
      },
    });
    return order;
  }

  async findAll(query?: PaginationQueryDto) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.RepairOrderWhereInput = {};
    if (query?.search) {
      where.OR = [
        { vehicle: { licensePlate: { contains: query.search, mode: 'insensitive' } } },
        { customer: { fullName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.repairOrder.findMany({
        where,
        include: {
          vehicle: true,
          customer: true,
          parts: { include: { part: true } },
        },
        skip,
        take: limit,
        orderBy: query?.sortBy
          ? { [query.sortBy]: query.sortOrder }
          : { createdAt: 'desc' },
      }),
      this.prisma.repairOrder.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const order = await this.prisma.repairOrder.findUnique({
      where: { id },
      include: {
        vehicle: true,
        customer: true,
        parts: { include: { part: true } },
        history: { include: { user: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) throw new NotFoundException('Zlecenie nie znalezione');
    return order;
  }

  async update(id: string, data: Prisma.RepairOrderUncheckedUpdateInput, userId?: string) {
    const existingOrder = await this.prisma.repairOrder.findUnique({
      where: { id },
      include: { customer: true, vehicle: true, parts: true },
    });
    if (!existingOrder) throw new NotFoundException('Zlecenie nie znalezione');

    const isFrozen = existingOrder.status === 'COMPLETED' || existingOrder.status === 'DELIVERED';
    
    // Jeśli zamrożone, upewnijmy się że próbują zmienić TYLKO status (np. cofnąć) lub dodają fakturę
    if (isFrozen) {
      const allowedKeys = ['status', 'invoiceId', 'invoiceUrl'];
      const attemptToChangeFrozenData = Object.keys(data).some(k => !allowedKeys.includes(k));
      if (attemptToChangeFrozenData) {
        throw new ForbiddenException('Zlecenie jest zamrożone (zakończone). Edycja zablokowana.');
      }
    }

    const updatedOrder = await this.prisma.repairOrder.update({
      where: { id },
      data,
      include: {
        customer: true,
        vehicle: true,
        assignedMechanic: true,
        parts: { include: { part: true } },
      },
    });

    if (data.status && data.status !== existingOrder.status) {
      const status = data.status as RepairOrderStatus;
      
      await this.prisma.repairOrderHistory.create({
        data: {
          repairOrderId: id,
          status: status,
          userId: userId,
          notes: `Zmiana statusu na ${status}`,
        },
      });

      // Jeśli przeszło na COMPLETED, zdejmujemy z magazynu trwale to co zarezerwowano
      if (status === 'COMPLETED' && existingOrder.status !== 'COMPLETED') {
        for (const p of existingOrder.parts) {
          await this.prisma.part.update({
            where: { id: p.partId },
            data: { 
              quantity: { decrement: p.quantity },
              reservedQuantity: { decrement: p.quantity } 
            },
          });
          await this.prisma.inventoryTransaction.create({
            data: {
              partId: p.partId,
              type: 'OUT',
              quantity: p.quantity,
              repairOrderId: id,
              userId: userId,
              notes: 'Zakończenie zlecenia - stałe zdjęcie ze stanu',
            }
          });
        }
      }

      // Powiadomienia
      const customer = existingOrder.customer;
      const vehicle = existingOrder.vehicle;

      if (customer) {
        let message = `Witaj ${customer.fullName || customer.companyName}! Twoje zlecenie naprawy (Pojazd: ${vehicle?.licensePlate || ''}) zmieniło status na: ${status}.`;

        if (status === 'COMPLETED') {
          message = `Dzień dobry! Informujemy, że naprawa pojazdu ${vehicle?.licensePlate || ''} została zakończona. Pojazd jest gotowy do odbioru. Całkowity koszt: ${updatedOrder.finalCost ? Number(updatedOrder.finalCost) : 'do ustalenia'} PLN. Pozdrawiamy, zespół AtlasHC Garage.`;
        }

        const subject = `Aktualizacja statusu naprawy: ${status}`;

        if (customer.email) {
          this.notificationsService
            .sendEmail(customer.email, subject, `<p>${message}</p>`)
            .catch((e) => this.logger.error(e));
        }
        if (customer.phone) {
          this.notificationsService
            .sendSms(customer.phone, message)
            .catch((e) => this.logger.error(e));
        }
      }
    }

    // Jeśli zmieniono laborCost lub marginPercentage, przelicz ponownie
    if (data.laborCost !== undefined || data.marginPercentage !== undefined) {
      await this.recalculateCost(id);
    }

    return updatedOrder;
  }

  async remove(id: string) {
    const existing = await this.prisma.repairOrder.findUnique({ where: { id }});
    if (!existing) throw new NotFoundException();
    // Jeśli używamy soft delete za pomocą Prisma Extension, to normalne delete zrobi update deletedAt.
    return this.prisma.repairOrder.delete({
      where: { id },
    });
  }

  async addPart(orderId: string, partId: string, quantity: number, userId?: string) {
    const order = await this.prisma.repairOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Zlecenie nie znalezione');
    if (order.status === 'COMPLETED' || order.status === 'DELIVERED') {
      throw new ForbiddenException('Zlecenie zamrożone, nie można dodać części.');
    }

    const part = await this.prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw new NotFoundException('Część nie znaleziona');
    
    const available = part.quantity - part.reservedQuantity;
    if (available < quantity) {
      throw new BadRequestException(`Brak wystarczającej ilości w magazynie. Dostępne: ${available}`);
    }

    const existing = await this.prisma.repairOrderPart.findUnique({
      where: {
        repairOrderId_partId: { repairOrderId: orderId, partId: partId },
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Ta część jest już przypisana do tego zlecenia. Usuń ją i dodaj ponownie z inną ilością.',
      );
    }

    // Rezerwacja
    await this.prisma.$transaction([
      this.prisma.part.update({
        where: { id: partId },
        data: { reservedQuantity: { increment: quantity } },
      }),
      this.prisma.inventoryTransaction.create({
        data: {
          partId: partId,
          type: 'RESERVE',
          quantity: quantity,
          repairOrderId: orderId,
          userId: userId,
          notes: 'Rezerwacja dla zlecenia',
        }
      }),
      this.prisma.repairOrderPart.create({
        data: {
          repairOrderId: orderId,
          partId: partId,
          quantity: quantity,
          priceAtUsage: part.unitPrice,
        },
      })
    ]);

    await this.recalculateCost(orderId);
    return true;
  }

  async removePart(orderId: string, partId: string, userId?: string) {
    const order = await this.prisma.repairOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Zlecenie nie znalezione');
    if (order.status === 'COMPLETED' || order.status === 'DELIVERED') {
      throw new ForbiddenException('Zlecenie zamrożone, nie można usuwać części.');
    }

    const link = await this.prisma.repairOrderPart.findUnique({
      where: {
        repairOrderId_partId: { repairOrderId: orderId, partId: partId },
      },
    });
    if (!link) return;

    // Zdjęcie rezerwacji
    await this.prisma.$transaction([
      this.prisma.part.update({
        where: { id: partId },
        data: { reservedQuantity: { decrement: link.quantity } },
      }),
      this.prisma.inventoryTransaction.create({
        data: {
          partId: partId,
          type: 'UNRESERVE',
          quantity: link.quantity,
          repairOrderId: orderId,
          userId: userId,
          notes: 'Anulowanie rezerwacji z zlecenia',
        }
      }),
      this.prisma.repairOrderPart.delete({
        where: { id: link.id },
      })
    ]);

    await this.recalculateCost(orderId);
    return true;
  }

  private async recalculateCost(orderId: string) {
    const order = await this.prisma.repairOrder.findUnique({
      where: { id: orderId },
      include: { parts: true },
    });
    if (!order) return;

    if (order.laborCost != null || order.marginPercentage != null) {
      const partsCost = order.parts.reduce(
        (sum, p) => sum + Number(p.priceAtUsage) * p.quantity,
        0,
      );
      const labor = Number(order.laborCost || 0);
      const margin = Number(order.marginPercentage || 0);

      const newFinal = labor + partsCost * (1 + margin / 100);

      await this.prisma.repairOrder.update({
        where: { id: orderId },
        data: { finalCost: newFinal },
      });
    }
  }
}
