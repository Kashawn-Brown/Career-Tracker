/**
 * Repository Index
 * 
 * Centralized export of all repositories and utility functions.
 * Provides easy access to all database access layer components.
 */

// Base repository
export { BaseRepository } from './base.repository.js';
export type { PaginationOptions, PaginatedResult, SortOptions } from '../models/repository.models.js';

// User repository
export { UserRepository } from './user.repository.js';
export type { UserWithRelations } from './user.repository.js';

// Job Application repository
export { JobApplicationRepository } from './job-application.repository.js';
export type {
  JobApplicationWithRelations,
  JobApplicationFilters 
} from '../models/job-application.models.js';

// Contact repository
export { ContactRepository } from './contact.repository.js';
export type { 
  ContactWithRelations, 
  ContactFilters 
} from './contact.repository.js';

// Tag repository
export { TagRepository } from './tag.repository.js';
export type { TagWithRelations } from '../models/tag.models.js';

// Job Connection repository
export { JobConnectionRepository } from './job-connection.repository.js';
export type { 
  JobConnectionWithRelations, 
  JobConnectionFilters 
} from './job-connection.repository.js';

// Document repository
export { DocumentRepository } from './document.repository.js';
export type { 
  DocumentWithRelations, 
  DocumentFilters 
} from './document.repository.js';

// Repository instances (singletons)
import { UserRepository } from './user.repository.js';
import { JobApplicationRepository } from './job-application.repository.js';
import { ContactRepository } from './contact.repository.js';
import { TagRepository } from './tag.repository.js';
import { JobConnectionRepository } from './job-connection.repository.js';
import { DocumentRepository } from './document.repository.js';

export const userRepository = new UserRepository();
export const jobApplicationRepository = new JobApplicationRepository();
export const contactRepository = new ContactRepository();
export const tagRepository = new TagRepository();
export const jobConnectionRepository = new JobConnectionRepository();
export const documentRepository = new DocumentRepository();

/**
 * Repository collection for easy access
 */
export const repositories = {
  user: userRepository,
  jobApplication: jobApplicationRepository,
  contact: contactRepository,
  tag: tagRepository,
  jobConnection: jobConnectionRepository,
  document: documentRepository,
} as const;

/**
 * Type for repository names
 */
export type RepositoryName = keyof typeof repositories; 