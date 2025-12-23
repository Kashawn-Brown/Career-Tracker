import type { ApplicationStatus, Prisma } from "@prisma/client";


// Centralized “public” shapes returned to API clients.
// Keeps Prisma selects consistent and prevents leaking future fields.
export const applicationSelect = {
  id: true,
  userId: false,
  company: true,
  position: true,
  status: true,
  dateApplied: true,
  jobLink: true,
  description: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const;


// Inputs used by the service layer
export type CreateApplicationInput = {
  userId: string;
  company: string;
  position: string;
  status?: ApplicationStatus;
  dateApplied?: string;
  jobLink?: string;
  description?: string;
  notes?: string;
};


export type UpdateApplicationInput = {
  company?: string;
  position?: string;
  status?: ApplicationStatus;
  dateApplied?: string;
  jobLink?: string;
  description?: string;
  notes?: string;
};


export type ListApplicationsParams = {
  userId: string;
  status?: ApplicationStatus;
  q?: string;

  page?: number;
  pageSize?: number;
  sortBy?: "updatedAt" | "createdAt" | "company";
  sortDir?: "asc" | "desc";
}



