"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CarFront, Lock, Mail, Cloud } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`http://${window.location.hostname}:3001/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Witaj, ${data.user.fullName}!`);
        login(data.access_token, data.user);
      } else {
        toast.error("Nieprawidłowy e-mail lub hasło.");
      }
    } catch (err) {
      toast.error("Błąd połączenia z serwerem.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAWSLogin = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/auth/aws/config`);
      const config = await res.json();
      
      const domain = config.domain || "https://twoja-domena.auth.eu-central-1.amazoncognito.com";
      const clientId = config.clientId || "twoj_client_id";
      const redirectUri = config.redirectUri || `http://${window.location.hostname}:3000/auth/aws/callback`;
      
      const loginUrl = `${domain}/login?client_id=${clientId}&response_type=code&scope=email+openid+profile&redirect_uri=${redirectUri}`;
      
      window.location.href = loginUrl;
    } catch (e) {
      toast.error("Nie udało się pobrać konfiguracji AWS. Przekierowuję do testów...");
      window.location.href = `/auth/aws/callback?code=mock_aws_code`;
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
          <h1 className="text-3xl font-bold text-white tracking-tight">AtlasHC Garage</h1>
          <p className="text-zinc-400 mt-2">Zaloguj się do panelu zarządzania</p>
        </div>

        <GlassCard className="p-8 border-white/5 bg-zinc-950/50 backdrop-blur-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-zinc-300">Adres E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-zinc-900/50 border-zinc-800 text-white focus-visible:ring-cyan-500"
                  placeholder="admin@atlashc.pl"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Hasło</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-zinc-900/50 border-zinc-800 text-white focus-visible:ring-cyan-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold text-base py-5 transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]"
              disabled={isLoading || !email || !password}
            >
              {isLoading ? "Logowanie..." : "Zaloguj się"}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-950 px-2 text-zinc-500">
                Lub zaloguj przez
              </span>
            </div>
          </div>

          <Button 
            onClick={handleAWSLogin}
            variant="outline" 
            className="w-full h-12 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-medium"
          >
            <Cloud className="mr-2 h-5 w-5 text-orange-500" />
            AWS IAM (SSO)
          </Button>
        </GlassCard>
      </div>
    </div>
  );
}
