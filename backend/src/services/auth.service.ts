/**
 * Authentication Service
 * 
 * Core authentication services for password hashing, JWT token management,
 * and email verification. Provides the foundational security operations
 * for the authentication system.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  JWTPayload,
  TokenPair,
  EmailVerificationResult,
  ResendVerificationResult,
  PasswordValidationResult
} from '../models/auth.models.js';
import { UserRole } from '../models/user.models.js';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const JWT_EXPIRES_IN = '15m'; // Short-lived access tokens
const JWT_REFRESH_EXPIRES_IN = '7d'; // Longer-lived refresh tokens

// Password hashing configuration
const BCRYPT_ROUNDS = 12; // Strong hashing (10+ rounds as required)



export class AuthService {
  /**
   * Hash a password using bcrypt with 12 rounds for strong security
   */
  async hashPassword(password: string): Promise<string> {
    if (!password) {
      throw new Error('Password is required');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    return await bcrypt.hash(password, BCRYPT_ROUNDS);
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
   * Generate both access and refresh JWT tokens for a user
   */
  generateTokenPair(userId: number, email: string, role: UserRole = UserRole.USER): TokenPair {
    if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
      throw new Error('JWT secrets not configured');
    }

    const accessTokenPayload: JWTPayload = {
      userId,
      email,
      type: 'access',
      role
    };

    const refreshTokenPayload: JWTPayload = {
      userId,
      email,
      type: 'refresh',
      role
    };

    const accessToken = jwt.sign(accessTokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      algorithm: 'HS256'
    });

    const refreshToken = jwt.sign(refreshTokenPayload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      algorithm: 'HS256'
    });

    return {
      accessToken,
      refreshToken
    };
  }

  /**
   * Verify and decode an access JWT token
   */
  verifyAccessToken(token: string): JWTPayload {
    if (!JWT_SECRET) {
      throw new Error('JWT secret not configured');
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256']
      }) as JWTPayload;

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw error;
      }
    }
  }

  /**
   * Verify and decode a refresh JWT token
   */
  verifyRefreshToken(token: string): JWTPayload {
    if (!JWT_REFRESH_SECRET) {
      throw new Error('JWT refresh secret not configured');
    }

    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
        algorithms: ['HS256']
      }) as JWTPayload;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      } else {
        throw error;
      }
    }
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
    const { PrismaClient } = await import('@prisma/client');
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
    const { PrismaClient } = await import('@prisma/client');
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
    const { PrismaClient } = await import('@prisma/client');
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
    // Verify the refresh token
    const decoded = this.verifyRefreshToken(refreshToken);
    
    // Generate new token pair with role from existing token
    return this.generateTokenPair(decoded.userId, decoded.email, decoded.role);
  }

  /**
   * Request password reset for a user email
   * Implements rate limiting (3 requests per email per hour)
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string; token?: string }> {
    const { PrismaClient } = await import('@prisma/client');
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
    const { PrismaClient } = await import('@prisma/client');
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
   * Complete password reset process
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const { PrismaClient } = await import('@prisma/client');
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
        this.logPasswordResetAttempt(tokenVerification.userId, 'password_reset', false, 'Weak password provided');
        return {
          success: false,
          message: `Password does not meet requirements: ${passwordValidation.errors.join(', ')}`
        };
      }

      // Check if password has been used recently (prevent reuse)
      const isPasswordReused = await this.isPasswordRecentlyUsed(tokenVerification.userId, newPassword);
      if (isPasswordReused) {
        this.logPasswordResetAttempt(tokenVerification.userId, 'password_reset', false, 'Password reuse attempted');
        return {
          success: false,
          message: 'You cannot reuse a password from the last 6 months. Please choose a different password.'
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

      this.logPasswordResetAttempt(tokenVerification.userId, 'password_reset', true, 'Password reset completed successfully');
      
      return {
        success: true,
        message: 'Password has been reset successfully'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      this.logPasswordResetAttempt(null, 'password_reset', false, `System error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        message: 'An error occurred while resetting your password'
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Store password in history for reuse prevention
   */
  async storePasswordInHistory(userId: number, passwordHash: string): Promise<void> {
    const { PrismaClient } = await import('@prisma/client');
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
    const { PrismaClient } = await import('@prisma/client');
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
    details: string
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      action,
      success,
      details,
      ip: 'N/A', // Will be populated by controller layer
      userAgent: 'N/A' // Will be populated by controller layer
    };

    // For now, log to console. In production, this should go to a security audit log
    console.log(`[SECURITY_AUDIT] Password Reset: ${JSON.stringify(logEntry)}`);
  }

  /**
   * Clean up expired email verification tokens (maintenance function)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const { PrismaClient } = await import('@prisma/client');
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
}

// Export singleton instance
export const authService = new AuthService(); 