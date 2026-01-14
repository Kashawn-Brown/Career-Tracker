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

export type DocumentKind = "BASE_RESUME" | "RESUME" | "COVER_LETTER" | "OTHER";

// Document: minimal document shape returned by backend (BASE_RESUME only for MVP).
export type Document = {
  id: number | string;
  kind: DocumentKind;
  url: string | null;
  originalName: string;
  mimeType: string;
  size: number | null | undefined;
  createdAt: string; // JSON-serialized Date from backend
  updatedAt: string; // JSON-serialized Date from backend
};

// GetBaseResumeResponse: backend returns { document: Document | null }.
export type GetBaseResumeResponse = {
  baseResume: Document | null;
};

// UpsertBaseResumeResponse: backend returns { document: Document }.
export type UpsertBaseResumeResponse = {
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


