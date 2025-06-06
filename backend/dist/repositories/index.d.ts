/**
 * Repository Index
 *
 * Centralized export of all repositories and utility functions.
 * Provides easy access to all database access layer components.
 */
export { BaseRepository } from './base.repository';
export type { PaginationOptions, PaginatedResult, SortOptions } from './base.repository';
export { UserRepository } from './user.repository';
export type { UserWithRelations } from './user.repository';
export { JobApplicationRepository } from './job-application.repository';
export type { JobApplicationWithRelations, JobApplicationFilters } from './job-application.repository';
export { ContactRepository } from './contact.repository';
export type { ContactWithRelations, ContactFilters } from './contact.repository';
export { TagRepository } from './tag.repository';
export type { TagWithRelations } from './tag.repository';
export { JobConnectionRepository } from './job-connection.repository';
export type { JobConnectionWithRelations, JobConnectionFilters } from './job-connection.repository';
export { DocumentRepository } from './document.repository';
export type { DocumentWithRelations, DocumentFilters } from './document.repository';
import { UserRepository } from './user.repository';
import { JobApplicationRepository } from './job-application.repository';
import { ContactRepository } from './contact.repository';
import { TagRepository } from './tag.repository';
import { JobConnectionRepository } from './job-connection.repository';
import { DocumentRepository } from './document.repository';
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