// api.ts: shared API DTO types (keeps frontend aligned with backend response shapes).


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




// --- Applications DTOs: matches backend applicationSelect + list contract ---

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
