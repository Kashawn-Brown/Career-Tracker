/**
 * Job Application Repository
 *
 * Handles all database operations related to job applications.
 * Extends BaseRepository with job application-specific methods.
 */
import { BaseRepository } from './base.repository';
// Job application repository class extending BaseRepository with JobApplication-specific methods
export class JobApplicationRepository extends BaseRepository {
    // Constructor for JobApplicationRepository, passing 'jobApplication' as the model name
    constructor() {
        super('jobApplication');
    }
    /**
     * Find job application with all relations
     *
     * Retrieves a job application by ID along with all related entities:
     * - User: the user who applied for the job
     * - Documents: ordered by creation date (newest first)
     * - Job connections: ordered by creation date (newest first), including:
     *   - Contact: the person who referred the job application
     */
    async findByIdWithRelations(id, tx) {
        return this.findById(id, {
            user: true,
            documents: {
                orderBy: { createdAt: 'desc' },
            },
            jobConnections: {
                include: {
                    contact: true,
                },
                orderBy: { createdAt: 'desc' },
            },
            tags: {
                orderBy: { createdAt: 'desc' },
            },
        }, tx);
    }
    /**
     * Find job applications by user with filters
     *
     * Retrieves job applications by user ID, with optional filters and pagination.
     *
     * @param userId - The ID of the user to find job applications for
     * @param filters - Optional filters to apply to the query
     * @param options - Optional pagination and sorting options
     */
    async findByUserWithFilters(userId, filters = {}, options, tx) {
        // Build the where clause by combining userId filter with any additional filters
        const where = {
            userId,
            ...this.buildFiltersWhere(filters),
        };
        // Define which related entities to include in the query results
        const include = {
            documents: true, // Include all associated documents
            jobConnections: {
                include: {
                    contact: true, // Include contact information for each job connection
                },
            },
            tags: true, // Include all associated tags
        };
        // Execute the query with the specified criteria and options
        return this.findManyWithPagination(where, {
            include,
            orderBy: options?.orderBy || { dateApplied: 'desc' },
            pagination: options?.pagination,
        }, tx);
    }
    /**
     * Find starred job applications
     *
     * Retrieves all starred job applications for a specific user, with optional pagination.
     *
     * @param userId - The ID of the user to find starred job applications for
     * @param options - Optional pagination options
     */
    async findStarredByUser(userId, options, tx) {
        // Query for starred job applications with the specified user ID
        return this.findMany({ userId, isStarred: true }, // Filter by user and starred status
        {
            include: {
                documents: true, // Include all associated documents
                jobConnections: true, // Include job connection details
                tags: true, // Include all associated tags
            },
            orderBy: { dateApplied: 'desc' }, // Sort by most recently applied first
            pagination: options?.pagination, // Apply pagination if provided
        }, tx // Use transaction if provided
        );
    }
    /**
     * Find job applications by status
     *
     * Retrieves job applications by status, with optional filters and pagination.
     *
     * @param status - The status to filter by
     * @param userId - Optional ID of the user to filter by
     * @param options - Optional pagination options
     */
    async findByStatus(status, userId, options, tx) {
        // Build the base where clause with the required status filter
        const where = { status };
        // Add user filter if userId is provided
        if (userId) {
            where.userId = userId;
        }
        // Execute the query with full relations and sorting
        return this.findMany(where, // Apply status and optional user filters
        {
            include: {
                documents: true, // Include all associated documents
                jobConnections: true, // Include job connection details
                tags: true, // Include all associated tags
            },
            orderBy: { dateApplied: 'desc' }, // Sort by most recently applied first
            pagination: options?.pagination, // Apply pagination if provided
        }, tx // Use transaction if provided
        );
    }
    /**
     * Find job applications with upcoming follow-ups
     *
     * Retrieves job applications with upcoming follow-ups, with optional user filter.
     *
     * @param userId - Optional ID of the user to filter by
     * @param daysAhead - Number of days ahead to consider for follow-ups
     */
    async findUpcomingFollowUps(userId, daysAhead = 7, tx) {
        // Calculate the end date for the follow-up window
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + daysAhead);
        // Build where clause to filter applications with follow-ups in the specified date range
        const where = {
            followUpDate: {
                lte: endDate, // Follow-up date is on or before the end date
                gte: new Date(), // Follow-up date is today or in the future
            },
        };
        // Add user filter if userId is provided
        if (userId) {
            where.userId = userId;
        }
        // Execute query with full relations, ordered by follow-up date (earliest first)
        return this.findMany(where, {
            include: {
                documents: true, // Include all associated documents
                jobConnections: true, // Include job connection details
                tags: true, // Include all associated tags
            },
            orderBy: { followUpDate: 'asc' }, // Sort by earliest follow-up date first
        }, tx // Use transaction if provided
        );
    }
    /**
     * Search job applications
     *
     * Searches for job applications by company, position, or notes, with optional user filter and pagination.
     *
     * @param query - The search query (company, position, or notes)
     * @param userId - Optional ID of the user to filter by
     * @param options - Optional pagination options
     */
    async searchJobApplications(query, userId, options, tx) {
        // Build search criteria to match query against company, position, or notes
        const where = {
            OR: [
                { company: { contains: query, mode: 'insensitive' } }, // Case-insensitive company name search
                { position: { contains: query, mode: 'insensitive' } }, // Case-insensitive position title search
                { notes: { contains: query, mode: 'insensitive' } }, // Case-insensitive notes content search
            ],
        };
        // Add user filter if userId is provided
        if (userId) {
            where.userId = userId;
        }
        // Execute search query with full relations and pagination
        return this.findMany(where, {
            include: {
                documents: true, // Include all associated documents
                jobConnections: true, // Include job connection details
                tags: true, // Include all associated tags
            },
            orderBy: { dateApplied: 'desc' }, // Sort by most recently applied first
            pagination: options?.pagination, // Apply pagination if provided
        }, tx // Use transaction if provided
        );
    }
    /**
     * Update job application status
     *
     * Updates the status of a job application.
     *
     * @param id - The ID of the job application to update
     * @param status - The new status to set
     * @param tx - Optional transaction client to use for the operation
     */
    async updateStatus(id, status, tx) {
        // Update the job application with the new status
        return this.update(id, { status }, undefined, tx);
    }
    /**
     * Toggle starred status
     *
     * Toggles the starred status of a job application.
     *
     * @param id - The ID of the job application to update
     * @param tx - Optional transaction client to use for the operation
     */
    async toggleStarred(id, tx) {
        // First, retrieve the current job application to get its starred status
        const jobApp = await this.findById(id, undefined, tx);
        if (!jobApp) {
            throw new Error('Job application not found');
        }
        // Toggle the starred status and update the record
        return this.update(id, { isStarred: !jobApp.isStarred }, undefined, tx);
    }
    /**
     * Update compatibility score
     *
     * Updates the compatibility score of a job application.
     *
     * @param id - The ID of the job application to update
     * @param score - The new compatibility score to set
     * @param tx - Optional transaction client to use for the operation
     */
    async updateCompatibilityScore(id, score, tx) {
        // Update the job application with the new compatibility score
        return this.update(id, { compatibilityScore: score }, undefined, tx);
    }
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
    async getJobApplicationStats(userId, tx) {
        // Use transaction client if provided, otherwise use default prisma client
        const client = tx || this.prisma;
        // Execute all database queries in parallel for better performance
        const [total, byStatus, starredCount, avgCompatibility, monthlyData,] = await Promise.all([
            // Get total count of job applications for the user
            client.jobApplication.count({ where: { userId } }),
            // Group applications by status and count each status
            client.jobApplication.groupBy({
                by: ['status'],
                where: { userId },
                _count: { status: true },
            }),
            // Count how many applications are starred
            client.jobApplication.count({ where: { userId, isStarred: true } }),
            // Calculate average compatibility score (excluding null values)
            client.jobApplication.aggregate({
                where: { userId, compatibilityScore: { not: null } },
                _avg: { compatibilityScore: true },
            }),
            // Group applications by date applied for monthly statistics
            client.jobApplication.groupBy({
                by: ['dateApplied'],
                where: { userId },
                _count: { dateApplied: true },
            }),
        ]);
        // Process monthly data to group by month/year format
        const monthlyStats = this.processMonthlyStats(monthlyData);
        return {
            total,
            // Transform status grouping data to a more readable format
            byStatus: byStatus.map(item => ({
                status: item.status,
                count: item._count.status,
            })),
            byMonth: monthlyStats,
            // Use 0 as default if no compatibility scores exist
            averageCompatibilityScore: avgCompatibility._avg.compatibilityScore || 0,
            starredCount,
        };
    }
    /**
     * Build filters for where clause
     *
     * Builds a Prisma where clause based on the provided filters.
     *
     * @param filters - The filters to apply to the query
     * @returns The Prisma where clause
     */
    buildFiltersWhere(filters) {
        const where = {};
        // Filter by application status (e.g., APPLIED, INTERVIEW, REJECTED)
        if (filters.status) {
            where.status = filters.status;
        }
        // Filter by company name with case-insensitive partial matching
        if (filters.company) {
            where.company = { contains: filters.company, mode: 'insensitive' };
        }
        // Filter by position title with case-insensitive partial matching
        if (filters.position) {
            where.position = { contains: filters.position, mode: 'insensitive' };
        }
        // Filter by date range when application was submitted
        if (filters.dateFrom || filters.dateTo) {
            where.dateApplied = {};
            if (filters.dateFrom) {
                where.dateApplied.gte = filters.dateFrom; // Applications on or after this date
            }
            if (filters.dateTo) {
                where.dateApplied.lte = filters.dateTo; // Applications on or before this date
            }
        }
        // Filter by starred status (boolean filter)
        if (filters.isStarred !== undefined) {
            where.isStarred = filters.isStarred;
        }
        // Filter by follow-up status - check if follow-up date exists
        if (filters.hasFollowUp !== undefined) {
            if (filters.hasFollowUp) {
                where.followUpDate = { not: null }; // Has a follow-up date set
            }
            else {
                where.followUpDate = null; // No follow-up date set
            }
        }
        // Filter by salary range
        if (filters.salaryMin || filters.salaryMax) {
            where.salary = {};
            if (filters.salaryMin) {
                where.salary.gte = filters.salaryMin; // Salary greater than or equal to minimum
            }
            if (filters.salaryMax) {
                where.salary.lte = filters.salaryMax; // Salary less than or equal to maximum
            }
        }
        // Filter by minimum compatibility score
        if (filters.compatibilityScoreMin) {
            where.compatibilityScore = { gte: filters.compatibilityScoreMin };
        }
        return where;
    }
    /**
     * Process monthly statistics
     *
     * Processes monthly statistics from job application data.
     *
     * @param monthlyData - Array of monthly statistics data
     * @returns Array of monthly statistics with month and count
     */
    processMonthlyStats(monthlyData) {
        // Create a map to aggregate counts by month
        const monthlyMap = new Map();
        monthlyData.forEach(item => {
            // Convert the date to a Date object
            const date = new Date(item.dateApplied);
            // Create a month key in YYYY-MM format
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            // Add the count to the existing month total (or initialize to 0)
            monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + item._count.dateApplied);
        });
        // Convert map to array of objects and sort by month
        return Array.from(monthlyMap.entries())
            .map(([month, count]) => ({ month, count })) // Transform to desired object structure
            .sort((a, b) => a.month.localeCompare(b.month)); // Sort chronologically by month
    }
}
//# sourceMappingURL=job-application.repository.js.map