// api.ts: shared API DTO types (keeps frontend aligned with backend response shapes).

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  baseResumeUrl: string | null;
  createdAt: string; // JSON-serialized Date from backend
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
