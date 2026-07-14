import { PaginatedResponse, PaginationParams } from '../types/api';
import { Customer, Vehicle, RepairOrder, Part, User, Supplier } from '../types/models';

const buildUrl = (path: string, params?: PaginationParams) => {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_URL || ''}${path}`, window.location.origin);
  if (params) {
    if (params.page) url.searchParams.append('page', params.page.toString());
    if (params.limit) url.searchParams.append('limit', params.limit.toString());
    if (params.search) url.searchParams.append('search', params.search);
    if (params.sortBy) url.searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) url.searchParams.append('sortOrder', params.sortOrder);
  }
  return url.toString();
};

export const apiClient = {
  async getCustomers(params?: PaginationParams): Promise<PaginatedResponse<Customer>> {
    const res = await fetch(buildUrl('/customers', params));
    if (!res.ok) throw new Error('Failed to fetch customers');
    return res.json();
  },
  
  async getVehicles(params?: PaginationParams): Promise<PaginatedResponse<Vehicle>> {
    const res = await fetch(buildUrl('/vehicles', params));
    if (!res.ok) throw new Error('Failed to fetch vehicles');
    return res.json();
  },

  async getRepairOrders(params?: PaginationParams): Promise<PaginatedResponse<RepairOrder>> {
    const res = await fetch(buildUrl('/repair-orders', params));
    if (!res.ok) throw new Error('Failed to fetch repair orders');
    return res.json();
  },

  async getParts(params?: PaginationParams): Promise<PaginatedResponse<Part>> {
    const res = await fetch(buildUrl('/parts', params));
    if (!res.ok) throw new Error('Failed to fetch parts');
    return res.json();
  },

  async getUsers(params?: PaginationParams): Promise<PaginatedResponse<User>> {
    const res = await fetch(buildUrl('/users', params));
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async getSuppliers(params?: PaginationParams): Promise<PaginatedResponse<Supplier>> {
    const res = await fetch(buildUrl('/suppliers', params));
    if (!res.ok) throw new Error('Failed to fetch suppliers');
    return res.json();
  }
};
