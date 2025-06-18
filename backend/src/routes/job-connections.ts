/**
 * Job Connection Routes
 * 
 * Defines REST API routes for job connection CRUD operations.
 * Job connections are nested under job applications as they belong to specific applications.
 * Registers routes with Fastify including validation schemas, rate limiting, and handlers.
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
import { securityMiddleware } from '../middleware/security.middleware.js';
import { commonErrorResponses } from '../utils/errorSchemas.js';

// Rate limiting configuration
const connectionReadRateLimit = {
  max: 60, // 60 connection reads per minute
  timeWindow: 60 * 1000 // 1 minute
};

const connectionModificationRateLimit = {
  max: 30, // 30 connection modifications per minute
  timeWindow: 60 * 1000 // 1 minute
};

/**
 * Register job connection routes
 */
export default async function jobConnectionRoutes(fastify: FastifyInstance) {
  // Register rate limiting plugin
  await fastify.register(import('@fastify/rate-limit'));

  // Using shared error response schemas

  // GET /applications/:id/connections - List job connections for a specific application
  fastify.get('/applications/:id/connections', {
    config: {
      rateLimit: connectionReadRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataAccessRateLimit()],
    schema: {
      ...listJobConnectionsSchema,
      response: {
        ...listJobConnectionsSchema.response,
        ...commonErrorResponses
      }
    },
    handler: listJobConnections
  });

  // GET /applications/:id/connections/:connectionId - Get a single job connection by ID
  fastify.get('/applications/:id/connections/:connectionId', {
    config: {
      rateLimit: connectionReadRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataAccessRateLimit()],
    schema: {
      ...getJobConnectionSchema,
      response: {
        ...getJobConnectionSchema.response,
        ...commonErrorResponses
      }
    },
    handler: getJobConnection
  });

  // POST /applications/:id/connections - Create a new job connection for an application
  fastify.post('/applications/:id/connections', {
    config: {
      rateLimit: connectionModificationRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()],
    schema: {
      ...createJobConnectionSchema,
      response: {
        ...createJobConnectionSchema.response,
        ...commonErrorResponses
      }
    },
    handler: createJobConnection
  });

  // PUT /applications/:id/connections/:connectionId - Update an existing job connection
  fastify.put('/applications/:id/connections/:connectionId', {
    config: {
      rateLimit: connectionModificationRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()],
    schema: {
      ...updateJobConnectionSchema,
      response: {
        ...updateJobConnectionSchema.response,
        ...commonErrorResponses
      }
    },
    handler: updateJobConnection
  });

  // PATCH /applications/:id/connections/:connectionId/status - Update job connection status only
  fastify.patch('/applications/:id/connections/:connectionId/status', {
    config: {
      rateLimit: connectionModificationRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()],
    schema: {
      ...updateJobConnectionStatusSchema,
      response: {
        ...updateJobConnectionStatusSchema.response,
        ...commonErrorResponses
      }
    },
    handler: updateJobConnectionStatus
  });

  // DELETE /applications/:id/connections/:connectionId - Delete a job connection
  fastify.delete('/applications/:id/connections/:connectionId', {
    config: {
      rateLimit: connectionModificationRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()],
    schema: {
      ...deleteJobConnectionSchema,
      response: {
        ...deleteJobConnectionSchema.response,
        ...commonErrorResponses
      }
    },
    handler: deleteJobConnection
  });
} 