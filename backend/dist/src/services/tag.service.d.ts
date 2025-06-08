/**
 * Tag Service
 *
 * Business logic layer for tag operations.
 * Updated for many-to-many relationship and tag suggestions.
 * Handles validation, business rules, and coordinates repository calls.
 */
import { TagFilters, AddTagsRequest, RemoveTagsRequest, RemoveTagRequest, TagSuggestion, TagSuggestionsQuery, TagStats } from '../models/tag.models.js';
interface TagServiceFilters extends TagFilters {
    userId: number;
}
interface ServiceAddTagsRequest extends AddTagsRequest {
    jobApplicationId: number;
}
interface ServiceRemoveTagsRequest extends RemoveTagsRequest {
    jobApplicationId: number;
}
interface ServiceRemoveTagRequest extends RemoveTagRequest {
    jobApplicationId: number;
}
export declare class TagService {
    /**
     * Get tags for a specific user with optional search
     */
    getUserTags(filters: TagServiceFilters): Promise<import("../models/tag.models.js").TagWithRelations[] | TagSuggestion[]>;
    /**
     * Get tag suggestions based on query string
     */
    getTagSuggestions(query: TagSuggestionsQuery): Promise<TagSuggestion[]>;
    /**
     * Add tags to a job application with business validation
     */
    addTagsToApplication(request: ServiceAddTagsRequest): Promise<{
        name: string;
        id: number;
        createdAt: Date;
    }[]>;
    /**
     * Remove tags from a job application with business validation
     */
    removeTagsFromApplication(request: ServiceRemoveTagsRequest): Promise<{
        message: string;
        removedTagNames: string[];
    }>;
    /**
     * Remove a single tag from a job application (legacy support)
     */
    removeTagFromApplication(request: ServiceRemoveTagRequest): Promise<{
        message: string;
        removedTagNames: string[];
    }>;
    /**
     * Replace all tags for a job application
     */
    replaceTagsForApplication(request: ServiceAddTagsRequest): Promise<{
        name: string;
        id: number;
        createdAt: Date;
    }[]>;
    /**
     * Get tag statistics for a user
     */
    getTagStats(userId: number): Promise<TagStats>;
    /**
     * Get all unique tag names for a user (useful for autocomplete)
     */
    getAllTagNames(userId?: number): Promise<string[]>;
    /**
     * Clean up orphaned tags (maintenance operation)
     */
    cleanupOrphanedTags(): Promise<{
        removedCount: number;
    }>;
    /**
     * Get tags for a specific job application
     */
    getTagsForJobApplication(jobApplicationId: number): Promise<{
        name: string;
        id: number;
        createdAt: Date;
    }[]>;
}
export declare const tagService: TagService;
export {};
//# sourceMappingURL=tag.service.d.ts.map