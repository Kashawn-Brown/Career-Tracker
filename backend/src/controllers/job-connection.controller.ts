/**
 * Job Connection Controller
 * 
 * Handles HTTP requests for job connection CRUD operations.
 * Implements proper error handling, validation, and response formatting.
 * Uses JobConnectionService for business logic to maintain separation of concerns.
 * Follows auth-style controller pattern.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { jobConnectionService } from '../services/index.js';
import type { 
  JobConnectionListFilters, 
  CreateJobConnectionRequest, 
  UpdateJobConnectionRequest,
  UpdateJobConnectionStatusRequest
} from '../models/job-connection.models.js';

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
        error: 'Invalid job application ID'
      });
    }
    
    const result = await jobConnectionService.listJobConnections(applicationId, userId, request.query);
    
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send(result.data);
  } catch (error) {
    request.log.error('Error listing job connections:', error);
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
        error: 'Invalid application or connection ID'
      });
    }

    const result = await jobConnectionService.getJobConnection(applicationId, connectionId, userId);
    
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send(result.jobConnection);
  } catch (error) {
    request.log.error('Error getting job connection:', error);
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
        error: 'Invalid job application ID'
      });
    }
    
    const result = await jobConnectionService.createJobConnection(applicationId, userId, request.body);
    
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message,
      jobConnection: result.jobConnection
    });
  } catch (error) {
    request.log.error('Error creating job connection:', error);
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
        error: 'Invalid application or connection ID'
      });
    }

    const result = await jobConnectionService.updateJobConnection(
      applicationId, 
      connectionId, 
      userId, 
      request.body
    );
    
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message,
      jobConnection: result.jobConnection
    });
  } catch (error) {
    request.log.error('Error updating job connection:', error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to update job connection'
    });
  }
}

/**
 * Update job connection status (user's own applications)
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
        error: 'Invalid application or connection ID'
      });
    }

    const result = await jobConnectionService.updateJobConnectionStatus(
      applicationId, 
      connectionId, 
      userId, 
      request.body
    );
    
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message,
      jobConnection: result.jobConnection
    });
  } catch (error) {
    request.log.error('Error updating job connection status:', error);
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
        error: 'Invalid application or connection ID'
      });
    }

    const result = await jobConnectionService.deleteJobConnection(applicationId, connectionId, userId);
    
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message
    });
  } catch (error) {
    request.log.error('Error deleting job connection:', error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to delete job connection'
    });
  }
} 