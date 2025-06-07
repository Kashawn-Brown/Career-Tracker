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

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const JWT_EXPIRES_IN = '15m'; // Short-lived access tokens
const JWT_REFRESH_EXPIRES_IN = '7d'; // Longer-lived refresh tokens

// Password hashing configuration
const BCRYPT_ROUNDS = 12; // Strong hashing (10+ rounds as required)

export interface JWTPayload {
  userId: number;
  email: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

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
  generateTokenPair(userId: number, email: string): TokenPair {
    if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
      throw new Error('JWT secrets not configured');
    }

    const accessTokenPayload: JWTPayload = {
      userId,
      email,
      type: 'access'
    };

    const refreshTokenPayload: JWTPayload = {
      userId,
      email,
      type: 'refresh'
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
   * Validate email format using basic regex
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  isValidPassword(password: string): { valid: boolean; errors: string[] } {
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
}

// Export singleton instance
export const authService = new AuthService(); 