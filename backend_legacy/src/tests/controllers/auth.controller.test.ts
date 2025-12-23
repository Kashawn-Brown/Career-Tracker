/**
 * Authentication Controller Tests
 * 
 * Tests the AuthController class for all authentication endpoints including
 * registration, login, email verification, password reset, and security questions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthController } from '../../controllers/auth.controller.js';
import { UserRole } from '../../models/user.models.js';

// Mock all dependencies
vi.mock('../../services/index.js', () => ({
  authService: {
    isValidEmail: vi.fn(),
    isValidPassword: vi.fn(),
    hashPassword: vi.fn(),
    comparePassword: vi.fn(),
    generateToken: vi.fn(),
    storeEmailVerificationToken: vi.fn(),
    verifyEmailToken: vi.fn(),
    processEmailVerification: vi.fn(),
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    resendEmailVerification: vi.fn(),
    requestPasswordReset: vi.fn(),
    verifyPasswordResetToken: vi.fn(),
    resetPassword: vi.fn(),
    setupSecurityQuestions: vi.fn(),
    getUserSecurityQuestions: vi.fn(),
    getRecoveryQuestions: vi.fn(),
    verifySecurityQuestions: vi.fn(),
    getAvailableSecurityQuestions: vi.fn(),
    setupSecondaryEmail: vi.fn(),
    verifySecondaryEmail: vi.fn(),
    requestPasswordResetSecondary: vi.fn()
  }
}));

vi.mock('../../repositories/index.js', () => ({
  userRepository: {
    findByEmail: vi.fn(),
    create: vi.fn(),
    findById: vi.fn()
  }
}));

vi.mock('../../services/queue.service.js', () => ({
  queueService: {
    isReady: vi.fn(),
    addEmailVerificationJob: vi.fn()
  }
}));

vi.mock('../../services/jwt.service.js', () => ({
  jwtService: {
    generateTokenPair: vi.fn(),
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: vi.fn(),
    refreshTokens: vi.fn()
  }
}));

import { authService } from '../../services/index.js';
import { userRepository } from '../../repositories/index.js';
import { queueService } from '../../services/queue.service.js';
import { jwtService } from '../../services/jwt.service.js';

describe('AuthController', () => {
  let authController: AuthController;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();
    authController = new AuthController();
    
    // Mock request object
    mockRequest = {
      body: {},
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as any,
      headers: {},
      params: {},
      url: '/test-endpoint'
    } as any;

    // Mock reply object with chainable methods
    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    // Set default environment
    process.env.FRONTEND_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('register', () => {
    const validRegisterData = {
      email: 'test@example.com',
      password: 'StrongPassword123!',
      name: 'Test User'
    };

    it('should register a new user successfully', async () => {
      // Arrange
      mockRequest.body = validRegisterData;
      
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        emailVerified: false,
        provider: 'LOCAL',
        providerId: null
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      };

      const mockResult = {
        success: true,
        statusCode: 201,
        message: 'User registered successfully. Please check your email for verification.',
        user: mockUser,
        tokens: mockTokens
      };

      authService.registerUser = vi.fn().mockResolvedValue(mockResult);

      // Act
      await authController.register(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(authService.registerUser).toHaveBeenCalledWith('test@example.com', 'StrongPassword123!', 'Test User');
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'User registered successfully. Please check your email for verification.',
        user: mockUser,
        tokens: mockTokens
      });
    });

    it('should return 400 for missing required fields', async () => {
      // Arrange
      mockRequest.body = { email: 'test@example.com' }; // Missing password and name

      // Act
      await authController.register(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Bad Request',
        message: 'Missing required fields: email, password, name',
        statusCode: 400,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        code: 'MISSING_FIELDS',
        context: {
          operation: 'register',
          resource: 'user'
        }
      });
    });

    it('should handle registration failure with error details', async () => {
      // Arrange
      mockRequest.body = validRegisterData;
      
      const mockResult = {
        success: false,
        statusCode: 400,
        error: 'Password validation failed',
        details: ['Password must contain uppercase letter']
      };

      authService.registerUser = vi.fn().mockResolvedValue(mockResult);

      // Act
      await authController.register(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Password validation failed',
        details: ['Password must contain uppercase letter']
      });
    });

    it('should handle registration failure with action', async () => {
      // Arrange
      mockRequest.body = validRegisterData;
      
      const mockResult = {
        success: false,
        statusCode: 409,
        error: 'You have already registered with this email but haven\'t verified it yet.',
        action: 'resend_verification',
        message: 'Would you like to resend the verification email?'
      };

      authService.registerUser = vi.fn().mockResolvedValue(mockResult);

      // Act
      await authController.register(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(409);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'You have already registered with this email but haven\'t verified it yet.',
        action: 'resend_verification',
        message: 'Would you like to resend the verification email?'
      });
    });
  });

  describe('login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'StrongPassword123!'
    };

    it('should login user successfully', async () => {
      // Arrange
      mockRequest.body = validLoginData;
      
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        emailVerified: true,
        provider: 'LOCAL',
        providerId: null
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      };

      const mockResult = {
        success: true,
        statusCode: 200,
        message: 'Login successful',
        user: mockUser,
        tokens: mockTokens
      };

      authService.loginUser = vi.fn().mockResolvedValue(mockResult);

      // Act
      await authController.login(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(authService.loginUser).toHaveBeenCalledWith('test@example.com', 'StrongPassword123!');
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Login successful',
        user: mockUser,
        tokens: mockTokens
      });
    });

    it('should return 400 for missing email', async () => {
      // Arrange
      mockRequest.body = { password: 'StrongPassword123!' }; // Missing email

      // Act
      await authController.login(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Bad Request',
        message: 'Email and password are required',
        statusCode: 400,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        code: 'MISSING_CREDENTIALS',
        context: {
          operation: 'login',
          resource: 'authentication'
        }
      });
    });

    it('should return 400 for missing password', async () => {
      // Arrange
      mockRequest.body = { email: 'test@example.com' }; // Missing password

      // Act
      await authController.login(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Bad Request',
        message: 'Email and password are required',
        statusCode: 400,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        code: 'MISSING_CREDENTIALS',
        context: {
          operation: 'login',
          resource: 'authentication'
        }
      });
    });

    it('should handle login failure', async () => {
      // Arrange
      mockRequest.body = validLoginData;
      
      const mockResult = {
        success: false,
        statusCode: 401,
        error: 'Invalid credentials'
      };

      authService.loginUser = vi.fn().mockResolvedValue(mockResult);

      // Act
      await authController.login(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid credentials'
      });
    });
  });

  describe('handleEmailVerification', () => {
    it('should verify email successfully', async () => {
      // Arrange
      mockRequest.body = { token: 'valid-token' };
      
      const mockResult = {
        success: true,
        statusCode: 200,
        message: 'Email verified successfully'
      };

      authService.processEmailVerification = vi.fn().mockResolvedValue(mockResult);

      // Act
      await authController.handleEmailVerification(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(authService.processEmailVerification).toHaveBeenCalledWith('valid-token');
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Email verified successfully'
      });
    });

    it('should return 400 for missing token', async () => {
      // Arrange
      mockRequest.body = {}; // Missing token

      // Act
      await authController.handleEmailVerification(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Bad Request',
        message: 'Verification token is required',
        statusCode: 400,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        code: 'MISSING_TOKEN',
        context: {
          operation: 'email_verification',
          resource: 'token'
        }
      });
    });

    it('should handle verification failure with action', async () => {
      // Arrange
      mockRequest.body = { token: 'invalid-token' };
      
      const mockResult = {
        success: false,
        statusCode: 400,
        error: 'Invalid verification token',
        action: 'resend_verification',
        message: 'Would you like to resend the verification email?'
      };

      authService.processEmailVerification = vi.fn().mockResolvedValue(mockResult);

      // Act
      await authController.handleEmailVerification(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid verification token',
        action: 'resend_verification',
        message: 'Would you like to resend the verification email?'
      });
    });
  });

  describe('resendVerification', () => {
    it('should resend verification email successfully', async () => {
      // Arrange
      mockRequest.body = { email: 'test@example.com' };
      
      const mockResult = {
        success: true,
        statusCode: 200,
        message: 'Verification email sent successfully'
      };

      authService.isValidEmail = vi.fn().mockReturnValue(true);
      authService.resendEmailVerification = vi.fn().mockResolvedValue(mockResult);

      // Act
      await authController.resendVerification(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(authService.resendEmailVerification).toHaveBeenCalledWith('test@example.com');
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Verification email sent successfully'
      });
    });

    it('should return 400 for missing email', async () => {
      // Arrange
      mockRequest.body = {}; // Missing email

      // Act
      await authController.resendVerification(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Bad Request',
        message: 'Email is required',
        statusCode: 400,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        code: 'MISSING_EMAIL',
        context: {
          operation: 'resend_verification',
          resource: 'email'
        }
      });
    });

    it('should handle resend verification failure', async () => {
      // Arrange
      mockRequest.body = { email: 'test@example.com' };
      
      const mockResult = {
        success: false,
        statusCode: 404,
        error: 'User not found'
      };

      authService.isValidEmail = vi.fn().mockReturnValue(true);
      authService.resendEmailVerification = vi.fn().mockResolvedValue(mockResult);

      // Act
      await authController.resendVerification(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'User not found'
      });
    });
  });

  describe('forgotPassword', () => {
    it('should initiate password reset successfully', async () => {
      // Arrange
      mockRequest.body = { email: 'test@example.com' };
      
      const mockResult = {
        success: true,
        statusCode: 200,
        message: 'Password reset email sent successfully'
      };

      authService.isValidEmail = vi.fn().mockReturnValue(true);
      authService.requestPasswordReset = vi.fn().mockResolvedValue(mockResult);

      // Act
      await authController.forgotPassword(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(authService.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Password reset email sent successfully'
      });
    });

    it('should return 400 for missing email', async () => {
      // Arrange
      mockRequest.body = {}; // Missing email

      // Act
      await authController.forgotPassword(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Bad Request',
        message: 'Email is required',
        statusCode: 400,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        code: 'MISSING_EMAIL',
        context: {
          operation: 'forgot_password',
          resource: 'email'
        }
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      // Arrange
      mockRequest.body = { refreshToken: 'valid-refresh-token' };
      
      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };

      const mockResult = {
        success: true,
        statusCode: 200,
        message: 'Tokens refreshed successfully',
        tokens: mockTokens
      };

      jwtService.refreshTokens = vi.fn().mockReturnValue(mockResult);

      // Act
      await authController.refreshToken(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(jwtService.refreshTokens).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Tokens refreshed successfully',
        tokens: mockTokens
      });
    });

    it('should return 400 for missing refresh token', async () => {
      // Arrange
      mockRequest.body = {}; // Missing refreshToken

      // Act
      await authController.refreshToken(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Refresh token is required'
      });
    });

    it('should handle refresh token failure', async () => {
      // Arrange
      mockRequest.body = { refreshToken: 'invalid-refresh-token' };
      
      const mockResult = {
        success: false,
        statusCode: 401,
        error: 'Invalid refresh token'
      };

      jwtService.refreshTokens = vi.fn().mockReturnValue(mockResult);

      // Act
      await authController.refreshToken(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid refresh token'
      });
    });
  });
}); 