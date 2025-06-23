/**
 * Job Application Models
 * 
 * Defines TypeScript interfaces and types for job application-related entities.
 * These models represent the structure of job application data used throughout the application.
 */

import { JobApplication, Tag, Document, JobConnection, Contact } from '@prisma/client';

/**
 * Job Application with related entities
 */
export type JobApplicationWithRelations = JobApplication & {
  tags?: Tag[];
  documents?: Document[];
  jobConnections?: (JobConnection & {
    contact?: Contact;
  })[];
  user?: any; // User relation
};

/**
 * Filters for listing job applications
 */
export interface JobApplicationListFilters {
  page?: number;
  limit?: number;
  userId?: number;
  
  // Single-value filters (backward compatibility)
  status?: string;
  company?: string;
  position?: string;
  
  // Multi-select filters (new)
  statuses?: string[];
  companies?: string[];
  positions?: string[];
  workArrangements?: string[];
  jobTypes?: string[];
  
  // Other filters
  dateFrom?: string;
  dateTo?: string;
  isStarred?: boolean;
  hasFollowUp?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  compatibilityScoreMin?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Request for creating a new job application
 */
export interface CreateJobApplicationRequest {
  userId: number;
  company: string;
  position: string;
  dateApplied?: string;
  status?: string;
  type?: string;
  salary?: number;
  jobLink?: string;
  compatibilityScore?: number;
  notes?: string;
  isStarred?: boolean;
  followUpDate?: string;
  deadline?: string;
  workArrangement?: string;
  description?: string;
  tags?: string[];
}

/**
 * Request for updating an existing job application
 */
export interface UpdateJobApplicationRequest {
  company?: string;
  position?: string;
  dateApplied?: string;
  status?: string;
  type?: string;
  salary?: number;
  jobLink?: string;
  compatibilityScore?: number;
  notes?: string;
  isStarred?: boolean;
  followUpDate?: string;
  deadline?: string;
  workArrangement?: string;
  description?: string;
  tags?: string[];
}

/**
 * Repository-level filters for job applications (with Date objects)
 */
export interface JobApplicationFilters {
  userId?: number;
  
  // Single-value filters (backward compatibility)
  status?: string;
  company?: string;
  position?: string;
  
  // Multi-select filters (new)
  statuses?: string[];
  companies?: string[];
  positions?: string[];
  workArrangements?: string[];
  jobTypes?: string[];
  
  // Other filters
  dateFrom?: Date;
  dateTo?: Date;
  isStarred?: boolean;
  hasFollowUp?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  compatibilityScoreMin?: number;
}

// === SERVICE RESULT TYPES (Auth-style pattern) ===

/**
 * Base result interface for all job application service operations
 */
interface BaseJobApplicationResult {
  success: boolean;
  statusCode: number;
  error?: string;
  message?: string;
}

/**
 * Result for listing job applications
 */
export interface ListJobApplicationsResult extends BaseJobApplicationResult {
  data?: {
    jobApplications: JobApplicationWithRelations[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

/**
 * Result for getting a single job application
 */
export interface GetJobApplicationResult extends BaseJobApplicationResult {
  jobApplication?: JobApplicationWithRelations;
}

/**
 * Result for creating a job application
 */
export interface CreateJobApplicationResult extends BaseJobApplicationResult {
  jobApplication?: JobApplicationWithRelations;
}

/**
 * Result for updating a job application
 */
export interface UpdateJobApplicationResult extends BaseJobApplicationResult {
  jobApplication?: JobApplicationWithRelations;
}

/**
 * Result for deleting a job application
 */
export interface DeleteJobApplicationResult extends BaseJobApplicationResult {
  deletedId?: number;
}

/**
 * Result for authorization checks
 */
export interface AuthorizationResult extends BaseJobApplicationResult {
  jobApplication?: JobApplicationWithRelations;
} 