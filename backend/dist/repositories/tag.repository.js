/**
 * Tag Repository
 *
 * Handles all database operations related to tags.
 * Extends BaseRepository with tag-specific methods.
 */
import { BaseRepository } from './base.repository';
export class TagRepository extends BaseRepository {
    constructor() {
        super('tag');
    }
    /**
     * Find tags by job application
     */
    async findByJobApplication(jobApplicationId, tx) {
        return this.findMany({ jobApplicationId }, {
            orderBy: { createdAt: 'desc' },
        }, tx);
    }
    /**
     * Find tags by user (through job applications)
     */
    async findByUser(userId, tx) {
        return this.findMany({
            jobApplication: {
                userId,
            },
        }, {
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
     * Find popular tags for a user
     */
    async findPopularTagsByUser(userId, limit = 10, tx) {
        const client = tx || this.prisma;
        const result = await client.tag.groupBy({
            by: ['label'],
            where: {
                jobApplication: {
                    userId,
                },
            },
            _count: {
                label: true,
            },
            orderBy: {
                _count: {
                    label: 'desc',
                },
            },
            take: limit,
        });
        return result.map(item => ({
            label: item.label,
            count: item._count.label,
        }));
    }
    /**
     * Search tags by label
     */
    async searchTags(query, userId, tx) {
        const where = {
            label: { contains: query, mode: 'insensitive' },
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
            orderBy: { label: 'asc' },
        }, tx);
    }
    /**
     * Find unique tag labels for a user
     */
    async findUniqueTagLabels(userId, tx) {
        const client = tx || this.prisma;
        const result = await client.tag.findMany({
            where: {
                jobApplication: {
                    userId,
                },
            },
            select: {
                label: true,
            },
            distinct: ['label'],
            orderBy: {
                label: 'asc',
            },
        });
        return result.map(tag => tag.label);
    }
    /**
     * Create multiple tags for a job application
     */
    async createManyForJobApplication(jobApplicationId, labels, tx) {
        const client = tx || this.prisma;
        const tagData = labels.map(label => ({
            label: label.trim(),
            jobApplicationId,
        }));
        const result = await client.tag.createMany({
            data: tagData,
            skipDuplicates: true,
        });
        // Return the created tags
        return this.findByJobApplication(jobApplicationId, tx);
    }
    /**
     * Delete all tags for a job application
     */
    async deleteByJobApplication(jobApplicationId, tx) {
        return this.deleteMany({ jobApplicationId }, tx);
    }
    /**
     * Replace tags for a job application
     */
    async replaceTagsForJobApplication(jobApplicationId, labels, tx) {
        if (tx) {
            // If we're already in a transaction, execute directly
            await this.deleteByJobApplication(jobApplicationId, tx);
            if (labels.length > 0) {
                return this.createManyForJobApplication(jobApplicationId, labels, tx);
            }
            return [];
        }
        else {
            // Create a new transaction
            return this.prisma.$transaction(async (txClient) => {
                // Delete existing tags
                await this.deleteByJobApplication(jobApplicationId, txClient);
                // Create new tags if any
                if (labels.length > 0) {
                    return this.createManyForJobApplication(jobApplicationId, labels, txClient);
                }
                return [];
            });
        }
    }
    /**
     * Get tag statistics for a user
     */
    async getTagStats(userId, tx) {
        const client = tx || this.prisma;
        const [total, uniqueLabels, mostUsed, byJobApplication,] = await Promise.all([
            client.tag.count({
                where: {
                    jobApplication: { userId },
                },
            }),
            this.findUniqueTagLabels(userId, tx),
            this.findPopularTagsByUser(userId, 5, tx),
            client.jobApplication.findMany({
                where: { userId },
                select: {
                    id: true,
                    company: true,
                    position: true,
                    _count: {
                        select: {
                            tags: true,
                        },
                    },
                },
                orderBy: {
                    tags: {
                        _count: 'desc',
                    },
                },
                take: 10,
            }),
        ]);
        return {
            total,
            unique: uniqueLabels.length,
            mostUsed,
            byJobApplication: byJobApplication.map(job => ({
                jobApplicationId: job.id,
                company: job.company,
                position: job.position,
                tagCount: job._count.tags,
            })),
        };
    }
}
//# sourceMappingURL=tag.repository.js.map