"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Car, Calendar, User, Activity, RefreshCw } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { apiClient } from "@/lib/api-client";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
  vin: string;
  customer?: { id: string; fullName: string };
}

interface CustomerOption {
  id: string;
  fullName: string;
}

export default function VehiclesPage() {
  const { user } = useAuth();
  const canAddVehicle = user?.role === 'ADMIN' || user?.role === 'OWNER' || user?.role === 'RECEPTIONIST';

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  
  // Add Vehicle Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDecodingVIN, setIsDecodingVIN] = useState(false);
  const [customersList, setCustomersList] = useState<CustomerOption[]>([]);
  const [formData, setFormData] = useState({
    make: "",
    model: "",
    licensePlate: "",
    vin: "",
    customerId: "",
    registrationCountry: "PL",
    productionYear: "",
    engine: "",
    horsepower: "",
    fuelType: ""
  });

  const fetchVehicles = async () => {
    try {
      const page = Number(searchParams.get("page")) || 1;
      const search = searchParams.get("search") || "";
      const result = await apiClient.getVehicles({ page, limit: 20, search });
      setVehicles(result.data);
      setPagination({ page: result.page, limit: result.limit, totalPages: result.totalPages });
    } catch (error) {
      toast.error("Nie udało się pobrać listy pojazdów z serwera.");
      setVehicles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomersForDropdown = async () => {
    try {
      const result = await apiClient.getCustomers({ limit: 100 });
      setCustomersList(result.data.map((c: any) => ({ id: c.id, fullName: c.fullName })));
    } catch (error) {
      console.error("Failed to fetch customers list");
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [searchParams]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    const params = new URLSearchParams(searchParams);
    if (val) {
      params.set("search", val);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.replace(`${pathname}?${params.toString()}`);
  };

  const openAddDialog = () => {
    fetchCustomersForDropdown();
    setIsDialogOpen(true);
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          make: formData.make,
          model: formData.model,
          licensePlate: formData.registrationCountry === 'PL' || formData.registrationCountry === 'OTHER' 
            ? formData.licensePlate 
            : `${formData.registrationCountry} ${formData.licensePlate}`,
          vin: formData.vin,
          customerId: formData.customerId || undefined,
          productionYear: formData.productionYear ? parseInt(formData.productionYear) : undefined,
          engine: formData.engine || undefined,
          horsepower: formData.horsepower ? parseInt(formData.horsepower) : undefined,
          fuelType: formData.fuelType || undefined,
        }),
      });
      if (response.ok) {
        setIsDialogOpen(false);
        setFormData({ make: "", model: "", licensePlate: "", vin: "", customerId: "", registrationCountry: "PL", productionYear: "", engine: "", horsepower: "", fuelType: "" });
        await fetchVehicles();
        toast.success("Pojazd został pomyślnie dodany.");
      } else {
        toast.error("Wystąpił błąd podczas dodawania pojazdu.");
      }
    } catch (error) {
      toast.error("Błąd połączenia z serwerem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecodeVIN = async () => {
    if (!formData.vin || formData.vin.length < 17) {
      toast.error("Wprowadź prawidłowy 17-znakowy numer VIN.");
      return;
    }
    setIsDecodingVIN(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/vehicles/decode-vin/${formData.vin}`);
      
      if (res.ok) {
        const data = await res.json();
        if (data && data.make) {
          setFormData(prev => ({
            ...prev,
            make: data.make,
            model: data.model || prev.model,
            productionYear: data.productionYear ? data.productionYear.toString() : prev.productionYear,
            engine: data.engine || prev.engine,
            fuelType: data.fuelType || prev.fuelType,
            horsepower: data.horsepower ? data.horsepower.toString() : prev.horsepower,
          }));
          toast.success("Dane pobrane z płatnej bazy (Vincario)!");
        } else {
          toast.error("Brak danych dla tego VIN w bazie.");
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.message === 'BRAK_KLUCZA_API') {
          toast.error("Błąd: Skonfiguruj klucz API Vincario w pliku .env backendu!");
        } else {
          toast.error("Nie znaleziono danych dla tego VIN.");
        }
      }
    } catch (e) {
      toast.error("Błąd połączenia z backendem podczas dekodowania.");
    } finally {
      setIsDecodingVIN(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-600">
            Pojazdy
          </h1>
          <p className="text-zinc-400 mt-2 text-lg">Zarządzaj pojazdami klientów w Twoim warsztacie.</p>
        </div>
        
        {canAddVehicle && (
          <Button onClick={openAddDialog} className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-medium shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-105 rounded-full px-6 h-10 inline-flex items-center justify-center border-0">
            <Plus className="mr-2 h-4 w-4" /> Nowy Pojazd
          </Button>
        )}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl text-purple-400">Zarejestruj pojazd</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Wprowadź dane pojazdu i przypisz go do klienta.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="make" className="text-zinc-300">Marka</Label>
                  <Input id="make" value={formData.make} onChange={e => setFormData({...formData, make: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-purple-500" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="model" className="text-zinc-300">Model</Label>
                  <Input id="model" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-purple-500" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="licensePlate" className="text-zinc-300">Numer Rejestracyjny</Label>
                <div className="flex gap-2">
                  <select 
                    value={formData.registrationCountry}
                    onChange={e => setFormData({...formData, registrationCountry: e.target.value})}
                    className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-md px-2 focus-visible:ring-purple-500 w-[80px]"
                  >
                    <option value="PL">PL</option>
                    <option value="DE">DE</option>
                    <option value="CZ">CZ</option>
                    <option value="SK">SK</option>
                    <option value="UA">UA</option>
                    <option value="GB">GB</option>
                    <option value="FR">FR</option>
                    <option value="IT">IT</option>
                    <option value="ES">ES</option>
                    <option value="OTHER">Inny</option>
                  </select>
                  <Input id="licensePlate" value={formData.licensePlate} onChange={e => setFormData({...formData, licensePlate: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-purple-500 uppercase flex-1" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vin" className="text-zinc-300">Numer VIN (opcjonalnie)</Label>
                <div className="flex gap-2">
                  <Input id="vin" value={formData.vin} onChange={e => setFormData({...formData, vin: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-purple-500 uppercase" maxLength={17} />
                  <Button type="button" onClick={handleDecodeVIN} disabled={isDecodingVIN} className="bg-zinc-800 hover:bg-zinc-700 text-purple-400 border border-purple-500/30 whitespace-nowrap">
                    {isDecodingVIN ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Dekoduj VIN"}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customerId" className="text-zinc-300">Właściciel</Label>
                <select 
                  id="customerId" 
                  value={formData.customerId}
                  onChange={e => setFormData({...formData, customerId: e.target.value})}
                  className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50 text-zinc-100"
                >
                  <option value="">-- Wybierz klienta --</option>
                  {customersList.map(c => (
                    <option key={c.id} value={c.id}>{c.fullName}</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-700 bg-transparent px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                Anuluj
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} onClick={handleAddVehicle} className="bg-purple-600 hover:bg-purple-500 text-white border-0">
                {isSubmitting ? "Zapisywanie..." : "Zapisz Pojazd"}
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
            placeholder="Szukaj po marce, modelu lub rejestracji..." 
            className="pl-10 w-full bg-zinc-900/50 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500 rounded-xl px-3 py-2"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* Vehicles Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-800/50">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase tracking-wider text-xs font-semibold">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl">Pojazd</th>
                <th className="px-6 py-4">Numer Rejestracyjny</th>
                <th className="px-6 py-4">Właściciel</th>
                <th className="px-6 py-4 text-right rounded-tr-xl">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 bg-transparent">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 animate-pulse">
                    Ładowanie danych...
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                    Nie znaleziono pojazdów.
                  </td>
                </tr>
              ) : (
                vehicles.map((vehicle) => (
                  <tr 
                    key={vehicle.id} 
                    className="group hover:bg-zinc-800/30 transition-colors duration-200 cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                          <Car className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-100 text-base">{vehicle.make} {vehicle.model}</p>
                          <p className="text-xs text-zinc-500 mt-0.5 font-mono">VIN: {vehicle.vin}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-mono bg-zinc-900 px-3 py-1.5 rounded-md w-fit border border-zinc-700 text-zinc-200 font-bold tracking-widest shadow-inner">
                        {vehicle.licensePlate}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <User className="h-4 w-4 text-zinc-500" />
                        <span>{vehicle.customer ? vehicle.customer.fullName : "Brak właściciela"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/vehicles/${vehicle.id}`}
                        className="inline-flex h-9 items-center justify-center whitespace-nowrap text-sm font-medium text-zinc-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-full px-4 transition-colors"
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
        <PaginationControls 
          page={pagination.page} 
          totalPages={pagination.totalPages} 
          onPageChange={handlePageChange} 
        />
      </GlassCard>
    </div>
  );
}
