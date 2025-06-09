/**
 * Job Application Routes
 * 
 * Defines REST API routes for job application CRUD operations.
 * Registers routes with Fastify including validation schemas and handlers.
 */

import { FastifyInstance } from 'fastify';
import {
  listJobApplications,
  getJobApplication,
  createJobApplication,
  updateJobApplication,
  deleteJobApplication
} from '../controllers/job-application.controller.js';
import {
  listJobApplicationsSchema,
  getJobApplicationSchema,
  createJobApplicationSchema,
  updateJobApplicationSchema,
  deleteJobApplicationSchema,
  errorResponseSchema
} from '../schemas/job-application.schema.js';
import { requireAuth } from '../middleware/auth.middleware.js';

/**
 * Register job application routes
 */
export default async function jobApplicationRoutes(fastify: FastifyInstance) {
  // Add common error response schemas to all routes
  const commonErrorResponses = {
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema
  };

  // ROUTES

  /**
   * GET /api/applications
   * List job applications with pagination and filtering (user's own applications)
   */
  fastify.get('/applications', {
    preHandler: requireAuth,
    schema: {
      ...listJobApplicationsSchema,
      response: {
        ...listJobApplicationsSchema.response,
        ...commonErrorResponses
      }
    },
    handler: listJobApplications
  });

  /**
   * GET /api/applications/:id
   * Get a single job application by ID (user's own application)
   */
  fastify.get('/applications/:id', {
    preHandler: requireAuth,
    schema: {
      ...getJobApplicationSchema,
      response: {
        ...getJobApplicationSchema.response,
        404: errorResponseSchema,
        ...commonErrorResponses
      }
    },
    handler: getJobApplication
  });

  /**
   * POST /api/applications
   * Create a new job application (authenticated user)
   */
  fastify.post('/applications', {
    preHandler: requireAuth,
    schema: {
      ...createJobApplicationSchema,
      response: {
        ...createJobApplicationSchema.response,
        ...commonErrorResponses
      }
    },
    handler: createJobApplication
  });

  /**
   * PUT /api/applications/:id
   * Update an existing job application (user's own application)
   */
  fastify.put('/applications/:id', {
    preHandler: requireAuth,
    schema: {
      ...updateJobApplicationSchema,
      response: {
        ...updateJobApplicationSchema.response,
        404: errorResponseSchema,
        ...commonErrorResponses
      }
    },
    handler: updateJobApplication
  });

  /**
   * DELETE /api/applications/:id
   * Delete a job application (user's own application)
   */
  fastify.delete('/applications/:id', {
    preHandler: requireAuth,
    schema: {
      ...deleteJobApplicationSchema,
      response: {
        ...deleteJobApplicationSchema.response,
        404: errorResponseSchema,
        ...commonErrorResponses
      }
    },
    handler: deleteJobApplication
  });
} 