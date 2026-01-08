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

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  
  baseResumeUrl: string | null;

  // Profile fields (post-MVP foundation)
  location: string | null;
  currentRole: string | null;
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

  createdAt: string; // JSON-serialized Date from backend
  updatedAt: string; // JSON-serialized Date from backend
};

// UpdateMeRequest: matches backend schema for PATCH /users/me.
export type UpdateMeRequest = {
  name?: string;
  location?: string;
  currentRole?: string;
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
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
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




// --- Applications DTOs, enums and types: matches backend ---
export type ApplicationSortBy = "company" | "position" | "location" | "status" | "jobType" | "workMode" | "dateApplied" | "updatedAt" | "isFavorite";

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
  isFavorite: boolean;

  dateApplied: string | null; // backend returns JSON date strings
  jobLink: string | null;
  description: string | null;
  notes: string | null;
  tagsText: string | null;

  createdAt: string;
  updatedAt: string;
};


export type ApplicationsListResponse = Paginated<Application>;

export type ListApplicationsParams = {
  page: number;
  pageSize: number;

  q?: string;
  status?: "ALL" | ApplicationStatus;

  sortBy?: ApplicationSortBy;
  sortDir?: ApplicationSortDir;

  jobType?: "ALL" | JobType;
  workMode?: "ALL" | WorkMode;

  favoritesOnly?: boolean; // frontend-friendly name
};

// CreateApplicationRequest: matches backend schema for POST /applications.
export type CreateApplicationRequest = {
  company: string;
  position: string;
  status?: ApplicationStatus;

  location?: string;
  locationDetails?: string;

  dateApplied?: string;

  jobType?: JobType;
  jobTypeDetails?: string;

  workMode?: WorkMode;
  workModeDetails?: string;

  salaryText?: string;

  jobLink?: string;
  description?: string;
  notes?: string;
  tagsText?: string;
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
  isFavorite?: boolean;
  jobLink?: string;
  description?: string;
  notes?: string;
  tagsText?: string;
};



// --- Document DTOs: matches backend ---

// Document: minimal document shape returned by backend (BASE_RESUME only for MVP).
export type Document = {
  id: string;
  kind: "BASE_RESUME";
  url: string;
  originalName: string;
  mimeType: string;
  size: number | null;
  createdAt: string; // ISO string from API
  updatedAt: string; // ISO string from API
};

// GetBaseResumeResponse: backend returns { document: Document | null }.
export type GetBaseResumeResponse = {
  document: Document | null;
};

// UpsertBaseResumeRequest: matches backend schema for POST /documents/base-resume.
export type UpsertBaseResumeRequest = {
  url: string;
  originalName: string;
  mimeType: string;
  size?: number;
  storageKey?: string; // future: GCS key (optional in MVP)
};

// UpsertBaseResumeResponse: backend returns { document: Document }.
export type UpsertBaseResumeResponse = {
  document: Document;
};