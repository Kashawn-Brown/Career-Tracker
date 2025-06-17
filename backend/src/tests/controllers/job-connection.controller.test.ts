/**
 * Job Connection Controller Tests
 * 
 * Tests the HTTP layer for job connection endpoints.
 * Focuses on request/response handling, parameter validation,
 * and proper service integration.
 * Follows the auth-style testing pattern.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import {
  listJobConnections,
  getJobConnection,
  createJobConnection,
  updateJobConnection,
  updateJobConnectionStatus,
  deleteJobConnection
} from '../../controllers/job-connection.controller.js';

// Mock the job connection service
vi.mock('../../services/index.js', () => ({
  jobConnectionService: {
    listJobConnections: vi.fn(),
    getJobConnection: vi.fn(),
    createJobConnection: vi.fn(),
    updateJobConnection: vi.fn(),
    updateJobConnectionStatus: vi.fn(),
    deleteJobConnection: vi.fn()
  }
}));

import { jobConnectionService } from '../../services/index.js';

// Get the mocked service
const mockJobConnectionService = vi.mocked(jobConnectionService);

describe('JobConnectionController', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    // Setup mock request with authenticated user
    mockRequest = {
      user: { userId: 1, email: 'test@example.com' },
      query: {},
      params: {},
      body: {},
      log: { error: vi.fn() }
    };

    // Setup mock reply
    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };

    vi.clearAllMocks();
  });

  describe('listJobConnections', () => {
    it('should return job connections successfully', async () => {
      const mockServiceResult = {
        success: true,
        statusCode: 200,
        data: {
          jobConnections: [
            { id: 1, name: 'John Doe', connectionType: 'referral' }
          ],
          pagination: { page: 1, limit: 20, total: 1, pages: 1 }
        }
      };

      mockJobConnectionService.listJobConnections.mockResolvedValue(mockServiceResult);
      mockRequest.params = { id: '1' };
      mockRequest.query = { page: '1', limit: '20' };

      await listJobConnections(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(jobConnectionService.listJobConnections).toHaveBeenCalledWith(1, 1, { page: '1', limit: '20' });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(mockServiceResult.data);
    });

    it('should return 400 for invalid application ID', async () => {
      mockRequest.params = { id: 'invalid' };

      await listJobConnections(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid job application ID'
      });
      expect(mockJobConnectionService.listJobConnections).not.toHaveBeenCalled();
    });

    it('should return service error when service fails', async () => {
      const mockServiceResult = {
        success: false,
        statusCode: 404,
        error: 'Job application not found'
      };

      mockJobConnectionService.listJobConnections.mockResolvedValue(mockServiceResult);
      mockRequest.params = { id: '1' };

      await listJobConnections(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Job application not found'
      });
    });

    it('should handle service exceptions', async () => {
      mockJobConnectionService.listJobConnections.mockRejectedValue(new Error('Database error'));
      mockRequest.params = { id: '1' };

      await listJobConnections(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to retrieve job connections'
      });
    });
  });

  describe('getJobConnection', () => {
    it('should return job connection successfully', async () => {
      const mockJobConnection = {
        id: 1,
        name: 'John Doe',
        connectionType: 'referral',
        jobApplicationId: 1
      };

      const mockServiceResult = {
        success: true,
        statusCode: 200,
        jobConnection: mockJobConnection
      };

      mockJobConnectionService.getJobConnection.mockResolvedValue(mockServiceResult);
      mockRequest.params = { id: '1', connectionId: '1' };

      await getJobConnection(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockJobConnectionService.getJobConnection).toHaveBeenCalledWith(1, 1, 1);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(mockJobConnection);
    });

    it('should return 400 for invalid IDs', async () => {
      mockRequest.params = { id: 'invalid', connectionId: 'invalid' };

      await getJobConnection(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid application or connection ID'
      });
      expect(mockJobConnectionService.getJobConnection).not.toHaveBeenCalled();
    });

    it('should return service error when service fails', async () => {
      const mockServiceResult = {
        success: false,
        statusCode: 404,
        error: 'Job connection not found'
      };

      mockJobConnectionService.getJobConnection.mockResolvedValue(mockServiceResult);
      mockRequest.params = { id: '1', connectionId: '999' };

      await getJobConnection(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Job connection not found'
      });
    });
  });

  describe('createJobConnection', () => {
    it('should create job connection successfully', async () => {
      const mockJobConnection = {
        id: 1,
        name: 'John Doe',
        connectionType: 'referral',
        jobApplicationId: 1
      };

      const mockServiceResult = {
        success: true,
        statusCode: 201,
        message: 'Job connection created successfully',
        jobConnection: mockJobConnection
      };

      mockJobConnectionService.createJobConnection.mockResolvedValue(mockServiceResult);
      mockRequest.params = { id: '1' };
      mockRequest.body = {
        name: 'John Doe',
        connectionType: 'referral',
        email: 'john@example.com'
      };

      await createJobConnection(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockJobConnectionService.createJobConnection).toHaveBeenCalledWith(1, 1, mockRequest.body);
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: mockServiceResult.message,
        jobConnection: mockJobConnection
      });
    });

    it('should return 400 for invalid application ID', async () => {
      mockRequest.params = { id: 'invalid' };

      await createJobConnection(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid job application ID'
      });
      expect(mockJobConnectionService.createJobConnection).not.toHaveBeenCalled();
    });

    it('should return service error when service fails', async () => {
      const mockServiceResult = {
        success: false,
        statusCode: 400,
        error: 'Contact name is required'
      };

      mockJobConnectionService.createJobConnection.mockResolvedValue(mockServiceResult);
      mockRequest.params = { id: '1' };
      mockRequest.body = { connectionType: 'referral' };

      await createJobConnection(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Contact name is required'
      });
    });
  });

  describe('updateJobConnection', () => {
    it('should update job connection successfully', async () => {
      const mockJobConnection = {
        id: 1,
        name: 'John Smith',
        connectionType: 'referral',
        jobApplicationId: 1
      };

      const mockServiceResult = {
        success: true,
        statusCode: 200,
        message: 'Job connection updated successfully',
        jobConnection: mockJobConnection
      };

      mockJobConnectionService.updateJobConnection.mockResolvedValue(mockServiceResult);
      mockRequest.params = { id: '1', connectionId: '1' };
      mockRequest.body = { name: 'John Smith' };

      await updateJobConnection(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockJobConnectionService.updateJobConnection).toHaveBeenCalledWith(1, 1, 1, mockRequest.body);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: mockServiceResult.message,
        jobConnection: mockJobConnection
      });
    });

    it('should return 400 for invalid IDs', async () => {
      mockRequest.params = { id: 'invalid', connectionId: 'invalid' };

      await updateJobConnection(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid application or connection ID'
      });
      expect(mockJobConnectionService.updateJobConnection).not.toHaveBeenCalled();
    });

    it('should return service error when service fails', async () => {
      const mockServiceResult = {
        success: false,
        statusCode: 404,
        error: 'Job connection not found'
      };

      mockJobConnectionService.updateJobConnection.mockResolvedValue(mockServiceResult);
      mockRequest.params = { id: '1', connectionId: '999' };
      mockRequest.body = { name: 'John Smith' };

      await updateJobConnection(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Job connection not found'
      });
    });
  });

  describe('updateJobConnectionStatus', () => {
    it('should update job connection status successfully', async () => {
      const mockJobConnection = {
        id: 1,
        name: 'John Doe',
        connectionType: 'referral',
        status: 'contacted',
        jobApplicationId: 1
      };

      const mockServiceResult = {
        success: true,
        statusCode: 200,
        message: 'Job connection updated successfully',
        jobConnection: mockJobConnection
      };

      mockJobConnectionService.updateJobConnectionStatus.mockResolvedValue(mockServiceResult);
      mockRequest.params = { id: '1', connectionId: '1' };
      mockRequest.body = { status: 'contacted', notes: 'Called today' };

      await updateJobConnectionStatus(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockJobConnectionService.updateJobConnectionStatus).toHaveBeenCalledWith(1, 1, 1, mockRequest.body);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: mockServiceResult.message,
        jobConnection: mockJobConnection
      });
    });

    it('should return 400 for invalid IDs', async () => {
      mockRequest.params = { id: 'invalid', connectionId: 'invalid' };

      await updateJobConnectionStatus(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid application or connection ID'
      });
      expect(mockJobConnectionService.updateJobConnectionStatus).not.toHaveBeenCalled();
    });

    it('should return service error when service fails', async () => {
      const mockServiceResult = {
        success: false,
        statusCode: 400,
        error: 'Invalid status'
      };

      mockJobConnectionService.updateJobConnectionStatus.mockResolvedValue(mockServiceResult);
      mockRequest.params = { id: '1', connectionId: '1' };
      mockRequest.body = { status: 'invalid_status' };

      await updateJobConnectionStatus(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid status'
      });
    });
  });

  describe('deleteJobConnection', () => {
    it('should delete job connection successfully', async () => {
      const mockServiceResult = {
        success: true,
        statusCode: 200,
        message: 'Job connection deleted successfully'
      };

      mockJobConnectionService.deleteJobConnection.mockResolvedValue(mockServiceResult);
      mockRequest.params = { id: '1', connectionId: '1' };

      await deleteJobConnection(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockJobConnectionService.deleteJobConnection).toHaveBeenCalledWith(1, 1, 1);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: mockServiceResult.message
      });
    });

    it('should return 400 for invalid IDs', async () => {
      mockRequest.params = { id: 'invalid', connectionId: 'invalid' };

      await deleteJobConnection(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid application or connection ID'
      });
      expect(mockJobConnectionService.deleteJobConnection).not.toHaveBeenCalled();
    });

    it('should return service error when service fails', async () => {
      const mockServiceResult = {
        success: false,
        statusCode: 404,
        error: 'Job connection not found'
      };

      mockJobConnectionService.deleteJobConnection.mockResolvedValue(mockServiceResult);
      mockRequest.params = { id: '1', connectionId: '999' };

      await deleteJobConnection(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Job connection not found'
      });
    });

    it('should handle service exceptions', async () => {
      mockJobConnectionService.deleteJobConnection.mockRejectedValue(new Error('Database error'));
      mockRequest.params = { id: '1', connectionId: '1' };

      await deleteJobConnection(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to delete job connection'
      });
    });
  });
});
