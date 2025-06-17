/**
 * Job Connection Models
 * 
 * Defines TypeScript interfaces and types for job connection-related entities.
 * These models represent the structure of job connection data used throughout the application.
 */

import { JobConnection, Contact, JobApplication } from '@prisma/client';

/**
 * Job Connection with related entities
 */
export type JobConnectionWithRelations = JobConnection & {
  contact?: Contact;
  jobApplication?: JobApplication;
};

/**
 * Filters for listing job connections
 */
export interface JobConnectionListFilters {
  page?: number;
  limit?: number;
  jobApplicationId?: number;
  userId?: number; // For filtering by user through job application
  status?: string;
  connectionType?: string;
  hasContact?: boolean;
  contactedAfter?: string;
  contactedBefore?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Request for creating a new job connection
 */
export interface CreateJobConnectionRequest {
  jobApplicationId: number;
  contactId?: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  connectionType: string;
  status?: string;
  notes?: string;
}

/**
 * Request for updating an existing job connection
 */
export interface UpdateJobConnectionRequest {
  contactId?: number;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  connectionType?: string;
  status?: string;
  notes?: string;
  contactedAt?: string;
}

/**
 * Request for updating job connection status
 */
export interface UpdateJobConnectionStatusRequest {
  status: string;
  contactedAt?: string;
  notes?: string;
}

/**
 * Repository-level filters for job connections (with Date objects)
 */
export interface JobConnectionFilters {
  jobApplicationId?: number;
  contactId?: number;
  connectionType?: string;
  status?: string;
  hasContact?: boolean;
  contactedAfter?: Date;
  contactedBefore?: Date;
}

// Service Result Types (following auth pattern)

/**
 * Base service result interface
 */
interface BaseServiceResult {
  success: boolean;
  statusCode: number;
  error?: string;
  message?: string;
}

/**
 * Result for listing job connections
 */
export interface ListJobConnectionsResult extends BaseServiceResult {
  data?: {
    jobConnections: JobConnectionWithRelations[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

/**
 * Result for getting a single job connection
 */
export interface GetJobConnectionResult extends BaseServiceResult {
  jobConnection?: JobConnectionWithRelations;
}

/**
 * Result for creating a job connection
 */
export interface CreateJobConnectionResult extends BaseServiceResult {
  jobConnection?: JobConnectionWithRelations;
}

/**
 * Result for updating a job connection
 */
export interface UpdateJobConnectionResult extends BaseServiceResult {
  jobConnection?: JobConnectionWithRelations;
}

/**
 * Result for deleting a job connection
 */
export interface DeleteJobConnectionResult extends BaseServiceResult {
  message?: string;
} 