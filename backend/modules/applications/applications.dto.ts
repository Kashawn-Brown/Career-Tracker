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
  salaryDetails: true,
  isFavorite: true,
  
  jobLink: true,
  description: true,
  notes: true,
  tagsText: true,
  jdSummary: true,

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
  salaryDetails: false,
  isFavorite: true,
  
  jobLink: true,
  description: false,
  notes: false,
  tagsText: false,

  fitScore: true,
  fitUpdatedAt: true,

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
  salaryDetails?: string;
  jobLink?: string;
  description?: string;
  notes?: string;
  tagsText?: string;
  jdSummary?: string;
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
  salaryDetails?: string;
  isFavorite?: boolean;
  jobLink?: string;
  description?: string;
  notes?: string;
  tagsText?: string;
};


export type ListApplicationsParams = {
  userId: string;

  // Text search
  q?: string;

  // Legacy single-value filters (kept for compatibility; plural wins if both present)
  status?:   ApplicationStatus;
  jobType?:  JobType;
  workMode?: WorkMode;

  // Multi-value filters (post-parse arrays)
  statuses?:  ApplicationStatus[];
  jobTypes?:  JobType[];
  workModes?: WorkMode[];

  // Favorites + fit score
  isFavorite?: boolean;
  fitMin?:     number;
  fitMax?:     number;

  // Date range filters (ISO strings)
  dateAppliedFrom?: string;
  dateAppliedTo?:   string;
  updatedFrom?:     string;
  updatedTo?:       string;

  // Pagination
  page?:     number;
  pageSize?: number;

  // Sorting
  sortBy?:  "updatedAt" | "createdAt" | "company" | "position" | "dateApplied" | "isFavorite" | "fitScore";
  sortDir?: "asc" | "desc";
};

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * The exportable column ids for CSV export.
 * Matches the table column ids but excludes UI-only columns (actions).
 * Full description fields (notes, description, jobLink) are excluded from
 * table-style export intentionally.
 */
export const APPLICATION_EXPORT_COLUMNS = [
  "favorite",
  "company",
  "position",
  "location",
  "jobType",
  "salaryText",
  "workMode",
  "status",
  "fitScore",
  "dateApplied",
  "updatedAt",
] as const;

export type ApplicationExportColumn = (typeof APPLICATION_EXPORT_COLUMNS)[number];

/**
 * Params for the export service function.
 * Same filter/sort shape as list but no pagination.
 */
export type ExportApplicationsParams = {
  userId: string;

  // Filters (same as list)
  status?:   ApplicationStatus;
  statuses?: ApplicationStatus[];
  jobType?:  JobType;
  jobTypes?: JobType[];
  workMode?: WorkMode;
  workModes?: WorkMode[];
  isFavorite?: boolean;
  q?: string;
  fitMin?: number;
  fitMax?: number;
  dateAppliedFrom?: string;
  dateAppliedTo?:   string;
  updatedFrom?:     string;
  updatedTo?:       string;

  // Sorting (same as list)
  sortBy?:  ListApplicationsParams["sortBy"];
  sortDir?: ListApplicationsParams["sortDir"];

  // Export-specific
  columns?: ApplicationExportColumn[];
};