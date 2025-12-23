/**
 * Tag Service
 * 
 * Business logic layer for tag operations.
 * Follows auth service pattern with standardized result objects.
 * Handles validation, business rules, and coordinates repository calls.
 */

import { repositories } from '../repositories/index.js';
import { 
  TagFilters, 
  AddTagsRequest, 
  RemoveTagsRequest,
  RemoveTagRequest,
  TagSuggestion,
  TagSuggestionsQuery,
  TagStats,
  ListUserTagsResult,
  AddTagsToApplicationResult,
  RemoveTagsFromApplicationResult,
  TagSuggestionsResult,
  TagStatsResult,
  TagCleanupResult
} from '../models/tag.models.js';

// Update TagFilters to include userId which is service-specific
interface TagServiceFilters extends TagFilters {
  userId: number;
}

// Update other interfaces to include jobApplicationId which is service-specific
interface ServiceAddTagsRequest extends AddTagsRequest {
  jobApplicationId: number;
}

interface ServiceRemoveTagsRequest extends RemoveTagsRequest {
  jobApplicationId: number;
}

interface ServiceRemoveTagRequest extends RemoveTagRequest {
  jobApplicationId: number;
}

export class TagService {
  /**
   * Get tags for a specific user with optional search
   */
  async getUserTags(filters: TagServiceFilters): Promise<ListUserTagsResult> {
    try {
      const { userId, search, limit = 50 } = filters;

      let tags: TagSuggestion[];

      if (search) {
        tags = await repositories.tag.suggestTags(search, userId, limit);
      } else {
        const userTags = await repositories.tag.findByUser(userId);
        tags = userTags.map(tag => ({
          id: tag.id,
          name: tag.name,
          usageCount: tag.jobApplications?.length || 0
        }));
      }

      return {
        success: true,
        statusCode: 200,
        tags
      };
    } catch (error) {
      console.error('Error getting user tags:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to retrieve tags'
      };
    }
  }

  /**
   * Get tag suggestions based on query string
   */
  async getTagSuggestions(query: TagSuggestionsQuery): Promise<TagSuggestionsResult> {
    try {
      const { q, limit = 10, userId } = query;

      if (!q || q.trim().length < 1) {
        // If no query, return popular tags for the user
        if (userId) {
          const suggestions = await repositories.tag.findPopularTagsByUser(userId, limit);
          return {
            success: true,
            statusCode: 200,
            suggestions
          };
        }
        return {
          success: true,
          statusCode: 200,
          suggestions: []
        };
      }

      const suggestions = await repositories.tag.suggestTags(q, userId, limit);

      return {
        success: true,
        statusCode: 200,
        suggestions
      };
    } catch (error) {
      console.error('Error getting tag suggestions:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to get tag suggestions'
      };
    }
  }

  /**
   * Add tags to a job application with business validation
   */
  async addTagsToApplication(request: ServiceAddTagsRequest): Promise<AddTagsToApplicationResult> {
    try {
      const { jobApplicationId, tagNames } = request;

      // Verify job application exists
      const jobApplication = await repositories.jobApplication.findById(jobApplicationId);
      if (!jobApplication) {
        return {
          success: false,
          statusCode: 404,
          error: 'Job application not found'
        };
      }

      // Filter out empty tags, trim whitespace, and remove duplicates
      const validTagNames = [...new Set(
        tagNames
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0)
      )];

      if (validTagNames.length === 0) {
        return {
          success: false,
          statusCode: 400,
          error: 'At least one valid tag is required'
        };
      }

      // Add tags to the job application (creates tags if they don't exist)
      const tags = await repositories.tag.addTagsToJobApplication(
        jobApplicationId,
        validTagNames
      );

      return {
        success: true,
        statusCode: 200,
        message: 'Tags added successfully',
        tags
      };
    } catch (error) {
      console.error('Error adding tags to application:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to add tags to job application'
      };
    }
  }

  /**
   * Remove tags from a job application with business validation
   */
  async removeTagsFromApplication(request: ServiceRemoveTagsRequest): Promise<RemoveTagsFromApplicationResult> {
    try {
      const { jobApplicationId, tagNames } = request;

      // Verify job application exists
      const jobApplication = await repositories.jobApplication.findById(jobApplicationId);
      if (!jobApplication) {
        return {
          success: false,
          statusCode: 404,
          error: 'Job application not found'
        };
      }

      // Filter out empty tag names
      const validTagNames = tagNames
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      if (validTagNames.length === 0) {
        return {
          success: false,
          statusCode: 400,
          error: 'At least one valid tag name is required'
        };
      }

      // Remove tags from the job application
      await repositories.tag.removeTagsFromJobApplication(
        jobApplicationId,
        validTagNames
      );

      return {
        success: true,
        statusCode: 200,
        message: 'Tags removed successfully',
        removedTagNames: validTagNames
      };
    } catch (error) {
      console.error('Error removing tags from application:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to remove tags from job application'
      };
    }
  }

  /**
   * Remove a single tag from a job application (legacy support)
   */
  async removeTagFromApplication(request: ServiceRemoveTagRequest): Promise<RemoveTagsFromApplicationResult> {
    const { jobApplicationId, tagName } = request;

    return await this.removeTagsFromApplication({
      jobApplicationId,
      tagNames: [tagName]
    });
  }

  /**
   * Replace all tags for a job application
   */
  async replaceTagsForApplication(request: ServiceAddTagsRequest): Promise<AddTagsToApplicationResult> {
    try {
      const { jobApplicationId, tagNames } = request;

      // Verify job application exists
      const jobApplication = await repositories.jobApplication.findById(jobApplicationId);
      if (!jobApplication) {
        return {
          success: false,
          statusCode: 404,
          error: 'Job application not found'
        };
      }

      // Filter out empty tags, trim whitespace, and remove duplicates
      const validTagNames = [...new Set(
        tagNames
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0)
      )];

      // Replace all tags (empty array will remove all tags)
      const tags = await repositories.tag.replaceTagsForJobApplication(
        jobApplicationId,
        validTagNames
      );

      return {
        success: true,
        statusCode: 200,
        message: 'Tags replaced successfully',
        tags
      };
    } catch (error) {
      console.error('Error replacing tags for application:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to replace tags for job application'
      };
    }
  }

  /**
   * Get tag statistics for a user
   */
  async getTagStats(userId: number): Promise<TagStatsResult> {
    try {
      const stats = await repositories.tag.getTagStats(userId);
      
      const tagStats: TagStats = {
        totalTags: stats.totalTags,
        totalUniqueUsages: stats.totalUsages,
        mostUsedTags: stats.mostUsed.map(tag => ({
          name: tag.name,
          usageCount: tag.usageCount || 0
        }))
      };

      return {
        success: true,
        statusCode: 200,
        stats: tagStats
      };
    } catch (error) {
      console.error('Error getting tag stats:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to get tag statistics'
      };
    }
  }

  /**
   * Get all unique tag names for a user (useful for autocomplete)
   */
  async getAllTagNames(userId?: number): Promise<TagSuggestionsResult> {
    try {
      const tagNames = await repositories.tag.findAllTagNames(userId);
      const suggestions = tagNames.map((name, index) => ({
        id: index + 1, // Temporary ID for compatibility
        name,
        usageCount: 0
      }));

      return {
        success: true,
        statusCode: 200,
        suggestions
      };
    } catch (error) {
      console.error('Error getting all tag names:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to get tag names'
      };
    }
  }

  /**
   * Clean up orphaned tags (maintenance operation)
   */
  async cleanupOrphanedTags(): Promise<TagCleanupResult> {
    try {
      const removedCount = await repositories.tag.cleanupOrphanedTags();
      
      return {
        success: true,
        statusCode: 200,
        message: `Cleaned up ${removedCount} orphaned tags`,
        removedCount
      };
    } catch (error) {
      console.error('Error cleaning up orphaned tags:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to cleanup orphaned tags'
      };
    }
  }

  /**
   * Get tags associated with a specific job application
   */
  async getTagsForJobApplication(jobApplicationId: number): Promise<TagSuggestionsResult> {
    try {
      // Verify job application exists
      const jobApplication = await repositories.jobApplication.findById(jobApplicationId);
      if (!jobApplication) {
        return {
          success: false,
          statusCode: 404,
          error: 'Job application not found'
        };
      }

      const tags = await repositories.tag.findByJobApplication(jobApplicationId);
      const suggestions = tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        usageCount: 1 // This tag is used by this job application
      }));

      return {
        success: true,
        statusCode: 200,
        suggestions
      };
    } catch (error) {
      console.error('Error getting tags for job application:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to get tags for job application'
      };
    }
  }
}

export const tagService = new TagService(); 