/**
 * Repository Index
 *
 * Centralized export of all repositories and utility functions.
 * Provides easy access to all database access layer components.
 */
export { BaseRepository } from './base.repository.js';
export type { PaginationOptions, PaginatedResult, SortOptions } from './base.repository.js';
export { UserRepository } from './user.repository.js';
export type { UserWithRelations } from './user.repository.js';
export { JobApplicationRepository } from './job-application.repository.js';
export type { JobApplicationWithRelations, JobApplicationFilters } from './job-application.repository.js';
export { ContactRepository } from './contact.repository.js';
export type { ContactWithRelations, ContactFilters } from './contact.repository.js';
export { TagRepository } from './tag.repository.js';
export type { TagWithRelations } from './tag.repository.js';
export { JobConnectionRepository } from './job-connection.repository.js';
export type { JobConnectionWithRelations, JobConnectionFilters } from './job-connection.repository.js';
export { DocumentRepository } from './document.repository.js';
export type { DocumentWithRelations, DocumentFilters } from './document.repository.js';
import { UserRepository } from './user.repository.js';
import { JobApplicationRepository } from './job-application.repository.js';
import { ContactRepository } from './contact.repository.js';
import { TagRepository } from './tag.repository.js';
import { JobConnectionRepository } from './job-connection.repository.js';
import { DocumentRepository } from './document.repository.js';
export declare const userRepository: UserRepository;
export declare const jobApplicationRepository: JobApplicationRepository;
export declare const contactRepository: ContactRepository;
export declare const tagRepository: TagRepository;
export declare const jobConnectionRepository: JobConnectionRepository;
export declare const documentRepository: DocumentRepository;
/**
 * Repository collection for easy access
 */
export declare const repositories: {
    readonly user: UserRepository;
    readonly jobApplication: JobApplicationRepository;
    readonly contact: ContactRepository;
    readonly tag: TagRepository;
    readonly jobConnection: JobConnectionRepository;
    readonly document: DocumentRepository;
};
/**
 * Type for repository names
 */
export type RepositoryName = keyof typeof repositories;
//# sourceMappingURL=index.d.ts.map