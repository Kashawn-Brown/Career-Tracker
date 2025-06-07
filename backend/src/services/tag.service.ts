/**
 * Tag Service
 * 
 * Business logic layer for tag operations.
 * Handles validation, business rules, and coordinates repository calls.
 */

import { repositories } from '../repositories/index.js';
import { TagFilters, AddTagsRequest, RemoveTagRequest } from '../models/tag.models.js';

// Update TagFilters to include userId which is service-specific
interface TagServiceFilters extends TagFilters {
  userId: number;
}

// Update other interfaces to include jobApplicationId which is service-specific
interface ServiceAddTagsRequest extends AddTagsRequest {
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
      return await repositories.tag.searchTags(search, userId);
    } else {
      return await repositories.tag.findByUser(userId);
    }
  }

  /**
   * Add tags to a job application with business validation
   */
  async addTagsToApplication(request: ServiceAddTagsRequest) {
    const { jobApplicationId, tags } = request;

    // Verify job application exists
    const jobApplication = await repositories.jobApplication.findById(jobApplicationId);
    if (!jobApplication) {
      throw new Error('Job application not found');
    }

    // Filter out empty tags and trim whitespace
    const validTags = tags
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    if (validTags.length === 0) {
      throw new Error('At least one valid tag is required');
    }

    // Add tags to the job application
    return await repositories.tag.createManyForJobApplication(
      jobApplicationId,
      validTags
    );
  }

  /**
   * Remove a tag from a job application with business validation
   */
  async removeTagFromApplication(request: ServiceRemoveTagRequest) {
    const { jobApplicationId, tagId } = request;

    // Verify job application exists
    const jobApplication = await repositories.jobApplication.findById(jobApplicationId);
    if (!jobApplication) {
      throw new Error('Job application not found');
    }

    // Verify tag exists and belongs to the job application
    const tag = await repositories.tag.findById(tagId);
    if (!tag) {
      throw new Error('Tag not found');
    }

    if (tag.jobApplicationId !== jobApplicationId) {
      throw new Error('Tag does not belong to the specified job application');
    }

    // Delete the tag
    await repositories.tag.delete(tagId);

    return {
      message: 'Tag removed successfully',
      deletedTagId: tagId
    };
  }
}

// Export singleton instance
export const tagService = new TagService(); 