/**
 * Tag Models
 *
 * Defines TypeScript interfaces and types for tag-related entities.
 * These models represent the structure of tag data used throughout the application.
 */
import { Tag, JobApplication } from '@prisma/client';
/**
 * Tag with related entities
 */
export type TagWithRelations = Tag & {
    jobApplication?: JobApplication;
};
/**
 * Tag filters for querying
 */
export interface TagFilters {
    search?: string;
    limit?: number;
}
/**
 * Request for adding tags to a job application
 */
export interface AddTagsRequest {
    tags: string[];
}
/**
 * Request for removing a tag
 */
export interface RemoveTagRequest {
    tagId: number;
}
/**
 * Query parameters for listing tags
 */
export interface ListTagsQuery {
    search?: string;
    limit?: number;
}
/**
 * URL parameters for tag-related routes
 */
export interface ListTagsParams {
    userId: string;
}
//# sourceMappingURL=tag.models.d.ts.map