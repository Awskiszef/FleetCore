"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-background/50 backdrop-blur-md">
      <div className="font-medium text-lg">Panel Zarządzania</div>
      {user && (
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-zinc-100">{user.fullName || user.email}</span>
            <span className="text-xs text-cyan-400 font-semibold">{user.role}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-bold uppercase">
            {(user.fullName || user.email || "?").charAt(0)}
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10 ml-2">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      )}
    </header>
  );
}
