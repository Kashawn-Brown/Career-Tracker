/**
 * Job Application Controller
 * 
 * Handles HTTP requests for job application CRUD operations.
 * Implements proper error handling, validation, and response formatting.
 * Uses JobApplicationService for business logic to maintain separation of concerns.
 * Follows the auth-style pattern with minimal controller logic.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { jobApplicationService } from '../services/index.js';
import type { 
  JobApplicationListFilters, 
  CreateJobApplicationRequest, 
  UpdateJobApplicationRequest 
} from '../models/job-application.models.js';

/**
 * List job applications with pagination and filtering (user's own applications)
 */
export async function listJobApplications(
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
  
  // Return structured response
  if (result.success) {
    return reply.status(result.statusCode).send(result.data);
  } else {
    return reply.status(result.statusCode).send({
      error: result.error
    });
  }
}

/**
 * Get a single job application by ID (user's own application)
 */
export async function getJobApplication(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  // Extract and validate ID
  const id = parseInt(request.params.id, 10);
  const userId = request.user!.userId;
  
  // Basic input validation
  if (isNaN(id)) {
    return reply.status(400).send({
      error: 'Invalid job application ID'
    });
  }

  // Call service method which handles authorization and business logic
  const result = await jobApplicationService.getJobApplication(id, userId);
  
  // Return structured response
  if (result.success) {
    return reply.status(result.statusCode).send(result.jobApplication);
  } else {
    return reply.status(result.statusCode).send({
      error: result.error
    });
  }
}

/**
 * Create a new job application (for authenticated user)
 */
export async function createJobApplication(
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
  
  // Return structured response
  if (result.success) {
    return reply.status(result.statusCode).send(result.jobApplication);
  } else {
    return reply.status(result.statusCode).send({
      error: result.error
    });
  }
}

/**
 * Update an existing job application (user's own application)
 */
export async function updateJobApplication(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateJobApplicationRequest }>,
  reply: FastifyReply
) {
  // Extract and validate ID
  const id = parseInt(request.params.id, 10);
  const userId = request.user!.userId;
  
  // Basic input validation
  if (isNaN(id)) {
    return reply.status(400).send({
      error: 'Invalid job application ID'
    });
  }

  // Call service method which handles authorization and business logic
  const result = await jobApplicationService.updateJobApplication(id, request.body, userId);
  
  // Return structured response
  if (result.success) {
    return reply.status(result.statusCode).send(result.jobApplication);
  } else {
    return reply.status(result.statusCode).send({
      error: result.error
    });
  }
}

/**
 * Delete a job application (user's own application)
 */
export async function deleteJobApplication(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  // Extract and validate ID
  const id = parseInt(request.params.id, 10);
  const userId = request.user!.userId;
  
  // Basic input validation
  if (isNaN(id)) {
    return reply.status(400).send({
      error: 'Invalid job application ID'
    });
  }

  // Call service method which handles authorization and business logic
  const result = await jobApplicationService.deleteJobApplication(id, userId);
  
  // Return structured response
  if (result.success) {
    return reply.status(result.statusCode).send({
      message: result.message,
      deletedId: result.deletedId
    });
  } else {
    return reply.status(result.statusCode).send({
      error: result.error
    });
  }
} 