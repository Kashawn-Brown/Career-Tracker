/**
 * Tag Controller Tests
 * 
 * Unit tests for TagController following the auth controller pattern.
 * Tests HTTP request handling, validation, and response formatting.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { TagController } from '../../controllers/tag.controller.js';
import { tagService } from '../../services/index.js';
import { Tag } from '@prisma/client';

// Mock the tag service
vi.mock('../../services/index.js', () => ({
  tagService: {
    getUserTags: vi.fn(),
    addTagsToApplication: vi.fn(),
    removeTagFromApplication: vi.fn()
  }
}));

describe('TagController', () => {
  let tagController: TagController;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  const mockTag: Tag = {
    id: 1,
    name: 'JavaScript',
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    tagController = new TagController();
    
    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };

    vi.clearAllMocks();
  });

  describe('listTags', () => {
    beforeEach(() => {
      mockRequest = {
        params: { userId: '1' },
        query: { search: 'Java', limit: 10 }
      };
    });

    it('should return tags successfully', async () => {
      const mockServiceResult = {
        success: true,
        statusCode: 200,
        tags: [{ id: 1, name: 'JavaScript', usageCount: 5 }]
      };
      (tagService.getUserTags as Mock).mockResolvedValue(mockServiceResult);

      await tagController.listTags(
        mockRequest as FastifyRequest<{ 
          Params: { userId: string };
          Querystring: { search?: string; limit?: number }
        }>,
        mockReply as FastifyReply
      );

      expect(tagService.getUserTags).toHaveBeenCalledWith({
        userId: 1,
        search: 'Java',
        limit: 10
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(mockServiceResult.tags);
    });

    it('should return 400 for invalid user ID', async () => {
      mockRequest.params = { userId: 'invalid' };

      await tagController.listTags(
        mockRequest as FastifyRequest<{ 
          Params: { userId: string };
          Querystring: { search?: string; limit?: number }
        }>,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Invalid user ID'
      });
      expect(tagService.getUserTags).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const mockServiceResult = {
        success: false,
        statusCode: 500,
        error: 'Database error'
      };
      (tagService.getUserTags as Mock).mockResolvedValue(mockServiceResult);

      await tagController.listTags(
        mockRequest as FastifyRequest<{ 
          Params: { userId: string };
          Querystring: { search?: string; limit?: number }
        }>,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Database error'
      });
    });

    it('should use default limit when not provided', async () => {
      mockRequest.query = { search: 'Java' };
      const mockServiceResult = {
        success: true,
        statusCode: 200,
        tags: []
      };
      (tagService.getUserTags as Mock).mockResolvedValue(mockServiceResult);

      await tagController.listTags(
        mockRequest as FastifyRequest<{ 
          Params: { userId: string };
          Querystring: { search?: string; limit?: number }
        }>,
        mockReply as FastifyReply
      );

      expect(tagService.getUserTags).toHaveBeenCalledWith({
        userId: 1,
        search: 'Java',
        limit: 50
      });
    });
  });

  describe('addTagsToApplication', () => {
    beforeEach(() => {
      mockRequest = {
        params: { id: '1' },
        body: { tagNames: ['JavaScript', 'React'] }
      };
    });

    it('should add tags successfully', async () => {
      const mockServiceResult = {
        success: true,
        statusCode: 200,
        tags: [mockTag]
      };
      (tagService.addTagsToApplication as Mock).mockResolvedValue(mockServiceResult);

      await tagController.addTagsToApplication(
        mockRequest as FastifyRequest<{ 
          Params: { id: string };
          Body: { tagNames: string[] }
        }>,
        mockReply as FastifyReply
      );

      expect(tagService.addTagsToApplication).toHaveBeenCalledWith({
        jobApplicationId: 1,
        tagNames: ['JavaScript', 'React']
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(mockServiceResult.tags);
    });

    it('should return 400 for invalid job application ID', async () => {
      mockRequest.params = { id: 'invalid' };

      await tagController.addTagsToApplication(
        mockRequest as FastifyRequest<{ 
          Params: { id: string };
          Body: { tagNames: string[] }
        }>,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Invalid job application ID'
      });
      expect(tagService.addTagsToApplication).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const mockServiceResult = {
        success: false,
        statusCode: 404,
        error: 'Job application not found'
      };
      (tagService.addTagsToApplication as Mock).mockResolvedValue(mockServiceResult);

      await tagController.addTagsToApplication(
        mockRequest as FastifyRequest<{ 
          Params: { id: string };
          Body: { tagNames: string[] }
        }>,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Job application not found'
      });
    });

    it('should handle validation errors', async () => {
      const mockServiceResult = {
        success: false,
        statusCode: 400,
        error: 'At least one valid tag is required'
      };
      (tagService.addTagsToApplication as Mock).mockResolvedValue(mockServiceResult);

      await tagController.addTagsToApplication(
        mockRequest as FastifyRequest<{ 
          Params: { id: string };
          Body: { tagNames: string[] }
        }>,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'At least one valid tag is required'
      });
    });
  });

  describe('removeTagFromApplication', () => {
    beforeEach(() => {
      mockRequest = {
        params: { id: '1', tagId: '123' }
      };
    });

    it('should remove tag successfully', async () => {
      const mockServiceResult = {
        success: true,
        statusCode: 200,
        message: 'Tag removed successfully',
        removedTagNames: ['123']
      };
      (tagService.removeTagFromApplication as Mock).mockResolvedValue(mockServiceResult);

      await tagController.removeTagFromApplication(
        mockRequest as FastifyRequest<{ 
          Params: { id: string; tagId: string }
        }>,
        mockReply as FastifyReply
      );

      expect(tagService.removeTagFromApplication).toHaveBeenCalledWith({
        jobApplicationId: 1,
        tagName: '123'
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Tag removed successfully',
        removedTagNames: ['123']
      });
    });

    it('should return 400 for invalid job application ID', async () => {
      mockRequest.params = { id: 'invalid', tagId: '123' };

      await tagController.removeTagFromApplication(
        mockRequest as FastifyRequest<{ 
          Params: { id: string; tagId: string }
        }>,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Invalid job application ID'
      });
      expect(tagService.removeTagFromApplication).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid tag ID', async () => {
      mockRequest.params = { id: '1', tagId: 'invalid' };

      await tagController.removeTagFromApplication(
        mockRequest as FastifyRequest<{ 
          Params: { id: string; tagId: string }
        }>,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Invalid tag ID'
      });
      expect(tagService.removeTagFromApplication).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const mockServiceResult = {
        success: false,
        statusCode: 404,
        error: 'Job application not found'
      };
      (tagService.removeTagFromApplication as Mock).mockResolvedValue(mockServiceResult);

      await tagController.removeTagFromApplication(
        mockRequest as FastifyRequest<{ 
          Params: { id: string; tagId: string }
        }>,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Job application not found'
      });
    });

    it('should handle tag not found errors', async () => {
      const mockServiceResult = {
        success: false,
        statusCode: 400,
        error: 'At least one valid tag name is required'
      };
      (tagService.removeTagFromApplication as Mock).mockResolvedValue(mockServiceResult);

      await tagController.removeTagFromApplication(
        mockRequest as FastifyRequest<{ 
          Params: { id: string; tagId: string }
        }>,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'At least one valid tag name is required'
      });
    });
  });
}); 