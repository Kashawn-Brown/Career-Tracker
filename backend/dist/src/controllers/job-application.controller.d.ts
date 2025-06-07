/**
 * Job Application Controller
 *
 * Handles HTTP requests for job application CRUD operations.
 * Implements proper error handling, validation, and response formatting.
 * Uses JobApplicationService for business logic to maintain separation of concerns.
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import type { JobApplicationListFilters, CreateJobApplicationRequest, UpdateJobApplicationRequest } from '../models/job-application.models.js';
/**
 * List job applications with pagination and filtering
 */
export declare function listJobApplications(request: FastifyRequest<{
    Querystring: JobApplicationListFilters;
}>, reply: FastifyReply): Promise<never>;
/**
 * Get a single job application by ID
 */
export declare function getJobApplication(request: FastifyRequest<{
    Params: {
        id: string;
    };
}>, reply: FastifyReply): Promise<never>;
/**
 * Create a new job application
 */
export declare function createJobApplication(request: FastifyRequest<{
    Body: CreateJobApplicationRequest;
}>, reply: FastifyReply): Promise<never>;
/**
 * Update an existing job application
 */
export declare function updateJobApplication(request: FastifyRequest<{
    Params: {
        id: string;
    };
    Body: UpdateJobApplicationRequest;
}>, reply: FastifyReply): Promise<never>;
/**
 * Delete a job application
 */
export declare function deleteJobApplication(request: FastifyRequest<{
    Params: {
        id: string;
    };
}>, reply: FastifyReply): Promise<never>;
//# sourceMappingURL=job-application.controller.d.ts.map