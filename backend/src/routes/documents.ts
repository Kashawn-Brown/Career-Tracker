/**
 * Document Routes
 * 
 * Defines REST API routes for document CRUD operations.
 * Registers routes with Fastify including validation schemas, rate limiting, middleware, and handlers.
 * Follows standardized security and error handling patterns.
 */

import { FastifyInstance } from 'fastify';
import {
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument
} from '../controllers/document.controller.js';
import {
  uploadDocumentSchema,
  listDocumentsSchema,
  getDocumentSchema,
  deleteDocumentSchema,
  errorResponseSchema
} from '../schemas/document.schema.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { uploadSingle } from '../middleware/upload.middleware.js';
import { securityMiddleware } from '../middleware/security.middleware.js';

// Rate limiting configuration - following standardized patterns
const fileUploadRateLimit = {
  max: 10, // 10 uploads per 5 minutes (resource-intensive)
  timeWindow: 5 * 60 * 1000 // 5 minutes
};

const documentReadRateLimit = {
  max: 60, // 60 document reads per minute
  timeWindow: 60 * 1000 // 1 minute
};

const documentModificationRateLimit = {
  max: 20, // 20 modifications per minute
  timeWindow: 60 * 1000 // 1 minute
};

/**
 * Register document routes
 */
export default async function documentRoutes(fastify: FastifyInstance) {
  // Register rate limiting plugin
  await fastify.register(import('@fastify/rate-limit'));

  // Add common error response schemas to all routes
  const commonErrorResponses = {
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    413: errorResponseSchema, // Payload too large
    415: errorResponseSchema, // Unsupported media type
    429: errorResponseSchema, // Rate limiting error
    500: errorResponseSchema
  };

  // ROUTES

  /**
   * POST /api/applications/:id/documents
   * Upload a document to a job application
   */
  fastify.post('/applications/:id/documents', {
    config: {
      rateLimit: fileUploadRateLimit
    },
    preHandler: [
      requireAuth, 
      securityMiddleware.fileUploadRateLimit(),
      uploadSingle('document')
    ],
    schema: {
      ...uploadDocumentSchema,
      response: {
        ...uploadDocumentSchema.response,
        404: errorResponseSchema,
        ...commonErrorResponses
      }
    },
    handler: uploadDocument
  });

  /**
   * GET /api/applications/:id/documents
   * List documents for a job application with pagination and filtering
   */
  fastify.get('/applications/:id/documents', {
    config: {
      rateLimit: documentReadRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataAccessRateLimit()],
    schema: {
      ...listDocumentsSchema,
      response: {
        ...listDocumentsSchema.response,
        ...commonErrorResponses
      }
    },
    handler: listDocuments
  });

  /**
   * GET /api/applications/:id/documents/:documentId
   * Get a single document by ID
   */
  fastify.get('/applications/:id/documents/:documentId', {
    config: {
      rateLimit: documentReadRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataAccessRateLimit()],
    schema: {
      ...getDocumentSchema,
      response: {
        ...getDocumentSchema.response,
        404: errorResponseSchema,
        ...commonErrorResponses
      }
    },
    handler: getDocument
  });

  /**
   * DELETE /api/applications/:id/documents/:documentId
   * Delete a document by ID
   */
  fastify.delete('/applications/:id/documents/:documentId', {
    config: {
      rateLimit: documentModificationRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()],
    schema: {
      ...deleteDocumentSchema,
      response: {
        ...deleteDocumentSchema.response,
        404: errorResponseSchema,
        ...commonErrorResponses
      }
    },
    handler: deleteDocument
  });
} 