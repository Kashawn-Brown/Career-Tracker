// routes.ts: centralizes API path strings so pages/components don't hardcode URLs.

/**
 * Centralizes all the app’s URL paths in one place
 * Exposes them as functions so consistent URLs can be generated
 * 
 * e.g. routes.auth.login() = "/auth/login"
 */
export const routes = {
  auth: {
    login: () => "/auth/login",
    register: () => "/auth/register",
  },
  users: {
    me: () => "/users/me",
  },
  applications: {
    list: () => "/applications",
    byId: (id: string) => `/applications/${id}`,
  },
  documents: {
    baseResume: () => "/documents/base-resume",
  },
} as const;
