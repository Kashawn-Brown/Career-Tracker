/**
 * Tag Repository
 *
 * Handles all database operations related to tags.
 * Extends BaseRepository with tag-specific methods.
 */
import { Tag, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository.js';
export type TagWithRelations = Tag & {
    jobApplication?: any;
};
export declare class TagRepository extends BaseRepository<Tag, Prisma.TagCreateInput, Prisma.TagUpdateInput, Prisma.TagWhereInput> {
    constructor();
    /**
     * Find tags by job application
     */
    findByJobApplication(jobApplicationId: number, tx?: Prisma.TransactionClient): Promise<Tag[]>;
    /**
     * Find tags by user (through job applications)
     */
    findByUser(userId: number, tx?: Prisma.TransactionClient): Promise<TagWithRelations[]>;
    /**
     * Find popular tags for a user
     */
    findPopularTagsByUser(userId: number, limit?: number, tx?: Prisma.TransactionClient): Promise<{
        label: string;
        count: number;
    }[]>;
    /**
     * Search tags by label
     */
    searchTags(query: string, userId?: number, tx?: Prisma.TransactionClient): Promise<TagWithRelations[]>;
    /**
     * Find unique tag labels for a user
     */
    findUniqueTagLabels(userId: number, tx?: Prisma.TransactionClient): Promise<string[]>;
    /**
     * Create multiple tags for a job application
     */
    createManyForJobApplication(jobApplicationId: number, labels: string[], tx?: Prisma.TransactionClient): Promise<Tag[]>;
    /**
     * Delete all tags for a job application
     */
    deleteByJobApplication(jobApplicationId: number, tx?: Prisma.TransactionClient): Promise<{
        count: number;
    }>;
    /**
     * Replace tags for a job application
     */
    replaceTagsForJobApplication(jobApplicationId: number, labels: string[], tx?: Prisma.TransactionClient): Promise<Tag[]>;
    /**
     * Get tag statistics for a user
     */
    getTagStats(userId: number, tx?: Prisma.TransactionClient): Promise<{
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
    }>;
}
//# sourceMappingURL=tag.repository.d.ts.map