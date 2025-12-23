/**
 * Email Service Tests
 * 
 * Tests the EmailService class for email sending operations, template generation,
 * and SendGrid integration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailService } from '../../services/email.service.js';
import { EmailTemplate } from '../../models/email.models.js';

// Mock SendGrid
vi.mock('@sendgrid/mail', () => {
  const mockSend = vi.fn();
  return {
    default: {
      setApiKey: vi.fn(),
      send: mockSend
    }
  };
});

import sgMail from '@sendgrid/mail';

describe('EmailService', () => {
  let emailService: EmailService;
  let originalEnv: any;
  let mockSend: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend = vi.mocked(sgMail.send);
    
    // Store original environment
    originalEnv = { ...process.env };
    
    // Set up test environment
    process.env.SENDGRID_API_KEY = 'test-api-key';
    process.env.FROM_EMAIL = 'test@example.com';
    process.env.FROM_NAME = 'Test Service';
    process.env.REPLY_TO_EMAIL = 'support@example.com';
    
    emailService = new EmailService();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with proper configuration', () => {
      // Assert
      expect(emailService.isReady()).toBe(true);
    });

    it('should not be ready without API key', () => {
      // Arrange
      process.env.SENDGRID_API_KEY = '';
      
      // Act
      const serviceWithoutKey = new EmailService();
      
      // Assert
      expect(serviceWithoutKey.isReady()).toBe(false);
    });

    it('should use default values when environment variables are missing', () => {
      // Arrange
      delete process.env.FROM_EMAIL;
      delete process.env.FROM_NAME;
      delete process.env.REPLY_TO_EMAIL;
      
      // Act
      const serviceWithDefaults = new EmailService();
      
      // Assert
      expect(serviceWithDefaults.isReady()).toBe(true); // Should still work with defaults
    });
  });

  describe('Email Verification', () => {
    it('should send email verification successfully', async () => {
      // Arrange
      const verificationData = {
        to: 'user@example.com',
        userName: 'Test User',
        verificationToken: 'test-token',
        verificationUrl: 'http://localhost:3000/verify?token=test-token'
      };

      mockSend.mockResolvedValue([{
        statusCode: 202,
        headers: { 'x-message-id': 'test-message-id' },
        body: 'Accepted'
      }]);

      // Act
      const result = await emailService.sendEmailVerification(verificationData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(mockSend).toHaveBeenCalledWith({
        to: 'user@example.com',
        from: {
          email: 'test@example.com',
          name: 'Test Service'
        },
        replyTo: 'support@example.com',
        subject: 'Please verify your email address',
        html: expect.stringContaining('Test User'),
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true }
        }
      });
    });

    it('should return error when service is not configured', async () => {
      // Arrange
      process.env.SENDGRID_API_KEY = '';
      const unconfiguredService = new EmailService();
      
      const verificationData = {
        to: 'user@example.com',
        userName: 'Test User',
        verificationToken: 'test-token',
        verificationUrl: 'http://localhost:3000/verify?token=test-token'
      };

      // Act
      const result = await unconfiguredService.sendEmailVerification(verificationData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email service is not configured');
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should handle SendGrid API errors', async () => {
      // Arrange
      const verificationData = {
        to: 'invalid@example.com',
        userName: 'Test User',
        verificationToken: 'test-token',
        verificationUrl: 'http://localhost:3000/verify?token=test-token'
      };

      mockSend.mockRejectedValue(new Error('Invalid email address'));

      // Act
      const result = await emailService.sendEmailVerification(verificationData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email address');
    });

    it('should generate proper HTML template for email verification', async () => {
      // Arrange
      const verificationData = {
        to: 'user@example.com',
        userName: 'John Doe',
        verificationToken: 'test-token',
        verificationUrl: 'http://localhost:3000/verify?token=test-token'
      };

      mockSend.mockResolvedValue([{
        statusCode: 202,
        headers: { 'x-message-id': 'test-id' },
        body: 'Accepted'
      }]);

      // Act
      await emailService.sendEmailVerification(verificationData);

      // Assert
      const sentEmail = mockSend.mock.calls[0][0];
      expect(sentEmail.html).toContain('John Doe');
      expect(sentEmail.html).toContain('http://localhost:3000/verify?token=test-token');
      expect(sentEmail.html).toContain('Verify Email Address');
      expect(sentEmail.html).toContain('Career Tracker');
    });
  });

  describe('Welcome Email', () => {
    it('should send welcome email successfully', async () => {
      // Arrange
      const welcomeData = {
        to: 'user@example.com',
        userName: 'Test User'
      };

      mockSend.mockResolvedValue([{
        statusCode: 202,
        headers: { 'x-message-id': 'welcome-message-id' },
        body: 'Accepted'
      }]);

      // Act
      const result = await emailService.sendWelcomeEmail(welcomeData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('welcome-message-id');
      expect(mockSend).toHaveBeenCalledWith({
        to: 'user@example.com',
        from: {
          email: 'test@example.com',
          name: 'Test Service'
        },
        replyTo: 'support@example.com',
        subject: 'Welcome to Career Tracker!',
        html: expect.stringContaining('Test User'),
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true }
        }
      });
    });

    it('should generate proper HTML template for welcome email', async () => {
      // Arrange
      const welcomeData = {
        to: 'user@example.com',
        userName: 'Jane Smith'
      };

      mockSend.mockResolvedValue([{
        statusCode: 202,
        headers: { 'x-message-id': 'test-id' },
        body: 'Accepted'
      }]);

      // Act
      await emailService.sendWelcomeEmail(welcomeData);

      // Assert
      const sentEmail = mockSend.mock.calls[0][0];
      expect(sentEmail.html).toContain('Jane Smith');
      expect(sentEmail.html).toContain('Welcome to Career Tracker');
      expect(sentEmail.html).toContain('getting started');
    });
  });

  describe('Password Reset Email', () => {
    it('should send password reset email successfully', async () => {
      // Arrange
      const resetData = {
        to: 'user@example.com',
        userName: 'Test User',
        resetToken: 'reset-token',
        resetUrl: 'http://localhost:3000/reset-password?token=reset-token',
        expiresIn: '1 hour'
      };

      mockSend.mockResolvedValue([{
        statusCode: 202,
        headers: { 'x-message-id': 'reset-message-id' },
        body: 'Accepted'
      }]);

      // Act
      const result = await emailService.sendPasswordReset(resetData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('reset-message-id');
      expect(mockSend).toHaveBeenCalledWith({
        to: 'user@example.com',
        from: {
          email: 'test@example.com',
          name: 'Test Service'
        },
        replyTo: 'support@example.com',
        subject: 'Reset your password',
        html: expect.stringContaining('Test User'),
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true }
        }
      });
    });

    it('should generate proper HTML template for password reset', async () => {
      // Arrange
      const resetData = {
        to: 'user@example.com',
        userName: 'Bob Johnson',
        resetToken: 'reset-token',
        resetUrl: 'http://localhost:3000/reset-password?token=reset-token',
        expiresIn: '1 hour'
      };

      mockSend.mockResolvedValue([{
        statusCode: 202,
        headers: { 'x-message-id': 'test-id' },
        body: 'Accepted'
      }]);

      // Act
      await emailService.sendPasswordReset(resetData);

      // Assert
      const sentEmail = mockSend.mock.calls[0][0];
      expect(sentEmail.html).toContain('Bob Johnson');
      expect(sentEmail.html).toContain('http://localhost:3000/reset-password?token=reset-token');
      expect(sentEmail.html).toContain('Reset Password');
      expect(sentEmail.html).toContain('1 hour');
    });
  });

  describe('Job Application Notification', () => {
    it('should send job application notification successfully', async () => {
      // Arrange
      const notificationData = {
        to: 'user@example.com',
        userName: 'Test User',
        position: 'Software Engineer',
        company: 'Tech Corp',
        applicationDate: new Date('2024-01-15'),
        status: 'submitted' as const
      };

      mockSend.mockResolvedValue([{
        statusCode: 202,
        headers: { 'x-message-id': 'notification-message-id' },
        body: 'Accepted'
      }]);

      // Act
      const result = await emailService.sendJobApplicationNotification(notificationData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('notification-message-id');
      expect(mockSend).toHaveBeenCalledWith({
        to: 'user@example.com',
        from: {
          email: 'test@example.com',
          name: 'Test Service'
        },
        replyTo: 'support@example.com',
        subject: 'Job Application Submitted: Software Engineer at Tech Corp',
        html: expect.stringContaining('Test User'),
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true }
        }
      });
    });

    it('should generate proper HTML template for job application notification', async () => {
      // Arrange
      const notificationData = {
        to: 'user@example.com',
        userName: 'Alice Cooper',
        position: 'Frontend Developer',
        company: 'StartupXYZ',
        applicationDate: new Date('2024-01-15'),
        status: 'submitted' as const
      };

      mockSend.mockResolvedValue([{
        statusCode: 202,
        headers: { 'x-message-id': 'test-id' },
        body: 'Accepted'
      }]);

      // Act
      await emailService.sendJobApplicationNotification(notificationData);

      // Assert
      const sentEmail = mockSend.mock.calls[0][0];
      expect(sentEmail.html).toContain('Alice Cooper');
      expect(sentEmail.html).toContain('Frontend Developer');
      expect(sentEmail.html).toContain('StartupXYZ');
      expect(sentEmail.html).toContain('submitted');
    });
  });

  describe('Security Notification Emails', () => {
    describe('Password Changed Email', () => {
      it('should send password changed notification', async () => {
        // Arrange
        mockSend.mockResolvedValue([{
          statusCode: 202,
          headers: { 'x-message-id': 'pwd-changed-id' },
          body: 'Accepted'
        }]);

        // Act
        const result = await emailService.sendPasswordChangedEmail(
          'user@example.com',
          'Test User',
          '192.168.1.1',
          'Mozilla/5.0...'
        );

        // Assert
        expect(result.success).toBe(true);
        expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Password Changed')
        }));
      });
    });

    describe('Account Locked Email', () => {
      it('should send account locked notification', async () => {
        // Arrange
        const unlockTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        mockSend.mockResolvedValue([{
          statusCode: 202,
          headers: { 'x-message-id': 'locked-id' },
          body: 'Accepted'
        }]);

        // Act
        const result = await emailService.sendAccountLockedEmail(
          'user@example.com',
          'Test User',
          unlockTime,
          'Too many failed login attempts'
        );

        // Assert
        expect(result.success).toBe(true);
        expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Account Locked')
        }));
      });
    });

    describe('Account Unlocked Email', () => {
      it('should send account unlocked notification', async () => {
        // Arrange
        mockSend.mockResolvedValue([{
          statusCode: 202,
          headers: { 'x-message-id': 'unlocked-id' },
          body: 'Accepted'
        }]);

        // Act
        const result = await emailService.sendAccountUnlockedEmail(
          'user@example.com',
          'Test User',
          'Lockout period expired'
        );

        // Assert
        expect(result.success).toBe(true);
        expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Account Unlocked')
        }));
      });
    });

    describe('Forced Password Reset Email', () => {
      it('should send forced password reset notification', async () => {
        // Arrange
        mockSend.mockResolvedValue([{
          statusCode: 202,
          headers: { 'x-message-id': 'forced-reset-id' },
          body: 'Accepted'
        }]);

        // Act
        const result = await emailService.sendForcedPasswordResetEmail(
          'user@example.com',
          'Test User',
          'Security policy requirement'
        );

        // Assert
        expect(result.success).toBe(true);
        expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Password Reset Required')
        }));
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle SendGrid API errors gracefully', async () => {
      // Arrange
      const emailData = {
        to: 'user@example.com',
        userName: 'Test User'
      };

      mockSend.mockRejectedValue({
        response: {
          body: {
            errors: [{ message: 'Invalid email address' }]
          }
        }
      });

      // Act
      const result = await emailService.sendWelcomeEmail(emailData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      // Arrange
      const emailData = {
        to: 'user@example.com',
        userName: 'Test User'
      };

      mockSend.mockRejectedValue(new Error('Network timeout'));

      // Act
      const result = await emailService.sendWelcomeEmail(emailData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });

    it('should handle unknown errors', async () => {
      // Arrange
      const emailData = {
        to: 'user@example.com',
        userName: 'Test User'
      };

      mockSend.mockRejectedValue('Unknown error');

      // Act
      const result = await emailService.sendWelcomeEmail(emailData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown email error');
    });
  });

  describe('Configuration', () => {
    it('should use environment variables for configuration', () => {
      // Arrange
      process.env.SENDGRID_API_KEY = 'custom-key';
      process.env.FROM_EMAIL = 'custom@example.com';
      process.env.FROM_NAME = 'Custom Service';
      
      // Act
      const customService = new EmailService();
      
      // Assert
      expect(customService.isReady()).toBe(true);
    });

    it('should handle missing reply-to email gracefully', async () => {
      // Arrange
      delete process.env.REPLY_TO_EMAIL;
      const serviceWithoutReplyTo = new EmailService();
      
      const emailData = {
        to: 'user@example.com',
        userName: 'Test User'
      };

      mockSend.mockResolvedValue([{
        statusCode: 202,
        headers: { 'x-message-id': 'test-id' },
        body: 'Accepted'
      }]);

      // Act
      const result = await serviceWithoutReplyTo.sendWelcomeEmail(emailData);

      // Assert
      expect(result.success).toBe(true);
      const sentEmail = mockSend.mock.calls[0][0];
      expect(sentEmail.replyTo).toBeUndefined();
    });
  });
}); 