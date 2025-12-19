"use client";

import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";

// useAuth: convenience hook for accessing auth state/actions.
export function useAuth() {
  const ctx = useContext(AuthContext); // reads the current value from AuthContext

  // If the hook is used somewhere not wrapped by <AuthProvider>, the context value will be null (error will be thrown)
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  
  return ctx;
}
