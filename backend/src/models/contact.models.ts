/**
 * Contact Models
 * 
 * Defines TypeScript interfaces and types for contact-related entities.
 * These models represent the structure of contact data used throughout the application.
 */

import { Contact, JobConnection, JobApplication } from '@prisma/client';

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