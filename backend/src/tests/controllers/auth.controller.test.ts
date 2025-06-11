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
    generateTokenPair: vi.fn(),
    generateEmailVerificationToken: vi.fn(),
    storeEmailVerificationToken: vi.fn(),
    verifyEmailToken: vi.fn(),
    refreshTokens: vi.fn(),
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

import { authService } from '../../services/index.js';
import { userRepository } from '../../repositories/index.js';
import { queueService } from '../../services/queue.service.js';

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
      user: undefined,
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as any,
      headers: {},
      params: {},
      url: '/test-endpoint'
    };

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
        password: 'hashed-password',
        role: UserRole.USER,
        emailVerified: false,
        provider: 'LOCAL',
        providerId: null
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      };

      authService.isValidEmail = vi.fn().mockReturnValue(true);
      authService.isValidPassword = vi.fn().mockReturnValue({ valid: true });
      userRepository.findByEmail = vi.fn().mockResolvedValue(null);
      authService.hashPassword = vi.fn().mockResolvedValue('hashed-password');
      userRepository.create = vi.fn().mockResolvedValue(mockUser);
      authService.generateEmailVerificationToken = vi.fn().mockReturnValue('verification-token');
      authService.storeEmailVerificationToken = vi.fn().mockResolvedValue(undefined);
      authService.generateTokenPair = vi.fn().mockReturnValue(mockTokens);
      queueService.isReady = vi.fn().mockReturnValue(true);
      queueService.addEmailVerificationJob = vi.fn().mockResolvedValue(undefined);

      // Act
      await authController.register(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(userRepository.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        emailVerified: false,
        provider: 'LOCAL',
        providerId: null
      });
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'User registered successfully. Please check your email for verification.',
        user: expect.objectContaining({
          id: 1,
          email: 'test@example.com',
          name: 'Test User'
        }),
        tokens: mockTokens
      });
      expect(queueService.addEmailVerificationJob).toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', async () => {
      // Arrange
      mockRequest.body = { email: 'test@example.com' }; // Missing password and name

      // Act
      await authController.register(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Missing required fields: email, password, name'
      });
    });

    it('should return 400 for invalid email format', async () => {
      // Arrange
      mockRequest.body = { ...validRegisterData, email: 'invalid-email' };
      authService.isValidEmail = vi.fn().mockReturnValue(false);

      // Act
      await authController.register(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid email format'
      });
    });

    it('should return 400 for weak password', async () => {
      // Arrange
      mockRequest.body = validRegisterData;
      authService.isValidEmail = vi.fn().mockReturnValue(true);
      authService.isValidPassword = vi.fn().mockReturnValue({
        valid: false,
        errors: ['Password must contain uppercase letter']
      });

      // Act
      await authController.register(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Password validation failed',
        details: ['Password must contain uppercase letter']
      });
    });

    it('should return 409 for existing verified user', async () => {
      // Arrange
      mockRequest.body = validRegisterData;
      authService.isValidEmail = vi.fn().mockReturnValue(true);
      authService.isValidPassword = vi.fn().mockReturnValue({ valid: true });
      userRepository.findByEmail = vi.fn().mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        emailVerified: true
      });

      // Act
      await authController.register(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(409);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'User with this email already exists and is verified'
      });
    });

    it('should return 409 with resend option for unverified user', async () => {
      // Arrange
      mockRequest.body = validRegisterData;
      authService.isValidEmail = vi.fn().mockReturnValue(true);
      authService.isValidPassword = vi.fn().mockReturnValue({ valid: true });
      userRepository.findByEmail = vi.fn().mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        emailVerified: false
      });

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

    it('should handle registration error gracefully', async () => {
      // Arrange
      mockRequest.body = validRegisterData;
      authService.isValidEmail = vi.fn().mockReturnValue(true);
      authService.isValidPassword = vi.fn().mockReturnValue({ valid: true });
      userRepository.findByEmail = vi.fn().mockRejectedValue(new Error('Database error'));

      // Act
      await authController.register(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Internal server error during registration'
      });
    });
  });

  describe('login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'password123'
    };

    it('should login user successfully', async () => {
      // Arrange
      mockRequest.body = validLoginData;
      
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password',
        role: UserRole.USER,
        name: 'Test User'
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      };

      userRepository.findByEmail = vi.fn().mockResolvedValue(mockUser);
      authService.comparePassword = vi.fn().mockResolvedValue(true);
      authService.generateTokenPair = vi.fn().mockReturnValue(mockTokens);

      // Act
      await authController.login(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(authService.comparePassword).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Login successful',
        user: expect.objectContaining({
          id: 1,
          email: 'test@example.com',
          name: 'Test User'
        }),
        tokens: mockTokens
      });
    });

    it('should return 400 for missing credentials', async () => {
      // Arrange
      mockRequest.body = { email: 'test@example.com' }; // Missing password

      // Act
      await authController.login(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Email and password are required'
      });
    });

    it('should return 401 for non-existent user', async () => {
      // Arrange
      mockRequest.body = validLoginData;
      userRepository.findByEmail = vi.fn().mockResolvedValue(null);

      // Act
      await authController.login(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid credentials'
      });
    });

    it('should return 401 for OAuth user trying password login', async () => {
      // Arrange
      mockRequest.body = validLoginData;
      userRepository.findByEmail = vi.fn().mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        password: null, // OAuth user
        provider: 'GOOGLE'
      });

      // Act
      await authController.login(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'This account uses OAuth login. Please use Google or LinkedIn to sign in.'
      });
    });

    it('should return 401 for invalid password', async () => {
      // Arrange
      mockRequest.body = validLoginData;
      userRepository.findByEmail = vi.fn().mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password'
      });
      authService.comparePassword = vi.fn().mockResolvedValue(false);

      // Act
      await authController.login(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid credentials'
      });
    });

    it('should handle login error gracefully', async () => {
      // Arrange
      mockRequest.body = validLoginData;
      userRepository.findByEmail = vi.fn().mockRejectedValue(new Error('Database error'));

      // Act
      await authController.login(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Internal server error during login'
      });
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      // Arrange
      mockRequest.body = { token: 'valid-token' };
      authService.verifyEmailToken = vi.fn().mockResolvedValue({
        success: true,
        message: 'Email verified successfully'
      });

      // Act
      await authController.verifyEmail(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(authService.verifyEmailToken).toHaveBeenCalledWith('valid-token');
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Email verified successfully'
      });
    });

    it('should return 400 for missing token', async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await authController.verifyEmail(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Verification token is required'
      });
    });

    it('should return verification failure', async () => {
      // Arrange
      mockRequest.body = { token: 'invalid-token' };
      authService.verifyEmailToken = vi.fn().mockResolvedValue({
        success: false,
        message: 'Invalid or expired token'
      });

      // Act
      await authController.verifyEmail(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
        action: undefined,
        message: undefined
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      // Arrange
      mockRequest.body = { refreshToken: 'valid-refresh-token' };
      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };
      authService.refreshTokens = vi.fn().mockResolvedValue(newTokens);

      // Act
      await authController.refreshToken(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(authService.refreshTokens).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Tokens refreshed successfully',
        tokens: newTokens
      });
    });

    it('should return 400 for missing refresh token', async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await authController.refreshToken(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Refresh token is required'
      });
    });

    it('should handle invalid refresh token', async () => {
      // Arrange
      mockRequest.body = { refreshToken: 'invalid-token' };
      authService.refreshTokens = vi.fn().mockRejectedValue(new Error('invalid token'));

      // Act
      await authController.refreshToken(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid or expired refresh token'
      });
    });
  });

  describe('forgotPassword', () => {
    it('should initiate password reset successfully', async () => {
      // Arrange
      mockRequest.body = { email: 'test@example.com' };
      authService.isValidEmail = vi.fn().mockReturnValue(true);
      authService.requestPasswordReset = vi.fn().mockResolvedValue({
        success: true,
        message: 'Password reset email sent',
        token: 'reset-token'
      });

      // Act
      await authController.forgotPassword(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(authService.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Password reset email sent'
      });
    });

    it('should return 400 for missing email', async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await authController.forgotPassword(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Email is required'
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      // Arrange
      mockRequest.params = { token: 'valid-reset-token' };
      mockRequest.body = { password: 'NewPassword123!' };
      authService.resetPassword = vi.fn().mockResolvedValue({
        success: true,
        message: 'Password reset successfully'
      });

      // Act
      await authController.resetPassword(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(authService.resetPassword).toHaveBeenCalledWith(
        'valid-reset-token',
        'NewPassword123!',
        expect.any(Object)
      );
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Password reset successfully'
      });
    });

    it('should return 400 for missing fields', async () => {
      // Arrange
      mockRequest.params = { token: 'valid-token' };
      mockRequest.body = {}; // Missing password

      // Act
      await authController.resetPassword(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'New password is required'
      });
    });
  });

  describe('setupSecurityQuestions', () => {
    it('should setup security questions successfully', async () => {
      // Arrange
      (mockRequest as any).user = { id: 1, email: 'test@example.com', role: UserRole.USER, type: 'access' };
      mockRequest.body = {
        questions: [
          { question: 'What is your favorite color?', answer: 'Blue' },
          { question: 'What is your pet name?', answer: 'Fluffy' },
          { question: 'What is your birth city?', answer: 'Boston' }
        ]
      };
      authService.setupSecurityQuestions = vi.fn().mockResolvedValue({
        success: true,
        message: 'Security questions setup successfully'
      });

      // Act
      await authController.setupSecurityQuestions(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(authService.setupSecurityQuestions).toHaveBeenCalledWith(1, [
        { question: 'What is your favorite color?', answer: 'Blue' },
        { question: 'What is your pet name?', answer: 'Fluffy' },
        { question: 'What is your birth city?', answer: 'Boston' }
      ]);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Security questions setup successfully',
        questionsSet: 3
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      // Arrange
      mockRequest.user = undefined;
      mockRequest.body = { questions: [] };

      // Act
      await authController.setupSecurityQuestions(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Authentication required'
      });
    });
  });

  describe('getAvailableSecurityQuestions', () => {
    it('should return available security questions', async () => {
      // Arrange
      const mockQuestions = {
        questions: [
          { type: 'childhood', text: 'What was your childhood nickname?' },
          { type: 'pet', text: 'What was the name of your first pet?' }
        ]
      };
      authService.getAvailableSecurityQuestions = vi.fn().mockResolvedValue(mockQuestions);

      // Act
      await authController.getAvailableSecurityQuestions(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(authService.getAvailableSecurityQuestions).toHaveBeenCalled();
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Available security questions retrieved successfully',
        questions: mockQuestions.questions
      });
    });
  });
}); 