/**
 * Job Application Service
 * 
 * Business logic layer for job application operations.
 * Handles validation, business rules, and coordinates repository calls.
 * Works with TagService for tag-related operations.
 */

import { repositories } from '../repositories/index.js';
import { JobApplicationFilters } from '../repositories/job-application.repository.js';

export interface JobApplicationListFilters {
  page?: number;
  limit?: number;
  userId?: number;
  status?: string;
  company?: string;
  position?: string;
  dateFrom?: string;
  dateTo?: string;
  isStarred?: boolean;
  hasFollowUp?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  compatibilityScoreMin?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateJobApplicationRequest {
  userId: number;
  company: string;
  position: string;
  dateApplied?: string;
  status?: string;
  type?: string;
  salary?: number;
  jobLink?: string;
  compatibilityScore?: number;
  notes?: string;
  isStarred?: boolean;
  followUpDate?: string;
  deadline?: string;
  tags?: string[];
}

export interface UpdateJobApplicationRequest {
  company?: string;
  position?: string;
  dateApplied?: string;
  status?: string;
  type?: string;
  salary?: number;
  jobLink?: string;
  compatibilityScore?: number;
  notes?: string;
  isStarred?: boolean;
  followUpDate?: string;
  deadline?: string;
  tags?: string[];
}

export class JobApplicationService {
  /**
   * List job applications with pagination and filtering
   */
  async listJobApplications(filters: JobApplicationListFilters) {
    const {
      page = 1,
      limit = 10,
      userId,
      status,
      company,
      position,
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

    // Build repository filters
    const repositoryFilters: JobApplicationFilters = {};
    if (userId) repositoryFilters.userId = userId;
    if (status) repositoryFilters.status = status;
    if (company) repositoryFilters.company = company;
    if (position) repositoryFilters.position = position;
    if (dateFrom) repositoryFilters.dateFrom = new Date(dateFrom);
    if (dateTo) repositoryFilters.dateTo = new Date(dateTo);
    if (isStarred !== undefined) repositoryFilters.isStarred = isStarred;
    if (hasFollowUp !== undefined) repositoryFilters.hasFollowUp = hasFollowUp;
    if (salaryMin) repositoryFilters.salaryMin = salaryMin;
    if (salaryMax) repositoryFilters.salaryMax = salaryMax;
    if (compatibilityScoreMin) repositoryFilters.compatibilityScoreMin = compatibilityScoreMin;

    // Build order by
    const orderBy = { [sortBy]: sortOrder };

    // Get paginated results
    return await repositories.jobApplication.findManyWithPagination(
      repositoryFilters,
      {
        include: {
          tags: true,
          documents: true,
          jobConnections: {
            include: {
              contact: true
            }
          }
        },
        orderBy,
        pagination: { page, limit }
      }
    );
  }

  /**
   * Get a single job application by ID with all relations
   */
  async getJobApplication(id: number) {
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
      throw new Error('Job application not found');
    }

    return jobApplication;
  }

  /**
   * Create a new job application with business validation
   */
  async createJobApplication(data: CreateJobApplicationRequest) {
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

    try {
      // Create job application
      const jobApplication = await repositories.jobApplication.create(createData);

      // Add tags if provided
      if (tags && tags.length > 0) {
        await repositories.tag.createManyForJobApplication(jobApplication.id, tags);
      }

      // Fetch the created job application with all relations
      return await repositories.jobApplication.findById(jobApplication.id, {
        tags: true,
        documents: true,
        jobConnections: {
          include: {
            contact: true
          }
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Foreign key constraint')) {
        throw new Error('Invalid user ID provided');
      }
      throw error;
    }
  }

  /**
   * Update an existing job application with business validation
   */
  async updateJobApplication(id: number, data: UpdateJobApplicationRequest) {
    // Check if job application exists
    const existingJobApplication = await repositories.jobApplication.findById(id);
    if (!existingJobApplication) {
      throw new Error('Job application not found');
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
      // Delete existing tags
      await repositories.tag.deleteByJobApplication(id);
      // Create new tags if any provided
      if (tags.length > 0) {
        await repositories.tag.createManyForJobApplication(id, tags);
      }
    }

    // Fetch the updated job application with all relations
    return await repositories.jobApplication.findById(id, {
      tags: true,
      documents: true,
      jobConnections: {
        include: {
          contact: true
        }
      }
    });
  }

  /**
   * Delete a job application with business validation
   */
  async deleteJobApplication(id: number) {
    // Check if job application exists
    const existingJobApplication = await repositories.jobApplication.findById(id);
    if (!existingJobApplication) {
      throw new Error('Job application not found');
    }

    // Delete job application (cascade deletes will handle related records)
    await repositories.jobApplication.delete(id);

    return {
      message: 'Job application deleted successfully',
      deletedId: id
    };
  }
}

// Export singleton instance
export const jobApplicationService = new JobApplicationService(); 