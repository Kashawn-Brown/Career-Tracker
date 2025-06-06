/**
 * Repository Index
 *
 * Centralized export of all repositories and utility functions.
 * Provides easy access to all database access layer components.
 */
// Base repository
export { BaseRepository } from './base.repository';
// User repository
export { UserRepository } from './user.repository';
// Job Application repository
export { JobApplicationRepository } from './job-application.repository';
// Contact repository
export { ContactRepository } from './contact.repository';
// Tag repository
export { TagRepository } from './tag.repository';
// Job Connection repository
export { JobConnectionRepository } from './job-connection.repository';
// Document repository
export { DocumentRepository } from './document.repository';
// Repository instances (singletons)
import { UserRepository } from './user.repository';
import { JobApplicationRepository } from './job-application.repository';
import { ContactRepository } from './contact.repository';
import { TagRepository } from './tag.repository';
import { JobConnectionRepository } from './job-connection.repository';
import { DocumentRepository } from './document.repository';
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
};
//# sourceMappingURL=index.js.map