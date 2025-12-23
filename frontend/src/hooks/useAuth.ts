"use client";

import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";

/**
 * useAuth: convenience hook for accessing auth state/actions.
 * 
 * A tiny helper function that lets any component do: 'const auth = useAuth();'
 *      - instead of writing useContext(AuthContext) everywhere.
 * 
 * ctx value is whatever AuthProvider created ({ user, token, login, ... })
 * 
 * @returns ctx (full auth object (user/token/isHydrated/login/logout/etc.))
 */
export function useAuth() {
  const ctx = useContext(AuthContext); // reads the current value from AuthContext

  // If the hook is used somewhere not wrapped by <AuthProvider>, the context value will be null (error will be thrown)
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  
  return ctx;
}
