/**
 * Job Connection Service
 * 
 * Business logic layer for job connection operations.
 * Handles validation, business rules, and coordinates repository calls.
 * Follows auth-style service pattern with structured result returns.
 */

import { repositories } from '../repositories/index.js';
import {
  JobConnectionListFilters,
  CreateJobConnectionRequest,
  UpdateJobConnectionRequest,
  UpdateJobConnectionStatusRequest,
  JobConnectionFilters,
  ListJobConnectionsResult,
  GetJobConnectionResult,
  CreateJobConnectionResult,
  UpdateJobConnectionResult,
  DeleteJobConnectionResult
} from '../models/job-connection.models.js';

export class JobConnectionService {
  /**
   * List job connections for an application with pagination and filtering
   */
  async listJobConnections(
    applicationId: number, 
    userId: number, 
    filters: Omit<JobConnectionListFilters, 'jobApplicationId'>
  ): Promise<ListJobConnectionsResult> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        connectionType,
        hasContact,
        contactedAfter,
        contactedBefore,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      // Verify the job application belongs to the user
      const jobApplication = await repositories.jobApplication.findById(applicationId);
      if (!jobApplication || jobApplication.userId !== userId) {
        return {
          success: false,
          statusCode: 404,
          error: 'Job application not found'
        };
      }

      // Build repository filters
      const repositoryFilters: JobConnectionFilters = {
        jobApplicationId: applicationId,
        status,
        connectionType,
        hasContact,
        contactedAfter: contactedAfter ? new Date(contactedAfter) : undefined,
        contactedBefore: contactedBefore ? new Date(contactedBefore) : undefined
      };

      // Get all connections for the application
      const jobConnections = await repositories.jobConnection.findByJobApplication(applicationId);
      
      // Apply filters (simplified - in production you'd do this in the repository)
      let filteredConnections = jobConnections;
      
      if (status) {
        filteredConnections = filteredConnections.filter(conn => conn.status === status);
      }
      
      if (connectionType) {
        filteredConnections = filteredConnections.filter(conn => conn.connectionType === connectionType);
      }
      
      if (hasContact !== undefined) {
        filteredConnections = filteredConnections.filter(conn => 
          hasContact ? conn.contactId !== null : conn.contactId === null
        );
      }

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedConnections = filteredConnections.slice(startIndex, endIndex);

      const total = filteredConnections.length;
      const pages = Math.ceil(total / limit);

      return {
        success: true,
        statusCode: 200,
        data: {
          jobConnections: paginatedConnections,
          pagination: {
            total,
            page,
            limit,
            pages
          }
        }
      };

    } catch (error) {
      console.error('Error listing job connections:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to retrieve job connections'
      };
    }
  }

  /**
   * Get a single job connection by ID with all relations
   */
  async getJobConnection(applicationId: number, connectionId: number, userId: number): Promise<GetJobConnectionResult> {
    try {
      // Verify the job application belongs to the user
      const jobApplication = await repositories.jobApplication.findById(applicationId);
      if (!jobApplication || jobApplication.userId !== userId) {
        return {
          success: false,
          statusCode: 404,
          error: 'Job application not found'
        };
      }

      const jobConnection = await repositories.jobConnection.findByIdWithRelations(connectionId);

      if (!jobConnection || jobConnection.jobApplicationId !== applicationId) {
        return {
          success: false,
          statusCode: 404,
          error: 'Job connection not found'
        };
      }

      return {
        success: true,
        statusCode: 200,
        jobConnection
      };

    } catch (error) {
      console.error('Error getting job connection:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to retrieve job connection'
      };
    }
  }

  /**
   * Create a new job connection with business validation
   */
  async createJobConnection(
    applicationId: number, 
    userId: number, 
    data: Omit<CreateJobConnectionRequest, 'jobApplicationId'>
  ): Promise<CreateJobConnectionResult> {
    try {
      // Verify the job application belongs to the user
      const jobApplication = await repositories.jobApplication.findById(applicationId);
      if (!jobApplication || jobApplication.userId !== userId) {
        return {
          success: false,
          statusCode: 404,
          error: 'Job application not found'
        };
      }

      // Validate required fields
      if (!data.name?.trim()) {
        return {
          success: false,
          statusCode: 400,
          error: 'Contact name is required'
        };
      }

      if (!data.connectionType?.trim()) {
        return {
          success: false,
          statusCode: 400,
          error: 'Connection type is required'
        };
      }

      // Validate connection type enum
      const validConnectionTypes = ['referral', 'recruiter', 'hiring_manager', 'employee', 'alumni', 'networking', 'other'];
      if (!validConnectionTypes.includes(data.connectionType)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid connection type'
        };
      }

      // Validate status enum if provided
      if (data.status) {
        const validStatuses = ['not_contacted', 'contacted', 'responded', 'meeting_scheduled', 'no_response', 'rejected'];
        if (!validStatuses.includes(data.status)) {
          return {
            success: false,
            statusCode: 400,
            error: 'Invalid status'
          };
        }
      }

      // Validate email format if provided
      if (data.email && !this.isValidEmail(data.email)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid email format'
        };
      }

      // Validate contact exists if contactId is provided
      if (data.contactId) {
        const contact = await repositories.contact.findById(data.contactId);
        if (!contact || contact.userId !== userId) {
          return {
            success: false,
            statusCode: 400,
            error: 'Contact not found'
          };
        }
      }

      // Check for duplicate connection (same name and connection type for this application)
      const existingConnections = await repositories.jobConnection.findByJobApplication(applicationId);
      const duplicateConnection = existingConnections.find(conn => 
        conn.name.toLowerCase() === data.name.toLowerCase() && 
        conn.connectionType === data.connectionType
      );
      
      if (duplicateConnection) {
        return {
          success: false,
          statusCode: 400,
          error: 'Connection with this name and type already exists for this application'
        };
      }

      // Create the job connection data for repository
      const createData = {
        ...data,
        jobApplicationId: applicationId,
        status: data.status || 'not_contacted',
        jobApplication: { connect: { id: applicationId } },
        ...(data.contactId && { contact: { connect: { id: data.contactId } } })
      };

      // Remove contactId from createData since we're using the relation
      if (data.contactId) {
        delete (createData as any).contactId;
      }

      const jobConnection = await repositories.jobConnection.create(createData);
      
      // Fetch the created job connection with all relations
      const createdJobConnection = await repositories.jobConnection.findByIdWithRelations(jobConnection.id);
      
      if (!createdJobConnection) {
        return {
          success: false,
          statusCode: 500,
          error: 'Failed to retrieve created job connection'
        };
      }

      return {
        success: true,
        statusCode: 201,
        message: 'Job connection created successfully',
        jobConnection: createdJobConnection
      };

    } catch (error) {
      console.error('Error creating job connection:', error);
      
      if (error instanceof Error && error.message.includes('Foreign key constraint')) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid application or contact ID provided'
        };
      }
      
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to create job connection'
      };
    }
  }

  /**
   * Update an existing job connection with business validation
   */
  async updateJobConnection(
    applicationId: number, 
    connectionId: number, 
    userId: number, 
    data: UpdateJobConnectionRequest
  ): Promise<UpdateJobConnectionResult> {
    try {
      // Verify the job application belongs to the user
      const jobApplication = await repositories.jobApplication.findById(applicationId);
      if (!jobApplication || jobApplication.userId !== userId) {
        return {
          success: false,
          statusCode: 404,
          error: 'Job application not found'
        };
      }

      // Verify the job connection exists and belongs to the application
      const existingConnection = await repositories.jobConnection.findByIdWithRelations(connectionId);
      if (!existingConnection || existingConnection.jobApplicationId !== applicationId) {
        return {
          success: false,
          statusCode: 404,
          error: 'Job connection not found'
        };
      }

      // Validate connection type enum if provided
      if (data.connectionType) {
        const validConnectionTypes = ['referral', 'recruiter', 'hiring_manager', 'employee', 'alumni', 'networking', 'other'];
        if (!validConnectionTypes.includes(data.connectionType)) {
          return {
            success: false,
            statusCode: 400,
            error: 'Invalid connection type'
          };
        }
      }

      // Validate status enum if provided
      if (data.status) {
        const validStatuses = ['not_contacted', 'contacted', 'responded', 'meeting_scheduled', 'no_response', 'rejected'];
        if (!validStatuses.includes(data.status)) {
          return {
            success: false,
            statusCode: 400,
            error: 'Invalid status'
          };
        }
      }

      // Validate email format if provided
      if (data.email && !this.isValidEmail(data.email)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid email format'
        };
      }

      // Validate contact exists if contactId is provided
      if (data.contactId) {
        const contact = await repositories.contact.findById(data.contactId);
        if (!contact || contact.userId !== userId) {
          return {
            success: false,
            statusCode: 400,
            error: 'Contact not found'
          };
        }
      }

      // Check for duplicate name and connection type if being updated
      if (data.name && data.connectionType) {
        const existingConnections = await repositories.jobConnection.findByJobApplication(applicationId);
        const duplicateConnection = existingConnections.find(conn => 
          conn.id !== connectionId &&
          conn.name.toLowerCase() === data.name!.toLowerCase() && 
          conn.connectionType === data.connectionType
        );
        
        if (duplicateConnection) {
          return {
            success: false,
            statusCode: 400,
            error: 'Connection with this name and type already exists for this application'
          };
        }
      }

      // Prepare update data
      const updateData = {
        ...data,
        ...(data.contactedAt && { contactedAt: new Date(data.contactedAt) }),
        ...(data.contactId && { contact: { connect: { id: data.contactId } } })
      };

      // Remove contactId from updateData since we're using the relation
      if (data.contactId) {
        delete (updateData as any).contactId;
      }

      const updatedJobConnection = await repositories.jobConnection.update(connectionId, updateData);
      
      // Fetch the updated job connection with all relations
      const result = await repositories.jobConnection.findByIdWithRelations(updatedJobConnection.id);
      
      if (!result) {
        return {
          success: false,
          statusCode: 500,
          error: 'Failed to retrieve updated job connection'
        };
      }

      return {
        success: true,
        statusCode: 200,
        message: 'Job connection updated successfully',
        jobConnection: result
      };

    } catch (error) {
      console.error('Error updating job connection:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to update job connection'
      };
    }
  }

  /**
   * Update job connection status
   */
  async updateJobConnectionStatus(
    applicationId: number, 
    connectionId: number, 
    userId: number, 
    data: UpdateJobConnectionStatusRequest
  ): Promise<UpdateJobConnectionResult> {
    try {
      // Validate status enum
      const validStatuses = ['not_contacted', 'contacted', 'responded', 'meeting_scheduled', 'no_response', 'rejected'];
      if (!validStatuses.includes(data.status)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid status'
        };
      }

      const updateData: UpdateJobConnectionRequest = {
        status: data.status,
        notes: data.notes,
        ...(data.contactedAt && { contactedAt: data.contactedAt })
      };

      return await this.updateJobConnection(applicationId, connectionId, userId, updateData);

    } catch (error) {
      console.error('Error updating job connection status:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to update job connection status'
      };
    }
  }

  /**
   * Delete a job connection
   */
  async deleteJobConnection(applicationId: number, connectionId: number, userId: number): Promise<DeleteJobConnectionResult> {
    try {
      // Verify the job application belongs to the user
      const jobApplication = await repositories.jobApplication.findById(applicationId);
      if (!jobApplication || jobApplication.userId !== userId) {
        return {
          success: false,
          statusCode: 404,
          error: 'Job application not found'
        };
      }

      // Verify the job connection exists and belongs to the application
      const existingConnection = await repositories.jobConnection.findByIdWithRelations(connectionId);
      if (!existingConnection || existingConnection.jobApplicationId !== applicationId) {
        return {
          success: false,
          statusCode: 404,
          error: 'Job connection not found'
        };
      }

      await repositories.jobConnection.delete(connectionId);

      return {
        success: true,
        statusCode: 200,
        message: 'Job connection deleted successfully'
      };

    } catch (error) {
      console.error('Error deleting job connection:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to delete job connection'
      };
    }
  }

  /**
   * Helper methods
   */
  
  /**
   * Get job connection statistics for a user
   */
  async getJobConnectionStats(userId: number) {
    // Implementation remains the same - this is a helper method
    // that doesn't follow the same pattern as it's not exposed via controller
    const stats = await repositories.jobConnection.getJobConnectionStats(userId);
    return stats;
  }

  /**
   * Mark a connection as contacted
   */
  async markAsContacted(applicationId: number, connectionId: number, userId: number, notes?: string) {
    return await this.updateJobConnectionStatus(applicationId, connectionId, userId, {
      status: 'contacted',
      contactedAt: new Date().toISOString(),
      notes
    });
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Export singleton instance
export const jobConnectionService = new JobConnectionService(); 