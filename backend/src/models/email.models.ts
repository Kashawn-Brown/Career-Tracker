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
  JOB_APPLICATION_NOTIFICATION = 'job_application_notification',
  SECURITY_QUESTIONS_CHANGED = 'security_questions_changed',
  SECONDARY_EMAIL_ADDED = 'secondary_email_added',
  SECONDARY_EMAIL_CHANGED = 'secondary_email_changed',
  RECOVERY_ATTEMPT = 'recovery_attempt',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SECURITY_ALERT = 'security_alert'
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
 * Security questions changed notification data
 */
export interface SecurityQuestionsChangedData {
  to: string;
  userName: string;
  changeDate: string;
  ipAddress: string;
  userAgent: string;
}

/**
 * Secondary email added/changed notification data
 */
export interface SecondaryEmailNotificationData {
  to: string;
  userName: string;
  secondaryEmail: string;
  changeDate: string;
  ipAddress: string;
  userAgent: string;
}

/**
 * Recovery attempt notification data
 */
export interface RecoveryAttemptData {
  to: string;
  userName: string;
  attemptDate: string;
  recoveryMethod: 'security_questions' | 'secondary_email';
  ipAddress: string;
  userAgent: string;
  successful: boolean;
}

/**
 * Suspicious activity notification data
 */
export interface SuspiciousActivityData {
  to: string;
  userName: string;
  activityType: string;
  activityDate: string;
  ipAddress: string;
  userAgent: string;
  actionTaken: string;
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

// ============================================================================
// EMAIL SERVICE RESULT INTERFACES (Following Auth Pattern)
// ============================================================================

/**
 * Test Email Verification Result interface
 */
export interface TestEmailVerificationResult {
  success: boolean;
  statusCode: number;
  message?: string;
  messageId?: string;
  error?: string;
}

/**
 * Test Welcome Email Result interface
 */
export interface TestWelcomeEmailResult {
  success: boolean;
  statusCode: number;
  message?: string;
  messageId?: string;
  error?: string;
}

/**
 * Queue Test Email Verification Result interface
 */
export interface QueueTestEmailVerificationResult {
  success: boolean;
  statusCode: number;
  message?: string;
  jobQueued?: boolean;
  note?: string;
  error?: string;
}

/**
 * Email Service Status Result interface
 */
export interface EmailServiceStatusResult {
  statusCode: number;
  configured: boolean;
  message: string;
  config: {
    fromEmail: string;
    fromName: string;
    hasApiKey: boolean;
  };
}

/**
 * Queue Service Stats Result interface
 */
export interface QueueServiceStatsResult {
  statusCode: number;
  queueReady: boolean;
  stats: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  } | null;
}

/**
 * Get Verification Token Result interface
 */
export interface GetVerificationTokenResult {
  success: boolean;
  statusCode: number;
  email?: string;
  token?: string;
  message?: string;
  error?: string;
}

/**
 * Job Application Notification Email Result interface
 */
export interface JobApplicationNotificationEmailResult {
  success: boolean;
  statusCode: number;
  message?: string;
  messageId?: string;
  error?: string;
}

/**
 * Security Notification Email Result interface
 */
export interface SecurityNotificationEmailResult {
  success: boolean;
  statusCode: number;
  message?: string;
  messageId?: string;
  error?: string;
} 