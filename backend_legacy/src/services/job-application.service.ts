/**
 * Job Application Service
 * 
 * Business logic layer for job application operations.
 * Handles validation, business rules, authorization, and coordinates repository calls.
 * Follows the auth-style pattern with structured results.
 */

import { repositories } from '../repositories/index.js';
import {
  JobApplicationListFilters,
  CreateJobApplicationRequest,
  UpdateJobApplicationRequest,
  JobApplicationFilters,
  ListJobApplicationsResult,
  GetJobApplicationResult,
  CreateJobApplicationResult,
  UpdateJobApplicationResult,
  DeleteJobApplicationResult,
  AuthorizationResult
} from '../models/job-application.models.js';

export class JobApplicationService {
  
  /**
   * List job applications with pagination and filtering
   * Returns structured result with success/error information
   */
  async listJobApplications(filters: JobApplicationListFilters): Promise<ListJobApplicationsResult> {
    try {
      const {
        page = 1,
        limit = 10,
        userId,
        // Single-value filters (backward compatibility)
        status,
        company,
        position,
        // Multi-select filters (new)
        statuses,
        companies,
        positions,
        workArrangements,
        jobTypes,
        // Other filters
        dateFrom,
        dateTo,
        isStarred,
        hasFollowUp,
        salaryMin,
        salaryMax,
        compatibilityScoreMin,
        sortBy = 'dateApplied',
        sortOrder = 'desc'
      } = filters;

      // Validate required userId
      if (!userId) {
        return {
          success: false,
          statusCode: 400,
          error: 'User ID is required'
        };
      }

      // Build repository filters (userId handled separately in findByUserWithFilters)
      const repositoryFilters: JobApplicationFilters = {};
      
      // Single-value filters (backward compatibility)
      if (status) repositoryFilters.status = status;
      if (company) repositoryFilters.company = company;
      if (position) repositoryFilters.position = position;
      
      // Multi-select filters (new) - only use if arrays have values
      if (statuses?.length) repositoryFilters.statuses = statuses;
      if (companies?.length) repositoryFilters.companies = companies;
      if (positions?.length) repositoryFilters.positions = positions;
      if (workArrangements?.length) repositoryFilters.workArrangements = workArrangements;
      if (jobTypes?.length) repositoryFilters.jobTypes = jobTypes;
      
      // Other filters
      if (dateFrom) repositoryFilters.dateFrom = new Date(dateFrom);
      if (dateTo) repositoryFilters.dateTo = new Date(dateTo);
      if (isStarred !== undefined) repositoryFilters.isStarred = isStarred;
      if (hasFollowUp !== undefined) repositoryFilters.hasFollowUp = hasFollowUp;
      if (salaryMin) repositoryFilters.salaryMin = salaryMin;
      if (salaryMax) repositoryFilters.salaryMax = salaryMax;
      if (compatibilityScoreMin) repositoryFilters.compatibilityScoreMin = compatibilityScoreMin;

      // Build order by
      const orderBy = { [sortBy]: sortOrder };

      // Get paginated results using the specialized filter method
      const result = await repositories.jobApplication.findByUserWithFilters(
        userId,
        repositoryFilters,
        {
          orderBy,
          pagination: { page, limit }
        }
      );

      return {
        success: true,
        statusCode: 200,
        message: `Retrieved ${result.data.length} job applications`,
        data: {
          jobApplications: result.data,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
          }
        }
      };

    } catch (error) {
      console.error('Error listing job applications:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error while retrieving job applications'
      };
    }
  }

  /**
   * Get a single job application by ID with authorization check
   * Ensures user can only access their own applications
   */
  async getJobApplication(id: number, userId: number): Promise<GetJobApplicationResult> {
    try {
      // Validate input
      if (!id || isNaN(id)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid job application ID'
        };
      }

      if (!userId) {
        return {
          success: false,
          statusCode: 400,
          error: 'User ID is required'
        };
      }

      const jobApplication = await repositories.jobApplication.findById(id, {
        tags: true,
        documents: true,
        jobConnections: {
          include: {
            contact: true
          }
        }
      });

      if (!jobApplication) {
        return {
          success: false,
          statusCode: 404,
          error: 'Job application not found'
        };
      }

      // Authorization check - user can only access their own applications
      if (jobApplication.userId !== userId) {
        return {
          success: false,
          statusCode: 403,
          error: 'You can only access your own job applications'
        };
      }

      return {
        success: true,
        statusCode: 200,
        message: 'Job application retrieved successfully',
        jobApplication
      };

    } catch (error) {
      console.error('Error getting job application:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error while retrieving job application'
      };
    }
  }

  /**
   * Create a new job application with business validation
   */
  async createJobApplication(data: CreateJobApplicationRequest): Promise<CreateJobApplicationResult> {
    try {
      // Validate required fields
      if (!data.userId) {
        return {
          success: false,
          statusCode: 400,
          error: 'User ID is required'
        };
      }

      if (!data.company?.trim()) {
        return {
          success: false,
          statusCode: 400,
          error: 'Company name is required'
        };
      }

      if (!data.position?.trim()) {
        return {
          success: false,
          statusCode: 400,
          error: 'Position is required'
        };
      }

      const { tags, ...jobApplicationData } = data;

      // Convert date strings to Date objects with business logic
      const createData = {
        ...jobApplicationData,
        dateApplied: jobApplicationData.dateApplied ? new Date(jobApplicationData.dateApplied) : new Date(),
        followUpDate: jobApplicationData.followUpDate ? new Date(jobApplicationData.followUpDate) : null,
        deadline: jobApplicationData.deadline ? new Date(jobApplicationData.deadline) : null,
        // Connect user relation
        user: { connect: { id: jobApplicationData.userId } }
      };

      // Remove userId from createData since we're using the relation
      delete (createData as any).userId;

      // Create job application
      const jobApplication = await repositories.jobApplication.create(createData);

      // Add tags if provided
      if (tags && tags.length > 0) {
        await repositories.tag.addTagsToJobApplication(jobApplication.id, tags);
      }

      // Fetch the created job application with all relations
      const createdJobApplication = await repositories.jobApplication.findById(jobApplication.id, {
        tags: true,
        documents: true,
        jobConnections: {
          include: {
            contact: true
          }
        }
      });

      return {
        success: true,
        statusCode: 201,
        message: 'Job application created successfully',
        jobApplication: createdJobApplication!
      };

    } catch (error) {
      console.error('Error creating job application:', error);
      
      if (error instanceof Error && error.message.includes('Foreign key constraint')) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid user ID provided'
        };
      }

      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error while creating job application'
      };
    }
  }

  /**
   * Update an existing job application with authorization and business validation
   */
  async updateJobApplication(id: number, data: UpdateJobApplicationRequest, userId: number): Promise<UpdateJobApplicationResult> {
    try {
      // Validate input
      if (!id || isNaN(id)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid job application ID'
        };
      }

      if (!userId) {
        return {
          success: false,
          statusCode: 400,
          error: 'User ID is required'
        };
      }

      // Check authorization first
      const authResult = await this.authorizeJobApplicationAccess(id, userId);
      if (!authResult.success) {
        return {
          success: authResult.success,
          statusCode: authResult.statusCode,
          error: authResult.error
        };
      }

      // Validate update data
      if (data.company !== undefined && !data.company.trim()) {
        return {
          success: false,
          statusCode: 400,
          error: 'Company name cannot be empty'
        };
      }

      if (data.position !== undefined && !data.position.trim()) {
        return {
          success: false,
          statusCode: 400,
          error: 'Position cannot be empty'
        };
      }

      const { tags, ...updateData } = data;

      // Convert date strings to Date objects
      const formattedUpdateData = {
        ...updateData,
        dateApplied: updateData.dateApplied ? new Date(updateData.dateApplied) : undefined,
        followUpDate: updateData.followUpDate ? new Date(updateData.followUpDate) : undefined,
        deadline: updateData.deadline ? new Date(updateData.deadline) : undefined
      };

      // Remove undefined values
      Object.keys(formattedUpdateData).forEach(key => {
        if ((formattedUpdateData as any)[key] === undefined) {
          delete (formattedUpdateData as any)[key];
        }
      });

      // Update job application
      await repositories.jobApplication.update(id, formattedUpdateData);

      // Update tags if provided
      if (tags !== undefined) {
        // Replace all tags with new ones
        await repositories.tag.replaceTagsForJobApplication(id, tags);
      }

      // Fetch the updated job application with all relations
      const updatedJobApplication = await repositories.jobApplication.findById(id, {
        tags: true,
        documents: true,
        jobConnections: {
          include: {
            contact: true
          }
        }
      });

      return {
        success: true,
        statusCode: 200,
        message: 'Job application updated successfully',
        jobApplication: updatedJobApplication!
      };

    } catch (error) {
      console.error('Error updating job application:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error while updating job application'
      };
    }
  }

  /**
   * Delete a job application with authorization and business validation
   */
  async deleteJobApplication(id: number, userId: number): Promise<DeleteJobApplicationResult> {
    try {
      // Validate input
      if (!id || isNaN(id)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid job application ID'
        };
      }

      if (!userId) {
        return {
          success: false,
          statusCode: 400,
          error: 'User ID is required'
        };
      }

      // Check authorization first
      const authResult = await this.authorizeJobApplicationAccess(id, userId);
      if (!authResult.success) {
        return {
          success: authResult.success,
          statusCode: authResult.statusCode,
          error: authResult.error
        };
      }

      // Delete job application (cascade deletes will handle related records)
      await repositories.jobApplication.delete(id);

      return {
        success: true,
        statusCode: 200,
        message: 'Job application deleted successfully',
        deletedId: id
      };

    } catch (error) {
      console.error('Error deleting job application:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error while deleting job application'
      };
    }
  }

  /**
   * Private helper method for authorization checks
   * Ensures user can only access their own job applications
   */
  private async authorizeJobApplicationAccess(id: number, userId: number): Promise<AuthorizationResult> {
    try {
      const jobApplication = await repositories.jobApplication.findById(id);
      
      if (!jobApplication) {
        return {
          success: false,
          statusCode: 404,
          error: 'Job application not found'
        };
      }

      if (jobApplication.userId !== userId) {
        return {
          success: false,
          statusCode: 403,
          error: 'You can only access your own job applications'
        };
      }

      return {
        success: true,
        statusCode: 200,
        jobApplication
      };

    } catch (error) {
      console.error('Error in authorization check:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error during authorization'
      };
    }
  }
}

// Export singleton instance
export const jobApplicationService = new JobApplicationService(); 