"use client";

import { useEffect, useState } from "react";
import { Plus, CarFront, AlertCircle, ChevronRight, Fuel, Wrench, Settings, Package, Calendar, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";

interface FleetVehicle {
  id: string;
  name: string;
  licensePlate: string | null;
  vin: string | null;
  make: string | null;
  model: string | null;
  productionYear: number | null;
  logs: FleetLog[];
}

interface FleetLog {
  id: string;
  date: string;
  type: "REFUEL" | "SERVICE" | "PARTS" | "INSURANCE" | "OTHER";
  cost: number | null;
}

export default function FleetPage() {
  const { user } = useAuth();
  const isAdminOrOwner = user?.role === 'ADMIN' || user?.role === 'OWNER';
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    make: "",
    model: "",
    licensePlate: "",
    vin: "",
    productionYear: ""
  });

  const fetchVehicles = async () => {
    try {
      const response = await fetch(`http://${window.location.hostname}:3001/fleet`);
      if (response.ok) {
        const data = await response.json();
        setVehicles(data);
      }
    } catch (e) {
      toast.error("Nie udało się pobrać floty");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`http://${window.location.hostname}:3001/fleet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          make: formData.make || undefined,
          model: formData.model || undefined,
          licensePlate: formData.licensePlate || undefined,
          vin: formData.vin || undefined,
          productionYear: formData.productionYear ? parseInt(formData.productionYear) : undefined,
        }),
      });
      
      if (response.ok) {
        setIsDialogOpen(false);
        setFormData({ name: "", make: "", model: "", licensePlate: "", vin: "", productionYear: "" });
        await fetchVehicles();
        toast.success("Pojazd został dodany do floty.");
      } else {
        toast.error("Wystąpił błąd.");
      }
    } catch (error) {
      toast.error("Błąd połączenia.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVehicle = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm("Czy na pewno chcesz usunąć ten pojazd ze swojej floty? Operacja jest nieodwracalna.")) return;
    
    try {
      const response = await fetch(`http://${window.location.hostname}:3001/fleet/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Pojazd został usunięty.");
        await fetchVehicles();
      } else {
        toast.error("Błąd podczas usuwania.");
      }
    } catch (error) {
      toast.error("Błąd połączenia.");
    }
  };

  const calculateTotalCost = (logs: FleetLog[]) => {
    return logs.reduce((acc, log) => acc + (log.cost || 0), 0);
  };

  return (
    <div className="flex-1 overflow-auto p-8 relative z-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-3">
              <CarFront className="h-8 w-8 text-cyan-400" />
              Moja Flota
            </h1>
            <p className="text-zinc-400 mt-1">Dziennik pojazdów i historii wydatków na własne auta.</p>
          </div>
          {isAdminOrOwner && (
            <Button 
              className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Dodaj pojazd
            </Button>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : vehicles.length === 0 ? (
          <GlassCard className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 border-zinc-800">
            <CarFront className="w-16 h-16 text-zinc-700 mb-4" />
            <h3 className="text-xl font-bold text-zinc-300">Brak pojazdów</h3>
            <p className="text-zinc-500 mt-2 max-w-md">Nie masz jeszcze żadnych pojazdów w swojej flocie. Dodaj pierwszy samochód, aby rozpocząć prowadzenie dziennika.</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((v) => {
              const totalCost = calculateTotalCost(v.logs);
              return (
                <Link href={`/fleet/${v.id}`} key={v.id}>
                  <GlassCard className="p-6 flex flex-col h-full hover:border-cyan-500/50 transition-all cursor-pointer group hover:bg-zinc-900/60 relative">
                    {isAdminOrOwner && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => handleDeleteVehicle(e, v.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:bg-red-500/10 hover:text-red-300 z-10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    <div className="flex justify-between items-start mb-4 pr-8">
                      <div>
                        <h3 className="text-xl font-bold text-zinc-100 group-hover:text-cyan-400 transition-colors">
                          {v.name}
                        </h3>
                        <p className="text-zinc-500 text-sm">{v.make} {v.model} {v.productionYear ? `(${v.productionYear})` : ''}</p>
                      </div>
                      <div className="bg-zinc-800/80 px-2 py-1 rounded text-xs font-mono text-zinc-300 border border-zinc-700">
                        {v.licensePlate || "BRAK REJ."}
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-zinc-800/50 flex justify-between items-center">
                      <div className="text-sm">
                        <span className="text-zinc-500">Wydatki: </span>
                        <span className="font-medium text-red-400">{totalCost.toFixed(2)} PLN</span>
                      </div>
                      <div className="flex items-center text-xs text-zinc-500">
                        {v.logs.length} wpisów
                        <ChevronRight className="w-4 h-4 ml-1 opacity-50 group-hover:opacity-100 transition-opacity text-cyan-400" />
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CarFront className="w-5 h-5 text-cyan-400" />
              Dodaj pojazd do floty
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddVehicle} className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label className="text-zinc-400">Nazwa (np. Moje Auto, Laweta 1) *</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-cyan-500"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-zinc-400">Marka</Label>
                <Input 
                  value={formData.make} 
                  onChange={e => setFormData({...formData, make: e.target.value})}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-cyan-500"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-zinc-400">Model</Label>
                <Input 
                  value={formData.model} 
                  onChange={e => setFormData({...formData, model: e.target.value})}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-cyan-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-zinc-400">Nr Rejestracyjny</Label>
                <Input 
                  value={formData.licensePlate} 
                  onChange={e => setFormData({...formData, licensePlate: e.target.value})}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-cyan-500 uppercase"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-zinc-400">Rok produkcji</Label>
                <Input 
                  type="number"
                  value={formData.productionYear} 
                  onChange={e => setFormData({...formData, productionYear: e.target.value})}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-cyan-500"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-zinc-400">VIN</Label>
              <Input 
                value={formData.vin} 
                onChange={e => setFormData({...formData, vin: e.target.value})}
                className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-cyan-500 uppercase font-mono text-sm"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                Anuluj
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.name} className="bg-cyan-500 hover:bg-cyan-600 text-black">
                {isSubmitting ? "Zapisywanie..." : "Dodaj pojazd"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
