import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";

// AppShell.tsx: shared layout wrapper for authenticated pages (header + centered content).
export function AppShell({ children }: { children: ReactNode }) {
  return (
    // Page-level wrapper for consistent spacing + background
    <div className="min-h-screen bg-muted/30">
      <Header />

      {/* Main content area */}
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
