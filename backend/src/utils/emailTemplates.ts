/**
 * Email Templates Utility
 * 
 * Contains reusable email template functions for various notifications.
 * These templates generate rich HTML content for different email types.
 */

import {
  EmailVerificationData,
  WelcomeEmailData,
  PasswordResetData,
  JobApplicationNotificationData
} from '../models/email.models.js';

/**
 * Generate HTML template for email verification
 */
export function generateEmailVerificationTemplate(data: EmailVerificationData): string {
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
        
        <p style="color: #6c757d; font-size: 14px;">
          This verification link will expire in 24 hours for security purposes.
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML template for welcome email
 */
export function generateWelcomeTemplate(data: WelcomeEmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Career Tracker!</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to Career Tracker!</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
        <h2 style="color: #495057; margin-top: 0;">Hi ${data.userName}!</h2>
        
        <p>Congratulations! Your email has been verified and your Career Tracker account is now active.</p>
        
        <p>Career Tracker helps you organize and manage your job search more effectively. Here's what you can do:</p>
        
        <ul style="color: #495057; line-height: 1.8;">
          <li>📋 Track job applications and their status</li>
          <li>🏢 Manage company information and contacts</li>
          <li>📄 Store important documents and notes</li>
          <li>📊 Get insights into your job search progress</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
             style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Get Started
          </a>
        </div>
        
        <p style="color: #6c757d; font-size: 14px;">
          Need help getting started? Check out our <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/help" style="color: #007bff;">Help Center</a> or reply to this email with any questions.
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML template for password reset
 */
export function generatePasswordResetTemplate(data: PasswordResetData): string {
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
        
        <p>You requested a password reset for your Career Tracker account. Click the button below to set a new password:</p>
        
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
        
        <p style="color: #6c757d; font-size: 14px;">
          This password reset link will expire in 1 hour for security purposes.
        </p>
        
        <p style="color: #6c757d; font-size: 14px;">
          If you didn't request this password reset, please ignore this email or contact support if you have concerns.
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML template for job application notification
 */
export function generateJobApplicationNotificationTemplate(data: JobApplicationNotificationData): string {
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
 * Generate HTML template for password changed notification
 */
export function generatePasswordChangedTemplate(data: { 
  email: string; 
  userName: string; 
  ipAddress?: string; 
  userAgent?: string; 
}): string {
  const locationInfo = data.ipAddress ? `IP Address: ${data.ipAddress}` : 'Unknown location';
  const deviceInfo = data.userAgent ? `Device: ${data.userAgent}` : 'Unknown device';
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Changed</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🔒 Password Changed</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
        <h2 style="color: #495057; margin-top: 0;">Hi ${data.userName},</h2>
        
        <p>Your Career Tracker account password has been successfully changed.</p>
        
        <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 5px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Changed on:</strong> ${new Date().toLocaleString()}</p>
          <p style="margin: 10px 0 0 0;"><strong>Location:</strong> ${locationInfo}</p>
          <p style="margin: 10px 0 0 0;"><strong>Device:</strong> ${deviceInfo}</p>
        </div>
        
        <p>If you did not make this change, please contact our support team immediately and consider the following steps:</p>
        
        <ul style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
          <li>Reset your password immediately</li>
          <li>Check your account for any unauthorized activity</li>
          <li>Enable two-factor authentication when available</li>
          <li>Review your recent login activity</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
             style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Log In to Your Account
          </a>
        </div>
        
        <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
          If you made this change, you can safely ignore this email. This notification helps keep your account secure.
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate rich HTML email content for password change notification
 */
export function generatePasswordChangeEmailContent(data: {
  userName: string;
  timestamp: string;
  ipAddress: string;
  browser: string;
  operatingSystem: string;
  location: string;
  supportEmail: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed Successfully</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">🔒 Password Changed Successfully</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your Career Tracker account is secure</p>
    </div>
    
    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi <strong>${data.userName}</strong>,</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">Your password has been successfully changed for your Career Tracker account. This email confirms the security change and provides details about when and where it occurred.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="color: #28a745; margin-top: 0; font-size: 18px;">Change Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 30%;">Date & Time:</td>
                    <td style="padding: 8px 0;">${data.timestamp}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">IP Address:</td>
                    <td style="padding: 8px 0; font-family: monospace;">${data.ipAddress}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Browser:</td>
                    <td style="padding: 8px 0;">${data.browser}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Operating System:</td>
                    <td style="padding: 8px 0;">${data.operatingSystem}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Location:</td>
                    <td style="padding: 8px 0;">${data.location}</td>
                </tr>
            </table>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="color: #856404; margin-top: 0; font-size: 16px;">🚨 Didn't change your password?</h4>
            <p style="color: #856404; margin-bottom: 0; font-size: 14px;">If you didn't make this change, your account may have been compromised. Please contact our support team immediately at <a href="mailto:${data.supportEmail}" style="color: #856404; text-decoration: underline;">${data.supportEmail}</a></p>
        </div>
        
        <div style="margin: 25px 0;">
            <h4 style="font-size: 16px; color: #495057;">Security Tips:</h4>
            <ul style="color: #6c757d; font-size: 14px; line-height: 1.5;">
                <li>Use a unique, strong password for your Career Tracker account</li>
                <li>Enable two-factor authentication if available</li>
                <li>Never share your password with anyone</li>
                <li>Log out from shared or public computers</li>
                <li>Monitor your account for suspicious activity</li>
            </ul>
        </div>
        
        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #6c757d; text-align: center; margin-bottom: 10px;">
            This is an automated security notification from Career Tracker.<br>
            If you have questions, please contact us at <a href="mailto:${data.supportEmail}" style="color: #007bff;">${data.supportEmail}</a>
        </p>
        
        <p style="font-size: 12px; color: #adb5bd; text-align: center; margin: 0;">
            © 2024 Career Tracker. All rights reserved.
        </p>
    </div>
</body>
</html>`;
} 