/**
 * Tag Routes
 *
 * Defines REST API routes for tag management operations.
 * Registers routes with Fastify including validation schemas and handlers.
 */
import { listTags, addTagsToApplication, removeTagFromApplication } from '../controllers/tag.controller.js';
import { listTagsSchema, addTagsToApplicationSchema, removeTagFromApplicationSchema, errorResponseSchema } from '../schemas/tag.schema.js';
/**
 * Register tag routes
 */
export default async function tagRoutes(fastify) {
    // Add common error response schemas to all routes
    const commonErrorResponses = {
        400: errorResponseSchema,
        500: errorResponseSchema
    };
    /**
     * GET /api/users/:userId/tags
     * List all tags for a specific user with optional filtering
     */
    fastify.get('/users/:userId/tags', {
        schema: {
            ...listTagsSchema,
            response: {
                ...listTagsSchema.response,
                ...commonErrorResponses
            }
        },
        handler: listTags
    });
    /**
     * POST /api/applications/:id/tags
     * Add tags to a job application
     */
    fastify.post('/applications/:id/tags', {
        schema: {
            ...addTagsToApplicationSchema,
            response: {
                ...addTagsToApplicationSchema.response,
                404: errorResponseSchema,
                ...commonErrorResponses
            }
        },
        handler: addTagsToApplication
    });
    /**
     * DELETE /api/applications/:id/tags/:tagId
     * Remove a tag from a job application
     */
    fastify.delete('/applications/:id/tags/:tagId', {
        schema: {
            ...removeTagFromApplicationSchema,
            response: {
                ...removeTagFromApplicationSchema.response,
                404: errorResponseSchema,
                ...commonErrorResponses
            }
        },
        handler: removeTagFromApplication
    });
}
//# sourceMappingURL=tags.js.map