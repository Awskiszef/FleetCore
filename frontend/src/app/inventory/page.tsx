"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Trash2, Edit, PackagePlus, PackageMinus } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Part {
  id: string;
  name: string;
  oemNumber: string | null;
  aftermarketNumber: string | null;
  manufacturer: string | null;
  supplier: string | null;
  unitPrice: number;
  quantity: number;
}

export default function InventoryPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    oemNumber: "",
    aftermarketNumber: "",
    manufacturer: "",
    supplier: "",
    unitPrice: "",
    quantity: "0"
  });

  const fetchParts = async () => {
    try {
      const res = await fetch("http://localhost:3001/parts");
      if (res.ok) {
        const data = await res.json();
        setParts(data);
      }
    } catch (e) {
      toast.error("Nie udało się pobrać listy części.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
  }, []);

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.unitPrice || !formData.quantity) {
      toast.error("Wypełnij wymagane pola (Nazwa, Cena jednostkowa, Ilość).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("http://localhost:3001/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          oemNumber: formData.oemNumber || undefined,
          aftermarketNumber: formData.aftermarketNumber || undefined,
          manufacturer: formData.manufacturer || undefined,
          supplier: formData.supplier || undefined,
          unitPrice: parseFloat(formData.unitPrice),
          quantity: parseInt(formData.quantity)
        })
      });
      
      if (res.ok) {
        toast.success("Część została dodana do magazynu.");
        setIsAddDialogOpen(false);
        setFormData({
          name: "", oemNumber: "", aftermarketNumber: "", 
          manufacturer: "", supplier: "", unitPrice: "", quantity: "0"
        });
        await fetchParts();
      } else {
        toast.error("Błąd podczas dodawania części.");
      }
    } catch (e) {
      toast.error("Błąd serwera.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePart = async (id: string) => {
    if (!window.confirm("Czy na pewno chcesz usunąć tę część z systemu?")) return;
    
    try {
      const res = await fetch(`http://localhost:3001/parts/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Część została usunięta.");
        setParts(parts.filter(p => p.id !== id));
      } else {
        toast.error("Błąd podczas usuwania.");
      }
    } catch (e) {
      toast.error("Błąd połączenia z serwerem.");
    }
  };

  const updateQuantity = async (id: string, currentQuantity: number, change: number) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity < 0) {
      toast.error("Ilość nie może być ujemna.");
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/parts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity })
      });
      
      if (res.ok) {
        setParts(parts.map(p => p.id === id ? { ...p, quantity: newQuantity } : p));
        if (change > 0) toast.success("Zwiększono stan magazynowy.");
        else toast.success("Zmniejszono stan magazynowy.");
      }
    } catch (e) {
      toast.error("Błąd aktualizacji stanu.");
    }
  };

  const filteredParts = parts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.oemNumber && p.oemNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.manufacturer && p.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
            Magazyn Części
          </h1>
          <p className="text-zinc-400 mt-2 text-lg">Zarządzaj stanami magazynowymi i zaopatrzeniem.</p>
        </div>
        
        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:scale-105 rounded-full px-6 h-10 inline-flex items-center justify-center border-0">
          <Plus className="mr-2 h-4 w-4" /> Dodaj Część
        </Button>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl text-cyan-400">Dodaj nową część</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Wprowadź dane przedmiotu do magazynu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2 col-span-2">
                <Label htmlFor="name" className="text-zinc-300">Nazwa części <span className="text-red-500">*</span></Label>
                <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" placeholder="np. Klocki hamulcowe przednie" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="oemNumber" className="text-zinc-300">Numer OEM</Label>
                <Input id="oemNumber" value={formData.oemNumber} onChange={e => setFormData({...formData, oemNumber: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="manufacturer" className="text-zinc-300">Producent</Label>
                <Input id="manufacturer" value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" placeholder="np. Bosch" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantity" className="text-zinc-300">Ilość <span className="text-red-500">*</span></Label>
                <Input id="quantity" type="number" min="0" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unitPrice" className="text-zinc-300">Cena jednostkowa (PLN) <span className="text-red-500">*</span></Label>
                <Input id="unitPrice" type="number" step="0.01" min="0" value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-700 bg-transparent px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
              Anuluj
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} onClick={handleAddPart} className="bg-cyan-600 hover:bg-cyan-500 text-white border-0">
              {isSubmitting ? "Zapisywanie..." : "Zapisz do magazynu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GlassCard className="flex flex-col gap-6 border-white/5">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
          <input 
            type="text"
            placeholder="Szukaj po nazwie, OEM, producencie..." 
            className="pl-10 w-full bg-zinc-900/50 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 rounded-xl px-3 py-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-800/50">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase tracking-wider text-xs font-semibold">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl">Nazwa</th>
                <th className="px-6 py-4">OEM / Producent</th>
                <th className="px-6 py-4 text-center">Stan Magazynowy</th>
                <th className="px-6 py-4">Wartość (Cena)</th>
                <th className="px-6 py-4 text-right rounded-tr-xl">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 bg-transparent">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 animate-pulse">
                    Ładowanie magazynu...
                  </td>
                </tr>
              ) : filteredParts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    Brak części w magazynie.
                  </td>
                </tr>
              ) : (
                filteredParts.map((part) => (
                  <tr key={part.id} className="group hover:bg-zinc-800/30 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="font-bold text-zinc-100 truncate max-w-[250px]">{part.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      {part.oemNumber ? <div className="text-zinc-300 font-mono text-xs mb-1">OEM: {part.oemNumber}</div> : null}
                      <div className="text-xs text-zinc-500">{part.manufacturer || "Brak danych"}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-3 bg-zinc-900/50 rounded-full px-3 py-1 border border-zinc-800">
                        <button onClick={() => updateQuantity(part.id, part.quantity, -1)} className="text-zinc-400 hover:text-red-400 transition-colors">
                          <PackageMinus className="w-4 h-4" />
                        </button>
                        <span className={`font-bold w-6 text-center ${part.quantity <= 2 ? 'text-red-400' : 'text-zinc-100'}`}>
                          {part.quantity}
                        </span>
                        <button onClick={() => updateQuantity(part.id, part.quantity, 1)} className="text-zinc-400 hover:text-green-400 transition-colors">
                          <PackagePlus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-300 font-medium">
                      {part.unitPrice} PLN
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button onClick={() => handleDeletePart(part.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full px-3 h-8 transition-all border border-red-500/20 inline-flex items-center justify-center">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
