/**
 * Job Connection Repository
 *
 * Handles all database operations related to job connections.
 * Extends BaseRepository with job connection-specific methods.
 */
import { JobConnection, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository.js';
export type JobConnectionWithRelations = JobConnection & {
    contact?: any;
    jobApplication?: any;
};
export interface JobConnectionFilters {
    jobApplicationId?: number;
    contactId?: number;
    connectionType?: string;
    status?: string;
    hasContact?: boolean;
    contactedAfter?: Date;
    contactedBefore?: Date;
}
export declare class JobConnectionRepository extends BaseRepository<JobConnection, Prisma.JobConnectionCreateInput, Prisma.JobConnectionUpdateInput, Prisma.JobConnectionWhereInput> {
    constructor();
    /**
     * Find job connection with all relations
     */
    findByIdWithRelations(id: number, tx?: Prisma.TransactionClient): Promise<JobConnectionWithRelations | null>;
    /**
     * Find job connections by job application
     */
    findByJobApplication(jobApplicationId: number, tx?: Prisma.TransactionClient): Promise<JobConnectionWithRelations[]>;
    /**
     * Find job connections by contact
     */
    findByContact(contactId: number, tx?: Prisma.TransactionClient): Promise<JobConnectionWithRelations[]>;
    /**
     * Find job connections by user (through job applications)
     */
    findByUser(userId: number, filters?: JobConnectionFilters, options?: {
        pagination?: {
            page?: number;
            limit?: number;
        };
        orderBy?: Prisma.JobConnectionOrderByWithRelationInput;
    }, tx?: Prisma.TransactionClient): Promise<JobConnectionWithRelations[]>;
    /**
     * Find job connections by status
     */
    findByStatus(status: string, userId?: number, tx?: Prisma.TransactionClient): Promise<JobConnectionWithRelations[]>;
    /**
     * Find job connections by connection type
     */
    findByConnectionType(connectionType: string, userId?: number, tx?: Prisma.TransactionClient): Promise<JobConnectionWithRelations[]>;
    /**
     * Search job connections
     */
    searchJobConnections(query: string, userId?: number, options?: {
        pagination?: {
            page?: number;
            limit?: number;
        };
    }, tx?: Prisma.TransactionClient): Promise<JobConnectionWithRelations[]>;
    /**
     * Update job connection status
     */
    updateStatus(id: number, status: string, contactedAt?: Date, tx?: Prisma.TransactionClient): Promise<JobConnection>;
    /**
     * Mark as contacted
     */
    markAsContacted(id: number, contactedAt?: Date, notes?: string, tx?: Prisma.TransactionClient): Promise<JobConnection>;
    /**
     * Get job connection statistics for a user
     */
    getJobConnectionStats(userId: number, tx?: Prisma.TransactionClient): Promise<{
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
    }>;
    /**
     * Find connections that need follow-up
     */
    findNeedingFollowUp(userId?: number, daysSinceContact?: number, tx?: Prisma.TransactionClient): Promise<JobConnectionWithRelations[]>;
    /**
     * Build filters for where clause
     */
    private buildFiltersWhere;
}
//# sourceMappingURL=job-connection.repository.d.ts.map