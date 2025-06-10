/**
 * User Profile Routes
 * 
 * Defines REST API routes for user profile operations.
 * Registers routes with Fastify including validation schemas and handlers.
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

/**
 * Register user profile routes
 */
export default async function userProfileRoutes(fastify: FastifyInstance) {
  // Add common error response schemas to all routes
  const commonErrorResponses = {
    400: ErrorResponseSchema,
    401: ErrorResponseSchema,
    403: ErrorResponseSchema,
    500: ErrorResponseSchema
  };

  // ROUTES

  /**
   * GET /api/user
   * Get the authenticated user's profile
   */
  fastify.get('/user', {
    preHandler: requireAuth,
    schema: {
      ...getUserProfileSchema,
      response: {
        ...getUserProfileSchema.response,
        404: ErrorResponseSchema,
        ...commonErrorResponses
      }
    },
    handler: getUserProfile
  });

  /**
   * PUT /api/user
   * Update the authenticated user's profile
   */
  fastify.put('/user', {
    preHandler: requireAuth,
    schema: {
      ...updateUserProfileSchema,
      response: {
        ...updateUserProfileSchema.response,
        404: ErrorResponseSchema,
        409: ErrorResponseSchema, // For conflict when email is already in use
        ...commonErrorResponses
      }
    },
    handler: updateUserProfile
  });
} 