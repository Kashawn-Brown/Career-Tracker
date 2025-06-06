/**
 * Job Application Controller
 *
 * Handles HTTP requests for job application CRUD operations.
 * Implements proper error handling, validation, and response formatting.
 */
import { FastifyRequest, FastifyReply } from 'fastify';
interface CreateJobApplicationRequest {
    userId: number;
    company: string;
    position: string;
    dateApplied?: string;
    status?: string;
    type?: string;
    salary?: number;
    jobLink?: string;
    compatibilityScore?: number;
    notes?: string;
    isStarred?: boolean;
    followUpDate?: string;
    deadline?: string;
    tags?: string[];
}
interface UpdateJobApplicationRequest {
    company?: string;
    position?: string;
    dateApplied?: string;
    status?: string;
    type?: string;
    salary?: number;
    jobLink?: string;
    compatibilityScore?: number;
    notes?: string;
    isStarred?: boolean;
    followUpDate?: string;
    deadline?: string;
    tags?: string[];
}
interface ListJobApplicationsQuery {
    page?: number;
    limit?: number;
    userId?: number;
    status?: string;
    company?: string;
    position?: string;
    dateFrom?: string;
    dateTo?: string;
    isStarred?: boolean;
    hasFollowUp?: boolean;
    salaryMin?: number;
    salaryMax?: number;
    compatibilityScoreMin?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
/**
 * List job applications with pagination and filtering
 */
export declare function listJobApplications(request: FastifyRequest<{
    Querystring: ListJobApplicationsQuery;
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
export {};
//# sourceMappingURL=job-application.controller.d.ts.map