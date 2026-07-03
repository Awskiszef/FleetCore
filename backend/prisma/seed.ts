import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Customers
  const customer1 = await prisma.customer.create({
    data: {
      fullName: 'Jan Kowalski',
      companyName: 'Kowalski Transport Sp. z o.o.',
      email: 'jan.kowalski@example.com',
      phone: '+48 123 456 789',
      address: 'ul. Polna 1, 00-001 Warszawa',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      fullName: 'Anna Nowak',
      email: 'anna.nowak@example.com',
      phone: '+48 987 654 321',
    },
  });

  // Create Vehicles
  const vehicle1 = await prisma.vehicle.create({
    data: {
      customerId: customer1.id,
      make: 'Toyota',
      model: 'Corolla',
      licensePlate: 'WA 12345',
      vin: 'JTDKB20E90000001',
      productionYear: 2020,
      engine: '1.8 Hybrid',
      horsepower: 122,
      fuelType: 'Hybrid',
      mileage: 45000,
    },
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      customerId: customer2.id,
      make: 'Skoda',
      model: 'Octavia',
      licensePlate: 'KR 54321',
      vin: 'TMBB01234567890',
      productionYear: 2018,
      engine: '2.0 TDI',
      horsepower: 150,
      fuelType: 'Diesel',
      mileage: 120000,
    },
  });

  // Create Repair Orders
  await prisma.repairOrder.create({
    data: {
      customerId: customer1.id,
      vehicleId: vehicle1.id,
      status: 'COMPLETED',
      reportedIssue: 'Klient zgłosił stuki w zawieszeniu z przodu po prawej stronie.',
      diagnosis: 'Luz na sworzniu wahacza prawego. Klocki hamulcowe przód poniżej 3mm - do wymiany.',
      mechanicNotes: 'Wymieniono wahacz, zrobiono zbieżność. Wymiana klocków. Jazda próbna OK. Żadnych stuków nie słychać.',
      estimatedCost: 1500,
      finalCost: 1550,
      createdAt: new Date(Date.now() - 172800000), // 2 days ago
      completedAt: new Date(Date.now() - 86400000), // 1 day ago
    },
  });

  await prisma.repairOrder.create({
    data: {
      customerId: customer2.id,
      vehicleId: vehicle2.id,
      status: 'DIAGNOSING',
      reportedIssue: 'Check engine się świeci, auto szarpie przy przyspieszaniu.',
      estimatedCost: 300,
      createdAt: new Date(Date.now() - 3600000), // 1 hour ago
    },
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
