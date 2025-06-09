/**
 * Job Application Controller
 * 
 * Handles HTTP requests for job application CRUD operations.
 * Implements proper error handling, validation, and response formatting.
 * Uses JobApplicationService for business logic to maintain separation of concerns.
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
  try {
    // Extract user ID from JWT token and add to filters
    const userId = request.user!.userId;
    const filtersWithUser = {
      ...request.query,
      userId
    };
    
    const result = await jobApplicationService.listJobApplications(filtersWithUser);
    return reply.status(200).send(result);
  } catch (error) {
    request.log.error('Error listing job applications:', error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to retrieve job applications'
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
  try {
    const id = parseInt(request.params.id, 10);
    const userId = request.user!.userId;
    
    if (isNaN(id)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid job application ID'
      });
    }

    const jobApplication = await jobApplicationService.getJobApplication(id);
    
    // Verify ownership - user can only access their own applications
    if (jobApplication.userId !== userId) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You can only access your own job applications'
      });
    }
    
    return reply.status(200).send(jobApplication);
  } catch (error) {
    request.log.error('Error getting job application:', error);

    // Handle specific business logic errors
    if (error instanceof Error && error.message === 'Job application not found') {
      return reply.status(404).send({
        error: 'Not Found',
        message: error.message
      });
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to retrieve job application'
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
  try {
    // Extract user ID from JWT token and add to request data
    const userId = request.user!.userId;
    const createData = {
      ...request.body,
      userId
    };
    
    const createdJobApplication = await jobApplicationService.createJobApplication(createData);
    return reply.status(201).send(createdJobApplication);
  } catch (error) {
    request.log.error('Error creating job application:', error);
    
    // Handle specific business logic errors
    if (error instanceof Error && error.message === 'Invalid user ID provided') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message
      });
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to create job application'
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
  try {
    const id = parseInt(request.params.id, 10);
    const userId = request.user!.userId;
    
    if (isNaN(id)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid job application ID'
      });
    }

    // First check if application exists and user owns it
    const existingApplication = await jobApplicationService.getJobApplication(id);
    if (existingApplication.userId !== userId) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You can only update your own job applications'
      });
    }

    const finalJobApplication = await jobApplicationService.updateJobApplication(id, request.body);
    return reply.status(200).send(finalJobApplication);
  } catch (error) {
    request.log.error('Error updating job application:', error);

    // Handle specific business logic errors
    if (error instanceof Error && error.message === 'Job application not found') {
      return reply.status(404).send({
        error: 'Not Found',
        message: error.message
      });
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to update job application'
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
  try {
    const id = parseInt(request.params.id, 10);
    const userId = request.user!.userId;
    
    if (isNaN(id)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid job application ID'
      });
    }

    // First check if application exists and user owns it
    const existingApplication = await jobApplicationService.getJobApplication(id);
    if (existingApplication.userId !== userId) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You can only delete your own job applications'
      });
    }

    const result = await jobApplicationService.deleteJobApplication(id);
    return reply.status(200).send(result);
  } catch (error) {
    request.log.error('Error deleting job application:', error);

    // Handle specific business logic errors
    if (error instanceof Error && error.message === 'Job application not found') {
      return reply.status(404).send({
        error: 'Not Found',
        message: error.message
      });
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to delete job application'
    });
  }
} 