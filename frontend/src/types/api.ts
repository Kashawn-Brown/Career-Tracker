// api.ts: shared API DTO types (keeps frontend aligned with backend response shapes).

export type OkResponse = { ok: true };

// --- Auth + User DTOs: matches backend ---

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  baseResumeUrl: string | null;
  createdAt: string; // JSON-serialized Date from backend
};

// UpdateMeRequest: MVP profile edits (expand later).
export type UpdateMeRequest = {
  name: string;
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




// --- Applications DTOs: matches backend ---

export type ApplicationStatus =
  | "WISHLIST"
  | "APPLIED"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN";

export type Application = {
  id: string;
  company: string;
  position: string;
  status: ApplicationStatus;

  dateApplied: string | null; // backend returns JSON date strings
  jobLink: string | null;
  description: string | null;
  notes: string | null;

  createdAt: string;
  updatedAt: string;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ApplicationsListResponse = Paginated<Application>;

// CreateApplicationRequest: MVP create payload (expand later with optional fields).
export type CreateApplicationRequest = {
  company: string;
  position: string;
  status?: ApplicationStatus;
};

// UpdateApplicationRequest: MVP update payload (status only for now).
export type UpdateApplicationRequest = {
  status: ApplicationStatus;
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