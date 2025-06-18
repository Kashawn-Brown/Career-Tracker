/**
 * Job Application Controller
 * 
 * Handles HTTP requests for job application CRUD operations.
 * Implements proper error handling, validation, and response formatting.
 * Uses JobApplicationService for business logic to maintain separation of concerns.
 * Follows the class-based controller pattern established in auth and contact controllers.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { jobApplicationService } from '../services/index.js';
import type { 
  JobApplicationListFilters, 
  CreateJobApplicationRequest, 
  UpdateJobApplicationRequest 
} from '../models/job-application.models.js';

export class JobApplicationController {

  // CORE JOB APPLICATION OPERATIONS

  /**
   * List job applications with pagination and filtering (user's own applications)
   * GET /api/applications
   */
  async listJobApplications(
    request: FastifyRequest<{ Querystring: JobApplicationListFilters }>,
    reply: FastifyReply
  ) {
    // Extract user ID from JWT token and add to filters
    const userId = request.user!.userId;
    const filtersWithUser = {
      ...request.query,
      userId
    };
    
    // Call service method which handles all business logic
    const result = await jobApplicationService.listJobApplications(filtersWithUser);
    
    // Handle service result
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message || 'Job applications retrieved successfully',
      data: {
        jobApplications: result.data?.jobApplications || [],
        pagination: result.data?.pagination
      }
    });
  }

  /**
   * Get a single job application by ID (user's own application)
   * GET /api/applications/:id
   */
  async getJobApplication(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    // Extract and validate ID
    const id = parseInt(request.params.id, 10);
    const userId = request.user!.userId;
    
    // Basic validation handled in controller for HTTP concerns
    if (isNaN(id)) {
      return reply.status(400).send({
        error: 'Invalid job application ID format'
      });
    }

    // Call service method which handles authorization and business logic
    const result = await jobApplicationService.getJobApplication(id, userId);
    
    // Handle service result
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message || 'Job application retrieved successfully',
      data: result.jobApplication
    });
  }

  /**
   * Create a new job application (for authenticated user)
   * POST /api/applications
   */
  async createJobApplication(
    request: FastifyRequest<{ Body: CreateJobApplicationRequest }>,
    reply: FastifyReply
  ) {
    // Extract user ID from JWT token and add to request data
    const userId = request.user!.userId;
    const createData = {
      ...request.body,
      userId
    };
    
    // Call service method which handles validation and business logic
    const result = await jobApplicationService.createJobApplication(createData);
    
    // Handle service result
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message || 'Job application created successfully',
      data: result.jobApplication
    });
  }

  /**
   * Update an existing job application (user's own application)
   * PUT /api/applications/:id
   */
  async updateJobApplication(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateJobApplicationRequest }>,
    reply: FastifyReply
  ) {
    // Extract and validate ID
    const id = parseInt(request.params.id, 10);
    const userId = request.user!.userId;
    
    // Basic validation handled in controller for HTTP concerns
    if (isNaN(id)) {
      return reply.status(400).send({
        error: 'Invalid job application ID format'
      });
    }

    // Call service method which handles authorization and business logic
    const result = await jobApplicationService.updateJobApplication(id, request.body, userId);
    
    // Handle service result
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message || 'Job application updated successfully',
      data: result.jobApplication
    });
  }

  /**
   * Delete a job application (user's own application)
   * DELETE /api/applications/:id
   */
  async deleteJobApplication(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    // Extract and validate ID
    const id = parseInt(request.params.id, 10);
    const userId = request.user!.userId;
    
    // Basic validation handled in controller for HTTP concerns
    if (isNaN(id)) {
      return reply.status(400).send({
        error: 'Invalid job application ID format'
      });
    }

    // Call service method which handles authorization and business logic
    const result = await jobApplicationService.deleteJobApplication(id, userId);
    
    // Handle service result
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message || 'Job application deleted successfully'
    });
  }
}

// Export controller functions for routing (following contact pattern)
const jobApplicationController = new JobApplicationController();

export const listJobApplications = jobApplicationController.listJobApplications.bind(jobApplicationController);
export const getJobApplication = jobApplicationController.getJobApplication.bind(jobApplicationController);
export const createJobApplication = jobApplicationController.createJobApplication.bind(jobApplicationController);
export const updateJobApplication = jobApplicationController.updateJobApplication.bind(jobApplicationController);
export const deleteJobApplication = jobApplicationController.deleteJobApplication.bind(jobApplicationController); 