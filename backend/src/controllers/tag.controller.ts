/**
 * Tag Controller
 * 
 * Handles HTTP requests for tag management operations.
 * Implements proper error handling, validation, and response formatting.
 * Uses TagService for business logic to maintain separation of concerns.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { tagService } from '../services/index.js';
import { ListTagsQuery, ListTagsParams, AddTagsRequest } from '../models/tag.models.js';

/**
 * List all tags with optional filtering
 */
export async function listTags(
  request: FastifyRequest<{ 
    Params: ListTagsParams;
    Querystring: ListTagsQuery 
  }>,
  reply: FastifyReply
) {
  try {
    const userId = parseInt(request.params.userId, 10);
    const { search, limit = 50 } = request.query;

    if (isNaN(userId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid user ID'
      });
    }

    const tags = await tagService.getUserTags({
      userId,
      search,
      limit
    });

    return reply.status(200).send(tags);
  } catch (error) {
    request.log.error('Error listing tags:', error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to retrieve tags'
    });
  }
}

/**
 * Add tags to a job application
 */
export async function addTagsToApplication(
  request: FastifyRequest<{ 
    Params: { id: string }; 
    Body: AddTagsRequest 
  }>,
  reply: FastifyReply
) {
  try {
    const jobApplicationId = parseInt(request.params.id, 10);
    const { tags } = request.body;

    if (isNaN(jobApplicationId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid job application ID'
      });
    }

    const createdTags = await tagService.addTagsToApplication({
      jobApplicationId,
      tags
    });

    return reply.status(200).send(createdTags);
  } catch (error) {
    request.log.error('Error adding tags to application:', error);
    
    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message === 'Job application not found') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      if (error.message === 'At least one valid tag is required') {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message
        });
      }
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to add tags to job application'
    });
  }
}

/**
 * Remove a tag from a job application
 */
export async function removeTagFromApplication(
  request: FastifyRequest<{ 
    Params: { id: string; tagId: string } 
  }>,
  reply: FastifyReply
) {
  try {
    const jobApplicationId = parseInt(request.params.id, 10);
    const tagId = parseInt(request.params.tagId, 10);

    if (isNaN(jobApplicationId) || isNaN(tagId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid job application ID or tag ID'
      });
    }

    const result = await tagService.removeTagFromApplication({
      jobApplicationId,
      tagId
    });

    return reply.status(200).send(result);
  } catch (error) {
    request.log.error('Error removing tag from application:', error);

    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message === 'Job application not found' || error.message === 'Tag not found') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      if (error.message === 'Tag does not belong to the specified job application') {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message
        });
      }
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to remove tag from job application'
    });
  }
} 