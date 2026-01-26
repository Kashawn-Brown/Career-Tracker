"use client";

import React, { createContext, useEffect, useMemo, useState, useCallback } from "react";
import { apiFetch, setUnauthorizedHandler, setEmailNotVerifiedHandler } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import { clearToken, setToken } from "@/lib/auth/token";
import { clearCsrfToken, getCsrfToken as getCsrfTokenFromMemory, setCsrfToken as setCsrfTokenInMemory } from "@/lib/auth/csrf";
import type { MeResponse, AuthResponse, AuthUser, LoginRequest, RegisterRequest, CsrfResponse, RefreshResponse, OkResponse, AiProRequestSummary } from "@/types/api";

// Defines what the context will provide
type AuthContextValue = {

  // Current auth state
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean; // tells us we've completed the initial session bootstrap check (csrf -> refresh)

  // Auth actions
  login: (input: LoginRequest) => Promise<void>;
  register: (input: RegisterRequest) => Promise<void>;
  logout: () => void;
  setCurrentUser: (user: AuthUser | null) => void;


  aiProRequest: AiProRequestSummary | null;
  setAiProRequest: (aiProRequest: AiProRequestSummary | null) => void;
  refreshMe: () => Promise<void>;
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
  const [csrfToken, setCsrfToken] = useState<string | null>(null); // csrf token in memory
  const [isHydrated, setIsHydrated] = useState(false);            // starts false, becomes true after completing the initial session bootstrap check (csrf -> refresh)

  const [aiProRequest, setAiProRequest] = useState<AiProRequestSummary | null>(null);


  // Bootstrap session on app load using refresh cookie and CSRF token:
  // GET /auth/csrf -> POST /auth/refresh -> GET /users/me
  useEffect(() => {
    (async () => {
      try {

        // Get the CSRF token
        const csrfRes = await apiFetch<CsrfResponse>(routes.auth.csrf(), {
          method: "GET",
          auth: false,
          credentials: "include",
        });

        // If no CSRF token present, we're done
        if (!csrfRes.csrfToken) {
          setIsHydrated(true);
          return;
        }

        // Store bootstrap CSRF (will be rotated on refresh)
        setCsrfToken(csrfRes.csrfToken);
        setCsrfTokenInMemory(csrfRes.csrfToken);

        // Refresh the session
        const refreshRes = await apiFetch<RefreshResponse>(routes.auth.refresh(), {
          method: "POST",
          auth: false,
          credentials: "include",
          headers: { "X-CSRF-Token": csrfRes.csrfToken },
          // No body needed (backend accepts empty), keep request minmal.
        });

        setToken(refreshRes.token);
        setTokenState(refreshRes.token);
        setCsrfToken(refreshRes.csrfToken);
        setCsrfTokenInMemory(refreshRes.csrfToken);

        const meRes = await apiFetch<MeResponse>(routes.users.me(), { method: "GET" });
        setUser(meRes.user);
        setAiProRequest(meRes.aiProRequest);
      } catch {
        // If refresh fails, ensure we start clean
        clearToken();
        setTokenState(null);
        setUser(null);
        setCsrfToken(null);
        clearCsrfToken();
      } finally {
        setIsHydrated(true);
      }
    })();
  }, []);


  // Clears local + in-memory auth state and csrf token.
  const logout = useCallback(() => {
    (async () => {
      try {
        let csrf = getCsrfTokenFromMemory() ?? csrfToken;

        // If csrf isn't in memory (page reload), bootstrap it from the refresh cookie.
        if (!csrf) {
          const res = await apiFetch<CsrfResponse>(routes.auth.csrf(), {
            method: "GET",
            auth: false,
            credentials: "include",
          });
          csrf = res.csrfToken;
          setCsrfToken(csrf);
          setCsrfTokenInMemory(csrf);
        }

        // If CSRF token is present, logout
        if (csrf) {
          await apiFetch<OkResponse>(routes.auth.logout(), {
            method: "POST",
            auth: false,
            credentials: "include",
            headers: { "X-CSRF-Token": csrf },
          });
        }
      } catch {
        // Even if server logout fails, still clear local auth.
      }

      clearToken();
      setTokenState(null);
      setUser(null);
      setCsrfToken(null);
      clearCsrfToken();
      setAiProRequest(null);
    })();
  }, [csrfToken]);

  // Registers what "unauthorized" means for the app: clear auth + return to login.
  useEffect(() => {
    
    // When unauthorized, logout
    setUnauthorizedHandler(() => {
      logout();
    });

    // Cleanup: avoid stale handlers if provider ever unmounts (rare, but good hygiene).
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Defines what "email not verified" means for the app: keep session, redirect to verify-required.
  useEffect(() => {
    setEmailNotVerifiedHandler(() => {
      // Avoid redirect loops if we're already there.
      if (typeof window !== "undefined" && window.location.pathname !== "/verify-required") {
        window.location.assign("/verify-required");
      }
    });

    return () => setEmailNotVerifiedHandler(null);
  }, []);


  // Calls Backend API endpoint "/auth/login" using apiFetch helper
  const login = useCallback(async (input: LoginRequest) => {

    const res = await apiFetch<AuthResponse>(routes.auth.login(), {
      method: "POST",
      auth: false,    // Login is public (no Bearer token attached)
      credentials: "include",   // Include cookies in the request
      body: input,
    });

    setToken(res.token);
    setTokenState(res.token);
    setCsrfToken(res.csrfToken);
    setCsrfTokenInMemory(res.csrfToken);
    setUser(res.user);
    setAiProRequest(null);
  }, []);


  // Calls Backend API endpoint "/auth/register" using apiFetch helper
  const register = useCallback(async (input: RegisterRequest) => {
    
    const res = await apiFetch<AuthResponse>(routes.auth.register(), {
      method: "POST",
      auth: false,    // Register is public (no Bearer token attached)
      credentials: "include",   // Include cookies in the request
      body: input,
    });

    setToken(res.token);
    setTokenState(res.token);
    setCsrfToken(res.csrfToken);
    setCsrfTokenInMemory(res.csrfToken);
    setUser(res.user);
    setAiProRequest(null);
  }, []);


  // setCurrentUser: stable action wrapper so components can depend on it safely.
  const setCurrentUser = useCallback((next: AuthUser | null) => {
    setUser(next);
  }, []);

  // Refreshes the user and AI Pro request.
  const refreshMe = useCallback(async () => {
    const meRes = await apiFetch<MeResponse>(routes.users.me(), { method: "GET" });
    setUser(meRes.user);
    setAiProRequest(meRes.aiProRequest);
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
      aiProRequest,
      setAiProRequest,
      refreshMe,
    };
  }, [user, token, isHydrated, login, register, logout, setCurrentUser, aiProRequest, setAiProRequest, refreshMe]);  // Only rebuild the value object if user/token/isHydrated changes

  // Anything under <AuthProvider> in the tree can read auth state/ do actions via useContext(AuthContext)
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
