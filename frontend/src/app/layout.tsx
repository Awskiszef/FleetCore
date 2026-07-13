import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";

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
        <AuthProvider>
          {/* Sidebar Scaffold */}
          <Sidebar />        {/* Main Content Scaffold */}
          <main className="flex-1 flex flex-col h-screen overflow-hidden">
            <Header />
            <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-background to-secondary/20">
              {children}
            </div>
          </main>
          <Toaster theme="dark" position="bottom-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
