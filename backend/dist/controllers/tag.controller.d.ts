/**
 * Tag Controller
 *
 * Handles HTTP requests for tag management operations.
 * Implements proper error handling, validation, and response formatting.
 */
import { FastifyRequest, FastifyReply } from 'fastify';
interface ListTagsQuery {
    search?: string;
    limit?: number;
}
interface ListTagsParams {
    userId: string;
}
interface AddTagsRequest {
    tags: string[];
}
/**
 * List all tags with optional filtering
 */
export declare function listTags(request: FastifyRequest<{
    Params: ListTagsParams;
    Querystring: ListTagsQuery;
}>, reply: FastifyReply): Promise<never>;
/**
 * Add tags to a job application
 */
export declare function addTagsToApplication(request: FastifyRequest<{
    Params: {
        id: string;
    };
    Body: AddTagsRequest;
}>, reply: FastifyReply): Promise<never>;
/**
 * Remove a tag from a job application
 */
export declare function removeTagFromApplication(request: FastifyRequest<{
    Params: {
        id: string;
        tagId: string;
    };
}>, reply: FastifyReply): Promise<never>;
export {};
//# sourceMappingURL=tag.controller.d.ts.map