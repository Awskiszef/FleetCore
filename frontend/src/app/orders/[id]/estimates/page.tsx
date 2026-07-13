"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Download, FileText, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadAuthenticatedFile } from "@/lib/download-auth-file";

export default function EstimatesPage() {
  const params = useParams();
  const [estimates, setEstimates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState([{ name: "", quantity: 1, unitPrice: 0, type: "PART", taxRate: 23 }]);

  const fetchEstimates = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/estimates/repair-order/${params.id}`);
      if (res.ok) {
        setEstimates(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimates();
  }, [params.id]);

  const handleDownloadPdf = async (id: string) => {
    try {
      toast.info("Pobieranie kosztorysu...", {
        id: "download-estimate",
      });

      await downloadAuthenticatedFile(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/estimates/${id}/pdf`,
        `Kosztorys_${id.substring(0, 8)}.pdf`,
      );

      toast.success("Kosztorys został pobrany.", {
        id: "download-estimate",
      });
    } catch (error) {
      console.error("Estimate download failed:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Nie udało się pobrać kosztorysu.",
        {
          id: "download-estimate",
        },
      );
    }
  };

  const handleSaveEstimate = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/estimates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repairOrderId: params.id,
          items: items.map(i => ({
            ...i,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            taxRate: Number(i.taxRate)
          }))
        })
      });

      if (res.ok) {
        toast.success("Kosztorys dodany.");
        setIsAddDialogOpen(false);
        setItems([{ name: "", quantity: 1, unitPrice: 0, type: "PART", taxRate: 23 }]);
        fetchEstimates();
      } else {
        toast.error("Błąd zapisu.");
      }
    } catch (e) {
      toast.error("Błąd połączenia.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 md:p-10 max-w-5xl mx-auto w-full">
      <Link href={`/orders/${params.id}`} className="text-zinc-400 hover:text-white flex items-center gap-2 w-fit mb-4">
        <ArrowLeft className="w-4 h-4" /> Wróć do zlecenia
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-amber-400">Kosztorysy Zlecenia</h1>
          <p className="text-zinc-400 mt-2">Zarządzaj wstępnymi wycenami dla klienta.</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-amber-600 hover:bg-amber-500 text-white rounded-full">
          <Plus className="w-4 h-4 mr-2" /> Nowy Kosztorys
        </Button>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-amber-400">Utwórz nowy kosztorys</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 items-end bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <div className="col-span-4">
                  <Label className="text-xs text-zinc-400 mb-1 block">Nazwa</Label>
                  <Input value={item.name} onChange={e => {
                    const newItems = [...items]; newItems[index].name = e.target.value; setItems(newItems);
                  }} className="bg-zinc-900 h-9" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-zinc-400 mb-1 block">Ilość</Label>
                  <Input type="number" min="1" value={item.quantity} onChange={e => {
                    const newItems = [...items]; newItems[index].quantity = parseInt(e.target.value) || 1; setItems(newItems);
                  }} className="bg-zinc-900 h-9" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-zinc-400 mb-1 block">Cena Netto</Label>
                  <Input type="number" step="0.01" value={item.unitPrice} onChange={e => {
                    const newItems = [...items]; newItems[index].unitPrice = parseFloat(e.target.value) || 0; setItems(newItems);
                  }} className="bg-zinc-900 h-9" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-zinc-400 mb-1 block">VAT (%)</Label>
                  <Input type="number" value={item.taxRate} onChange={e => {
                    const newItems = [...items]; newItems[index].taxRate = parseInt(e.target.value) || 23; setItems(newItems);
                  }} className="bg-zinc-900 h-9" />
                </div>
                <div className="col-span-2 flex justify-end">
                  <Button onClick={() => setItems(items.filter((_, i) => i !== index))} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 h-9 px-3">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button onClick={() => setItems([...items, { name: "", quantity: 1, unitPrice: 0, type: "PART", taxRate: 23 }])} className="border border-dashed border-amber-500/50 text-amber-500 bg-transparent hover:bg-amber-500/10 h-10">
              <Plus className="w-4 h-4 mr-2" /> Dodaj Pozycję
            </Button>
          </div>
          <DialogFooter>
            <DialogClose className="border border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 px-4 py-2 rounded-lg">Anuluj</DialogClose>
            <Button onClick={handleSaveEstimate} disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-500 text-white">
              Zapisz Kosztorys
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-4 mt-4">
        {isLoading ? (
          <div className="text-center py-10 text-zinc-500 animate-pulse">Ładowanie kosztorysów...</div>
        ) : estimates.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 bg-zinc-900/30 rounded-xl border border-zinc-800/30">Brak kosztorysów.</div>
        ) : (
          estimates.map(est => (
            <GlassCard key={est.id} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 border-l-amber-500">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-zinc-300 text-sm">#{est.id.substring(0, 8)}</span>
                  <span className="px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400">{est.status}</span>
                </div>
                <div className="text-2xl font-bold text-white mt-1">{est.totalGross} PLN <span className="text-sm font-normal text-zinc-500">brutto</span></div>
                <div className="text-xs text-zinc-500 mt-1">Stworzono: {new Date(est.createdAt).toLocaleString()}</div>
              </div>
              <Button onClick={() => handleDownloadPdf(est.id)} className="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 rounded-full">
                <Download className="w-4 h-4 mr-2" /> Pobierz PDF
              </Button>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
}
