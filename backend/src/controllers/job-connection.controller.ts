/**
 * Job Connection Controller
 * 
 * Handles HTTP requests for job connection CRUD operations.
 * Implements proper error handling, validation, and response formatting.
 * Uses JobConnectionService for business logic to maintain separation of concerns.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { JobConnectionService } from '../services/job-connection.service.js';
import type { 
  JobConnectionListFilters, 
  CreateJobConnectionRequest, 
  UpdateJobConnectionRequest,
  UpdateJobConnectionStatusRequest
} from '../models/job-connection.models.js';

// Create service instance
const jobConnectionService = new JobConnectionService();

/**
 * List job connections for an application (user's own applications)
 */
export async function listJobConnections(
  request: FastifyRequest<{ 
    Params: { id: string }; 
    Querystring: Omit<JobConnectionListFilters, 'jobApplicationId'> 
  }>,
  reply: FastifyReply
) {
  try {
    const applicationId = parseInt(request.params.id, 10);
    const userId = request.user!.userId;
    
    if (isNaN(applicationId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid job application ID'
      });
    }
    
    const result = await jobConnectionService.listJobConnections(applicationId, userId, request.query);
    return reply.status(200).send(result);
  } catch (error) {
    request.log.error('Error listing job connections:', error);
    
    // Handle specific business logic errors
    if (error instanceof Error && error.message === 'Job application not found') {
      return reply.status(404).send({
        error: 'Not Found',
        message: error.message
      });
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to retrieve job connections'
    });
  }
}

/**
 * Get a single job connection by ID (user's own applications)
 */
export async function getJobConnection(
  request: FastifyRequest<{ Params: { id: string; connectionId: string } }>,
  reply: FastifyReply
) {
  try {
    const applicationId = parseInt(request.params.id, 10);
    const connectionId = parseInt(request.params.connectionId, 10);
    const userId = request.user!.userId;
    
    if (isNaN(applicationId) || isNaN(connectionId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid application or connection ID'
      });
    }

    const jobConnection = await jobConnectionService.getJobConnection(applicationId, connectionId, userId);
    return reply.status(200).send(jobConnection);
  } catch (error) {
    request.log.error('Error getting job connection:', error);

    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message === 'Job application not found' || error.message === 'Job connection not found') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to retrieve job connection'
    });
  }
}

/**
 * Create a new job connection for an application (user's own applications)
 */
export async function createJobConnection(
  request: FastifyRequest<{ 
    Params: { id: string }; 
    Body: Omit<CreateJobConnectionRequest, 'jobApplicationId'> 
  }>,
  reply: FastifyReply
) {
  try {
    const applicationId = parseInt(request.params.id, 10);
    const userId = request.user!.userId;
    
    if (isNaN(applicationId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid job application ID'
      });
    }
    
    const createdJobConnection = await jobConnectionService.createJobConnection(applicationId, userId, request.body);
    return reply.status(201).send(createdJobConnection);
  } catch (error) {
    request.log.error('Error creating job connection:', error);
    
    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message === 'Job application not found') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      
      if (error.message.includes('Contact name is required') ||
          error.message.includes('Connection type is required') ||
          error.message.includes('Invalid connection type') ||
          error.message.includes('Invalid status') ||
          error.message.includes('Invalid email format') ||
          error.message.includes('Contact not found') ||
          error.message.includes('Connection with this name and type already exists')) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message
        });
      }
      
      if (error.message === 'Invalid application or contact ID provided') {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message
        });
      }
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to create job connection'
    });
  }
}

/**
 * Update an existing job connection (user's own applications)
 */
export async function updateJobConnection(
  request: FastifyRequest<{ 
    Params: { id: string; connectionId: string }; 
    Body: UpdateJobConnectionRequest 
  }>,
  reply: FastifyReply
) {
  try {
    const applicationId = parseInt(request.params.id, 10);
    const connectionId = parseInt(request.params.connectionId, 10);
    const userId = request.user!.userId;
    
    if (isNaN(applicationId) || isNaN(connectionId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid application or connection ID'
      });
    }

    const updatedJobConnection = await jobConnectionService.updateJobConnection(
      applicationId, 
      connectionId, 
      userId, 
      request.body
    );
    return reply.status(200).send(updatedJobConnection);
  } catch (error) {
    request.log.error('Error updating job connection:', error);

    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message === 'Job application not found' || error.message === 'Job connection not found') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      
      if (error.message.includes('Contact name cannot be empty') ||
          error.message.includes('Invalid connection type') ||
          error.message.includes('Invalid status') ||
          error.message.includes('Invalid email format') ||
          error.message.includes('Contact not found') ||
          error.message.includes('Connection with this name and type already exists')) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message
        });
      }
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to update job connection'
    });
  }
}

/**
 * Update job connection status (convenience endpoint)
 */
export async function updateJobConnectionStatus(
  request: FastifyRequest<{ 
    Params: { id: string; connectionId: string }; 
    Body: UpdateJobConnectionStatusRequest 
  }>,
  reply: FastifyReply
) {
  try {
    const applicationId = parseInt(request.params.id, 10);
    const connectionId = parseInt(request.params.connectionId, 10);
    const userId = request.user!.userId;
    
    if (isNaN(applicationId) || isNaN(connectionId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid application or connection ID'
      });
    }

    const updatedJobConnection = await jobConnectionService.updateJobConnectionStatus(
      applicationId, 
      connectionId, 
      userId, 
      request.body
    );
    return reply.status(200).send(updatedJobConnection);
  } catch (error) {
    request.log.error('Error updating job connection status:', error);

    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message === 'Job application not found' || error.message === 'Job connection not found') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      
      if (error.message.includes('Invalid status')) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message
        });
      }
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to update job connection status'
    });
  }
}

/**
 * Delete a job connection (user's own applications)
 */
export async function deleteJobConnection(
  request: FastifyRequest<{ Params: { id: string; connectionId: string } }>,
  reply: FastifyReply
) {
  try {
    const applicationId = parseInt(request.params.id, 10);
    const connectionId = parseInt(request.params.connectionId, 10);
    const userId = request.user!.userId;
    
    if (isNaN(applicationId) || isNaN(connectionId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid application or connection ID'
      });
    }

    const result = await jobConnectionService.deleteJobConnection(applicationId, connectionId, userId);
    return reply.status(200).send(result);
  } catch (error) {
    request.log.error('Error deleting job connection:', error);

    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message === 'Job application not found' || error.message === 'Job connection not found') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to delete job connection'
    });
  }
} 