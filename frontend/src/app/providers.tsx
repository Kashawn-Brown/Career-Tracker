"use client";

import { AuthProvider } from "@/contexts/AuthContext";

// Providers: client-side wrapper for app-wide providers (Auth, theming later, etc.).
export function Providers({ children }: { children: React.ReactNode }) {    // takes children (whatever you nest inside it)

  // wraps those children with <AuthProvider>, making AuthContext available to the whole subtree
  return <AuthProvider>{children}</AuthProvider>;
}
