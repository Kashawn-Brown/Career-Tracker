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
  status?: string;
  company?: string;
  position?: string;
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
  tags?: string[];
}

/**
 * Repository-level filters for job applications (with Date objects)
 */
export interface JobApplicationFilters {
  userId?: number;
  status?: string;
  company?: string;
  position?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isStarred?: boolean;
  hasFollowUp?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  compatibilityScoreMin?: number;
} 