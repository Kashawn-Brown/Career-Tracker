/**
 * Job Application Service Tests
 * 
 * Comprehensive test suite for the job application service layer.
 * Tests business logic, validation, authorization, and error handling.
 * Follows the auth-style testing pattern with structured results.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { JobApplicationService } from '../../services/job-application.service.js';
import { repositories } from '../../repositories/index.js';

// Mock the repositories
vi.mock('../../repositories/index.js', () => ({
  repositories: {
    jobApplication: {
      findManyWithPagination: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    tag: {
      addTagsToJobApplication: vi.fn(),
      replaceTagsForJobApplication: vi.fn()
    }
  }
}));

describe('JobApplicationService', () => {
  let jobApplicationService: JobApplicationService;

  beforeEach(() => {
    jobApplicationService = new JobApplicationService();
    vi.clearAllMocks();
  });

  describe('listJobApplications', () => {
    it('should return success result with job applications data', async () => {
      // Mock repository response
      const mockResult = {
        data: [
          {
            id: 1,
            company: 'Test Corp',
            position: 'Developer',
            userId: 1,
            tags: [],
            documents: [],
            jobConnections: []
          }
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      (repositories.jobApplication.findManyWithPagination as Mock).mockResolvedValue(mockResult);

      const result = await jobApplicationService.listJobApplications({
        userId: 1,
        page: 1,
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.data?.jobApplications).toHaveLength(1);
      expect(result.data?.pagination.total).toBe(1);
    });

    it('should return error when userId is missing', async () => {
      const result = await jobApplicationService.listJobApplications({
        page: 1,
        limit: 10
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('User ID is required');
    });

    it('should handle repository errors gracefully', async () => {
      (repositories.jobApplication.findManyWithPagination as Mock).mockRejectedValue(
        new Error('Database error')
      );

      const result = await jobApplicationService.listJobApplications({
        userId: 1
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('Internal server error while retrieving job applications');
    });
  });

  describe('getJobApplication', () => {
    it('should return success result when job application exists and user authorized', async () => {
      const mockJobApplication = {
        id: 1,
        company: 'Test Corp',
        position: 'Developer',
        userId: 1,
        tags: [],
        documents: [],
        jobConnections: []
      };

      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);

      const result = await jobApplicationService.getJobApplication(1, 1);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.jobApplication).toEqual(mockJobApplication);
      expect(result.message).toBe('Job application retrieved successfully');
    });

    it('should return error when job application not found', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(null);

      const result = await jobApplicationService.getJobApplication(1, 1);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('Job application not found');
    });

    it('should return authorization error when user does not own job application', async () => {
      const mockJobApplication = {
        id: 1,
        company: 'Test Corp',
        position: 'Developer',
        userId: 2, // Different user
        tags: [],
        documents: [],
        jobConnections: []
      };

      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);

      const result = await jobApplicationService.getJobApplication(1, 1);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(403);
      expect(result.error).toBe('You can only access your own job applications');
    });

    it('should return error for invalid ID', async () => {
      const result = await jobApplicationService.getJobApplication(NaN, 1);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('Invalid job application ID');
    });

    it('should return error when userId is missing', async () => {
      const result = await jobApplicationService.getJobApplication(1, 0);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('User ID is required');
    });
  });

  describe('createJobApplication', () => {
    it('should return success result when job application created successfully', async () => {
      const mockCreatedJobApplication = {
        id: 1,
        company: 'Test Corp',
        position: 'Developer',
        userId: 1,
        dateApplied: new Date(),
        tags: [],
        documents: [],
        jobConnections: []
      };

      (repositories.jobApplication.create as Mock).mockResolvedValue(mockCreatedJobApplication);
      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockCreatedJobApplication);

      const createData = {
        userId: 1,
        company: 'Test Corp',
        position: 'Developer'
      };

      const result = await jobApplicationService.createJobApplication(createData);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Job application created successfully');
      expect(result.jobApplication).toEqual(mockCreatedJobApplication);
    });

    it('should return error when userId is missing', async () => {
      const createData = {
        userId: 0,
        company: 'Test Corp',
        position: 'Developer'
      };

      const result = await jobApplicationService.createJobApplication(createData);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('User ID is required');
    });

    it('should return error when company is missing', async () => {
      const createData = {
        userId: 1,
        company: '',
        position: 'Developer'
      };

      const result = await jobApplicationService.createJobApplication(createData);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('Company name is required');
    });

    it('should return error when position is missing', async () => {
      const createData = {
        userId: 1,
        company: 'Test Corp',
        position: ''
      };

      const result = await jobApplicationService.createJobApplication(createData);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('Position is required');
    });

    it('should handle foreign key constraint errors', async () => {
      (repositories.jobApplication.create as Mock).mockRejectedValue(
        new Error('Foreign key constraint failed')
      );

      const createData = {
        userId: 999, // Non-existent user
        company: 'Test Corp',
        position: 'Developer'
      };

      const result = await jobApplicationService.createJobApplication(createData);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('Invalid user ID provided');
    });

    it('should create job application with tags', async () => {
      const mockCreatedJobApplication = {
        id: 1,
        company: 'Test Corp',
        position: 'Developer',
        userId: 1,
        dateApplied: new Date()
      };

      (repositories.jobApplication.create as Mock).mockResolvedValue(mockCreatedJobApplication);
      (repositories.jobApplication.findById as Mock).mockResolvedValue({
        ...mockCreatedJobApplication,
        tags: [{ name: 'frontend' }],
        documents: [],
        jobConnections: []
      });

      const createData = {
        userId: 1,
        company: 'Test Corp',
        position: 'Developer',
        tags: ['frontend', 'react']
      };

      const result = await jobApplicationService.createJobApplication(createData);

      expect(result.success).toBe(true);
      expect(repositories.tag.addTagsToJobApplication).toHaveBeenCalledWith(1, ['frontend', 'react']);
    });
  });

  describe('updateJobApplication', () => {
    beforeEach(() => {
      // Mock authorization check to pass by default
      const mockJobApplication = {
        id: 1,
        company: 'Test Corp',
        position: 'Developer',
        userId: 1
      };
      (repositories.jobApplication.findById as Mock)
        .mockResolvedValueOnce(mockJobApplication) // For authorization check
        .mockResolvedValueOnce({ // For final result
          ...mockJobApplication,
          company: 'Updated Corp',
          tags: [],
          documents: [],
          jobConnections: []
        });
    });

    it('should return success result when job application updated successfully', async () => {
      const updateData = {
        company: 'Updated Corp'
      };

      const result = await jobApplicationService.updateJobApplication(1, updateData, 1);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Job application updated successfully');
      expect(result.jobApplication?.company).toBe('Updated Corp');
    });

    it('should return error for invalid ID', async () => {
      const result = await jobApplicationService.updateJobApplication(NaN, {}, 1);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('Invalid job application ID');
    });

    it('should return error when userId is missing', async () => {
      const result = await jobApplicationService.updateJobApplication(1, {}, 0);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('User ID is required');
    });

    it('should return error when company is empty string', async () => {
      const updateData = { company: '   ' };

      const result = await jobApplicationService.updateJobApplication(1, updateData, 1);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('Company name cannot be empty');
    });
  });

  describe('deleteJobApplication', () => {
    beforeEach(() => {
      // Mock authorization check to pass by default
      const mockJobApplication = {
        id: 1,
        company: 'Test Corp',
        position: 'Developer',
        userId: 1
      };
      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
    });

    it('should return success result when job application deleted successfully', async () => {
      const result = await jobApplicationService.deleteJobApplication(1, 1);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Job application deleted successfully');
      expect(result.deletedId).toBe(1);
      expect(repositories.jobApplication.delete).toHaveBeenCalledWith(1);
    });

    it('should return error for invalid ID', async () => {
      const result = await jobApplicationService.deleteJobApplication(NaN, 1);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('Invalid job application ID');
    });

    it('should return error when userId is missing', async () => {
      const result = await jobApplicationService.deleteJobApplication(1, 0);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('User ID is required');
    });
  });

  // Note: Authorization error handling is thoroughly tested through other method tests
  // The private authorization method properly handles and returns structured errors
}); 