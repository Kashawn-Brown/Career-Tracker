/**
 * Job Connection Repository
 *
 * Handles all database operations related to job connections.
 * Extends BaseRepository with job connection-specific methods.
 */
import { BaseRepository } from './base.repository';
export class JobConnectionRepository extends BaseRepository {
    constructor() {
        super('jobConnection');
    }
    /**
     * Find job connection with all relations
     */
    async findByIdWithRelations(id, tx) {
        return this.findById(id, {
            contact: true,
            jobApplication: {
                select: {
                    id: true,
                    company: true,
                    position: true,
                    status: true,
                    userId: true,
                },
            },
        }, tx);
    }
    /**
     * Find job connections by job application
     */
    async findByJobApplication(jobApplicationId, tx) {
        return this.findMany({ jobApplicationId }, {
            include: {
                contact: true,
            },
            orderBy: { createdAt: 'desc' },
        }, tx);
    }
    /**
     * Find job connections by contact
     */
    async findByContact(contactId, tx) {
        return this.findMany({ contactId }, {
            include: {
                jobApplication: {
                    select: {
                        id: true,
                        company: true,
                        position: true,
                        status: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        }, tx);
    }
    /**
     * Find job connections by user (through job applications)
     */
    async findByUser(userId, filters = {}, options, tx) {
        const where = {
            jobApplication: { userId },
            ...this.buildFiltersWhere(filters),
        };
        return this.findMany(where, {
            include: {
                contact: true,
                jobApplication: {
                    select: {
                        id: true,
                        company: true,
                        position: true,
                        status: true,
                    },
                },
            },
            orderBy: options?.orderBy || { createdAt: 'desc' },
            pagination: options?.pagination,
        }, tx);
    }
    /**
     * Find job connections by status
     */
    async findByStatus(status, userId, tx) {
        const where = { status };
        if (userId) {
            where.jobApplication = { userId };
        }
        return this.findMany(where, {
            include: {
                contact: true,
                jobApplication: {
                    select: {
                        id: true,
                        company: true,
                        position: true,
                        status: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        }, tx);
    }
    /**
     * Find job connections by connection type
     */
    async findByConnectionType(connectionType, userId, tx) {
        const where = { connectionType };
        if (userId) {
            where.jobApplication = { userId };
        }
        return this.findMany(where, {
            include: {
                contact: true,
                jobApplication: {
                    select: {
                        id: true,
                        company: true,
                        position: true,
                        status: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        }, tx);
    }
    /**
     * Search job connections
     */
    async searchJobConnections(query, userId, options, tx) {
        const where = {
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { company: { contains: query, mode: 'insensitive' } },
                { role: { contains: query, mode: 'insensitive' } },
                { notes: { contains: query, mode: 'insensitive' } },
            ],
        };
        if (userId) {
            where.jobApplication = { userId };
        }
        return this.findMany(where, {
            include: {
                contact: true,
                jobApplication: {
                    select: {
                        id: true,
                        company: true,
                        position: true,
                        status: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
            pagination: options?.pagination,
        }, tx);
    }
    /**
     * Update job connection status
     */
    async updateStatus(id, status, contactedAt, tx) {
        const updateData = { status };
        if (contactedAt) {
            updateData.contactedAt = contactedAt;
        }
        else if (status === 'contacted') {
            updateData.contactedAt = new Date();
        }
        return this.update(id, updateData, undefined, tx);
    }
    /**
     * Mark as contacted
     */
    async markAsContacted(id, contactedAt, notes, tx) {
        const updateData = {
            status: 'contacted',
            contactedAt: contactedAt || new Date(),
        };
        if (notes) {
            updateData.notes = notes;
        }
        return this.update(id, updateData, undefined, tx);
    }
    /**
     * Get job connection statistics for a user
     */
    async getJobConnectionStats(userId, tx) {
        const client = tx || this.prisma;
        const [total, byStatus, byConnectionType, contacted, notContacted, recentContacts,] = await Promise.all([
            client.jobConnection.count({
                where: { jobApplication: { userId } },
            }),
            client.jobConnection.groupBy({
                by: ['status'],
                where: { jobApplication: { userId } },
                _count: { status: true },
            }),
            client.jobConnection.groupBy({
                by: ['connectionType'],
                where: { jobApplication: { userId } },
                _count: { connectionType: true },
            }),
            client.jobConnection.count({
                where: {
                    jobApplication: { userId },
                    status: 'contacted',
                },
            }),
            client.jobConnection.count({
                where: {
                    jobApplication: { userId },
                    status: 'not_contacted',
                },
            }),
            client.jobConnection.count({
                where: {
                    jobApplication: { userId },
                    contactedAt: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                    },
                },
            }),
        ]);
        return {
            total,
            byStatus: byStatus.map(item => ({
                status: item.status,
                count: item._count.status,
            })),
            byConnectionType: byConnectionType.map(item => ({
                connectionType: item.connectionType,
                count: item._count.connectionType,
            })),
            contacted,
            notContacted,
            recentContacts,
        };
    }
    /**
     * Find connections that need follow-up
     */
    async findNeedingFollowUp(userId, daysSinceContact = 14, tx) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysSinceContact);
        const where = {
            status: 'contacted',
            contactedAt: {
                lte: cutoffDate,
            },
        };
        if (userId) {
            where.jobApplication = { userId };
        }
        return this.findMany(where, {
            include: {
                contact: true,
                jobApplication: {
                    select: {
                        id: true,
                        company: true,
                        position: true,
                        status: true,
                    },
                },
            },
            orderBy: { contactedAt: 'asc' },
        }, tx);
    }
    /**
     * Build filters for where clause
     */
    buildFiltersWhere(filters) {
        const where = {};
        if (filters.jobApplicationId) {
            where.jobApplicationId = filters.jobApplicationId;
        }
        if (filters.contactId) {
            where.contactId = filters.contactId;
        }
        if (filters.connectionType) {
            where.connectionType = filters.connectionType;
        }
        if (filters.status) {
            where.status = filters.status;
        }
        if (filters.hasContact !== undefined) {
            if (filters.hasContact) {
                where.contactId = { not: null };
            }
            else {
                where.contactId = null;
            }
        }
        if (filters.contactedAfter || filters.contactedBefore) {
            where.contactedAt = {};
            if (filters.contactedAfter) {
                where.contactedAt.gte = filters.contactedAfter;
            }
            if (filters.contactedBefore) {
                where.contactedAt.lte = filters.contactedBefore;
            }
        }
        return where;
    }
}
//# sourceMappingURL=job-connection.repository.js.map