/**
 * Contact Routes
 * 
 * Defines REST API routes for contact CRUD operations.
 * Registers routes with Fastify including validation schemas and handlers.
 */

import { FastifyInstance } from 'fastify';
import {
  listContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact
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

/**
 * Register contact routes
 */
export default async function contactRoutes(fastify: FastifyInstance) {
  // Add common error response schemas to all routes
  const commonErrorResponses = {
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema
  };

  // ROUTES

  /**
   * GET /api/contacts
   * List contacts with pagination and filtering (user's own contacts)
   */
  fastify.get('/contacts', {
    preHandler: requireAuth,
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
   * GET /api/contacts/:id
   * Get a single contact by ID (user's own contact)
   */
  fastify.get('/contacts/:id', {
    preHandler: requireAuth,
    schema: {
      ...getContactSchema,
      response: {
        ...getContactSchema.response,
        404: errorResponseSchema,
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
    preHandler: requireAuth,
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
    preHandler: requireAuth,
    schema: {
      ...updateContactSchema,
      response: {
        ...updateContactSchema.response,
        404: errorResponseSchema,
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
    preHandler: requireAuth,
    schema: {
      ...deleteContactSchema,
      response: {
        ...deleteContactSchema.response,
        404: errorResponseSchema,
        409: errorResponseSchema, // For conflict when contact has job connections
        ...commonErrorResponses
      }
    },
    handler: deleteContact
  });
} 