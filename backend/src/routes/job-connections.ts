/**
 * Job Connection Routes
 * 
 * Defines REST API routes for job connection CRUD operations.
 * Job connections are nested under job applications as they belong to specific applications.
 * Registers routes with Fastify including validation schemas and handlers.
 */

import { FastifyInstance } from 'fastify';
import {
  listJobConnections,
  getJobConnection,
  createJobConnection,
  updateJobConnection,
  updateJobConnectionStatus,
  deleteJobConnection
} from '../controllers/job-connection.controller.js';
import {
  listJobConnectionsSchema,
  getJobConnectionSchema,
  createJobConnectionSchema,
  updateJobConnectionSchema,
  updateJobConnectionStatusSchema,
  deleteJobConnectionSchema,
  errorResponseSchema
} from '../schemas/job-connection.schema.js';
import { requireAuth } from '../middleware/auth.middleware.js';

/**
 * Register job connection routes
 */
export default async function jobConnectionRoutes(fastify: FastifyInstance) {
  // Add common error response schemas to all routes
  const commonErrorResponses = {
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema
  };

  // ROUTES - Nested under /applications/:id/connections

  /**
   * GET /api/applications/:id/connections
   * List job connections for a specific application (user's own applications)
   */
  fastify.get('/applications/:id/connections', {
    preHandler: requireAuth,
    schema: {
      ...listJobConnectionsSchema,
      response: {
        ...listJobConnectionsSchema.response,
        404: errorResponseSchema, // Job application not found
        ...commonErrorResponses
      }
    },
    handler: listJobConnections
  });

  /**
   * GET /api/applications/:id/connections/:connectionId
   * Get a single job connection by ID (user's own applications)
   */
  fastify.get('/applications/:id/connections/:connectionId', {
    preHandler: requireAuth,
    schema: {
      ...getJobConnectionSchema,
      response: {
        ...getJobConnectionSchema.response,
        404: errorResponseSchema,
        ...commonErrorResponses
      }
    },
    handler: getJobConnection
  });

  /**
   * POST /api/applications/:id/connections
   * Create a new job connection for an application (user's own applications)
   */
  fastify.post('/applications/:id/connections', {
    preHandler: requireAuth,
    schema: {
      ...createJobConnectionSchema,
      response: {
        ...createJobConnectionSchema.response,
        404: errorResponseSchema, // Job application not found
        ...commonErrorResponses
      }
    },
    handler: createJobConnection
  });

  /**
   * PUT /api/applications/:id/connections/:connectionId
   * Update an existing job connection (user's own applications)
   */
  fastify.put('/applications/:id/connections/:connectionId', {
    preHandler: requireAuth,
    schema: {
      ...updateJobConnectionSchema,
      response: {
        ...updateJobConnectionSchema.response,
        404: errorResponseSchema,
        ...commonErrorResponses
      }
    },
    handler: updateJobConnection
  });

  /**
   * PATCH /api/applications/:id/connections/:connectionId/status
   * Update job connection status only (convenience endpoint)
   */
  fastify.patch('/applications/:id/connections/:connectionId/status', {
    preHandler: requireAuth,
    schema: {
      ...updateJobConnectionStatusSchema,
      response: {
        ...updateJobConnectionStatusSchema.response,
        404: errorResponseSchema,
        ...commonErrorResponses
      }
    },
    handler: updateJobConnectionStatus
  });

  /**
   * DELETE /api/applications/:id/connections/:connectionId
   * Delete a job connection (user's own applications)
   */
  fastify.delete('/applications/:id/connections/:connectionId', {
    preHandler: requireAuth,
    schema: {
      ...deleteJobConnectionSchema,
      response: {
        ...deleteJobConnectionSchema.response,
        404: errorResponseSchema,
        ...commonErrorResponses
      }
    },
    handler: deleteJobConnection
  });
} 