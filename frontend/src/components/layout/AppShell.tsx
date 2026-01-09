"use client";

import { Header } from "@/components/layout/Header";

// AppShell: shared layout wrapper for all protected pages.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    // Page-level wrapper for consistent spacing + background
    <div className="min-h-screen bg-background">
      <Header />

      {/* Main content area: centered container with padding */}
      <main className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
