"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Trash2, Edit, PackagePlus, PackageMinus, AlertCircle } from "lucide-react";
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

interface Part {
  id: string;
  name: string;
  oemNumber: string | null;
  aftermarketNumber: string | null;
  manufacturer: string | null;
  supplierId: string | null;
  supplier: { name: string } | null;
  unitPrice: number;
  quantity: number;
  minQuantity: number;
  barcode: string | null;
  shelfLocation: string | null;
}

interface Supplier {
  id: string;
  name: string;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const [parts, setParts] = useState<Part[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1 });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    oemNumber: "",
    aftermarketNumber: "",
    manufacturer: "",
    supplierId: "",
    unitPrice: "",
    quantity: "0",
    minQuantity: "0",
    barcode: "",
    shelfLocation: ""
  });

  const fetchParts = async () => {
    try {
      const page = Number(searchParams.get("page")) || 1;
      const search = searchParams.get("search") || "";
      const [partsRes, suppRes] = await Promise.all([
        apiClient.getParts({ page, limit: 20, search }),
        apiClient.getSuppliers({ limit: 100 })
      ]);
      setParts(partsRes.data);
      setPagination({ page: partsRes.page, limit: partsRes.limit, totalPages: partsRes.totalPages });
      setSuppliers(suppRes.data);
    } catch (e) {
      toast.error("Nie udało się pobrać danych magazynu.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
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

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.unitPrice || !formData.quantity) {
      toast.error("Wypełnij wymagane pola (Nazwa, Cena jednostkowa, Ilość).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          oemNumber: formData.oemNumber || undefined,
          aftermarketNumber: formData.aftermarketNumber || undefined,
          manufacturer: formData.manufacturer || undefined,
          manufacturer: formData.manufacturer || undefined,
          supplierId: formData.supplierId || undefined,
          unitPrice: parseFloat(formData.unitPrice),
          quantity: parseInt(formData.quantity),
          minQuantity: parseInt(formData.minQuantity),
          barcode: formData.barcode || undefined,
          shelfLocation: formData.shelfLocation || undefined
        })
      });
      
      if (res.ok) {
        toast.success("Część została dodana do magazynu.");
        setIsAddDialogOpen(false);
        setFormData({
          name: "", oemNumber: "", aftermarketNumber: "", 
          manufacturer: "", supplierId: "", unitPrice: "", quantity: "0", minQuantity: "0", barcode: "", shelfLocation: ""
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/parts/${id}`, { method: "DELETE" });
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/parts/${id}`, {
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

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
          <input 
            type="text"
            placeholder="Szukaj po nazwie, OEM, producencie..." 
            className="pl-10 w-full bg-zinc-900/50 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 rounded-xl px-3 py-2"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
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
              ) : parts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    Brak części pasujących do kryteriów.
                  </td>
                </tr>
              ) : (
                parts.map((part) => (
                  <tr key={part.id} className="group hover:bg-zinc-800/30 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="font-bold text-zinc-100 truncate max-w-[250px]">{part.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      {part.oemNumber ? <div className="text-zinc-300 font-mono text-xs mb-1">OEM: {part.oemNumber}</div> : null}
                      {part.barcode ? <div className="text-zinc-400 font-mono text-xs mb-1">Kod: {part.barcode}</div> : null}
                      {part.shelfLocation ? <div className="text-cyan-400 font-mono text-xs mb-1">Lokalizacja: {part.shelfLocation}</div> : null}
                      <div className="text-xs text-zinc-500">{part.manufacturer || "Brak prod."} {part.supplier ? `| Dostawca: ${part.supplier.name}` : ''}</div>
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
        <PaginationControls 
          page={pagination.page} 
          totalPages={pagination.totalPages} 
          onPageChange={handlePageChange} 
        />
      </GlassCard>
    </div>
  );
}
