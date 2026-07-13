"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Car, User, Clock, CheckCircle2, AlertCircle, Wrench, Wallet, Calendar, Check, X, Image as ImageIcon, Upload, Loader2, FileText, Settings, Trash2, Receipt, Download, Plus, PackagePlus } from "lucide-react";
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
  diagnosis?: string;
  mechanicNotes?: string;
  estimatedCost?: number;
  finalCost?: number;
  laborCost?: number;
  marginPercentage?: number;
  createdAt: string;
  assignedMechanicId?: string;
  assignedMechanic?: { id: string; fullName: string };
  customer?: { id: string; fullName: string; phone?: string; companyName?: string; nip?: string };
  vehicle?: { id: string; make: string; model: string; licensePlate: string; vin: string };
  invoiceId?: string;
  invoiceUrl?: string;
  parts?: Array<{
    id: string;
    quantity: number;
    priceAtUsage: number;
    part: { id: string; name: string; oemNumber?: string };
  }>;
}

export default function RepairOrderProfilePage() {
  const { user } = useAuth();
  const isAdminOrOwner = user?.role === 'ADMIN' || user?.role === 'OWNER';
  const canManageInvoices = isAdminOrOwner || user?.role === 'RECEPTIONIST';
  
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Delete State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Invoice State
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isUpdatingInvoice, setIsUpdatingInvoice] = useState(false);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);

  const [editForm, setEditForm] = useState({
    status: "",
    reportedIssue: "",
    diagnosis: "",
    mechanicNotes: "",
    estimatedCost: "",
    finalCost: "",
    laborCost: "",
    marginPercentage: "",
    assignedMechanicId: ""
  });

  const [mechanics, setMechanics] = useState<any[]>([]);

  // Parts logic
  const [isPartDialogOpen, setIsPartDialogOpen] = useState(false);
  const [inventoryParts, setInventoryParts] = useState<any[]>([]);
  const [selectedPartId, setSelectedPartId] = useState("");
  const [selectedPartQuantity, setSelectedPartQuantity] = useState("1");
  const [isAddingPart, setIsAddingPart] = useState(false);

  const fetchInventory = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/parts`);
      if (res.ok) {
        setInventoryParts(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMechanics = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/users`);
      if (res.ok) {
        const users = await res.json();
        setMechanics(users.filter((u: any) => u.role === 'MECHANIC'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMechanics();
    const fetchOrder = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/repair-orders/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          
          // Check if invoice still exists in inFakt (if we have one)
          if (data.invoiceId) {
            try {
              const checkRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/repair-orders/${params.id}/invoice-check`);
              if (checkRes.ok) {
                const checkData = await checkRes.json();
                if (checkData.updated) {
                  data.invoiceId = null;
                  data.invoiceUrl = null;
                }
              }
            } catch (e) {
              console.error("Failed to check invoice status", e);
            }
          }
          
          setOrder(data);
        } else {
          throw new Error("Failed to fetch order");
        }
      } catch (error) {
        toast.error("Nie udało się pobrać danych zlecenia.");
        setOrder(null);
      } finally {
        setIsLoading(false);
      }
    };
    const fetchAttachments = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/attachments/entity/REPAIR_ORDER/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setAttachments(data);
        }
      } catch (error) {
        console.error("Failed to fetch attachments", error);
      }
    };
    if (params.id) {
      fetchOrder();
      fetchAttachments();
    }
  }, [params.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', 'REPAIR_ORDER');
    formData.append('entityId', params.id as string);

    setIsUploading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/attachments`, {
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

  const openEditDialog = () => {
    if (order) {
      setEditForm({
        status: order.status,
        reportedIssue: order.reportedIssue || "",
        diagnosis: order.diagnosis || "",
        mechanicNotes: order.mechanicNotes || "",
        estimatedCost: order.estimatedCost?.toString() || "",
        finalCost: order.finalCost?.toString() || "",
        laborCost: order.laborCost?.toString() || "",
        marginPercentage: order.marginPercentage?.toString() || "",
        assignedMechanicId: order.assignedMechanicId || ""
      });
      setIsEditDialogOpen(true);
    }
  };

  // Automatically calculate finalCost when labor or margin changes
  useEffect(() => {
    if (order && order.parts) {
      const partsCost = order.parts.reduce((sum, p) => sum + (p.priceAtUsage * p.quantity), 0);
      const labor = parseFloat(editForm.laborCost) || 0;
      const margin = parseFloat(editForm.marginPercentage) || 0;
      
      const newFinal = labor + (partsCost * (1 + margin / 100));
      if (!isNaN(newFinal)) {
        setEditForm(prev => ({ ...prev, finalCost: newFinal.toFixed(2) }));
      }
    }
  }, [editForm.laborCost, editForm.marginPercentage, order]);

  const openAddPartDialog = () => {
    fetchInventory();
    setIsPartDialogOpen(true);
  };

  const handleAddPart = async () => {
    if (!selectedPartId || !selectedPartQuantity) {
      toast.error("Wybierz część i podaj ilość.");
      return;
    }
    setIsAddingPart(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/repair-orders/${params.id}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partId: selectedPartId, quantity: parseInt(selectedPartQuantity) })
      });
      if (res.ok) {
        toast.success("Część dodana do zlecenia.");
        setIsPartDialogOpen(false);
        setSelectedPartId("");
        setSelectedPartQuantity("1");
        // refresh order
        const orderRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/repair-orders/${params.id}`);
        if (orderRes.ok) setOrder(await orderRes.json());
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Błąd podczas dodawania części.");
      }
    } catch (e) {
      toast.error("Błąd serwera.");
    } finally {
      setIsAddingPart(false);
    }
  };

  const handleRemovePart = async (partId: string) => {
    if (!window.confirm("Czy na pewno chcesz usunąć tę część ze zlecenia? Wróci ona do magazynu.")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/repair-orders/${params.id}/parts/${partId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Część usunięta ze zlecenia.");
        const orderRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/repair-orders/${params.id}`);
        if (orderRes.ok) setOrder(await orderRes.json());
      } else {
        toast.error("Błąd podczas usuwania części.");
      }
    } catch (e) {
      toast.error("Błąd serwera.");
    }
  };

  const handleDownloadInvoice = async () => {
    setIsDownloadingInvoice(true);
    toast.info("Pobieranie faktury...", { id: "download-invoice" });
    try {
      // Pobranie pliku z wykorzystaniem api-interceptor, który dołączy nagłówek z JWT
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/repair-orders/${params.id}/invoice-pdf`);
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Faktura_${String(params?.id).substring(0,8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success("Faktura pobrana.", { id: "download-invoice" });
      } else {
        toast.error("Nie udało się pobrać faktury. Serwer odrzucił żądanie.", { id: "download-invoice" });
      }
    } catch (error) {
      console.error(error);
      toast.error("Błąd połączenia podczas pobierania faktury.", { id: "download-invoice" });
    } finally {
      setIsDownloadingInvoice(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/repair-orders/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          estimatedCost: editForm.estimatedCost !== "" ? parseFloat(editForm.estimatedCost) : null,
          finalCost: editForm.finalCost !== "" ? parseFloat(editForm.finalCost) : null,
          laborCost: editForm.laborCost !== "" ? parseFloat(editForm.laborCost) : null,
          marginPercentage: editForm.marginPercentage !== "" ? parseFloat(editForm.marginPercentage) : null,
          assignedMechanicId: editForm.assignedMechanicId || null,
        }),
      });
      if (res.ok) {
        setIsEditDialogOpen(false);
        const updated = await res.json();
        setOrder(updated);
        toast.success("Zlecenie zaktualizowane.");
      } else {
        toast.error("Wystąpił błąd podczas aktualizacji zlecenia.");
      }
    } catch (error) {
      toast.error("Błąd połączenia z serwerem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!window.confirm("Czy na pewno chcesz zakończyć to zlecenie? Zmieni to jego status na COMPLETED.")) return;
    setIsCompleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/repair-orders/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          completedAt: new Date().toISOString()
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrder(updated);
        toast.success("Zlecenie zakończone pomyślnie!");
      } else {
        toast.error("Wystąpił błąd podczas kończenia zlecenia.");
      }
    } catch (error) {
      toast.error("Błąd połączenia z serwerem.");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDeleteOrder = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/repair-orders/${params.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Zlecenie zostało trwale usunięte.");
        router.push("/orders");
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.message?.includes('Foreign key constraint') || res.status === 409) {
          toast.error("Nie można usunąć zlecenia ze względu na powiązane dane.");
        } else {
          toast.error("Wystąpił błąd podczas usuwania zlecenia.");
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

  const handleGenerateInvoice = async () => {
    if (!order?.finalCost) {
      toast.error("Zlecenie musi mieć wpisany koszt końcowy, aby wystawić fakturę.");
      return;
    }
    
    setIsGeneratingInvoice(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/repair-orders/${params.id}/invoice`, {
        method: "POST",
      });
      if (res.ok) {
        const updated = await res.json();
        setOrder(updated);
        toast.success("Faktura w inFakt została pomyślnie utworzona!");
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.message || "Wystąpił błąd podczas generowania faktury.");
      }
    } catch (error) {
      toast.error("Błąd połączenia z serwerem. Czy skonfigurowano klucz w inFakt?");
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleUpdateInvoiceStatus = async (status: string) => {
    setIsUpdatingInvoice(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/repair-orders/${params.id}/invoice-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(`Status faktury zmieniony na: ${status === 'draft' ? 'Szkic' : status === 'printed' ? 'Do zapłaty' : 'Opłacona'}`);
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.message || "Błąd zmiany statusu faktury.");
      }
    } catch (e) {
      toast.error("Błąd serwera.");
    } finally {
      setIsUpdatingInvoice(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-20">
        <div className="animate-pulse text-emerald-500 font-medium text-lg">Ładowanie zlecenia...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl text-red-400">Nie znaleziono zlecenia.</h2>
        <button onClick={() => router.push('/orders')} className="mt-4 bg-zinc-800 px-4 py-2 rounded-lg">Wróć do listy</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Navigation */}
      <div>
        <Link href="/orders" className="inline-flex items-center text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors mb-4 group">
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
          Wróć do listy zleceń
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-900 to-teal-900 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
            <Wrench className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-600 flex items-center gap-4">
              Zlecenie #{order.id.substring(0, 8).toUpperCase()}
              <span className={`text-sm px-3 py-1 rounded-full border shadow-sm ${
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
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm">
              <span className="text-zinc-500 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Utworzono: {new Date(order.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href={`/orders/${order.id}/intake`} className="border border-blue-500/30 text-blue-400 bg-transparent hover:bg-blue-500/10 hover:text-blue-300 transition-colors rounded-full px-4 h-9 inline-flex items-center justify-center text-sm font-medium">
            <CheckCircle2 className="mr-2 h-4 w-4" /> Protokół
          </Link>
          <Link href={`/orders/${order.id}/estimates`} className="border border-amber-500/30 text-amber-400 bg-transparent hover:bg-amber-500/10 hover:text-amber-300 transition-colors rounded-full px-4 h-9 inline-flex items-center justify-center text-sm font-medium">
            <FileText className="mr-2 h-4 w-4" /> Kosztorysy
          </Link>
          <Button onClick={openEditDialog} className="border border-emerald-500/30 text-emerald-400 bg-transparent hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors rounded-full px-4 h-9 inline-flex items-center justify-center text-sm font-medium">
            <Edit className="mr-2 h-4 w-4" /> Edytuj
          </Button>
          
          {(order.customer?.companyName || order.customer?.nip) && canManageInvoices && (
            order.invoiceId ? (
              <div className="flex items-center gap-2">
                <select 
                  onChange={(e) => handleUpdateInvoiceStatus(e.target.value)}
                  disabled={isUpdatingInvoice}
                  className="bg-indigo-900/50 text-indigo-200 border border-indigo-500/30 rounded-full px-3 h-9 text-sm focus-visible:outline-none"
                  defaultValue="draft"
                >
                  <option value="draft" disabled>Zmień status faktury...</option>
                  <option value="draft">Szkic (Draft)</option>
                  <option value="printed">Do zapłaty (Wystawiona)</option>
                  <option value="paid">Opłacona</option>
                </select>
                <Button onClick={handleDownloadInvoice} disabled={isDownloadingInvoice} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full px-4 h-9 inline-flex items-center justify-center text-sm font-medium shadow-lg shadow-indigo-500/20 transition-colors border-0">
                  {isDownloadingInvoice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  {isDownloadingInvoice ? "Pobieranie..." : "Pobierz Fakturę"}
                </Button>
              </div>
            ) : (
              <Button onClick={handleGenerateInvoice} disabled={isGeneratingInvoice} className="bg-indigo-600/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-full px-4 h-9 inline-flex items-center justify-center text-sm font-medium transition-colors">
                {isGeneratingInvoice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
                {isGeneratingInvoice ? "Tworzenie..." : "Wystaw Fakturę (inFakt)"}
              </Button>
            )
          )}

          {isAdminOrOwner && (
            <Button onClick={() => setIsDeleteDialogOpen(true)} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full px-4 h-9 transition-all border border-red-500/20 inline-flex items-center justify-center">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {order.status !== "COMPLETED" && (
            <Button onClick={handleCompleteOrder} disabled={isCompleting} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full px-4 h-9 inline-flex items-center justify-center text-sm font-medium shadow-lg shadow-emerald-500/20 transition-colors border-0">
              <CheckCircle2 className="mr-2 h-4 w-4" /> {isCompleting ? "Zakańczanie..." : "Zakończ Naprawę"}
            </Button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-400">Usuń Zlecenie</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Czy na pewno chcesz usunąć to zlecenie naprawy? Ta operacja jest nieodwracalna.
              Załączone zdjęcia zostaną odpięte.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <DialogClose className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-700 bg-transparent px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
              Anuluj
            </DialogClose>
            <Button type="button" disabled={isDeleting} onClick={handleDeleteOrder} className="bg-red-600 hover:bg-red-500 text-white border-0">
              {isDeleting ? "Usuwanie..." : "Tak, usuń trwale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl text-emerald-400">Edytuj zlecenie</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid gap-2">
              <Label htmlFor="status" className="text-zinc-300">Status</Label>
              <select id="status" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500">
                <option value="NEW">NOWE (NEW)</option>
                <option value="DIAGNOSING">DIAGNOSTYKA (DIAGNOSING)</option>
                <option value="REPAIRING">W TRAKCIE NAPRAWY (REPAIRING)</option>
                <option value="COMPLETED">ZAKOŃCZONE (COMPLETED)</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assignedMechanicId" className="text-zinc-300">Przypisany Mechanik</Label>
              <select id="assignedMechanicId" value={editForm.assignedMechanicId} onChange={e => setEditForm({...editForm, assignedMechanicId: e.target.value})} className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500">
                <option value="">-- Brak / Nieprzypisany --</option>
                {mechanics.map(m => (
                  <option key={m.id} value={m.id}>{m.fullName}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reportedIssue" className="text-zinc-300">Zgłoszony problem</Label>
              <textarea id="reportedIssue" value={editForm.reportedIssue} onChange={e => setEditForm({...editForm, reportedIssue: e.target.value})} className="flex w-full rounded-md px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 text-zinc-100 min-h-[80px]" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="diagnosis" className="text-zinc-300">Diagnoza warsztatu</Label>
              <textarea id="diagnosis" value={editForm.diagnosis} onChange={e => setEditForm({...editForm, diagnosis: e.target.value})} className="flex w-full rounded-md px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 text-zinc-100 min-h-[80px]" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mechanicNotes" className="text-zinc-300">Notatki mechanika / Zakres prac</Label>
              <textarea id="mechanicNotes" value={editForm.mechanicNotes} onChange={e => setEditForm({...editForm, mechanicNotes: e.target.value})} className="flex w-full rounded-md px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 text-zinc-100 min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2 col-span-2 md:col-span-1">
                <Label htmlFor="editEstimatedCost" className="text-zinc-300">Szacowany Koszt (PLN)</Label>
                <Input id="editEstimatedCost" type="number" value={editForm.estimatedCost} onChange={e => setEditForm({...editForm, estimatedCost: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500" />
              </div>
              <div className="grid gap-2 col-span-2 md:col-span-1">
                <Label htmlFor="editLaborCost" className="text-zinc-300">Robocizna (PLN)</Label>
                <Input id="editLaborCost" type="number" value={editForm.laborCost} onChange={e => setEditForm({...editForm, laborCost: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500" />
              </div>
              <div className="grid gap-2 col-span-2 md:col-span-1">
                <Label htmlFor="editMargin" className="text-zinc-300">Marża na częściach (%)</Label>
                <Input id="editMargin" type="number" value={editForm.marginPercentage} onChange={e => setEditForm({...editForm, marginPercentage: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500" placeholder="np. 20" />
              </div>
              <div className="grid gap-2 col-span-2 md:col-span-1">
                <Label htmlFor="editFinalCost" className="text-zinc-300 font-bold text-emerald-400">Koszt Końcowy (PLN)</Label>
                <Input id="editFinalCost" type="number" value={editForm.finalCost} onChange={e => setEditForm({...editForm, finalCost: e.target.value})} className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 focus-visible:ring-emerald-500 font-bold" />
                <span className="text-xs text-zinc-500">Wyliczany automatycznie, ale możesz go nadpisać.</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-700 bg-transparent px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white">
              Anuluj
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} onClick={handleEditSubmit} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0">
              {isSubmitting ? "Zapisywanie..." : "Zapisz Zmiany"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        
        {/* Left Column (Entities) */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          {/* Pojazd Card */}
          <GlassCard className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-zinc-100 border-b border-zinc-800 pb-2 flex items-center gap-2">
              <Car className="w-5 h-5 text-emerald-500" /> Dotyczy Pojazdu
            </h2>
            
            {order.vehicle ? (
              <div className="flex flex-col gap-3 mt-2">
                <div className="font-bold text-zinc-100 text-lg">{order.vehicle.make} {order.vehicle.model}</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">Rejestracja:</span>
                  <span className="font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700 text-zinc-200 shadow-inner font-bold tracking-wider">{order.vehicle.licensePlate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">VIN:</span>
                  <span className="font-mono text-zinc-400 text-xs">{order.vehicle.vin}</span>
                </div>
                <Link href={`/vehicles/${order.vehicle.id}`} className="text-sm text-emerald-400 hover:underline mt-2 inline-flex items-center">
                  Zobacz profil pojazdu &rarr;
                </Link>
              </div>
            ) : (
              <div className="text-zinc-500 italic mt-2">Brak przypisanego pojazdu.</div>
            )}
          </GlassCard>

          {/* Klient Card */}
          <GlassCard className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-zinc-100 border-b border-zinc-800 pb-2 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-500" /> Klient (Zlecający)
            </h2>
            
            {order.customer ? (
              <div className="flex flex-col gap-3 mt-2">
                <div className="font-bold text-zinc-100 text-lg">{order.customer.fullName}</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">Telefon:</span>
                  <span className="font-medium text-zinc-200">{order.customer.phone || "Brak"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">NIP:</span>
                  <span className="font-mono text-zinc-400 text-xs">{order.customer.nip || "-"}</span>
                </div>
                <Link href={`/customers/${order.customer.id}`} className="text-sm text-emerald-400 hover:underline mt-2 inline-flex items-center">
                  Zobacz profil klienta &rarr;
                </Link>
              </div>
            ) : (
              <div className="text-zinc-500 italic mt-2">Brak przypisanego klienta.</div>
            )}
          </GlassCard>

          {/* Mechanik Card */}
          <GlassCard className="flex flex-col gap-4 border-l-4 border-l-amber-500">
            <h2 className="text-xl font-bold text-zinc-100 border-b border-zinc-800 pb-2 flex items-center gap-2">
              <User className="w-5 h-5 text-amber-500" /> Przypisany Mechanik
            </h2>
            
            {order.assignedMechanic ? (
              <div className="flex flex-col gap-3 mt-2">
                <div className="font-bold text-zinc-100 text-lg">{order.assignedMechanic.fullName}</div>
              </div>
            ) : (
              <div className="text-zinc-500 italic mt-2">Brak przypisanego mechanika.</div>
            )}
          </GlassCard>

          {/* Koszty Card */}
          <GlassCard className="flex flex-col gap-4 bg-gradient-to-br from-zinc-950/50 to-emerald-950/20 border-emerald-500/10">
            <h2 className="text-xl font-bold text-zinc-100 border-b border-emerald-900/50 pb-2 flex items-center gap-2">
              Szacowany Koszt
            </h2>
            <div className="text-4xl font-black text-emerald-400 mt-2 tracking-tight">
          {order.estimatedCost ? `${order.estimatedCost.toLocaleString()} PLN` : "---"}
            </div>
          </GlassCard>
        </div>

        {/* Right Column (Details) */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Raport i Zgłoszenie */}
          <GlassCard className="flex flex-col gap-6">
            <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800/50">
              <h3 className="text-sm font-medium text-zinc-500 mb-1">Koszty</h3>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <div className="text-xs text-zinc-500">Robocizna</div>
                  <div className="text-lg text-zinc-300 font-medium">{order.laborCost ? `${order.laborCost} PLN` : 'Nieustalono'}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Marża na częściach</div>
                  <div className="text-lg text-zinc-300 font-medium">{order.marginPercentage ? `${order.marginPercentage}%` : 'Brak'}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Szacowany koszt</div>
                  <div className="text-lg text-zinc-300 font-medium">{order.estimatedCost ? `${order.estimatedCost} PLN` : 'Nieustalono'}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">KOSZT KOŃCOWY</div>
                  <div className="text-2xl font-bold text-emerald-400">{order.finalCost ? `${order.finalCost} PLN` : 'Wycena'}</div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-zinc-400" /> Zgłoszony Problem
              </h3>
              <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 text-zinc-300 leading-relaxed">
                {order.reportedIssue || <span className="text-zinc-600 italic">Brak opisu zgłoszenia.</span>}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-500" /> Diagnoza Warsztatu
              </h3>
              <div className="bg-amber-950/10 p-4 rounded-xl border border-amber-900/30 text-zinc-300 leading-relaxed">
                {order.diagnosis || <span className="text-zinc-600 italic">Diagnoza jeszcze nie została wprowadzona.</span>}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" /> Notatki Mechanika / Zakres Prac
              </h3>
              <div className="bg-blue-950/10 p-4 rounded-xl border border-blue-900/30 text-zinc-300 leading-relaxed whitespace-pre-line">
                {order.mechanicNotes || <span className="text-zinc-600 italic">Brak notatek z przebiegu naprawy.</span>}
              </div>
            </div>

          </GlassCard>

          {/* Parts Usage Section */}
          <GlassCard className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-100 flex items-center">
                <PackagePlus className="mr-3 h-5 w-5 text-cyan-400" /> Użyte Części
              </h2>
              <Button onClick={openAddPartDialog} className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-full px-4 h-9 inline-flex items-center justify-center text-sm font-medium transition-colors">
                <Plus className="mr-2 h-4 w-4" /> Dodaj część
              </Button>
            </div>
            
            <div className="space-y-3">
              {order.parts && order.parts.length > 0 ? (
                order.parts.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                    <div>
                      <div className="font-medium text-zinc-100">{item.part.name}</div>
                      {item.part.oemNumber && <div className="text-xs text-zinc-500 mt-1">OEM: {item.part.oemNumber}</div>}
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <div className="text-sm font-bold text-zinc-300">{item.quantity} szt.</div>
                        <div className="text-xs text-zinc-500">{item.priceAtUsage} PLN/szt</div>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <div className="text-sm font-bold text-emerald-400">{(item.quantity * item.priceAtUsage).toFixed(2)} PLN</div>
                      </div>
                      <Button onClick={() => handleRemovePart(item.part.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full h-8 w-8 p-0 border border-red-500/20">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-zinc-500 text-center py-6 bg-zinc-900/30 rounded-xl border border-zinc-800/30">
                  Brak przypisanych części do tego zlecenia.
                </div>
              )}
              
              {order.parts && order.parts.length > 0 && (
                <div className="flex justify-end p-4 mt-2">
                  <div className="text-right">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Suma części</div>
                    <div className="text-xl font-bold text-zinc-100">
                      {order.parts.reduce((sum, p) => sum + (p.priceAtUsage * p.quantity), 0).toFixed(2)} PLN
                    </div>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Galeria Zdjęć */}
        <GlassCard className="flex flex-col gap-4 mt-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-indigo-500" /> Zdjęcia / Dokumentacja
            </h2>
            <div className="relative">
              <input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <Button size="sm" className="bg-white/5 hover:bg-white/10 text-indigo-400 border border-indigo-500/20 rounded-full h-8 pointer-events-none">
                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Wgraj Zdjęcie
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
            {attachments.length > 0 ? (
              attachments.map((att, idx) => (
                <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/50 hover:border-indigo-500/50 transition-colors">
                  <img src={`${process.env.NEXT_PUBLIC_API_URL || ''}${att.url}`} alt={att.fileName} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <span className="text-[10px] text-zinc-300 truncate">{att.fileName}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-zinc-500 flex flex-col items-center">
                <ImageIcon className="w-12 h-12 mb-3 opacity-20" />
                <p>Brak załączonej dokumentacji zdjęciowej.</p>
                <p className="text-xs mt-1">Kliknij "Wgraj Zdjęcie", aby dodać pierwsze.</p>
              </div>
            )}
          </div>
        </GlassCard>

      </div>
    </div>
  );
}

function Activity(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
