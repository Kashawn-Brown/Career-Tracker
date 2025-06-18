/**
 * Contact Models
 * 
 * Defines TypeScript interfaces and types for contact-related entities.
 * These models represent the structure of contact data used throughout the application.
 * Updated to include standardized error response patterns.
 */

import { Contact, JobConnection, JobApplication } from '@prisma/client';
import { StandardErrorResponse, StandardSuccessResponse } from '../utils/errorResponse.js';

/**
 * Contact with related entities
 */
export type ContactWithRelations = Contact & {
  user?: any; // User relation
  jobConnections?: (JobConnection & {
    jobApplication?: JobApplication;
  })[];
};

/**
 * Filters for listing contacts
 */
export interface ContactListFilters {
  page?: number;
  limit?: number;
  userId?: number;
  search?: string;
  company?: string;
  role?: string;
  connectionType?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasLinkedin?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Request for creating a new contact
 */
export interface CreateContactRequest {
  userId: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  linkedinUrl?: string;
  connectionType?: string;
  notes?: string;
}

/**
 * Request for updating an existing contact
 */
export interface UpdateContactRequest {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  linkedinUrl?: string;
  connectionType?: string;
  notes?: string;
}

/**
 * Repository-level filters for contacts
 */
export interface ContactFilters {
  userId?: number;
  company?: string;
  role?: string;
  connectionType?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasLinkedin?: boolean;
}

// ====================
// SERVICE RESULT TYPES - UPDATED FOR STANDARDIZATION
// ====================

/**
 * Base result interface for all contact operations with standardized error fields
 */
interface BaseContactResult {
  success: boolean;
  statusCode: number;
  message?: string;
  error?: string;
  details?: string[] | Record<string, any>;
  action?: string;
  code?: string;
  context?: {
    operation: string;
    resource?: string;
    resourceId?: string | number;
    userId?: number;
  };
}

/**
 * Result for listing contacts operation
 */
export interface ListContactsResult extends BaseContactResult {
  contacts?: ContactWithRelations[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

/**
 * Result for getting a single contact operation
 */
export interface GetContactResult extends BaseContactResult {
  contact?: ContactWithRelations;
}

/**
 * Result for creating a contact operation
 */
export interface CreateContactResult extends BaseContactResult {
  contact?: ContactWithRelations;
}

/**
 * Result for updating a contact operation
 */
export interface UpdateContactResult extends BaseContactResult {
  contact?: ContactWithRelations;
}

/**
 * Result for deleting a contact operation
 */
export interface DeleteContactResult extends BaseContactResult {
  message?: string;
}

/**
 * Result for contact statistics operation
 */
export interface ContactStatsResult extends BaseContactResult {
  stats?: {
    total: number;
    withEmail: number;
    withPhone: number;
    withLinkedin: number;
    byCompany: Record<string, number>;
    byConnectionType: Record<string, number>;
  };
} 