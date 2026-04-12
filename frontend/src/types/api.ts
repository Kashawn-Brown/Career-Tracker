// api.ts: shared API DTO types (keeps frontend aligned with backend response shapes).

export type OkResponse = { ok: true };

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

// --- Auth + User DTOs: matches backend ---

export type UserRole = "USER" | "ADMIN";
export type UserPlan = "REGULAR" | "PRO" | "PRO_PLUS";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  emailVerifiedAt: string | null;
  isActive: boolean;
  
  role: UserRole;
  plan: UserPlan;

  baseResumeUrl: string | null;

  // Profile fields (post-MVP foundation)
  location: string | null;
  currentRole: string | null;
  currentCompany: string | null;
  skills: string[];
  linkedInUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;

  // Job search preferences (AI foundation)
  jobSearchTitlesText: string | null;
  jobSearchLocationsText: string | null;
  jobSearchKeywordsText: string | null;
  jobSearchSummary: string | null;
  jobSearchWorkMode: WorkMode;

  // AI access control
  aiFreeUsesUsed: number;

  createdAt: string; // JSON-serialized Date from backend
  updatedAt: string; // JSON-serialized Date from backend
};

// UpdateMeRequest: matches backend schema for PATCH /users/me.
export type UpdateMeRequest = {
  name?: string;
  location?: string;
  currentRole?: string;
  currentCompany?: string;
  skills?: string[];
  linkedInUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  jobSearchTitlesText?: string;
  jobSearchLocationsText?: string;
  jobSearchKeywordsText?: string;
  jobSearchSummary?: string;
  jobSearchWorkMode?: WorkMode;
};

export type MeResponse = { 
  user: AuthUser 
  aiProRequest: AiProRequestSummary | null;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
  csrfToken: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  name: string;
};

export type ChangePasswordRequest = {
  oldPassword: string;
  newPassword: string;
};


export type CsrfResponse = { csrfToken: string | null };
export type RefreshResponse = { token: string; csrfToken: string };

// --- AI Pro Request DTOs: matches backend ---

export type AiProRequestStatus = "PENDING" | "APPROVED" | "DENIED" | "EXPIRED" | "CREDITS_GRANTED";

export type AiProRequestSummary = {
  id: string;
  status: AiProRequestStatus;
  requestedAt: string;
  decidedAt: string | null;
};

export type RequestProBody = {
  note?: string;
};

export type RequestProResponse = {
  ok: true;
  alreadyPro: boolean;
  request: AiProRequestSummary | null;
};


// --- Admin DTOs: matches backend ---

export type AdminProRequestItem = {
  id: string;
  status: AiProRequestStatus;
  note: string | null;
  decisionNote: string | null;
  requestedAt: string;
  decidedAt: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    plan: UserPlan;
  };
};

export type AdminProRequestsListResponse = {
  items: AdminProRequestItem[];
};

export type AdminDecisionBody = {
  decisionNote?: string;
};

export type AdminUserListItem = {
  id:             string;
  email:          string;
  name:           string;
  role:           UserRole;
  plan:           UserPlan;
  isActive:       boolean;
  aiFreeUsesUsed: number;
  createdAt:      string;
  updatedAt:      string;
  lastActiveAt:   string | null;
};

export type AdminUsersListResponse = {
  items:                  AdminUserListItem[];
  page:                   number;
  pageSize:               number;
  total:                  number;
  totalPages:             number;
  pendingProRequestCount: number;
};

export type UpdateUserPlanRequest = {
  plan: UserPlan;
};

export type AdminProRequestEntry = {
  id:           string;
  status:       AiProRequestStatus;
  note:         string | null;
  decisionNote: string | null;
  requestedAt:  string;
  decidedAt:    string | null;
};

export type AdminUserDetail = AdminUserListItem & {
  applicationCount: number;
  connectionCount:  number;
  statusBreakdown:  Record<string, number>;
  proRequests:      AdminProRequestEntry[];
};

export type UpdateUserStatusRequest = {
  isActive: boolean;
};



// --- Applications DTOs, enums and types: matches backend ---
export type ApplicationSortBy = "company" | "position" | "location" | "status" | "jobType" | "workMode" | "dateApplied" | "createdAt" | "updatedAt" | "isFavorite" | "fitScore";

export type ApplicationSortDir = "asc" | "desc";

export type ApplicationStatus = "WISHLIST" | "APPLIED" | "INTERVIEW" | "OFFER" | "REJECTED" | "WITHDRAWN";

export type JobType = "UNKNOWN" | "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP";

export type WorkMode = "UNKNOWN" | "REMOTE" | "HYBRID" | "ONSITE";

export type Application = {
  id: string;
  company: string;
  position: string;
  status: ApplicationStatus;

  location: string | null;
  locationDetails: string | null;

  jobType: JobType;
  jobTypeDetails: string | null;

  workMode: WorkMode;
  workModeDetails: string | null;

  salaryText: string | null;
  salaryDetails: string | null;

  isFavorite: boolean;

  dateApplied: string | null; // backend returns JSON date strings
  jobLink: string | null;
  description: string | null;
  notes: string | null;
  tagsText: string | null;
  // AI-generated role summary from JD extraction; null for manually created applications
  jdSummary: string | null;

  fitScore: number | null;
  fitUpdatedAt: string | null;

  createdAt: string;
  updatedAt: string;
};

export type ApplicationListItem = {
  id: string;
  company: string;
  position: string;
  status: ApplicationStatus;

  location: string | null;

  jobType: JobType;
  workMode: WorkMode;

  salaryText: string | null;
  isFavorite: boolean;

  dateApplied: string | null;
  jobLink: string | null;

  fitScore: number | null;
  fitUpdatedAt: string | null;

  createdAt: string;
  updatedAt: string;
};

export type ApplicationsListResponse = Paginated<ApplicationListItem>;

export type ListApplicationsParams = {
  page:     number;
  pageSize: number;

  q?: string;

  // Multi-value filters (replaces old singular status/jobType/workMode)
  statuses?:  ApplicationStatus[];
  jobTypes?:  JobType[];
  workModes?: WorkMode[];

  sortBy?:  ApplicationSortBy;
  sortDir?: ApplicationSortDir;

  favoritesOnly?: boolean;

  fitMin?: number;
  fitMax?: number;

  // Date range filters (ISO strings sent to backend)
  dateAppliedFrom?: string;
  dateAppliedTo?:   string;
  updatedFrom?:     string;
  updatedTo?:       string;
};

// CreateApplicationRequest: matches backend schema for POST /applications.
export type CreateApplicationRequest = {
  company: string;
  position: string;
  isFavorite?: boolean;
  status?: ApplicationStatus;

  location?: string;
  locationDetails?: string;

  dateApplied?: string;

  jobType?: JobType;
  jobTypeDetails?: string;

  workMode?: WorkMode;
  workModeDetails?: string;

  salaryText?: string;
  salaryDetails?: string;

  jobLink?: string;
  description?: string;
  notes?: string;
  tagsText?: string;
  // AI-generated role summary; only sent when creating from JD extraction
  jdSummary?: string;
};

// UpdateApplicationRequest: matches backend schema for PATCH /applications/{id}.
export type UpdateApplicationRequest = {
  company?: string;
  position?: string;
  status?: ApplicationStatus;
  location?: string;
  locationDetails?: string;
  dateApplied?: string | null; // ISO string or null to clear
  jobType?: JobType;
  jobTypeDetails?: string;
  workMode?: WorkMode;
  workModeDetails?: string;
  salaryText?: string;
  salaryDetails?: string;
  isFavorite?: boolean;
  jobLink?: string;
  description?: string;
  notes?: string;
  tagsText?: string;
};


// CSV export
export type ApplicationExportColumn =
  | "favorite" | "company"  | "position" | "location"
  | "jobType"  | "salaryText" | "workMode" | "status"
  | "fitScore" | "dateApplied" | "updatedAt";

export type ExportApplicationsCsvParams = {
  // Same filters as list — no page/pageSize
  statuses?:  ApplicationStatus[];
  jobTypes?:  JobType[];
  workModes?: WorkMode[];
  isFavorite?: boolean;
  q?: string;
  fitMin?: number;
  fitMax?: number;
  dateAppliedFrom?: string;
  dateAppliedTo?:   string;
  updatedFrom?:     string;
  updatedTo?:       string;

  // Sorting
  sortBy?:  ApplicationSortBy;
  sortDir?: ApplicationSortDir;

  // Export-specific
  columns?: ApplicationExportColumn[];
};


// --- Document DTOs: matches backend ---

export type DocumentKind = "BASE_RESUME" | "RESUME" | "COVER_LETTER" | "OTHER" | "CAREER_HISTORY";

// Document: minimal document shape returned by backend (BASE_RESUME only for MVP).
export type Document = {
  id: number | string;
  kind: DocumentKind;
  url: string | null;
  originalName: string;
  mimeType: string;
  size: number | null | undefined;
  jobApplicationId: string | null | undefined;
  createdAt: string; // JSON-serialized Date from backend
  updatedAt: string; // JSON-serialized Date from backend
};

// GetBaseResumeResponse: backend returns { document: Document | null }.
export type GetBaseResumeResponse = {
  baseResume: Document | null;
};

// UpsertBaseResumeResponse: backend returns { document: Document }.
export type UploadBaseResumeResponse = {
  baseResume: Document;
};

// DeleteBaseResumeResponse: backend returns { ok: true }.
export type DeleteBaseResumeResponse = {
  ok: true;
};

// Application documents
export type ListApplicationDocumentsResponse = {
  documents: Document[];
};

export type UploadApplicationDocumentParams = {
  applicationId: string;
  kind: Exclude<DocumentKind, "BASE_RESUME">;
  file: File;
};

export type UploadApplicationDocumentResponse = {
  document: Document;
};

export type GetDocumentDownloadUrlResponse = {
  downloadUrl: string;
};


// --- Connections DTOs: matches backend ---

export type ConnectionSortBy = "updatedAt" | "createdAt" | "name" | "company" | "title" | "relationship" | "location";

export type ConnectionSortDir = "asc" | "desc";

// Connection: connection shape returned by backend
export type Connection = {
  id: string;
  name: string;
  company: string | null;
  title: string | null;

  email: string | null;
  linkedInUrl: string | null;
  notes: string | null;

  phone: string | null;
  relationship: string | null;
  location: string | null;

  status: boolean | null;

  createdAt: string;
  updatedAt: string;
};

export type CreateConnectionRequest = {
  name: string;
  company?: string | null;
  title?: string | null;

  email?: string | null;
  linkedInUrl?: string | null;
  notes?: string | null;

  phone?: string | null;
  relationship?: string | null;
  location?: string | null;
  status?: boolean | null;
};

export type UpdateConnectionRequest = {
  name?: string;
  company?: string;
  title?: string;

  email?: string | null;
  linkedInUrl?: string | null;
  notes?: string | null;

  phone?: string | null;
  relationship?: string | null;
  location?: string | null;
  status?: boolean | null;
};

export type ListConnectionsParams = {
  q?: string;

  name?: string;
  company?: string;
  relationship?: string;

  status?: boolean;

  page?: number;
  pageSize?: number;

  sortBy?: ConnectionSortBy;
  sortDir?: ConnectionSortDir;
};

export type ListConnectionsResponse = Paginated<Connection>;

// Application <-> Connection
export type ApplicationConnection = Connection & {
  attachedAt: string; // returned by GET /applications/:id/connections
};

export type ListApplicationConnectionsResponse = {
  connections: ApplicationConnection[];
};

export type ConnectionResponse = {
  connection: Connection;
};


// --- AI Artifacts DTOs: matches backend ---

export type AiArtifactKind = "JD_EXTRACT_V1" | "FIT_V1" | "RESUME_ADVICE" | "COVER_LETTER" | "INTERVIEW_PREP";

export type ApplicationDraftExtracted = {
  company?: string;
  position?: string;

  location?: string;
  locationDetails?: string;

  workMode?: WorkMode;
  workModeDetails?: string;

  jobType?: JobType;
  jobTypeDetails?: string;

  salaryText?: string;
  salaryDetails?: string;
  
  jobLink?: string;
  tagsText?: string;

  // Notes the AI extracted from JD (array of bullets)
  notes?: string[];
};

export type ApplicationDraftAi = {
  jdSummary: string;
  warnings?: string[];
};

/**
 * Canonical source metadata returned with every draft response.
 * Carries the cleaned job-posting text so the frontend can store it
 * as the application description regardless of whether the user pasted
 * text or extracted from a URL.
 */
export type DraftSource = {
  mode:            "TEXT" | "LINK";
  canonicalJdText: string;
  sourceUrl?:      string;
};

export type ApplicationDraftResponse = {
  extracted: ApplicationDraftExtracted;
  ai:        ApplicationDraftAi;
  source:    DraftSource;
};


/**
 * Fit v1 payload — v2 shape.
 * Legacy v1 artifacts (pre-v2) are detected via "recommendedEdits" in payload
 * and rendered by FitReportLegacy instead.
 */
export type FitV1Payload = {
  score:       number;    // 0–100 overall fit score
  fitSummary:  string;    // 2–3 sentence narrative shown in the drawer card
  strengths:   string[];  // strongest alignments with this role
  gaps:        string[];  // shortfalls, missing requirements, and risk areas
  roleSignals: string[];  // what the JD is actually prioritising
  prepAreas:   string[];  // what to brush up on before pursuing this role
  // Note: keywordGaps was removed in v2 — use FitReportLegacy for v1 artifacts
};

export type AiArtifact<TPayload = unknown> = {
  id: string;
  userId: string;
  jobApplicationId: string;

  kind: AiArtifactKind;
  payload: TPayload;

  model: string;
  sourceDocumentId: number | null;
  sourceDocumentName: string | null;

  createdAt: string;
};

// ─── Document tool payloads ───────────────────────────────────────────────────

/**
 * Resume advice payload — v2 shape.
 * Legacy v1 artifacts (pre-v2) are detected via "tailoring" in payload
 * and rendered by ResumeAdviceReportLegacy instead.
 */
export type ResumeAdvicePayload = {
  summary:         string;    // 2–3 sentence overall assessment
  strengths:       string[];  // what's working well — lean into these
  improvements:    string[];  // what's weak, vague, or undersold — things to fix
  roleAlignment:   string[];  // role-specific: what to emphasise, shift, or add for this JD
  rewrites:        string[];  // specific directional rewrite suggestions
  keywordsPresent: string[];  // role-relevant keywords already in the resume — keep these
  keywordsMissing: string[];  // role-relevant keywords not found in the resume — worth adding
};

export type CoverLetterPayload = {
  summary:      string;
  draft:        string;
  evidence:     string[];
  notes:        string[];
  placeholders: string[];
};

// ─── Interview Prep payload ───────────────────────────────────────────────────

export type FocusTopicPriority = "HIGH" | "MEDIUM" | "LOW";

export type FocusTopic = {
  topic:    string;
  priority: FocusTopicPriority;
  reason:   string;
};

/**
 * Interview prep payload — shared shape for generic and targeted variants.
 * Contains questions and focus topics only — no model-generated answers.
 */
export type InterviewPrepPayload = {
  summary:               string;
  focusTopics:           FocusTopic[];
  backgroundQuestions:   string[];
  technicalQuestions:    string[];
  behavioralQuestions:   string[];
  situationalQuestions:  string[];
  motivationalQuestions: string[];
  challengeQuestions:    string[];
  questionsToAsk:        string[];
};

// ─── User-scoped AI artifacts (generic tools) ─────────────────────────────────

export type UserAiArtifactKind = "RESUME_ADVICE" | "COVER_LETTER" | "INTERVIEW_PREP";
export type ResumeSource       = "BASE_RESUME" | "UPLOAD";

export type UserAiArtifact<TPayload = unknown> = {
  id:               string;
  userId:           string;
  kind:             UserAiArtifactKind;
  payload:          TPayload;
  model:            string;
  resumeSource:     ResumeSource;
  sourceDocumentId: number | null;
  createdAt:        string;
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export type DateWindow = "1d" | "7d" | "30d" | "1y" | "all";

export type UsageThreshold = "OK" | "WARNING_75" | "WARNING_90" | "BLOCKED";

export type UsageState = {
  plan:         string;
  baseCredits:  number;
  bonusCredits: number;
  totalCredits: number;
  usedCredits:  number;
  remaining:    number;
  percentUsed:  number;
  threshold:    UsageThreshold;
  isBlocked:    boolean;
  resetAt:      string; // ISO date string
};

export type AdminOverviewResponse = {
  users:        { total: number; new: number };
  applications: { total: number; new: number };
  aiRuns: {
    total:       number;
    successful:  number;
    failed:      number;
    successRate: number | null;
  };
  artifacts: {
    targeted: number;
    generic:  number;
    views:    number;
  };
};

export type AiRunSummary = {
  id:            string;
  toolKind:      string;
  scope:         string;
  status:        string;
  errorCategory: string | null;
  errorCode:     string | null;
  errorMessage:  string | null;
  durationMs:    number | null;
  createdAt:     string;
  userId:        string;
  applicationId: string | null;
  user?:         { email: string };
};

export type AdminAiUsageResponse = {
  byTool:    { toolKind: string; count: number; avgDurationMs: number | null }[];
  byScope:   { scope: string;    count: number }[];
  byPlan:    { plan: string | null; count: number }[];
  byStatus:  { status: string;   count: number }[];
  recentFailures: AiRunSummary[];
  topUsers:  { userId: string; email: string; plan: string | null; count: number }[];
};

export type AdminActivityResponse = {
  recentRuns:   AiRunSummary[];
  recentEvents: {
    id:        string;
    eventType: string;
    category:  string;
    createdAt: string;
    userId:    string | null;
    user?:     { email: string } | null;
  }[];
};

export type AdminUserAnalyticsResponse = {
  user: {
    id:              string;
    email:           string;
    plan:            string;
    role:            string;
    isActive:        boolean;
    emailVerifiedAt: string | null;
    createdAt:       string;
    aiFreeUsesUsed:  number;
  };
  applicationCount: number;
  aiRuns: {
    byTool:   { toolKind: string; status: string; count: number }[];
    byStatus: { status: string; count: number }[];
    recent:   Omit<AiRunSummary, "user" | "errorCode" | "errorMessage">[];
  };
  artifacts: {
    targeted:     number;
    generic:      number;
    interactions: number;
  };
  recentEvents: {
    id:        string;
    eventType: string;
    category:  string;
    createdAt: string;
    metadata:  Record<string, unknown> | null;
  }[];
};

export type UserActivityOverviewResponse = {
  applicationCount:    number;
  totalSuccessfulRuns: number;
  byTool:    { toolKind: string; count: number }[];
  artifacts: { targeted: number; generic: number };
  recentRuns: {
    id:            string;
    toolKind:      string;
    scope:         string;
    status:        string;
    durationMs:    number | null;
    createdAt:     string;
    applicationId: string | null;
  }[];
  recentEvents: {
    id:        string;
    eventType: string;
    category:  string;
    createdAt: string;
  }[];
};