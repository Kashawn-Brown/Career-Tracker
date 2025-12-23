"use client";

import { Header } from "@/components/layout/Header";

// AppShell: shared layout wrapper for all protected pages.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-6">{children}</main>
    </div>
  );
}
