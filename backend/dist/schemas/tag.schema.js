/**
 * Tag API Schemas
 *
 * Defines JSON schemas for tag REST API endpoints.
 * These schemas are used by Fastify for request/response validation and automatic OpenAPI documentation.
 */
// Base tag response schema
const tagResponseSchema = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        label: { type: 'string' },
        jobApplicationId: { type: 'integer' },
        createdAt: { type: 'string', format: 'date-time' }
    }
};
// Schema for listing all tags for a user
export const listTagsSchema = {
    params: {
        type: 'object',
        required: ['userId'],
        properties: {
            userId: { type: 'string', pattern: '^[1-9]\\d*$' }
        }
    },
    querystring: {
        type: 'object',
        properties: {
            search: { type: 'string', minLength: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
        },
        additionalProperties: false
    },
    response: {
        200: {
            type: 'array',
            items: {
                ...tagResponseSchema,
                properties: {
                    ...tagResponseSchema.properties,
                    jobApplication: {
                        type: 'object',
                        properties: {
                            id: { type: 'integer' },
                            company: { type: 'string' },
                            position: { type: 'string' },
                            status: { type: 'string' }
                        }
                    }
                }
            }
        }
    }
};
// Schema for adding tags to a user's job application 
export const addTagsToApplicationSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', pattern: '^[1-9]\\d*$' }
        }
    },
    body: {
        type: 'object',
        required: ['tags'],
        properties: {
            tags: {
                type: 'array',
                items: { type: 'string', minLength: 1, maxLength: 50 },
                minItems: 1,
                maxItems: 20
            }
        },
        additionalProperties: false
    },
    response: {
        200: {
            type: 'array',
            items: tagResponseSchema
        }
    }
};
// Schema for removing a tag from a user's job application
export const removeTagFromApplicationSchema = {
    params: {
        type: 'object',
        required: ['id', 'tagId'],
        properties: {
            id: { type: 'string', pattern: '^[1-9]\\d*$' },
            tagId: { type: 'string', pattern: '^[1-9]\\d*$' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                deletedTagId: { type: 'integer' }
            }
        }
    }
};
// Common error response schema for all tag API endpoints
export const errorResponseSchema = {
    type: 'object',
    properties: {
        error: { type: 'string' },
        message: { type: 'string' }
    }
};
//# sourceMappingURL=tag.schema.js.map