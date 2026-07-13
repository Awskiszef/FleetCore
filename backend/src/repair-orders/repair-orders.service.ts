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
import { createPaginatedResponse } from '../common/pagination/paginated-response';

const TRANSITIONS: Record<RepairOrderStatus, RepairOrderStatus[]> = {
  NEW: ['WAITING', 'DIAGNOSING', 'CANCELLED'],
  WAITING: ['DIAGNOSING', 'CANCELLED'],
  DIAGNOSING: ['REPAIRING', 'WAITING', 'CANCELLED'],
  REPAIRING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'REPAIRING'],
  COMPLETED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

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

    const allowedSortFields = [
      'createdAt',
      'status',
      'estimatedCost',
      'finalCost',
    ];
    if (query?.sortBy && !allowedSortFields.includes(query.sortBy)) {
      throw new BadRequestException(
        `Niedozwolone pole sortowania: ${query.sortBy}. Dozwolone: ${allowedSortFields.join(', ')}`,
      );
    }

    const where: Prisma.RepairOrderWhereInput = {};
    if (query?.search) {
      where.OR = [
        {
          vehicle: {
            licensePlate: { contains: query.search, mode: 'insensitive' },
          },
        },
        {
          customer: {
            fullName: { contains: query.search, mode: 'insensitive' },
          },
        },
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

    return createPaginatedResponse(data, total, page, limit);
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

  async update(
    id: string,
    data: Prisma.RepairOrderUncheckedUpdateInput,
    userId?: string,
  ) {
    const existingOrder = await this.prisma.repairOrder.findUnique({
      where: { id },
      include: { customer: true, vehicle: true, parts: true },
    });
    if (!existingOrder) throw new NotFoundException('Zlecenie nie znalezione');

    const isFrozen =
      existingOrder.status === 'COMPLETED' ||
      existingOrder.status === 'DELIVERED';

    if (isFrozen) {
      const allowedKeys = ['status', 'invoiceId', 'invoiceUrl'];
      const attemptToChangeFrozenData = Object.keys(data).some(
        (k) => !allowedKeys.includes(k),
      );
      if (attemptToChangeFrozenData) {
        throw new ForbiddenException(
          'Zlecenie jest zamrożone (zakończone). Edycja zablokowana.',
        );
      }
    }

    const txResult = await this.prisma.$transaction(async (tx) => {
      const finalData = { ...data };
      let notifyStatusChanged: RepairOrderStatus | null = null;
      let notifyCustomerData: {
        email: string | null;
        phone: string | null;
        fullName: string | null;
        companyName: string | null;
        vehiclePlate: string | null;
        finalCost: number | null;
      } | null = null;

      // State machine logic
      if (finalData.status && finalData.status !== existingOrder.status) {
        const newStatus = finalData.status as RepairOrderStatus;

        if (!TRANSITIONS[existingOrder.status].includes(newStatus)) {
          throw new BadRequestException(
            `Niedozwolone przejście ze statusu ${existingOrder.status} do ${newStatus}`,
          );
        }

        // Handle CANCELLED: unreserve everything
        if (newStatus === 'CANCELLED') {
          for (const p of existingOrder.parts) {
            await tx.part.update({
              where: { id: p.partId },
              data: { reservedQuantity: { decrement: p.quantity } },
            });
            await tx.inventoryTransaction.create({
              data: {
                partId: p.partId,
                type: 'UNRESERVE',
                quantity: p.quantity,
                repairOrderId: id,
                userId: userId,
                notes: 'Anulowanie zlecenia - zwolnienie rezerwacji',
              },
            });
          }
        }

        // Handle COMPLETED: finalize inventory
        if (newStatus === 'COMPLETED') {
          if (!existingOrder.inventoryFinalizedAt) {
            for (const p of existingOrder.parts) {
              await tx.part.update({
                where: { id: p.partId },
                data: {
                  quantity: { decrement: p.quantity },
                  reservedQuantity: { decrement: p.quantity },
                },
              });
              await tx.inventoryTransaction.create({
                data: {
                  partId: p.partId,
                  type: 'OUT',
                  quantity: p.quantity,
                  repairOrderId: id,
                  userId: userId,
                  notes: 'Zakończenie zlecenia - stałe zdjęcie ze stanu',
                },
              });
            }
            finalData.inventoryFinalizedAt = new Date();
          }
          finalData.completedAt = new Date();
        }

        notifyStatusChanged = newStatus;
      }

      // Recalculate cost inside the transaction if laborCost or marginPercentage changed
      if (
        finalData.laborCost !== undefined ||
        finalData.marginPercentage !== undefined
      ) {
        const partsCost = existingOrder.parts.reduce(
          (sum, p) => sum + Number(p.priceAtUsage) * p.quantity,
          0,
        );
        const labor = Number(
          finalData.laborCost ?? existingOrder.laborCost ?? 0,
        );
        const margin = Number(
          finalData.marginPercentage ?? existingOrder.marginPercentage ?? 0,
        );

        const newFinal = new Prisma.Decimal(
          labor + partsCost * (1 + margin / 100),
        );
        finalData.finalCost = newFinal;
      }

      // Update Order
      const updated = await tx.repairOrder.update({
        where: { id },
        data: finalData,
        include: {
          customer: true,
          vehicle: true,
          assignedMechanic: true,
          parts: { include: { part: true } },
        },
      });

      // Insert History
      if (notifyStatusChanged) {
        await tx.repairOrderHistory.create({
          data: {
            repairOrderId: id,
            status: notifyStatusChanged,
            userId: userId,
            notes: `Zmiana statusu na ${notifyStatusChanged}`,
          },
        });

        notifyCustomerData = {
          email: existingOrder.customer?.email ?? null,
          phone: existingOrder.customer?.phone ?? null,
          fullName: existingOrder.customer?.fullName ?? null,
          companyName: existingOrder.customer?.companyName ?? null,
          vehiclePlate: existingOrder.vehicle?.licensePlate ?? null,
          finalCost: updated.finalCost ? Number(updated.finalCost) : null,
        };
      }

      return { updated, notifyStatusChanged, notifyCustomerData };
    });

    const {
      updated: updatedOrder,
      notifyStatusChanged,
      notifyCustomerData,
    } = txResult;

    // Send notifications AFTER transaction is committed
    if (notifyStatusChanged && notifyCustomerData) {
      let message = `Witaj ${notifyCustomerData.fullName || notifyCustomerData.companyName || ''}! Twoje zlecenie naprawy (Pojazd: ${notifyCustomerData.vehiclePlate || ''}) zmieniło status na: ${notifyStatusChanged}.`;

      if (notifyStatusChanged === 'READY') {
        message = `Dzień dobry! Informujemy, że naprawa pojazdu ${notifyCustomerData.vehiclePlate || ''} została zakończona. Pojazd oczekuje na odbiór w naszym serwisie. Całkowity koszt: ${notifyCustomerData.finalCost !== null ? notifyCustomerData.finalCost : 'do ustalenia'} PLN. Pozdrawiamy, zespół AtlasHC Garage.`;
      } else if (notifyStatusChanged === 'COMPLETED') {
        message = `Dzień dobry! Informujemy, że zlecenie dla pojazdu ${notifyCustomerData.vehiclePlate || ''} zostało pomyślnie sfinalizowane (rozliczone). Dziękujemy za zaufanie! Pozdrawiamy, zespół AtlasHC Garage.`;
      }

      const subject = `Aktualizacja statusu naprawy: ${notifyStatusChanged}`;

      if (notifyCustomerData.email) {
        this.notificationsService
          .sendEmail(notifyCustomerData.email, subject, `<p>${message}</p>`)
          .catch((e: unknown) =>
            this.logger.error(e instanceof Error ? e.message : String(e)),
          );
      }
      if (notifyCustomerData.phone) {
        this.notificationsService
          .sendSms(notifyCustomerData.phone, message)
          .catch((e: unknown) =>
            this.logger.error(e instanceof Error ? e.message : String(e)),
          );
      }
    }

    return updatedOrder;
  }

  async remove(id: string) {
    const existing = await this.prisma.repairOrder.findUnique({
      where: { id },
      include: { parts: true },
    });
    if (!existing) throw new NotFoundException();

    if (existing.status === 'COMPLETED' || existing.status === 'DELIVERED') {
      throw new ForbiddenException(
        'Zakończone zlecenie nie może zostać usunięte.',
      );
    }

    // Unreserve parts if it is not cancelled
    await this.prisma.$transaction(async (tx) => {
      if (existing.status !== 'CANCELLED') {
        for (const p of existing.parts) {
          await tx.part.update({
            where: { id: p.partId },
            data: { reservedQuantity: { decrement: p.quantity } },
          });
          await tx.inventoryTransaction.create({
            data: {
              partId: p.partId,
              type: 'UNRESERVE',
              quantity: p.quantity,
              repairOrderId: id,
              notes: 'Usunięcie zlecenia - zwolnienie rezerwacji',
            },
          });
        }
      }

      await tx.repairOrder.delete({
        where: { id },
      });
    });

    return true;
  }

  async addPart(
    orderId: string,
    partId: string,
    quantity: number,
    userId?: string,
  ) {
    const order = await this.prisma.repairOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Zlecenie nie znalezione');
    if (
      order.status === 'COMPLETED' ||
      order.status === 'DELIVERED' ||
      order.status === 'CANCELLED'
    ) {
      throw new ForbiddenException(
        'Zlecenie jest zamrożone (lub anulowane), nie można dodać części.',
      );
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

    const part = await this.prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw new NotFoundException('Część nie znaleziona');

    await this.prisma.$transaction(async (tx) => {
      // Race-condition free reservation
      const updateResult = await tx.$executeRaw`
        UPDATE "Part" 
        SET "reservedQuantity" = "reservedQuantity" + ${quantity} 
        WHERE id = ${partId} 
        AND ("quantity" - "reservedQuantity") >= ${quantity}
      `;

      if (updateResult === 0) {
        throw new BadRequestException(
          'Brak wystarczającej ilości w magazynie do zrealizowania rezerwacji.',
        );
      }

      await tx.inventoryTransaction.create({
        data: {
          partId: partId,
          type: 'RESERVE',
          quantity: quantity,
          repairOrderId: orderId,
          userId: userId,
          notes: 'Rezerwacja dla zlecenia',
        },
      });

      await tx.repairOrderPart.create({
        data: {
          repairOrderId: orderId,
          partId: partId,
          quantity: quantity,
          priceAtUsage: part.unitPrice,
        },
      });
    });

    await this.recalculateCost(orderId);
    return true;
  }

  async removePart(orderId: string, partId: string, userId?: string) {
    const order = await this.prisma.repairOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Zlecenie nie znalezione');
    if (
      order.status === 'COMPLETED' ||
      order.status === 'DELIVERED' ||
      order.status === 'CANCELLED'
    ) {
      throw new ForbiddenException(
        'Zlecenie jest zamrożone (lub anulowane), nie można usuwać części.',
      );
    }

    const link = await this.prisma.repairOrderPart.findUnique({
      where: {
        repairOrderId_partId: { repairOrderId: orderId, partId: partId },
      },
    });
    if (!link) return;

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
        },
      }),
      this.prisma.repairOrderPart.delete({
        where: { id: link.id },
      }),
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

      const newFinal = new Prisma.Decimal(
        labor + partsCost * (1 + margin / 100),
      );

      await this.prisma.repairOrder.update({
        where: { id: orderId },
        data: { finalCost: newFinal },
      });
    }
  }
}
