"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Car, FileText, User, Phone, Mail, Building, RefreshCw } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Customer {
  id: string;
  fullName: string;
  companyName?: string;
  nip?: string;
  address?: string;
  email: string;
  phone: string;
  vehicles?: any[];
  repairOrders?: any[];
}

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    companyName: "",
    nip: "",
    address: "",
    email: "",
    phone: ""
  });

  // Delete State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add Vehicle State
  const [isAddVehicleDialogOpen, setIsAddVehicleDialogOpen] = useState(false);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isDecodingVIN, setIsDecodingVIN] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    make: "",
    model: "",
    licensePlate: "",
    vin: "",
    productionYear: "",
    engine: "",
    fuelType: "",
    horsepower: "",
    registrationCountry: "PL"
  });

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/customers/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setCustomer(data);
        } else {
          throw new Error("Failed to fetch customer");
        }
      } catch (error) {
        toast.error("Nie udało się pobrać profilu klienta.");
        setCustomer(null);
      } finally {
        setIsLoading(false);
      }
    };
    if (params.id) {
      fetchCustomer();
    }
  }, [params.id]);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.make || !vehicleForm.model || !vehicleForm.licensePlate) {
      toast.error("Wypełnij wymagane pola (Marka, Model, Rejestracja).");
      return;
    }
    setIsAddingVehicle(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer?.id,
          make: vehicleForm.make,
          model: vehicleForm.model,
          licensePlate: vehicleForm.registrationCountry === 'PL' || vehicleForm.registrationCountry === 'OTHER' 
            ? vehicleForm.licensePlate 
            : `${vehicleForm.registrationCountry} ${vehicleForm.licensePlate}`,
          vin: vehicleForm.vin || undefined,
          productionYear: vehicleForm.productionYear ? parseInt(vehicleForm.productionYear) : undefined,
          engine: vehicleForm.engine || undefined,
          horsepower: vehicleForm.horsepower ? parseInt(vehicleForm.horsepower) : undefined,
          fuelType: vehicleForm.fuelType || undefined,
        })
      });
      if (res.ok) {
        setIsAddVehicleDialogOpen(false);
        setVehicleForm({ make: "", model: "", licensePlate: "", vin: "", productionYear: "", engine: "", fuelType: "", horsepower: "", registrationCountry: "PL" });
        toast.success("Pojazd został przypisany do klienta!");
        // Refresh customer to get the new vehicle
        const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/customers/${params.id}`);
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setCustomer(data);
        }
      } else {
        toast.error("Wystąpił błąd podczas dodawania pojazdu.");
      }
    } catch (error) {
      toast.error("Błąd połączenia z serwerem.");
    } finally {
      setIsAddingVehicle(false);
    }
  };

  const handleDecodeVIN = async () => {
    if (!vehicleForm.vin || vehicleForm.vin.length < 17) {
      toast.error("Wprowadź prawidłowy 17-znakowy numer VIN.");
      return;
    }
    setIsDecodingVIN(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/vehicles/decode-vin/${vehicleForm.vin}`);
      
      if (res.ok) {
        const data = await res.json();
        if (data && data.make) {
          setVehicleForm(prev => ({
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

  const openEditDialog = () => {
    if (customer) {
      setEditForm({
        fullName: customer.fullName,
        companyName: customer.companyName || "",
        nip: customer.nip || "",
        address: customer.address || "",
        email: customer.email,
        phone: customer.phone,
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/customers/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setIsEditDialogOpen(false);
        // Optimistic update
        setCustomer(prev => prev ? { ...prev, ...editForm } : prev);
        toast.success("Dane klienta zostały zaktualizowane.");
      } else {
        toast.error("Wystąpił błąd podczas edycji.");
      }
    } catch (error) {
      toast.error("Błąd połączenia z serwerem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/customers/${params.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Klient został trwale usunięty.");
        router.push("/customers");
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.message?.includes('Foreign key constraint') || res.status === 409) {
          toast.error("Nie można usunąć klienta, który ma przypisane pojazdy lub zlecenia.");
        } else {
          toast.error("Wystąpił błąd podczas usuwania klienta.");
        }
        setIsDeleteDialogOpen(false);
      }
    } catch (error) {
      toast.error("Błąd połączenia z serwerem.");
      setIsDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-20">
        <div className="animate-pulse text-cyan-500 font-medium text-lg">Ładowanie profilu klienta...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl text-red-400">Nie znaleziono klienta.</h2>
        <Button onClick={() => router.push('/customers')} className="mt-4">Wróć do listy</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Navigation */}
      <div>
        <Link href="/customers" className="inline-flex items-center text-sm font-medium text-zinc-400 hover:text-cyan-400 transition-colors mb-4 group">
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
          Wróć do bazy klientów
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan-900 to-blue-900 border-2 border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
              {customer.fullName}
            </h1>
            <p className="text-zinc-400 flex items-center gap-2 mt-1">
              <Building className="h-4 w-4" /> {customer.companyName || "Klient indywidualny"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={openEditDialog} className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-full px-5 h-10 shadow-lg shadow-black/20 transition-all border border-zinc-700 inline-flex items-center justify-center">
            <Edit className="mr-2 h-4 w-4" /> Edytuj Klienta
          </Button>
          <Button onClick={() => setIsDeleteDialogOpen(true)} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full px-4 h-10 transition-all border border-red-500/20 inline-flex items-center justify-center">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl text-red-400">Usuń Klienta</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Czy na pewno chcesz usunąć tego klienta? Ta operacja jest nieodwracalna. 
                Klienta nie można usunąć, jeśli ma przypisane pojazdy lub historię zleceń.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <DialogClose className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-700 bg-transparent px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                Anuluj
              </DialogClose>
              <Button type="button" disabled={isDeleting} onClick={handleDeleteCustomer} className="bg-red-600 hover:bg-red-500 text-white border-0">
                {isDeleting ? "Usuwanie..." : "Tak, usuń trwale"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl text-cyan-400">Edytuj dane klienta</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Wprowadź poprawki i zapisz zmiany.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName" className="text-zinc-300">Imię i Nazwisko</Label>
                <Input id="fullName" value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyName" className="text-zinc-300">Firma (opcjonalnie)</Label>
                <Input id="companyName" value={editForm.companyName} onChange={e => setEditForm({...editForm, companyName: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nip" className="text-zinc-300">NIP (opcjonalnie)</Label>
                <Input id="nip" value={editForm.nip} onChange={e => setEditForm({...editForm, nip: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                <Input id="email" type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone" className="text-zinc-300">Telefon</Label>
                <Input id="phone" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address" className="text-zinc-300">Adres</Label>
                <Input id="address" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-700 bg-transparent px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                Anuluj
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} onClick={handleEditSubmit} className="bg-cyan-600 hover:bg-cyan-500 text-white border-0">
                {isSubmitting ? "Zapisywanie..." : "Zapisz Zmiany"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        {/* Contact Info Card */}
        <GlassCard className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-zinc-100 border-b border-zinc-800 pb-2">Informacje Kontaktowe</h2>
          
          <div className="flex items-center gap-3 text-zinc-300 mt-2">
            <div className="p-2 rounded-full bg-zinc-900 text-zinc-400">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-zinc-500">Adres E-mail</div>
              <div className="font-medium">{customer.email || "Brak"}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-zinc-300">
            <div className="p-2 rounded-full bg-zinc-900 text-zinc-400">
              <Phone className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-zinc-500">Numer Telefonu</div>
              <div className="font-medium">{customer.phone || "Brak"}</div>
            </div>
          </div>
          
          {(customer.nip || customer.address) && (
            <div className="border-t border-zinc-800 pt-4 mt-2 flex flex-col gap-4">
              {customer.nip && (
                <div className="flex items-center gap-3 text-zinc-300">
                  <div className="p-2 rounded-full bg-zinc-900 text-zinc-400">
                    <Building className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Numer NIP</div>
                    <div className="font-medium font-mono">{customer.nip}</div>
                  </div>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-3 text-zinc-300">
                  <div className="p-2 rounded-full bg-zinc-900 text-zinc-400">
                    <Building className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Adres (Siedziba)</div>
                    <div className="font-medium text-sm">{customer.address}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* Fleet Info Card */}
        <GlassCard className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <Car className="h-5 w-5 text-cyan-500" /> Flota Pojazdów
            </h2>
            <Button onClick={() => setIsAddVehicleDialogOpen(true)} size="sm" className="bg-white/5 hover:bg-white/10 text-cyan-400 border border-cyan-500/20 rounded-full h-8">
              + Dodaj pojazd
            </Button>
          </div>
          
          <Dialog open={isAddVehicleDialogOpen} onOpenChange={setIsAddVehicleDialogOpen}>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-xl text-cyan-400">Nowy Pojazd Klienta</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Dodaj nowy pojazd dla: {customer.fullName}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="make" className="text-zinc-300">Marka <span className="text-red-500">*</span></Label>
                    <Input id="make" value={vehicleForm.make} onChange={e => setVehicleForm({...vehicleForm, make: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="model" className="text-zinc-300">Model <span className="text-red-500">*</span></Label>
                    <Input id="model" value={vehicleForm.model} onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="licensePlate" className="text-zinc-300">Numer Rejestracyjny <span className="text-red-500">*</span></Label>
                  <div className="flex gap-2">
                    <select 
                      value={vehicleForm.registrationCountry}
                      onChange={e => setVehicleForm({...vehicleForm, registrationCountry: e.target.value})}
                      className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-md px-2 focus-visible:ring-cyan-500 w-[80px]"
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
                    <Input id="licensePlate" value={vehicleForm.licensePlate} onChange={e => setVehicleForm({...vehicleForm, licensePlate: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500 uppercase flex-1" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vin" className="text-zinc-300">Numer VIN (opcjonalnie)</Label>
                  <div className="flex gap-2">
                    <Input id="vin" value={vehicleForm.vin} onChange={e => setVehicleForm({...vehicleForm, vin: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500 uppercase" maxLength={17} />
                    <Button type="button" onClick={handleDecodeVIN} disabled={isDecodingVIN} className="bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-cyan-500/30 whitespace-nowrap">
                      {isDecodingVIN ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Dekoduj VIN"}
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-700 bg-transparent px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                  Anuluj
                </DialogClose>
                <Button type="submit" disabled={isAddingVehicle} onClick={handleAddVehicle} className="bg-cyan-600 hover:bg-cyan-500 text-white border-0">
                  {isAddingVehicle ? "Zapisywanie..." : "Zapisz Pojazd"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {customer.vehicles && customer.vehicles.length > 0 ? (
              customer.vehicles.map((vehicle, i) => (
                <Link href={`/vehicles/${vehicle.id}`} key={i} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col gap-1 hover:border-cyan-500/30 transition-colors cursor-pointer group">
                  <div className="font-bold text-lg group-hover:text-cyan-400 transition-colors">{vehicle.make} {vehicle.model}</div>
                  <div className="text-sm font-mono bg-zinc-950 px-2 py-1 rounded w-fit border border-zinc-800 text-zinc-400 mt-1">
                    {vehicle.licensePlate}
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-zinc-500 col-span-2 text-center py-6">Ten klient nie ma jeszcze przypisanych pojazdów.</div>
            )}
          </div>
        </GlassCard>

        {/* Repair Orders History */}
        <GlassCard className="flex flex-col gap-4 lg:col-span-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-500" /> Historia Zleceń Napraw
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-400 bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">ID Zlecenia</th>
                  <th className="px-4 py-3">Data utworzenia</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right rounded-r-lg">Koszt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {customer.repairOrders && customer.repairOrders.length > 0 ? (
                  customer.repairOrders.map((order, i) => (
                    <tr key={i} className="hover:bg-zinc-800/30 cursor-pointer">
                      <td className="px-4 py-4 font-mono text-xs text-zinc-300">#{order.id.substring(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-4 text-zinc-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                          order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                          'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-medium">
                        {order.finalCost || order.estimatedCost ? `${order.finalCost || order.estimatedCost} PLN` : '---'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">Brak zleceń powiązanych z tym klientem.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
