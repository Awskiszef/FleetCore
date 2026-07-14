"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CarFront, Lock } from "lucide-react";
import { toast } from "sonner";

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/auth/change-password`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      if (res.ok) {
        const data = await res.json();
        
        if (typeof data.access_token === 'string' && data.access_token.length > 0) {
          localStorage.setItem('token', data.access_token);
          toast.success("Hasło zostało zmienione pomyślnie!");
          // The token is swapped, now we can force a full reload to let AuthContext initialize with the new token
          window.location.href = '/fleet';
        } else {
          toast.error("Błąd uwierzytelnienia: brak prawidłowego tokena po zmianie hasła.");
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.message || "Wystąpił błąd podczas zmiany hasła.");
      }
    } catch (err) {
      toast.error("Błąd połączenia z serwerem.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-cyan-900/20 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-md p-6">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20 mb-4 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            <CarFront className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Zmiana Hasła</h1>
          <p className="text-zinc-400 mt-2 text-center">Ze względów bezpieczeństwa musisz zmienić hasło przed kontynuowaniem.</p>
        </div>

        <GlassCard className="p-8 border-white/5 bg-zinc-950/50 backdrop-blur-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-zinc-300">Stare Hasło</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <Input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="pl-10 bg-zinc-900/50 border-zinc-800 text-white focus-visible:ring-cyan-500"
                  placeholder="Obecne hasło"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Nowe Hasło</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-cyan-500" />
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 bg-zinc-900/50 border-zinc-800 text-white focus-visible:ring-cyan-500"
                  placeholder="Nowe, bezpieczne hasło"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold text-base py-5 transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]"
              disabled={isLoading || !oldPassword || !newPassword}
            >
              {isLoading ? "Zmienianie..." : "Zmień hasło i zaloguj"}
            </Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
