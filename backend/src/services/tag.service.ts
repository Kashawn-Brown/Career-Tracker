/**
 * Tag Service
 * 
 * Business logic layer for tag operations.
 * Updated for many-to-many relationship and tag suggestions.
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
  TagStats
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
  async getUserTags(filters: TagServiceFilters) {
    const { userId, search, limit = 50 } = filters;

    if (search) {
      return await repositories.tag.suggestTags(search, userId, limit);
    } else {
      return await repositories.tag.findByUser(userId);
    }
  }

  /**
   * Get tag suggestions based on query string
   */
  async getTagSuggestions(query: TagSuggestionsQuery): Promise<TagSuggestion[]> {
    const { q, limit = 10, userId } = query;

    if (!q || q.trim().length < 1) {
      // If no query, return popular tags for the user
      if (userId) {
        return await repositories.tag.findPopularTagsByUser(userId, limit);
      }
      return [];
    }

    return await repositories.tag.suggestTags(q, userId, limit);
  }

  /**
   * Add tags to a job application with business validation
   */
  async addTagsToApplication(request: ServiceAddTagsRequest) {
    const { jobApplicationId, tagNames } = request;

    // Verify job application exists
    const jobApplication = await repositories.jobApplication.findById(jobApplicationId);
    if (!jobApplication) {
      throw new Error('Job application not found');
    }

    // Filter out empty tags, trim whitespace, and remove duplicates
    const validTagNames = [...new Set(
      tagNames
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
    )];

    if (validTagNames.length === 0) {
      throw new Error('At least one valid tag is required');
    }

    // Add tags to the job application (creates tags if they don't exist)
    return await repositories.tag.addTagsToJobApplication(
      jobApplicationId,
      validTagNames
    );
  }

  /**
   * Remove tags from a job application with business validation
   */
  async removeTagsFromApplication(request: ServiceRemoveTagsRequest) {
    const { jobApplicationId, tagNames } = request;

    // Verify job application exists
    const jobApplication = await repositories.jobApplication.findById(jobApplicationId);
    if (!jobApplication) {
      throw new Error('Job application not found');
    }

    // Filter out empty tag names
    const validTagNames = tagNames
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    if (validTagNames.length === 0) {
      throw new Error('At least one valid tag name is required');
    }

    // Remove tags from the job application
    await repositories.tag.removeTagsFromJobApplication(
      jobApplicationId,
      validTagNames
    );

    return {
      message: 'Tags removed successfully',
      removedTagNames: validTagNames
    };
  }

  /**
   * Remove a single tag from a job application (legacy support)
   */
  async removeTagFromApplication(request: ServiceRemoveTagRequest) {
    const { jobApplicationId, tagName } = request;

    return await this.removeTagsFromApplication({
      jobApplicationId,
      tagNames: [tagName]
    });
  }

  /**
   * Replace all tags for a job application
   */
  async replaceTagsForApplication(request: ServiceAddTagsRequest) {
    const { jobApplicationId, tagNames } = request;

    // Verify job application exists
    const jobApplication = await repositories.jobApplication.findById(jobApplicationId);
    if (!jobApplication) {
      throw new Error('Job application not found');
    }

    // Filter out empty tags, trim whitespace, and remove duplicates
    const validTagNames = [...new Set(
      tagNames
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
    )];

    // Replace all tags (empty array will remove all tags)
    return await repositories.tag.replaceTagsForJobApplication(
      jobApplicationId,
      validTagNames
    );
  }

  /**
   * Get tag statistics for a user
   */
  async getTagStats(userId: number): Promise<TagStats> {
    const stats = await repositories.tag.getTagStats(userId);
    
    return {
      totalTags: stats.totalTags,
      totalUniqueUsages: stats.totalUsages,
      mostUsedTags: stats.mostUsed.map(tag => ({
        name: tag.name,
        usageCount: tag.usageCount || 0
      }))
    };
  }

  /**
   * Get all unique tag names for a user (useful for autocomplete)
   */
  async getAllTagNames(userId?: number): Promise<string[]> {
    return await repositories.tag.findAllTagNames(userId);
  }

  /**
   * Clean up orphaned tags (maintenance operation)
   */
  async cleanupOrphanedTags(): Promise<{ removedCount: number }> {
    const removedCount = await repositories.tag.cleanupOrphanedTags();
    return { removedCount };
  }

  /**
   * Get tags for a specific job application
   */
  async getTagsForJobApplication(jobApplicationId: number) {
    // Verify job application exists
    const jobApplication = await repositories.jobApplication.findById(jobApplicationId);
    if (!jobApplication) {
      throw new Error('Job application not found');
    }

    return await repositories.tag.findByJobApplication(jobApplicationId);
  }
}

// Export singleton instance
export const tagService = new TagService(); 