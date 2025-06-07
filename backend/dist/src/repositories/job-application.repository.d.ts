/**
 * Job Application Repository
 *
 * Handles all database operations related to job applications.
 * Extends BaseRepository with job application-specific methods.
 */
import { JobApplication, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository.js';
import { JobApplicationWithRelations, JobApplicationFilters } from '../models/job-application.models.js';
import { PaginatedResult } from '../models/repository.models.js';
export declare class JobApplicationRepository extends BaseRepository<JobApplication, Prisma.JobApplicationCreateInput, Prisma.JobApplicationUpdateInput, Prisma.JobApplicationWhereInput> {
    constructor();
    /**
     * Find job application with all relations
     *
     * Retrieves a job application by ID along with all related entities:
     * - User: the user who applied for the job
     * - Documents: ordered by creation date (newest first)
     * - Job connections: ordered by creation date (newest first), including:
     *   - Contact: the person who referred the job application
     */
    findByIdWithRelations(id: number, tx?: Prisma.TransactionClient): Promise<JobApplicationWithRelations | null>;
    /**
     * Find job applications by user with filters
     *
     * Retrieves job applications by user ID, with optional filters and pagination.
     *
     * @param userId - The ID of the user to find job applications for
     * @param filters - Optional filters to apply to the query
     * @param options - Optional pagination and sorting options
     */
    findByUserWithFilters(userId: number, filters?: JobApplicationFilters, options?: {
        pagination?: {
            page?: number;
            limit?: number;
        };
        orderBy?: Prisma.JobApplicationOrderByWithRelationInput;
    }, tx?: Prisma.TransactionClient): Promise<PaginatedResult<JobApplicationWithRelations>>;
    /**
     * Find starred job applications
     *
     * Retrieves all starred job applications for a specific user, with optional pagination.
     *
     * @param userId - The ID of the user to find starred job applications for
     * @param options - Optional pagination options
     */
    findStarredByUser(userId: number, options?: {
        pagination?: {
            page?: number;
            limit?: number;
        };
    }, tx?: Prisma.TransactionClient): Promise<JobApplicationWithRelations[]>;
    /**
     * Find job applications by status
     *
     * Retrieves job applications by status, with optional filters and pagination.
     *
     * @param status - The status to filter by
     * @param userId - Optional ID of the user to filter by
     * @param options - Optional pagination options
     */
    findByStatus(status: string, userId?: number, options?: {
        pagination?: {
            page?: number;
            limit?: number;
        };
    }, tx?: Prisma.TransactionClient): Promise<JobApplicationWithRelations[]>;
    /**
     * Find job applications with upcoming follow-ups
     *
     * Retrieves job applications with upcoming follow-ups, with optional user filter.
     *
     * @param userId - Optional ID of the user to filter by
     * @param daysAhead - Number of days ahead to consider for follow-ups
     */
    findUpcomingFollowUps(userId?: number, daysAhead?: number, tx?: Prisma.TransactionClient): Promise<JobApplicationWithRelations[]>;
    /**
     * Search job applications
     *
     * Searches for job applications by company, position, or notes, with optional user filter and pagination.
     *
     * @param query - The search query (company, position, or notes)
     * @param userId - Optional ID of the user to filter by
     * @param options - Optional pagination options
     */
    searchJobApplications(query: string, userId?: number, options?: {
        pagination?: {
            page?: number;
            limit?: number;
        };
    }, tx?: Prisma.TransactionClient): Promise<JobApplicationWithRelations[]>;
    /**
     * Update job application status
     *
     * Updates the status of a job application.
     *
     * @param id - The ID of the job application to update
     * @param status - The new status to set
     * @param tx - Optional transaction client to use for the operation
     */
    updateStatus(id: number, status: string, tx?: Prisma.TransactionClient): Promise<JobApplication>;
    /**
     * Toggle starred status
     *
     * Toggles the starred status of a job application.
     *
     * @param id - The ID of the job application to update
     * @param tx - Optional transaction client to use for the operation
     */
    toggleStarred(id: number, tx?: Prisma.TransactionClient): Promise<JobApplication>;
    /**
     * Update compatibility score
     *
     * Updates the compatibility score of a job application.
     *
     * @param id - The ID of the job application to update
     * @param score - The new compatibility score to set
     * @param tx - Optional transaction client to use for the operation
     */
    updateCompatibilityScore(id: number, score: number, tx?: Prisma.TransactionClient): Promise<JobApplication>;
    /**
     * Get job application statistics for a user
     *
     * Retrieves statistics for a user's job applications:
     * - Total number of job applications
     * - Applications grouped by status
     * - Number of starred applications
     * - Average compatibility score
     * - Applications grouped by month
     */
    getJobApplicationStats(userId: number, tx?: Prisma.TransactionClient): Promise<{
        total: number;
        byStatus: {
            status: string;
            count: number;
        }[];
        byMonth: {
            month: string;
            count: number;
        }[];
        averageCompatibilityScore: number;
        starredCount: number;
    }>;
    /**
     * Build filters for where clause
     *
     * Builds a Prisma where clause based on the provided filters.
     *
     * @param filters - The filters to apply to the query
     * @returns The Prisma where clause
     */
    private buildFiltersWhere;
    /**
     * Process monthly statistics
     *
     * Processes monthly statistics from job application data.
     *
     * @param monthlyData - Array of monthly statistics data
     * @returns Array of monthly statistics with month and count
     */
    private processMonthlyStats;
}
//# sourceMappingURL=job-application.repository.d.ts.map