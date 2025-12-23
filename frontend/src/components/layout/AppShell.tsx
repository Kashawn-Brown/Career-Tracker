"use client";

import { Header } from "@/components/layout/Header";

// AppShell: shared layout wrapper for all protected pages.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    // Page-level wrapper for consistent spacing + background
    <div className="min-h-screen bg-background">
      <Header />

      {/* Main content area: centered container with padding */}
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
