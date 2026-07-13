import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RepairOrdersService {
  private readonly logger = new Logger(RepairOrdersService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService
  ) {}

  async create(data: Prisma.RepairOrderUncheckedCreateInput) {
    return this.prisma.repairOrder.create({ data });
  }

  async findAll() {
    return (this.prisma.repairOrder as any).findMany({
      include: {
        vehicle: true,
        customer: true,
        parts: { include: { part: true } }
      },
    });
  }

  async findOne(id: string) {
    return (this.prisma.repairOrder as any).findUnique({
      where: { id },
      include: {
        vehicle: true,
        customer: true,
        parts: { include: { part: true } }
      },
    });
  }

  async update(id: string, data: Prisma.RepairOrderUncheckedUpdateInput) {
    const existingOrder = await this.prisma.repairOrder.findUnique({
      where: { id },
      include: { customer: true, vehicle: true }
    });

    const updatedOrder = await this.prisma.repairOrder.update({
      where: { id },
      data,
      include: {
        customer: true,
        vehicle: true,
        assignedMechanic: true,
        parts: { include: { part: true } }
      }
    });

    if (existingOrder && data.status && data.status !== existingOrder.status) {
      const status = data.status as string;
      const customer = existingOrder.customer;
      const vehicle = existingOrder.vehicle;

      if (customer) {
        let message = `Witaj ${customer.fullName || customer.companyName}! Twoje zlecenie naprawy (Pojazd: ${vehicle?.licensePlate || ''}) zmieniło status na: ${status}.`;
        
        if (status === 'COMPLETED') {
          message = `Dzień dobry! Informujemy, że naprawa pojazdu ${vehicle?.licensePlate || ''} została zakończona. Pojazd jest gotowy do odbioru. Całkowity koszt: ${updatedOrder.finalCost || 'do ustalenia'} PLN. Pozdrawiamy, zespół AtlasHC Garage.`;
        }

        const subject = `Aktualizacja statusu naprawy: ${status}`;

        if (customer.email) {
          this.notificationsService.sendEmail(customer.email, subject, `<p>${message}</p>`).catch(e => this.logger.error(e));
        }
        if (customer.phone) {
          this.notificationsService.sendSms(customer.phone, message).catch(e => this.logger.error(e));
        }
      }
    }

    return updatedOrder;
  }

  async remove(id: string) {
    return this.prisma.repairOrder.delete({
      where: { id },
    });
  }

  async addPart(orderId: string, partId: string, quantity: number) {
    const part = await this.prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw new NotFoundException('Część nie znaleziona');
    if (part.quantity < quantity) throw new BadRequestException('Brak wystarczającej ilości w magazynie');

    // Remove old entry if exists (will re-add with new quantity or let frontend delete first)
    const existing = await (this.prisma as any).repairOrderPart.findUnique({
      where: { repairOrderId_partId: { repairOrderId: orderId, partId: partId } }
    });
    if (existing) {
      throw new BadRequestException('Ta część jest już przypisana do tego zlecenia. Usuń ją i dodaj ponownie z inną ilością.');
    }

    await this.prisma.part.update({
      where: { id: partId },
      data: { quantity: { decrement: quantity } }
    });

    const newPart = await (this.prisma as any).repairOrderPart.create({
      data: {
        repairOrderId: orderId,
        partId: partId,
        quantity: quantity,
        priceAtUsage: part.unitPrice
      }
    });

    await this.recalculateCost(orderId);

    return newPart;
  }

  async removePart(orderId: string, partId: string) {
    const link = await (this.prisma as any).repairOrderPart.findUnique({
      where: { repairOrderId_partId: { repairOrderId: orderId, partId: partId } }
    });
    if (!link) return;

    await this.prisma.part.update({
      where: { id: partId },
      data: { quantity: { increment: link.quantity } }
    });

    await (this.prisma as any).repairOrderPart.delete({
      where: { id: link.id }
    });

    await this.recalculateCost(orderId);
    return true;
  }

  private async recalculateCost(orderId: string) {
    const order = await (this.prisma.repairOrder as any).findUnique({
      where: { id: orderId },
      include: { parts: true }
    });
    if (!order) return;

    if (order.laborCost != null || order.marginPercentage != null) {
      const partsCost = order.parts.reduce((sum: any, p: any) => sum + (p.priceAtUsage * p.quantity), 0);
      const labor = order.laborCost || 0;
      const margin = order.marginPercentage || 0;
      
      const newFinal = labor + (partsCost * (1 + margin / 100));
      
      await this.prisma.repairOrder.update({
        where: { id: orderId },
        data: { finalCost: newFinal }
      });
    }
  }
}
