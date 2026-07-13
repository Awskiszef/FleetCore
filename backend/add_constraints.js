const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Part" DROP CONSTRAINT IF EXISTS part_quantity_check;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Part" DROP CONSTRAINT IF EXISTS part_reserved_quantity_check;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Part" DROP CONSTRAINT IF EXISTS part_reserved_le_quantity_check;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "RepairOrderPart" DROP CONSTRAINT IF EXISTS repair_order_part_quantity_check;`);

    await prisma.$executeRawUnsafe(`ALTER TABLE "Part" ADD CONSTRAINT part_quantity_check CHECK (quantity >= 0)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Part" ADD CONSTRAINT part_reserved_quantity_check CHECK ("reservedQuantity" >= 0)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Part" ADD CONSTRAINT part_reserved_le_quantity_check CHECK ("reservedQuantity" <= quantity)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "RepairOrderPart" ADD CONSTRAINT repair_order_part_quantity_check CHECK (quantity > 0)`);
    console.log('Constraints added!');
  } catch (e) {
    console.error(e.message);
  }
}

main().finally(() => prisma.$disconnect());
