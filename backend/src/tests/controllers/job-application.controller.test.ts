/**
 * Job Application Controller Tests
 * 
 * Tests the HTTP layer for job application endpoints.
 * Focuses on request/response handling, parameter validation,
 * and proper service integration.
 * Follows the class-based testing pattern.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import {
  listJobApplications,
  getJobApplication,
  createJobApplication,
  updateJobApplication,
  deleteJobApplication
} from '../../controllers/job-application.controller.js';
import { jobApplicationService } from '../../services/index.js';
import { UserRole } from '../../models/user.models.js';

// Mock the job application service
vi.mock('../../services/index.js', () => ({
  jobApplicationService: {
    listJobApplications: vi.fn(),
    getJobApplication: vi.fn(),
    createJobApplication: vi.fn(),
    updateJobApplication: vi.fn(),
    deleteJobApplication: vi.fn()
  }
}));

describe('JobApplicationController', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    // Setup mock request with authenticated user
    mockRequest = {
      user: { 
        userId: 1, 
        email: 'test@example.com',
        type: 'access' as const,
        role: UserRole.USER
      },
      query: {},
      params: {},
      body: {}
    };

    // Setup mock reply
    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };

    vi.clearAllMocks();
  });

  describe('listJobApplications', () => {
    it('should return job applications successfully', async () => {
      const mockServiceResult = {
        success: true,
        statusCode: 200,
        message: 'Job applications retrieved successfully',
        data: {
          jobApplications: [
            { id: 1, company: 'Test Corp', position: 'Developer' }
          ],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
        }
      };

      (jobApplicationService.listJobApplications as Mock).mockResolvedValue(mockServiceResult);

      mockRequest.query = { page: '1', limit: '10' };

      await listJobApplications(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(jobApplicationService.listJobApplications).toHaveBeenCalledWith({
        page: '1',
        limit: '10',
        userId: 1
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Job applications retrieved successfully',
        data: {
          jobApplications: [
            {
              id: 1,
              company: 'Test Corp',
              position: 'Developer'
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1
          }
        }
      });
    });

    it('should return error when service fails', async () => {
      const mockServiceResult = {
        success: false,
        statusCode: 500,
        error: 'Internal server error while retrieving job applications'
      };

      (jobApplicationService.listJobApplications as Mock).mockResolvedValue(mockServiceResult);

      await listJobApplications(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Internal server error while retrieving job applications'
      });
    });
  });

  describe('getJobApplication', () => {
    it('should return job application successfully', async () => {
      const mockJobApplication = {
        id: 1,
        company: 'Test Corp',
        position: 'Developer',
        userId: 1
      };

      const mockServiceResult = {
        success: true,
        statusCode: 200,
        jobApplication: mockJobApplication,
        message: 'Job application retrieved successfully'
      };

      (jobApplicationService.getJobApplication as Mock).mockResolvedValue(mockServiceResult);

      mockRequest.params = { id: '1' };

      await getJobApplication(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(jobApplicationService.getJobApplication).toHaveBeenCalledWith(1, 1);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Job application retrieved successfully',
        data: mockJobApplication
      });
    });

    it('should return 400 for invalid ID', async () => {
      mockRequest.params = { id: 'invalid' };

      await getJobApplication(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid job application ID format'
      });
      expect(jobApplicationService.getJobApplication).not.toHaveBeenCalled();
    });

    it('should return 404 when job application not found', async () => {
      const mockServiceResult = {
        success: false,
        statusCode: 404,
        error: 'Job application not found'
      };

      (jobApplicationService.getJobApplication as Mock).mockResolvedValue(mockServiceResult);

      mockRequest.params = { id: '999' };

      await getJobApplication(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Job application not found'
      });
    });

    it('should return 403 for unauthorized access', async () => {
      const mockServiceResult = {
        success: false,
        statusCode: 403,
        error: 'You can only access your own job applications'
      };

      (jobApplicationService.getJobApplication as Mock).mockResolvedValue(mockServiceResult);

      mockRequest.params = { id: '1' };

      await getJobApplication(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'You can only access your own job applications'
      });
    });
  });

  describe('createJobApplication', () => {
    it('should create job application successfully', async () => {
      const mockJobApplication = {
        id: 1,
        company: 'Test Corp',
        position: 'Developer',
        userId: 1
      };

      const mockServiceResult = {
        success: true,
        statusCode: 201,
        jobApplication: mockJobApplication,
        message: 'Job application created successfully'
      };

      (jobApplicationService.createJobApplication as Mock).mockResolvedValue(mockServiceResult);

      mockRequest.body = {
        company: 'Test Corp',
        position: 'Developer'
      };

      await createJobApplication(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(jobApplicationService.createJobApplication).toHaveBeenCalledWith({
        company: 'Test Corp',
        position: 'Developer',
        userId: 1
      });
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Job application created successfully',
        data: mockJobApplication
      });
    });

    it('should return error when service fails', async () => {
      const mockServiceResult = {
        success: false,
        statusCode: 400,
        error: 'Invalid job application data'
      };

      (jobApplicationService.createJobApplication as Mock).mockResolvedValue(mockServiceResult);

      mockRequest.body = {
        company: 'Test Corp'
        // Missing required position field
      };

      await createJobApplication(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid job application data'
      });
    });
  });

  describe('updateJobApplication', () => {
    it('should update job application successfully', async () => {
      const mockJobApplication = {
        id: 1,
        company: 'Updated Corp',
        position: 'Senior Developer',
        userId: 1
      };

      const mockServiceResult = {
        success: true,
        statusCode: 200,
        jobApplication: mockJobApplication,
        message: 'Job application updated successfully'
      };

      (jobApplicationService.updateJobApplication as Mock).mockResolvedValue(mockServiceResult);

      mockRequest.params = { id: '1' };
      mockRequest.body = {
        company: 'Updated Corp',
        position: 'Senior Developer'
      };

      await updateJobApplication(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(jobApplicationService.updateJobApplication).toHaveBeenCalledWith(1, {
        company: 'Updated Corp',
        position: 'Senior Developer'
      }, 1);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Job application updated successfully',
        data: mockJobApplication
      });
    });

    it('should return 400 for invalid ID', async () => {
      mockRequest.params = { id: 'invalid' };
      mockRequest.body = { company: 'Updated Corp' };

      await updateJobApplication(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid job application ID format'
      });
      expect(jobApplicationService.updateJobApplication).not.toHaveBeenCalled();
    });

    it('should return error when service fails', async () => {
      const mockServiceResult = {
        success: false,
        statusCode: 404,
        error: 'Job application not found'
      };

      (jobApplicationService.updateJobApplication as Mock).mockResolvedValue(mockServiceResult);

      mockRequest.params = { id: '999' };
      mockRequest.body = { company: 'Updated Corp' };

      await updateJobApplication(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Job application not found'
      });
    });
  });

  describe('deleteJobApplication', () => {
    it('should delete job application successfully', async () => {
      const mockServiceResult = {
        success: true,
        statusCode: 200,
        message: 'Job application deleted successfully'
      };

      (jobApplicationService.deleteJobApplication as Mock).mockResolvedValue(mockServiceResult);

      mockRequest.params = { id: '1' };

      await deleteJobApplication(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(jobApplicationService.deleteJobApplication).toHaveBeenCalledWith(1, 1);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Job application deleted successfully'
      });
    });

    it('should return 400 for invalid ID', async () => {
      mockRequest.params = { id: 'invalid' };

      await deleteJobApplication(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid job application ID format'
      });
      expect(jobApplicationService.deleteJobApplication).not.toHaveBeenCalled();
    });

    it('should return error when service fails', async () => {
      const mockServiceResult = {
        success: false,
        statusCode: 404,
        error: 'Job application not found'
      };

      (jobApplicationService.deleteJobApplication as Mock).mockResolvedValue(mockServiceResult);

      mockRequest.params = { id: '999' };

      await deleteJobApplication(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Job application not found'
      });
    });
  });
}); 