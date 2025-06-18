/**
 * Tag Routes
 * 
 * Defines REST API routes for tag management operations.
 * Registers routes with Fastify including validation schemas, rate limiting, and handlers.
 */

import { FastifyInstance } from 'fastify';
import { tagController } from '../controllers/tag.controller.js';
import {
  listTagsSchema,
  addTagsToApplicationSchema,
  removeTagFromApplicationSchema,
  errorResponseSchema
} from '../schemas/tag.schema.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { securityMiddleware } from '../middleware/security.middleware.js';
import { commonErrorResponses } from '../utils/errorSchemas.js';

// Rate limiting configuration
const tagReadRateLimit = {
  max: 60, // 60 tag reads per minute
  timeWindow: 60 * 1000 // 1 minute
};

const tagModificationRateLimit = {
  max: 30, // 30 tag modifications per minute
  timeWindow: 60 * 1000 // 1 minute
};

/**
 * Register tag routes
 */
export default async function tagRoutes(fastify: FastifyInstance) {
  // Register rate limiting plugin
  await fastify.register(import('@fastify/rate-limit'));

  // Using shared error response schemas

  // GET /users/:userId/tags - List all tags for a specific user
  fastify.get('/users/:userId/tags', {
    config: {
      rateLimit: tagReadRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataAccessRateLimit()],
    schema: {
      ...listTagsSchema,
      response: {
        ...listTagsSchema.response,
        ...commonErrorResponses
      }
    },
    handler: tagController.listTags
  });

  // POST /applications/:id/tags - Add tags to a job application
  fastify.post('/applications/:id/tags', {
    config: {
      rateLimit: tagModificationRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()],
    schema: {
      ...addTagsToApplicationSchema,
      response: {
        ...addTagsToApplicationSchema.response,
        ...commonErrorResponses
      }
    },
    handler: tagController.addTagsToApplication
  });

  // DELETE /applications/:id/tags/:tagId - Remove a tag from a job application
  fastify.delete('/applications/:id/tags/:tagId', {
    config: {
      rateLimit: tagModificationRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()],
    schema: {
      ...removeTagFromApplicationSchema,
      response: {
        ...removeTagFromApplicationSchema.response,
        ...commonErrorResponses
      }
    },
    handler: tagController.removeTagFromApplication
  });
} 