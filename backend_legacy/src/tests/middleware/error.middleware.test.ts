/**
 * Global Error Handling Middleware Tests
 * 
 * Tests for the global error handler, custom error classes, and helper functions.
 * Includes tests for Fastify validation errors, Prisma errors, and custom business logic errors.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';
import {
  globalErrorHandler,
  BusinessLogicError,
  ValidationError,
  createBusinessError,
  createValidationError,
  isCustomError,
  ErrorResponse
} from '../../middleware/error.middleware.js';

describe('Error Middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockLog: any;

  beforeEach(() => {
    mockLog = {
      error: vi.fn()
    };

    mockRequest = {
      url: '/api/test',
      method: 'GET',
      headers: {},
      body: {},
      query: {},
      params: {},
      log: mockLog
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };
  });

  describe('Custom Error Classes', () => {
    describe('BusinessLogicError', () => {
      it('should create business logic error with default status code', () => {
        const error = new BusinessLogicError('Test error');
        
        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(400);
        expect(error.name).toBe('BusinessLogicError');
        expect(error.code).toBeUndefined();
      });

      it('should create business logic error with custom status code and code', () => {
        const error = new BusinessLogicError('Test error', 404, 'NOT_FOUND');
        
        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(404);
        expect(error.code).toBe('NOT_FOUND');
      });
    });

    describe('ValidationError', () => {
      it('should create validation error with default status code', () => {
        const error = new ValidationError('Validation failed');
        
        expect(error.message).toBe('Validation failed');
        expect(error.statusCode).toBe(400);
        expect(error.name).toBe('ValidationError');
        expect(error.details).toBeUndefined();
      });

      it('should create validation error with details', () => {
        const details = { field: 'email', value: 'invalid' };
        const error = new ValidationError('Validation failed', details, 422);
        
        expect(error.message).toBe('Validation failed');
        expect(error.statusCode).toBe(422);
        expect(error.details).toEqual(details);
      });
    });
  });

  describe('Helper Functions', () => {
    describe('createBusinessError', () => {
      it('should create business error with defaults', () => {
        const error = createBusinessError('Test error');
        
        expect(error).toBeInstanceOf(BusinessLogicError);
        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(400);
      });

      it('should create business error with custom parameters', () => {
        const error = createBusinessError('Custom error', 500, 'SERVER_ERROR');
        
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe('SERVER_ERROR');
      });
    });

    describe('createValidationError', () => {
      it('should create validation error with defaults', () => {
        const error = createValidationError('Validation failed');
        
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe('Validation failed');
        expect(error.statusCode).toBe(400);
      });
    });

    describe('isCustomError', () => {
      it('should return true for BusinessLogicError', () => {
        const error = new BusinessLogicError('Test');
        expect(isCustomError(error)).toBe(true);
      });

      it('should return true for ValidationError', () => {
        const error = new ValidationError('Test');
        expect(isCustomError(error)).toBe(true);
      });

      it('should return false for standard Error', () => {
        const error = new Error('Test');
        expect(isCustomError(error)).toBe(false);
      });
    });
  });

  describe('globalErrorHandler', () => {
    it('should handle Fastify validation errors', async () => {
      const validationError = {
        name: 'FastifyError',
        message: 'Validation error',
        statusCode: 400,
        code: 'FST_ERR_VALIDATION',
        validation: [
          {
            instancePath: '/email',
            schemaPath: '#/properties/email/format',
            message: 'must be a valid email'
          }
        ]
      } as FastifyError;

      await globalErrorHandler(validationError, mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          message: 'Request validation failed',
          statusCode: 400,
          details: expect.arrayContaining([
            expect.objectContaining({
              field: '/email',
              message: 'must be a valid email'
            })
          ])
        })
      );
    });

    it('should handle BusinessLogicError', async () => {
      const businessError = new BusinessLogicError('User not found', 404);

      await globalErrorHandler(businessError, mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Business Logic Error',
          message: 'User not found',
          statusCode: 404
        })
      );
    });

    it('should handle ValidationError', async () => {
      const validationError = new ValidationError('Invalid input', { field: 'email' });

      await globalErrorHandler(validationError, mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          message: 'Invalid input',
          statusCode: 400,
          details: { field: 'email' }
        })
      );
    });

    it('should handle Prisma unique constraint error (P2002)', async () => {
      const prismaError = new PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '4.0.0'
      });

      await globalErrorHandler(prismaError, mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(409);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Conflict',
          message: 'A record with this data already exists',
          statusCode: 409
        })
      );
    });

    it('should handle Prisma record not found error (P2025)', async () => {
      const prismaError = new PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '4.0.0'
      });

      await globalErrorHandler(prismaError, mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Not Found',
          message: 'The requested record was not found',
          statusCode: 404
        })
      );
    });

    it('should handle Prisma validation errors', async () => {
      const prismaError = new PrismaClientValidationError('Invalid data provided', { clientVersion: '4.0.0' });

      await globalErrorHandler(prismaError, mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Database Validation Error',
          message: 'Invalid data provided to database',
          statusCode: 400
        })
      );
    });

    it('should handle HTTP errors with status codes', async () => {
      const httpError: FastifyError = {
        name: 'HTTPError',
        message: 'Unauthorized access',
        statusCode: 401
      } as FastifyError;

      await globalErrorHandler(httpError, mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          message: 'Unauthorized access',
          statusCode: 401
        })
      );
    });

    it('should handle generic errors with development details', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const genericError = new Error('Something went wrong') as FastifyError;
      genericError.stack = 'Error stack trace';

      await globalErrorHandler(genericError, mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal Server Error',
          message: 'Something went wrong',
          statusCode: 500,
          details: expect.objectContaining({
            name: 'Error',
            stack: 'Error stack trace'
          })
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should hide error details in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const genericError = new Error('Something went wrong') as FastifyError;

      await globalErrorHandler(genericError, mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
          statusCode: 500
        })
      );

      const sentResponse = (mockReply.send as Mock).mock.calls[0][0];
      expect(sentResponse.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should log error details', async () => {
      const error = new Error('Test error') as FastifyError;

      await globalErrorHandler(error, mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockLog.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Test error',
          url: '/api/test',
          method: 'GET'
        }),
        'Request error'
      );
    });

    it('should include timestamp and path in all error responses', async () => {
      const error = new Error('Test error') as FastifyError;

      await globalErrorHandler(error, mockRequest as FastifyRequest, mockReply as FastifyReply);

      const sentResponse = (mockReply.send as Mock).mock.calls[0][0];
      expect(sentResponse.timestamp).toBeDefined();
      expect(sentResponse.path).toBe('/api/test');
      expect(new Date(sentResponse.timestamp)).toBeInstanceOf(Date);
    });
  });
}); 