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

    csrf: () => "/auth/csrf",
    refresh: () => "/auth/refresh",
    logout: () => "/auth/logout",

    verifyEmail: () => "/auth/verify-email",
    resendVerification: () => "/auth/resend-verification",
    forgotPassword: () => "/auth/forgot-password",
    resetPassword: () => "/auth/reset-password",
  },
  pro: {
    request: () => "/pro/request",
  },
  admin: {
    listProRequests: () => "/admin/pro-requests",
    approveProRequest: (requestId: string) => `/admin/pro-requests/${requestId}/approve`,
    denyProRequest: (requestId: string) => `/admin/pro-requests/${requestId}/deny`,
    grantCredits: (requestId: string) => `/admin/pro-requests/${requestId}/grant-credits`,
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

    aiArtifacts: {
      list: (
        applicationId: string,
        args?: { kind?: string; all?: boolean }
      ) => {
        const base = `/applications/${applicationId}/ai-artifacts`;
    
        const params = new URLSearchParams();
        if (args?.kind) params.set("kind", args.kind);
        if (args?.all) params.set("all", "true");
    
        const queryString = params.toString();
        return queryString ? `${base}?${queryString}` : base;
      },
    
      create: (applicationId: string) => `/applications/${applicationId}/ai-artifacts`,
    }
  },
  documents: {
    baseResume: () => "/documents/base-resume",
    byId: (documentId: number | string) => `/documents/${documentId}`,

    // Get a download URL for a document. (Optional disposition query param for "open in browser" vs "force download")
    download: (
      documentId: number | string,
      args?: { disposition?: "inline" | "attachment" }
    ) => {
      const base = `/documents/${documentId}/download`;
      const disposition = args?.disposition;
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
  ai: {
    applicationFromJd: () => "/ai/application-from-jd",
  },

} as const;
