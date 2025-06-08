/**
 * Tag Repository
 *
 * Handles all database operations related to tags.
 * Updated for many-to-many relationship between tags and job applications.
 * Extends BaseRepository with tag-specific methods.
 */
import { Tag, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository.js';
import { TagWithRelations, TagSuggestion } from '../models/tag.models.js';
export declare class TagRepository extends BaseRepository<Tag, Prisma.TagCreateInput, Prisma.TagUpdateInput, Prisma.TagWhereInput> {
    constructor();
    /**
     * Find or create a tag by name
     * Core method for the new tag system - ensures unique tags
     */
    findOrCreateTag(name: string, tx?: Prisma.TransactionClient): Promise<Tag>;
    /**
     * Find tags by job application ID
     */
    findByJobApplication(jobApplicationId: number, tx?: Prisma.TransactionClient): Promise<Tag[]>;
    /**
     * Find tags by user (through job applications)
     */
    findByUser(userId: number, tx?: Prisma.TransactionClient): Promise<TagWithRelations[]>;
    /**
     * Search tags for suggestions (case-insensitive)
     */
    suggestTags(query: string, userId?: number, limit?: number, tx?: Prisma.TransactionClient): Promise<TagSuggestion[]>;
    /**
     * Add tags to a job application
     * Creates tags if they don't exist, associates existing ones
     */
    addTagsToJobApplication(jobApplicationId: number, tagNames: string[], tx?: Prisma.TransactionClient): Promise<Tag[]>;
    /**
     * Remove tags from a job application
     */
    removeTagsFromJobApplication(jobApplicationId: number, tagNames: string[], tx?: Prisma.TransactionClient): Promise<void>;
    /**
     * Replace all tags for a job application
     */
    replaceTagsForJobApplication(jobApplicationId: number, tagNames: string[], tx?: Prisma.TransactionClient): Promise<Tag[]>;
    /**
     * Find popular tags for a user
     */
    findPopularTagsByUser(userId: number, limit?: number, tx?: Prisma.TransactionClient): Promise<TagSuggestion[]>;
    /**
     * Get tag statistics for a user
     */
    getTagStats(userId: number, tx?: Prisma.TransactionClient): Promise<{
        totalTags: number;
        totalUsages: number;
        mostUsed: TagSuggestion[];
    }>;
    /**
     * Clean up orphaned tags (no job applications)
     * Optional maintenance method
     */
    cleanupOrphanedTags(tx?: Prisma.TransactionClient): Promise<number>;
    /**
     * Find all unique tag names (for auto-complete)
     */
    findAllTagNames(userId?: number, tx?: Prisma.TransactionClient): Promise<string[]>;
}
//# sourceMappingURL=tag.repository.d.ts.map