/**
 * Tag Service
 *
 * Business logic layer for tag operations.
 * Handles validation, business rules, and coordinates repository calls.
 */
export interface TagFilters {
    search?: string;
    limit?: number;
    userId: number;
}
export interface AddTagsRequest {
    jobApplicationId: number;
    tags: string[];
}
export interface RemoveTagRequest {
    jobApplicationId: number;
    tagId: number;
}
export declare class TagService {
    /**
     * Get tags for a specific user with optional search
     */
    getUserTags(filters: TagFilters): Promise<import("../repositories/tag.repository.js").TagWithRelations[]>;
    /**
     * Add tags to a job application with business validation
     */
    addTagsToApplication(request: AddTagsRequest): Promise<{
        id: number;
        createdAt: Date;
        jobApplicationId: number;
        label: string;
    }[]>;
    /**
     * Remove a tag from a job application with business validation
     */
    removeTagFromApplication(request: RemoveTagRequest): Promise<{
        message: string;
        deletedTagId: number;
    }>;
}
export declare const tagService: TagService;
//# sourceMappingURL=tag.service.d.ts.map