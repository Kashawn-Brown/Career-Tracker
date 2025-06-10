/**
 * Contact Controller
 * 
 * Handles HTTP requests for contact CRUD operations.
 * Implements proper error handling, validation, and response formatting.
 * Uses ContactService for business logic to maintain separation of concerns.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { ContactService } from '../services/contact.service.js';
import type { 
  ContactListFilters, 
  CreateContactRequest, 
  UpdateContactRequest 
} from '../models/contact.models.js';

// Create service instance
const contactService = new ContactService();

/**
 * List contacts with pagination and filtering (user's own contacts)
 */
export async function listContacts(
  request: FastifyRequest<{ Querystring: ContactListFilters }>,
  reply: FastifyReply
) {
  try {
    // Extract user ID from JWT token and add to filters
    const userId = request.user!.userId;
    const filtersWithUser = {
      ...request.query,
      userId
    };
    
    const result = await contactService.listContacts(filtersWithUser);
    return reply.status(200).send(result);
  } catch (error) {
    request.log.error('Error listing contacts:', error);
    
    // Handle specific business logic errors
    if (error instanceof Error && error.message === 'User ID is required for listing contacts') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message
      });
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to retrieve contacts'
    });
  }
}

/**
 * Get a single contact by ID (user's own contact)
 */
export async function getContact(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(request.params.id, 10);
    const userId = request.user!.userId;
    
    if (isNaN(id)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid contact ID'
      });
    }

    const contact = await contactService.getContact(id, userId);
    return reply.status(200).send(contact);
  } catch (error) {
    request.log.error('Error getting contact:', error);

    // Handle specific business logic errors
    if (error instanceof Error && error.message === 'Contact not found') {
      return reply.status(404).send({
        error: 'Not Found',
        message: error.message
      });
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to retrieve contact'
    });
  }
}

/**
 * Create a new contact (for authenticated user)
 */
export async function createContact(
  request: FastifyRequest<{ Body: CreateContactRequest }>,
  reply: FastifyReply
) {
  try {
    // Extract user ID from JWT token and add to request data
    const userId = request.user!.userId;
    const createData = {
      ...request.body,
      userId
    };
    
    const createdContact = await contactService.createContact(createData);
    return reply.status(201).send(createdContact);
  } catch (error) {
    request.log.error('Error creating contact:', error);
    
    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message.includes('Contact name is required') ||
          error.message.includes('Invalid email format') ||
          error.message.includes('Invalid LinkedIn URL format') ||
          error.message.includes('Contact with this name already exists')) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message
        });
      }
      
      if (error.message === 'Invalid user ID provided') {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message
        });
      }
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to create contact'
    });
  }
}

/**
 * Update an existing contact (user's own contact)
 */
export async function updateContact(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateContactRequest }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(request.params.id, 10);
    const userId = request.user!.userId;
    
    if (isNaN(id)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid contact ID'
      });
    }

    const updatedContact = await contactService.updateContact(id, userId, request.body);
    return reply.status(200).send(updatedContact);
  } catch (error) {
    request.log.error('Error updating contact:', error);

    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message === 'Contact not found') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      
      if (error.message.includes('Contact name cannot be empty') ||
          error.message.includes('Invalid email format') ||
          error.message.includes('Invalid LinkedIn URL format') ||
          error.message.includes('Contact with this name already exists')) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message
        });
      }
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to update contact'
    });
  }
}

/**
 * Delete a contact (user's own contact)
 */
export async function deleteContact(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(request.params.id, 10);
    const userId = request.user!.userId;
    
    if (isNaN(id)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid contact ID'
      });
    }

    const result = await contactService.deleteContact(id, userId);
    return reply.status(200).send(result);
  } catch (error) {
    request.log.error('Error deleting contact:', error);

    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message === 'Contact not found') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      
      if (error.message.includes('Cannot delete contact with associated job connections')) {
        return reply.status(409).send({
          error: 'Conflict',
          message: error.message
        });
      }
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to delete contact'
    });
  }
} 