/**
 * Tag Service Tests
 * 
 * Unit tests for TagService following the auth service pattern.
 * Tests business logic, validation, and result object handling.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { TagService } from '../../services/tag.service.js';
import { repositories } from '../../repositories/index.js';
import { Tag, JobApplication } from '@prisma/client';

// Mock repositories
vi.mock('../../repositories/index.js', () => ({
  repositories: {
    tag: {
      suggestTags: vi.fn(),
      findByUser: vi.fn(),
      findPopularTagsByUser: vi.fn(),
      addTagsToJobApplication: vi.fn(),
      removeTagsFromJobApplication: vi.fn(),
      replaceTagsForJobApplication: vi.fn(),
      findByJobApplication: vi.fn(),
      getTagStats: vi.fn(),
      findAllTagNames: vi.fn(),
      cleanupOrphanedTags: vi.fn()
    },
    jobApplication: {
      findById: vi.fn()
    }
  }
}));

describe('TagService', () => {
  let tagService: TagService;
  const mockJobApplication: JobApplication = {
    id: 1,
    userId: 1,
    companyName: 'Test Company',
    position: 'Developer',
    status: 'applied',
    applicationDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    jobDescription: null,
    jobUrl: null,
    salaryRange: null,
    location: null,
    contactEmail: null,
    contactPhone: null,
    notes: null,
    followUpDate: null
  };

  const mockTag: Tag = {
    id: 1,
    name: 'JavaScript',
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    tagService = new TagService();
    vi.clearAllMocks();
  });

  describe('getUserTags', () => {
    it('should return tags when search query is provided', async () => {
      const mockSuggestions = [{ id: 1, name: 'JavaScript', usageCount: 5 }];
      (repositories.tag.suggestTags as Mock).mockResolvedValue(mockSuggestions);

      const result = await tagService.getUserTags({
        userId: 1,
        search: 'Java',
        limit: 10
      });

      expect(result).toEqual({
        success: true,
        statusCode: 200,
        tags: mockSuggestions
      });
      expect(repositories.tag.suggestTags).toHaveBeenCalledWith('Java', 1, 10);
    });

    it('should return user tags when no search query is provided', async () => {
      const mockUserTags = [{
        ...mockTag,
        jobApplications: [mockJobApplication, mockJobApplication]
      }];
      (repositories.tag.findByUser as Mock).mockResolvedValue(mockUserTags);

      const result = await tagService.getUserTags({
        userId: 1,
        limit: 50
      });

      expect(result).toEqual({
        success: true,
        statusCode: 200,
        tags: [{
          id: 1,
          name: 'JavaScript',
          usageCount: 2
        }]
      });
      expect(repositories.tag.findByUser).toHaveBeenCalledWith(1);
    });

    it('should handle errors and return error result', async () => {
      (repositories.tag.findByUser as Mock).mockRejectedValue(new Error('Database error'));

      const result = await tagService.getUserTags({
        userId: 1,
        limit: 50
      });

      expect(result).toEqual({
        success: false,
        statusCode: 500,
        error: 'Failed to retrieve tags'
      });
    });
  });

  describe('getTagSuggestions', () => {
    it('should return popular tags when no query is provided and userId exists', async () => {
      const mockPopularTags = [{ id: 1, name: 'Popular', usageCount: 10 }];
      (repositories.tag.findPopularTagsByUser as Mock).mockResolvedValue(mockPopularTags);

      const result = await tagService.getTagSuggestions({
        q: '',
        userId: 1,
        limit: 10
      });

      expect(result).toEqual({
        success: true,
        statusCode: 200,
        suggestions: mockPopularTags
      });
      expect(repositories.tag.findPopularTagsByUser).toHaveBeenCalledWith(1, 10);
    });

    it('should return empty suggestions when no query and no userId', async () => {
      const result = await tagService.getTagSuggestions({
        q: '',
        limit: 10
      });

      expect(result).toEqual({
        success: true,
        statusCode: 200,
        suggestions: []
      });
    });

    it('should return suggestions when query is provided', async () => {
      const mockSuggestions = [{ id: 1, name: 'React', usageCount: 3 }];
      (repositories.tag.suggestTags as Mock).mockResolvedValue(mockSuggestions);

      const result = await tagService.getTagSuggestions({
        q: 'Reac',
        userId: 1,
        limit: 10
      });

      expect(result).toEqual({
        success: true,
        statusCode: 200,
        suggestions: mockSuggestions
      });
      expect(repositories.tag.suggestTags).toHaveBeenCalledWith('Reac', 1, 10);
    });

    it('should handle errors and return error result', async () => {
      (repositories.tag.suggestTags as Mock).mockRejectedValue(new Error('Database error'));

      const result = await tagService.getTagSuggestions({
        q: 'test',
        userId: 1,
        limit: 10
      });

      expect(result).toEqual({
        success: false,
        statusCode: 500,
        error: 'Failed to get tag suggestions'
      });
    });
  });

  describe('addTagsToApplication', () => {
    it('should successfully add tags to job application', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.tag.addTagsToJobApplication as Mock).mockResolvedValue([mockTag]);

      const result = await tagService.addTagsToApplication({
        jobApplicationId: 1,
        tagNames: ['JavaScript', 'React']
      });

      expect(result).toEqual({
        success: true,
        statusCode: 200,
        message: 'Tags added successfully',
        tags: [mockTag]
      });
      expect(repositories.tag.addTagsToJobApplication).toHaveBeenCalledWith(1, ['JavaScript', 'React']);
    });

    it('should return error when job application not found', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(null);

      const result = await tagService.addTagsToApplication({
        jobApplicationId: 999,
        tagNames: ['JavaScript']
      });

      expect(result).toEqual({
        success: false,
        statusCode: 404,
        error: 'Job application not found'
      });
    });

    it('should return error when no valid tags provided', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);

      const result = await tagService.addTagsToApplication({
        jobApplicationId: 1,
        tagNames: ['', ' ', '  ']
      });

      expect(result).toEqual({
        success: false,
        statusCode: 400,
        error: 'At least one valid tag is required'
      });
    });

    it('should filter and deduplicate tag names', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.tag.addTagsToJobApplication as Mock).mockResolvedValue([mockTag]);

      await tagService.addTagsToApplication({
        jobApplicationId: 1,
        tagNames: [' JavaScript ', 'React', '', 'JavaScript', '  React  ']
      });

      expect(repositories.tag.addTagsToJobApplication).toHaveBeenCalledWith(1, ['JavaScript', 'React']);
    });

    it('should handle errors and return error result', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.tag.addTagsToJobApplication as Mock).mockRejectedValue(new Error('Database error'));

      const result = await tagService.addTagsToApplication({
        jobApplicationId: 1,
        tagNames: ['JavaScript']
      });

      expect(result).toEqual({
        success: false,
        statusCode: 500,
        error: 'Failed to add tags to job application'
      });
    });
  });

  describe('removeTagsFromApplication', () => {
    it('should successfully remove tags from job application', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.tag.removeTagsFromJobApplication as Mock).mockResolvedValue(undefined);

      const result = await tagService.removeTagsFromApplication({
        jobApplicationId: 1,
        tagNames: ['JavaScript', 'React']
      });

      expect(result).toEqual({
        success: true,
        statusCode: 200,
        message: 'Tags removed successfully',
        removedTagNames: ['JavaScript', 'React']
      });
      expect(repositories.tag.removeTagsFromJobApplication).toHaveBeenCalledWith(1, ['JavaScript', 'React']);
    });

    it('should return error when job application not found', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(null);

      const result = await tagService.removeTagsFromApplication({
        jobApplicationId: 999,
        tagNames: ['JavaScript']
      });

      expect(result).toEqual({
        success: false,
        statusCode: 404,
        error: 'Job application not found'
      });
    });

    it('should return error when no valid tag names provided', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);

      const result = await tagService.removeTagsFromApplication({
        jobApplicationId: 1,
        tagNames: ['', ' ', '  ']
      });

      expect(result).toEqual({
        success: false,
        statusCode: 400,
        error: 'At least one valid tag name is required'
      });
    });

    it('should handle errors and return error result', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.tag.removeTagsFromJobApplication as Mock).mockRejectedValue(new Error('Database error'));

      const result = await tagService.removeTagsFromApplication({
        jobApplicationId: 1,
        tagNames: ['JavaScript']
      });

      expect(result).toEqual({
        success: false,
        statusCode: 500,
        error: 'Failed to remove tags from job application'
      });
    });
  });

  describe('removeTagFromApplication', () => {
    it('should call removeTagsFromApplication with single tag', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.tag.removeTagsFromJobApplication as Mock).mockResolvedValue(undefined);

      const result = await tagService.removeTagFromApplication({
        jobApplicationId: 1,
        tagName: 'JavaScript'
      });

      expect(result).toEqual({
        success: true,
        statusCode: 200,
        message: 'Tags removed successfully',
        removedTagNames: ['JavaScript']
      });
      expect(repositories.tag.removeTagsFromJobApplication).toHaveBeenCalledWith(1, ['JavaScript']);
    });
  });

  describe('replaceTagsForApplication', () => {
    it('should successfully replace tags for job application', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.tag.replaceTagsForJobApplication as Mock).mockResolvedValue([mockTag]);

      const result = await tagService.replaceTagsForApplication({
        jobApplicationId: 1,
        tagNames: ['JavaScript', 'TypeScript']
      });

      expect(result).toEqual({
        success: true,
        statusCode: 200,
        message: 'Tags replaced successfully',
        tags: [mockTag]
      });
      expect(repositories.tag.replaceTagsForJobApplication).toHaveBeenCalledWith(1, ['JavaScript', 'TypeScript']);
    });

    it('should return error when job application not found', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(null);

      const result = await tagService.replaceTagsForApplication({
        jobApplicationId: 999,
        tagNames: ['JavaScript']
      });

      expect(result).toEqual({
        success: false,
        statusCode: 404,
        error: 'Job application not found'
      });
    });

    it('should handle empty tag names (remove all tags)', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.tag.replaceTagsForJobApplication as Mock).mockResolvedValue([]);

      const result = await tagService.replaceTagsForApplication({
        jobApplicationId: 1,
        tagNames: ['', ' ', '  ']
      });

      expect(result).toEqual({
        success: true,
        statusCode: 200,
        message: 'Tags replaced successfully',
        tags: []
      });
      expect(repositories.tag.replaceTagsForJobApplication).toHaveBeenCalledWith(1, []);
    });
  });

  describe('getTagStats', () => {
    it('should return tag statistics', async () => {
      const mockStats = {
        totalTags: 10,
        totalUsages: 25,
        mostUsed: [{ id: 1, name: 'JavaScript', usageCount: 5 }]
      };
      (repositories.tag.getTagStats as Mock).mockResolvedValue(mockStats);

      const result = await tagService.getTagStats(1);

      expect(result).toEqual({
        success: true,
        statusCode: 200,
        stats: {
          totalTags: 10,
          totalUniqueUsages: 25,
          mostUsedTags: [{ name: 'JavaScript', usageCount: 5 }]
        }
      });
      expect(repositories.tag.getTagStats).toHaveBeenCalledWith(1);
    });

    it('should handle errors and return error result', async () => {
      (repositories.tag.getTagStats as Mock).mockRejectedValue(new Error('Database error'));

      const result = await tagService.getTagStats(1);

      expect(result).toEqual({
        success: false,
        statusCode: 500,
        error: 'Failed to get tag statistics'
      });
    });
  });

  describe('getAllTagNames', () => {
    it('should return all tag names as suggestions', async () => {
      const mockTagNames = ['JavaScript', 'React', 'Node.js'];
      (repositories.tag.findAllTagNames as Mock).mockResolvedValue(mockTagNames);

      const result = await tagService.getAllTagNames(1);

      expect(result).toEqual({
        success: true,
        statusCode: 200,
        suggestions: [
          { id: 1, name: 'JavaScript', usageCount: 0 },
          { id: 2, name: 'React', usageCount: 0 },
          { id: 3, name: 'Node.js', usageCount: 0 }
        ]
      });
      expect(repositories.tag.findAllTagNames).toHaveBeenCalledWith(1);
    });

    it('should handle errors and return error result', async () => {
      (repositories.tag.findAllTagNames as Mock).mockRejectedValue(new Error('Database error'));

      const result = await tagService.getAllTagNames(1);

      expect(result).toEqual({
        success: false,
        statusCode: 500,
        error: 'Failed to get tag names'
      });
    });
  });

  describe('cleanupOrphanedTags', () => {
    it('should cleanup orphaned tags and return count', async () => {
      (repositories.tag.cleanupOrphanedTags as Mock).mockResolvedValue(5);

      const result = await tagService.cleanupOrphanedTags();

      expect(result).toEqual({
        success: true,
        statusCode: 200,
        message: 'Cleaned up 5 orphaned tags',
        removedCount: 5
      });
      expect(repositories.tag.cleanupOrphanedTags).toHaveBeenCalled();
    });

    it('should handle errors and return error result', async () => {
      (repositories.tag.cleanupOrphanedTags as Mock).mockRejectedValue(new Error('Database error'));

      const result = await tagService.cleanupOrphanedTags();

      expect(result).toEqual({
        success: false,
        statusCode: 500,
        error: 'Failed to cleanup orphaned tags'
      });
    });
  });

  describe('getTagsForJobApplication', () => {
    it('should return tags for job application', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.tag.findByJobApplication as Mock).mockResolvedValue([mockTag]);

      const result = await tagService.getTagsForJobApplication(1);

      expect(result).toEqual({
        success: true,
        statusCode: 200,
        suggestions: [{
          id: 1,
          name: 'JavaScript',
          usageCount: 1
        }]
      });
      expect(repositories.tag.findByJobApplication).toHaveBeenCalledWith(1);
    });

    it('should return error when job application not found', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(null);

      const result = await tagService.getTagsForJobApplication(999);

      expect(result).toEqual({
        success: false,
        statusCode: 404,
        error: 'Job application not found'
      });
    });

    it('should handle errors and return error result', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.tag.findByJobApplication as Mock).mockRejectedValue(new Error('Database error'));

      const result = await tagService.getTagsForJobApplication(1);

      expect(result).toEqual({
        success: false,
        statusCode: 500,
        error: 'Failed to get tags for job application'
      });
    });
  });
}); 