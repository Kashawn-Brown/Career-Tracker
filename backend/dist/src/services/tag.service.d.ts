/**
 * Tag Service
 *
 * Business logic layer for tag operations.
 * Handles validation, business rules, and coordinates repository calls.
 */
import { TagFilters, AddTagsRequest, RemoveTagRequest } from '../models/tag.models.js';
interface TagServiceFilters extends TagFilters {
    userId: number;
}
interface ServiceAddTagsRequest extends AddTagsRequest {
    jobApplicationId: number;
}
interface ServiceRemoveTagRequest extends RemoveTagRequest {
    jobApplicationId: number;
}
export declare class TagService {
    /**
     * Get tags for a specific user with optional search
     */
    getUserTags(filters: TagServiceFilters): Promise<import("../models/tag.models.js").TagWithRelations[]>;
    /**
     * Add tags to a job application with business validation
     */
    addTagsToApplication(request: ServiceAddTagsRequest): Promise<{
        id: number;
        createdAt: Date;
        jobApplicationId: number;
        label: string;
    }[]>;
    /**
     * Remove a tag from a job application with business validation
     */
    removeTagFromApplication(request: ServiceRemoveTagRequest): Promise<{
        message: string;
        deletedTagId: number;
    }>;
}
export declare const tagService: TagService;
export {};
//# sourceMappingURL=tag.service.d.ts.map