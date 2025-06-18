/**
 * User Profile Routes
 * 
 * Defines REST API routes for user profile operations.
 * Registers routes with Fastify including validation schemas, rate limiting, and handlers.
 */

import { FastifyInstance } from 'fastify';
import {
  getUserProfile,
  updateUserProfile
} from '../controllers/user-profile.controller.js';
import {
  getUserProfileSchema,
  updateUserProfileSchema,
  ErrorResponseSchema
} from '../schemas/user-profile.schema.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { securityMiddleware } from '../middleware/security.middleware.js';
import { commonErrorResponses } from '../utils/errorSchemas.js';

// Rate limiting configuration
const profileReadRateLimit = {
  max: 60, // 60 profile reads per minute
  timeWindow: 60 * 1000 // 1 minute
};

const profileUpdateRateLimit = {
  max: 10, // 10 profile updates per minute
  timeWindow: 60 * 1000 // 1 minute
};

/**
 * Register user profile routes
 */
export default async function userProfileRoutes(fastify: FastifyInstance) {
  // Register rate limiting plugin
  await fastify.register(import('@fastify/rate-limit'));

  // Using shared error response schemas

  // GET /user - Get the authenticated user's profile
  fastify.get('/user', {
    config: {
      rateLimit: profileReadRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataAccessRateLimit()],
    schema: {
      ...getUserProfileSchema,
      response: {
        ...getUserProfileSchema.response,
        ...commonErrorResponses
      }
    },
    handler: getUserProfile
  });

  // PUT /user - Update the authenticated user's profile
  fastify.put('/user', {
    config: {
      rateLimit: profileUpdateRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()],
    schema: {
      ...updateUserProfileSchema,
      response: {
        ...updateUserProfileSchema.response,
        ...commonErrorResponses
      }
    },
    handler: updateUserProfile
  });
} 