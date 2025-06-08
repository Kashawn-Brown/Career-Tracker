/**
 * Repository Utilities
 *
 * Common utility functions for database operations and query patterns.
 * Provides reusable functions for complex operations across repositories.
 */
import { prisma } from '../lib/prisma.js';
import { repositories } from './index.js';
/**
 * Transaction wrapper for multiple repository operations
 */
export async function withTransaction(callback) {
    return prisma.$transaction(callback);
}
/**
 * Bulk operations utility
 */
class BulkOperations {
    /**
     * Create multiple job applications with related data
     *
     * Creates multiple job applications with associated data such as documents, tags, and job connections.
     *
     * @param userId - The ID of the user creating the job applications
     * @param applications - Array of job application data objects
     */
    static async createJobApplicationsWithRelations(userId, applications) {
        return withTransaction(async (tx) => {
            const results = [];
            for (const appData of applications) {
                const { tags, documents, jobConnections, ...jobAppData } = appData;
                // Create job application
                const jobApp = await repositories.jobApplication.create({
                    ...jobAppData,
                    user: { connect: { id: userId } },
                }, tx);
                // Create tags if provided
                if (tags && tags.length > 0) {
                    await repositories.tag.addTagsToJobApplication(jobApp.id, tags, tx);
                }
                // Create documents if provided
                if (documents && documents.length > 0) {
                    for (const docData of documents) {
                        await repositories.document.create({
                            ...docData,
                            jobApplication: { connect: { id: jobApp.id } },
                        }, tx);
                    }
                }
                // Create job connections if provided
                if (jobConnections && jobConnections.length > 0) {
                    for (const connData of jobConnections) {
                        const { contactId, ...connectionData } = connData;
                        const createData = {
                            ...connectionData,
                            jobApplication: { connect: { id: jobApp.id } },
                        };
                        if (contactId) {
                            createData.contact = { connect: { id: contactId } };
                        }
                        await repositories.jobConnection.create(createData, tx);
                    }
                }
                results.push(jobApp);
            }
            return results;
        });
    }
    /**
     * Delete user and all related data
     *
     * Deletes a user and all associated data including job applications, contacts, documents, and job connections.
     *
     * @param userId - The ID of the user to delete
     */
    static async deleteUserWithAllData(userId) {
        return withTransaction(async (tx) => {
            // Delete in correct order due to foreign key constraints
            // Documents, Tags, JobConnections are deleted automatically via CASCADE
            // But we'll be explicit for clarity
            // Get all job applications for the user
            const jobApps = await repositories.jobApplication.findMany({ userId }, undefined, tx);
            // Delete all related data for each job application
            for (const jobApp of jobApps) {
                await repositories.document.deleteMany({ jobApplicationId: jobApp.id }, tx);
                await repositories.tag.removeTagsFromJobApplication(jobApp.id, [], tx); // Remove all tags
                await repositories.jobConnection.deleteMany({ jobApplicationId: jobApp.id }, tx);
            }
            // Delete job applications
            await repositories.jobApplication.deleteMany({ userId }, tx);
            // Delete contacts
            await repositories.contact.deleteMany({ userId }, tx);
            // Finally delete the user
            await repositories.user.delete(userId, tx);
            return { success: true, deletedUserId: userId };
        });
    }
}
/**
 * Search utilities
 *
 * Utility functions for searching across all user data.
 */
class SearchUtils {
    /**
     * Global search across all user data
     *
     * Searches across job applications, contacts, and tags for the specified user.
     *
     * @param userId - The ID of the user to search for
     * @param query - The search query
     * @param options - Optional pagination options
     */
    static async globalSearch(userId, query, options) {
        const { pagination = { page: 1, limit: 20 } } = options || {};
        const [jobApplications, contacts, tags] = await Promise.all([
            repositories.jobApplication.searchJobApplications(query, userId, { pagination }),
            repositories.contact.searchContacts(query, userId, { pagination }),
            repositories.tag.suggestTags(query, userId),
        ]);
        return {
            jobApplications,
            contacts,
            tags,
            total: jobApplications.length + contacts.length + tags.length,
        };
    }
    /**
     * Advanced job application search with multiple criteria
     *
     * Searches for job applications based on various criteria including company, position, date range, salary, tags, and document/connection presence.
     *
     * @param userId - The ID of the user to search for
     * @param criteria - The search criteria
     * @param options - Optional pagination and sorting options
     */
    static async advancedJobApplicationSearch(userId, criteria, options) {
        const { pagination, orderBy = 'dateApplied', orderDirection = 'desc' } = options || {};
        // Build complex where clause
        const where = { userId };
        if (criteria.query) {
            where.OR = [
                { company: { contains: criteria.query, mode: 'insensitive' } },
                { position: { contains: criteria.query, mode: 'insensitive' } },
                { notes: { contains: criteria.query, mode: 'insensitive' } },
            ];
        }
        if (criteria.status)
            where.status = criteria.status;
        if (criteria.company)
            where.company = { contains: criteria.company, mode: 'insensitive' };
        if (criteria.dateFrom || criteria.dateTo) {
            where.dateApplied = {};
            if (criteria.dateFrom)
                where.dateApplied.gte = criteria.dateFrom;
            if (criteria.dateTo)
                where.dateApplied.lte = criteria.dateTo;
        }
        if (criteria.salaryMin || criteria.salaryMax) {
            where.salary = {};
            if (criteria.salaryMin)
                where.salary.gte = criteria.salaryMin;
            if (criteria.salaryMax)
                where.salary.lte = criteria.salaryMax;
        }
        if (criteria.tags && criteria.tags.length > 0) {
            where.tags = {
                some: {
                    name: { in: criteria.tags },
                },
            };
        }
        if (criteria.hasDocuments !== undefined) {
            if (criteria.hasDocuments) {
                where.documents = { some: {} };
            }
            else {
                where.documents = { none: {} };
            }
        }
        if (criteria.hasConnections !== undefined) {
            if (criteria.hasConnections) {
                where.jobConnections = { some: {} };
            }
            else {
                where.jobConnections = { none: {} };
            }
        }
        return repositories.jobApplication.findManyWithPagination(where, {
            include: {
                documents: true,
                jobConnections: { include: { contact: true } },
                tags: true,
            },
            orderBy: { [orderBy]: orderDirection },
            pagination,
        });
    }
}
/**
 * Analytics utilities
 */
class AnalyticsUtils {
    /**
     * Get comprehensive user dashboard data
     *
     * Retrieves comprehensive data for the user's dashboard including:
     * - User statistics
     * - Job application statistics
     * - Contact statistics
     * - Tag statistics
     * - Document statistics
     * - Job connection statistics
     * - Recent activity
     * - Upcoming follow-ups
     */
    static async getUserDashboardData(userId) {
        const [userStats, jobAppStats, contactStats, tagStats, documentStats, jobConnectionStats, recentActivity, upcomingFollowUps,] = await Promise.all([
            repositories.user.getUserStats(userId),
            repositories.jobApplication.getJobApplicationStats(userId),
            repositories.contact.getContactStats(userId),
            repositories.tag.getTagStats(userId),
            repositories.document.getDocumentStats(userId),
            repositories.jobConnection.getJobConnectionStats(userId),
            this.getRecentActivity(userId),
            repositories.jobApplication.findUpcomingFollowUps(userId),
        ]);
        return {
            user: userStats,
            jobApplications: jobAppStats,
            contacts: contactStats,
            tags: tagStats,
            documents: documentStats,
            jobConnections: jobConnectionStats,
            recentActivity,
            upcomingFollowUps,
        };
    }
    /**
     * Get recent activity across all entities
     *
     * Retrieves recent activity across job applications, contacts, and documents for the specified user.
     *
     * @param userId - The ID of the user to get recent activity for
     * @param daysBack - Number of days back to consider for recent activity
     */
    static async getRecentActivity(userId, daysBack = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysBack);
        const [recentJobApps, recentContacts, recentDocuments] = await Promise.all([
            repositories.jobApplication.findMany({
                userId,
                createdAt: { gte: cutoffDate },
            }, {
                orderBy: { createdAt: 'desc' },
                pagination: { page: 1, limit: 10 },
            }),
            repositories.contact.findMany({
                userId,
                createdAt: { gte: cutoffDate },
            }, {
                orderBy: { createdAt: 'desc' },
                pagination: { page: 1, limit: 10 },
            }),
            repositories.document.findRecentDocuments(userId, daysBack, 10),
        ]);
        // Combine and sort by creation date
        const allActivity = [
            ...recentJobApps.map((item) => ({ type: 'job_application', data: item, createdAt: item.createdAt })),
            ...recentContacts.map((item) => ({ type: 'contact', data: item, createdAt: item.createdAt })),
            ...recentDocuments.map((item) => ({ type: 'document', data: item, createdAt: item.createdAt })),
        ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return allActivity.slice(0, 20); // Return top 20 most recent
    }
    /**
     * Get application success metrics
     *
     * Calculates application success metrics for the specified user over a given timeframe.
     *
     * @param userId - The ID of the user to calculate metrics for
     * @param timeframe - The time period to calculate metrics for (week, month, quarter, year)
     */
    static async getApplicationMetrics(userId, timeframe = 'month') {
        const now = new Date();
        const startDate = new Date();
        switch (timeframe) {
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'quarter':
                startDate.setMonth(now.getMonth() - 3);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
        }
        const applications = await repositories.jobApplication.findMany({
            userId,
            dateApplied: { gte: startDate },
        }, {
            include: {
                jobConnections: true,
                documents: true,
            },
        });
        const metrics = {
            totalApplications: applications.length,
            statusBreakdown: {},
            averageConnectionsPerApp: 0,
            averageDocumentsPerApp: 0,
            responseRate: 0,
            interviewRate: 0,
        };
        applications.forEach((app) => {
            metrics.statusBreakdown[app.status] = (metrics.statusBreakdown[app.status] || 0) + 1;
        });
        if (applications.length > 0) {
            metrics.averageConnectionsPerApp = applications.reduce((sum, app) => sum + app.jobConnections.length, 0) / applications.length;
            metrics.averageDocumentsPerApp = applications.reduce((sum, app) => sum + app.documents.length, 0) / applications.length;
            const responsesReceived = applications.filter((app) => ['interview_scheduled', 'offer_received', 'rejected'].includes(app.status)).length;
            const interviewsScheduled = applications.filter((app) => ['interview_scheduled', 'offer_received'].includes(app.status)).length;
            metrics.responseRate = (responsesReceived / applications.length) * 100;
            metrics.interviewRate = (interviewsScheduled / applications.length) * 100;
        }
        return metrics;
    }
}
/**
 * Validation utilities
 */
class ValidationUtils {
    /**
     * Validate email format
     *
     * Checks if the provided email address is in a valid format.
     *
     * @param email - The email address to validate
     * @returns True if the email is valid, false otherwise
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    /**
     * Validate phone number format (basic)
     *
     * Checks if the provided phone number is in a valid format.
     *
     * @param phone - The phone number to validate
     * @returns True if the phone number is valid, false otherwise
     */
    static isValidPhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    }
    /**
     * Validate URL format
     *
     * Checks if the provided URL is in a valid format.
     *
     * @param url - The URL to validate
     * @returns True if the URL is valid, false otherwise
     */
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Sanitize string input
     *
     * Removes extra whitespace from the input string.
     *
     * @param input - The string to sanitize
     * @returns The sanitized string
     */
    static sanitizeString(input) {
        return input.trim().replace(/\s+/g, ' ');
    }
}
// Export all utilities
export { BulkOperations, SearchUtils, AnalyticsUtils, ValidationUtils };
//# sourceMappingURL=utils.js.map