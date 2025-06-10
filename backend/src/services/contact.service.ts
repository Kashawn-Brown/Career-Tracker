/**
 * Contact Service
 * 
 * Business logic layer for contact operations.
 * Handles validation, business rules, and coordinates repository calls.
 */

import { repositories } from '../repositories/index.js';
import {
  ContactListFilters,
  CreateContactRequest,
  UpdateContactRequest,
  ContactFilters
} from '../models/contact.models.js';

export class ContactService {
  /**
   * List contacts with pagination and filtering
   */
  async listContacts(filters: ContactListFilters) {
    const {
      page = 1,
      limit = 20,
      userId,
      search,
      company,
      role,
      connectionType,
      hasEmail,
      hasPhone,
      hasLinkedin,
      sortBy = 'name',
      sortOrder = 'asc'
    } = filters;

    if (!userId) {
      throw new Error('User ID is required for listing contacts');
    }

    // Build repository filters
    const repositoryFilters: ContactFilters = {
      userId,
      company,
      role,
      connectionType,
      hasEmail,
      hasPhone,
      hasLinkedin
    };

    // Build order by
    const orderBy = { [sortBy]: sortOrder };

    // If search is provided, use search method
    if (search) {
      const contacts = await repositories.contact.searchContacts(
        search,
        userId,
        { pagination: { page, limit } }
      );

      // Calculate total and pagination info
      const total = contacts.length; // This is a simplification - in production you'd want a separate count query
      const pages = Math.ceil(total / limit);

      return {
        contacts,
        pagination: {
          total,
          page,
          limit,
          pages
        }
      };
    }

    // Get paginated results with filters
    const contacts = await repositories.contact.findByUserWithFilters(
      userId,
      repositoryFilters,
      {
        pagination: { page, limit },
        orderBy
      }
    );

    // For now, we'll use a simple count - in production you'd want a separate count query
    const total = contacts.length;
    const pages = Math.ceil(total / limit);

    return {
      contacts,
      pagination: {
        total,
        page,
        limit,
        pages
      }
    };
  }

  /**
   * Get a single contact by ID with all relations
   */
  async getContact(id: number, userId: number) {
    const contact = await repositories.contact.findByIdWithRelations(id);

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Verify the contact belongs to the user
    if (contact.userId !== userId) {
      throw new Error('Contact not found');
    }

    return contact;
  }

  /**
   * Create a new contact with business validation
   */
  async createContact(data: CreateContactRequest) {
    // Validate required fields
    if (!data.name?.trim()) {
      throw new Error('Contact name is required');
    }

    if (!data.userId) {
      throw new Error('User ID is required');
    }

    // Validate email format if provided
    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    // Validate LinkedIn URL format if provided
    if (data.linkedinUrl && !this.isValidUrl(data.linkedinUrl)) {
      throw new Error('Invalid LinkedIn URL format');
    }

    // Check if contact with same name and company already exists for this user
    if (data.company) {
      const existingContacts = await repositories.contact.findByCompany(data.company, data.userId);
      const duplicateContact = existingContacts.find(contact => 
        contact.name.toLowerCase() === data.name.toLowerCase()
      );
      
      if (duplicateContact) {
        throw new Error('Contact with this name already exists at this company');
      }
    }

    // Create the contact data for repository
    const createData = {
      ...data,
      user: { connect: { id: data.userId } }
    };

    // Remove userId from createData since we're using the relation
    delete (createData as any).userId;

    try {
      const contact = await repositories.contact.create(createData);
      
      // Fetch the created contact with all relations
      return await repositories.contact.findByIdWithRelations(contact.id);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Foreign key constraint')) {
        throw new Error('Invalid user ID provided');
      }
      throw error;
    }
  }

  /**
   * Update an existing contact with business validation
   */
  async updateContact(id: number, userId: number, data: UpdateContactRequest) {
    // Check if contact exists and belongs to user
    const existingContact = await repositories.contact.findById(id);
    if (!existingContact) {
      throw new Error('Contact not found');
    }

    if (existingContact.userId !== userId) {
      throw new Error('Contact not found');
    }

    // Validate data if provided
    if (data.name !== undefined && !data.name?.trim()) {
      throw new Error('Contact name cannot be empty');
    }

    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    if (data.linkedinUrl && !this.isValidUrl(data.linkedinUrl)) {
      throw new Error('Invalid LinkedIn URL format');
    }

    // Check for duplicate name at company if name or company is being updated
    if ((data.name || data.company) && (data.name !== existingContact.name || data.company !== existingContact.company)) {
      const nameToCheck = data.name || existingContact.name;
      const companyToCheck = data.company || existingContact.company;
      
      if (companyToCheck) {
        const existingContacts = await repositories.contact.findByCompany(companyToCheck, userId);
        const duplicateContact = existingContacts.find(contact => 
          contact.id !== id && contact.name.toLowerCase() === nameToCheck.toLowerCase()
        );
        
        if (duplicateContact) {
          throw new Error('Contact with this name already exists at this company');
        }
      }
    }

    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    // Update contact
    await repositories.contact.update(id, cleanData);

    // Fetch the updated contact with all relations
    return await repositories.contact.findByIdWithRelations(id);
  }

  /**
   * Delete a contact with business validation
   */
  async deleteContact(id: number, userId: number) {
    // Check if contact exists and belongs to user
    const existingContact = await repositories.contact.findById(id);
    if (!existingContact) {
      throw new Error('Contact not found');
    }

    if (existingContact.userId !== userId) {
      throw new Error('Contact not found');
    }

    // Check if contact has associated job connections
    const jobConnections = await repositories.jobConnection.findByContact(id);
    if (jobConnections.length > 0) {
      throw new Error('Cannot delete contact with associated job connections. Remove connections first.');
    }

    // Delete the contact
    await repositories.contact.delete(id);

    return { message: 'Contact deleted successfully', deletedContactId: id };
  }

  /**
   * Get contact statistics for a user
   */
  async getContactStats(userId: number) {
    return await repositories.contact.getContactStats(userId);
  }

  /**
   * Search contacts for a user
   */
  async searchContacts(query: string, userId: number, options?: { page?: number; limit?: number }) {
    if (!query?.trim()) {
      throw new Error('Search query is required');
    }

    return await repositories.contact.searchContacts(query, userId, { pagination: options });
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
} 