/**
 * Repository Utilities
 *
 * Common utility functions for database operations and query patterns.
 * Provides reusable functions for complex operations across repositories.
 */
import { Prisma } from '@prisma/client';
/**
 * Transaction wrapper for multiple repository operations
 */
export declare function withTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
/**
 * Bulk operations utility
 */
declare class BulkOperations {
    /**
     * Create multiple job applications with related data
     *
     * Creates multiple job applications with associated data such as documents, tags, and job connections.
     *
     * @param userId - The ID of the user creating the job applications
     * @param applications - Array of job application data objects
     */
    static createJobApplicationsWithRelations(userId: number, applications: Array<{
        company: string;
        position: string;
        dateApplied?: Date;
        status?: string;
        type?: string;
        salary?: number;
        jobLink?: string;
        notes?: string;
        tags?: string[];
        documents?: Array<{
            fileUrl: string;
            fileName: string;
            fileSize?: number;
            type: string;
        }>;
        jobConnections?: Array<{
            name: string;
            email?: string;
            phone?: string;
            company?: string;
            role?: string;
            connectionType: string;
            contactId?: number;
        }>;
    }>): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: number;
        company: string;
        notes: string | null;
        position: string;
        dateApplied: Date;
        status: string;
        type: string | null;
        salary: number | null;
        jobLink: string | null;
        compatibilityScore: number | null;
        isStarred: boolean;
        followUpDate: Date | null;
        deadline: Date | null;
    }[]>;
    /**
     * Delete user and all related data
     *
     * Deletes a user and all associated data including job applications, contacts, documents, and job connections.
     *
     * @param userId - The ID of the user to delete
     */
    static deleteUserWithAllData(userId: number): Promise<{
        success: boolean;
        deletedUserId: number;
    }>;
}
/**
 * Search utilities
 *
 * Utility functions for searching across all user data.
 */
declare class SearchUtils {
    /**
     * Global search across all user data
     *
     * Searches across job applications, contacts, and tags for the specified user.
     *
     * @param userId - The ID of the user to search for
     * @param query - The search query
     * @param options - Optional pagination options
     */
    static globalSearch(userId: number, query: string, options?: {
        pagination?: {
            page?: number;
            limit?: number;
        };
    }): Promise<{
        jobApplications: import("./job-application.repository.js").JobApplicationWithRelations[];
        contacts: import("./contact.repository.js").ContactWithRelations[];
        tags: import("./tag.repository.js").TagWithRelations[];
        total: number;
    }>;
    /**
     * Advanced job application search with multiple criteria
     *
     * Searches for job applications based on various criteria including company, position, date range, salary, tags, and document/connection presence.
     *
     * @param userId - The ID of the user to search for
     * @param criteria - The search criteria
     * @param options - Optional pagination and sorting options
     */
    static advancedJobApplicationSearch(userId: number, criteria: {
        query?: string;
        status?: string;
        company?: string;
        dateFrom?: Date;
        dateTo?: Date;
        salaryMin?: number;
        salaryMax?: number;
        tags?: string[];
        hasDocuments?: boolean;
        hasConnections?: boolean;
    }, options?: {
        pagination?: {
            page?: number;
            limit?: number;
        };
        orderBy?: 'dateApplied' | 'company' | 'position' | 'salary';
        orderDirection?: 'asc' | 'desc';
    }): Promise<import("./base.repository.js").PaginatedResult<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: number;
        company: string;
        notes: string | null;
        position: string;
        dateApplied: Date;
        status: string;
        type: string | null;
        salary: number | null;
        jobLink: string | null;
        compatibilityScore: number | null;
        isStarred: boolean;
        followUpDate: Date | null;
        deadline: Date | null;
    }>>;
}
/**
 * Analytics utilities
 */
declare class AnalyticsUtils {
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
    static getUserDashboardData(userId: number): Promise<{
        user: {
            totalJobApplications: number;
            totalContacts: number;
            applicationsByStatus: {
                status: string;
                count: number;
            }[];
            recentApplications: number;
        };
        jobApplications: {
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
        };
        contacts: {
            total: number;
            byCompany: {
                company: string;
                count: number;
            }[];
            byConnectionType: {
                connectionType: string;
                count: number;
            }[];
            withEmail: number;
            withPhone: number;
            withLinkedIn: number;
        };
        tags: {
            total: number;
            unique: number;
            mostUsed: {
                label: string;
                count: number;
            }[];
            byJobApplication: {
                jobApplicationId: number;
                company: string;
                position: string;
                tagCount: number;
            }[];
        };
        documents: {
            total: number;
            byType: {
                type: string;
                count: number;
            }[];
            byFileExtension: {
                extension: string;
                count: number;
            }[];
            totalSize: number;
            averageSize: number;
            recentUploads: number;
        };
        jobConnections: {
            total: number;
            byStatus: {
                status: string;
                count: number;
            }[];
            byConnectionType: {
                connectionType: string;
                count: number;
            }[];
            contacted: number;
            notContacted: number;
            recentContacts: number;
        };
        recentActivity: {
            type: string;
            data: any;
            createdAt: any;
        }[];
        upcomingFollowUps: import("./job-application.repository.js").JobApplicationWithRelations[];
    }>;
    /**
     * Get recent activity across all entities
     *
     * Retrieves recent activity across job applications, contacts, and documents for the specified user.
     *
     * @param userId - The ID of the user to get recent activity for
     * @param daysBack - Number of days back to consider for recent activity
     */
    static getRecentActivity(userId: number, daysBack?: number): Promise<{
        type: string;
        data: any;
        createdAt: any;
    }[]>;
    /**
     * Get application success metrics
     *
     * Calculates application success metrics for the specified user over a given timeframe.
     *
     * @param userId - The ID of the user to calculate metrics for
     * @param timeframe - The time period to calculate metrics for (week, month, quarter, year)
     */
    static getApplicationMetrics(userId: number, timeframe?: 'week' | 'month' | 'quarter' | 'year'): Promise<{
        totalApplications: number;
        statusBreakdown: Record<string, number>;
        averageConnectionsPerApp: number;
        averageDocumentsPerApp: number;
        responseRate: number;
        interviewRate: number;
    }>;
}
/**
 * Validation utilities
 */
declare class ValidationUtils {
    /**
     * Validate email format
     *
     * Checks if the provided email address is in a valid format.
     *
     * @param email - The email address to validate
     * @returns True if the email is valid, false otherwise
     */
    static isValidEmail(email: string): boolean;
    /**
     * Validate phone number format (basic)
     *
     * Checks if the provided phone number is in a valid format.
     *
     * @param phone - The phone number to validate
     * @returns True if the phone number is valid, false otherwise
     */
    static isValidPhone(phone: string): boolean;
    /**
     * Validate URL format
     *
     * Checks if the provided URL is in a valid format.
     *
     * @param url - The URL to validate
     * @returns True if the URL is valid, false otherwise
     */
    static isValidUrl(url: string): boolean;
    /**
     * Sanitize string input
     *
     * Removes extra whitespace from the input string.
     *
     * @param input - The string to sanitize
     * @returns The sanitized string
     */
    static sanitizeString(input: string): string;
}
export { BulkOperations, SearchUtils, AnalyticsUtils, ValidationUtils };
//# sourceMappingURL=utils.d.ts.map