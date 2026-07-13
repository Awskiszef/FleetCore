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
