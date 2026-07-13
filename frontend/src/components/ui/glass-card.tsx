import { ReactNode } from "react";

export function GlassCard({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:shadow-cyan-500/10 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
