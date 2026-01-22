import type { ApplicationStatus, JobType, WorkMode, Prisma } from "@prisma/client";
import { connectionSelect } from "../connections/connections.dto.js";


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

  fitScore: true,
  fitUpdatedAt: true,

  createdAt: true,
  updatedAt: true,
  
} as const;

// Lightweight select for list views (keeps table fast)
export const applicationListSelect = {
  id: true,
  userId: false,
  
  company: true,
  position: true,
  location: true,
  locationDetails: false,
  status: true,
  dateApplied: true,
  
  jobType: true,
  jobTypeDetails: false,
  workMode: true,
  workModeDetails: false,
  salaryText: true,
  isFavorite: true,
  
  jobLink: true,
  description: false,
  notes: false,
  tagsText: false,

  createdAt: true,
  updatedAt: true,
  
} as const;


/**
 * Centralized “public” shapes returned to API clients for connections attached to applications.
 * Keeps Prisma selects consistent and prevents leaking future fields.
 */
export const applicationConnectionSelect = {
  createdAt: true,
  connection: {
    select: connectionSelect,
  },
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



