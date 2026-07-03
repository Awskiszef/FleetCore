import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AtlasHC Garage",
  description: "Zaawansowany System Zarządzania Warsztatem i Flotą",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={cn("dark", "font-sans", geist.variable)}>
      <body className={`${inter.className} bg-background text-foreground min-h-screen flex`}>
        {/* Sidebar Scaffold */}
        <Sidebar />        {/* Main Content Scaffold */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-background/50 backdrop-blur-md">
            <div className="font-medium text-lg">Panel Zarządzania</div>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center text-primary font-bold">
                A
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-background to-secondary/20">
            {children}
          </div>
        </main>
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
