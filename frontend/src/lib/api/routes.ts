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
    connections: {
      list: (applicationId: string) => `/applications/${applicationId}/connections`,
      create: (applicationId: string, connectionId: string) => `/applications/${applicationId}/connections/${connectionId}`,
      delete: (applicationId: string, connectionId: string) => `/applications/${applicationId}/connections/${connectionId}`,
    },
  },
  documents: {
    baseResume: () => "/documents/base-resume",
    byId: (documentId: number | string) => `/documents/${documentId}`,

    // Get a download URL for a document. (Optional disposition query param for "open in browser" vs "force download")
    download: (
      documentId: number | string,
      opts?: { disposition?: "inline" | "attachment" }
    ) => {
      const base = `/documents/${documentId}/download`;
      const disposition = opts?.disposition;
      return disposition ? `${base}?disposition=${disposition}` : base;
    },
  },
  connections: {
    list: () => "/connections",
    byId: (id: string) => `/connections/${id}`,
    create: () => "/connections",
    update: (id: string) => `/connections/${id}`,
    delete: (id: string) => `/connections/${id}`,
  },

} as const;
