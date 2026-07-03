"use client";

import { useEffect, useState } from "react";
import { Receipt, ChevronLeft, ChevronRight, Download, FileText } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchInvoices();
  }, [currentDate]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // 1-12
      const res = await fetch(`http://localhost:3001/repair-orders/invoices/list?year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (error) {
      console.error("Failed to fetch invoices", error);
    } finally {
      setIsLoading(false);
    }
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleString('pl-PL', { month: 'long', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full text-xs font-medium border border-zinc-700">Szkic</span>;
      case 'printed':
      case 'sent':
        return <span className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-xs font-medium border border-amber-500/20">Wystawiona</span>;
      case 'paid':
        return <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-medium border border-emerald-500/20">Opłacona</span>;
      default:
        return <span className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full text-xs font-medium border border-zinc-700">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-900 to-blue-900 border-2 border-indigo-500/50 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/20">
            <Receipt className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-600">
              Faktury
            </h1>
            <p className="text-zinc-500 mt-1 flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4" /> Zestawienie faktur wygenerowanych przez aplikację
            </p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-3 bg-zinc-900/80 p-1.5 rounded-full border border-zinc-800">
          <Button onClick={prevMonth} variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-zinc-800 text-zinc-400">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="w-40 text-center font-medium text-zinc-200 capitalize">
            {formatMonth(currentDate)}
          </div>
          <Button onClick={nextMonth} variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-zinc-800 text-zinc-400">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-400 bg-zinc-900/50 uppercase border-b border-zinc-800/50">
              <tr>
                <th className="px-6 py-4 font-medium">Numer / Data</th>
                <th className="px-6 py-4 font-medium">Klient</th>
                <th className="px-6 py-4 font-medium text-right">Kwota Brutto</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    <div className="animate-pulse">Ładowanie faktur...</div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    Brak wygenerowanych faktur w tym miesiącu.
                  </td>
                </tr>
              ) : (
                invoices.map((invData: any) => {
                  const inv = invData.infaktInvoice;
                  const order = invData.repairOrder;
                  return (
                    <tr key={inv.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-zinc-200">{inv.number || `Szkic (${inv.id})`}</div>
                        <div className="text-xs text-zinc-500 mt-1">{inv.invoice_date}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-zinc-300">{inv.client_company_name}</div>
                        <a href={`/orders/${order.id}`} className="text-xs text-indigo-400 hover:underline mt-1 block">
                          Zlecenie #{order.id.substring(0, 8)}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-bold text-emerald-400">{(inv.gross_price / 100).toFixed(2)} PLN</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(inv.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <a 
                          href={`http://localhost:3001/repair-orders/${order.id}/invoice-pdf`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full px-3 py-1.5 inline-flex items-center justify-center text-xs font-medium transition-colors border border-zinc-700"
                        >
                          <Download className="mr-1.5 h-3 w-3" /> PDF
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
