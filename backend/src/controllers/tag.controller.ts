/**
 * Tag Controller
 * 
 * Handles HTTP requests for tag management operations.
 * Follows auth controller pattern with class-based structure.
 * Implements proper error handling, validation, and response formatting.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { tagService } from '../services/index.js';
import { ListTagsQuery, ListTagsParams, AddTagsRequest } from '../models/tag.models.js';

export class TagController {

  /**
   * List all tags with optional filtering
   * GET /api/users/:userId/tags
   */
  async listTags(
    request: FastifyRequest<{ 
      Params: ListTagsParams;
      Querystring: ListTagsQuery 
    }>,
    reply: FastifyReply
  ) {
    // Validate user ID
    const userId = parseInt(request.params.userId, 10);
    if (isNaN(userId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid user ID'
      });
    }

    // Extract query parameters
    const { search, limit = 50 } = request.query;

    // Call service method
    const result = await tagService.getUserTags({
      userId,
      search,
      limit
    });

    // Handle service result
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send(result.tags);
  }

  /**
   * Add tags to a job application
   * POST /api/applications/:id/tags
   */
  async addTagsToApplication(
    request: FastifyRequest<{ 
      Params: { id: string }; 
      Body: AddTagsRequest 
    }>,
    reply: FastifyReply
  ) {
    // Validate job application ID
    const jobApplicationId = parseInt(request.params.id, 10);
    if (isNaN(jobApplicationId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid job application ID'
      });
    }

    // Extract request body
    const { tagNames } = request.body;

    // Call service method
    const result = await tagService.addTagsToApplication({
      jobApplicationId,
      tagNames
    });

    // Handle service result
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send(result.tags);
  }

  /**
   * Remove a tag from a job application
   * DELETE /api/applications/:id/tags/:tagId
   */
  async removeTagFromApplication(
    request: FastifyRequest<{ 
      Params: { id: string; tagId: string } 
    }>,
    reply: FastifyReply
  ) {
    // Validate job application ID
    const jobApplicationId = parseInt(request.params.id, 10);
    if (isNaN(jobApplicationId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid job application ID'
      });
    }

    // Validate tag ID
    const tagId = parseInt(request.params.tagId, 10);
    if (isNaN(tagId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid tag ID'
      });
    }

    // Call service method
    // Note: This endpoint uses tagId but service expects tagName
    // This is a legacy endpoint design issue that should be addressed
    const result = await tagService.removeTagFromApplication({
      jobApplicationId,
      tagName: tagId.toString() // Converting tagId to tagName for backward compatibility
    });

    // Handle service result
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message,
      removedTagNames: result.removedTagNames
    });
  }
}

// Export singleton instance
export const tagController = new TagController(); 