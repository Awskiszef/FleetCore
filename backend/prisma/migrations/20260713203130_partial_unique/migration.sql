-- Drop existing unique indexes
DROP INDEX IF EXISTS "User_email_key";
DROP INDEX IF EXISTS "Customer_nip_key";
DROP INDEX IF EXISTS "Part_barcode_key";
DROP INDEX IF EXISTS "Supplier_nip_key";

-- Create partial unique indexes for active records
CREATE UNIQUE INDEX "User_email_key" ON "User"("email") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "Customer_nip_key" ON "Customer"("nip") WHERE "nip" IS NOT NULL AND "deletedAt" IS NULL;
CREATE UNIQUE INDEX "Part_barcode_key" ON "Part"("barcode") WHERE "barcode" IS NOT NULL AND "deletedAt" IS NULL;
CREATE UNIQUE INDEX "Supplier_nip_key" ON "Supplier"("nip") WHERE "nip" IS NOT NULL AND "deletedAt" IS NULL;
