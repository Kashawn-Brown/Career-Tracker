import type { ApplicationStatus, JobType, WorkMode, Prisma } from "@prisma/client";


// Centralized “public” shapes returned to API clients.
// Keeps Prisma selects consistent and prevents leaking future fields.
export const applicationSelect = {
  id: true,
  userId: false,
  company: true,
  position: true,
  location: true,
  locationDetails: true,
  status: true,
  dateApplied: true,
  
  jobType: true,
  jobTypeDetails: true,
  workMode: true,
  workModeDetails: true,
  salaryText: true,
  isFavorite: true,
  
  jobLink: true,
  description: true,
  notes: true,
  tagsText: true,

  createdAt: true,
  updatedAt: true,
  
} as const;


// Inputs used by the service layer
export type CreateApplicationInput = {
  userId: string;
  company: string;
  position: string;
  isFavorite?: boolean;
  location?: string;
  locationDetails?: string;
  status?: ApplicationStatus;
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


export type UpdateApplicationInput = {
  company?: string;
  position?: string;
  location?: string;
  locationDetails?: string;
  status?: ApplicationStatus;
  dateApplied?: string | null;
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


export type ListApplicationsParams = {
  userId: string;
  status?: ApplicationStatus;
  q?: string;
  jobType?: JobType;
  workMode?: WorkMode;
  isFavorite?: boolean;

  page?: number;
  pageSize?: number;
  sortBy?: "updatedAt" | "createdAt" | "company" | "position" | "location" | "status" | "dateApplied" | "jobType" | "workMode" | "salaryText" | "isFavorite";
  sortDir?: "asc" | "desc";
}



