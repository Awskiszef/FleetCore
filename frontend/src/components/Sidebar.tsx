"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Car, Wrench, Package, Settings, Receipt, CarFront, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const links = [
    { href: "/", label: "Pulpit", icon: LayoutDashboard },
    { href: "/orders", label: "Zlecenia Naprawy", icon: Wrench },
    { href: "/invoices", label: "Faktury", icon: Receipt },
    { href: "/customers", label: "Klienci", icon: Users },
    { href: "/vehicles", label: "Pojazdy", icon: Car },
    { href: "/fleet", label: "Moje Auta", icon: CarFront },
  ];

  if (user?.role !== "RECEPTIONIST") {
    links.push({ href: "/inventory", label: "Magazyn", icon: Package });
  }

  if (user?.role === "ADMIN" || user?.role === "OWNER") {
    links.push({ href: "/team", label: "Zespół", icon: ShieldAlert });
    links.push({ href: "/settings", label: "Ustawienia", icon: Settings });
  }

  return (
    <aside className="w-64 border-r border-border bg-secondary/30 flex-col hidden md:flex backdrop-blur-xl">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
          AtlasHC
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => {
          // Dashboard is special because other routes like /customers should not highlight it
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors font-medium ${
                isActive
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <link.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border text-sm text-muted-foreground">
        v0.1.0-alpha
      </div>
    </aside>
  );
}
