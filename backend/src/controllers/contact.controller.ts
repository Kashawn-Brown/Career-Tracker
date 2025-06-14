/**
 * Contact Controller
 * 
 * Handles HTTP requests for contact CRUD operations.
 * Implements proper error handling, validation, and response formatting.
 * Uses contactService for business logic to maintain separation of concerns.
 * Follows auth-style controller pattern.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { contactService } from '../services/index.js';
import type { 
  ContactListFilters, 
  CreateContactRequest, 
  UpdateContactRequest 
} from '../models/contact.models.js';

export class ContactController {

  // CORE CONTACT OPERATIONS

  /**
   * List contacts with pagination and filtering (user's own contacts)
   * GET /api/contacts
   */
  async listContacts(
    request: FastifyRequest<{ Querystring: ContactListFilters }>,
    reply: FastifyReply
  ) {
    // Extract user ID from JWT token and add to filters
    const userId = request.user!.userId;
    const filtersWithUser = {
      ...request.query,
      userId
    };
    
    const result = await contactService.listContacts(filtersWithUser);

    // Handle service result
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message,
      contacts: result.contacts,
      pagination: result.pagination
    });
  }

  /**
   * Get a single contact by ID (user's own contact)
   * GET /api/contacts/:id
   */
  async getContact(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const id = parseInt(request.params.id, 10);
    const userId = request.user!.userId;
    
    // Basic validation handled in controller for HTTP concerns
    if (isNaN(id)) {
      return reply.status(400).send({
        error: 'Invalid contact ID format'
      });
    }

    const result = await contactService.getContact(id, userId);

    // Handle service result
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message,
      contact: result.contact
    });
  }

  /**
   * Create a new contact (for authenticated user)
   * POST /api/contacts
   */
  async createContact(
    request: FastifyRequest<{ Body: CreateContactRequest }>,
    reply: FastifyReply
  ) {
    // Extract user ID from JWT token and add to request data
    const userId = request.user!.userId;
    const createData = {
      ...request.body,
      userId
    };
    
    const result = await contactService.createContact(createData);

    // Handle service result
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message,
      contact: result.contact
    });
  }

  /**
   * Update an existing contact (user's own contact)
   * PUT /api/contacts/:id
   */
  async updateContact(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateContactRequest }>,
    reply: FastifyReply
  ) {
    const id = parseInt(request.params.id, 10);
    const userId = request.user!.userId;
    
    // Basic validation handled in controller for HTTP concerns
    if (isNaN(id)) {
      return reply.status(400).send({
        error: 'Invalid contact ID format'
      });
    }

    const result = await contactService.updateContact(id, userId, request.body);

    // Handle service result
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message,
      contact: result.contact
    });
  }

  /**
   * Delete a contact (user's own contact)
   * DELETE /api/contacts/:id
   */
  async deleteContact(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const id = parseInt(request.params.id, 10);
    const userId = request.user!.userId;
    
    // Basic validation handled in controller for HTTP concerns
    if (isNaN(id)) {
      return reply.status(400).send({
        error: 'Invalid contact ID format'
      });
    }

    const result = await contactService.deleteContact(id, userId);

    // Handle service result
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message
    });
  }

  /**
   * Get contact statistics for the authenticated user
   * GET /api/contacts/stats
   */
  async getContactStats(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const userId = request.user!.userId;

    const result = await contactService.getContactStats(userId);

    // Handle service result
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message,
      stats: result.stats
    });
  }
}

// Export controller functions for routing (following auth pattern)
const contactController = new ContactController();

export const listContacts = contactController.listContacts.bind(contactController);
export const getContact = contactController.getContact.bind(contactController);
export const createContact = contactController.createContact.bind(contactController);
export const updateContact = contactController.updateContact.bind(contactController);
export const deleteContact = contactController.deleteContact.bind(contactController);
export const getContactStats = contactController.getContactStats.bind(contactController); 