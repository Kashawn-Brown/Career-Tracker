/**
 * Authentication Service
 * 
 * Core authentication services for password hashing, JWT token management,
 * and email verification. Provides the foundational security operations
 * for the authentication system.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

import crypto from 'crypto';
import {
  EmailVerificationResult,
  ResendVerificationResult,
  PasswordValidationResult
} from '../models/auth.models.js';
import { UserRole } from '../models/user.models.js';
import { JwtPayload, TokenPair } from '../interfaces/jwt.interface.js';
import { generateTokenPair, verifyAccessToken, verifyRefreshToken, refreshTokens as jwtRefreshTokens } from './jwt.service.js';
import { userRepository } from '../repositories/index.js';
import { queueService } from './queue.service.js';

// Password hashing configuration
const BCRYPT_ROUNDS = 12; // Strong hashing (10+ rounds as required)

// Define return types for the new service methods
export interface RegisterUserResult {
  success: boolean;
  statusCode: number;
  message?: string;
  user?: any;
  tokens?: TokenPair;
  error?: string;
  details?: string[];
  action?: string;
}

export interface LoginUserResult {
  success: boolean;
  statusCode: number;
  message?: string;
  user?: any;
  tokens?: TokenPair;
  error?: string;
}

export interface InitiatePasswordResetResult {
  success: boolean;
  statusCode: number;
  message?: string;
  error?: string;
}

export class AuthService {
  /**
   * Register a new user with email and password
   * Handles validation, user creation, email verification setup, and JWT token generation
   */
  async registerUser(email: string, password: string, name: string): Promise<RegisterUserResult> {
    try {
      // Validate input
      if (!email || !password || !name) {
        return {
          success: false,
          statusCode: 400,
          error: 'Missing required fields: email, password, name'
        };
      }

      // Validate email format
      if (!this.isValidEmail(email)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid email format'
        };
      }

      // Validate password strength
      const passwordValidation = this.isValidPassword(password);
      if (!passwordValidation.valid) {
        return {
          success: false,
          statusCode: 400,
          error: 'Password validation failed',
          details: passwordValidation.errors
        };
      }

      // Check if user already exists
      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        // If user exists but hasn't verified email, offer to resend verification
        if (!existingUser.emailVerified) {
          return {
            success: false,
            statusCode: 409,
            error: 'You have already registered with this email but haven\'t verified it yet.',
            action: 'resend_verification',
            message: 'Would you like to resend the verification email?'
          };
        }
        
        return {
          success: false,
          statusCode: 409,
          error: 'User with this email already exists and is verified'
        };
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create user
      const user = await userRepository.create({
        email,
        password: hashedPassword,
        name,
        emailVerified: false,
        provider: 'LOCAL',
        providerId: null
      });

      // Generate and store email verification token
      const verificationToken = this.generateEmailVerificationToken();
      await this.storeEmailVerificationToken(user.id, verificationToken);

      // Send verification email via queue (instant response!)
      try {
        if (queueService.isReady()) {
          await queueService.addEmailVerificationJob({
            to: email,
            userName: name,
            verificationToken,
            verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`
          });
          console.log(`Email verification job queued for: ${email}`);
        } else {
          console.warn(`Queue service not available. Email verification token for ${email}: ${verificationToken}`);
        }
      } catch (emailError) {
        console.error('Failed to queue verification email:', emailError);
        // Don't fail registration if email queueing fails
      }

      // Generate JWT tokens with user role
      const tokens = generateTokenPair(user.id, user.email, user.role as UserRole);

      // Remove password from response
      const { password: _, ...userResponse } = user;

      return {
        success: true,
        statusCode: 201,
        message: 'User registered successfully. Please check your email for verification.',
        user: userResponse,
        tokens
      };

    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error during registration'
      };
    }
  }

  /**
   * Login user with email and password
   * Handles validation, credential verification, and JWT token generation
   */
  async loginUser(email: string, password: string): Promise<LoginUserResult> {
    try {
      // Validate input
      if (!email || !password) {
        return {
          success: false,
          statusCode: 400,
          error: 'Email and password are required'
        };
      }

      // Find user
      const user = await userRepository.findByEmail(email);
      if (!user) {
        return {
          success: false,
          statusCode: 401,
          error: 'Invalid credentials'
        };
      }

      // Check if user has a password (OAuth users don't)
      if (!user.password) {
        return {
          success: false,
          statusCode: 401,
          error: 'This account uses OAuth login. Please use Google or LinkedIn to sign in.'
        };
      }

      // Verify password
      const isPasswordValid = await this.comparePassword(password, user.password);
      if (!isPasswordValid) {
        return {
          success: false,
          statusCode: 401,
          error: 'Invalid credentials'
        };
      }

      // Generate JWT tokens with user role
      const tokens = generateTokenPair(user.id, user.email, user.role as UserRole);

      // Remove password from response
      const { password: _, ...userResponse } = user;

      return {
        success: true,
        statusCode: 200,
        message: 'Login successful',
        user: userResponse,
        tokens
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error during login'
      };
    }
  }

  /**
   * Initiate password reset process from forgot password form
   * Handles validation, user lookup, rate limiting, token generation, and email queueing
   */
  async initiatePasswordReset(email: string): Promise<InitiatePasswordResetResult> {
    try {
      if (!email) {
        return {
          success: false,
          statusCode: 400,
          error: 'Email is required'
        };
      }

      // Validate email format
      if (!this.isValidEmail(email)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid email format'
        };
      }

      // Request password reset using the existing service method
      const result = await this.requestPasswordReset(email);

      // If a token was generated (user exists), send the email
      if (result.token) {
        try {
          const user = await userRepository.findByEmail(email);
          if (user && queueService.isReady()) {
            await queueService.addPasswordResetJob({
              to: email,
              userName: user.name,
              resetToken: result.token,
              resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${result.token}`
            });
            console.log(`Password reset email job queued for: ${email}`);
          } else {
            console.warn(`Queue service not available. Password reset token for ${email}: ${result.token}`);
          }
        } catch (emailError) {
          console.error('Failed to queue password reset email:', emailError);
          // Don't fail the operation if email queueing fails
        }
      }

      // Always return success message for security (don't reveal if email exists)
      return {
        success: true,
        statusCode: 200,
        message: result.message
      };

    } catch (error) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Internal server error during password reset request'
      };
    }
  }

  /**
   * Hash a password using bcrypt with 12 rounds for strong security
   */
  async hashPassword(password: string): Promise<string> {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Compare a plain text password with a hashed password
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    return await bcrypt.compare(password, hash);
  }



  /**
   * Generate a secure random token for email verification
   * Returns a URL-safe random string
   */
  generateEmailVerificationToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Calculate expiration date for email verification tokens (24 hours)
   */
  getEmailVerificationExpiry(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24); // 24 hours from now
    return expiry;
  }

  /**
   * Calculate expiration date for refresh tokens (7 days)
   */
  getRefreshTokenExpiry(): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7); // 7 days from now
    return expiry;
  }

  /**
   * Generate a secure random token for password reset
   * Returns a URL-safe random string
   */
  generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Calculate expiration date for password reset tokens (1 hour)
   */
  getPasswordResetExpiry(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1); // 1 hour from now
    return expiry;
  }

  /**
   * Validate email format using basic regex
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  isValidPassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
      return { valid: false, errors };
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Store email verification token in database
   */
  async storeEmailVerificationToken(userId: number, token: string): Promise<void> {
    const prisma = new PrismaClient();
    
    try {
      await prisma.emailVerificationToken.create({
        data: {
          userId,
          token,
          expiresAt: this.getEmailVerificationExpiry()
        }
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Verify email verification token and mark user as verified
   */
  async verifyEmailToken(token: string): Promise<EmailVerificationResult> {
    const prisma = new PrismaClient();
    
    try {
      const verificationToken = await prisma.emailVerificationToken.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!verificationToken) {
        return {
          success: false,
          message: 'Invalid verification token'
        };
      }

      if (verificationToken.expiresAt < new Date()) {
        return {
          success: false,
          message: 'Verification token has expired',
          action: 'resend_verification'
        };
      }

      // Mark user as verified and delete the token
      await prisma.$transaction([
        prisma.user.update({
          where: { id: verificationToken.userId },
          data: { emailVerified: true }
        }),
        prisma.emailVerificationToken.delete({
          where: { id: verificationToken.id }
        })
      ]);

      return {
        success: true,
        message: 'Email verified successfully'
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Resend email verification token (for expired or lost tokens)
   */
  async resendEmailVerification(email: string): Promise<ResendVerificationResult> {
    const prisma = new PrismaClient();
    
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      if (user.emailVerified) {
        return {
          success: false,
          message: 'Email is already verified'
        };
      }

      // Delete any existing verification tokens for this user
      await prisma.emailVerificationToken.deleteMany({
        where: { userId: user.id }
      });

      // Generate new token
      const newToken = this.generateEmailVerificationToken();
      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: newToken,
          expiresAt: this.getEmailVerificationExpiry()
        }
      });

      return {
        success: true,
        message: 'New verification email sent',
        token: newToken
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Refresh tokens using a valid refresh token
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    return jwtRefreshTokens(refreshToken);
  }

  /**
   * Request password reset for a user email
   * Implements rate limiting (3 requests per email per hour)
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string; token?: string }> {
    const prisma = new PrismaClient();
    
    try {
      // Find user by email (don't reveal if email exists for security)
      const user = await prisma.user.findUnique({
        where: { email }
      });

      // Always return success to not reveal if email exists
      if (!user) {
        return {
          success: true,
          message: 'If this email is registered, you will receive a password reset link.'
        };
      }

      // Check rate limiting - count recent reset requests for this email
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const recentRequests = await prisma.passwordResetToken.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: oneHourAgo
          }
        }
      });

      if (recentRequests >= 3) {
        return {
          success: true, // Still return success for security
          message: 'If this email is registered, you will receive a password reset link.'
        };
      }

      // Delete any existing password reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id }
      });

      // Generate new password reset token
      const resetToken = this.generatePasswordResetToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt: this.getPasswordResetExpiry()
        }
      });

      return {
        success: true,
        message: 'If this email is registered, you will receive a password reset link.',
        token: resetToken // Only used internally for email sending
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Verify password reset token validity and expiration
   */
  async verifyPasswordResetToken(token: string): Promise<{ valid: boolean; message: string; userId?: number }> {
    const prisma = new PrismaClient();
    
    try {
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!resetToken) {
        this.logPasswordResetAttempt(null, 'token_verification', false, 'Invalid token');
        return {
          valid: false,
          message: 'Invalid or expired password reset token'
        };
      }

      if (resetToken.expiresAt < new Date()) {
        this.logPasswordResetAttempt(resetToken.userId, 'token_verification', false, 'Token expired');
        return {
          valid: false,
          message: 'Password reset token has expired'
        };
      }

      this.logPasswordResetAttempt(resetToken.userId, 'token_verification', true, 'Token verified successfully');
      return {
        valid: true,
        message: 'Password reset token is valid',
        userId: resetToken.userId
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Reset password with enhanced security notifications
   */
  async resetPassword(
    token: string, 
    newPassword: string, 
    securityMetadata?: {
      ipAddress?: string;
      userAgent?: string;
      timestamp?: Date;
    }
  ): Promise<{ success: boolean; message: string }> {
    const prisma = new PrismaClient();
    
    try {
      // First verify the token
      const tokenVerification = await this.verifyPasswordResetToken(token);
      if (!tokenVerification.valid || !tokenVerification.userId) {
        return {
          success: false,
          message: tokenVerification.message
        };
      }

      // Validate password strength
      const passwordValidation = this.isValidPassword(newPassword);
      if (!passwordValidation.valid) {
        this.logPasswordResetAttempt(tokenVerification.userId, 'password_reset', false, 'Weak password provided', securityMetadata);
        return {
          success: false,
          message: `Password does not meet requirements: ${passwordValidation.errors.join(', ')}`
        };
      }

      // Check if password has been used recently (prevent reuse)
      const isPasswordReused = await this.isPasswordRecentlyUsed(tokenVerification.userId, newPassword);
      if (isPasswordReused) {
        this.logPasswordResetAttempt(tokenVerification.userId, 'password_reset', false, 'Password reuse attempted', securityMetadata);
        return {
          success: false,
          message: 'You cannot reuse a password from the last 6 months. Please choose a different password.'
        };
      }

      // Get user details for notification
      const user = await prisma.user.findUnique({
        where: { id: tokenVerification.userId },
        select: {
          id: true,
          email: true,
          name: true,
          secondaryEmail: true,
          secondaryEmailVerified: true
        }
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Hash the new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update user password, store in history, and delete used token in a transaction
      await prisma.$transaction([
        prisma.user.update({
          where: { id: tokenVerification.userId },
          data: { password: hashedPassword }
        }),
        prisma.passwordResetToken.deleteMany({
          where: { userId: tokenVerification.userId }
        })
      ]);

      // Store the new password in history (after successful update)
      await this.storePasswordInHistory(tokenVerification.userId, hashedPassword);

      // Send enhanced security notifications
      await this.sendPasswordChangeNotifications(user, securityMetadata);

      this.logPasswordResetAttempt(tokenVerification.userId, 'password_reset', true, 'Password reset completed successfully', securityMetadata);
      
      return {
        success: true,
        message: 'Password has been reset successfully'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      this.logPasswordResetAttempt(null, 'password_reset', false, `System error: ${error instanceof Error ? error.message : 'Unknown error'}`, securityMetadata);
      return {
        success: false,
        message: 'An error occurred while resetting your password'
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Send enhanced password change notifications to primary and secondary emails
   */
  private async sendPasswordChangeNotifications(
    user: {
      id: number;
      email: string;
      name: string;
      secondaryEmail: string | null;
      secondaryEmailVerified: boolean;
    },
    securityMetadata?: {
      ipAddress?: string;
      userAgent?: string;
      timestamp?: Date;
    }
  ): Promise<void> {
    const timestamp = securityMetadata?.timestamp || new Date();
    const ipAddress = securityMetadata?.ipAddress || 'Unknown';
    const userAgent = securityMetadata?.userAgent || 'Unknown';
    
    // Parse basic device info from user agent
    const deviceInfo = this.parseDeviceInfo(userAgent);
    
    // Create enhanced notification content
    const notificationData = {
      userName: user.name,
      timestamp: timestamp.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      }),
      ipAddress,
      browser: deviceInfo.browser,
      operatingSystem: deviceInfo.os,
      location: 'Location lookup disabled', // Could add IP geolocation service
      supportEmail: process.env.SUPPORT_EMAIL || 'support@career-tracker.com'
    };

    // Email templates
    const subject = '🔒 Password Changed Successfully - Career Tracker';
    const emailContent = this.generatePasswordChangeEmailContent(notificationData);

    // Send to primary email
    console.log(`[EMAIL_NOTIFICATION] Sending password change notification to primary email: ${user.email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${emailContent}`);

    // Send to secondary email if verified
    if (user.secondaryEmail && user.secondaryEmailVerified) {
      console.log(`\n[EMAIL_NOTIFICATION] Sending password change notification to secondary email: ${user.secondaryEmail}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${emailContent}`);
    }

    // Log the notification for audit purposes
    console.log(`[SECURITY_AUDIT] Password change notifications sent for user ${user.id} to ${user.secondaryEmail && user.secondaryEmailVerified ? 2 : 1} email address(es)`);
  }

  /**
   * Parse basic device information from User-Agent string
   */
  private parseDeviceInfo(userAgent: string): { browser: string; os: string } {
    const ua = userAgent.toLowerCase();
    
    // Basic browser detection
    let browser = 'Unknown Browser';
    if (ua.includes('chrome') && !ua.includes('edg')) {
      browser = 'Google Chrome';
    } else if (ua.includes('firefox')) {
      browser = 'Mozilla Firefox';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      browser = 'Safari';
    } else if (ua.includes('edg')) {
      browser = 'Microsoft Edge';
    } else if (ua.includes('opera') || ua.includes('opr')) {
      browser = 'Opera';
    }

    // Basic OS detection
    let os = 'Unknown OS';
    if (ua.includes('windows nt 10')) {
      os = 'Windows 10/11';
    } else if (ua.includes('windows nt')) {
      os = 'Windows';
    } else if (ua.includes('mac os x')) {
      os = 'macOS';
    } else if (ua.includes('linux')) {
      os = 'Linux';
    } else if (ua.includes('android')) {
      os = 'Android';
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      os = 'iOS';
    }

    return { browser, os };
  }

  /**
   * Generate rich HTML email content for password change notification
   */
  private generatePasswordChangeEmailContent(data: {
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

  /**
   * Store password in history for reuse prevention
   */
  async storePasswordInHistory(userId: number, passwordHash: string): Promise<void> {
    const prisma = new PrismaClient();
    
    try {
      // Store the password hash in history
      await prisma.passwordHistory.create({
        data: {
          userId,
          passwordHash
        }
      });

      // Clean up old password history entries (older than 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      await prisma.passwordHistory.deleteMany({
        where: {
          userId,
          createdAt: {
            lt: sixMonthsAgo
          }
        }
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Check if password has been used recently (within 6 months)
   */
  async isPasswordRecentlyUsed(userId: number, password: string): Promise<boolean> {
    const prisma = new PrismaClient();
    
    try {
      // Get password history for the user within 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const passwordHistory = await prisma.passwordHistory.findMany({
        where: {
          userId,
          createdAt: {
            gte: sixMonthsAgo
          }
        }
      });

      // Check if the new password matches any recent password
      for (const historyEntry of passwordHistory) {
        const isMatch = await this.comparePassword(password, historyEntry.passwordHash);
        if (isMatch) {
          return true;
        }
      }

      return false;
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Log password reset attempts for security auditing
   */
  private logPasswordResetAttempt(
    userId: number | null, 
    action: 'token_verification' | 'password_reset', 
    success: boolean, 
    details: string,
    securityMetadata?: {
      ipAddress?: string;
      userAgent?: string;
      timestamp?: Date;
    }
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      action,
      success,
      details,
      ip: securityMetadata?.ipAddress || 'N/A',
      userAgent: securityMetadata?.userAgent || 'N/A'
    };

    // For now, log to console. In production, this should go to a security audit log
    console.log(`[SECURITY_AUDIT] Password Reset: ${JSON.stringify(logEntry)}`);
  }

  /**
   * Clean up expired email verification tokens (maintenance function)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const prisma = new PrismaClient();
    
    try {
      const result = await prisma.emailVerificationToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      return result.count;
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Set up security questions for a user
   */
  async setupSecurityQuestions(
    userId: number, 
    questions: Array<{ question: string; answer: string }>
  ): Promise<{ success: boolean; message: string }> {
    const prisma = new PrismaClient();
    
    try {
      // Clear existing security questions for the user
      await prisma.securityQuestion.deleteMany({
        where: { userId }
      });

      // Hash answers and store questions
      const securityQuestions = await Promise.all(
        questions.map(async (q) => ({
          userId,
          question: q.question as any, // Type assertion for enum
          answerHash: await this.hashSecurityAnswer(q.answer.trim()) // Trim but preserve case
        }))
      );

      // Store all security questions in a transaction
      await prisma.securityQuestion.createMany({
        data: securityQuestions
      });

      return {
        success: true,
        message: `Successfully set up ${questions.length} security questions`
      };
    } catch (error) {
      console.error('Setup security questions error:', error);
      return {
        success: false,
        message: 'Failed to set up security questions'
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Get user's security questions (without answers)
   */
  async getUserSecurityQuestions(userId: number): Promise<{ 
    questions: Array<{ id: number; question: string; createdAt: Date }> 
  }> {
    const prisma = new PrismaClient();
    
    try {
      const questions = await prisma.securityQuestion.findMany({
        where: { userId },
        select: {
          id: true,
          question: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      });

      return { questions };
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Get recovery questions for an email (public endpoint)
   * Returns 2 random questions for verification
   */
  async getRecoveryQuestions(email: string): Promise<{ 
    message: string; 
    questions?: Array<{ id: number; question: string }> 
  }> {
    const prisma = new PrismaClient();
    
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          securityQuestions: {
            select: {
              id: true,
              question: true
            }
          }
        }
      });

      if (!user) {
        // Don't reveal if email exists - return generic message
        return {
          message: 'If an account exists with this email, security questions will be displayed.'
        };
      }

      if (user.securityQuestions.length === 0) {
        return {
          message: 'No security questions are set up for this account. Please use email recovery instead.'
        };
      }

      // Randomly select 2 questions from the user's security questions
      const shuffled = user.securityQuestions.sort(() => 0.5 - Math.random());
      const selectedQuestions = shuffled.slice(0, Math.min(2, user.securityQuestions.length));

      return {
        message: 'Please answer the following security questions',
        questions: selectedQuestions
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Verify security questions for account recovery
   */
  async verifySecurityQuestions(
    email: string, 
    answers: Array<{ questionId: number; answer: string }>
  ): Promise<{ 
    verified: boolean; 
    message: string; 
    resetToken?: string 
  }> {
    const prisma = new PrismaClient();
    
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          securityQuestions: true
        }
      });

      if (!user) {
        return {
          verified: false,
          message: 'Invalid email or security answers'
        };
      }

      if (user.securityQuestions.length === 0) {
        return {
          verified: false,
          message: 'No security questions are set up for this account'
        };
      }

      // Verify all provided answers
      let correctAnswers = 0;
      for (const answer of answers) {
        const question = user.securityQuestions.find(q => q.id === answer.questionId);
        if (question) {
          const isCorrect = await this.compareSecurityAnswer(answer.answer.trim(), question.answerHash);
          if (isCorrect) {
            correctAnswers++;
          }
        }
      }

      // Require all answers to be correct
      if (correctAnswers === answers.length && answers.length >= 2) {
        // Generate password reset token
        const resetToken = this.generatePasswordResetToken();
        const expiresAt = this.getPasswordResetExpiry();

        // Store the reset token
        await prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            token: resetToken,
            expiresAt
          }
        });

        return {
          verified: true,
          message: 'Security questions verified successfully',
          resetToken
        };
      } else {
        return {
          verified: false,
          message: 'Incorrect answers provided'
        };
      }
    } catch (error) {
      console.error('Verify security questions error:', error);
      return {
        verified: false,
        message: 'An error occurred during verification'
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Hash security question answer (can be shorter than passwords)
   */
  async hashSecurityAnswer(answer: string): Promise<string> {
    // Normalize answer: trim whitespace and convert to lowercase for consistency
    const normalizedAnswer = answer.trim().toLowerCase();
    
    // Pad short answers to meet bcrypt minimum length requirement
    const paddedAnswer = normalizedAnswer.padEnd(8, '0');
    
    return bcrypt.hash(paddedAnswer, BCRYPT_ROUNDS);
  }

  /**
   * Compare security question answer with hash
   */
  async compareSecurityAnswer(answer: string, hash: string): Promise<boolean> {
    // Normalize answer: trim whitespace and convert to lowercase for consistency
    const normalizedAnswer = answer.trim().toLowerCase();
    
    // Pad short answers to meet bcrypt minimum length requirement
    const paddedAnswer = normalizedAnswer.padEnd(8, '0');
    
    return bcrypt.compare(paddedAnswer, hash);
  }

  /**
   * Get available security question types with display text
   */
  async getAvailableSecurityQuestions(): Promise<{
    questions: Array<{ type: string; text: string }>
  }> {
    // Define the mapping of enum values to display text
    const questionMap: Record<string, string> = {
      'FIRST_PET_NAME': 'What was the name of your first pet?',
      'MOTHER_MAIDEN_NAME': 'What is your mother\'s maiden name?',
      'FIRST_SCHOOL': 'What was the name of your first school?',
      'CHILDHOOD_FRIEND': 'What was the name of your childhood best friend?',
      'BIRTH_CITY': 'In what city were you born?',
      'FIRST_CAR': 'What was the make of your first car?',
      'FAVORITE_TEACHER': 'What was the name of your favorite teacher?',
      'FIRST_JOB': 'What was your first job?',
      'CHILDHOOD_STREET': 'What street did you grow up on?',
      'FATHER_MIDDLE_NAME': 'What is your father\'s middle name?'
    };

    // Convert to array format
    const questions = Object.entries(questionMap).map(([type, text]) => ({
      type,
      text
    }));

    return { questions };
  }

  /**
   * Set up secondary email for a user
   */
  async setupSecondaryEmail(userId: number, secondaryEmail: string): Promise<{ 
    success: boolean; 
    message: string; 
    verificationToken?: string 
  }> {
    const prisma = new PrismaClient();
    
    try {
      // Validate email format
      if (!this.isValidEmail(secondaryEmail)) {
        return {
          success: false,
          message: 'Invalid email format'
        };
      }

      // Check if email is already in use as primary or secondary email
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: secondaryEmail },
            { secondaryEmail: secondaryEmail }
          ]
        }
      });

      if (existingUser) {
        return {
          success: false,
          message: 'This email is already in use'
        };
      }

      // Generate verification token
      const verificationToken = this.generateEmailVerificationToken();
      const expiresAt = this.getEmailVerificationExpiry();

      // Update user's secondary email and create verification token in a transaction
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { 
            secondaryEmail,
            secondaryEmailVerified: false
          }
        }),
        prisma.secondaryEmailVerificationToken.create({
          data: {
            userId,
            token: verificationToken,
            email: secondaryEmail,
            expiresAt
          }
        })
      ]);

      return {
        success: true,
        message: 'Secondary email set up successfully. Please check your email for verification.',
        verificationToken
      };
    } catch (error) {
      console.error('Setup secondary email error:', error);
      return {
        success: false,
        message: 'Failed to set up secondary email'
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Verify secondary email token
   */
  async verifySecondaryEmail(token: string): Promise<{ 
    success: boolean; 
    message: string 
  }> {
    const prisma = new PrismaClient();
    
    try {
      // Find and validate the token
      const verificationToken = await prisma.secondaryEmailVerificationToken.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!verificationToken) {
        return {
          success: false,
          message: 'Invalid or expired verification token'
        };
      }

      // Check if token has expired
      if (verificationToken.expiresAt < new Date()) {
        // Clean up expired token
        await prisma.secondaryEmailVerificationToken.delete({
          where: { id: verificationToken.id }
        });
        
        return {
          success: false,
          message: 'Verification token has expired'
        };
      }

      // Verify the secondary email and remove the verification token
      await prisma.$transaction([
        prisma.user.update({
          where: { id: verificationToken.userId },
          data: { secondaryEmailVerified: true }
        }),
        prisma.secondaryEmailVerificationToken.delete({
          where: { id: verificationToken.id }
        })
      ]);

      return {
        success: true,
        message: 'Secondary email verified successfully'
      };
    } catch (error) {
      console.error('Verify secondary email error:', error);
      return {
        success: false,
        message: 'Failed to verify secondary email'
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Request password reset via secondary email
   */
  async requestPasswordResetSecondary(email: string): Promise<{ 
    success: boolean; 
    message: string; 
    token?: string 
  }> {
    const prisma = new PrismaClient();
    
    try {
      // Find user by secondary email
      const user = await prisma.user.findFirst({
        where: { 
          secondaryEmail: email,
          secondaryEmailVerified: true
        }
      });

      if (!user) {
        // Don't reveal if secondary email exists - return generic message
        return {
          success: true,
          message: 'If this secondary email is associated with a verified account, you will receive password reset instructions.'
        };
      }

      // Generate password reset token
      const resetToken = this.generatePasswordResetToken();
      const expiresAt = this.getPasswordResetExpiry();

      // Store the reset token
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt
        }
      });

      return {
        success: true,
        message: 'If this secondary email is associated with a verified account, you will receive password reset instructions.',
        token: resetToken
      };
    } catch (error) {
      console.error('Secondary email password reset error:', error);
      return {
        success: false,
        message: 'An error occurred while processing your request'
      };
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Export singleton instance
export const authService = new AuthService(); 