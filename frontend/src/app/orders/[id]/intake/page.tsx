"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, CheckCircle2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function IntakeProtocolPage() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [intake, setIntake] = useState<any>(null);

  const [formData, setFormData] = useState({
    mileage: "",
    fuelLevel: "50",
    damages: "",
    equipment: "",
  });

  const fetchIntake = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/intakes/repair-order/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setIntake(data);
          setFormData({
            mileage: data.mileage?.toString() || "",
            fuelLevel: data.fuelLevel?.toString() || "50",
            damages: data.damages || "",
            equipment: data.equipment || "",
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntake();
  }, [params.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In this simple flow, we assume POST is enough or handle it on backend if exists.
      // But we just use POST in our controller. If it exists, backend should handle it or we use PATCH.
      // Since I didn't add update in backend IntakesController, let's just do POST and if it fails, maybe show error.
      // Actually we should just allow POST once.
      
      if (intake) {
        toast.info("Protokół został już utworzony. Opcja edycji wkrótce.");
        setIsSaving(false);
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/intakes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repairOrderId: params.id,
          mileage: parseInt(formData.mileage) || undefined,
          fuelLevel: parseInt(formData.fuelLevel),
          damages: formData.damages,
          equipment: formData.equipment,
        })
      });

      if (res.ok) {
        toast.success("Protokół przyjęcia zapisany.");
        fetchIntake();
      } else {
        toast.error("Błąd zapisu.");
      }
    } catch (e) {
      toast.error("Błąd połączenia.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-10 text-center animate-pulse text-zinc-500">Ładowanie protokołu...</div>;

  return (
    <div className="flex flex-col gap-6 p-6 md:p-10 max-w-4xl mx-auto w-full">
      <Link href={`/orders/${params.id}`} className="text-zinc-400 hover:text-white flex items-center gap-2 w-fit mb-4">
        <ArrowLeft className="w-4 h-4" /> Wróć do zlecenia
      </Link>

      <div>
        <h1 className="text-3xl font-extrabold text-blue-400">Protokół Przyjęcia Pojazdu</h1>
        <p className="text-zinc-400 mt-2">Zanotuj stan pojazdu w momencie przekazania go do serwisu.</p>
      </div>

      <GlassCard className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="grid gap-2">
            <Label className="text-zinc-300">Przebieg (km)</Label>
            <Input type="number" value={formData.mileage} onChange={e => setFormData({...formData, mileage: e.target.value})} className="bg-zinc-900 border-zinc-800" disabled={!!intake} />
          </div>
          <div className="grid gap-2">
            <Label className="text-zinc-300">Poziom Paliwa ({formData.fuelLevel}%)</Label>
            <input type="range" min="0" max="100" step="5" value={formData.fuelLevel} onChange={e => setFormData({...formData, fuelLevel: e.target.value})} className="w-full accent-blue-500 mt-2" disabled={!!intake} />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label className="text-zinc-300">Uszkodzenia zewnętrzne (rysy, wgniecenia)</Label>
            <textarea value={formData.damages} onChange={e => setFormData({...formData, damages: e.target.value})} className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]" disabled={!!intake} />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label className="text-zinc-300">Pozostawione wyposażenie (np. dowód rejestracyjny, fotelik)</Label>
            <textarea value={formData.equipment} onChange={e => setFormData({...formData, equipment: e.target.value})} className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]" disabled={!!intake} />
          </div>
        </div>

        {!intake ? (
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-500 text-white self-end w-full md:w-auto">
            {isSaving ? "Zapisywanie..." : <><Save className="w-4 h-4 mr-2" /> Zapisz Protokół</>}
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20 justify-center">
            <CheckCircle2 className="w-5 h-5" /> Protokół został pomyślnie zapisany
          </div>
        )}
      </GlassCard>
    </div>
  );
}
