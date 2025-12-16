/**
 * Contact Service
 * 
 * Business logic layer for contact operations.
 * Handles validation, business rules, and coordinates repository calls.
 * Follows standardized result patterns with detailed error context and audit logging.
 */

import { repositories } from '../repositories/index.js';
import { auditService } from './audit.service.js';
import { ErrorResponseBuilder, SuccessResponseBuilder, CommonErrors } from '../utils/errorResponse.js';
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
  async listContacts(
    filters: ContactListFilters, 
    requestContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<ListContactsResult> {
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
        const error = ErrorResponseBuilder.create()
          .status(400)
          .error('Invalid Request')
          .message('User authentication required for listing contacts')
          .code('USER_ID_REQUIRED')
          .context({
            operation: 'list_contacts',
            resource: 'contact'
          })
          .build();
        return error;
      }

      // Log data access
      await auditService.logContactOperation(
        userId,
        'READ',
        undefined,
        { operation: 'list', search, company, role },
        requestContext?.ipAddress,
        requestContext?.userAgent
      );

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

      const success = SuccessResponseBuilder.create()
        .status(200)
        .message('Contacts retrieved successfully')
        .data({
          contacts,
          pagination: {
            total,
            page,
            limit,
            pages
          }
        })
        .build();

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
      
      const errorResponse = ErrorResponseBuilder.create()
        .status(500)
        .error('Internal Server Error')
        .message('An unexpected error occurred while retrieving contacts')
        .code('CONTACT_LIST_ERROR')
        .context({
          operation: 'list_contacts',
          resource: 'contact',
          userId: filters.userId
        })
        .details({
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          timestamp: new Date().toISOString()
        })
        .build();

      return errorResponse;
    }
  }

  /**
   * Get a single contact by ID with all relations
   */
  async getContact(
    id: number, 
    userId: number,
    requestContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<GetContactResult> {
    try {
      // Validate input
      if (!id || isNaN(id)) {
        return CommonErrors.validation(
          ['Contact ID must be a valid number'],
          'id'
        );
      }

      if (!userId) {
        return CommonErrors.unauthorized();
      }

      const contact = await repositories.contact.findByIdWithRelations(id);

      if (!contact) {
        return CommonErrors.notFound('contact', id);
      }

      // Verify the contact belongs to the user
      if (contact.userId !== userId) {
        return CommonErrors.forbidden('contact');
      }

      // Log data access
      await auditService.logContactOperation(
        userId,
        'READ',
        id,
        { contactName: contact.name, company: contact.company },
        requestContext?.ipAddress,
        requestContext?.userAgent
      );

      return {
        success: true,
        statusCode: 200,
        message: 'Contact retrieved successfully',
        contact
      };

    } catch (error) {
      console.error('Contact service error (getContact):', error);
      
      const errorResponse = ErrorResponseBuilder.create()
        .status(500)
        .error('Internal Server Error')
        .message('An unexpected error occurred while retrieving the contact')
        .code('CONTACT_GET_ERROR')
        .context({
          operation: 'get_contact',
          resource: 'contact',
          resourceId: id,
          userId
        })
        .details({
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          timestamp: new Date().toISOString()
        })
        .build();

      return errorResponse;
    }
  }

  /**
   * Create a new contact with comprehensive business validation
   */
  async createContact(
    data: CreateContactRequest,
    requestContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<CreateContactResult> {
    try {
      // Comprehensive validation like auth flow patterns
      const validationErrors: string[] = [];

      // Required field validation
      if (!data.name?.trim()) {
        validationErrors.push('Contact name is required and cannot be empty');
      }

      if (!data.userId) {
        return CommonErrors.unauthorized();
      }

      // Email validation (if provided)
      if (data.email && !this.isValidEmail(data.email)) {
        validationErrors.push('Invalid email format provided');
      }

      // LinkedIn URL validation (if provided)
      if (data.linkedinUrl && !this.isValidUrl(data.linkedinUrl)) {
        validationErrors.push('Invalid LinkedIn URL format');
      }

      // Business rule validation
      if (data.name && data.name.length > 255) {
        validationErrors.push('Contact name must be 255 characters or less');
      }

      if (data.company && data.company.length > 255) {
        validationErrors.push('Company name must be 255 characters or less');
      }

      if (data.role && data.role.length > 255) {
        validationErrors.push('Role must be 255 characters or less');
      }

      // Return validation errors if any
      if (validationErrors.length > 0) {
        return CommonErrors.validation(validationErrors);
      }

      // Check for duplicate contact (same name + email for same user)
      if (data.email) {
        const existingContact = await repositories.contact.findByEmail(data.email, data.userId);
        if (existingContact) {
          return ErrorResponseBuilder.create()
            .status(409)
            .error('Duplicate Contact')
            .message('A contact with this email address already exists')
            .code('CONTACT_DUPLICATE_EMAIL')
            .context({
              operation: 'create_contact',
              resource: 'contact',
              userId: data.userId
            })
            .details({
              existingContactId: existingContact.id,
              existingContactName: existingContact.name,
              duplicateField: 'email'
            })
            .action('Update the existing contact or use a different email address')
            .build();
        }
      }

      // Create the contact
      const contact = await repositories.contact.create({
        name: data.name.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        company: data.company?.trim() || null,
        role: data.role?.trim() || null,
        linkedinUrl: data.linkedinUrl?.trim() || null,
        connectionType: data.connectionType?.trim() || null,
        notes: data.notes?.trim() || null,
        user: {
          connect: { id: data.userId }
        },
      });

      // Log successful creation
      await auditService.logContactOperation(
        data.userId,
        'CREATE',
        contact.id,
        {
          contactName: contact.name,
          company: contact.company,
          email: contact.email,
          role: contact.role
        },
        requestContext?.ipAddress,
        requestContext?.userAgent
      );

      return {
        success: true,
        statusCode: 201,
        message: 'Contact created successfully',
        contact: await repositories.contact.findByIdWithRelations(contact.id) || undefined
      };

    } catch (error) {
      console.error('Contact service error (createContact):', error);
      
      const errorResponse = ErrorResponseBuilder.create()
        .status(500)
        .error('Internal Server Error')
        .message('An unexpected error occurred while creating the contact')
        .code('CONTACT_CREATE_ERROR')
        .context({
          operation: 'create_contact',
          resource: 'contact',
          userId: data.userId
        })
        .details({
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          timestamp: new Date().toISOString(),
          contactData: {
            name: data.name,
            company: data.company,
            hasEmail: !!data.email
          }
        })
        .build();

      return errorResponse;
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