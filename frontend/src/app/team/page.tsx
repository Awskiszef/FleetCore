"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ShieldAlert, Wrench, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { apiClient } from "@/lib/api-client";

interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
}

const RoleIcon = ({ role }: { role: string }) => {
  switch (role) {
    case "OWNER":
    case "ADMIN":
      return <ShieldAlert className="w-5 h-5 text-red-400" />;
    case "MECHANIC":
      return <Wrench className="w-5 h-5 text-cyan-400" />;
    default:
      return <User className="w-5 h-5 text-zinc-400" />;
  }
};

const RoleLabel = ({ role }: { role: string }) => {
  switch (role) {
    case "OWNER": return "Właściciel";
    case "ADMIN": return "Administrator";
    case "MECHANIC": return "Mechanik";
    case "RECEPTIONIST": return "Recepcja";
    default: return role;
  }
};

export default function TeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "MECHANIC"
  });

  const fetchMembers = async () => {
    try {
      const page = Number(searchParams.get("page")) || 1;
      const res = await apiClient.getUsers({ page, limit: 20 });
      setMembers(res.data);
      setPagination({ page: res.page, limit: res.limit, totalPages: res.totalPages });
    } catch (e) {
      toast.error("Nie udało się pobrać listy zespołu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.replace(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    if (user?.role === "ADMIN" || user?.role === "OWNER") {
      fetchMembers();
    } else {
      setIsLoading(false);
    }
  }, [user, searchParams]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          mustChangePassword: true,
          role: form.role
        }),
      });

      if (res.ok) {
        toast.success("Dodano nowego członka zespołu.");
        setIsDialogOpen(false);
        setForm({ fullName: "", email: "", password: "", role: "MECHANIC" });
        fetchMembers();
      } else {
        toast.error("Błąd podczas dodawania.");
      }
    } catch (e) {
      toast.error("Błąd połączenia.");
    }
  };

  const handleDelete = async (id: string) => {
    if (id === user?.id) {
      toast.error("Nie możesz usunąć samego siebie.");
      return;
    }
    if (!confirm("Czy na pewno usunąć tego pracownika?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/users/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Użytkownik usunięty.");
        fetchMembers();
      }
    } catch (e) {
      toast.error("Błąd usuwania.");
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div></div>;
  }

  if (user?.role !== "ADMIN" && user?.role !== "OWNER") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <GlassCard className="p-8 text-center max-w-md">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Brak dostępu</h2>
          <p className="text-zinc-400">Tylko Administrator lub Właściciel może zarządzać zespołem.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative z-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Mój Zespół</h1>
          <p className="text-zinc-400 mt-1">Zarządzaj dostępami pracowników do systemu</p>
        </div>
        <Button 
          className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Dodaj Pracownika
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map(member => (
          <GlassCard key={member.id} className="p-6 relative group">
            {member.id !== user?.id && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleDelete(member.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <RoleIcon role={member.role} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-zinc-100">{member.fullName}</h3>
                <p className="text-sm text-cyan-400 font-medium"><RoleLabel role={member.role} /></p>
              </div>
            </div>
            <div className="space-y-1 pt-4 border-t border-zinc-800">
              <p className="text-sm text-zinc-400 flex justify-between">
                <span>E-mail:</span>
                <span className="text-zinc-300">{member.email}</span>
              </p>
              <p className="text-sm text-zinc-400 flex justify-between">
                <span>Utworzono:</span>
                <span className="text-zinc-300">{new Date(member.createdAt).toLocaleDateString("pl-PL")}</span>
              </p>
            </div>
          </GlassCard>
        ))}
      </div>
      <PaginationControls 
        page={pagination.page} 
        totalPages={pagination.totalPages} 
        onPageChange={handlePageChange} 
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Nowy Pracownik</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label className="text-zinc-400">Imię i Nazwisko</Label>
              <Input 
                value={form.fullName}
                onChange={e => setForm({...form, fullName: e.target.value})}
                className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-cyan-500"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-zinc-400">Adres E-mail (do logowania)</Label>
              <Input 
                type="email"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-cyan-500"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-zinc-400">Hasło (startowe)</Label>
              <Input 
                type="password"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-cyan-500"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-zinc-400">Rola / Stanowisko</Label>
              <select 
                value={form.role}
                onChange={e => setForm({...form, role: e.target.value})}
                className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <option value="MECHANIC">Mechanik</option>
                <option value="RECEPTIONIST">Recepcjonista</option>
                <option value="ADMIN">Administrator</option>
                <option value="OWNER">Właściciel</option>
              </select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-zinc-400 hover:text-white">
                Anuluj
              </Button>
              <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-black">
                Utwórz Konto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
