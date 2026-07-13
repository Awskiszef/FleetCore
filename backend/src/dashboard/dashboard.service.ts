import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Aktywne zlecenia
    const activeOrders = await this.prisma.repairOrder.count({
      where: {
        status: { not: 'COMPLETED' },
      },
    });

    // Pojazdy w warsztacie (unikalne vehicleId dla aktywnych zleceń)
    const activeOrdersList = await this.prisma.repairOrder.findMany({
      where: {
        status: { not: 'COMPLETED' },
      },
      select: { vehicleId: true },
    });
    const uniqueVehicles = new Set(activeOrdersList.map((o) => o.vehicleId));
    const vehiclesInShop = uniqueVehicles.size;

    // Nowi klienci w tym miesiącu
    const newCustomers = await this.prisma.customer.count({
      where: {
        createdAt: { gte: startOfMonth },
      },
    });

    // Przychód w tym miesiącu (sum of finalCost)
    const completedOrdersThisMonth = await this.prisma.repairOrder.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: startOfMonth },
        finalCost: { not: null },
      },
      select: { finalCost: true },
    });
    const monthlyRevenue = completedOrdersThisMonth.reduce(
      (sum, order) => sum + Number(order.finalCost || 0),
      0,
    );

    // Ostatnia aktywność (5 ostatnich zleceń)
    const recentActivity = await this.prisma.repairOrder.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: true,
        vehicle: true,
      },
    });

    return {
      activeOrders,
      vehiclesInShop,
      newCustomers,
      monthlyRevenue,
      recentActivity: recentActivity.map((order) => ({
        id: order.id,
        title: order.vehicle
          ? `${order.vehicle.make} ${order.vehicle.model}`
          : 'Zlecenie naprawy',
        customer: order.customer?.fullName || 'Nieznany klient',
        status: order.status,
        time: order.updatedAt,
      })),
    };
  }
}
