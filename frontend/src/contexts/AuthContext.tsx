"use client";

import React, { createContext, useEffect, useMemo, useState, useCallback } from "react";
import { apiFetch, setUnauthorizedHandler  } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import { clearToken, getToken, setToken } from "@/lib/auth/token";
import type { MeResponse, AuthResponse, AuthUser, LoginRequest, RegisterRequest } from "@/types/api";

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
  setCurrentUser: (user: AuthUser | null) => void;
  
};

// Creates the context - AuthContext: provides auth state/actions to the whole app.
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * React component function
 * Wraps part of app and supplies shared authentication state and actions (user/token/login/logout) to every component inside it via React Context
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);        // current user in memory
  const [token, setTokenState] = useState<string | null>(null);   // token in memory
  const [isHydrated, setIsHydrated] = useState(false);            // starts false, becomes true after reading localStorage + attempting /users/me

  // Hydrate token from localStorage and (if present) loads the current user via GET /users/me.
  useEffect(() => {   // Runs once on mount
    
    (async () => {

      // Load token
      const existingToken = getToken();
      setTokenState(existingToken);

      // If theres a token, attempt to load user
      if (existingToken) {
        try{
          // Send request to backend to get user info
          const res = await apiFetch<MeResponse>(routes.users.me(), { method: "GET" })
          setUser(res.user)

        } catch {
          // If token is invalid/expired, clear it so not stuck in a broken state.
          clearToken();
          setTokenState(null);
          setUser(null);
        }
      }
      // Token read & attempt to retrieve user = Hydrated
      setIsHydrated(true);
    
    })()
  }, []);

  // Clears local + in-memory auth state.
  function logout() {
    clearToken();
    setTokenState(null);
    setUser(null);
  }

  // Registers what "unauthorized" means for the app: clear auth + return to login.
  useEffect(() => {
    
    // When unauthorized, logout
    setUnauthorizedHandler(() => {
      logout();
    });

    // Cleanup: avoid stale handlers if provider ever unmounts (rare, but good hygiene).
    return () => setUnauthorizedHandler(null);
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


  // setCurrentUser: stable action wrapper so components can depend on it safely.
  const setCurrentUser = useCallback((next: AuthUser | null) => {
    setUser(next);
  }, []);


  // Creates the object passed to the provider (object all the consumers will get)
  const value = useMemo<AuthContextValue>(() => {   // useMemo prevents creating a new object on every render unless relevant state changes
    return {
      user,
      token,
      isHydrated,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
      setCurrentUser,
    };
  }, [user, token, isHydrated, setCurrentUser]);  // Only rebuild the value object if user/token/isHydrated changes

  // Anything under <AuthProvider> in the tree can read auth state/ do actions via useContext(AuthContext)
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
