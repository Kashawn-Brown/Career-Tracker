"use client";

import React, { createContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import { clearToken, getToken, setToken } from "@/lib/auth/token";
import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from "@/types/api";

// Defines what the context will provide
type AuthContextValue = {

  // Current auth state
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean; // tells us we've read from localStorage at least once

  // Auth actions
  login: (input: LoginRequest) => Promise<void>;
  register: (input: RegisterRequest) => Promise<void>;
  logout: () => void;
};

// Creates the context - AuthContext: provides auth state/actions to the whole app.
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate token from localStorage on first client render.
  useEffect(() => {
    // Runs once on mount
    // does not fetch /users/me or validate the token. It just loads it
    const existing = getToken();
    setTokenState(existing);
    setIsHydrated(true);
  }, []);

  // Calls Backend API endpoint "/auth/login" using apiFetch helper
  async function login(input: LoginRequest) {

    const res = await apiFetch<AuthResponse>(routes.auth.login(), {
      method: "POST",
      auth: false,    // Login is public (no Bearer token attached)
      body: input,
    });

    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  }

  // Calls Backend API endpoint "/auth/register" using apiFetch helper
  async function register(input: RegisterRequest) {
    
    const res = await apiFetch<AuthResponse>(routes.auth.register(), {
      method: "POST",
      auth: false,    // Register is public (no Bearer token attached)
      body: input,
    });

    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  }

  // Clears local + in-memory auth state.
  function logout() {
    clearToken();
    setTokenState(null);
    setUser(null);
  }

  // Creates the object passed to the provider
  const value = useMemo<AuthContextValue>(() => {   // useMemo prevents creating a new object on every render unless relevant state changes
    return {
      user,
      token,
      isHydrated,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
    };
  }, [user, token, isHydrated]);

  // Anything under <AuthProvider> in the tree can read auth state/actions via useContext(AuthContext)
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
