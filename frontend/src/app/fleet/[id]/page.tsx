"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, CarFront, Fuel, Wrench, Package, ShieldCheck, MoreHorizontal, Calendar, DollarSign, Trash2, MapPin, FileText, Hash } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

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
  mileage: number | null;
  cost: number | null;
  liters: number | null;
  location: string | null;
  policyNumber: string | null;
  provider: string | null;
  title: string;
  notes: string | null;
}

const LogIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "REFUEL": return <Fuel className="w-5 h-5 text-amber-400" />;
    case "SERVICE": return <Wrench className="w-5 h-5 text-blue-400" />;
    case "PARTS": return <Package className="w-5 h-5 text-emerald-400" />;
    case "INSURANCE": return <ShieldCheck className="w-5 h-5 text-purple-400" />;
    default: return <MoreHorizontal className="w-5 h-5 text-zinc-400" />;
  }
};

const LogTypeLabel = ({ type }: { type: string }) => {
  switch (type) {
    case "REFUEL": return "Tankowanie";
    case "SERVICE": return "Serwis";
    case "PARTS": return "Części";
    case "INSURANCE": return "Ubezpieczenie/Przegląd";
    default: return "Inne";
  }
};

export default function FleetVehicleProfilePage() {
  const { user } = useAuth();
  const isAdminOrOwner = user?.role === 'ADMIN' || user?.role === 'OWNER';
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;
  
  const [vehicle, setVehicle] = useState<FleetVehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedLog, setSelectedLog] = useState<FleetLog | null>(null);

  // Log Dialog
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logForm, setLogForm] = useState({
    title: "",
    type: "REFUEL",
    date: new Date().toISOString().split('T')[0],
    mileage: "",
    cost: "",
    liters: "",
    location: "",
    policyNumber: "",
    provider: "",
    notes: ""
  });

  const fetchVehicle = async () => {
    try {
      const response = await fetch(`http://${window.location.hostname}:3001/fleet/${vehicleId}`);
      if (response.ok) {
        const data = await response.json();
        setVehicle(data);
      } else {
        toast.error("Nie znaleziono pojazdu");
        router.push("/fleet");
      }
    } catch (e) {
      toast.error("Błąd połączenia");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicle();
  }, [vehicleId]);

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`http://${window.location.hostname}:3001/fleet/${vehicleId}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: logForm.title,
          type: logForm.type,
          date: new Date(logForm.date).toISOString(),
          mileage: logForm.mileage ? parseInt(logForm.mileage) : undefined,
          cost: logForm.cost ? parseFloat(logForm.cost) : undefined,
          liters: logForm.type === 'REFUEL' && logForm.liters ? parseFloat(logForm.liters) : undefined,
          location: logForm.location || undefined,
          policyNumber: logForm.type === 'INSURANCE' && logForm.policyNumber ? logForm.policyNumber : undefined,
          provider: logForm.type === 'INSURANCE' && logForm.provider ? logForm.provider : undefined,
          notes: logForm.notes || undefined,
        }),
      });
      
      if (response.ok) {
        setIsLogDialogOpen(false);
        setLogForm({ ...logForm, title: "", cost: "", liters: "", location: "", policyNumber: "", provider: "", notes: "" });
        await fetchVehicle();
        toast.success("Wpis został dodany.");
      } else {
        toast.error("Wystąpił błąd.");
      }
    } catch (error) {
      toast.error("Błąd połączenia.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten wpis?")) return;
    try {
      const response = await fetch(`http://${window.location.hostname}:3001/fleet/logs/${logId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Wpis usunięty.");
        setSelectedLog(null);
        await fetchVehicle();
      }
    } catch (e) {
      toast.error("Błąd usuwania wpisu.");
    }
  };

  const handleDeleteVehicle = async () => {
    if (!window.confirm("Czy na pewno chcesz usunąć ten pojazd ze swojej floty? Operacja jest nieodwracalna.")) return;
    try {
      const response = await fetch(`http://${window.location.hostname}:3001/fleet/${vehicleId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Pojazd usunięty.");
        router.push("/fleet");
      } else {
        toast.error("Wystąpił błąd podczas usuwania pojazdu.");
      }
    } catch (e) {
      toast.error("Błąd połączenia z serwerem.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!vehicle) return null;

  const totalCost = vehicle.logs.reduce((sum, log) => sum + (log.cost || 0), 0);
  const maxMileage = Math.max(...vehicle.logs.map(l => l.mileage || 0), 0);

  let averageFuelConsumption: number | null = null;
  const refuels = vehicle.logs
    .filter(l => l.type === "REFUEL" && l.mileage && l.liters)
    .sort((a, b) => (a.mileage || 0) - (b.mileage || 0));

  if (refuels.length >= 2) {
    const firstMileage = refuels[0].mileage!;
    const lastMileage = refuels[refuels.length - 1].mileage!;
    const distance = lastMileage - firstMileage;
    
    if (distance > 0) {
      const usedLiters = refuels.slice(1).reduce((sum, l) => sum + (l.liters || 0), 0);
      averageFuelConsumption = (usedLiters / distance) * 100;
    }
  }

  return (
    <div className="flex-1 overflow-auto p-8 relative z-10">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/fleet">
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-3">
              {vehicle.name}
            </h1>
            <p className="text-zinc-400 mt-1">{vehicle.make} {vehicle.model} • {vehicle.licensePlate || "Brak Rej"}</p>
          </div>
          <div className="flex gap-2">
            {isAdminOrOwner && (
              <Button 
                variant="outline"
                className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                onClick={handleDeleteVehicle}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Usuń pojazd
              </Button>
            )}
            <Button 
              className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
              onClick={() => setIsLogDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Dodaj wpis
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard className="p-6 flex items-center gap-4 border-l-4 border-l-cyan-500">
            <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-400">
              <CarFront className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Zarejestrowane Wpisy</p>
              <p className="text-2xl font-bold text-zinc-100">{vehicle.logs.length}</p>
            </div>
          </GlassCard>
          
          <GlassCard className="p-6 flex items-center gap-4 border-l-4 border-l-red-500">
            <div className="p-3 rounded-full bg-red-500/10 text-red-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Suma Kosztów</p>
              <p className="text-2xl font-bold text-zinc-100">{totalCost.toFixed(2)} PLN</p>
            </div>
          </GlassCard>

          <GlassCard className="p-6 flex items-center gap-4 border-l-4 border-l-emerald-500">
            <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Ostatni Przebieg</p>
              <p className="text-2xl font-bold text-zinc-100">{maxMileage > 0 ? `${maxMileage.toLocaleString()} km` : "Brak"}</p>
            </div>
          </GlassCard>

          <GlassCard className="p-6 flex items-center gap-4 border-l-4 border-l-amber-500">
            <div className="p-3 rounded-full bg-amber-500/10 text-amber-400">
              <Fuel className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Średnie Spalanie</p>
              <p className="text-2xl font-bold text-zinc-100">{averageFuelConsumption !== null ? `${averageFuelConsumption.toFixed(2)} l/100` : "Brak danych"}</p>
            </div>
          </GlassCard>
        </div>

        {/* Timeline */}
        <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-4 border-b border-zinc-800 pb-2">Oś Czasu (Dziennik)</h2>
        
        {vehicle.logs.length === 0 ? (
          <div className="text-center p-12 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
            <p className="text-zinc-500">Brak historii. Kliknij "Dodaj wpis", aby zapisać tankowanie lub serwis.</p>
          </div>
        ) : (
          <div className="relative border-l border-zinc-800 ml-4 space-y-8 pb-4">
            {vehicle.logs.map((log) => (
              <div key={log.id} className="relative pl-8 group">
                <div className="absolute -left-4 top-1 w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-lg">
                  <LogIcon type={log.type} />
                </div>
                
                <GlassCard 
                  className="p-5 border-zinc-800/50 hover:border-cyan-500/50 transition-colors relative cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLog(log.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3 border-b border-zinc-800/50 pb-3 pr-8">
                    <div>
                      <h3 className="font-bold text-zinc-100 text-lg">{log.title}</h3>
                      <p className="text-sm text-cyan-400 font-medium">
                        <LogTypeLabel type={log.type} />
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-zinc-400 font-mono">{new Date(log.date).toLocaleDateString("pl-PL")}</p>
                      {log.mileage && <p className="text-zinc-500 font-mono mt-0.5">{log.mileage.toLocaleString()} km</p>}
                    </div>
                  </div>
                  
                  {log.location && (
                    <div className="flex items-center gap-1.5 text-zinc-400 text-sm mb-3">
                      <MapPin className="w-4 h-4 text-cyan-500/70" />
                      {log.location}
                    </div>
                  )}
                  
                  {log.notes && (
                    <p className="text-zinc-300 text-sm whitespace-pre-wrap mb-3">{log.notes}</p>
                  )}
                  
                  {log.cost !== null && log.cost > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-red-500/10 text-red-400 font-semibold text-sm border border-red-500/20">
                      -{log.cost.toFixed(2)} PLN
                    </div>
                  )}
                  {log.liters !== null && log.liters > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500/10 text-amber-400 font-semibold text-sm border border-amber-500/20 ml-2">
                      {log.liters.toFixed(2)} L
                    </div>
                  )}
                </GlassCard>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-cyan-400" />
              Nowy wpis w dzienniku
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddLog} className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label className="text-zinc-400">Typ wpisu</Label>
              <select 
                value={logForm.type}
                onChange={e => setLogForm({...logForm, type: e.target.value})}
                className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <option value="REFUEL">⛽ Tankowanie</option>
                <option value="SERVICE">🔧 Serwis / Naprawa</option>
                <option value="PARTS">⚙️ Części / Zakupy</option>
                <option value="INSURANCE">🛡️ Ubezpieczenie / Przegląd</option>
                <option value="OTHER">📝 Inne</option>
              </select>
            </div>
            
            <div className="grid gap-2">
              <Label className="text-zinc-400">Tytuł (np. Wymiana oleju, Pełen bak) *</Label>
              <Input 
                value={logForm.title} 
                onChange={e => setLogForm({...logForm, title: e.target.value})}
                className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-cyan-500"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-zinc-400">Data</Label>
                <Input 
                  type="date"
                  value={logForm.date} 
                  onChange={e => setLogForm({...logForm, date: e.target.value})}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-cyan-500"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-zinc-400">Koszt (PLN)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={logForm.cost} 
                  onChange={e => setLogForm({...logForm, cost: e.target.value})}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-cyan-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label className="text-zinc-400">Przebieg (km)</Label>
              <Input 
                type="number"
                value={logForm.mileage} 
                onChange={e => setLogForm({...logForm, mileage: e.target.value})}
                className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-cyan-500"
              />
            </div>
            
            {logForm.type === 'REFUEL' && (
              <div className="grid gap-2">
                <Label className="text-zinc-400">Zatankowane paliwo (Litry)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={logForm.liters} 
                  onChange={e => setLogForm({...logForm, liters: e.target.value})}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-cyan-500"
                  placeholder="np. 45.5"
                />
              </div>
            )}
            
            <div className="grid gap-2">
              <Label className="text-zinc-400">Miejsce / Stacja (opcjonalnie)</Label>
              <Input 
                value={logForm.location} 
                onChange={e => setLogForm({...logForm, location: e.target.value})}
                className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-cyan-500"
                placeholder="np. Orlen, Warsztat Auto-Kowalski"
              />
            </div>
            
            {logForm.type === 'INSURANCE' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-zinc-400">Ubezpieczyciel (np. PZU)</Label>
                  <Input 
                    value={logForm.provider} 
                    onChange={e => setLogForm({...logForm, provider: e.target.value})}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-cyan-500"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-zinc-400">Numer Polisy</Label>
                  <Input 
                    value={logForm.policyNumber} 
                    onChange={e => setLogForm({...logForm, policyNumber: e.target.value})}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-cyan-500"
                  />
                </div>
              </div>
            )}
            
            <div className="grid gap-2">
              <Label className="text-zinc-400">Notatki / Szczegóły</Label>
              <textarea 
                value={logForm.notes}
                onChange={e => setLogForm({...logForm, notes: e.target.value})}
                className="flex min-h-[80px] w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 resize-none"
                placeholder="Np. Olej 5W30, stacja Orlen, itp."
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsLogDialogOpen(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                Anuluj
              </Button>
              <Button type="submit" disabled={isSubmitting || !logForm.title} className="bg-cyan-500 hover:bg-cyan-600 text-black">
                {isSubmitting ? "Zapisywanie..." : "Zapisz wpis"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-100 max-w-lg">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <LogIcon type={selectedLog.type} />
                  {selectedLog.title}
                </DialogTitle>
                <div className="text-cyan-400 text-sm font-medium mt-1">
                  <LogTypeLabel type={selectedLog.type} />
                </div>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-500 text-xs uppercase font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Data
                    </span>
                    <span className="text-zinc-100 font-medium">{new Date(selectedLog.date).toLocaleDateString("pl-PL")}</span>
                  </div>
                  {selectedLog.mileage && (
                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-500 text-xs uppercase font-semibold flex items-center gap-1">
                        <CarFront className="w-3 h-3" /> Przebieg
                      </span>
                      <span className="text-zinc-100 font-medium">{selectedLog.mileage.toLocaleString()} km</span>
                    </div>
                  )}
                  {selectedLog.cost !== null && selectedLog.cost > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-500 text-xs uppercase font-semibold flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Koszt
                      </span>
                      <span className="text-red-400 font-medium">{selectedLog.cost.toFixed(2)} PLN</span>
                    </div>
                  )}
                  {selectedLog.liters !== null && selectedLog.liters > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-500 text-xs uppercase font-semibold flex items-center gap-1">
                        <Fuel className="w-3 h-3" /> Paliwo
                      </span>
                      <span className="text-amber-400 font-medium">{selectedLog.liters.toFixed(2)} L</span>
                    </div>
                  )}
                  {selectedLog.location && (
                    <div className="col-span-2 flex flex-col gap-1">
                      <span className="text-zinc-500 text-xs uppercase font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Miejsce / Stacja
                      </span>
                      <span className="text-zinc-100 font-medium">{selectedLog.location}</span>
                    </div>
                  )}
                  {selectedLog.provider && (
                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-500 text-xs uppercase font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Ubezpieczyciel
                      </span>
                      <span className="text-zinc-100 font-medium">{selectedLog.provider}</span>
                    </div>
                  )}
                  {selectedLog.policyNumber && (
                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-500 text-xs uppercase font-semibold flex items-center gap-1">
                        <Hash className="w-3 h-3" /> Numer Polisy
                      </span>
                      <span className="text-zinc-100 font-medium">{selectedLog.policyNumber}</span>
                    </div>
                  )}
                </div>
                
                {selectedLog.notes && (
                  <div className="flex flex-col gap-2 pt-4 border-t border-zinc-800">
                    <span className="text-zinc-500 text-xs uppercase font-semibold flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Notatki i szczegóły
                    </span>
                    <p className="text-zinc-300 text-sm whitespace-pre-wrap bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
                      {selectedLog.notes}
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter className="flex justify-between items-center w-full">
                <Button variant="ghost" onClick={() => handleDeleteLog(selectedLog.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Usuń wpis
                </Button>
                <Button onClick={() => setSelectedLog(null)} className="bg-zinc-800 hover:bg-zinc-700 text-white">
                  Zamknij
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
