/**
 * Document Routes
 * 
 * Defines REST API routes for document CRUD operations.
 * Registers routes with Fastify including validation schemas, middleware, and handlers.
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

/**
 * Register document routes
 */
export default async function documentRoutes(fastify: FastifyInstance) {
  // Add common error response schemas to all routes
  const commonErrorResponses = {
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema
  };

  // ROUTES

  /**
   * POST /api/applications/:id/documents
   * Upload a document to a job application
   */
  fastify.post('/applications/:id/documents', {
    preHandler: [requireAuth, uploadSingle('document')],
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
    preHandler: requireAuth,
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
    preHandler: requireAuth,
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
    preHandler: requireAuth,
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