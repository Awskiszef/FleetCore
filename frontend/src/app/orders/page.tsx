"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, FileText, Calendar, Wrench } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";


interface RepairOrder {
  id: string;
  status: string;
  reportedIssue: string;
  estimatedCost?: number;
  finalCost?: number;
  createdAt: string;
  customer?: { id: string; fullName: string };
  vehicle?: { id: string; make: string; model: string; licensePlate: string };
}

interface CustomerOption {
  id: string;
  fullName: string;
}

interface VehicleOption {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
}

export default function RepairOrdersPage() {
  const { user } = useAuth();
  const canCreateOrder = user?.role === 'ADMIN' || user?.role === 'OWNER' || user?.role === 'RECEPTIONIST';

  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Add Order Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customersList, setCustomersList] = useState<CustomerOption[]>([]);
  const [vehiclesList, setVehiclesList] = useState<VehicleOption[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<VehicleOption[]>([]);
  
  const [formData, setFormData] = useState({
    customerId: "",
    vehicleId: "",
    reportedIssue: "",
    estimatedCost: ""
  });

  const fetchOrders = async () => {
    try {
      const response = await fetch(`http://${window.location.hostname}:3001/repair-orders`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        throw new Error("Failed to fetch");
      }
    } catch (error) {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [cRes, vRes] = await Promise.all([
        fetch(`http://${window.location.hostname}:3001/customers`),
        fetch(`http://${window.location.hostname}:3001/vehicles`)
      ]);
      if (cRes.ok && vRes.ok) {
        const customers = await cRes.json();
        const vehicles = await vRes.json();
        setCustomersList(customers);
        setVehiclesList(vehicles);
      }
    } catch (error) {
      console.error("Failed to fetch dropdown data");
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Update available vehicles when customer changes
  useEffect(() => {
    if (formData.customerId) {
      setFilteredVehicles(vehiclesList.filter((v: any) => v.customerId === formData.customerId));
      // Auto-select first vehicle if any
      const matching = vehiclesList.filter((v: any) => v.customerId === formData.customerId);
      if (matching.length === 1 && formData.vehicleId === "") {
        setFormData(prev => ({...prev, vehicleId: matching[0].id}));
      }
    } else {
      setFilteredVehicles(vehiclesList);
    }
  }, [formData.customerId, vehiclesList, formData.vehicleId]);

  const openAddDialog = () => {
    fetchDropdownData();
    setIsDialogOpen(true);
  };

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.vehicleId || !formData.reportedIssue) {
      toast.error("Proszę wypełnić wymagane pola (Klient, Pojazd, Zgłoszony problem).");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`http://${window.location.hostname}:3001/repair-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: formData.customerId,
          vehicleId: formData.vehicleId,
          reportedIssue: formData.reportedIssue,
          estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : undefined,
        }),
      });
      if (response.ok) {
        setIsDialogOpen(false);
        setFormData({ customerId: "", vehicleId: "", reportedIssue: "", estimatedCost: "" });
        await fetchOrders();
        toast.success("Zlecenie naprawy zostało pomyślnie utworzone.");
      } else {
        toast.error("Wystąpił błąd podczas dodawania zlecenia.");
      }
    } catch (error) {
      toast.error("Błąd połączenia z serwerem. Czy backend działa?");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.reportedIssue.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.vehicle && o.vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-600">
            Zlecenia Napraw
          </h1>
          <p className="text-zinc-400 mt-2 text-lg">Zarządzaj przepływem pracy w warsztacie.</p>
        </div>
        
        {canCreateOrder && (
          <Button onClick={openAddDialog} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:scale-105 rounded-full px-6 h-10 inline-flex items-center justify-center border-0">
            <Plus className="mr-2 h-4 w-4" /> Nowe Zlecenie
          </Button>
        )}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl text-emerald-400">Utwórz zlecenie naprawy</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Wybierz klienta oraz pojazd i opisz zgłaszany problem.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="customerId" className="text-zinc-300">Właściciel <span className="text-red-500">*</span></Label>
                <select 
                  id="customerId" 
                  value={formData.customerId}
                  onChange={e => setFormData({...formData, customerId: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 text-zinc-100"
                >
                  <option value="">-- Wybierz klienta --</option>
                  {customersList.map(c => (
                    <option key={c.id} value={c.id}>{c.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vehicleId" className="text-zinc-300">Pojazd <span className="text-red-500">*</span></Label>
                <select 
                  id="vehicleId" 
                  value={formData.vehicleId}
                  onChange={e => setFormData({...formData, vehicleId: e.target.value})}
                  disabled={!formData.customerId && filteredVehicles.length === 0}
                  className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-100"
                >
                  <option value="">-- Wybierz pojazd --</option>
                  {filteredVehicles.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.make} {v.model} ({v.licensePlate})</option>
                  ))}
                </select>
                {!formData.customerId && <span className="text-xs text-zinc-500">Najpierw wybierz klienta, by zawęzić listę.</span>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reportedIssue" className="text-zinc-300">Zgłaszany problem / Usterka <span className="text-red-500">*</span></Label>
                <textarea 
                  id="reportedIssue" 
                  value={formData.reportedIssue} 
                  onChange={e => setFormData({...formData, reportedIssue: e.target.value})} 
                  className="flex w-full rounded-md px-3 py-2 text-sm shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-zinc-900 border border-zinc-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 min-h-[100px] text-zinc-100 placeholder:text-zinc-500" 
                  placeholder="Opisz problem zgłaszany przez klienta..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="estimatedCost" className="text-zinc-300">Szacowany koszt (PLN, opcjonalnie)</Label>
                <Input 
                  id="estimatedCost" 
                  type="number"
                  value={formData.estimatedCost} 
                  onChange={e => setFormData({...formData, estimatedCost: e.target.value})} 
                  className="bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500" 
                  placeholder="np. 500"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-700 bg-transparent px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                Anuluj
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} onClick={handleAddOrder} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0">
                {isSubmitting ? "Zapisywanie..." : "Utwórz Zlecenie"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content Area */}
      <GlassCard className="flex flex-col gap-6 border-white/5">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
          <input 
            type="text"
            placeholder="Szukaj zlecenia, problemu lub rejestracji..." 
            className="pl-10 w-full bg-zinc-900/50 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded-xl px-3 py-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-800/50">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase tracking-wider text-xs font-semibold">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl">ID</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Pojazd</th>
                <th className="px-6 py-4">Zgłoszony problem</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4 text-right rounded-tr-xl">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 bg-transparent">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 animate-pulse">
                    Ładowanie danych...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    Nie znaleziono zleceń.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    className="group hover:bg-zinc-800/30 transition-colors duration-200 cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-zinc-400">
                      #{order.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm ${
                        order.status === 'NEW' ? 'bg-zinc-800 text-zinc-300 border-zinc-700' :
                        order.status === 'DIAGNOSING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        order.status === 'REPAIRING' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        order.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}>
                        {
                          {
                            "NEW": "NOWE", "WAITING": "OCZEKUJE", "DIAGNOSING": "DIAGNOZA",
                            "REPAIRING": "W NAPRAWIE", "TESTING": "TESTY", "READY": "GOTOWE",
                            "COMPLETED": "ZAKOŃCZONE", "CANCELLED": "ANULOWANE"
                          }[order.status as string] || order.status
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {order.vehicle ? (
                        <div>
                          <div className="font-bold text-zinc-100">{order.vehicle.make} {order.vehicle.model}</div>
                          <div className="text-xs text-zinc-500 mt-0.5">{order.vehicle.licensePlate}</div>
                        </div>
                      ) : <span className="text-zinc-600">Brak</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-[200px] truncate text-zinc-300 font-medium" title={order.reportedIssue}>
                        {order.reportedIssue}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/orders/${order.id}`}
                        className="inline-flex h-9 items-center justify-center whitespace-nowrap text-sm font-medium text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-full px-4 transition-colors"
                      >
                        Szczegóły
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
