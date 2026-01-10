// routes.ts: centralizes API path strings so pages/components don't hardcode URLs.

/**
 * Centralizes all the app’s URL paths in one place
 * Exposes them as functions so consistent URLs can be generated
 * 
 * e.g. routes.auth.login() = "/auth/login"
 */
export const routes = {
  auth: {
    me: () => "/auth/me",
    login: () => "/auth/login",
    register: () => "/auth/register",
  },
  users: {
    me: () => "/users/me",
  },
  applications: {
    list: () => "/applications",
    create: () => "/applications",
    byId: (id: string) => `/applications/${id}`,

    documents: {
      list: (applicationId: string) => `/applications/${applicationId}/documents`,
      upload: (applicationId: string, kind: string) =>
        `/applications/${applicationId}/documents?kind=${encodeURIComponent(kind)}`,
    },
  },
  documents: {
    baseResume: () => "/documents/base-resume",

    download: (documentId: number | string) => `/documents/${documentId}/download`,
    byId: (documentId: number | string) => `/documents/${documentId}`,
  },
} as const;
