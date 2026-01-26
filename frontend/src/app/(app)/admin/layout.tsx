import type { ReactNode } from "react";
import { RequireAdmin } from "@/components/auth/RequireAdmin";

// AdminLayout: shared wrapper for admin routes.
// Keeps admin gating centralized for anything under /admin/*
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RequireAdmin>{children}</RequireAdmin>;
}
