/**
 * Job Application Routes
 * 
 * Defines REST API routes for job application CRUD operations.
 * Registers routes with Fastify including validation schemas, rate limiting, and handlers.
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
import { securityMiddleware } from '../middleware/security.middleware.js';
import { commonErrorResponses } from '../utils/errorSchemas.js';

// Rate limiting configuration
const applicationReadRateLimit = {
  max: 60, // 60 application reads per minute
  timeWindow: 60 * 1000 // 1 minute
};

const applicationModificationRateLimit = {
  max: 30, // 30 application modifications per minute
  timeWindow: 60 * 1000 // 1 minute
};

/**
 * Register job application routes
 */
export default async function jobApplicationRoutes(fastify: FastifyInstance) {
  // Register rate limiting plugin
  await fastify.register(import('@fastify/rate-limit'));

  // Using shared error response schemas

  // GET /applications - List job applications with pagination and filtering
  fastify.get('/applications', {
    config: {
      rateLimit: applicationReadRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataAccessRateLimit()],
    schema: {
      ...listJobApplicationsSchema,
      response: {
        ...listJobApplicationsSchema.response,
        ...commonErrorResponses
      }
    },
    handler: listJobApplications
  });

  // GET /applications/:id - Get a single job application by ID
  fastify.get('/applications/:id', {
    config: {
      rateLimit: applicationReadRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataAccessRateLimit()],
    schema: {
      ...getJobApplicationSchema,
      response: {
        ...getJobApplicationSchema.response,
        ...commonErrorResponses
      }
    },
    handler: getJobApplication
  });

  // POST /applications - Create a new job application
  fastify.post('/applications', {
    config: {
      rateLimit: applicationModificationRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()],
    schema: {
      ...createJobApplicationSchema,
      response: {
        ...createJobApplicationSchema.response,
        ...commonErrorResponses
      }
    },
    handler: createJobApplication
  });

  // PUT /applications/:id - Update an existing job application
  fastify.put('/applications/:id', {
    config: {
      rateLimit: applicationModificationRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()],
    schema: {
      ...updateJobApplicationSchema,
      response: {
        ...updateJobApplicationSchema.response,
        ...commonErrorResponses
      }
    },
    handler: updateJobApplication
  });

  // DELETE /applications/:id - Delete a job application
  fastify.delete('/applications/:id', {
    config: {
      rateLimit: applicationModificationRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()],
    schema: {
      ...deleteJobApplicationSchema,
      response: {
        ...deleteJobApplicationSchema.response,
        ...commonErrorResponses
      }
    },
    handler: deleteJobApplication
  });
} 