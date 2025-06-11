/**
 * Authentication Middleware Tests
 * 
 * Tests the authentication middleware functions for JWT verification,
 * optional user context extraction, and role-based access control.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '../../models/user.models.js';

// Mock the AuthService module
const mockVerifyAccessToken = vi.fn();
vi.mock('../../services/auth.service.js', () => ({
  AuthService: vi.fn().mockImplementation(() => ({
    verifyAccessToken: mockVerifyAccessToken
  }))
}));

// Import after mocking
const { requireAuth, extractUser, roleBasedAccess } = await import('../../middleware/auth.middleware.js');

describe('Authentication Middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock request object
    mockRequest = {
      headers: {},
      url: '/test-endpoint'
    };

    // Mock reply object with chainable methods
    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requireAuth', () => {
    it('should successfully authenticate with valid Bearer token', async () => {
      // Arrange
      const mockToken = 'valid-jwt-token';
      const mockPayload = {
        userId: 1,
        email: 'test@example.com',
        role: UserRole.USER,
        type: 'access' as const
      };

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`
      };
      
      mockVerifyAccessToken.mockReturnValue(mockPayload);

      // Act
      await requireAuth(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockVerifyAccessToken).toHaveBeenCalledWith(mockToken);
      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    it('should return 401 when no authorization header is provided', async () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      await requireAuth(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'No authorization header provided',
        statusCode: 401,
        timestamp: expect.any(String),
        path: '/test-endpoint'
      });
      expect(mockVerifyAccessToken).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Basic some-token'
      };

      // Act
      await requireAuth(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid authorization format',
        message: 'Authorization header must start with "Bearer "',
        statusCode: 401,
        timestamp: expect.any(String),
        path: '/test-endpoint'
      });
      expect(mockVerifyAccessToken).not.toHaveBeenCalled();
    });

    it('should return 401 when no token is provided after Bearer', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer '
      };

      // Act
      await requireAuth(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'No token provided',
        statusCode: 401,
        timestamp: expect.any(String),
        path: '/test-endpoint'
      });
      expect(mockVerifyAccessToken).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', async () => {
      // Arrange
      const mockToken = 'expired-jwt-token';
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`
      };
      
      mockVerifyAccessToken.mockImplementation(() => {
        throw new Error('Token expired');
      });

      // Act
      await requireAuth(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'Token has expired',
        statusCode: 401,
        timestamp: expect.any(String),
        path: '/test-endpoint'
      });
    });

    it('should return 401 when token is invalid', async () => {
      // Arrange
      const mockToken = 'invalid-jwt-token';
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`
      };
      
      mockVerifyAccessToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      await requireAuth(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'Invalid or malformed token',
        statusCode: 401,
        timestamp: expect.any(String),
        path: '/test-endpoint'
      });
    });

    it('should return 401 when wrong token type is used', async () => {
      // Arrange
      const mockToken = 'refresh-token-used-as-access';
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`
      };
      
      mockVerifyAccessToken.mockImplementation(() => {
        throw new Error('Invalid token type');
      });

      // Act
      await requireAuth(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'Wrong token type (refresh token used where access token expected)',
        statusCode: 401,
        timestamp: expect.any(String),
        path: '/test-endpoint'
      });
    });

    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      const mockToken = 'token-causing-error';
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`
      };
      
      mockVerifyAccessToken.mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      // Act
      await requireAuth(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'Invalid token',
        statusCode: 401,
        timestamp: expect.any(String),
        path: '/test-endpoint'
      });
    });
  });

  describe('extractUser', () => {
    it('should extract user from valid Bearer token', async () => {
      // Arrange
      const mockToken = 'valid-jwt-token';
      const mockPayload = {
        userId: 1,
        email: 'test@example.com',
        role: UserRole.USER,
        type: 'access' as const
      };

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`
      };
      
      mockVerifyAccessToken.mockReturnValue(mockPayload);

      // Act
      await extractUser(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockVerifyAccessToken).toHaveBeenCalledWith(mockToken);
      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    it('should continue without user when no authorization header', async () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      await extractUser(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockVerifyAccessToken).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    it('should continue without user when authorization header is not Bearer', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Basic some-credentials'
      };

      // Act
      await extractUser(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockVerifyAccessToken).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    it('should continue without user when no token after Bearer', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer '
      };

      // Act
      await extractUser(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockVerifyAccessToken).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    it('should continue without user when token verification fails', async () => {
      // Arrange
      const mockToken = 'invalid-token';
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`
      };
      
      mockVerifyAccessToken.mockImplementation(() => {
        throw new Error('Token expired');
      });

      // Act
      await extractUser(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockVerifyAccessToken).toHaveBeenCalledWith(mockToken);
      expect(mockRequest.user).toBeUndefined();
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });
  });

  describe('roleBasedAccess', () => {
    it('should allow access when user has required role', async () => {
      // Arrange
      const allowedRoles = ['ADMIN', 'MODERATOR'];
      const middleware = roleBasedAccess(allowedRoles);
      
      mockRequest.user = {
        userId: 1,
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        type: 'access' as const
      };

      // Act
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    it('should deny access when user does not have required role', async () => {
      // Arrange
      const allowedRoles = ['ADMIN'];
      const middleware = roleBasedAccess(allowedRoles);
      
      mockRequest.user = {
        userId: 1,
        email: 'user@example.com',
        role: UserRole.USER,
        type: 'access' as const
      };

      // Act
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Access forbidden',
        message: 'This action requires one of the following roles: ADMIN. Your role: USER',
        statusCode: 403,
        timestamp: expect.any(String),
        path: '/test-endpoint'
      });
    });

    it('should deny access when no user context exists', async () => {
      // Arrange
      const allowedRoles = ['ADMIN'];
      const middleware = roleBasedAccess(allowedRoles);
      
      mockRequest.user = undefined;

      // Act
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'No user context found. Ensure requireAuth middleware runs before roleBasedAccess.',
        statusCode: 401,
        timestamp: expect.any(String),
        path: '/test-endpoint'
      });
    });

    it('should allow access when user has one of multiple allowed roles', async () => {
      // Arrange
      const allowedRoles = ['ADMIN', 'MODERATOR', 'PREMIUM'];
      const middleware = roleBasedAccess(allowedRoles);
      
      mockRequest.user = {
        userId: 1,
        email: 'moderator@example.com',
        role: 'MODERATOR' as UserRole,
        type: 'access' as const
      };

      // Act
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    it('should show all allowed roles in error message when access denied', async () => {
      // Arrange
      const allowedRoles = ['ADMIN', 'MODERATOR', 'PREMIUM'];
      const middleware = roleBasedAccess(allowedRoles);
      
      mockRequest.user = {
        userId: 1,
        email: 'user@example.com',
        role: UserRole.USER,
        type: 'access' as const
      };

      // Act
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Access forbidden',
        message: 'This action requires one of the following roles: ADMIN, MODERATOR, PREMIUM. Your role: USER',
        statusCode: 403,
        timestamp: expect.any(String),
        path: '/test-endpoint'
      });
    });
  });
}); 