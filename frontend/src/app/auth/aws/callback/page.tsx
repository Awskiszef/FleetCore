"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Cloud } from "lucide-react";

export default function AWSCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [status, setStatus] = useState("Autoryzacja w toku...");
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const hasAttempted = useRef(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    
    if (!code) {
      toast.error("Brak kodu autoryzacyjnego z AWS.");
      router.push("/login");
      return;
    }

    const savedState = sessionStorage.getItem('aws_state');
    const codeVerifier = sessionStorage.getItem('aws_code_verifier');

    if (savedState && state !== savedState) {
      toast.error("Nieprawidłowy stan weryfikacji (CSRF).");
      router.push("/login");
      return;
    }

    if (hasAttempted.current) return;
    hasAttempted.current = true;

    const authenticateAWS = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/auth/aws/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, codeVerifier })
        });

        if (response.ok) {
          const data = await response.json();
          login(data.access_token);
          toast.success("Zalogowano pomyślnie przez AWS SSO!");
          router.push("/");
        } else {
          const err = await response.json().catch(() => ({}));
          // Special handling for unauthorized users from AWS
          if (err.message?.includes('Brak dostępu')) {
            setIsUnauthorized(true);
          } else {
            toast.error(err.message || "Błąd weryfikacji AWS SSO.");
            router.push("/login");
          }
        }
      } catch (e) {
        console.error(e);
        toast.error("Błąd połączenia z serwerem podczas logowania.");
        router.push("/login");
      }
    };

    authenticateAWS();
  }, [searchParams, router, login]);

  if (isUnauthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-950 p-6">
        <div className="max-w-lg w-full bg-red-900 border border-red-700 rounded-2xl p-10 text-center shadow-[0_0_50px_rgba(239,68,68,0.5)]">
          <div className="w-20 h-20 bg-red-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl text-white font-black">!</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-4 uppercase tracking-wider">Odmowa Dostępu</h1>
          <p className="text-red-200 text-2xl font-bold mb-10">
            Sorry cwelu wypierdalaj
          </p>
          <button 
            onClick={() => router.push('/login')}
            className="w-full py-4 px-6 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all uppercase tracking-widest"
          >
            ok wypierdalam
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center justify-center space-y-6 text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-orange-500 blur-xl opacity-20 rounded-full"></div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-full relative z-10 flex items-center justify-center">
            <Cloud className="w-12 h-12 text-orange-500 animate-pulse" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">AWS IAM Identity Center</h2>
          <p className="text-zinc-400 mt-2 flex items-center gap-2 justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}
