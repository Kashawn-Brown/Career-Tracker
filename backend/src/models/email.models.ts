/**
 * Email Models
 * 
 * Type definitions for email service operations including templates,
 * sending configurations, and email verification workflows.
 */

/**
 * Email template types supported by the email service
 */
export enum EmailTemplate {
  EMAIL_VERIFICATION = 'email_verification',
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  JOB_APPLICATION_NOTIFICATION = 'job_application_notification'
}

/**
 * Base email interface for all email operations
 */
export interface EmailData {
  to: string;
  subject: string;
  template: EmailTemplate;
  templateData: Record<string, any>;
}

/**
 * Email verification specific data
 */
export interface EmailVerificationData {
  to: string;
  userName: string;
  verificationToken: string;
  verificationUrl: string;
}

/**
 * Welcome email data
 */
export interface WelcomeEmailData {
  to: string;
  userName: string;
}

/**
 * Password reset email data
 */
export interface PasswordResetData {
  to: string;
  userName: string;
  resetToken: string;
  resetUrl: string;
}

/**
 * Job application notification email data
 */
export interface JobApplicationNotificationData {
  to: string;
  userName: string;
  company: string;
  position: string;
  applicationDate: string;
}

/**
 * Email service configuration
 */
export interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
}

/**
 * Email sending result
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Bulk email sending result
 */
export interface BulkEmailResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors: string[];
} 