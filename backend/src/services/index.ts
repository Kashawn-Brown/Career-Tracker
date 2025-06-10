/**
 * Services Index
 * 
 * Central export point for all service modules.
 * Provides easy access to business logic services.
 */

export { tagService, TagService } from './tag.service.js';
export type { TagFilters, AddTagsRequest, RemoveTagRequest } from '../models/tag.models.js';

export { jobApplicationService, JobApplicationService } from './job-application.service.js';
export type { JobApplicationListFilters, CreateJobApplicationRequest, UpdateJobApplicationRequest } from '../models/job-application.models.js';

export { authService, AuthService } from './auth.service.js';
export type { JWTPayload, TokenPair } from '../models/auth.models.js';

export { ContactService } from './contact.service.js';
export type { ContactListFilters, CreateContactRequest, UpdateContactRequest } from '../models/contact.models.js';

export { JobConnectionService } from './job-connection.service.js';
export type { JobConnectionListFilters, CreateJobConnectionRequest, UpdateJobConnectionRequest, UpdateJobConnectionStatusRequest } from '../models/job-connection.models.js'; 