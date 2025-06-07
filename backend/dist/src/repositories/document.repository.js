/**
 * Document Repository
 *
 * Handles all database operations related to documents.
 * Extends BaseRepository with document-specific methods.
 */
import { BaseRepository } from './base.repository.js';
export class DocumentRepository extends BaseRepository {
    constructor() {
        super('document');
    }
    /**
     * Find document with job application relation
     */
    async findByIdWithRelations(id, tx) {
        return this.findById(id, {
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
     * Find documents by job application
     */
    async findByJobApplication(jobApplicationId, tx) {
        return this.findMany({ jobApplicationId }, {
            orderBy: { createdAt: 'desc' },
        }, tx);
    }
    /**
     * Find documents by user (through job applications)
     */
    async findByUser(userId, filters = {}, options, tx) {
        const where = {
            jobApplication: { userId },
            ...this.buildFiltersWhere(filters),
        };
        return this.findMany(where, {
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
            orderBy: options?.orderBy || { createdAt: 'desc' },
            pagination: options?.pagination,
        }, tx);
    }
    /**
     * Find documents by type
     */
    async findByType(type, userId, options, tx) {
        const where = { type };
        if (userId) {
            where.jobApplication = { userId };
        }
        return this.findMany(where, {
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
            pagination: options?.pagination,
        }, tx);
    }
    /**
     * Search documents by filename
     */
    async searchDocuments(query, userId, options, tx) {
        const where = {
            fileName: { contains: query, mode: 'insensitive' },
        };
        if (userId) {
            where.jobApplication = { userId };
        }
        return this.findMany(where, {
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
            orderBy: { fileName: 'asc' },
            pagination: options?.pagination,
        }, tx);
    }
    /**
     * Find documents by file extension
     */
    async findByFileExtension(extension, userId, tx) {
        const where = {
            fileName: { endsWith: extension, mode: 'insensitive' },
        };
        if (userId) {
            where.jobApplication = { userId };
        }
        return this.findMany(where, {
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
            orderBy: { fileName: 'asc' },
        }, tx);
    }
    /**
     * Get document statistics for a user
     */
    async getDocumentStats(userId, tx) {
        const client = tx || this.prisma;
        const [total, byType, totalSizeResult, avgSizeResult, recentUploads, allDocuments,] = await Promise.all([
            client.document.count({
                where: { jobApplication: { userId } },
            }),
            client.document.groupBy({
                by: ['type'],
                where: { jobApplication: { userId } },
                _count: { type: true },
            }),
            client.document.aggregate({
                where: { jobApplication: { userId }, fileSize: { not: null } },
                _sum: { fileSize: true },
            }),
            client.document.aggregate({
                where: { jobApplication: { userId }, fileSize: { not: null } },
                _avg: { fileSize: true },
            }),
            client.document.count({
                where: {
                    jobApplication: { userId },
                    createdAt: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                    },
                },
            }),
            client.document.findMany({
                where: { jobApplication: { userId } },
                select: { fileName: true },
            }),
        ]);
        // Process file extensions
        const extensionMap = new Map();
        allDocuments.forEach(doc => {
            const extension = doc.fileName.split('.').pop()?.toLowerCase() || 'unknown';
            extensionMap.set(extension, (extensionMap.get(extension) || 0) + 1);
        });
        const byFileExtension = Array.from(extensionMap.entries())
            .map(([extension, count]) => ({ extension, count }))
            .sort((a, b) => b.count - a.count);
        return {
            total,
            byType: byType.map(item => ({
                type: item.type,
                count: item._count.type,
            })),
            byFileExtension,
            totalSize: totalSizeResult._sum.fileSize || 0,
            averageSize: avgSizeResult._avg.fileSize || 0,
            recentUploads,
        };
    }
    /**
     * Find large documents
     */
    async findLargeDocuments(minSizeBytes, userId, tx) {
        const where = {
            fileSize: { gte: minSizeBytes },
        };
        if (userId) {
            where.jobApplication = { userId };
        }
        return this.findMany(where, {
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
            orderBy: { fileSize: 'desc' },
        }, tx);
    }
    /**
     * Find recent documents
     */
    async findRecentDocuments(userId, daysBack = 30, limit = 10, tx) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysBack);
        const where = {
            createdAt: { gte: cutoffDate },
        };
        if (userId) {
            where.jobApplication = { userId };
        }
        return this.findMany(where, {
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
            pagination: { page: 1, limit },
        }, tx);
    }
    /**
     * Update document metadata
     */
    async updateMetadata(id, data, tx) {
        return this.update(id, data, undefined, tx);
    }
    /**
     * Build filters for where clause
     */
    buildFiltersWhere(filters) {
        const where = {};
        if (filters.jobApplicationId) {
            where.jobApplicationId = filters.jobApplicationId;
        }
        if (filters.type) {
            where.type = filters.type;
        }
        if (filters.fileName) {
            where.fileName = { contains: filters.fileName, mode: 'insensitive' };
        }
        if (filters.fileSizeMin || filters.fileSizeMax) {
            where.fileSize = {};
            if (filters.fileSizeMin) {
                where.fileSize.gte = filters.fileSizeMin;
            }
            if (filters.fileSizeMax) {
                where.fileSize.lte = filters.fileSizeMax;
            }
        }
        if (filters.createdAfter || filters.createdBefore) {
            where.createdAt = {};
            if (filters.createdAfter) {
                where.createdAt.gte = filters.createdAfter;
            }
            if (filters.createdBefore) {
                where.createdAt.lte = filters.createdBefore;
            }
        }
        return where;
    }
}
//# sourceMappingURL=document.repository.js.map