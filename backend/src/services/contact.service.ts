/**
 * Contact Service
 * 
 * Business logic layer for contact operations.
 * Handles validation, business rules, and coordinates repository calls.
 * Follows auth-style result pattern for consistent error handling.
 */

import { repositories } from '../repositories/index.js';
import {
  ContactListFilters,
  CreateContactRequest,
  UpdateContactRequest,
  ContactFilters,
  ListContactsResult,
  GetContactResult,
  CreateContactResult,
  UpdateContactResult,
  DeleteContactResult,
  ContactStatsResult
} from '../models/contact.models.js';

export class ContactService {
  
  // CORE CONTACT OPERATIONS

  /**
   * List contacts with pagination and filtering
   */
  async listContacts(filters: ContactListFilters): Promise<ListContactsResult> {
    try {
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
        return {
          success: false,
          statusCode: 400,
          error: 'User ID is required for listing contacts'
        };
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

      let contacts;
      let total = 0;

      // If search is provided, use search method
      if (search) {
        contacts = await repositories.contact.searchContacts(
          search,
          userId,
          { pagination: { page, limit } }
        );
        total = contacts.length; // Simplified for now
      } else {
        // Get paginated results with filters
        contacts = await repositories.contact.findByUserWithFilters(
          userId,
          repositoryFilters,
          {
            pagination: { page, limit },
            orderBy
          }
        );
        total = contacts.length; // Simplified for now
      }

      const pages = Math.ceil(total / limit);

      return {
        success: true,
        statusCode: 200,
        message: 'Contacts retrieved successfully',
        contacts,
        pagination: {
          total,
          page,
          limit,
          pages
        }
      };

    } catch (error) {
      console.error('Contact service error (listContacts):', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error while listing contacts'
      };
    }
  }

  /**
   * Get a single contact by ID with all relations
   */
  async getContact(id: number, userId: number): Promise<GetContactResult> {
    try {
      // Validate input
      if (!id || isNaN(id)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Valid contact ID is required'
        };
      }

      if (!userId) {
        return {
          success: false,
          statusCode: 400,
          error: 'User ID is required'
        };
      }

      const contact = await repositories.contact.findByIdWithRelations(id);

      if (!contact) {
        return {
          success: false,
          statusCode: 404,
          error: 'Contact not found'
        };
      }

      // Verify the contact belongs to the user
      if (contact.userId !== userId) {
        return {
          success: false,
          statusCode: 404,
          error: 'Contact not found'
        };
      }

      return {
        success: true,
        statusCode: 200,
        message: 'Contact retrieved successfully',
        contact
      };

    } catch (error) {
      console.error('Contact service error (getContact):', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error while retrieving contact'
      };
    }
  }

  /**
   * Create a new contact with business validation
   */
  async createContact(data: CreateContactRequest): Promise<CreateContactResult> {
    try {
      // Validate required fields
      if (!data.name?.trim()) {
        return {
          success: false,
          statusCode: 400,
          error: 'Contact name is required'
        };
      }

      if (!data.userId) {
        return {
          success: false,
          statusCode: 400,
          error: 'User ID is required'
        };
      }

      // Validate email format if provided
      if (data.email && !this.isValidEmail(data.email)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid email format'
        };
      }

      // Validate LinkedIn URL format if provided
      if (data.linkedinUrl && !this.isValidUrl(data.linkedinUrl)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid LinkedIn URL format'
        };
      }

      // Check if contact with same name and company already exists for this user
      if (data.company) {
        const existingContacts = await repositories.contact.findByCompany(data.company, data.userId);
        const duplicateContact = existingContacts.find(contact => 
          contact.name.toLowerCase() === data.name.toLowerCase()
        );
        
        if (duplicateContact) {
          return {
            success: false,
            statusCode: 409,
            error: 'Contact with this name already exists at this company'
          };
        }
      }

      // Create the contact data for repository
      const createData = {
        ...data,
        user: { connect: { id: data.userId } }
      };

      // Remove userId from createData since we're using the relation
      delete (createData as any).userId;

      const contact = await repositories.contact.create(createData);
      
      // Fetch the created contact with all relations
      const createdContact = await repositories.contact.findByIdWithRelations(contact.id);

      return {
        success: true,
        statusCode: 201,
        message: 'Contact created successfully',
        contact: createdContact || undefined
      };

    } catch (error) {
      console.error('Contact service error (createContact):', error);
      
      if (error instanceof Error && error.message.includes('Foreign key constraint')) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid user ID provided'
        };
      }
      
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error while creating contact'
      };
    }
  }

  /**
   * Update an existing contact with business validation
   */
  async updateContact(id: number, userId: number, data: UpdateContactRequest): Promise<UpdateContactResult> {
    try {
      // Validate input
      if (!id || isNaN(id)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Valid contact ID is required'
        };
      }

      if (!userId) {
        return {
          success: false,
          statusCode: 400,
          error: 'User ID is required'
        };
      }

      // Check if contact exists and belongs to user
      const existingContact = await repositories.contact.findById(id);
      if (!existingContact) {
        return {
          success: false,
          statusCode: 404,
          error: 'Contact not found'
        };
      }

      if (existingContact.userId !== userId) {
        return {
          success: false,
          statusCode: 404,
          error: 'Contact not found'
        };
      }

      // Validate data if provided
      if (data.name !== undefined && !data.name?.trim()) {
        return {
          success: false,
          statusCode: 400,
          error: 'Contact name cannot be empty'
        };
      }

      if (data.email && !this.isValidEmail(data.email)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid email format'
        };
      }

      if (data.linkedinUrl && !this.isValidUrl(data.linkedinUrl)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid LinkedIn URL format'
        };
      }

      // Check for duplicate name in same company if name or company is being updated
      if ((data.name || data.company) && data.company) {
        const newName = data.name || existingContact.name;
        const newCompany = data.company;
        
        const existingContacts = await repositories.contact.findByCompany(newCompany, userId);
        const duplicateContact = existingContacts.find(contact => 
          contact.id !== id && contact.name.toLowerCase() === newName.toLowerCase()
        );
        
        if (duplicateContact) {
          return {
            success: false,
            statusCode: 409,
            error: 'Contact with this name already exists at this company'
          };
        }
      }

      // Update the contact
      const updatedContact = await repositories.contact.update(id, data);
      
      // Fetch the updated contact with all relations
      const contactWithRelations = await repositories.contact.findByIdWithRelations(updatedContact.id);

      return {
        success: true,
        statusCode: 200,
        message: 'Contact updated successfully',
        contact: contactWithRelations || undefined
      };

    } catch (error) {
      console.error('Contact service error (updateContact):', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error while updating contact'
      };
    }
  }

  /**
   * Delete a contact (with business rules)
   */
  async deleteContact(id: number, userId: number): Promise<DeleteContactResult> {
    try {
      // Validate input
      if (!id || isNaN(id)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Valid contact ID is required'
        };
      }

      if (!userId) {
        return {
          success: false,
          statusCode: 400,
          error: 'User ID is required'
        };
      }

      // Check if contact exists and belongs to user
      const existingContact = await repositories.contact.findByIdWithRelations(id);
      if (!existingContact) {
        return {
          success: false,
          statusCode: 404,
          error: 'Contact not found'
        };
      }

      if (existingContact.userId !== userId) {
        return {
          success: false,
          statusCode: 404,
          error: 'Contact not found'
        };
      }

      // Check for associated job connections
      if (existingContact.jobConnections && existingContact.jobConnections.length > 0) {
        return {
          success: false,
          statusCode: 409,
          error: 'Cannot delete contact with associated job connections. Remove connections first.'
        };
      }

      // Delete the contact
      await repositories.contact.delete(id);

      return {
        success: true,
        statusCode: 200,
        message: 'Contact deleted successfully'
      };

    } catch (error) {
      console.error('Contact service error (deleteContact):', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error while deleting contact'
      };
    }
  }

  // UTILITY METHODS

  /**
   * Get contact statistics for a user
   */
  async getContactStats(userId: number): Promise<ContactStatsResult> {
    try {
      if (!userId) {
        return {
          success: false,
          statusCode: 400,
          error: 'User ID is required'
        };
      }

      // Use the existing repository method
      const stats = await repositories.contact.getContactStats(userId);

      return {
        success: true,
        statusCode: 200,
        message: 'Contact statistics retrieved successfully',
        stats: {
          total: stats.total,
          withEmail: stats.withEmail,
          withPhone: stats.withPhone,
          withLinkedin: stats.withLinkedIn,
          byCompany: stats.byCompany.reduce((acc, item) => {
            acc[item.company] = item.count;
            return acc;
          }, {} as Record<string, number>),
          byConnectionType: stats.byConnectionType.reduce((acc, item) => {
            acc[item.connectionType] = item.count;
            return acc;
          }, {} as Record<string, number>)
        }
      };

    } catch (error) {
      console.error('Contact service error (getContactStats):', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error while retrieving contact statistics'
      };
    }
  }

  // VALIDATION HELPERS

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

// Export a single instance of the service (following auth pattern)
export const contactService = new ContactService(); 