/**
 * Contact Repository
 *
 * Handles all database operations related to contacts.
 * Extends BaseRepository with contact-specific methods.
 */
import { BaseRepository } from './base.repository.js';
export class ContactRepository extends BaseRepository {
    constructor() {
        super('contact');
    }
    /**
     * Find contact with all relations
     */
    async findByIdWithRelations(id, tx) {
        return this.findById(id, {
            user: true,
            jobConnections: {
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
            },
        }, tx);
    }
    /**
     * Find contacts by user with filters
     */
    async findByUserWithFilters(userId, filters = {}, options, tx) {
        const where = {
            userId,
            ...this.buildFiltersWhere(filters),
        };
        return this.findMany(where, {
            include: {
                jobConnections: {
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
                },
            },
            orderBy: options?.orderBy || { createdAt: 'desc' },
            pagination: options?.pagination,
        }, tx);
    }
    /**
     * Find contacts by company
     */
    async findByCompany(company, userId, tx) {
        const where = {
            company: { contains: company, mode: 'insensitive' },
        };
        if (userId) {
            where.userId = userId;
        }
        return this.findMany(where, {
            include: {
                jobConnections: true,
            },
            orderBy: { name: 'asc' },
        }, tx);
    }
    /**
     * Find contacts by connection type
     */
    async findByConnectionType(connectionType, userId, tx) {
        const where = { connectionType };
        if (userId) {
            where.userId = userId;
        }
        return this.findMany(where, {
            include: {
                jobConnections: true,
            },
            orderBy: { name: 'asc' },
        }, tx);
    }
    /**
     * Search contacts
     */
    async searchContacts(query, userId, options, tx) {
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
            where.userId = userId;
        }
        return this.findMany(where, {
            include: {
                jobConnections: true,
            },
            orderBy: { name: 'asc' },
            pagination: options?.pagination,
        }, tx);
    }
    /**
     * Find contact by email
     */
    async findByEmail(email, userId, tx) {
        const where = { email };
        if (userId) {
            where.userId = userId;
        }
        return this.findFirst(where, undefined, tx);
    }
    /**
     * Find contacts with LinkedIn profiles
     */
    async findWithLinkedIn(userId, tx) {
        const where = {
            linkedinUrl: { not: null },
        };
        if (userId) {
            where.userId = userId;
        }
        return this.findMany(where, {
            include: {
                jobConnections: true,
            },
            orderBy: { name: 'asc' },
        }, tx);
    }
    /**
     * Get contact statistics for a user
     */
    async getContactStats(userId, tx) {
        const client = tx || this.prisma;
        const [total, byCompany, byConnectionType, withEmail, withPhone, withLinkedIn,] = await Promise.all([
            client.contact.count({ where: { userId } }),
            client.contact.groupBy({
                by: ['company'],
                where: { userId, company: { not: null } },
                _count: { company: true },
                orderBy: { _count: { company: 'desc' } },
                take: 10,
            }),
            client.contact.groupBy({
                by: ['connectionType'],
                where: { userId, connectionType: { not: null } },
                _count: { connectionType: true },
            }),
            client.contact.count({ where: { userId, email: { not: null } } }),
            client.contact.count({ where: { userId, phone: { not: null } } }),
            client.contact.count({ where: { userId, linkedinUrl: { not: null } } }),
        ]);
        return {
            total,
            byCompany: byCompany.map(item => ({
                company: item.company || 'Unknown',
                count: item._count.company,
            })),
            byConnectionType: byConnectionType.map(item => ({
                connectionType: item.connectionType || 'Unknown',
                count: item._count.connectionType,
            })),
            withEmail,
            withPhone,
            withLinkedIn,
        };
    }
    /**
     * Update contact information
     */
    async updateContactInfo(id, data, tx) {
        return this.update(id, data, undefined, tx);
    }
    /**
     * Build filters for where clause
     */
    buildFiltersWhere(filters) {
        const where = {};
        if (filters.company) {
            where.company = { contains: filters.company, mode: 'insensitive' };
        }
        if (filters.role) {
            where.role = { contains: filters.role, mode: 'insensitive' };
        }
        if (filters.connectionType) {
            where.connectionType = filters.connectionType;
        }
        if (filters.hasEmail !== undefined) {
            if (filters.hasEmail) {
                where.email = { not: null };
            }
            else {
                where.email = null;
            }
        }
        if (filters.hasPhone !== undefined) {
            if (filters.hasPhone) {
                where.phone = { not: null };
            }
            else {
                where.phone = null;
            }
        }
        if (filters.hasLinkedin !== undefined) {
            if (filters.hasLinkedin) {
                where.linkedinUrl = { not: null };
            }
            else {
                where.linkedinUrl = null;
            }
        }
        return where;
    }
}
//# sourceMappingURL=contact.repository.js.map