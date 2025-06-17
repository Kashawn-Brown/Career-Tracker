/**
 * Job Connection Service Tests
 * 
 * Tests the business logic layer for job connection operations.
 * Focuses on service methods, validation, and business rules.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { JobConnectionService } from '../../services/job-connection.service.js';

// Mock repositories
vi.mock('../../repositories/index.js', () => ({
  repositories: {
    jobApplication: {
      findById: vi.fn()
    },
    jobConnection: {
      findByJobApplication: vi.fn(),
      findByIdWithRelations: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getJobConnectionStats: vi.fn()
    },
    contact: {
      findById: vi.fn()
    }
  }
}));

import { repositories } from '../../repositories/index.js';

describe('JobConnectionService', () => {
  let jobConnectionService: JobConnectionService;

  beforeEach(() => {
    jobConnectionService = new JobConnectionService();
    vi.clearAllMocks();
  });

  describe('listJobConnections', () => {
    it('should return job connections successfully', async () => {
      const mockJobApplication = { id: 1, userId: 1, title: 'Test Job' };
      const mockConnections = [
        { id: 1, name: 'John Doe', connectionType: 'referral', jobApplicationId: 1 }
      ];

      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.jobConnection.findByJobApplication as Mock).mockResolvedValue(mockConnections);

      const result = await jobConnectionService.listJobConnections(1, 1, { page: 1, limit: 20 });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.data?.jobConnections).toEqual(mockConnections);
      expect(result.data?.pagination.total).toBe(1);
    });

    it('should return 404 when job application not found', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(null);

      const result = await jobConnectionService.listJobConnections(1, 1, {});

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('Job application not found');
    });

    it('should return 404 when job application belongs to different user', async () => {
      const mockJobApplication = { id: 1, userId: 2, title: 'Test Job' };
      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);

      const result = await jobConnectionService.listJobConnections(1, 1, {});

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('Job application not found');
    });

    it('should filter connections by status', async () => {
      const mockJobApplication = { id: 1, userId: 1, title: 'Test Job' };
      const mockConnections = [
        { id: 1, name: 'John Doe', connectionType: 'referral', status: 'contacted', jobApplicationId: 1 },
        { id: 2, name: 'Jane Smith', connectionType: 'recruiter', status: 'not_contacted', jobApplicationId: 1 }
      ];

      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.jobConnection.findByJobApplication as Mock).mockResolvedValue(mockConnections);

      const result = await jobConnectionService.listJobConnections(1, 1, { status: 'contacted' });

      expect(result.success).toBe(true);
      expect(result.data?.jobConnections).toHaveLength(1);
      expect(result.data?.jobConnections[0].status).toBe('contacted');
    });

    it('should handle service errors', async () => {
      (repositories.jobApplication.findById as Mock).mockRejectedValue(new Error('Database error'));

      const result = await jobConnectionService.listJobConnections(1, 1, {});

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('Failed to retrieve job connections');
    });
  });

  describe('getJobConnection', () => {
    it('should return job connection successfully', async () => {
      const mockJobApplication = { id: 1, userId: 1, title: 'Test Job' };
      const mockConnection = { id: 1, name: 'John Doe', connectionType: 'referral', jobApplicationId: 1 };

      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.jobConnection.findByIdWithRelations as Mock).mockResolvedValue(mockConnection);

      const result = await jobConnectionService.getJobConnection(1, 1, 1);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.jobConnection).toEqual(mockConnection);
    });

    it('should return 404 when job application not found', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(null);

      const result = await jobConnectionService.getJobConnection(1, 1, 1);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('Job application not found');
    });

    it('should return 404 when job connection not found', async () => {
      const mockJobApplication = { id: 1, userId: 1, title: 'Test Job' };
      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.jobConnection.findByIdWithRelations as Mock).mockResolvedValue(null);

      const result = await jobConnectionService.getJobConnection(1, 1, 1);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('Job connection not found');
    });

    it('should return 404 when connection belongs to different application', async () => {
      const mockJobApplication = { id: 1, userId: 1, title: 'Test Job' };
      const mockConnection = { id: 1, name: 'John Doe', connectionType: 'referral', jobApplicationId: 2 };

      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.jobConnection.findByIdWithRelations as Mock).mockResolvedValue(mockConnection);

      const result = await jobConnectionService.getJobConnection(1, 1, 1);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('Job connection not found');
    });
  });

  describe('createJobConnection', () => {
    const validConnectionData = {
      name: 'John Doe',
      connectionType: 'referral',
      email: 'john@example.com'
    };

    it('should create job connection successfully', async () => {
      const mockJobApplication = { id: 1, userId: 1, title: 'Test Job' };
      const mockCreatedConnection = { id: 1, ...validConnectionData, jobApplicationId: 1 };

      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.jobConnection.findByJobApplication as Mock).mockResolvedValue([]);
      (repositories.jobConnection.create as Mock).mockResolvedValue(mockCreatedConnection);
      (repositories.jobConnection.findByIdWithRelations as Mock).mockResolvedValue(mockCreatedConnection);

      const result = await jobConnectionService.createJobConnection(1, 1, validConnectionData);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Job connection created successfully');
      expect(result.jobConnection).toEqual(mockCreatedConnection);
    });

    it('should return 400 for missing name', async () => {
      const invalidData = { ...validConnectionData, name: '' };

      const result = await jobConnectionService.createJobConnection(1, 1, invalidData);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('Contact name is required');
    });

    it('should return 400 for missing connection type', async () => {
      const invalidData = { ...validConnectionData, connectionType: '' };

      const result = await jobConnectionService.createJobConnection(1, 1, invalidData);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('Connection type is required');
    });

    it('should return 400 for invalid connection type', async () => {
      const invalidData = { ...validConnectionData, connectionType: 'invalid_type' };

      const result = await jobConnectionService.createJobConnection(1, 1, invalidData);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('Invalid connection type');
    });

    it('should return 400 for invalid email', async () => {
      const invalidData = { ...validConnectionData, email: 'invalid-email' };

      const result = await jobConnectionService.createJobConnection(1, 1, invalidData);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('Invalid email format');
    });

    it('should return 400 for duplicate connection', async () => {
      const mockJobApplication = { id: 1, userId: 1, title: 'Test Job' };
      const existingConnection = { id: 2, name: 'John Doe', connectionType: 'referral', jobApplicationId: 1 };

      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.jobConnection.findByJobApplication as Mock).mockResolvedValue([existingConnection]);

      const result = await jobConnectionService.createJobConnection(1, 1, validConnectionData);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('Connection with this name and type already exists for this application');
    });

    it('should return 404 when job application not found', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(null);

      const result = await jobConnectionService.createJobConnection(1, 1, validConnectionData);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('Job application not found');
    });
  });

  describe('updateJobConnection', () => {
    const updateData = { name: 'John Smith', email: 'johnsmith@example.com' };

    it('should update job connection successfully', async () => {
      const mockJobApplication = { id: 1, userId: 1, title: 'Test Job' };
      const mockConnection = { id: 1, name: 'John Doe', connectionType: 'referral', jobApplicationId: 1 };
      const mockUpdatedConnection = { ...mockConnection, ...updateData };

      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.jobConnection.findByIdWithRelations as Mock).mockResolvedValue(mockConnection);
      (repositories.jobConnection.findByJobApplication as Mock).mockResolvedValue([mockConnection]);
      (repositories.jobConnection.update as Mock).mockResolvedValue(mockUpdatedConnection);
      (repositories.jobConnection.findByIdWithRelations as Mock).mockResolvedValue(mockUpdatedConnection);

      const result = await jobConnectionService.updateJobConnection(1, 1, 1, updateData);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Job connection updated successfully');
      expect(result.jobConnection).toEqual(mockUpdatedConnection);
    });

    it('should return 404 when job connection not found', async () => {
      const mockJobApplication = { id: 1, userId: 1, title: 'Test Job' };
      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.jobConnection.findByIdWithRelations as Mock).mockResolvedValue(null);

      const result = await jobConnectionService.updateJobConnection(1, 1, 1, updateData);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('Job connection not found');
    });

    it('should return 400 for invalid email', async () => {
      const mockJobApplication = { id: 1, userId: 1, title: 'Test Job' };
      const mockConnection = { id: 1, name: 'John Doe', connectionType: 'referral', jobApplicationId: 1 };
      const invalidUpdateData = { email: 'invalid-email' };

      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.jobConnection.findByIdWithRelations as Mock).mockResolvedValue(mockConnection);

      const result = await jobConnectionService.updateJobConnection(1, 1, 1, invalidUpdateData);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('Invalid email format');
    });
  });

  describe('updateJobConnectionStatus', () => {
    const statusData = { status: 'contacted', notes: 'Called today' };

    it('should update job connection status successfully', async () => {
      const mockJobApplication = { id: 1, userId: 1, title: 'Test Job' };
      const mockConnection = { id: 1, name: 'John Doe', connectionType: 'referral', jobApplicationId: 1 };
      const mockUpdatedConnection = { ...mockConnection, status: 'contacted' };

      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.jobConnection.findByIdWithRelations as Mock).mockResolvedValue(mockConnection);
      (repositories.jobConnection.findByJobApplication as Mock).mockResolvedValue([mockConnection]);
      (repositories.jobConnection.update as Mock).mockResolvedValue(mockUpdatedConnection);
      (repositories.jobConnection.findByIdWithRelations as Mock).mockResolvedValue(mockUpdatedConnection);

      const result = await jobConnectionService.updateJobConnectionStatus(1, 1, 1, statusData);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Job connection updated successfully');
    });

    it('should return 400 for invalid status', async () => {
      const invalidStatusData = { status: 'invalid_status', notes: 'Test notes' };

      const result = await jobConnectionService.updateJobConnectionStatus(1, 1, 1, invalidStatusData);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('Invalid status');
    });
  });

  describe('deleteJobConnection', () => {
    it('should delete job connection successfully', async () => {
      const mockJobApplication = { id: 1, userId: 1, title: 'Test Job' };
      const mockConnection = { id: 1, name: 'John Doe', connectionType: 'referral', jobApplicationId: 1 };

      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.jobConnection.findByIdWithRelations as Mock).mockResolvedValue(mockConnection);
      (repositories.jobConnection.delete as Mock).mockResolvedValue(undefined);

      const result = await jobConnectionService.deleteJobConnection(1, 1, 1);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Job connection deleted successfully');
      expect(repositories.jobConnection.delete).toHaveBeenCalledWith(1);
    });

    it('should return 404 when job application not found', async () => {
      (repositories.jobApplication.findById as Mock).mockResolvedValue(null);

      const result = await jobConnectionService.deleteJobConnection(1, 1, 1);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('Job application not found');
    });

    it('should return 404 when job connection not found', async () => {
      const mockJobApplication = { id: 1, userId: 1, title: 'Test Job' };
      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.jobConnection.findByIdWithRelations as Mock).mockResolvedValue(null);

      const result = await jobConnectionService.deleteJobConnection(1, 1, 1);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('Job connection not found');
    });

    it('should return 404 when connection belongs to different application', async () => {
      const mockJobApplication = { id: 1, userId: 1, title: 'Test Job' };
      const mockConnection = { id: 1, name: 'John Doe', connectionType: 'referral', jobApplicationId: 2 };

      (repositories.jobApplication.findById as Mock).mockResolvedValue(mockJobApplication);
      (repositories.jobConnection.findByIdWithRelations as Mock).mockResolvedValue(mockConnection);

      const result = await jobConnectionService.deleteJobConnection(1, 1, 1);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('Job connection not found');
    });

    it('should handle service errors', async () => {
      (repositories.jobApplication.findById as Mock).mockRejectedValue(new Error('Database error'));

      const result = await jobConnectionService.deleteJobConnection(1, 1, 1);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('Failed to delete job connection');
    });
  });

  describe('helper methods', () => {
    describe('isValidEmail', () => {
      it('should validate email correctly', () => {
        // Using reflection to access private method for testing
        const isValidEmail = (jobConnectionService as any).isValidEmail.bind(jobConnectionService);
        
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true);
        expect(isValidEmail('invalid-email')).toBe(false);
        expect(isValidEmail('test@')).toBe(false);
        expect(isValidEmail('@example.com')).toBe(false);
        expect(isValidEmail('')).toBe(false);
      });
    });
  });
}); 