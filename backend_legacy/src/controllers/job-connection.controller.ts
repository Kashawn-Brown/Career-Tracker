/**
 * Job Connection Controller
 * 
 * Handles HTTP requests for job connection CRUD operations.
 * Implements proper error handling, validation, and response formatting.
 * Uses JobConnectionService for business logic to maintain separation of concerns.
 * Follows the class-based controller pattern established in auth and contact controllers.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { jobConnectionService } from '../services/index.js';
import type { 
  JobConnectionListFilters, 
  CreateJobConnectionRequest, 
  UpdateJobConnectionRequest,
  UpdateJobConnectionStatusRequest
} from '../models/job-connection.models.js';

export class JobConnectionController {

  // CORE JOB CONNECTION OPERATIONS

  /**
   * List job connections for an application (user's own applications)
   * GET /api/applications/:id/connections
   */
  async listJobConnections(
    request: FastifyRequest<{ 
      Params: { id: string }; 
      Querystring: Omit<JobConnectionListFilters, 'jobApplicationId'> 
    }>,
    reply: FastifyReply
  ) {
    const applicationId = parseInt(request.params.id, 10);
    const userId = request.user!.userId;
    
    // Basic validation handled in controller for HTTP concerns
    if (isNaN(applicationId)) {
      return reply.status(400).send({
        error: 'Invalid job application ID format'
      });
    }
    
    const result = await jobConnectionService.listJobConnections(applicationId, userId, request.query);
    
    // Handle service result
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message || 'Job connections retrieved successfully',
      jobConnections: result.data?.jobConnections || [],
      pagination: result.data?.pagination
    });
  }

  /**
   * Get a single job connection by ID (user's own applications)
   * GET /api/applications/:id/connections/:connectionId
   */
  async getJobConnection(
    request: FastifyRequest<{ Params: { id: string; connectionId: string } }>,
    reply: FastifyReply
  ) {
    const applicationId = parseInt(request.params.id, 10);
    const connectionId = parseInt(request.params.connectionId, 10);
    const userId = request.user!.userId;
    
    // Basic validation handled in controller for HTTP concerns
    if (isNaN(applicationId) || isNaN(connectionId)) {
      return reply.status(400).send({
        error: 'Invalid job application ID or connection ID format'
      });
    }

    const result = await jobConnectionService.getJobConnection(applicationId, connectionId, userId);
    
    // Handle service result
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message || 'Job connection retrieved successfully',
      jobConnection: result.jobConnection
    });
  }

  /**
   * Create a new job connection for an application (user's own applications)
   * POST /api/applications/:id/connections
   */
  async createJobConnection(
    request: FastifyRequest<{ 
      Params: { id: string }; 
      Body: Omit<CreateJobConnectionRequest, 'jobApplicationId'> 
    }>,
    reply: FastifyReply
  ) {
    const applicationId = parseInt(request.params.id, 10);
    const userId = request.user!.userId;
    
    // Basic validation handled in controller for HTTP concerns
    if (isNaN(applicationId)) {
      return reply.status(400).send({
        error: 'Invalid job application ID format'
      });
    }
    
    const result = await jobConnectionService.createJobConnection(applicationId, userId, request.body);
    
    // Handle service result
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message || 'Job connection created successfully',
      jobConnection: result.jobConnection
    });
  }

  /**
   * Update an existing job connection (user's own applications)
   * PUT /api/applications/:id/connections/:connectionId
   */
  async updateJobConnection(
    request: FastifyRequest<{ 
      Params: { id: string; connectionId: string }; 
      Body: UpdateJobConnectionRequest 
    }>,
    reply: FastifyReply
  ) {
    const applicationId = parseInt(request.params.id, 10);
    const connectionId = parseInt(request.params.connectionId, 10);
    const userId = request.user!.userId;
    
    // Basic validation handled in controller for HTTP concerns
    if (isNaN(applicationId) || isNaN(connectionId)) {
      return reply.status(400).send({
        error: 'Invalid job application ID or connection ID format'
      });
    }

    const result = await jobConnectionService.updateJobConnection(
      applicationId, 
      connectionId, 
      userId, 
      request.body
    );
    
    // Handle service result
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message || 'Job connection updated successfully',
      jobConnection: result.jobConnection
    });
  }

  /**
   * Update job connection status (user's own applications)
   * PATCH /api/applications/:id/connections/:connectionId/status
   */
  async updateJobConnectionStatus(
    request: FastifyRequest<{ 
      Params: { id: string; connectionId: string }; 
      Body: UpdateJobConnectionStatusRequest 
    }>,
    reply: FastifyReply
  ) {
    const applicationId = parseInt(request.params.id, 10);
    const connectionId = parseInt(request.params.connectionId, 10);
    const userId = request.user!.userId;
    
    // Basic validation handled in controller for HTTP concerns
    if (isNaN(applicationId) || isNaN(connectionId)) {
      return reply.status(400).send({
        error: 'Invalid job application ID or connection ID format'
      });
    }

    const result = await jobConnectionService.updateJobConnectionStatus(
      applicationId, 
      connectionId, 
      userId, 
      request.body
    );
    
    // Handle service result
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message || 'Job connection status updated successfully',
      jobConnection: result.jobConnection
    });
  }

  /**
   * Delete a job connection (user's own applications)
   * DELETE /api/applications/:id/connections/:connectionId
   */
  async deleteJobConnection(
    request: FastifyRequest<{ Params: { id: string; connectionId: string } }>,
    reply: FastifyReply
  ) {
    const applicationId = parseInt(request.params.id, 10);
    const connectionId = parseInt(request.params.connectionId, 10);
    const userId = request.user!.userId;
    
    // Basic validation handled in controller for HTTP concerns
    if (isNaN(applicationId) || isNaN(connectionId)) {
      return reply.status(400).send({
        error: 'Invalid job application ID or connection ID format'
      });
    }

    const result = await jobConnectionService.deleteJobConnection(applicationId, connectionId, userId);
    
    // Handle service result
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message || 'Job connection deleted successfully'
    });
  }
}

// Export controller functions for routing (following contact pattern)
const jobConnectionController = new JobConnectionController();

export const listJobConnections = jobConnectionController.listJobConnections.bind(jobConnectionController);
export const getJobConnection = jobConnectionController.getJobConnection.bind(jobConnectionController);
export const createJobConnection = jobConnectionController.createJobConnection.bind(jobConnectionController);
export const updateJobConnection = jobConnectionController.updateJobConnection.bind(jobConnectionController);
export const updateJobConnectionStatus = jobConnectionController.updateJobConnectionStatus.bind(jobConnectionController);
export const deleteJobConnection = jobConnectionController.deleteJobConnection.bind(jobConnectionController); 