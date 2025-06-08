/**
 * Tag Repository
 *
 * Handles all database operations related to tags.
 * Updated for many-to-many relationship between tags and job applications.
 * Extends BaseRepository with tag-specific methods.
 */
import { BaseRepository } from './base.repository.js';
export class TagRepository extends BaseRepository {
    constructor() {
        super('tag');
    }
    /**
     * Find or create a tag by name
     * Core method for the new tag system - ensures unique tags
     */
    async findOrCreateTag(name, tx) {
        const client = tx || this.prisma;
        // First try to find existing tag
        let tag = await client.tag.findUnique({
            where: { name: name.trim() }
        });
        // Create if doesn't exist
        if (!tag) {
            tag = await client.tag.create({
                data: { name: name.trim() }
            });
        }
        return tag;
    }
    /**
     * Find tags by job application ID
     */
    async findByJobApplication(jobApplicationId, tx) {
        const client = tx || this.prisma;
        const jobApp = await client.jobApplication.findUnique({
            where: { id: jobApplicationId },
            include: { tags: true }
        });
        return jobApp?.tags || [];
    }
    /**
     * Find tags by user (through job applications)
     */
    async findByUser(userId, tx) {
        const client = tx || this.prisma;
        return client.tag.findMany({
            where: {
                jobApplications: {
                    some: { userId }
                }
            },
            include: {
                jobApplications: {
                    where: { userId }
                }
            },
            orderBy: { name: 'asc' }
        });
    }
    /**
     * Search tags for suggestions (case-insensitive)
     */
    async suggestTags(query, userId, limit = 10, tx) {
        const client = tx || this.prisma;
        const where = {
            name: { contains: query.trim(), mode: 'insensitive' }
        };
        // Optionally filter to user's tags only
        if (userId) {
            where.jobApplications = {
                some: { userId }
            };
        }
        const tags = await client.tag.findMany({
            where,
            include: {
                _count: {
                    select: { jobApplications: true }
                },
                ...(userId && {
                    jobApplications: {
                        where: { userId },
                        select: { id: true }
                    }
                })
            },
            orderBy: [
                { name: 'asc' }
            ],
            take: limit
        });
        return tags.map(tag => ({
            id: tag.id,
            name: tag.name,
            usageCount: tag._count.jobApplications
        }));
    }
    /**
     * Add tags to a job application
     * Creates tags if they don't exist, associates existing ones
     */
    async addTagsToJobApplication(jobApplicationId, tagNames, tx) {
        const client = tx || this.prisma;
        // Find or create all tags
        const tags = await Promise.all(tagNames.map(name => this.findOrCreateTag(name, client)));
        // Connect tags to job application
        await client.jobApplication.update({
            where: { id: jobApplicationId },
            data: {
                tags: {
                    connect: tags.map(tag => ({ id: tag.id }))
                }
            }
        });
        return tags;
    }
    /**
     * Remove tags from a job application
     */
    async removeTagsFromJobApplication(jobApplicationId, tagNames, tx) {
        const client = tx || this.prisma;
        // Find tags by name
        const tags = await client.tag.findMany({
            where: { name: { in: tagNames } }
        });
        if (tags.length > 0) {
            // Disconnect tags from job application
            await client.jobApplication.update({
                where: { id: jobApplicationId },
                data: {
                    tags: {
                        disconnect: tags.map(tag => ({ id: tag.id }))
                    }
                }
            });
        }
    }
    /**
     * Replace all tags for a job application
     */
    async replaceTagsForJobApplication(jobApplicationId, tagNames, tx) {
        const client = tx || this.prisma;
        // Find or create all new tags
        const newTags = await Promise.all(tagNames.map(name => this.findOrCreateTag(name, client)));
        // Replace all tags
        await client.jobApplication.update({
            where: { id: jobApplicationId },
            data: {
                tags: {
                    set: newTags.map(tag => ({ id: tag.id }))
                }
            }
        });
        return newTags;
    }
    /**
     * Find popular tags for a user
     */
    async findPopularTagsByUser(userId, limit = 10, tx) {
        const client = tx || this.prisma;
        const tags = await client.tag.findMany({
            where: {
                jobApplications: {
                    some: { userId }
                }
            },
            include: {
                _count: {
                    select: {
                        jobApplications: {
                            where: { userId }
                        }
                    }
                }
            },
            orderBy: {
                name: 'asc'
            },
            take: limit
        });
        return tags.map(tag => ({
            id: tag.id,
            name: tag.name,
            usageCount: tag._count.jobApplications
        }));
    }
    /**
     * Get tag statistics for a user
     */
    async getTagStats(userId, tx) {
        const client = tx || this.prisma;
        const [totalTags, mostUsed] = await Promise.all([
            // Count unique tags used by user
            client.tag.count({
                where: {
                    jobApplications: {
                        some: { userId }
                    }
                }
            }),
            // Get most used tags
            this.findPopularTagsByUser(userId, 5, client)
        ]);
        const totalUsages = mostUsed.reduce((sum, tag) => sum + (tag.usageCount || 0), 0);
        return {
            totalTags,
            totalUsages,
            mostUsed
        };
    }
    /**
     * Clean up orphaned tags (no job applications)
     * Optional maintenance method
     */
    async cleanupOrphanedTags(tx) {
        const client = tx || this.prisma;
        const result = await client.tag.deleteMany({
            where: {
                jobApplications: {
                    none: {}
                }
            }
        });
        return result.count;
    }
    /**
     * Find all unique tag names (for auto-complete)
     */
    async findAllTagNames(userId, tx) {
        const client = tx || this.prisma;
        const where = userId ? {
            jobApplications: {
                some: { userId }
            }
        } : {};
        const tags = await client.tag.findMany({
            where,
            select: { name: true },
            orderBy: { name: 'asc' }
        });
        return tags.map(tag => tag.name);
    }
}
//# sourceMappingURL=tag.repository.js.map