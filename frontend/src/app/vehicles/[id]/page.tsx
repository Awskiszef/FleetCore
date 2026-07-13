"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Car, FileText, User, Calendar, Activity, PenTool, Wrench, Hash, Image as ImageIcon, Upload, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  generation?: string;
  productionYear?: number;
  engine?: string;
  horsepower?: number;
  fuelType?: string;
  mileage?: number;
  licensePlate: string;
  vin: string;
  customer?: { id: string; fullName: string };
  repairOrders?: any[];
}

export default function VehicleProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Edit State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    make: "",
    model: "",
    productionYear: "",
    engine: "",
    fuelType: "",
    mileage: "",
    licensePlate: "",
    vin: ""
  });

  // Add Order State
  const [isAddOrderDialogOpen, setIsAddOrderDialogOpen] = useState(false);
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  const [orderForm, setOrderForm] = useState({
    reportedIssue: "",
    estimatedCost: ""
  });

  // Delete State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:3001/vehicles/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setVehicle(data);
        } else {
          throw new Error("Failed to fetch vehicle");
        }
      } catch (error) {
        toast.error("Nie udało się pobrać danych pojazdu.");
        setVehicle(null);
      } finally {
        setIsLoading(false);
      }
    };
    const fetchAttachments = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:3001/attachments/entity/VEHICLE/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setAttachments(data);
        }
      } catch (error) {
        console.error("Failed to fetch attachments", error);
      }
    };
    if (params.id) {
      fetchVehicle();
      fetchAttachments();
    }
  }, [params.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', 'VEHICLE');
    formData.append('entityId', params.id as string);

    setIsUploading(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/attachments`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const newAttachment = await res.json();
        setAttachments(prev => [newAttachment, ...prev]);
        toast.success('Zdjęcie wgrane pomyślnie!');
      } else {
        toast.error('Błąd podczas wgrywania zdjęcia.');
      }
    } catch (error) {
      toast.error('Błąd połączenia podczas wgrywania.');
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle?.customer?.id) {
      toast.error("Ten pojazd nie ma przypisanego właściciela. Przypisz klienta przed dodaniem zlecenia.");
      return;
    }
    if (!orderForm.reportedIssue) {
      toast.error("Opisz zgłaszany problem.");
      return;
    }
    setIsAddingOrder(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/repair-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: vehicle.customer.id,
          vehicleId: vehicle.id,
          reportedIssue: orderForm.reportedIssue,
          estimatedCost: orderForm.estimatedCost ? parseFloat(orderForm.estimatedCost) : undefined,
        })
      });
      if (res.ok) {
        setIsAddOrderDialogOpen(false);
        setOrderForm({ reportedIssue: "", estimatedCost: "" });
        toast.success("Nowe zlecenie naprawy zostało utworzone!");
        // Refresh vehicle to get the new order
        const refreshRes = await fetch(`http://${window.location.hostname}:3001/vehicles/${params.id}`);
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setVehicle(data);
        }
      } else {
        toast.error("Wystąpił błąd podczas tworzenia zlecenia.");
      }
    } catch (error) {
      toast.error("Błąd połączenia z serwerem.");
    } finally {
      setIsAddingOrder(false);
    }
  };

  const openEditDialog = () => {
    if (vehicle) {
      setEditForm({
        make: vehicle.make,
        model: vehicle.model,
        productionYear: vehicle.productionYear?.toString() || "",
        engine: vehicle.engine || "",
        fuelType: vehicle.fuelType || "",
        mileage: vehicle.mileage?.toString() || "",
        licensePlate: vehicle.licensePlate,
        vin: vehicle.vin
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/vehicles/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          productionYear: editForm.productionYear ? parseInt(editForm.productionYear) : undefined,
          mileage: editForm.mileage ? parseInt(editForm.mileage) : undefined,
        }),
      });
      if (res.ok) {
        setIsEditDialogOpen(false);
        const updated = await res.json();
        setVehicle(prev => prev ? { ...prev, ...updated } : prev);
        toast.success("Dane pojazdu zostały zaktualizowane.");
      } else {
        toast.error("Wystąpił błąd podczas edycji.");
      }
    } catch (error) {
      toast.error("Błąd połączenia z serwerem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVehicle = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/vehicles/${params.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Pojazd został trwale usunięty.");
        router.push("/vehicles");
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.message?.includes('Foreign key constraint') || res.status === 409) {
          toast.error("Nie można usunąć pojazdu, który posiada zlecenia naprawy.");
        } else {
          toast.error("Wystąpił błąd podczas usuwania pojazdu.");
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
        <div className="animate-pulse text-purple-500 font-medium text-lg">Ładowanie profilu pojazdu...</div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl text-red-400">Nie znaleziono pojazdu.</h2>
        <button onClick={() => router.push('/vehicles')} className="mt-4 bg-zinc-800 px-4 py-2 rounded-lg">Wróć do listy</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Navigation */}
      <div>
        <Link href="/vehicles" className="inline-flex items-center text-sm font-medium text-zinc-400 hover:text-purple-400 transition-colors mb-4 group">
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
          Wróć do listy pojazdów
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-900 to-indigo-900 border-2 border-purple-500/50 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/20">
            <Car className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-600">
              {vehicle.make} {vehicle.model}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm">
              <span className="font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700 text-zinc-200 shadow-inner font-bold tracking-wider">{vehicle.licensePlate}</span>
              <span className="text-zinc-500 font-mono">VIN: {vehicle.vin}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={openEditDialog} className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-full px-5 h-10 shadow-lg shadow-black/20 transition-all border border-zinc-700 inline-flex items-center justify-center">
            <Edit className="mr-2 h-4 w-4" /> Edytuj Pojazd
          </Button>
          <Button onClick={() => setIsDeleteDialogOpen(true)} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full px-4 h-10 transition-all border border-red-500/20 inline-flex items-center justify-center">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl text-red-400">Usuń Pojazd</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Czy na pewno chcesz usunąć ten pojazd? Ta operacja jest nieodwracalna. 
                Pojazdu nie można usunąć, jeśli ma już przypisane zlecenia naprawy.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <DialogClose className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-700 bg-transparent px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                Anuluj
              </DialogClose>
              <Button type="button" disabled={isDeleting} onClick={handleDeleteVehicle} className="bg-red-600 hover:bg-red-500 text-white border-0">
                {isDeleting ? "Usuwanie..." : "Tak, usuń trwale"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl text-purple-400">Edytuj dane pojazdu</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="make" className="text-zinc-300">Marka</Label>
                  <Input id="make" value={editForm.make} onChange={e => setEditForm({...editForm, make: e.target.value})} className="bg-zinc-900 border-zinc-800" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="model" className="text-zinc-300">Model</Label>
                  <Input id="model" value={editForm.model} onChange={e => setEditForm({...editForm, model: e.target.value})} className="bg-zinc-900 border-zinc-800" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="productionYear" className="text-zinc-300">Rocznik</Label>
                  <Input id="productionYear" type="number" value={editForm.productionYear} onChange={e => setEditForm({...editForm, productionYear: e.target.value})} className="bg-zinc-900 border-zinc-800" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mileage" className="text-zinc-300">Przebieg (km)</Label>
                  <Input id="mileage" type="number" value={editForm.mileage} onChange={e => setEditForm({...editForm, mileage: e.target.value})} className="bg-zinc-900 border-zinc-800" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="licensePlate" className="text-zinc-300">Numer Rejestracyjny</Label>
                <Input id="licensePlate" value={editForm.licensePlate} onChange={e => setEditForm({...editForm, licensePlate: e.target.value})} className="bg-zinc-900 border-zinc-800" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vin" className="text-zinc-300">Numer VIN</Label>
                <Input id="vin" value={editForm.vin} onChange={e => setEditForm({...editForm, vin: e.target.value})} className="bg-zinc-900 border-zinc-800" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="engine" className="text-zinc-300">Silnik</Label>
                  <Input id="engine" value={editForm.engine} onChange={e => setEditForm({...editForm, engine: e.target.value})} className="bg-zinc-900 border-zinc-800" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fuelType" className="text-zinc-300">Paliwo</Label>
                  <Input id="fuelType" value={editForm.fuelType} onChange={e => setEditForm({...editForm, fuelType: e.target.value})} className="bg-zinc-900 border-zinc-800" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-700 bg-transparent px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                Anuluj
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} onClick={handleEditSubmit} className="bg-purple-600 hover:bg-purple-500 text-white border-0">
                {isSubmitting ? "Zapisywanie..." : "Zapisz Zmiany"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Add Order Dialog */}
      <Dialog open={isAddOrderDialogOpen} onOpenChange={setIsAddOrderDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl text-emerald-400">Nowe zlecenie naprawy</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tworzysz zlecenie dla: {vehicle.make} {vehicle.model} ({vehicle.licensePlate})
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reportedIssue" className="text-zinc-300">Zgłaszany problem / Usterka <span className="text-red-500">*</span></Label>
              <textarea 
                id="reportedIssue" 
                value={orderForm.reportedIssue} 
                onChange={e => setOrderForm({...orderForm, reportedIssue: e.target.value})} 
                className="flex w-full rounded-md px-3 py-2 text-sm shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-zinc-900 border border-zinc-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 min-h-[100px] text-zinc-100 placeholder:text-zinc-500" 
                placeholder="Opisz problem..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="estimatedCost" className="text-zinc-300">Szacowany koszt (PLN, opcjonalnie)</Label>
              <Input 
                id="estimatedCost" 
                type="number"
                value={orderForm.estimatedCost} 
                onChange={e => setOrderForm({...orderForm, estimatedCost: e.target.value})} 
                className="bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500" 
                placeholder="np. 500"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-700 bg-transparent px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
              Anuluj
            </DialogClose>
            <Button type="submit" disabled={isAddingOrder} onClick={handleAddOrder} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0">
              {isAddingOrder ? "Zapisywanie..." : "Utwórz Zlecenie"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        {/* Specyfikacja Card */}
        <GlassCard className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-zinc-100 border-b border-zinc-800 pb-2 flex items-center gap-2">
            <PenTool className="w-5 h-5 text-purple-500" /> Specyfikacja
          </h2>
          
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500">Rocznik</span>
              <span className="font-medium text-zinc-200">{vehicle.productionYear || "Brak"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500">Przebieg</span>
              <span className="font-medium text-zinc-200">{vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : "Brak"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500">Silnik</span>
              <span className="font-medium text-zinc-200">{vehicle.engine || "Brak"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500">Paliwo</span>
              <span className="font-medium text-zinc-200">{vehicle.fuelType || "Brak"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500">Moc</span>
              <span className="font-medium text-zinc-200">{vehicle.horsepower ? `${vehicle.horsepower} KM` : "Brak"}</span>
            </div>
          </div>
        </GlassCard>

        {/* Właściciel Card */}
        <GlassCard className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-zinc-100 border-b border-zinc-800 pb-2 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-500" /> Właściciel
          </h2>
          
          {vehicle.customer ? (
            <div className="flex items-center gap-4 mt-2">
              <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                <User className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-zinc-100 text-lg">{vehicle.customer.fullName}</span>
                <Link href={`/customers/${vehicle.customer.id}`} className="text-sm text-purple-400 hover:underline mt-1">Przejdź do profilu klienta &rarr;</Link>
              </div>
            </div>
          ) : (
            <div className="text-zinc-500 italic mt-2">Brak przypisanego właściciela.</div>
          )}
        </GlassCard>

        <div className="lg:col-span-1" />

        {/* Historia Napraw */}
        <GlassCard className="flex flex-col gap-4 lg:col-span-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-500" /> Historia Napraw
            </h2>
            <button onClick={() => setIsAddOrderDialogOpen(true)} className="bg-white/5 hover:bg-white/10 text-emerald-400 border border-emerald-500/20 rounded-full h-8 px-3 inline-flex items-center justify-center text-xs font-medium cursor-pointer transition-colors">
              + Nowe zlecenie
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-400 bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">ID Zlecenia</th>
                  <th className="px-4 py-3">Zgłoszony problem</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right rounded-r-lg">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {vehicle.repairOrders && vehicle.repairOrders.length > 0 ? (
                  vehicle.repairOrders.map((order, i) => (
                    <tr key={i} className="hover:bg-zinc-800/30 cursor-pointer">
                      <td className="px-4 py-4 font-mono text-xs text-zinc-300">#{order.id.substring(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-4 font-medium">{order.reportedIssue}</td>
                      <td className="px-4 py-4 text-zinc-400 flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> {new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                          order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                          'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link href={`/orders/${order.id}`} className="text-purple-400 hover:text-purple-300 hover:underline text-xs font-medium">
                          Szczegóły
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">Ten pojazd nie ma jeszcze historii napraw.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Galeria Zdjęć */}
        <GlassCard className="flex flex-col gap-4 lg:col-span-3 mt-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-purple-500" /> Galeria Zdjęć
            </h2>
            <div className="relative">
              <input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <Button size="sm" className="bg-white/5 hover:bg-white/10 text-purple-400 border border-purple-500/20 rounded-full h-8 pointer-events-none">
                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Wgraj Zdjęcie
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
            {attachments.length > 0 ? (
              attachments.map((att, idx) => (
                <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/50 hover:border-purple-500/50 transition-colors">
                  <img src={`http://${window.location.hostname}:3001${att.url}`} alt={att.fileName} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <span className="text-[10px] text-zinc-300 truncate">{att.fileName}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-zinc-500 flex flex-col items-center">
                <ImageIcon className="w-12 h-12 mb-3 opacity-20" />
                <p>Brak zdjęć pojazdu.</p>
                <p className="text-xs mt-1">Kliknij "Wgraj Zdjęcie", aby dodać pierwsze.</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
