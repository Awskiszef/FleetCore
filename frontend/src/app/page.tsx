"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale"; // Or pl if preferred
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("http://localhost:3001/dashboard/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (e) {
        console.error("Failed to fetch dashboard stats", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const {
    activeOrders = 0,
    vehiclesInShop = 0,
    newCustomers = 0,
    monthlyRevenue = 0,
    recentActivity = []
  } = stats || {};

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Aktywne Zlecenia</h3>
          <div className="text-3xl font-bold">{activeOrders}</div>
          <p className="text-xs text-muted-foreground mt-2">
            W trakcie realizacji
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Pojazdy w Warsztacie</h3>
          <div className="text-3xl font-bold">{vehiclesInShop}</div>
          <p className="text-xs text-muted-foreground mt-2">
            Z przypisanymi zleceniami
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Nowi Klienci</h3>
          <div className="text-3xl font-bold">{newCustomers}</div>
          <p className="text-xs text-muted-foreground mt-2">
            Dodani w tym miesiącu
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Miesięczny Przychód</h3>
          <div className="text-3xl font-bold">{monthlyRevenue} PLN</div>
          <p className="text-xs text-muted-foreground mt-2">
            Z zakończonych zleceń
          </p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl border border-border bg-card shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Ostatnia Aktywność</h3>
          <div className="space-y-4">
            {recentActivity.length > 0 ? recentActivity.map((item: any, i: number) => {
              let color = "text-orange-500 bg-orange-500/10"; // PENDING
              if (item.status === "IN_PROGRESS") color = "text-blue-500 bg-blue-500/10";
              if (item.status === "COMPLETED") color = "text-green-500 bg-green-500/10";
              
              const statusPl: any = {
                "NEW": "NOWE", "WAITING": "OCZEKUJE", "DIAGNOSING": "DIAGNOZA",
                "REPAIRING": "W NAPRAWIE", "TESTING": "TESTY", "READY": "GOTOWE",
                "COMPLETED": "ZAKOŃCZONE", "CANCELLED": "ANULOWANE"
              };
              
              return (
                <Link href={`/orders/${item.id}`} key={i} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-border block">
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-sm text-muted-foreground">{item.customer}</div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className={`text-xs px-2 py-1 rounded-full ${color}`}>
                      {statusPl[item.status] || item.status}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
                    </div>
                  </div>
                </Link>
              );
            }) : (
              <div className="text-muted-foreground text-center py-6">Brak aktywności</div>
            )}
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Szybkie Akcje</h3>
          <div className="space-y-3">
            <Link href="/orders" className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all group flex items-center justify-between">
              <span className="font-medium">Nowe Zlecenie Naprawy</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </Link>
            <Link href="/customers" className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all group flex items-center justify-between">
              <span className="font-medium">Dodaj Klienta</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </Link>
            <Link href="/vehicles" className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all group flex items-center justify-between">
              <span className="font-medium">Zarejestruj Pojazd</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
