/**
 * Tag Models
 * 
 * Defines TypeScript interfaces and types for tag-related entities.
 * These models represent the structure of tag data used throughout the application.
 * Updated for many-to-many relationship between tags and job applications.
 */

import { Tag, JobApplication } from '@prisma/client';

/**
 * Tag with related job applications
 */
export type TagWithRelations = Tag & {
  jobApplications?: JobApplication[];
};

/**
 * Job Application with related tags
 */
export type JobApplicationWithTags = JobApplication & {
  tags?: Tag[];
};

/**
 * Tag filters for querying
 */
export interface TagFilters {
  search?: string;
  limit?: number;
}

/**
 * Request for adding tags to a job application
 * Tags will be created if they don't exist, or existing ones will be associated
 */
export interface AddTagsRequest {
  tagNames: string[]; // Changed from 'tags' to 'tagNames' for clarity
}

/**
 * Request for removing tags from a job application
 */
export interface RemoveTagsRequest {
  tagNames: string[]; // Changed to support removing multiple tags by name
}

/**
 * Request for removing a single tag association (legacy support)
 */
export interface RemoveTagRequest {
  tagName: string; // Changed from tagId to tagName for consistency
}

/**
 * Query parameters for listing tags
 */
export interface ListTagsQuery {
  search?: string;
  limit?: number;
}

/**
 * URL parameters for tag-related routes
 */
export interface ListTagsParams {
  userId: string;
}

/**
 * Tag suggestion response
 */
export interface TagSuggestion {
  id: number;
  name: string;
  usageCount?: number; // How many job applications use this tag
}

/**
 * Request for tag suggestions
 */
export interface TagSuggestionsQuery {
  q: string;        // Query string to search for
  limit?: number;   // Max number of suggestions to return
  userId?: number;  // Optional: limit to tags used by specific user
}

/**
 * Tag statistics
 */
export interface TagStats {
  totalTags: number;
  totalUniqueUsages: number;
  mostUsedTags: Array<{
    name: string;
    usageCount: number;
  }>;
}

/**
 * Request for bulk tag operations
 */
export interface BulkTagOperation {
  jobApplicationIds: number[];
  tagNames: string[];
  operation: 'add' | 'remove' | 'replace';
} 