/**
 * Job Connection Service
 * 
 * Business logic layer for job connection operations.
 * Handles validation, business rules, and coordinates repository calls.
 */

import { repositories } from '../repositories/index.js';
import {
  JobConnectionListFilters,
  CreateJobConnectionRequest,
  UpdateJobConnectionRequest,
  UpdateJobConnectionStatusRequest,
  JobConnectionFilters
} from '../models/job-connection.models.js';

export class JobConnectionService {
  /**
   * List job connections for an application with pagination and filtering
   */
  async listJobConnections(applicationId: number, userId: number, filters: Omit<JobConnectionListFilters, 'jobApplicationId'>) {
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
      throw new Error('Job application not found');
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

    // Build order by
    const orderBy = { [sortBy]: sortOrder };

    // Get paginated results
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
      jobConnections: paginatedConnections,
      pagination: {
        total,
        page,
        limit,
        pages
      }
    };
  }

  /**
   * Get a single job connection by ID with all relations
   */
  async getJobConnection(applicationId: number, connectionId: number, userId: number) {
    // Verify the job application belongs to the user
    const jobApplication = await repositories.jobApplication.findById(applicationId);
    if (!jobApplication || jobApplication.userId !== userId) {
      throw new Error('Job application not found');
    }

    const jobConnection = await repositories.jobConnection.findByIdWithRelations(connectionId);

    if (!jobConnection || jobConnection.jobApplicationId !== applicationId) {
      throw new Error('Job connection not found');
    }

    return jobConnection;
  }

  /**
   * Create a new job connection with business validation
   */
  async createJobConnection(applicationId: number, userId: number, data: Omit<CreateJobConnectionRequest, 'jobApplicationId'>) {
    // Verify the job application belongs to the user
    const jobApplication = await repositories.jobApplication.findById(applicationId);
    if (!jobApplication || jobApplication.userId !== userId) {
      throw new Error('Job application not found');
    }

    // Validate required fields
    if (!data.name?.trim()) {
      throw new Error('Contact name is required');
    }

    if (!data.connectionType?.trim()) {
      throw new Error('Connection type is required');
    }

    // Validate connection type enum
    const validConnectionTypes = ['referral', 'recruiter', 'hiring_manager', 'employee', 'alumni', 'networking', 'other'];
    if (!validConnectionTypes.includes(data.connectionType)) {
      throw new Error('Invalid connection type');
    }

    // Validate status enum if provided
    if (data.status) {
      const validStatuses = ['not_contacted', 'contacted', 'responded', 'meeting_scheduled', 'no_response', 'rejected'];
      if (!validStatuses.includes(data.status)) {
        throw new Error('Invalid status');
      }
    }

    // Validate email format if provided
    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    // Validate contact exists if contactId is provided
    if (data.contactId) {
      const contact = await repositories.contact.findById(data.contactId);
      if (!contact || contact.userId !== userId) {
        throw new Error('Contact not found');
      }
    }

    // Check for duplicate connection (same name and connection type for this application)
    const existingConnections = await repositories.jobConnection.findByJobApplication(applicationId);
    const duplicateConnection = existingConnections.find(conn => 
      conn.name.toLowerCase() === data.name.toLowerCase() && 
      conn.connectionType === data.connectionType
    );
    
    if (duplicateConnection) {
      throw new Error('Connection with this name and type already exists for this application');
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

    try {
      const jobConnection = await repositories.jobConnection.create(createData);
      
      // Fetch the created job connection with all relations
      return await repositories.jobConnection.findByIdWithRelations(jobConnection.id);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Foreign key constraint')) {
        throw new Error('Invalid application or contact ID provided');
      }
      throw error;
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
  ) {
    // Verify the job application belongs to the user
    const jobApplication = await repositories.jobApplication.findById(applicationId);
    if (!jobApplication || jobApplication.userId !== userId) {
      throw new Error('Job application not found');
    }

    // Check if job connection exists and belongs to the application
    const existingConnection = await repositories.jobConnection.findById(connectionId);
    if (!existingConnection || existingConnection.jobApplicationId !== applicationId) {
      throw new Error('Job connection not found');
    }

    // Validate data if provided
    if (data.name !== undefined && !data.name?.trim()) {
      throw new Error('Contact name cannot be empty');
    }

    if (data.connectionType) {
      const validConnectionTypes = ['referral', 'recruiter', 'hiring_manager', 'employee', 'alumni', 'networking', 'other'];
      if (!validConnectionTypes.includes(data.connectionType)) {
        throw new Error('Invalid connection type');
      }
    }

    if (data.status) {
      const validStatuses = ['not_contacted', 'contacted', 'responded', 'meeting_scheduled', 'no_response', 'rejected'];
      if (!validStatuses.includes(data.status)) {
        throw new Error('Invalid status');
      }
    }

    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    // Validate contact exists if contactId is provided
    if (data.contactId) {
      const contact = await repositories.contact.findById(data.contactId);
      if (!contact || contact.userId !== userId) {
        throw new Error('Contact not found');
      }
    }

    // Check for duplicate connection if name or connectionType is being updated
    if (data.name || data.connectionType) {
      const nameToCheck = data.name || existingConnection.name;
      const typeToCheck = data.connectionType || existingConnection.connectionType;
      
      const existingConnections = await repositories.jobConnection.findByJobApplication(applicationId);
      const duplicateConnection = existingConnections.find(conn => 
        conn.id !== connectionId &&
        conn.name.toLowerCase() === nameToCheck.toLowerCase() && 
        conn.connectionType === typeToCheck
      );
      
      if (duplicateConnection) {
        throw new Error('Connection with this name and type already exists for this application');
      }
    }

    // Convert date string to Date object if provided
    const updateData = { ...data };
    if (updateData.contactedAt) {
      (updateData as any).contactedAt = new Date(updateData.contactedAt);
    }

    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    // Update job connection
    await repositories.jobConnection.update(connectionId, cleanData);

    // Fetch the updated job connection with all relations
    return await repositories.jobConnection.findByIdWithRelations(connectionId);
  }

  /**
   * Update job connection status (convenience method)
   */
  async updateJobConnectionStatus(
    applicationId: number, 
    connectionId: number, 
    userId: number, 
    data: UpdateJobConnectionStatusRequest
  ) {
    // Validate status
    const validStatuses = ['not_contacted', 'contacted', 'responded', 'meeting_scheduled', 'no_response', 'rejected'];
    if (!validStatuses.includes(data.status)) {
      throw new Error('Invalid status');
    }

    const updateData: UpdateJobConnectionRequest = {
      status: data.status,
      notes: data.notes,
      contactedAt: data.contactedAt
    };

    // If status is 'contacted' and no contactedAt provided, set to now
    if (data.status === 'contacted' && !data.contactedAt) {
      updateData.contactedAt = new Date().toISOString();
    }

    return await this.updateJobConnection(applicationId, connectionId, userId, updateData);
  }

  /**
   * Delete a job connection with business validation
   */
  async deleteJobConnection(applicationId: number, connectionId: number, userId: number) {
    // Verify the job application belongs to the user
    const jobApplication = await repositories.jobApplication.findById(applicationId);
    if (!jobApplication || jobApplication.userId !== userId) {
      throw new Error('Job application not found');
    }

    // Check if job connection exists and belongs to the application
    const existingConnection = await repositories.jobConnection.findById(connectionId);
    if (!existingConnection || existingConnection.jobApplicationId !== applicationId) {
      throw new Error('Job connection not found');
    }

    // Delete the job connection
    await repositories.jobConnection.delete(connectionId);

    return { message: 'Job connection deleted successfully', deletedConnectionId: connectionId };
  }

  /**
   * Get job connection statistics for a user
   */
  async getJobConnectionStats(userId: number) {
    return await repositories.jobConnection.getJobConnectionStats(userId);
  }

  /**
   * Mark job connection as contacted
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