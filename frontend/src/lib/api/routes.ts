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

    oauthGoogleStart: () => "/auth/oauth/google/start",
    oauthGoogleCallback: () => "/auth/oauth/google/callback",

    verifyEmail: () => "/auth/verify-email",
    resendVerification: () => "/auth/resend-verification",
    forgotPassword: () => "/auth/forgot-password",
    resetPassword: () => "/auth/reset-password",
  },
  plan: {
    request: () => "/plan/request",
  },
  analytics: {
    adminOverview:      (window?: string) => `/analytics/admin/overview${window ? `?window=${window}` : ""}`,
    adminAi:            (window?: string) => `/analytics/admin/ai${window ? `?window=${window}` : ""}`,
    adminActivity:      ()                => "/analytics/admin/activity",
    adminUserAnalytics: (userId: string, window?: string) => `/analytics/admin/users/${userId}${window ? `?window=${window}` : ""}`,
    meOverview:         (window?: string) => `/analytics/me/overview${window ? `?window=${window}` : ""}`,
    meUsage:            () => "/analytics/me/usage",
  },
  admin: {
    declineRequest:   (userId: string, requestId: string) => `/admin/users/${userId}/requests/${requestId}/decline`,
    updateUserPlan:   (userId: string) => `/admin/users/${userId}/plan`,
    listUsers:        () => "/admin/users",
    getUserDetail:    (userId: string) => `/admin/users/${userId}`,
    updateUserStatus: (userId: string) => `/admin/users/${userId}/status`,
    getUserUsage:     (userId: string) => `/admin/users/${userId}/usage`,
    addUserCredits:   (userId: string) => `/admin/users/${userId}/credits/add`,
    resetUserCredits: (userId: string) => `/admin/users/${userId}/credits/reset`,
  },
  users: {
    me: () => "/users/me",

    changePassword: () => "/users/change-password",

    deactivate: () => "/users/deactivate",

    delete: () => "/users/delete",
  },
  applications: {
    list: () => "/applications",

    exportCsv: () => "/applications/export.csv",
    
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
    baseResume:      () => "/documents/base-resume",
    baseCoverLetter: () => "/documents/base-cover-letter",
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
    applicationFromJd:   () => "/ai/application-from-jd",
    applicationFromLink: () => "/ai/application-from-link",
    resumeHelp:          () => "/ai/resume-help",
    coverLetterHelp:     () => "/ai/cover-letter-help",
    interviewPrep:       () => "/ai/interview-prep",
  },
  userAiArtifacts: {
    list: (args?: { kind?: string }) => {
      const base = "/user-ai-artifacts";
      if (args?.kind) return `${base}?kind=${encodeURIComponent(args.kind)}`;
      return base;
    },
    delete: (id: string) => `/user-ai-artifacts/${id}`,
  },

} as const;