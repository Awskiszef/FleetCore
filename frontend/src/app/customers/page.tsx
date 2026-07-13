"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, User, Phone, Mail, Car, SearchCode, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { apiClient } from "@/lib/api-client";

// Define TypeScript interfaces based on Prisma schema
interface Customer {
  id: string;
  fullName: string;
  companyName?: string;
  email: string;
  phone: string;
  vehicles?: any[];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  
  const { user } = useAuth();
  const canAddCustomer = user?.role === 'ADMIN' || user?.role === 'OWNER' || user?.role === 'RECEPTIONIST';

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");

  // Add Customer Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: "individual",
    firstName: "",
    lastName: "",
    companyName: "",
    nip: "",
    address: "",
    email: "",
    phone: ""
  });
  const [isFetchingNip, setIsFetchingNip] = useState(false);

  const fetchCustomers = async () => {
    try {
      const page = Number(searchParams.get("page")) || 1;
      const search = searchParams.get("search") || "";
      const result = await apiClient.getCustomers({ page, limit: 20, search });
      setCustomers(result.data);
      setPagination({ page: result.page, limit: result.limit, totalPages: result.totalPages });
    } catch (error) {
      toast.error("Nie udało się pobrać bazy klientów.");
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchParams]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    const params = new URLSearchParams(searchParams);
    if (val) {
      params.set("search", val);
    } else {
      params.delete("search");
    }
    params.set("page", "1"); // reset to page 1 on search
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleFetchNip = async () => {
    if (!formData.nip || formData.nip.length < 10) {
      toast.error("Wprowadź prawidłowy NIP (min. 10 znaków).");
      return;
    }
    
    setIsFetchingNip(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/customers/fetch-nip/${formData.nip.replace(/\D/g, '')}`);
      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          companyName: data.name,
          address: data.address
        }));
        toast.success("Dane firmy zostały pobrane pomyślnie.");
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || "Nie udało się pobrać danych z MF.");
      }
    } catch (error) {
      toast.error("Błąd połączenia z serwerem podczas pobierania NIP.");
    } finally {
      setIsFetchingNip(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: `${formData.firstName} ${formData.lastName}`.trim(),
          companyName: (formData.type === "company" || formData.type === "foreign_company") ? formData.companyName : undefined,
          nip: (formData.type === "company" || formData.type === "foreign_company") ? formData.nip : undefined,
          address: formData.address || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
        }),
      });
      
      if (response.ok) {
        setIsDialogOpen(false);
        setFormData({ type: "individual", firstName: "", lastName: "", companyName: "", nip: "", address: "", email: "", phone: "" });
        await fetchCustomers(); // Refresh list
        toast.success("Klient został pomyślnie dodany do bazy.");
      } else {
        toast.error("Wystąpił błąd podczas dodawania klienta.");
      }
    } catch (error) {
      toast.error("Błąd połączenia z serwerem. Czy backend działa?");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
            Klienci
          </h1>
          <p className="text-zinc-400 mt-2 text-lg">Zarządzaj bazą klientów Twojego warsztatu.</p>
        </div>
        
        {canAddCustomer && (
          <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:scale-105 rounded-full px-6 h-10 inline-flex items-center justify-center border-0">
            <Plus className="mr-2 h-4 w-4" /> Nowy Klient
          </Button>
        )}
      </div>

      {/* Main Content Area */}
      <GlassCard className="flex flex-col gap-6 border-white/5">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
          <Input 
            type="text"
            placeholder="Szukaj klienta po nazwisku lub e-mailu..." 
            className="pl-10 bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-cyan-500 rounded-xl"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* Customers Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-800/50">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-xl text-cyan-400">Dodaj klienta</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Wprowadź dane nowego klienta do systemu.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddCustomer}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label className="text-zinc-300">Typ Klienta</Label>
                    <select 
                      className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 text-zinc-100"
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                    >
                      <option value="individual">Osoba prywatna</option>
                      <option value="company">Firma (Polska)</option>
                      <option value="foreign_company">Firma (Zagraniczna)</option>
                    </select>
                  </div>

                  {(formData.type === "company" || formData.type === "foreign_company") && (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="nip" className="text-zinc-300">NIP</Label>
                        <div className="flex gap-2">
                          <Input id="nip" value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" placeholder="np. 1234567890" />
                          {formData.type === "company" && (
                            <Button type="button" onClick={handleFetchNip} disabled={isFetchingNip} className="bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-cyan-500/30 whitespace-nowrap">
                              {isFetchingNip ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchCode className="h-4 w-4 mr-2" />}
                              Pobierz GUS
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="companyName" className="text-zinc-300">Nazwa Firmy</Label>
                        <Input id="companyName" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" />
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="firstName" className="text-zinc-300">Imię</Label>
                      <Input id="firstName" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lastName" className="text-zinc-300">Nazwisko</Label>
                      <Input id="lastName" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" required />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-zinc-300">Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="phone" className="text-zinc-300">Telefon</Label>
                    <Input id="phone" type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="address" className="text-zinc-300">Adres</Label>
                    <Input id="address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" placeholder="Ulica, kod pocztowy, miasto" />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                      Anuluj
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSubmitting} className="bg-cyan-600 hover:bg-cyan-500 text-white border-0">
                    {isSubmitting ? "Zapisywanie..." : "Zapisz Klienta"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase tracking-wider text-xs font-semibold">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl">Klient</th>
                <th className="px-6 py-4">Kontakt</th>
                <th className="px-6 py-4">Flota (Pojazdy)</th>
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
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                    Nie znaleziono klientów spełniających kryteria.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr 
                    key={customer.id} 
                    className="group hover:bg-zinc-800/30 transition-colors duration-200 cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-900/50 to-blue-900/50 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-100">{customer.fullName}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{customer.companyName || "Klient indywidualny"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-zinc-300">
                          <Mail className="h-3.5 w-3.5 text-zinc-500" />
                          <span>{customer.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-300">
                          <Phone className="h-3.5 w-3.5 text-zinc-500" />
                          <span>{customer.phone || "Brak numeru"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {(customer.vehicles || []).map((_, i) => (
                            <div key={i} className="h-8 w-8 rounded-full bg-zinc-800 border-2 border-zinc-950 flex items-center justify-center shadow-sm">
                              <Car className="h-4 w-4 text-zinc-400" />
                            </div>
                          ))}
                        </div>
                        <span className="text-xs font-medium text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-full ml-2">
                          {(customer.vehicles || []).length} szt.
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/customers/${customer.id}`}
                        className="inline-flex h-9 items-center justify-center whitespace-nowrap text-sm font-medium text-zinc-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-full px-4 transition-colors"
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
