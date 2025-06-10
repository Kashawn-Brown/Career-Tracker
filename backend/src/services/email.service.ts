/**
 * Email Service
 * 
 * Handles email sending operations using SendGrid API.
 * Provides template-based emails for user verification, notifications,
 * and other application email needs.
 */

import sgMail from '@sendgrid/mail';
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
  BulkEmailResult
} from '../models/email.models.js';

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
   * Send email verification email
   */
  async sendEmailVerification(data: EmailVerificationData): Promise<EmailResult> {
    const html = this.generateEmailVerificationTemplate(data);
    
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
    const html = this.generateWelcomeTemplate(data);
    
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
    const html = this.generatePasswordResetTemplate(data);
    
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
    const html = this.generateJobApplicationNotificationTemplate(data);
    
    return await this.sendEmail({
      to: data.to,
      subject: `Job Application Submitted: ${data.position} at ${data.company}`,
      template: EmailTemplate.JOB_APPLICATION_NOTIFICATION,
      templateData: data
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

  /**
   * Generate HTML template for email verification
   */
  private generateEmailVerificationTemplate(data: EmailVerificationData): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Career Tracker</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <h2 style="color: #495057; margin-top: 0;">Welcome, ${data.userName}!</h2>
          
          <p>Thank you for signing up for Career Tracker. To complete your registration and start tracking your job applications, please verify your email address.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.verificationUrl}" 
               style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #6c757d; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${data.verificationUrl}" style="color: #007bff; word-break: break-all;">${data.verificationUrl}</a>
          </p>
          
          <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
            This verification link will expire in 24 hours. If you didn't create an account with Career Tracker, you can safely ignore this email.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate HTML template for welcome email
   */
  private generateWelcomeTemplate(data: WelcomeEmailData): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Career Tracker</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to Career Tracker!</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <h2 style="color: #495057; margin-top: 0;">Hi ${data.userName},</h2>
          
          <p>Your email has been verified successfully! You're now ready to start organizing and tracking your job search journey.</p>
          
          <h3 style="color: #495057;">What's next?</h3>
          <ul style="color: #6c757d;">
            <li>📝 Add your first job application</li>
            <li>🏷️ Organize applications with tags</li>
            <li>📊 Track your application status</li>
            <li>🤝 Manage your professional connections</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
               style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
          
          <p style="color: #6c757d; font-size: 14px;">
            Need help getting started? Check out our <a href="#" style="color: #007bff;">quick start guide</a> or reply to this email if you have any questions.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate HTML template for password reset
   */
  private generatePasswordResetTemplate(data: PasswordResetData): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Career Tracker</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <h2 style="color: #495057; margin-top: 0;">Password Reset Request</h2>
          
          <p>Hi ${data.userName},</p>
          
          <p>We received a request to reset the password for your Career Tracker account. Click the button below to create a new password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resetUrl}" 
               style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #6c757d; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${data.resetUrl}" style="color: #007bff; word-break: break-all;">${data.resetUrl}</a>
          </p>
          
          <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
            This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate HTML template for job application notification
   */
  private generateJobApplicationNotificationTemplate(data: JobApplicationNotificationData): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Job Application Submitted</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📋 Application Submitted!</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <h2 style="color: #495057; margin-top: 0;">Great job, ${data.userName}!</h2>
          
          <p>You've successfully submitted a job application. Here are the details:</p>
          
          <div style="background: white; border: 1px solid #dee2e6; border-radius: 5px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">Application Details</h3>
            <p><strong>Position:</strong> ${data.position}</p>
            <p><strong>Company:</strong> ${data.company}</p>
            <p><strong>Date Applied:</strong> ${data.applicationDate}</p>
          </div>
          
          <p>Your application is now being tracked in your Career Tracker dashboard. We'll help you stay organized throughout your job search journey!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/applications" 
               style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              View All Applications
            </a>
          </div>
          
          <p style="color: #6c757d; font-size: 14px;">
            💡 <strong>Tip:</strong> Set up follow-up reminders and track your application status to stay on top of your job search!
          </p>
        </div>
      </body>
      </html>
    `;
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
          
          <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
            For your security, please ensure you're using a strong, unique password and enable two-factor authentication when it becomes available.
          </p>
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
          
          <p>Great news! Your Career Tracker account has been unlocked and you can now log in normally.</p>
          
          <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Unlock Reason:</strong> ${data.reason}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
               style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Log In to Your Account
            </a>
          </div>
          
          <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
            To keep your account secure, please use a strong password and avoid sharing your login credentials.
          </p>
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
        <div style="background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔒 Password Reset Required</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <h2 style="color: #495057; margin-top: 0;">Hi ${data.userName},</h2>
          
          <p>For security reasons, you are required to reset your password before you can continue using your Career Tracker account.</p>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Reason:</strong> ${data.reason}</p>
          </div>
          
          <p>This is a security measure to protect your account. You will need to create a new password the next time you log in.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
               style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Reset Password Now
            </a>
          </div>
          
          <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
            When creating your new password, please choose a strong password that you haven't used before on other websites.
          </p>
        </div>
      </body>
      </html>
    `;
  }
}

// Export singleton instance
export const emailService = new EmailService(); 