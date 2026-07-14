export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  mustChangePassword?: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  fullName: string;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  nip?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  customerId: string;
  customer?: Customer;
  vin?: string | null;
  licensePlate?: string | null;
  make?: string | null;
  model?: string | null;
  generation?: string | null;
  productionYear?: number | null;
  engine?: string | null;
  engineCode?: string | null;
  horsepower?: number | null;
  fuelType?: string | null;
  transmission?: string | null;
  driveType?: string | null;
  bodyType?: string | null;
  color?: string | null;
  mileage?: number | null;
  registrationDate?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface RepairOrder {
  id: string;
  customerId: string;
  customer?: Customer;
  vehicleId: string;
  vehicle?: Vehicle;
  assignedMechanicId?: string | null;
  assignedMechanic?: User | null;
  status: string;
  reportedIssue: string;
  diagnosis?: string | null;
  mechanicNotes?: string | null;
  estimatedCost?: string | number | null;
  finalCost?: string | number | null;
  laborCost?: string | number | null;
  marginPercentage?: string | number | null;
  invoiceId?: string | null;
  invoiceUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  inventoryFinalizedAt?: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  nip?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface Part {
  id: string;
  name: string;
  oemNumber?: string | null;
  aftermarketNumber?: string | null;
  manufacturer?: string | null;
  supplierId?: string | null;
  supplier?: Supplier | null;
  unitPrice: string | number;
  quantity: number;
  reservedQuantity: number;
  barcode?: string | null;
  shelfLocation?: string | null;
  minQuantity: number;
  createdAt: string;
}
