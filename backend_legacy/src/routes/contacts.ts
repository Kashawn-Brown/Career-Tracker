/**
 * Contact Routes
 * 
 * Defines REST API routes for contact CRUD operations.
 * Registers routes with Fastify including validation schemas, rate limiting, and handlers.
 * Follows auth-style security and error handling patterns.
 */

import { FastifyInstance } from 'fastify';
import {
  listContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  getContactStats
} from '../controllers/contact.controller.js';
import {
  listContactsSchema,
  getContactSchema,
  createContactSchema,
  updateContactSchema,
  deleteContactSchema,
  errorResponseSchema
} from '../schemas/contact.schema.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { securityMiddleware } from '../middleware/security.middleware.js';
import { commonErrorResponses } from '../utils/errorSchemas.js';

// Rate limiting configuration - following auth patterns
const crudRateLimit = {
  max: 30, // 30 requests per minute for standard CRUD operations
  timeWindow: 60 * 1000 // 1 minute
};

const searchRateLimit = {
  max: 60, // 60 searches per minute (more lenient for search)
  timeWindow: 60 * 1000 // 1 minute
};

const statsRateLimit = {
  max: 10, // 10 stats requests per minute
  timeWindow: 60 * 1000 // 1 minute
};

/**
 * Register contact routes
 */
export default async function contactRoutes(fastify: FastifyInstance) {
  // Register rate limiting plugin
  await fastify.register(import('@fastify/rate-limit'));

  // Using shared error response schemas

  // ROUTES

  /**
   * GET /api/contacts
   * List contacts with pagination and filtering (user's own contacts)
   */
  fastify.get('/contacts', {
    config: {
      rateLimit: searchRateLimit // Higher limit for listing/search operations
    },
    preHandler: [requireAuth, securityMiddleware.dataAccessRateLimit()],
    schema: {
      ...listContactsSchema,
      response: {
        ...listContactsSchema.response,
        ...commonErrorResponses
      }
    },
    handler: listContacts
  });

  /**
   * GET /api/contacts/stats
   * Get contact statistics for the authenticated user
   */
  fastify.get('/contacts/stats', {
    config: {
      rateLimit: statsRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataAccessRateLimit()],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            stats: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                withEmail: { type: 'number' },
                withPhone: { type: 'number' },
                withLinkedin: { type: 'number' },
                byCompany: { type: 'object' },
                byConnectionType: { type: 'object' }
              }
            }
          }
        },
        ...commonErrorResponses
      }
    },
    handler: getContactStats
  });

  /**
   * GET /api/contacts/:id
   * Get a single contact by ID (user's own contact)
   */
  fastify.get('/contacts/:id', {
    config: {
      rateLimit: crudRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataAccessRateLimit()],
    schema: {
      ...getContactSchema,
      response: {
        ...getContactSchema.response,
        ...commonErrorResponses
      }
    },
    handler: getContact
  });

  /**
   * POST /api/contacts
   * Create a new contact (authenticated user)
   */
  fastify.post('/contacts', {
    config: {
      rateLimit: crudRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()],
    schema: {
      ...createContactSchema,
      response: {
        ...createContactSchema.response,
        ...commonErrorResponses
      }
    },
    handler: createContact
  });

  /**
   * PUT /api/contacts/:id
   * Update an existing contact (user's own contact)
   */
  fastify.put('/contacts/:id', {
    config: {
      rateLimit: crudRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()],
    schema: {
      ...updateContactSchema,
      response: {
        ...updateContactSchema.response,
        ...commonErrorResponses
      }
    },
    handler: updateContact
  });

  /**
   * DELETE /api/contacts/:id
   * Delete a contact (user's own contact)
   */
  fastify.delete('/contacts/:id', {
    config: {
      rateLimit: crudRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()],
    schema: {
      ...deleteContactSchema,
      response: {
        ...deleteContactSchema.response,
        ...commonErrorResponses
      }
    },
    handler: deleteContact
  });
} 