/**
 * Tag Controller
 *
 * Handles HTTP requests for tag management operations.
 * Implements proper error handling, validation, and response formatting.
 * Uses TagService for business logic to maintain separation of concerns.
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { ListTagsQuery, ListTagsParams, AddTagsRequest } from '../models/tag.models.js';
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
//# sourceMappingURL=tag.controller.d.ts.map