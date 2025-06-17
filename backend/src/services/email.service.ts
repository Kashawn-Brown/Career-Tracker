/**
 * Email Service
 * 
 * Handles email sending operations using SendGrid API.
 * Provides business logic for email operations with proper error handling
 * and standardized result types following the auth service pattern.
 */

import sgMail from '@sendgrid/mail';
import { PrismaClient } from '@prisma/client';
import {
  EmailTemplate,
  EmailData,
  EmailVerificationData,
  WelcomeEmailData,
  PasswordResetData,
  JobApplicationNotificationData,
  SecurityQuestionsChangedData,
  SecondaryEmailNotificationData,
  RecoveryAttemptData,
  SuspiciousActivityData,
  EmailConfig,
  EmailResult,
  BulkEmailResult,
  TestEmailVerificationResult,
  TestWelcomeEmailResult,
  QueueTestEmailVerificationResult,
  EmailServiceStatusResult,
  QueueServiceStatsResult,
  GetVerificationTokenResult,
  JobApplicationNotificationEmailResult,
  SecurityNotificationEmailResult
} from '../models/email.models.js';
import {
  generateEmailVerificationTemplate,
  generateWelcomeTemplate,
  generatePasswordResetTemplate,
  generateJobApplicationNotificationTemplate,
  generatePasswordChangedTemplate
} from '../utils/emailTemplates.js';
import { queueService } from './queue.service.js';

export class EmailService {
  private config: EmailConfig;
  private isConfigured: boolean = false;

  constructor() {
    this.config = {
      apiKey: process.env.SENDGRID_API_KEY || '',
      fromEmail: process.env.FROM_EMAIL || 'noreply@career-tracker.com',
      fromName: process.env.FROM_NAME || 'Career Tracker',
      replyToEmail: process.env.REPLY_TO_EMAIL
    };

    this.initialize();
  }

  /**
   * Initialize SendGrid with API key
   */
  private initialize(): void {
    if (!this.config.apiKey) {
      console.warn('SENDGRID_API_KEY not configured. Email service will not be functional.');
      return;
    }

    try {
      sgMail.setApiKey(this.config.apiKey);
      this.isConfigured = true;
    } catch (error) {
      console.error('Failed to initialize SendGrid:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Check if email service is properly configured
   */
  isReady(): boolean {
    return this.isConfigured && !!this.config.apiKey;
  }

  /**
   * Validate email format using basic regex
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // ============================================================================
  // BUSINESS LOGIC METHODS (Following Auth Service Pattern)
  // ============================================================================

  /**
   * Send test email verification with business logic and error handling
   */
  async sendTestEmailVerification(to: string, name: string): Promise<TestEmailVerificationResult> {
    try {
      // Check if email service is configured
      if (!this.isReady()) {
        return {
          success: false,
          statusCode: 400,
          error: 'Email service is not configured. Please check SENDGRID_API_KEY environment variable.'
        };
      }

      // Send email verification
      const result = await this.sendEmailVerification({
        to,
        userName: name,
        verificationToken: 'test-token-123',
        verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=test-token-123`
      });

      if (result.success) {
        return {
          success: true,
          statusCode: 200,
          message: `Test verification email sent to ${to}`,
          messageId: result.messageId
        };
      } else {
        return {
          success: false,
          statusCode: 400,
          error: result.error || 'Failed to send email'
        };
      }
    } catch (error) {
      console.error('Test email verification error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Send test welcome email with business logic and error handling
   */
  async sendTestWelcomeEmail(to: string, name: string): Promise<TestWelcomeEmailResult> {
    try {
      // Check if email service is configured
      if (!this.isReady()) {
        return {
          success: false,
          statusCode: 400,
          error: 'Email service is not configured. Please check SENDGRID_API_KEY environment variable.'
        };
      }

      // Send welcome email
      const result = await this.sendWelcomeEmail({
        to,
        userName: name
      });

      if (result.success) {
        return {
          success: true,
          statusCode: 200,
          message: `Test welcome email sent to ${to}`,
          messageId: result.messageId
        };
      } else {
        return {
          success: false,
          statusCode: 400,
          error: result.error || 'Failed to send email'
        };
      }
    } catch (error) {
      console.error('Test welcome email error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Queue test email verification with business logic and error handling
   */
  async queueTestEmailVerification(to: string, name: string): Promise<QueueTestEmailVerificationResult> {
    try {
      // Check if queue service is configured
      if (!queueService.isReady()) {
        return {
          success: false,
          statusCode: 400,
          error: 'Queue service is not configured. Please check REDIS_URL environment variable.'
        };
      }

      // Add job to queue
      await queueService.addEmailVerificationJob({
        to,
        userName: name,
        verificationToken: 'test-token-queue-123',
        verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=test-token-queue-123`
      });

      return {
        success: true,
        statusCode: 200,
        message: `Email verification queued for ${to}. Check your inbox in 5-10 minutes.`,
        jobQueued: true,
        note: "If you don't receive the email, please check your spam folder or try again."
      };
    } catch (error) {
      console.error('Queue test email error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to queue email job'
      };
    }
  }

  /**
   * Get email service status and configuration
   */
  async getEmailServiceStatus(): Promise<EmailServiceStatusResult> {
    const isReady = this.isReady();
    
    return {
      statusCode: 200,
      configured: isReady,
      message: isReady ? 'Email service is ready' : 'Email service needs configuration',
      config: {
        fromEmail: process.env.FROM_EMAIL || 'noreply@career-tracker.com',
        fromName: process.env.FROM_NAME || 'Career Tracker',
        hasApiKey: !!process.env.SENDGRID_API_KEY
      }
    };
  }

  /**
   * Get queue service statistics
   */
  async getQueueServiceStats(): Promise<QueueServiceStatsResult> {
    const isReady = queueService.isReady();
    const stats = await queueService.getQueueStats();
    
    return {
      statusCode: 200,
      queueReady: isReady,
      stats
    };
  }

  /**
   * Get verification token for testing (DEVELOPMENT ONLY!)
   */
  async getVerificationToken(email: string): Promise<GetVerificationTokenResult> {
    try {
      const prisma = new PrismaClient();
      
      const verificationToken = await prisma.emailVerificationToken.findFirst({
        where: {
          user: { email }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      await prisma.$disconnect();
      
      if (!verificationToken) {
        return {
          success: false,
          statusCode: 404,
          error: 'No verification token found for this email'
        };
      }
      
      return {
        success: true,
        statusCode: 200,
        email,
        token: verificationToken.token,
        message: 'Use this token to test email verification'
      };
    } catch (error) {
      console.error('Error getting verification token:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Send job application notification email
   */
  async sendJobApplicationNotificationEmail(data: JobApplicationNotificationData): Promise<JobApplicationNotificationEmailResult> {
    try {
      // Check if email service is configured
      if (!this.isReady()) {
        return {
          success: false,
          statusCode: 400,
          error: 'Email service is not configured. Please check SENDGRID_API_KEY environment variable.'
        };
      }

      // Send job application notification
      const result = await this.sendJobApplicationNotification(data);

      if (result.success) {
        return {
          success: true,
          statusCode: 200,
          message: `Job application notification sent to ${data.to}`,
          messageId: result.messageId
        };
      } else {
        return {
          success: false,
          statusCode: 400,
          error: result.error || 'Failed to send email'
        };
      }
    } catch (error) {
      console.error('Job application notification error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Send security notification emails
   */
  async sendSecurityNotificationEmail(type: string, to: string, userName: string, additionalData: any): Promise<SecurityNotificationEmailResult> {
    try {
      // Check if email service is configured
      if (!this.isReady()) {
        return {
          success: false,
          statusCode: 400,
          error: 'Email service is not configured. Please check SENDGRID_API_KEY environment variable.'
        };
      }

      let result: EmailResult;
      
      // Handle different types of security notifications
      switch (type) {
        case 'password_changed':
          result = await this.sendPasswordChangedEmail(to, userName, additionalData.ipAddress, additionalData.userAgent);
          break;
        case 'account_locked':
          result = await this.sendAccountLockedEmail(to, userName, additionalData.unlockTime, additionalData.reason);
          break;
        case 'account_unlocked':
          result = await this.sendAccountUnlockedEmail(to, userName, additionalData.reason);
          break;
        case 'forced_password_reset':
          result = await this.sendForcedPasswordResetEmail(to, userName, additionalData.reason);
          break;
        default:
          return {
            success: false,
            statusCode: 400,
            error: `Unknown security notification type: ${type}`
          };
      }

      if (result.success) {
        return {
          success: true,
          statusCode: 200,
          message: `${type} notification sent to ${to}`,
          messageId: result.messageId
        };
      } else {
        return {
          success: false,
          statusCode: 400,
          error: result.error || 'Failed to send email'
        };
      }
    } catch (error) {
      console.error('Security notification error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error'
      };
    }
  }

  // ============================================================================
  // CORE EMAIL SENDING METHODS (Existing functionality preserved)
  // ============================================================================

  /**
   * Send email verification email
   */
  async sendEmailVerification(data: EmailVerificationData): Promise<EmailResult> {
    const html = generateEmailVerificationTemplate(data);
    
    return await this.sendEmail({
      to: data.to,
      subject: 'Please verify your email address',
      template: EmailTemplate.EMAIL_VERIFICATION,
      templateData: data
    }, html);
  }

  /**
   * Send welcome email after successful verification
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<EmailResult> {
    const html = generateWelcomeTemplate(data);
    
    return await this.sendEmail({
      to: data.to,
      subject: 'Welcome to Career Tracker!',
      template: EmailTemplate.WELCOME,
      templateData: data
    }, html);
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(data: PasswordResetData): Promise<EmailResult> {
    const html = generatePasswordResetTemplate(data);
    
    return await this.sendEmail({
      to: data.to,
      subject: 'Reset your password',
      template: EmailTemplate.PASSWORD_RESET,
      templateData: data
    }, html);
  }

  /**
   * Send job application notification
   */
  async sendJobApplicationNotification(data: JobApplicationNotificationData): Promise<EmailResult> {
    const html = generateJobApplicationNotificationTemplate(data);
    
    return await this.sendEmail({
      to: data.to,
      subject: `Job Application Submitted: ${data.position} at ${data.company}`,
      template: EmailTemplate.JOB_APPLICATION_NOTIFICATION,
      templateData: data
    }, html);
  }

  /**
   * Send password changed notification email
   */
  async sendPasswordChangedEmail(email: string, userName: string, ipAddress?: string, userAgent?: string): Promise<EmailResult> {
    const html = generatePasswordChangedTemplate({ email, userName, ipAddress, userAgent });
    
    return await this.sendEmail({
      to: email,
      subject: '🔒 Password Changed - Career Tracker',
      template: EmailTemplate.SECURITY_ALERT,
      templateData: { email, userName, ipAddress, userAgent }
    }, html);
  }

  /**
   * Send account locked notification email
   */
  async sendAccountLockedEmail(email: string, userName: string, unlockTime: Date, reason: string): Promise<EmailResult> {
    const html = this.generateAccountLockedTemplate({ email, userName, unlockTime, reason });
    
    return await this.sendEmail({
      to: email,
      subject: '⚠️ Account Locked - Career Tracker',
      template: EmailTemplate.SECURITY_ALERT,
      templateData: { email, userName, unlockTime, reason }
    }, html);
  }

  /**
   * Send account unlocked notification email
   */
  async sendAccountUnlockedEmail(email: string, userName: string, reason: string): Promise<EmailResult> {
    const html = this.generateAccountUnlockedTemplate({ email, userName, reason });
    
    return await this.sendEmail({
      to: email,
      subject: '✅ Account Unlocked - Career Tracker',
      template: EmailTemplate.SECURITY_ALERT,
      templateData: { email, userName, reason }
    }, html);
  }

  /**
   * Send forced password reset notification email
   */
  async sendForcedPasswordResetEmail(email: string, userName: string, reason: string): Promise<EmailResult> {
    const html = this.generateForcedPasswordResetTemplate({ email, userName, reason });
    
    return await this.sendEmail({
      to: email,
      subject: '🔒 Password Reset Required - Career Tracker',
      template: EmailTemplate.SECURITY_ALERT,
      templateData: { email, userName, reason }
    }, html);
  }

  /**
   * Core email sending method
   */
  private async sendEmail(emailData: EmailData, htmlContent: string): Promise<EmailResult> {
    if (!this.isReady()) {
      return {
        success: false,
        error: 'Email service is not configured'
      };
    }

    try {
      const msg = {
        to: emailData.to,
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName
        },
        replyTo: this.config.replyToEmail,
        subject: emailData.subject,
        html: htmlContent,
        // Add tracking and delivery settings
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true }
        }
      };

      const response = await sgMail.send(msg);
      
      // Log the full response for debugging
      console.log('SendGrid Response:', {
        statusCode: response[0].statusCode,
        headers: response[0].headers,
        body: response[0].body
      });
      
      return {
        success: true,
        messageId: response[0].headers['x-message-id'] as string
      };
    } catch (error) {
      console.error('Email sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error'
      };
    }
  }

  // ============================================================================
  // PRIVATE TEMPLATE METHODS (Remaining templates not moved to utils)
  // ============================================================================

  /**
   * Generate HTML template for account locked notification
   */
  private generateAccountLockedTemplate(data: { email: string; userName: string; unlockTime: Date; reason: string }): string {
    const unlockTimeString = data.unlockTime.toLocaleString();
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Locked</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Account Locked</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <h2 style="color: #495057; margin-top: 0;">Hi ${data.userName},</h2>
          
          <p>Your Career Tracker account has been temporarily locked for security reasons.</p>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Reason:</strong> ${data.reason}</p>
            <p style="margin: 10px 0 0 0;"><strong>Unlock Time:</strong> ${unlockTimeString}</p>
          </div>
          
          <p>Your account will be automatically unlocked at the time shown above. If you believe this was done in error, please contact our support team.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate HTML template for account unlocked notification
   */
  private generateAccountUnlockedTemplate(data: { email: string; userName: string; reason: string }): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Unlocked</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✅ Account Unlocked</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <h2 style="color: #495057; margin-top: 0;">Hi ${data.userName},</h2>
          
          <p>Good news! Your Career Tracker account has been unlocked and you can now access your account again.</p>
          
          <div style="background: #d1edff; border: 1px solid #bee5eb; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Unlock Reason:</strong> ${data.reason}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
               style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Sign In to Your Account
            </a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate HTML template for forced password reset notification
   */
  private generateForcedPasswordResetTemplate(data: { email: string; userName: string; reason: string }): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Required</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔒 Password Reset Required</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <h2 style="color: #495057; margin-top: 0;">Hi ${data.userName},</h2>
          
          <p>For security reasons, you are required to reset your password before you can continue using your Career Tracker account.</p>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Reason:</strong> ${data.reason}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/forgot-password" 
               style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Reset Password Now
            </a>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const emailService = new EmailService(); 