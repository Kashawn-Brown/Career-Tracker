"use client";

import { AuthProvider } from "@/contexts/AuthContext";

// Providers: client-side wrapper for app-wide providers (Auth, theming later, etc.).
export function Providers({ children }: { children: React.ReactNode }) {    // takes children (whatever you nest inside Providers)

  // Wraps the children with <AuthProvider>, making every page/component under it able to access AuthContext.
  return <AuthProvider>{children}</AuthProvider>;

  // If more providers added later e.g. themes, etc., can easily add it here and wire them all at once.
}
